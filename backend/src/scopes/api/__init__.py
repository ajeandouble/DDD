from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.iam.application.authorization_service import AuthorizationService
from src.iam.domain.models import Principal, User
from src.scopes.application.commands import (
    AddMemberCommand,
    CampaignCommandHandler,
    CreateCampaignCommand,
    CreateOrganizationCommand,
    CreateProjectCommand,
    CreateSubprojectCommand,
    NotAMember,
    OrganizationCommandHandler,
    ProjectCommandHandler,
    ScopeNotFound,
    SubprojectCommandHandler,
)
from src.scopes.application.queries import (
    CampaignQueryHandler,
    OrganizationQueryHandler,
    ProjectQueryHandler,
    SubprojectQueryHandler,
)
from src.scopes.domain.models import Campaign, Organization, Project, Subproject
from src.scopes.domain.repositories import (
    CampaignRepository,
    OrganizationRepository,
    ProjectRepository,
    SubprojectRepository,
)
from src.scopes.infrastructure.repositories import (
    MongoCampaignRepository,
    MongoOrganizationRepository,
    MongoProjectRepository,
    MongoSubprojectRepository,
)
from src.shared.database import get_db
from src.shared.deps import get_authz, get_current_principal, get_current_user, principal_subject

router = APIRouter(prefix="/scopes", tags=["scopes"], dependencies=[Depends(get_current_principal)])


# --- Dependency factories ---


def _org_repo() -> OrganizationRepository:
    return MongoOrganizationRepository(get_db())


def _project_repo() -> ProjectRepository:
    return MongoProjectRepository(get_db())


def _subproject_repo() -> SubprojectRepository:
    return MongoSubprojectRepository(get_db())


def _campaign_repo() -> CampaignRepository:
    return MongoCampaignRepository(get_db())


def _org_commands(
    org_repo: OrganizationRepository = Depends(_org_repo),
) -> OrganizationCommandHandler:
    return OrganizationCommandHandler(org_repo)


def _project_commands(
    project_repo: ProjectRepository = Depends(_project_repo),
    org_repo: OrganizationRepository = Depends(_org_repo),
) -> ProjectCommandHandler:
    return ProjectCommandHandler(project_repo, org_repo)


def _subproject_commands(
    subproject_repo: SubprojectRepository = Depends(_subproject_repo),
    project_repo: ProjectRepository = Depends(_project_repo),
    org_repo: OrganizationRepository = Depends(_org_repo),
) -> SubprojectCommandHandler:
    return SubprojectCommandHandler(subproject_repo, project_repo, org_repo)


def _campaign_commands(
    campaign_repo: CampaignRepository = Depends(_campaign_repo),
    subproject_repo: SubprojectRepository = Depends(_subproject_repo),
    org_repo: OrganizationRepository = Depends(_org_repo),
) -> CampaignCommandHandler:
    return CampaignCommandHandler(campaign_repo, subproject_repo, org_repo)


def _org_queries(
    org_repo: OrganizationRepository = Depends(_org_repo),
) -> OrganizationQueryHandler:
    return OrganizationQueryHandler(org_repo)


def _project_queries(
    project_repo: ProjectRepository = Depends(_project_repo),
) -> ProjectQueryHandler:
    return ProjectQueryHandler(project_repo)


def _subproject_queries(
    subproject_repo: SubprojectRepository = Depends(_subproject_repo),
) -> SubprojectQueryHandler:
    return SubprojectQueryHandler(subproject_repo)


def _campaign_queries(
    campaign_repo: CampaignRepository = Depends(_campaign_repo),
) -> CampaignQueryHandler:
    return CampaignQueryHandler(campaign_repo)


# --- Request / Response schemas ---


class OrgCreate(BaseModel):
    name: str


class AddMemberBody(BaseModel):
    user_id: UUID


class ProjectCreate(BaseModel):
    name: str


class SubprojectCreate(BaseModel):
    name: str


class CampaignCreate(BaseModel):
    name: str


