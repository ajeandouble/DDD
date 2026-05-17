from uuid import UUID

from src.conversations.domain.models import Conversation, ScopeType
from src.conversations.domain.repositories import (
    ConversationFilter,
    ConversationRepository,
    PagedResult,
)


class ConversationQueryHandler:
    def __init__(self, repo: ConversationRepository) -> None:
        self._repo = repo

    async def get_by_id(self, conversation_id: UUID) -> Conversation | None:
        return await self._repo.find_by_id(conversation_id)

    async def list_all(
        self,
        limit: int = 50,
        organization_id: UUID | None = None,
        scope_id: UUID | None = None,
        scope_type: ScopeType | None = None,
    ) -> list[Conversation]:
        return await self._repo.find_all(
            limit=limit,
            organization_id=organization_id,
            scope_id=scope_id,
            scope_type=scope_type,
        )

    async def search(
        self,
        organization_id: UUID | None,
        scope_id: UUID | None,
        scope_type: ScopeType | None,
        filters: list[ConversationFilter],
        page: int,
        page_size: int,
        sort_by: str = "timestamp",
        sort_dir: int = -1,
    ) -> PagedResult:
        return await self._repo.search(
            organization_id=organization_id,
            scope_id=scope_id,
            scope_type=scope_type,
            filters=filters,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_dir=sort_dir,
        )
