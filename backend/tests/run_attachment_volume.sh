#!/usr/bin/env bash
# Uses a disposable volume. Build the backend image with docker compose build backend first.
set -euo pipefail
volume=$(docker volume create)
trap 'docker volume rm "$volume" >/dev/null' EXIT

for operation in write read; do
  docker run --rm --network none --read-only --cap-drop ALL \
    -v "$volume:/var/lib/service-desk/attachments" service-desk-backend:local \
    python -c '
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import sys
from uuid import UUID

from app.attachments.storage import LocalStorage, StoredObject
from app.attachments.validation import validate_content

storage = LocalStorage(Path("/var/lib/service-desk/attachments"), 0)
key = UUID(int=1)
content = b"Synthetic attachment for persistent volume verification."
if sys.argv[1] == "write":
    storage.write(
        key, BytesIO(content), len(content),
        lambda file: validate_content(file, "text/plain", 1),
    )
else:
    with storage.open_verified(key, StoredObject(len(content), sha256(content).digest())) as file:
        assert file.read() == content
    print("Attachment bytes and digest survived backend container recreation.")
' "$operation"
done
