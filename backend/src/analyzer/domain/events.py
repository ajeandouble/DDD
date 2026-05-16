from dataclasses import dataclass
from uuid import UUID


@dataclass
class TranscriptReady:
    job_id: UUID
    conversation_id: UUID
    full_text: str
    word_count: int
    duration_seconds: float
    speaker_turns: list[dict]  # [{"speaker": "Speaker A", "text": "..."}]


@dataclass
class TranscriptFailed:
    job_id: UUID
    conversation_id: UUID
    reason: str
