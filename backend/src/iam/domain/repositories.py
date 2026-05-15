from abc import ABC, abstractmethod
from uuid import UUID

from src.iam.domain.models import ApiKey, Group, Tag, User


class UserRepository(ABC):
    @abstractmethod
    async def save(self, user: User) -> None: ...

    @abstractmethod
    async def find_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def find_by_id(self, user_id: UUID) -> User | None: ...


class GroupRepository(ABC):
    @abstractmethod
    async def save(self, group: Group) -> None: ...

    @abstractmethod
    async def find_by_id(self, group_id: UUID) -> Group | None: ...

    @abstractmethod
    async def find_by_org(self, org_id: UUID) -> list[Group]: ...

    @abstractmethod
    async def find_by_member_in_org(self, user_id: UUID, org_id: UUID) -> list[Group]: ...

    @abstractmethod
    async def delete(self, group_id: UUID) -> None: ...


class ApiKeyRepository(ABC):
    @abstractmethod
    async def save(self, api_key: ApiKey) -> None: ...

    @abstractmethod
    async def find_by_id(self, key_id: UUID) -> ApiKey | None: ...

    @abstractmethod
    async def find_by_hash(self, key_hash: str) -> ApiKey | None: ...

    @abstractmethod
    async def find_by_owner(self, owner_id: UUID) -> list[ApiKey]: ...

    @abstractmethod
    async def delete(self, key_id: UUID) -> None: ...


class TagRepository(ABC):
    @abstractmethod
    async def save(self, tag: Tag) -> None: ...

    @abstractmethod
    async def find_by_id(self, tag_id: UUID) -> Tag | None: ...

    @abstractmethod
    async def find_by_org(self, org_id: UUID) -> list[Tag]: ...

    @abstractmethod
    async def delete(self, tag_id: UUID) -> None: ...
