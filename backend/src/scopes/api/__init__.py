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
    RenameCampaignCommand,
    RenameProjectCommand,
    RenameSubprojectCommand,
    ScopeNotFound,
    SubprojectCommandHandler,
)
from src.scopes.application.queries import (
    CampaignQueryHandler,
    OrganizationQueryHandler,
    ProjectQueryHandler,
    SubprojectQueryHandler,
)
from src.scopes.domain.models import Campaign, Organization, Project, Subproject, VALID_COLORS
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
    org_repo: OrganizationRepository = Depends(_org_repo),
) -> CampaignCommandHandler:
    return CampaignCommandHandler(campaign_repo, org_repo)


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
    color: str | None = None


class SubprojectResponse(BaseModel):
    id: UUID
    name: str
    project_id: UUID
    created_at: str
    color: str | None = None


class ScopeSettingsBody(BaseModel):
    color: str | None = None


class ScopeRenameBody(BaseModel):
    name: str


class CampaignResponse(BaseModel):
    id: UUID
    name: str
    parent_type: str
    parent_id: UUID
    organization_id: UUID
    created_at: str
    color: str | None = None


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
        color=p.color,
    )


def _subproject_resp(sp: Subproject) -> SubprojectResponse:
    return SubprojectResponse(
        id=sp.id,
        name=sp.name,
        project_id=sp.project_id,
        created_at=sp.created_at.isoformat(),
        color=sp.color,
    )


