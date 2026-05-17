from uuid import UUID

from src.scopes.domain.models import Campaign, Organization, Project, Subproject
from src.scopes.domain.repositories import (
    CampaignRepository,
    OrganizationRepository,
    ProjectRepository,
    SubprojectRepository,
)


class OrganizationQueryHandler:
    def __init__(self, repo: OrganizationRepository) -> None:
        self._repo = repo

    async def list_for_member(self, user_id: UUID) -> list[Organization]:
        return await self._repo.find_by_member(user_id)

    async def get_by_id(self, org_id: UUID) -> Organization | None:
        return await self._repo.find_by_id(org_id)


class ProjectQueryHandler:
    def __init__(self, repo: ProjectRepository) -> None:
        self._repo = repo

    async def list_by_org(self, org_id: UUID) -> list[Project]:
        return await self._repo.find_by_organization(org_id)

    async def get_by_id(self, project_id: UUID) -> Project | None:
        return await self._repo.find_by_id(project_id)


class SubprojectQueryHandler:
    def __init__(self, repo: SubprojectRepository) -> None:
        self._repo = repo

    async def list_by_project(self, project_id: UUID) -> list[Subproject]:
        return await self._repo.find_by_project(project_id)

    async def get_by_id(self, subproject_id: UUID) -> Subproject | None:
        return await self._repo.find_by_id(subproject_id)


class CampaignQueryHandler:
    def __init__(self, repo: CampaignRepository) -> None:
        self._repo = repo

    async def list_by_parent(self, parent_id: UUID) -> list[Campaign]:
        return await self._repo.find_by_parent(parent_id)

    async def get_by_id(self, campaign_id: UUID) -> Campaign | None:
        return await self._repo.find_by_id(campaign_id)
