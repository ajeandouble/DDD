from uuid import UUID

from src.imports.domain.models import ImportJob, ImportStatus
from src.shared.mongo_repository import MongoRepository


def _to_doc(job: ImportJob) -> dict:
    return {
        "_id": job.id,
        "conversation_id": job.conversation_id,
        "filename": job.filename,
        "content_type": job.content_type,
        "created_by": job.created_by,
        "status": job.status,
        "storage_key": job.storage_key,
        "file_hash": job.file_hash,
        "created_at": job.created_at,
        "failed_reason": job.failed_reason,
    }


def _from_doc(doc: dict) -> ImportJob:
    return ImportJob(
        id=doc["_id"],
        conversation_id=doc["conversation_id"],
        filename=doc["filename"],
        content_type=doc["content_type"],
        created_by=doc["created_by"],
        status=ImportStatus(doc["status"]),
        storage_key=doc.get("storage_key"),
        file_hash=doc.get("file_hash"),
        created_at=doc["created_at"],
        failed_reason=doc.get("failed_reason"),
    )


class MongoImportJobRepository(MongoRepository):
    collection_name = "imports_jobs"

    async def save(self, job: ImportJob) -> None:
        await self._col.insert_one(_to_doc(job))

    async def find_by_id(self, job_id: UUID) -> ImportJob | None:
        doc = await self._col.find_one({"_id": job_id})
        if doc is None:
            return None
        return _from_doc(doc)

    async def find_by_conversation(self, conversation_id: UUID) -> list[ImportJob]:
        docs = await self._col.find({"conversation_id": conversation_id}).to_list(length=100)
        return [_from_doc(d) for d in docs]
