from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID, uuid4


class JobStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


@dataclass
class TranscriptWord:
    start: float
    end: float
    word: str
    probability: float


@dataclass
class TranscriptSegment:
    start: float
    end: float
    text: str
    words: list[TranscriptWord] = field(default_factory=list)


@dataclass
class Transcript:
    segments: list[TranscriptSegment]
    language: str
    duration_seconds: float

    @property
    def full_text(self) -> str:
        return " ".join(s.text.strip() for s in self.segments)

    @property
    def word_count(self) -> int:
        return len(self.full_text.split())

    @property
    def all_words(self) -> list[TranscriptWord]:
        return [w for s in self.segments for w in s.words]


@dataclass
class AnalysisJob:
    import_job_id: UUID
    conversation_id: UUID
    storage_key: str
    id: UUID = field(default_factory=uuid4)
    status: JobStatus = JobStatus.PENDING
    attempts: int = 0
    transcript: Transcript | None = None
    error: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    MAX_ATTEMPTS = 3

    @classmethod
    def create(cls, import_job_id: UUID, conversation_id: UUID, storage_key: str) -> "AnalysisJob":
        return cls(
            import_job_id=import_job_id,
            conversation_id=conversation_id,
            storage_key=storage_key,
        )

    def start(self) -> None:
        self.status = JobStatus.PROCESSING
        self.attempts += 1
        self.updated_at = datetime.now(timezone.utc)

    def complete(self, transcript: Transcript) -> None:
        self.status = JobStatus.DONE
        self.transcript = transcript
        self.updated_at = datetime.now(timezone.utc)

    def fail(self, reason: str) -> None:
        self.error = reason
        self.status = JobStatus.FAILED
        self.updated_at = datetime.now(timezone.utc)

    @property
    def can_retry(self) -> bool:
        return self.attempts < self.MAX_ATTEMPTS
