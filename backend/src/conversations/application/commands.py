from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from src.conversations.domain.models import Conversation, ConversationType, ScopeType
from src.conversations.domain.repositories import ConversationRepository


@dataclass
class CreateConversationCommand:
    title: str
    content: str | list[dict]
    type: ConversationType
    created_by: UUID
    conversation_timestamp: datetime | None = None
    metadata: list[tuple[str, str]] = field(default_factory=list)
    organization_id: UUID | None = None
    scope_id: UUID | None = None
    scope_type: ScopeType | None = None
    tag_ids: list[UUID] = field(default_factory=list)


@dataclass
class UpdateConversationCommand:
    id: UUID
    title: str | None = None
    content: str | list[dict] | None = None
    metadata: list[tuple[str, str]] | None = None


class ConversationNotFound(Exception):
    pass


class ConversationCommandHandler:
    def __init__(self, repo: ConversationRepository) -> None:
        self._repo = repo

    async def create(self, cmd: CreateConversationCommand) -> Conversation:
        c = Conversation.create(
            title=cmd.title,
            content=cmd.content,
            type=cmd.type,
            created_by=cmd.created_by,
            conversation_timestamp=cmd.conversation_timestamp,
            metadata=cmd.metadata,
            organization_id=cmd.organization_id,
            scope_id=cmd.scope_id,
            scope_type=cmd.scope_type,
            tag_ids=cmd.tag_ids,
        )
        await self._repo.save(c)
        return c

    async def update(self, cmd: UpdateConversationCommand) -> Conversation:
        c = await self._repo.find_by_id(cmd.id)
        if c is None:
            raise ConversationNotFound(cmd.id)
        c.update(
            title=cmd.title,
            content=cmd.content,
            metadata=cmd.metadata,
        )
        await self._repo.update(c)
        return c

    async def delete(self, conversation_id: UUID) -> None:
        exists = await self._repo.find_by_id(conversation_id)
        if exists is None:
            raise ConversationNotFound(conversation_id)
        await self._repo.delete(conversation_id)
