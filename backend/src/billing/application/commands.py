from datetime import datetime, timezone
from uuid import UUID

from src.billing.domain.events import (
    InvoiceGenerated,
    QuotaExhausted,
    SubscriptionCreated,
    SubscriptionUpgraded,
    UsageRecorded,
)
from src.billing.domain.models import Invoice, Subscription, UsageRecord
from src.billing.domain.repositories import (
    InvoiceRepository,
    SubscriptionRepository,
    UsageRepository,
)
from src.shared.events import publish


async def create_subscription(
    org_id: UUID, owner_id: UUID, sub_repo: SubscriptionRepository
) -> Subscription:
    existing = await sub_repo.find_by_org(org_id)
    if existing:
        return existing
    sub = Subscription.create(org_id=org_id, owner_id=owner_id)
    await sub_repo.save(sub)
    await publish(SubscriptionCreated(org_id=org_id, tier=sub.tier))
    return sub


async def upgrade_tier(
    org_id: UUID, new_tier: str, sub_repo: SubscriptionRepository, owner_id: UUID | None = None
) -> Subscription:
    sub = await sub_repo.find_by_org(org_id)
    if sub is None:
        if owner_id is None:
            raise ValueError(f"No subscription for org {org_id}")
        sub = Subscription.create(org_id=org_id, owner_id=owner_id)
        await sub_repo.save(sub)
        await publish(SubscriptionCreated(org_id=org_id, tier=sub.tier))
    old_tier = sub.tier
    sub.upgrade(new_tier)
    await sub_repo.update(sub)
    await publish(SubscriptionUpgraded(org_id=org_id, old_tier=old_tier, new_tier=new_tier))
    return sub


async def record_usage(
    org_id: UUID,
    conversation_id: UUID,
    duration_seconds: float,
    sub_repo: SubscriptionRepository,
    usage_repo: UsageRepository,
) -> UsageRecord:
    record = UsageRecord.create(
        org_id=org_id, conversation_id=conversation_id, duration_seconds=duration_seconds
    )
    await usage_repo.save(record)
    sub = await sub_repo.find_by_org(org_id)
    if sub is not None and sub.tier != "enterprise":
        sub.consume_tokens(record.tokens_consumed)
        if sub.tokens_remaining == 0:
            sub.mark_quota_exhausted()
            await sub_repo.update(sub)
            await publish(QuotaExhausted(org_id=org_id, tier=sub.tier, tokens_used=sub.tokens_used))
        else:
            await sub_repo.update(sub)
    await publish(
        UsageRecorded(
            org_id=org_id,
            conversation_id=conversation_id,
            tokens_consumed=record.tokens_consumed,
        )
    )
    return record


async def generate_invoice(
    org_id: UUID,
    period_start: datetime,
    period_end: datetime,
    usage_repo: UsageRepository,
    invoice_repo: InvoiceRepository,
) -> Invoice | None:
    existing = await invoice_repo.find_by_org_and_period(org_id, period_start, period_end)
    if existing:
        return existing
    records = await usage_repo.find_by_org_and_period(org_id, period_start, period_end)
    invoice = Invoice.generate(
        org_id=org_id,
        period_start=period_start,
        period_end=period_end,
        usage_records=records,
    )
    await invoice_repo.save(invoice)
    await publish(
        InvoiceGenerated(
            org_id=org_id,
            invoice_id=invoice.id,
            period_start=period_start.isoformat(),
            period_end=period_end.isoformat(),
            total_tokens=invoice.total_tokens,
        )
    )
    return invoice