def _campaign_resp(c: Campaign) -> CampaignResponse:
    return CampaignResponse(
        id=c.id,
        name=c.name,
        parent_type=c.parent_type,
        parent_id=c.parent_id,
        organization_id=c.organization_id,
        created_at=c.created_at.isoformat(),
        color=c.color,
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
    authz: AuthorizationService = Depends(get_authz),
):
    subject = f"user:{principal.id}" if isinstance(principal, User) else f"apikey:{principal.id}"
    if authz.is_superadmin(subject):
        return [_org_resp(o) for o in await queries._repo.find_all()]
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
    authz: AuthorizationService = Depends(get_authz),
):
    org = await queries.get_by_id(org_id)
    subject = f"user:{principal.id}" if isinstance(principal, User) else f"apikey:{principal.id}"
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    if org is None or (not authz.is_superadmin(subject) and not org.is_member(owner_id)):
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
    await _require(
        await authz.can_do(subj, "manage_members", "org", str(org_id), org_id=str(org_id))
    )
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
    authz: AuthorizationService = Depends(get_authz),
):
    org = await org_queries.get_by_id(org_id)
    subj = principal_subject(principal)
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    if org is None or (not authz.is_superadmin(subj) and not org.is_member(owner_id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    all_projects = await queries.list_by_org(org_id)
    allowed = await authz.accessible_project_ids(subj, str(org_id))
    if allowed is None:
        return [_project_resp(p) for p in all_projects]
    return [_project_resp(p) for p in all_projects if p.id in allowed]


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
            CreateProjectCommand(
                name=body.name,
                organization_id=org_id,
                requesting_user_id=owner_id,
                bypass_membership=authz.is_superadmin(subj),
            )
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _project_resp(project)


# --- Campaigns under organization ---


@router.get("/organizations/{org_id}/campaigns/", response_model=list[CampaignResponse])
async def list_org_campaigns(
    org_id: UUID,
    queries: CampaignQueryHandler = Depends(_campaign_queries),
    principal: Principal = Depends(get_current_principal),
):
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    org = await get_db()["organizations"].find_one({"_id": org_id, "member_ids": owner_id})
    if org is None:
        return []
    return [_campaign_resp(c) for c in await queries.list_by_parent(org_id)]


@router.post(
    "/organizations/{org_id}/campaigns/",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_org_campaign(
    org_id: UUID,
    body: CampaignCreate,
    commands: CampaignCommandHandler = Depends(_campaign_commands),
    org_queries: OrganizationQueryHandler = Depends(_org_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    org = await org_queries.get_by_id(org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    subj = principal_subject(principal)
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    await _require(await authz.can_do(subj, "write", "org", str(org_id), org_id=str(org_id)))
    try:
        c = await commands.create(
            CreateCampaignCommand(
                name=body.name,
                parent_type="organization",
                parent_id=org_id,
                org_id=org_id,
                requesting_user_id=owner_id,
                bypass_membership=authz.is_superadmin(subj),
            )
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _campaign_resp(c)


# --- Projects ---


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    queries: ProjectQueryHandler = Depends(_project_queries),
):
    project = await queries.get_by_id(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _project_resp(project)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def rename_project(
    project_id: UUID,
    body: ScopeRenameBody,
    commands: ProjectCommandHandler = Depends(_project_commands),
    queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    p = await queries.get_by_id(project_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    subj = principal_subject(principal)
    await _require(
        await authz.can_do(subj, "manage_members", "project", str(project_id), org_id=str(p.organization_id))
    )
    try:
        return _project_resp(await commands.rename(RenameProjectCommand(project_id=project_id, name=body.name)))
    except (ScopeNotFound, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND if isinstance(e, ScopeNotFound) else status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


# --- Subprojects ---


@router.get("/projects/{project_id}/subprojects/", response_model=list[SubprojectResponse])
async def list_subprojects(
    project_id: UUID,
    queries: SubprojectQueryHandler = Depends(_subproject_queries),
    project_queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    project = await project_queries.get_by_id(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    subj = principal_subject(principal)
    all_sps = await queries.list_by_project(project_id)
    allowed = await authz.accessible_subproject_ids(
        subj, str(project_id), str(project.organization_id)
    )
    if allowed is None:
        return [_subproject_resp(sp) for sp in all_sps]
    return [_subproject_resp(sp) for sp in all_sps if sp.id in allowed]


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
        await authz.can_do(
            subj, "write", "project", str(project_id), org_id=str(project.organization_id)
        )
    )
    try:
        sp = await commands.create(
            CreateSubprojectCommand(
                name=body.name,
                project_id=project_id,
                org_id=project.organization_id,
                requesting_user_id=owner_id,
                bypass_membership=authz.is_superadmin(subj),
            )
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _subproject_resp(sp)


# --- Campaigns under project ---


@router.get("/projects/{project_id}/campaigns/", response_model=list[CampaignResponse])
async def list_project_campaigns(
    project_id: UUID,
    queries: CampaignQueryHandler = Depends(_campaign_queries),
    project_queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    project = await project_queries.get_by_id(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    subj = principal_subject(principal)
    await _require(
        await authz.can_do(
            subj, "read", "project", str(project_id), org_id=str(project.organization_id)
        )
    )
    return [_campaign_resp(c) for c in await queries.list_by_parent(project_id)]


@router.post(
    "/projects/{project_id}/campaigns/",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project_campaign(
    project_id: UUID,
    body: CampaignCreate,
    commands: CampaignCommandHandler = Depends(_campaign_commands),
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
        await authz.can_do(
            subj, "write", "project", str(project_id), org_id=str(project.organization_id)
        )
    )
    try:
        c = await commands.create(
            CreateCampaignCommand(
                name=body.name,
                parent_type="project",
                parent_id=project_id,
                org_id=project.organization_id,
                requesting_user_id=owner_id,
            )
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _campaign_resp(c)


# --- Subprojects ---


@router.get("/subprojects/{subproject_id}", response_model=SubprojectResponse)
async def get_subproject(
    subproject_id: UUID,
    queries: SubprojectQueryHandler = Depends(_subproject_queries),
):
    sp = await queries.get_by_id(subproject_id)
    if sp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subproject not found")
    return _subproject_resp(sp)


@router.patch("/subprojects/{subproject_id}", response_model=SubprojectResponse)
async def rename_subproject(
    subproject_id: UUID,
    body: ScopeRenameBody,
    commands: SubprojectCommandHandler = Depends(_subproject_commands),
    subproject_queries: SubprojectQueryHandler = Depends(_subproject_queries),
    project_queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    sp = await subproject_queries.get_by_id(subproject_id)
    if sp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subproject not found")
    project = await project_queries.get_by_id(sp.project_id)
    org_id = str(project.organization_id) if project else None
    subj = principal_subject(principal)
    await _require(
        await authz.can_do(subj, "manage_members", "subproject", str(subproject_id), org_id=org_id)
    )
    try:
        return _subproject_resp(await commands.rename(RenameSubprojectCommand(subproject_id=subproject_id, name=body.name)))
    except (ScopeNotFound, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND if isinstance(e, ScopeNotFound) else status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


# --- Campaigns under subproject ---


@router.get("/subprojects/{subproject_id}/campaigns/", response_model=list[CampaignResponse])
async def list_subproject_campaigns(
    subproject_id: UUID,
    queries: CampaignQueryHandler = Depends(_campaign_queries),
    subproject_queries: SubprojectQueryHandler = Depends(_subproject_queries),
    project_queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    sp = await subproject_queries.get_by_id(subproject_id)
    if sp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    project = await project_queries.get_by_id(sp.project_id)
    subj = principal_subject(principal)
    org_id = str(project.organization_id) if project else None
    await _require(
        await authz.can_do(subj, "read", "subproject", str(subproject_id), org_id=org_id)
    )
    return [_campaign_resp(c) for c in await queries.list_by_parent(subproject_id)]


@router.post(
    "/subprojects/{subproject_id}/campaigns/",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_subproject_campaign(
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
        await authz.can_do(
            subj, "write", "subproject", str(subproject_id), org_id=str(project.organization_id)
        )
    )
    try:
        c = await commands.create(
            CreateCampaignCommand(
                name=body.name,
                parent_type="subproject",
                parent_id=subproject_id,
                org_id=project.organization_id,
                requesting_user_id=owner_id,
                bypass_membership=authz.is_superadmin(subj),
            )
        )
    except ScopeNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except NotAMember:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member")
    return _campaign_resp(c)


# --- Campaigns (individual) ---


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: UUID,
    queries: CampaignQueryHandler = Depends(_campaign_queries),
):
    c = await queries.get_by_id(campaign_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return _campaign_resp(c)


@router.patch("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def rename_campaign(
    campaign_id: UUID,
    body: ScopeRenameBody,
    commands: CampaignCommandHandler = Depends(_campaign_commands),
    queries: CampaignQueryHandler = Depends(_campaign_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    c = await queries.get_by_id(campaign_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    subj = principal_subject(principal)
    await _require(
        await authz.can_do(subj, "manage_members", "campaign", str(campaign_id), org_id=str(c.organization_id))
    )
    try:
        return _campaign_resp(await commands.rename(RenameCampaignCommand(campaign_id=campaign_id, name=body.name)))
    except (ScopeNotFound, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND if isinstance(e, ScopeNotFound) else status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.patch("/projects/{project_id}/settings", response_model=ProjectResponse)
async def update_project_settings(
    project_id: UUID,
    body: ScopeSettingsBody,
    project_repo: ProjectRepository = Depends(_project_repo),
    queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    p = await queries.get_by_id(project_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    subj = principal_subject(principal)
    await _require(
        await authz.can_do(
            subj, "manage_members", "project", str(project_id), org_id=str(p.organization_id)
        )
    )
    if body.color is not None and body.color not in VALID_COLORS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid color"
        )
    p.set_color(body.color)
    await project_repo.update(p)
    return _project_resp(p)


@router.patch("/subprojects/{subproject_id}/settings", response_model=SubprojectResponse)
async def update_subproject_settings(
    subproject_id: UUID,
    body: ScopeSettingsBody,
    subproject_repo: SubprojectRepository = Depends(_subproject_repo),
    subproject_queries: SubprojectQueryHandler = Depends(_subproject_queries),
    project_queries: ProjectQueryHandler = Depends(_project_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    sp = await subproject_queries.get_by_id(subproject_id)
    if sp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subproject not found")
    project = await project_queries.get_by_id(sp.project_id)
    org_id = str(project.organization_id) if project else None
    subj = principal_subject(principal)
    await _require(
        await authz.can_do(subj, "manage_members", "subproject", str(subproject_id), org_id=org_id)
    )
    if body.color is not None and body.color not in VALID_COLORS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid color"
        )
    sp.set_color(body.color)
    await subproject_repo.update(sp)
    return _subproject_resp(sp)


@router.patch("/campaigns/{campaign_id}/settings", response_model=CampaignResponse)
async def update_campaign_settings(
    campaign_id: UUID,
    body: ScopeSettingsBody,
    campaign_repo: CampaignRepository = Depends(_campaign_repo),
    queries: CampaignQueryHandler = Depends(_campaign_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    c = await queries.get_by_id(campaign_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    subj = principal_subject(principal)
    await _require(
        await authz.can_do(
            subj, "manage_members", "campaign", str(campaign_id), org_id=str(c.organization_id)
        )
    )
    if body.color is not None and body.color not in VALID_COLORS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid color"
        )
    c.set_color(body.color)
    await campaign_repo.update(c)
    return _campaign_resp(c)
