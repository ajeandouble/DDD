import asyncio
from typing import AsyncGenerator


class SSEBroker:
    """Fan-out SSE broker: one async queue per connected client."""

    def __init__(self) -> None:
        self._queues: set[asyncio.Queue] = set()

    async def connect(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._queues.add(q)
        return q

    def disconnect(self, q: asyncio.Queue) -> None:
        self._queues.discard(q)

    async def publish(self, event_type: str, data: dict) -> None:
        for q in list(self._queues):
            await q.put({"type": event_type, "data": data})

    async def stream(self, q: asyncio.Queue) -> AsyncGenerator[str, None]:
        """Yield SSE-formatted lines; sends a ping every 30 s to keep the connection alive."""
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=30.0)
                    import json

                    yield f"event: {msg['type']}\ndata: {json.dumps(msg['data'])}\n\n"
                except asyncio.TimeoutError:
                    yield "event: ping\ndata: {}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            self.disconnect(q)


broker = SSEBroker()
