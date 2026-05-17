from dataclasses import dataclass
from uuid import UUID

from src.scopes.domain.events import (
    CampaignCreated,
    OrganizationCreated,
    ProjectCreated,
    SubprojectCreated,
)
from src.scopes.domain.models import Campaign, Organization, Project, Subproject
from src.scopes.domain.repositories import (
    CampaignRepository,
    OrganizationRepository,
    ProjectRepository,
    SubprojectRepository,
)
from src.shared.events import publish


class ScopeNotFound(Exception):
    pass


class NotAMember(Exception):
    pass


# --- Organization ---


@dataclass
class CreateOrganizationCommand:
    name: str
    owner_id: UUID


@dataclass
class AddMemberCommand:
    org_id: UUID
    user_id: UUID
    requesting_user_id: UUID


class OrganizationCommandHandler:
    def __init__(self, repo: OrganizationRepository) -> None:
        self._repo = repo

    async def create(self, cmd: CreateOrganizationCommand) -> Organization:
        org = Organization.create(name=cmd.name, owner_id=cmd.owner_id)
        await self._repo.save(org)
        await publish(OrganizationCreated(org_id=org.id, owner_id=org.owner_id))
        return org

    async def add_member(self, cmd: AddMemberCommand) -> Organization:
        org = await self._repo.find_by_id(cmd.org_id)
        if org is None:
            raise ScopeNotFound(cmd.org_id)
        if not org.is_member(cmd.requesting_user_id):
            raise NotAMember(cmd.requesting_user_id)
        org.add_member(cmd.user_id)
        await self._repo.update(org)
        return org

    async def delete(self, org_id: UUID) -> None:
        org = await self._repo.find_by_id(org_id)
        if org is None:
            raise ScopeNotFound(org_id)
        await self._repo.delete(org_id)


# --- Project ---


@dataclass
class CreateProjectCommand:
    name: str
    organization_id: UUID
    requesting_user_id: UUID


class ProjectCommandHandler:
    def __init__(self, project_repo: ProjectRepository, org_repo: OrganizationRepository) -> None:
        self._repo = project_repo
        self._org_repo = org_repo

    async def create(self, cmd: CreateProjectCommand) -> Project:
        org = await self._org_repo.find_by_id(cmd.organization_id)
        if org is None:
            raise ScopeNotFound(cmd.organization_id)
        if not org.is_member(cmd.requesting_user_id):
            raise NotAMember(cmd.requesting_user_id)
        project = Project.create(name=cmd.name, organization_id=cmd.organization_id)
        await self._repo.save(project)
        await publish(ProjectCreated(project_id=project.id, org_id=cmd.organization_id))
        return project

    async def delete(self, project_id: UUID) -> None:
        project = await self._repo.find_by_id(project_id)
        if project is None:
            raise ScopeNotFound(project_id)
        await self._repo.delete(project_id)


# --- Subproject ---


@dataclass
class CreateSubprojectCommand:
    name: str
    project_id: UUID
    org_id: UUID
    requesting_user_id: UUID


class SubprojectCommandHandler:
    def __init__(
        self,
        subproject_repo: SubprojectRepository,
        project_repo: ProjectRepository,
        org_repo: OrganizationRepository,
    ) -> None:
        self._repo = subproject_repo
        self._project_repo = project_repo
        self._org_repo = org_repo

    async def create(self, cmd: CreateSubprojectCommand) -> Subproject:
        org = await self._org_repo.find_by_id(cmd.org_id)
        if org is None:
            raise ScopeNotFound(cmd.org_id)
        if not org.is_member(cmd.requesting_user_id):
            raise NotAMember(cmd.requesting_user_id)
        project = await self._project_repo.find_by_id(cmd.project_id)
        if project is None:
            raise ScopeNotFound(cmd.project_id)
        subproject = Subproject.create(name=cmd.name, project_id=cmd.project_id)
        await self._repo.save(subproject)
        await publish(SubprojectCreated(subproject_id=subproject.id, project_id=cmd.project_id))
        return subproject

    async def delete(self, subproject_id: UUID) -> None:
        sp = await self._repo.find_by_id(subproject_id)
        if sp is None:
            raise ScopeNotFound(subproject_id)
        await self._repo.delete(subproject_id)


# --- Campaign ---


@dataclass
class CreateCampaignCommand:
    name: str
    parent_type: str  # "organization" | "project" | "subproject"
    parent_id: UUID
    org_id: UUID
    requesting_user_id: UUID


class CampaignCommandHandler:
    def __init__(
        self,
        campaign_repo: CampaignRepository,
        org_repo: OrganizationRepository,
    ) -> None:
        self._repo = campaign_repo
        self._org_repo = org_repo

    async def create(self, cmd: CreateCampaignCommand) -> Campaign:
        org = await self._org_repo.find_by_id(cmd.org_id)
        if org is None:
            raise ScopeNotFound(cmd.org_id)
        if not org.is_member(cmd.requesting_user_id):
            raise NotAMember(cmd.requesting_user_id)
        campaign = Campaign.create(
            name=cmd.name,
            parent_type=cmd.parent_type,
            parent_id=cmd.parent_id,
            organization_id=cmd.org_id,
        )
        await self._repo.save(campaign)
        await publish(
            CampaignCreated(
                campaign_id=campaign.id,
                parent_type=cmd.parent_type,
                parent_id=cmd.parent_id,
                organization_id=cmd.org_id,
            )
        )
        return campaign

    async def delete(self, campaign_id: UUID) -> None:
        c = await self._repo.find_by_id(campaign_id)
        if c is None:
            raise ScopeNotFound(campaign_id)
        await self._repo.delete(campaign_id)
