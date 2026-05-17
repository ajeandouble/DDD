from src.analyzer.domain.events import TranscriptReady
from src.conversations.domain.events import ConversationTranscribed
from src.conversations.domain.models import ConversationStats
from src.conversations.infrastructure.repositories import MongoConversationRepository
from src.shared.database import get_db
from src.shared.events import publish, subscribe


async def on_transcript_ready(event: TranscriptReady) -> None:
    db = get_db()
    repo = MongoConversationRepository(db)
    conv = await repo.find_by_id(event.conversation_id)
    if conv is None:
        return
    conv.type = "conversation"
    conv.content = event.speaker_turns
    conv.stats = ConversationStats(
        word_count=event.word_count,
        duration_seconds=event.duration_seconds,
        cost_cents=conv.stats.cost_cents,
    )
    await repo.update(conv)
    await publish(
        ConversationTranscribed(
            conversation_id=conv.id,
            org_id=conv.organization_id,
            title=conv.title,
            conversation_timestamp=conv.conversation_timestamp.isoformat(),
            scope_type=conv.scope_type,
            scope_id=conv.scope_id,
            metadata=[{"key": k, "value": v} for k, v in conv.metadata],
            speaker_turns=event.speaker_turns,
            stats={"word_count": event.word_count, "duration_seconds": event.duration_seconds},
        )
    )


def register_handlers() -> None:
    subscribe(TranscriptReady, on_transcript_ready)
