from src.billing.application.commands import create_subscription, record_usage
from src.billing.infrastructure.repositories import (
    MongoSubscriptionRepository,
    MongoUsageRepository,
)
from src.conversations.domain.events import ConversationTranscribed
from src.scopes.domain.events import OrganizationCreated
from src.shared.database import get_db
from src.shared.events import subscribe


def register_handlers() -> None:
    subscribe(OrganizationCreated, _on_org_created)
    subscribe(ConversationTranscribed, _on_conversation_transcribed)


async def _on_org_created(event: OrganizationCreated) -> None:
    db = get_db()
    await create_subscription(
        org_id=event.org_id,
        owner_id=event.owner_id,
        sub_repo=MongoSubscriptionRepository(db),
    )


async def _on_conversation_transcribed(event: ConversationTranscribed) -> None:
    duration_seconds = float(event.stats.get("duration_seconds", 0.0))
    db = get_db()
    await record_usage(
        org_id=event.org_id,
        conversation_id=event.conversation_id,
        duration_seconds=duration_seconds,
        sub_repo=MongoSubscriptionRepository(db),
        usage_repo=MongoUsageRepository(db),
    )
