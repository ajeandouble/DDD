from dataclasses import dataclass
from uuid import UUID


@dataclass
class FileIngested:
    job_id: UUID
    conversation_id: UUID
    storage_key: str
    filename: str
