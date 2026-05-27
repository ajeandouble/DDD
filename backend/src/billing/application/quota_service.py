from uuid import UUID

from src.billing.domain.repositories import SubscriptionRepository
from src.shared.exceptions import WebhookAccessDenied

__all__ = ["WebhookAccessDenied", "QuotaService"]


class QuotaService:
    def __init__(self, sub_repo: SubscriptionRepository) -> None:
        self._sub_repo = sub_repo

    async def is_quota_ok(self, org_id: UUID) -> bool:
        """Returns False only when billing has already marked the subscription quota_exceeded."""
        sub = await self._sub_repo.find_by_org(org_id)
        if sub is None or sub.tier == "enterprise":
            return True
        return sub.status != "quota_exceeded"

    async def check_webhook_access(self, org_id: UUID) -> None:
        sub = await self._sub_repo.find_by_org(org_id)
        if sub is None or not sub.has_webhook_access():
            raise WebhookAccessDenied("Webhook access requires pro or enterprise plan")

    async def get_tier(self, org_id: UUID) -> str | None:
        sub = await self._sub_repo.find_by_org(org_id)
        return sub.tier if sub else None
