import json
from typing import Any
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
from src.conversations.domain.models import Conversation, ScopeType
from src.conversations.domain.repositories import ConversationRepository
from src.conversations.infrastructure.repositories import MongoConversationRepository
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


def _commands(repo: ConversationRepository = Depends(_repo)) -> ConversationCommandHandler:
    return ConversationCommandHandler(repo)


def _queries(repo: ConversationRepository = Depends(_repo)) -> ConversationQueryHandler:
    return ConversationQueryHandler(repo)


# --- Schemas ---


class MetadataEntry(BaseModel):
    key: str
    value: str


class StatsResponse(BaseModel):
    word_count: int | None
    duration_seconds: float | None
    cost_cents: int | None


class ConversationCreate(BaseModel):
    title: str
    content: str
    metadata: list[MetadataEntry] = []
    emit_webhook: bool = False
    organization_id: UUID | None = None
    scope_id: UUID | None = None
    scope_type: ScopeType | None = None
    tag_ids: list[UUID] = []


class ConversationUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    metadata: list[MetadataEntry] | None = None
    emit_webhook: bool | None = None


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    content: Any  # str for plain text; list[{speaker, text}] for transcripts
    timestamp: str
    metadata: list[MetadataEntry]
    emit_webhook: bool
    created_by: UUID
    organization_id: UUID | None
    scope_id: UUID | None
    scope_type: ScopeType | None
    tag_ids: list[UUID]
    stats: StatsResponse


def _parse_content(raw: str) -> Any:
    if raw.startswith("["):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return raw


def _to_response(c: Conversation) -> ConversationResponse:
    return ConversationResponse(
        id=c.id,
        title=c.title,
        content=_parse_content(c.content),
        timestamp=c.timestamp.isoformat(),
        metadata=[MetadataEntry(key=k, value=v) for k, v in c.metadata],
        emit_webhook=c.emit_webhook,
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
    c = await commands.create(
        CreateConversationCommand(
            title=body.title,
            content=body.content,
            created_by=owner_id,
            metadata=[(e.key, e.value) for e in body.metadata],
            emit_webhook=body.emit_webhook,
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
                emit_webhook=body.emit_webhook,
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
