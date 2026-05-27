from abc import ABC, abstractmethod
from uuid import UUID

from src.webhooks.domain import Delivery, WebhookEndpoint


class WebhookEndpointRepository(ABC):
    @abstractmethod
    async def save(self, ep: WebhookEndpoint) -> None: ...

    @abstractmethod
    async def find_by_id(self, ep_id: UUID) -> WebhookEndpoint | None: ...

    @abstractmethod
    async def find_by_org(self, org_id: UUID) -> list[WebhookEndpoint]: ...

    @abstractmethod
    async def find_enabled_for_event(self, event_type: str) -> list[WebhookEndpoint]: ...

    @abstractmethod
    async def delete(self, ep_id: UUID) -> None: ...


class DeliveryRepository(ABC):
    @abstractmethod
    async def save(self, delivery: Delivery) -> None: ...

    @abstractmethod
    async def find_by_endpoint(self, ep_id: UUID) -> list[Delivery]: ...
