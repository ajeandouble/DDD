from typing import Callable

from src.billing.application.commands import create_subscription, record_usage
from src.billing.domain.repositories import SubscriptionRepository, UsageRepository
from src.conversations.domain.events import ConversationTranscribed
from src.scopes.domain.events import OrganizationCreated
from src.shared.events import subscribe


def register_handlers(
    sub_repo_factory: Callable[[], SubscriptionRepository],
    usage_repo_factory: Callable[[], UsageRepository],
) -> None:
    async def _on_org_created(event: OrganizationCreated) -> None:
        await create_subscription(
            org_id=event.org_id,
            owner_id=event.owner_id,
            sub_repo=sub_repo_factory(),
        )

    async def _on_conversation_transcribed(event: ConversationTranscribed) -> None:
        duration_seconds = float(event.stats.get("duration_seconds", 0.0))
        await record_usage(
            org_id=event.org_id,
            conversation_id=event.conversation_id,
            duration_seconds=duration_seconds,
            sub_repo=sub_repo_factory(),
            usage_repo=usage_repo_factory(),
        )

    subscribe(OrganizationCreated, _on_org_created)
    subscribe(ConversationTranscribed, _on_conversation_transcribed)
