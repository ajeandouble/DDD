from datetime import timezone
from uuid import UUID

from motor.motor_asyncio import AsyncIOMotorDatabase

from src.billing.domain.models import Subscription, UsageRecord
from src.billing.domain.repositories import SubscriptionRepository, UsageRepository


def _ensure_tz(dt):
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _sub_from_doc(doc: dict) -> Subscription:
    return Subscription(
        id=UUID(doc["_id"]),
        org_id=UUID(doc["org_id"]),
        tier=doc["tier"],
        tokens_used=doc["tokens_used"],
        period_start=_ensure_tz(doc["period_start"]),
        owner_id=UUID(doc["owner_id"]),
        created_at=_ensure_tz(doc["created_at"]),
        status=doc.get("status", "active"),
    )


def _sub_to_doc(sub: Subscription) -> dict:
    return {
        "_id": str(sub.id),
        "org_id": str(sub.org_id),
        "tier": sub.tier,
        "tokens_used": sub.tokens_used,
        "period_start": sub.period_start,
        "owner_id": str(sub.owner_id),
        "created_at": sub.created_at,
        "status": sub.status,
    }


def _usage_from_doc(doc: dict) -> UsageRecord:
    return UsageRecord(
        id=UUID(doc["_id"]),
        org_id=UUID(doc["org_id"]),
        conversation_id=UUID(doc["conversation_id"]),
        duration_seconds=doc["duration_seconds"],
        tokens_consumed=doc["tokens_consumed"],
        created_at=_ensure_tz(doc["created_at"]),
    )


def _usage_to_doc(record: UsageRecord) -> dict:
    return {
        "_id": str(record.id),
        "org_id": str(record.org_id),
        "conversation_id": str(record.conversation_id),
        "duration_seconds": record.duration_seconds,
        "tokens_consumed": record.tokens_consumed,
        "created_at": record.created_at,
    }


class MongoSubscriptionRepository(SubscriptionRepository):
    collection_name = "billing_subscriptions"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db[self.collection_name]

    async def find_by_org(self, org_id: UUID) -> Subscription | None:
        doc = await self._col.find_one({"org_id": str(org_id)})
        return _sub_from_doc(doc) if doc else None

    async def save(self, sub: Subscription) -> None:
        await self._col.insert_one(_sub_to_doc(sub))

    async def update(self, sub: Subscription) -> None:
        await self._col.replace_one({"_id": str(sub.id)}, _sub_to_doc(sub))


class MongoUsageRepository(UsageRepository):
    collection_name = "billing_usage_records"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db[self.collection_name]

    async def save(self, record: UsageRecord) -> None:
        await self._col.insert_one(_usage_to_doc(record))

    async def find_by_org(self, org_id: UUID) -> list[UsageRecord]:
        cursor = self._col.find({"org_id": str(org_id)}).sort("created_at", -1)
        return [_usage_from_doc(doc) async for doc in cursor]
