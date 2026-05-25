from src.analyzer.domain.events import TranscriptFailed
from src.conversations.domain.events import ConversationTranscribed
from src.shared.events import subscribe
from src.shared.sse import broker


def register_handlers() -> None:
    async def _on_conversation_transcribed(event: ConversationTranscribed) -> None:
        await broker.publish(
            "transcript_ready",
            {
                "conversation_id": str(event.conversation_id),
                "org_id": str(event.org_id),
            },
        )

    async def _on_transcript_failed(event: TranscriptFailed) -> None:
        await broker.publish(
            "transcript_failed",
            {"conversation_id": str(event.conversation_id)},
        )

    subscribe(ConversationTranscribed, _on_conversation_transcribed)
    subscribe(TranscriptFailed, _on_transcript_failed)
