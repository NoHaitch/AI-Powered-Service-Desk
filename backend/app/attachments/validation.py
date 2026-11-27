import codecs
import unicodedata
from pathlib import PurePath
from typing import BinaryIO

from PIL import Image

from .storage import CHUNK_SIZE, AttachmentError

TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".txt": "text/plain",
    ".log": "text/plain",
    ".csv": "text/csv",
}


def validate_name(filename: str, media_type: str) -> str:
    name = unicodedata.normalize("NFC", filename).strip()
    if (
        not 1 <= len(name) <= 180
        or name.startswith(".")
        or any(c in "/\\" or unicodedata.category(c).startswith("C") for c in name)
    ):
        raise AttachmentError("Invalid attachment name.")
    if TYPES.get(PurePath(name).suffix.lower()) != media_type:
        raise AttachmentError("Unsupported attachment type.")
    return name


def validate_content(file: BinaryIO, media_type: str, max_pixels: int) -> None:
    if media_type in {"text/plain", "text/csv"}:
        decoder = codecs.getincrementaldecoder("utf-8")()
        try:
            while chunk := file.read(CHUNK_SIZE):
                text = decoder.decode(chunk)
                if any(
                    unicodedata.category(char) == "Cc" and char not in "\t\r\n" for char in text
                ):
                    raise AttachmentError("Invalid text attachment.")
            decoder.decode(b"", final=True)
        except UnicodeError:
            raise AttachmentError("Invalid text attachment.") from None
        return

    if media_type not in {"image/jpeg", "image/png"}:
        raise AttachmentError("Unsupported attachment type.")
    is_png = media_type == "image/png"
    signature = bytes.fromhex("0000000049454e44ae426082" if is_png else "ffd9")
    try:
        file.seek(-len(signature), 2)
        if file.read() != signature:
            raise AttachmentError("Invalid image attachment.")
        file.seek(0)
        formats = ["PNG" if is_png else "JPEG"]
        with Image.open(file, formats=formats) as image:
            if image.width * image.height > max_pixels or getattr(image, "n_frames", 1) != 1:
                raise AttachmentError("Image exceeds limits.")
            image.verify()
        file.seek(0)
        with Image.open(file, formats=formats) as image:
            image.load()
    except OSError, SyntaxError, Image.DecompressionBombError:
        raise AttachmentError("Invalid image attachment.") from None
