from uuid import UUID

from src.billing.domain.models import PLAN_LIMITS
from src.billing.domain.repositories import SubscriptionRepository


class QuotaExceeded(Exception):
    pass


class WebhookAccessDenied(Exception):
    pass


class QuotaService:
    def __init__(self, sub_repo: SubscriptionRepository) -> None:
        self._sub_repo = sub_repo

    async def check_analysis_quota(self, org_id: UUID) -> None:
        sub = await self._sub_repo.find_by_org(org_id)
        if sub is None or sub.tier == "enterprise":
            return
        limit = PLAN_LIMITS[sub.tier]["tokens"]
        if limit is not None and sub.tokens_used >= limit:
            raise QuotaExceeded(f"Token quota exhausted (used {sub.tokens_used}/{limit})")

    async def check_webhook_access(self, org_id: UUID) -> None:
        sub = await self._sub_repo.find_by_org(org_id)
        if sub is None or not sub.has_webhook_access():
            raise WebhookAccessDenied("Webhook access requires pro or enterprise plan")

    async def get_tier(self, org_id: UUID) -> str | None:
        sub = await self._sub_repo.find_by_org(org_id)
        return sub.tier if sub else None
