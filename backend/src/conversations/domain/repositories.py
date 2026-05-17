from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Literal
from uuid import UUID

from src.conversations.domain.models import Conversation


@dataclass
class ConversationFilter:
    """A single search condition."""

    field: Literal["title", "content", "meta", "stats.word_count", "stats.duration_seconds"]
    op: Literal["eq", "contains", "regex", "gt", "gte", "lt", "lte"]
    value: str  # always a string; repository converts to float for numeric fields
    meta_key: str = ""  # only used when field == "meta"


@dataclass
class PagedResult:
    items: list[Conversation]
    total: int
    page: int
    page_size: int


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
    async def search(
        self,
        organization_id: UUID | None,
        scope_id: UUID | None,
        scope_type: str | None,
        filters: list[ConversationFilter],
        page: int,
        page_size: int,
        sort_by: str = "timestamp",
        sort_dir: int = -1,
    ) -> PagedResult: ...

    @abstractmethod
    async def update(self, conversation: Conversation) -> None: ...

    @abstractmethod
    async def delete(self, conversation_id: UUID) -> None: ...
