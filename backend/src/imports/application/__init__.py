import hashlib
import os
import shutil
from uuid import uuid4

STORAGE_DIR = os.environ.get("STORAGE_DIR", "/tmp/ddd_storage")


async def store_file(tmp_path: str, filename: str) -> tuple[str, str]:
    """Move tmp_path into storage. Returns (storage_key, sha256_hex)."""
    os.makedirs(STORAGE_DIR, exist_ok=True)
    h = hashlib.sha256()
    with open(tmp_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    ext = os.path.splitext(filename)[1]
    key = f"{uuid4()}{ext}"
    dest = os.path.join(STORAGE_DIR, key)
    shutil.move(tmp_path, dest)
    return key, h.hexdigest()
