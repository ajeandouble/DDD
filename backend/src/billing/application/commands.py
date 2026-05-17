from uuid import UUID

from src.billing.domain.events import (
    QuotaExhausted,
    SubscriptionCreated,
    SubscriptionUpgraded,
    UsageRecorded,
)
from src.billing.domain.models import Subscription, UsageRecord
from src.billing.domain.repositories import SubscriptionRepository, UsageRepository
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
    org_id: UUID, new_tier: str, sub_repo: SubscriptionRepository
) -> Subscription:
    sub = await sub_repo.find_by_org(org_id)
    if sub is None:
        raise ValueError(f"No subscription for org {org_id}")
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
