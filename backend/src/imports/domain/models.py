from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID, uuid4


class ImportStatus(StrEnum):
    PENDING = "pending"
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    FAILED = "failed"


@dataclass
class ImportJob:
    conversation_id: UUID
    filename: str
    content_type: str
    created_by: UUID
    id: UUID = field(default_factory=uuid4)
    status: ImportStatus = ImportStatus.PENDING
    storage_key: str | None = None
    file_hash: str | None = None  # SHA-256 hex digest, for future deduplication
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    failed_reason: str | None = None

    @classmethod
    def create(
        cls, conversation_id: UUID, filename: str, content_type: str, created_by: UUID
    ) -> "ImportJob":
        return cls(
            conversation_id=conversation_id,
            filename=filename,
            content_type=content_type,
            created_by=created_by,
        )

    def mark_uploaded(self, storage_key: str, file_hash: str | None = None) -> None:
        self.status = ImportStatus.UPLOADED
        self.storage_key = storage_key
        self.file_hash = file_hash

    def mark_failed(self, reason: str) -> None:
        self.status = ImportStatus.FAILED
        self.failed_reason = reason
