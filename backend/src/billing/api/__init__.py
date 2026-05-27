from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.billing.application.commands import upgrade_tier
from src.billing.application.queries import get_subscription, list_invoices, list_usage
from src.billing.domain.models import PLAN_LIMITS
from src.billing.infrastructure.repositories import (
    MongoInvoiceRepository,
    MongoSubscriptionRepository,
    MongoUsageRepository,
)
from src.iam.domain.models import User
from src.shared.database import get_db
from src.shared.deps import get_authz, get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])


def _sub_repo():
    return MongoSubscriptionRepository(get_db())


def _usage_repo():
    return MongoUsageRepository(get_db())


def _invoice_repo():
    return MongoInvoiceRepository(get_db())


class SubscriptionResponse(BaseModel):
    id: str
    org_id: str
    tier: str
    tokens_used: int
    tokens_remaining: int | None
    reset_at: str
    period_start: str


class UpgradeBody(BaseModel):
    tier: str


class UsageRecordResponse(BaseModel):
    id: str
    org_id: str
    conversation_id: str
    duration_seconds: float
    tokens_consumed: int
    created_at: str


class InvoiceLineItemResponse(BaseModel):
    conversation_id: str
    duration_seconds: float
    tokens_consumed: int


class InvoiceResponse(BaseModel):
    id: str
    org_id: str
    period_start: str
    period_end: str
    line_items: list[InvoiceLineItemResponse]
    total_tokens: int
    generated_at: str


def _sub_resp(sub) -> SubscriptionResponse:
    return SubscriptionResponse(
        id=str(sub.id),
        org_id=str(sub.org_id),
        tier=sub.tier,
        tokens_used=sub.tokens_used,
        tokens_remaining=sub.tokens_remaining,
        reset_at=sub.reset_at.isoformat(),
        period_start=sub.period_start.isoformat(),
    )


async def _require_org_member(org_id: UUID, user: User, authz) -> None:
    role = await authz.effective_role(f"user:{user.id}", "org", str(org_id), org_id=str(org_id))
    if role is None and not authz.is_superadmin(f"user:{user.id}"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)


@router.get("/organizations/{org_id}/subscription", response_model=SubscriptionResponse)
async def get_org_subscription(
    org_id: UUID,
    sub_repo: MongoSubscriptionRepository = Depends(_sub_repo),
    user: User = Depends(get_current_user),
    authz=Depends(get_authz),
):
    await _require_org_member(org_id, user, authz)
    sub = await get_subscription(org_id, sub_repo)
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return _sub_resp(sub)


@router.post(
    "/organizations/{org_id}/subscription/upgrade",
    response_model=SubscriptionResponse,
)
async def upgrade_org_subscription(
    org_id: UUID,
    body: UpgradeBody,
    sub_repo: MongoSubscriptionRepository = Depends(_sub_repo),
    user: User = Depends(get_current_user),
    authz=Depends(get_authz),
):
    role = await authz.effective_role(f"user:{user.id}", "org", str(org_id), org_id=str(org_id))
    if role not in ("admin",) and not authz.is_superadmin(f"user:{user.id}"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    if body.tier not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail=f"Unknown tier: {body.tier}")
    sub = await upgrade_tier(org_id=org_id, new_tier=body.tier, sub_repo=sub_repo, owner_id=user.id)
    return _sub_resp(sub)


@router.get("/organizations/{org_id}/usage", response_model=list[UsageRecordResponse])
async def get_org_usage(
    org_id: UUID,
    usage_repo: MongoUsageRepository = Depends(_usage_repo),
    user: User = Depends(get_current_user),
    authz=Depends(get_authz),
):
    await _require_org_member(org_id, user, authz)
    records = await list_usage(org_id, usage_repo)
    return [
        UsageRecordResponse(
            id=str(r.id),
            org_id=str(r.org_id),
            conversation_id=str(r.conversation_id),
            duration_seconds=r.duration_seconds,
            tokens_consumed=r.tokens_consumed,
            created_at=r.created_at.isoformat(),
        )
        for r in records
    ]


@router.get("/organizations/{org_id}/invoices", response_model=list[InvoiceResponse])
async def get_org_invoices(
    org_id: UUID,
    invoice_repo: MongoInvoiceRepository = Depends(_invoice_repo),
    user: User = Depends(get_current_user),
    authz=Depends(get_authz),
):
    await _require_org_member(org_id, user, authz)
    invoices = await list_invoices(org_id, invoice_repo)
    return [
        InvoiceResponse(
            id=str(inv.id),
            org_id=str(inv.org_id),
            period_start=inv.period_start.isoformat(),
            period_end=inv.period_end.isoformat(),
            line_items=[
                InvoiceLineItemResponse(
                    conversation_id=str(item.conversation_id),
                    duration_seconds=item.duration_seconds,
                    tokens_consumed=item.tokens_consumed,
                )
                for item in inv.line_items
            ],
            total_tokens=inv.total_tokens,
            generated_at=inv.generated_at.isoformat(),
        )
        for inv in invoices
    ]
