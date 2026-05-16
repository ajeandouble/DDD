from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.iam.application.authorization_service import AuthorizationService, NotAuthorized
from src.iam.domain.models import ApiKey, Group, Role, Tag, User
from src.iam.infrastructure.repositories import (
    MongoApiKeyRepository,
    MongoGroupRepository,
    MongoTagRepository,
)
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


def _tag_repo() -> MongoTagRepository:
    return MongoTagRepository(get_db())


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


class TagCreate(BaseModel):
    name: str


class TagResponse(BaseModel):
    id: UUID
    name: str
    org_id: UUID
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _group_resp(g: Group) -> GroupResponse:
    return GroupResponse(
        id=g.id,
        name=g.name,
        org_id=g.org_id,
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


def _tag_resp(t: Tag) -> TagResponse:
    return TagResponse(
        id=t.id,
        name=t.name,
        org_id=t.org_id,
        created_at=t.created_at.isoformat(),
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    await authz.assign_role(body.subject, body.role, body.scope_type, str(body.scope_id))


@router.post("/organizations/{org_id}/roles/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_role(
    org_id: UUID,
    body: RoleRevokeBody,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
):
    if not await authz.can_assign(
        f"user:{user.id}", body.role, body.scope_type, str(body.scope_id), org_id=str(org_id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
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
    if not await authz.can_do(f"user:{user.id}", "read", "org", str(org_id), org_id=str(org_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return [_group_resp(g) for g in await repo.find_by_org(org_id)]


@router.post(
    "/organizations/{org_id}/groups",
    response_model=GroupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_group(
    org_id: UUID,
    body: GroupCreate,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoGroupRepository = Depends(_group_repo),
):
    await _require_manage_members(org_id, user, authz)
    group = Group.create(name=body.name, org_id=org_id)
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
    await _require_manage_members(org_id, user, authz)
    group = await repo.find_by_id(group_id)
    if group is None or group.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
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
    await _require_manage_members(org_id, user, authz)
    group = await repo.find_by_id(group_id)
    if group is None or group.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
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
    await _require_manage_members(org_id, user, authz)
    group = await repo.find_by_id(group_id)
    if group is None or group.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
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
# Tags
# ---------------------------------------------------------------------------


@router.get("/organizations/{org_id}/tags", response_model=list[TagResponse])
async def list_tags(
    org_id: UUID,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoTagRepository = Depends(_tag_repo),
):
    if not await authz.can_do(f"user:{user.id}", "read", "org", str(org_id), org_id=str(org_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return [_tag_resp(t) for t in await repo.find_by_org(org_id)]


@router.post(
    "/organizations/{org_id}/tags",
    response_model=TagResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_tag(
    org_id: UUID,
    body: TagCreate,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoTagRepository = Depends(_tag_repo),
):
    if not await authz.can_do(f"user:{user.id}", "write", "org", str(org_id), org_id=str(org_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    tag = Tag.create(name=body.name, org_id=org_id)
    await repo.save(tag)
    return _tag_resp(tag)


@router.delete("/organizations/{org_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    org_id: UUID,
    tag_id: UUID,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: MongoTagRepository = Depends(_tag_repo),
):
    if not await authz.can_do(f"user:{user.id}", "delete", "org", str(org_id), org_id=str(org_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    tag = await repo.find_by_id(tag_id)
    if tag is None or tag.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await repo.delete(tag_id)
