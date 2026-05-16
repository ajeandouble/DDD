import os

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

STORAGE_DIR = os.environ.get("STORAGE_DIR", "/tmp/ddd_storage")

router = APIRouter(prefix="/storage", tags=["storage"])


@router.get("/{storage_key}")
async def serve_file(storage_key: str):
    # Basic path traversal guard
    if "/" in storage_key or ".." in storage_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST)
    path = os.path.join(STORAGE_DIR, storage_key)
    if not os.path.isfile(path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(path)
