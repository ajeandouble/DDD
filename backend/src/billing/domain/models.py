from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

PLAN_LIMITS: dict[str, dict] = {
    "starter": {"tokens": 10_000, "webhooks": False},
    "pro": {"tokens": 100_000, "webhooks": True},
    "enterprise": {"tokens": None, "webhooks": True},
}


@dataclass
class Subscription:
    id: UUID
    org_id: UUID
    tier: str
    tokens_used: int
    period_start: datetime
    owner_id: UUID
    status: str = "active"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, org_id: UUID, owner_id: UUID) -> "Subscription":
        return cls(
            id=uuid4(),
            org_id=org_id,
            tier="starter",
            tokens_used=0,
            period_start=datetime.now(timezone.utc),
            owner_id=owner_id,
        )

    @property
    def tokens_remaining(self) -> int | None:
        limit = PLAN_LIMITS[self.tier]["tokens"]
        if limit is None:
            return None
        return max(0, limit - self.tokens_used)

    @property
    def reset_at(self) -> datetime:
        start = self.period_start
        month = start.month + 1
        year = start.year
        if month > 12:
            month = 1
            year += 1
        return start.replace(year=year, month=month)

    def has_webhook_access(self) -> bool:
        return bool(PLAN_LIMITS[self.tier]["webhooks"])

    def consume_tokens(self, amount: int) -> None:
        self.tokens_used += amount

    def mark_quota_exhausted(self) -> None:
        self.status = "quota_exceeded"

    def upgrade(self, new_tier: str) -> None:
        if new_tier not in PLAN_LIMITS:
            raise ValueError(f"Unknown tier: {new_tier}")
        if new_tier == self.tier:
            return
        self.tier = new_tier
        self.tokens_used = 0
        self.period_start = datetime.now(timezone.utc)

    @staticmethod
    def compute_tokens(duration_seconds: float) -> int:
        return 100 + int(duration_seconds)


@dataclass
class UsageRecord:
    id: UUID
    org_id: UUID
    conversation_id: UUID
    duration_seconds: float
    tokens_consumed: int
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, org_id: UUID, conversation_id: UUID, duration_seconds: float) -> "UsageRecord":
        tokens = Subscription.compute_tokens(duration_seconds)
        return cls(
            id=uuid4(),
            org_id=org_id,
            conversation_id=conversation_id,
            duration_seconds=duration_seconds,
            tokens_consumed=tokens,
        )
