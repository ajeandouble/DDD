from dataclasses import dataclass, field
from uuid import UUID


@dataclass
class ConversationTranscribed:
    conversation_id: UUID
    org_id: UUID
    title: str
    conversation_timestamp: str  # ISO 8601
    scope_type: str | None
    scope_id: UUID | None
    metadata: list[dict]
    speaker_turns: list[dict]
    stats: dict  # word_count, duration_seconds
