from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

ScopeType = Literal["organization", "project", "subproject", "campaign"]


@dataclass
class ConversationStats:
    word_count: int | None = None
    duration_seconds: float | None = None
    cost_cents: int | None = None


@dataclass
class Conversation:
    title: str
    content: str
    created_by: UUID
    id: UUID = field(default_factory=uuid4)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: list[tuple[str, str]] = field(default_factory=list)
    emit_webhook: bool = False
    stats: ConversationStats = field(default_factory=ConversationStats)
    organization_id: UUID | None = None
    scope_id: UUID | None = None
    scope_type: ScopeType | None = None
    tag_ids: list[UUID] = field(default_factory=list)

    @classmethod
    def create(
        cls,
        title: str,
        content: str,
        created_by: UUID,
        metadata: list[tuple[str, str]] | None = None,
        emit_webhook: bool = False,
        organization_id: UUID | None = None,
        scope_id: UUID | None = None,
        scope_type: ScopeType | None = None,
        tag_ids: list[UUID] | None = None,
    ) -> "Conversation":
        return cls(
            title=title,
            content=content,
            created_by=created_by,
            metadata=metadata or [],
            emit_webhook=emit_webhook,
            organization_id=organization_id,
            scope_id=scope_id,
            scope_type=scope_type,
            tag_ids=tag_ids or [],
        )

    def update(
        self,
        title: str | None = None,
        content: str | None = None,
        metadata: list[tuple[str, str]] | None = None,
        emit_webhook: bool | None = None,
    ) -> None:
        if title is not None:
            self.title = title
        if content is not None:
            self.content = content
        if metadata is not None:
            self.metadata = metadata
        if emit_webhook is not None:
            self.emit_webhook = emit_webhook

    def update_stats(self, stats: ConversationStats) -> None:
        self.stats = stats
