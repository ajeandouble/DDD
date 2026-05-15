from abc import ABC, abstractmethod
from uuid import UUID

from src.scopes.domain.models import Campaign, Organization, Project, Subproject


class OrganizationRepository(ABC):
    @abstractmethod
    async def save(self, org: Organization) -> None: ...

    @abstractmethod
    async def find_by_id(self, org_id: UUID) -> Organization | None: ...

    @abstractmethod
    async def find_by_member(self, user_id: UUID) -> list[Organization]: ...

    @abstractmethod
    async def update(self, org: Organization) -> None: ...

    @abstractmethod
    async def delete(self, org_id: UUID) -> None: ...


class ProjectRepository(ABC):
    @abstractmethod
    async def save(self, project: Project) -> None: ...

    @abstractmethod
    async def find_by_id(self, project_id: UUID) -> Project | None: ...

    @abstractmethod
    async def find_by_organization(self, org_id: UUID) -> list[Project]: ...

    @abstractmethod
    async def update(self, project: Project) -> None: ...

    @abstractmethod
    async def delete(self, project_id: UUID) -> None: ...


class SubprojectRepository(ABC):
    @abstractmethod
    async def save(self, subproject: Subproject) -> None: ...

    @abstractmethod
    async def find_by_id(self, subproject_id: UUID) -> Subproject | None: ...

    @abstractmethod
    async def find_by_project(self, project_id: UUID) -> list[Subproject]: ...

    @abstractmethod
    async def update(self, subproject: Subproject) -> None: ...

    @abstractmethod
    async def delete(self, subproject_id: UUID) -> None: ...


class CampaignRepository(ABC):
    @abstractmethod
    async def save(self, campaign: Campaign) -> None: ...

    @abstractmethod
    async def find_by_id(self, campaign_id: UUID) -> Campaign | None: ...

    @abstractmethod
    async def find_by_subproject(self, subproject_id: UUID) -> list[Campaign]: ...

    @abstractmethod
    async def update(self, campaign: Campaign) -> None: ...

    @abstractmethod
    async def delete(self, campaign_id: UUID) -> None: ...
