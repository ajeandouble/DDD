from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from src.conversations.application.commands import (
    ConversationCommandHandler,
    ConversationNotFound,
    CreateConversationCommand,
    UpdateConversationCommand,
)
from src.conversations.application.queries import ConversationQueryHandler
from src.conversations.domain.models import Conversation, ConversationType, ScopeType, Tag
from src.conversations.domain.repositories import (
    ConversationFilter,
    ConversationRepository,
    TagRepository,
)
from src.conversations.infrastructure.repositories import (
    MongoConversationRepository,
    MongoTagRepository,
)
from src.iam.application.authorization_service import AuthorizationService
from src.iam.domain.models import Principal, User
from src.shared.database import get_db
from src.shared.deps import get_authz, get_current_principal, get_current_user, principal_subject

router = APIRouter(
    prefix="/conversations",
    tags=["conversations"],
    dependencies=[Depends(get_current_principal)],
)


def _repo() -> ConversationRepository:
    return MongoConversationRepository(get_db())


def _tag_repo() -> TagRepository:
    return MongoTagRepository(get_db())


def _commands(repo: ConversationRepository = Depends(_repo)) -> ConversationCommandHandler:
    return ConversationCommandHandler(repo)


def _queries(repo: ConversationRepository = Depends(_repo)) -> ConversationQueryHandler:
    return ConversationQueryHandler(repo)


# --- Schemas ---


class TagCreate(BaseModel):
    name: str


class TagResponse(BaseModel):
    id: UUID
    name: str
    org_id: UUID
    created_at: str


def _tag_resp(t: Tag) -> TagResponse:
    return TagResponse(id=t.id, name=t.name, org_id=t.org_id, created_at=t.created_at.isoformat())


class MetadataEntry(BaseModel):
    key: str
    value: str


class StatsResponse(BaseModel):
    word_count: int | None
    duration_seconds: float | None
    cost_cents: int | None


class ConversationCreate(BaseModel):
    title: str
    content: str | list[dict] = ""
    type: ConversationType = "review"
    conversation_timestamp: datetime | None = None
    metadata: list[MetadataEntry] = []
    organization_id: UUID | None = None
    scope_id: UUID
    scope_type: Literal["campaign"] = "campaign"
    tag_ids: list[UUID] = []


class ConversationUpdate(BaseModel):
    title: str | None = None
    content: str | list[dict] | None = None
    metadata: list[MetadataEntry] | None = None
    tag_ids: list[UUID] | None = None


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    content: Any
    type: ConversationType
    conversation_timestamp: str
    created_at: str
    metadata: list[MetadataEntry]
    created_by: UUID
    organization_id: UUID | None
    scope_id: UUID | None
    scope_type: ScopeType | None
    tag_ids: list[UUID]
    stats: StatsResponse


class FilterInput(BaseModel):
    field: Literal["title", "content", "meta", "stats.word_count", "stats.duration_seconds"]
    op: Literal["eq", "contains", "regex", "gt", "gte", "lt", "lte"]
    value: str
    meta_key: str = ""


class SearchBody(BaseModel):
    filters: list[FilterInput] = []
    tag_ids: list[UUID] = []
    page: int = 1
    page_size: int = 20
    sort_by: str = "conversation_timestamp"
    sort_dir: int = -1  # -1 = desc, 1 = asc


class PagedConversations(BaseModel):
    items: list[ConversationResponse]
    total: int
    page: int
    page_size: int


def _to_response(c: Conversation) -> ConversationResponse:
    return ConversationResponse(
        id=c.id,
        title=c.title,
        content=c.content,
        type=c.type,
        conversation_timestamp=c.conversation_timestamp.isoformat(),
        created_at=c.created_at.isoformat(),
        metadata=[MetadataEntry(key=k, value=v) for k, v in c.metadata],
        created_by=c.created_by,
        organization_id=c.organization_id,
        scope_id=c.scope_id,
        scope_type=c.scope_type,
        tag_ids=c.tag_ids,
        stats=StatsResponse(
            word_count=c.stats.word_count,
            duration_seconds=c.stats.duration_seconds,
            cost_cents=c.stats.cost_cents,
        ),
    )


def _casbin_scope(c: Conversation) -> tuple[str, str] | None:
    """Map conversation scope to (casbin_domain_type, scope_id) for authz checks."""
    if c.scope_id and c.scope_type:
        casbin_type = "org" if c.scope_type == "organization" else c.scope_type
        return (casbin_type, str(c.scope_id))
    if c.organization_id:
        return ("org", str(c.organization_id))
    return None


