from collections import defaultdict
from typing import Any, Awaitable, Callable

Handler = Callable[[Any], Awaitable[None]]

_registry: dict[type, list[Handler]] = defaultdict(list)


def subscribe(event_type: type, handler: Handler) -> None:
    _registry[event_type].append(handler)


async def publish(event: Any) -> None:
    handlers = _registry[type(event)]
    print(f"[bus] publish {type(event).__name__} → {len(handlers)} handler(s)  {event}")
    for handler in handlers:
        print(f"[bus]   → {handler.__module__}.{handler.__name__}")
        await handler(event)
