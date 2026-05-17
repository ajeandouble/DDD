from typing import Callable

from src.analyzer.domain.events import TranscriptReady
from src.conversations.domain.events import ConversationTranscribed
from src.conversations.domain.repositories import ConversationRepository
from src.shared.events import publish, subscribe


def register_handlers(repo_factory: Callable[[], ConversationRepository]) -> None:
    async def _on_transcript_ready(event: TranscriptReady) -> None:
        repo = repo_factory()
        conv = await repo.find_by_id(event.conversation_id)
        if conv is None:
            return
        conv.apply_transcript(event.speaker_turns, event.word_count, event.duration_seconds)
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

    subscribe(TranscriptReady, _on_transcript_ready)
