from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.iam.application.authorization_service import AuthorizationService
from src.iam.domain.models import User
from src.shared.database import get_db
from src.shared.deps import get_authz, get_current_user
from src.webhooks.application import run_transformer
from src.webhooks.domain import WebhookEndpoint
from src.webhooks.infrastructure.repositories import MongoDeliveryRepository, MongoWebhookEndpointRepository

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

SUPPORTED_EVENTS = ["conversation.transcribed"]


def _ep_repo():
    return MongoWebhookEndpointRepository(get_db())


def _del_repo():
    return MongoDeliveryRepository(get_db())


async def _require_admin(org_id: UUID, user: User, authz: AuthorizationService) -> None:
    role = await authz.effective_role(f"user:{user.id}", "org", str(org_id), org_id=str(org_id))
    if role not in ("admin",) and not authz.is_superadmin(f"user:{user.id}"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")


# --- Schemas ---

class EndpointCreate(BaseModel):
    url: str
    secret: str = ""
    event_types: list[str] = ["conversation.transcribed"]
    transformer: str = "result = payload"
    enabled: bool = True


class EndpointUpdate(BaseModel):
    url: str | None = None
    secret: str | None = None
    event_types: list[str] | None = None
    transformer: str | None = None
    enabled: bool | None = None


class EndpointResponse(BaseModel):
    id: UUID
    org_id: UUID
    url: str
    secret: str
    event_types: list[str]
    transformer: str
    enabled: bool
    created_at: str


class DeliveryResponse(BaseModel):
    id: UUID
    endpoint_id: UUID
    event_type: str
    payload_sent: dict
    status: str
    response_code: int | None
    error: str | None
    created_at: str


class TransformerTestBody(BaseModel):
    transformer: str
    payload: dict


class TransformerTestResponse(BaseModel):
    result: dict | None
    error: str | None
    stdout: str


def _ep_resp(ep: WebhookEndpoint) -> EndpointResponse:
    return EndpointResponse(
        id=ep.id,
        org_id=ep.org_id,
        url=ep.url,
        secret=ep.secret,
        event_types=ep.event_types,
        transformer=ep.transformer,
        enabled=ep.enabled,
        created_at=ep.created_at.isoformat(),
    )


# --- Endpoints CRUD ---

@router.get("/organizations/{org_id}/endpoints", response_model=list[EndpointResponse])
async def list_endpoints(
    org_id: UUID,
    repo: MongoWebhookEndpointRepository = Depends(_ep_repo),
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
):
    await _require_admin(org_id, user, authz)
    return [_ep_resp(ep) for ep in await repo.find_by_org(org_id)]


@router.post("/organizations/{org_id}/endpoints", response_model=EndpointResponse, status_code=201)
async def create_endpoint(
    org_id: UUID,
    body: EndpointCreate,
    repo: MongoWebhookEndpointRepository = Depends(_ep_repo),
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
):
    await _require_admin(org_id, user, authz)
    for et in body.event_types:
        if et not in SUPPORTED_EVENTS:
            raise HTTPException(400, f"Unknown event type: {et}")
    ep = WebhookEndpoint.create(
        org_id=org_id,
        url=body.url,
        secret=body.secret,
        transformer=body.transformer,
    )
    ep.event_types = body.event_types
    ep.enabled = body.enabled
    await repo.save(ep)
    return _ep_resp(ep)


@router.patch("/organizations/{org_id}/endpoints/{ep_id}", response_model=EndpointResponse)
async def update_endpoint(
    org_id: UUID,
    ep_id: UUID,
    body: EndpointUpdate,
    repo: MongoWebhookEndpointRepository = Depends(_ep_repo),
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
):
    await _require_admin(org_id, user, authz)
    ep = await repo.find_by_id(ep_id)
    if ep is None or ep.org_id != org_id:
        raise HTTPException(404)
    if body.url is not None:
        ep.url = body.url
    if body.secret is not None:
        ep.secret = body.secret
    if body.event_types is not None:
        ep.event_types = body.event_types
    if body.transformer is not None:
        ep.transformer = body.transformer
    if body.enabled is not None:
        ep.enabled = body.enabled
    await repo.update(ep)
    return _ep_resp(ep)


@router.delete("/organizations/{org_id}/endpoints/{ep_id}", status_code=204)
async def delete_endpoint(
    org_id: UUID,
    ep_id: UUID,
    repo: MongoWebhookEndpointRepository = Depends(_ep_repo),
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
):
    await _require_admin(org_id, user, authz)
    ep = await repo.find_by_id(ep_id)
    if ep is None or ep.org_id != org_id:
        raise HTTPException(404)
    await repo.delete(ep_id)


# --- Deliveries ---

@router.get("/organizations/{org_id}/endpoints/{ep_id}/deliveries", response_model=list[DeliveryResponse])
async def list_deliveries(
    org_id: UUID,
    ep_id: UUID,
    repo: MongoWebhookEndpointRepository = Depends(_ep_repo),
    del_repo: MongoDeliveryRepository = Depends(_del_repo),
    user: User = Depends(get_current_user),
    authz: AuthorizationService = Depends(get_authz),
):
    await _require_admin(org_id, user, authz)
    ep = await repo.find_by_id(ep_id)
    if ep is None or ep.org_id != org_id:
        raise HTTPException(404)
    deliveries = await del_repo.find_by_endpoint(ep_id)
    return [
        DeliveryResponse(
            id=d.id,
            endpoint_id=d.endpoint_id,
            event_type=d.event_type,
            payload_sent=d.payload_sent,
            status=d.status,
            response_code=d.response_code,
            error=d.error,
            created_at=d.created_at.isoformat(),
        )
        for d in deliveries
    ]


# --- Transformer test (dry-run) ---

@router.post("/transformer/test", response_model=TransformerTestResponse)
async def test_transformer(
    body: TransformerTestBody,
    _user: User = Depends(get_current_user),
):
    result, error, stdout = run_transformer(body.transformer, body.payload)
    return TransformerTestResponse(result=result, error=error, stdout=stdout)