class OrgResponse(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    member_ids: list[UUID]
    created_at: str


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    organization_id: UUID
    created_at: str


class SubprojectResponse(BaseModel):
    id: UUID
    name: str
    project_id: UUID
    created_at: str


class CampaignResponse(BaseModel):
    id: UUID
    name: str
    subproject_id: UUID
    created_at: str


def _org_resp(org: Organization) -> OrgResponse:
    return OrgResponse(
        id=org.id,
        name=org.name,
        owner_id=org.owner_id,
        member_ids=org.member_ids,
        created_at=org.created_at.isoformat(),
    )


def _project_resp(p: Project) -> ProjectResponse:
    return ProjectResponse(
        id=p.id,
        name=p.name,
        organization_id=p.organization_id,
        created_at=p.created_at.isoformat(),
    )


def _subproject_resp(sp: Subproject) -> SubprojectResponse:
    return SubprojectResponse(
        id=sp.id,
        name=sp.name,
        project_id=sp.project_id,
        created_at=sp.created_at.isoformat(),
    )


def _campaign_resp(c: Campaign) -> CampaignResponse:
    return CampaignResponse(
        id=c.id,
        name=c.name,
        subproject_id=c.subproject_id,
        created_at=c.created_at.isoformat(),
    )


async def _require(
    can: bool, detail: str = "Insufficient permissions", code: int = status.HTTP_403_FORBIDDEN
) -> None:
    if not can:
        raise HTTPException(status_code=code, detail=detail)


# --- Organizations ---


@router.get("/organizations/", response_model=list[OrgResponse])
async def list_organizations(
    queries: OrganizationQueryHandler = Depends(_org_queries),
    principal: Principal = Depends(get_current_principal),
):
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    return [_org_resp(o) for o in await queries.list_for_member(owner_id)]


@router.post("/organizations/", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrgCreate,
    commands: OrganizationCommandHandler = Depends(_org_commands),
    user: User = Depends(get_current_user),
):
    org = await commands.create(CreateOrganizationCommand(name=body.name, owner_id=user.id))
    return _org_resp(org)


@router.get("/organizations/{org_id}", response_model=OrgResponse)
async def get_organization(
    org_id: UUID,
    queries: OrganizationQueryHandler = Depends(_org_queries),
    principal: Principal = Depends(get_current_principal),
):
    org = await queries.get_by_id(org_id)
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    if org is None or not org.is_member(owner_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return _org_resp(org)


@router.post("/organizations/{org_id}/members", response_model=OrgResponse)
async def add_member(
    org_id: UUID,
    body: AddMemberBody,
    commands: OrganizationCommandHandler = Depends(_org_commands),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    subj = principal_subject(principal)
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    await _require(await authz.can_do(subj, "manage_members", "org", str(org_id), org_id=str(org_id)))
    try:
        org = await commands.add_member(
            AddMemberCommand(org_id=org_id, user_id=body.user_id, requesting_user_id=owner_id)
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _org_resp(org)


# --- Projects ---


@router.get("/organizations/{org_id}/projects/", response_model=list[ProjectResponse])
async def list_projects(
    org_id: UUID,
    queries: ProjectQueryHandler = Depends(_project_queries),
    org_queries: OrganizationQueryHandler = Depends(_org_queries),
    principal: Principal = Depends(get_current_principal),
):
    org = await org_queries.get_by_id(org_id)
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    if org is None or not org.is_member(owner_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return [_project_resp(p) for p in await queries.list_by_org(org_id)]


@router.post(
    "/organizations/{org_id}/projects/",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    org_id: UUID,
    body: ProjectCreate,
    commands: ProjectCommandHandler = Depends(_project_commands),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    subj = principal_subject(principal)
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    await _require(await authz.can_do(subj, "write", "org", str(org_id), org_id=str(org_id)))
    try:
        project = await commands.create(
            CreateProjectCommand(name=body.name, organization_id=org_id, requesting_user_id=owner_id)
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _project_resp(project)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    queries: ProjectQueryHandler = Depends(_project_queries),
):
    project = await queries.get_by_id(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _project_resp(project)


# --- Subprojects ---


@router.get("/projects/{project_id}/subprojects/", response_model=list[SubprojectResponse])
async def list_subprojects(
    project_id: UUID,
    queries: SubprojectQueryHandler = Depends(_subproject_queries),
):
    return [_subproject_resp(sp) for sp in await queries.list_by_project(project_id)]


@router.post(
    "/projects/{project_id}/subprojects/",
    response_model=SubprojectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_subproject(
    project_id: UUID,
    body: SubprojectCreate,
    commands: SubprojectCommandHandler = Depends(_subproject_commands),
    project_queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    project = await project_queries.get_by_id(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    subj = principal_subject(principal)
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    await _require(
        await authz.can_do(subj, "write", "project", str(project_id), org_id=str(project.organization_id))
    )
    try:
        sp = await commands.create(
            CreateSubprojectCommand(
                name=body.name,
                project_id=project_id,
                org_id=project.organization_id,
                requesting_user_id=owner_id,
            )
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _subproject_resp(sp)


@router.get("/subprojects/{subproject_id}", response_model=SubprojectResponse)
async def get_subproject(
    subproject_id: UUID,
    queries: SubprojectQueryHandler = Depends(_subproject_queries),
):
    sp = await queries.get_by_id(subproject_id)
    if sp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subproject not found")
    return _subproject_resp(sp)


# --- Campaigns ---


@router.get("/subprojects/{subproject_id}/campaigns/", response_model=list[CampaignResponse])
async def list_campaigns(
    subproject_id: UUID,
    queries: CampaignQueryHandler = Depends(_campaign_queries),
):
    return [_campaign_resp(c) for c in await queries.list_by_subproject(subproject_id)]


@router.post(
    "/subprojects/{subproject_id}/campaigns/",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_campaign(
    subproject_id: UUID,
    body: CampaignCreate,
    commands: CampaignCommandHandler = Depends(_campaign_commands),
    subproject_queries: SubprojectQueryHandler = Depends(_subproject_queries),
    project_queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    sp = await subproject_queries.get_by_id(subproject_id)
    if sp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subproject not found")
    project = await project_queries.get_by_id(sp.project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    subj = principal_subject(principal)
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    await _require(
        await authz.can_do(subj, "write", "subproject", str(subproject_id), org_id=str(project.organization_id))
    )
    try:
        c = await commands.create(
            CreateCampaignCommand(
                name=body.name,
                subproject_id=subproject_id,
                org_id=project.organization_id,
                requesting_user_id=owner_id,
            )
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _campaign_resp(c)


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: UUID,
    queries: CampaignQueryHandler = Depends(_campaign_queries),
):
    c = await queries.get_by_id(campaign_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return _campaign_resp(c)
