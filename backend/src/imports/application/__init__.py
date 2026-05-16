import os
import shutil
from uuid import uuid4


STORAGE_DIR = os.environ.get("STORAGE_DIR", "/tmp/ddd_storage")


async def store_file(tmp_path: str, filename: str) -> str:
    os.makedirs(STORAGE_DIR, exist_ok=True)
    ext = os.path.splitext(filename)[1]
    key = f"{uuid4()}{ext}"
    dest = os.path.join(STORAGE_DIR, key)
    shutil.move(tmp_path, dest)
    return key
