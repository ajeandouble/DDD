from abc import ABC, abstractmethod
from uuid import UUID

from datetime import datetime

from src.billing.domain.models import Invoice, Subscription, UsageRecord


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

    @abstractmethod
    async def find_by_org_and_period(
        self, org_id: UUID, period_start: datetime, period_end: datetime
    ) -> list[UsageRecord]: ...


class InvoiceRepository(ABC):
    @abstractmethod
    async def save(self, invoice: Invoice) -> None: ...

    @abstractmethod
    async def find_by_org(self, org_id: UUID) -> list[Invoice]: ...

    @abstractmethod
    async def find_by_org_and_period(
        self, org_id: UUID, period_start: datetime, period_end: datetime
    ) -> Invoice | None: ...
