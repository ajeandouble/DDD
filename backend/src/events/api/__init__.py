from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from src.shared.jwt import decode_token
from src.shared.sse import broker

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/stream")
async def event_stream(token: str = Query(...)):
    try:
        decode_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    q = await broker.connect()
    return StreamingResponse(
        broker.stream(q),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
