from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class SubscriptionCreated:
    org_id: UUID
    tier: str


@dataclass(frozen=True)
class SubscriptionUpgraded:
    org_id: UUID
    old_tier: str
    new_tier: str


@dataclass(frozen=True)
class UsageRecorded:
    org_id: UUID
    conversation_id: UUID
    tokens_consumed: int


@dataclass(frozen=True)
class InvoiceGenerated:
    org_id: UUID
    invoice_id: UUID
    period_start: str
    period_end: str
    total_tokens: int


@dataclass(frozen=True)
class QuotaExhausted:
    org_id: UUID
    tier: str
    tokens_used: int
