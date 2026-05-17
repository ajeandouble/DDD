from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

ScopeType = Literal["organization", "project", "subproject", "campaign"]
ConversationType = Literal["review", "conversation"]


@dataclass
class Tag:
    id: UUID
    name: str
    org_id: UUID
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, name: str, org_id: UUID) -> "Tag":
        return cls(id=uuid4(), name=name, org_id=org_id)


@dataclass
class ConversationStats:
    word_count: int | None = None
    duration_seconds: float | None = None
    cost_cents: int | None = None


@dataclass
class Conversation:
    title: str
    content: str | list[dict]
    type: ConversationType
    created_by: UUID
    id: UUID = field(default_factory=uuid4)
    conversation_timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: list[tuple[str, str]] = field(default_factory=list)
    stats: ConversationStats = field(default_factory=ConversationStats)
    organization_id: UUID | None = None
    scope_id: UUID | None = None
    scope_type: ScopeType | None = None
    tag_ids: list[UUID] = field(default_factory=list)

    @classmethod
    def create(
        cls,
        title: str,
        content: str | list[dict],
        type: ConversationType,
        created_by: UUID,
        conversation_timestamp: datetime | None = None,
        metadata: list[tuple[str, str]] | None = None,
        organization_id: UUID | None = None,
        scope_id: UUID | None = None,
        scope_type: ScopeType | None = None,
        tag_ids: list[UUID] | None = None,
    ) -> "Conversation":
        now = datetime.now(timezone.utc)
        return cls(
            title=title,
            content=content,
            type=type,
            created_by=created_by,
            conversation_timestamp=conversation_timestamp or now,
            created_at=now,
            metadata=metadata or [],
            organization_id=organization_id,
            scope_id=scope_id,
            scope_type=scope_type,
            tag_ids=tag_ids or [],
        )

    def update(
        self,
        title: str | None = None,
        content: str | list[dict] | None = None,
        metadata: list[tuple[str, str]] | None = None,
    ) -> None:
        if title is not None:
            self.title = title
        if content is not None:
            self.content = content
        if metadata is not None:
            self.metadata = metadata

    def update_stats(self, stats: ConversationStats) -> None:
        self.stats = stats

    def apply_transcript(
        self, speaker_turns: list[dict], word_count: int, duration_seconds: float
    ) -> None:
        self.type = "conversation"
        self.content = speaker_turns
        self.stats = ConversationStats(
            word_count=word_count,
            duration_seconds=duration_seconds,
            cost_cents=self.stats.cost_cents,
        )
