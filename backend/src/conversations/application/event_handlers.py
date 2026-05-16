import json

from src.analyzer.domain.events import TranscriptReady
from src.conversations.domain.models import ConversationStats
from src.conversations.infrastructure.repositories import MongoConversationRepository
from src.shared.database import get_db
from src.shared.events import subscribe


async def on_transcript_ready(event: TranscriptReady) -> None:
    db = get_db()
    repo = MongoConversationRepository(db)
    conv = await repo.find_by_id(event.conversation_id)
    if conv is None:
        return
    conv.content = json.dumps(event.speaker_turns)
    conv.stats = ConversationStats(
        word_count=event.word_count,
        duration_seconds=event.duration_seconds,
        cost_cents=conv.stats.cost_cents,
    )
    await repo.update(conv)


def register_handlers() -> None:
    subscribe(TranscriptReady, on_transcript_ready)
