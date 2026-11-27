from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pytest
from PIL import Image

from app.attachments.storage import AttachmentError, LocalStorage
from app.attachments.validation import validate_content, validate_name


@pytest.mark.parametrize(
    ("name", "media_type"),
    [
        ("photo.png", "image/png"),
        ("photo.jpeg", "image/jpeg"),
        ("notes.txt", "text/plain"),
        ("failure.log", "text/plain"),
        ("report.csv", "text/csv"),
    ],
)
def test_allowed_attachment_names(name: str, media_type: str) -> None:
    assert validate_name(name, media_type) == name


@pytest.mark.parametrize("name", ["../failure.log", "directory/file.txt", "file\n.txt", "x.svg"])
def test_reject_unsafe_names(name: str) -> None:
    with pytest.raises(AttachmentError):
        validate_name(name, "text/plain")


@pytest.mark.parametrize("image_format", ["PNG", "JPEG"])
def test_decodes_bounded_image(image_format: str) -> None:
    raw = BytesIO()
    Image.new("RGB", (3, 3)).save(raw, format=image_format)
    raw.seek(0)
    validate_content(raw, f"image/{image_format.lower()}", 9)
    raw.seek(0)
    with pytest.raises(AttachmentError):
        validate_content(raw, f"image/{image_format.lower()}", 8)
    with pytest.raises(AttachmentError):
        validate_content(BytesIO(raw.getvalue()[:-4]), f"image/{image_format.lower()}", 100)


def test_atomic_storage_checks_size_content_integrity_and_symlinks(tmp_path: Path) -> None:
    storage = LocalStorage(tmp_path, 0)
    key = uuid4()
    raw = b"hello\n"
    with pytest.raises(AttachmentError, match="size"):
        storage.write(key, BytesIO(raw), len(raw) + 1, lambda _: None)
    with pytest.raises(AttachmentError, match="text"):
        storage.write(key, BytesIO(b"\0"), 1, lambda f: validate_content(f, "text/plain", 1))
    with pytest.raises(AttachmentError):
        storage.write(key, BytesIO(b"\xc3"), 1, lambda f: validate_content(f, "text/plain", 1))
    with pytest.raises(AttachmentError, match="space"):
        LocalStorage(tmp_path, 10**30).write(key, BytesIO(raw), len(raw), lambda _: None)
    assert not list(tmp_path.iterdir())
    stored = storage.write(key, BytesIO(raw), len(raw), lambda _: None)
    with storage.open_verified(key, stored) as file:
        assert file.read() == raw
    with pytest.raises(FileExistsError):
        storage.write(key, BytesIO(raw), len(raw), lambda _: None)
    (tmp_path / key.hex).write_bytes(b"world\n")
    with pytest.raises(AttachmentError), storage.open_verified(key, stored):
        pass
    storage.delete(key)
    (tmp_path / key.hex).symlink_to("/dev/null")
    with pytest.raises(AttachmentError), storage.open_verified(key, stored):
        pass
    storage.delete(key)
    storage.delete(key)
