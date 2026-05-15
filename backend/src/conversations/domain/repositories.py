from abc import ABC, abstractmethod
from uuid import UUID

from src.conversations.domain.models import Conversation


class ConversationRepository(ABC):
    @abstractmethod
    async def save(self, conversation: Conversation) -> None: ...

    @abstractmethod
    async def find_by_id(self, conversation_id: UUID) -> Conversation | None: ...

    @abstractmethod
    async def find_all(
        self,
        limit: int = 50,
        organization_id: UUID | None = None,
        scope_id: UUID | None = None,
        scope_type: str | None = None,
    ) -> list[Conversation]: ...

    @abstractmethod
    async def update(self, conversation: Conversation) -> None: ...

    @abstractmethod
    async def delete(self, conversation_id: UUID) -> None: ...
