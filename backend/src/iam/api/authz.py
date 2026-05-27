from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from src.iam.application.authorization_service import AuthorizationService, NotAuthorized
from src.iam.domain.models import ApiKey, Group, Role, User
from src.iam.infrastructure.repositories import (
    MongoApiKeyRepository,
    MongoGroupRepository,
    MongoUserRepository,
)
from src.iam.infrastructure.scope_query import OrgScopeQuery
from src.shared.database import get_db
from src.shared.deps import get_authz, get_current_user

router = APIRouter(prefix="/iam", tags=["iam"])


# ---------------------------------------------------------------------------
# Dependency factories
# ---------------------------------------------------------------------------


def _group_repo() -> MongoGroupRepository:
    return MongoGroupRepository(get_db())


def _apikey_repo() -> MongoApiKeyRepository:
    return MongoApiKeyRepository(get_db())


def _user_repo() -> MongoUserRepository:
    return MongoUserRepository(get_db())


def _scope_query() -> OrgScopeQuery:
    return OrgScopeQuery(get_db())


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RoleAssignBody(BaseModel):
    subject: str  # "user:<uuid>" or "group:<uuid>" or "apikey:<uuid>"
    role: Role
    scope_type: str
    scope_id: UUID


class RoleRevokeBody(BaseModel):
    subject: str
    role: Role
    scope_type: str
    scope_id: UUID


class GroupCreate(BaseModel):
    name: str


class GroupMemberBody(BaseModel):
    user_id: UUID


class ApiKeyCreate(BaseModel):
    name: str
    scope_type: str | None = None
    scope_id: UUID | None = None
    role: Role | None = None


class GroupResponse(BaseModel):
    id: UUID
    name: str
    org_id: UUID
    owner_id: UUID
    member_ids: list[UUID]
    created_at: str


class ApiKeyResponse(BaseModel):
    id: UUID
    name: str
    key_prefix: str
    owner_id: UUID
    scope_type: str | None
    scope_id: UUID | None
    created_at: str


class ApiKeyCreatedResponse(ApiKeyResponse):
    raw_key: str


class UserSummaryResponse(BaseModel):
    id: UUID
    email: str


class RoleAssignmentResponse(BaseModel):
    subject: str
    role: str
    scope_type: str
    scope_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _group_resp(g: Group) -> GroupResponse:
    return GroupResponse(
        id=g.id,
        name=g.name,
        org_id=g.org_id,
        owner_id=g.owner_id,
        member_ids=g.member_ids,
        created_at=g.created_at.isoformat(),
    )


def _apikey_resp(k: ApiKey) -> ApiKeyResponse:
    return ApiKeyResponse(
        id=k.id,
        name=k.name,
        key_prefix=k.key_prefix,
        owner_id=k.owner_id,
        scope_type=k.scope_type,
        scope_id=k.scope_id,
        created_at=k.created_at.isoformat(),
    )


