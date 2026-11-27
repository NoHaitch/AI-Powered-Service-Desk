import os
import stat
from collections.abc import Callable, Iterator
from contextlib import AbstractContextManager, contextmanager, suppress
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import BinaryIO, Protocol
from uuid import UUID

CHUNK_SIZE = 64 * 1024


class AttachmentError(ValueError):
    """A safe attachment failure with no storage path or untrusted filename."""


@dataclass(frozen=True)
class StoredObject:
    size: int
    digest: bytes


class StorageProvider(Protocol):
    name: str

    def write(
        self, key: UUID, source: BinaryIO, size: int, validate: Callable[[BinaryIO], None]
    ) -> StoredObject: ...
    def open_verified(
        self, key: UUID, stored: StoredObject
    ) -> AbstractContextManager[BinaryIO]: ...
    def delete(self, key: UUID) -> None: ...


class LocalStorage:
    name = "local"

    def __init__(self, root: Path, min_free_bytes: int) -> None:
        self.root = root
        self.min_free_bytes = min_free_bytes

    @contextmanager
    def _directory(self) -> Iterator[int]:
        fd = os.open(self.root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            yield fd
        finally:
            os.close(fd)

    @staticmethod
    def _name(key: UUID) -> str:
        if not isinstance(key, UUID):
            raise AttachmentError("Invalid storage key.")
        return key.hex

    def write(
        self, key: UUID, source: BinaryIO, size: int, validate: Callable[[BinaryIO], None]
    ) -> StoredObject:
        if size < 1:
            raise AttachmentError("Invalid file size.")
        name = self._name(key)
        temp = name + ".part"
        with self._directory() as directory:
            space = os.fstatvfs(directory)
            if space.f_bavail * space.f_frsize < size + self.min_free_bytes:
                raise AttachmentError("Insufficient space for attachment.")
            fd = os.open(
                temp, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=directory
            )
            digest = sha256()
            written = 0
            try:
                with os.fdopen(fd, "w+b") as file:
                    while chunk := source.read(min(CHUNK_SIZE, size - written + 1)):
                        written += len(chunk)
                        if written > size:
                            raise AttachmentError("File size does not match reservation.")
                        file.write(chunk)
                        digest.update(chunk)
                    if written != size:
                        raise AttachmentError("File size does not match reservation.")
                    file.flush()
                    file.seek(0)
                    validate(file)
                    os.fsync(file.fileno())
                # Link is atomic and refuses to replace an existing object.
                os.link(
                    temp, name, src_dir_fd=directory, dst_dir_fd=directory, follow_symlinks=False
                )
            finally:
                os.unlink(temp, dir_fd=directory)
                os.fsync(directory)
        return StoredObject(written, digest.digest())

    @contextmanager
    def open_verified(self, key: UUID, stored: StoredObject) -> Iterator[BinaryIO]:
        try:
            with self._directory() as directory:
                fd = os.open(
                    self._name(key), os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW, dir_fd=directory
                )
        except OSError:
            raise AttachmentError("Attachment is unavailable.") from None
        with os.fdopen(fd, "rb") as file:
            info = os.fstat(file.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_size != stored.size:
                raise AttachmentError("Attachment is unavailable.")
            digest = sha256()
            remaining = stored.size
            while remaining and (chunk := file.read(min(CHUNK_SIZE, remaining))):
                digest.update(chunk)
                remaining -= len(chunk)
            if remaining or file.read(1) or digest.digest() != stored.digest:
                raise AttachmentError("Attachment is unavailable.")
            file.seek(0)
            yield file

    def delete(self, key: UUID) -> None:
        name = self._name(key)
        with self._directory() as directory:
            for entry in (name, name + ".part"):
                with suppress(FileNotFoundError):
                    os.unlink(entry, dir_fd=directory)
            os.fsync(directory)
