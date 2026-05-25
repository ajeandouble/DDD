from uuid import UUID

from src.billing.domain.models import Invoice, Subscription, UsageRecord
from src.billing.domain.repositories import (
    InvoiceRepository,
    SubscriptionRepository,
    UsageRepository,
)


async def get_subscription(org_id: UUID, sub_repo: SubscriptionRepository) -> Subscription | None:
    return await sub_repo.find_by_org(org_id)


async def list_usage(org_id: UUID, usage_repo: UsageRepository) -> list[UsageRecord]:
    return await usage_repo.find_by_org(org_id)


async def list_invoices(org_id: UUID, invoice_repo: InvoiceRepository) -> list[Invoice]:
    return await invoice_repo.find_by_org(org_id)