async def _require_manage_members(org_id: UUID, user: User, authz: AuthorizationService) -> None:
    if not await authz.can_do(
        f"user:{user.id}", "manage_members", "org", str(org_id), org_id=str(org_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )


# ---------------------------------------------------------------------------
# Role management
# ---------------------------------------------------------------------------


@router.post("/organizations/{org_id}/roles/assign", status_code=status.HTTP_204_NO_CONTENT)
async def assign_role(
    org_id: UUID,
    body: RoleAssignBody,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
):
    if not await authz.can_assign(
        f"user:{user.id}", body.role, body.scope_type, str(body.scope_id), org_id=str(org_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    await authz.assign_role(
        body.subject, body.role, body.scope_type, str(body.scope_id), org_id=str(org_id)
    )


@router.post("/organizations/{org_id}/roles/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_role(
    org_id: UUID,
    body: RoleRevokeBody,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
):
    if body.subject == f"user:{user.id}" and not authz.is_superadmin(f"user:{user.id}"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cannot revoke your own role"
        )
    if not await authz.can_assign(
        f"user:{user.id}", body.role, body.scope_type, str(body.scope_id), org_id=str(org_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    try:
        await authz.revoke_role(body.subject, body.role, body.scope_type, str(body.scope_id))
    except NotAuthorized as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


# ---------------------------------------------------------------------------
# Groups
# ---------------------------------------------------------------------------


@router.get("/organizations/{org_id}/groups", response_model=list[GroupResponse])
async def list_groups(
    org_id: UUID,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoGroupRepository = Depends(_group_repo),
):
    subject = f"user:{user.id}"
    if not authz.is_superadmin(subject) and not await authz.can_do(
        subject, "read", "org", str(org_id), org_id=str(org_id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return [_group_resp(g) for g in await repo.find_by_org(org_id)]


class GroupCreateBody(BaseModel):
    name: str
    scope_type: str | None = None
    scope_id: UUID | None = None


async def _require_group_write(
    group: Group, org_id: UUID, user: User, authz: AuthorizationService
) -> None:
    """Owner of the group, or org supervisor/admin."""
    if group.owner_id == user.id:
        return
    if await authz.can_do(
        f"user:{user.id}", "manage_members", "org", str(org_id), org_id=str(org_id)
    ):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.post(
    "/organizations/{org_id}/groups",
    response_model=GroupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_group(
    org_id: UUID,
    body: GroupCreateBody,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoGroupRepository = Depends(_group_repo),
):
    subject = f"user:{user.id}"
    can = await authz.can_do(subject, "manage_members", "org", str(org_id), org_id=str(org_id))
    if not can and body.scope_type and body.scope_id:
        can = await authz.can_do(
            subject, "manage_members", body.scope_type, str(body.scope_id), org_id=str(org_id)
        )
    if not can:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    group = Group.create(name=body.name, org_id=org_id, owner_id=user.id)
    await repo.save(group)
    return _group_resp(group)


@router.delete("/organizations/{org_id}/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    org_id: UUID,
    group_id: UUID,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoGroupRepository = Depends(_group_repo),
):
    group = await repo.find_by_id(group_id)
    if group is None or group.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _require_group_write(group, org_id, user, authz)
    await repo.delete(group_id)


@router.post(
    "/organizations/{org_id}/groups/{group_id}/members",
    response_model=GroupResponse,
)
async def add_group_member(
    org_id: UUID,
    group_id: UUID,
    body: GroupMemberBody,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoGroupRepository = Depends(_group_repo),
):
    group = await repo.find_by_id(group_id)
    if group is None or group.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _require_group_write(group, org_id, user, authz)
    group.add_member(body.user_id)
    await repo.save(group)
    return _group_resp(group)


@router.delete(
    "/organizations/{org_id}/groups/{group_id}/members/{member_id}",
    response_model=GroupResponse,
)
async def remove_group_member(
    org_id: UUID,
    group_id: UUID,
    member_id: UUID,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoGroupRepository = Depends(_group_repo),
):
    if member_id == user.id and not authz.is_superadmin(f"user:{user.id}"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove yourself from a group",
        )
    group = await repo.find_by_id(group_id)
    if group is None or group.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _require_group_write(group, org_id, user, authz)
    group.remove_member(member_id)
    await repo.save(group)
    return _group_resp(group)


# ---------------------------------------------------------------------------
# API keys
# ---------------------------------------------------------------------------


@router.post("/api-keys", response_model=ApiKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreate,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoApiKeyRepository = Depends(_apikey_repo),
):
    subject = f"user:{user.id}"
    if not authz.is_superadmin(subject) and not await authz.has_elevated_role_anywhere(subject):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires supervisor or admin role in at least one organization",
        )

    api_key, raw_key = ApiKey.create(
        name=body.name,
        owner_id=user.id,
        scope_type=body.scope_type,
        scope_id=body.scope_id,
    )
    await repo.save(api_key)

    if body.scope_type and body.scope_id and body.role:
        if not await authz.can_assign(
            f"user:{user.id}", body.role, body.scope_type, str(body.scope_id)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot issue an API key with a role exceeding your own",
            )
        await authz.assign_role(
            f"apikey:{api_key.id}", body.role, body.scope_type, str(body.scope_id)
        )

    return ApiKeyCreatedResponse(
        **_apikey_resp(api_key).model_dump(),
        raw_key=raw_key,
    )


@router.get("/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    user: User = Depends(get_current_user),
    repo: MongoApiKeyRepository = Depends(_apikey_repo),
):
    return [_apikey_resp(k) for k in await repo.find_by_owner(user.id)]


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: UUID,
    user: User = Depends(get_current_user),
    repo: MongoApiKeyRepository = Depends(_apikey_repo),
):
    key = await repo.find_by_id(key_id)
    if key is None or key.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await repo.delete(key_id)


# ---------------------------------------------------------------------------
# Users (read-only listing for role assignment UI)
# ---------------------------------------------------------------------------


@router.get("/users", response_model=list[UserSummaryResponse])
async def list_users(
    user: User = Depends(get_current_user),
    repo: MongoUserRepository = Depends(_user_repo),
):
    return [UserSummaryResponse(id=u.id, email=u.email) for u in await repo.find_all()]


@router.get("/organizations/{org_id}/roles", response_model=list[RoleAssignmentResponse])
async def list_role_assignments(
    org_id: UUID,
    scope_type: str | None = Query(None),
    scope_id: UUID | None = Query(None),
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    scopes: OrgScopeQuery = Depends(_scope_query),
):
    subject = f"user:{user.id}"

    if scope_type and scope_id:
        if not await authz.can_do(subject, "read", scope_type, str(scope_id), org_id=str(org_id)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
        domains = [f"{scope_type}:{scope_id}"]
    else:
        if not await authz.can_do(subject, "read", "org", str(org_id), org_id=str(org_id)):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
        domains = await scopes.all_domains(org_id)

    results = []
    for sub, role, domain in await authz.list_roles_for_domains(domains):
        sep = domain.find(":")
        if sep > 0:
            results.append(
                RoleAssignmentResponse(
                    subject=sub,
                    role=role,
                    scope_type=domain[:sep],
                    scope_id=domain[sep + 1 :],
                )
            )
    return results


# ---------------------------------------------------------------------------
# My roles — effective role at every scope in an org (for UX gating)
# ---------------------------------------------------------------------------


class MyRolesResponse(BaseModel):
    org: str | None
    projects: dict[str, str | None]
    subprojects: dict[str, str | None]
    campaigns: dict[str, str | None]


@router.get("/organizations/{org_id}/my-roles", response_model=MyRolesResponse)
async def my_roles(
    org_id: UUID,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    scopes: OrgScopeQuery = Depends(_scope_query),
):
    subject = f"user:{user.id}"
    oid = str(org_id)

    org_role = await authz.effective_role(subject, "org", oid, org_id=oid)

    pids = await scopes.project_ids(org_id)
    project_roles = {
        str(pid): await authz.effective_role(subject, "project", str(pid), org_id=oid)
        for pid in pids
    }

    sids = await scopes.subproject_ids(pids)
    subproject_roles = {
        str(sid): await authz.effective_role(subject, "subproject", str(sid), org_id=oid)
        for sid in sids
    }

    cids = await scopes.campaign_ids(org_id)
    campaign_roles = {
        str(cid): await authz.effective_role(subject, "campaign", str(cid), org_id=oid)
        for cid in cids
    }

    return MyRolesResponse(
        org=org_role,
        projects=project_roles,
        subprojects=subproject_roles,
        campaigns=campaign_roles,
    )
