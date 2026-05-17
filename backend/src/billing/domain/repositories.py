from abc import ABC, abstractmethod
from uuid import UUID

from src.billing.domain.models import Subscription, UsageRecord


class SubscriptionRepository(ABC):
    @abstractmethod
    async def find_by_org(self, org_id: UUID) -> Subscription | None: ...

    @abstractmethod
    async def save(self, sub: Subscription) -> None: ...

    @abstractmethod
    async def update(self, sub: Subscription) -> None: ...


class UsageRepository(ABC):
    @abstractmethod
    async def save(self, record: UsageRecord) -> None: ...

    @abstractmethod
    async def find_by_org(self, org_id: UUID) -> list[UsageRecord]: ...
