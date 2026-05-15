from collections import defaultdict
from typing import Any, Awaitable, Callable

Handler = Callable[[Any], Awaitable[None]]

_registry: dict[type, list[Handler]] = defaultdict(list)


def subscribe(event_type: type, handler: Handler) -> None:
    _registry[event_type].append(handler)


async def publish(event: Any) -> None:
    for handler in _registry[type(event)]:
        await handler(event)