async def _require_write(
    c: Conversation,
    principal: Principal,
    authz: AuthorizationService,
) -> None:
    if isinstance(principal, User) and c.created_by == principal.id:
        return
    scope = _casbin_scope(c)
    if scope is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    org_id = str(c.organization_id) if c.organization_id else None
    subj = principal_subject(principal)
    if not await authz.can_do(subj, "write", scope[0], scope[1], org_id=org_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )


# --- Queries ---


@router.get("/", response_model=list[ConversationResponse])
async def list_conversations(
    organization_id: UUID | None = Query(None),
    scope_id: UUID | None = Query(None),
    scope_type: ScopeType | None = Query(None),
    queries: ConversationQueryHandler = Depends(_queries),
):
    return [
        _to_response(c)
        for c in await queries.list_all(
            organization_id=organization_id,
            scope_id=scope_id,
            scope_type=scope_type,
        )
    ]


@router.post("/search", response_model=PagedConversations)
async def search_conversations(
    body: SearchBody,
    organization_id: UUID | None = Query(None),
    scope_id: UUID | None = Query(None),
    scope_type: ScopeType | None = Query(None),
    queries: ConversationQueryHandler = Depends(_queries),
):
    filters = [
        ConversationFilter(field=f.field, op=f.op, value=f.value, meta_key=f.meta_key)
        for f in body.filters
    ]
    result = await queries.search(
        organization_id=organization_id,
        scope_id=scope_id,
        scope_type=scope_type,
        filters=filters,
        page=body.page,
        page_size=body.page_size,
        sort_by=body.sort_by,
        sort_dir=body.sort_dir,
        tag_ids=body.tag_ids or None,
    )
    return PagedConversations(
        items=[_to_response(c) for c in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
    )


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    queries: ConversationQueryHandler = Depends(_queries),
):
    c = await queries.get_by_id(conversation_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return _to_response(c)


# --- Commands ---


@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    commands: ConversationCommandHandler = Depends(_commands),
    principal: Principal = Depends(get_current_principal),
):
    owner_id = principal.id if isinstance(principal, User) else principal.owner_id
    ts = body.conversation_timestamp
    if ts is not None and ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    c = await commands.create(
        CreateConversationCommand(
            title=body.title,
            content=body.content,
            type=body.type,
            created_by=owner_id,
            conversation_timestamp=ts,
            metadata=[(e.key, e.value) for e in body.metadata],
            organization_id=body.organization_id,
            scope_id=body.scope_id,
            scope_type=body.scope_type,
            tag_ids=body.tag_ids,
        )
    )
    return _to_response(c)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    body: ConversationUpdate,
    commands: ConversationCommandHandler = Depends(_commands),
    queries: ConversationQueryHandler = Depends(_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    c = await queries.get_by_id(conversation_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await _require_write(c, principal, authz)
    try:
        updated = await commands.update(
            UpdateConversationCommand(
                id=conversation_id,
                title=body.title,
                content=body.content,
                metadata=(
                    [(e.key, e.value) for e in body.metadata] if body.metadata is not None else None
                ),
                tag_ids=body.tag_ids,
            )
        )
    except ConversationNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return _to_response(updated)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    commands: ConversationCommandHandler = Depends(_commands),
    queries: ConversationQueryHandler = Depends(_queries),
    principal: Principal = Depends(get_current_principal),
    authz: AuthorizationService = Depends(get_authz),
):
    c = await queries.get_by_id(conversation_id)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await _require_write(c, principal, authz)
    try:
        await commands.delete(conversation_id)
    except ConversationNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")


# ---------------------------------------------------------------------------
# Tags (org-scoped, used on conversations)
# ---------------------------------------------------------------------------


@router.get("/organizations/{org_id}/tags", response_model=list[TagResponse])
async def list_tags(
    org_id: UUID,
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
    repo: TagRepository = Depends(_tag_repo),
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
    repo: TagRepository = Depends(_tag_repo),
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
    repo: TagRepository = Depends(_tag_repo),
):
    if not await authz.can_do(f"user:{user.id}", "delete", "org", str(org_id), org_id=str(org_id)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    tag = await repo.find_by_id(tag_id)
    if tag is None or tag.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await repo.delete(tag_id)
