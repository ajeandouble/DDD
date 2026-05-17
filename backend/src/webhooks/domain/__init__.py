from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID, uuid4


class DeliveryStatus(StrEnum):
    SUCCESS = "success"
    FAILED = "failed"
    TRANSFORMER_ERROR = "transformer_error"


@dataclass
class WebhookEndpoint:
    org_id: UUID
    url: str
    id: UUID = field(default_factory=uuid4)
    secret: str = ""
    event_types: list[str] = field(default_factory=lambda: ["conversation.transcribed"])
    transformer: str = "result = payload"
    enabled: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, org_id: UUID, url: str, secret: str = "", transformer: str = "result = payload") -> "WebhookEndpoint":
        return cls(org_id=org_id, url=url, secret=secret, transformer=transformer)


@dataclass
class Delivery:
    endpoint_id: UUID
    event_type: str
    payload_sent: dict
    id: UUID = field(default_factory=uuid4)
    status: DeliveryStatus = DeliveryStatus.SUCCESS
    response_code: int | None = None
    error: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, endpoint_id: UUID, event_type: str, payload_sent: dict) -> "Delivery":
        return cls(endpoint_id=endpoint_id, event_type=event_type, payload_sent=payload_sent)
