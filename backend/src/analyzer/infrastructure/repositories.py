from uuid import UUID

from motor.motor_asyncio import AsyncIOMotorDatabase

from src.analyzer.domain import (
    AnalysisJob,
    JobStatus,
    Transcript,
    TranscriptSegment,
    TranscriptWord,
)
from src.analyzer.domain.repositories import AnalysisJobRepository


def _to_doc(job: AnalysisJob) -> dict:
    doc: dict = {
        "_id": job.id,
        "import_job_id": job.import_job_id,
        "conversation_id": job.conversation_id,
        "storage_key": job.storage_key,
        "status": job.status,
        "attempts": job.attempts,
        "error": job.error,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "transcript": None,
    }
    if job.transcript:
        doc["transcript"] = {
            "language": job.transcript.language,
            "duration_seconds": job.transcript.duration_seconds,
            "segments": [
                {
                    "start": s.start,
                    "end": s.end,
                    "text": s.text,
                    "words": [
                        {
                            "start": w.start,
                            "end": w.end,
                            "word": w.word,
                            "probability": w.probability,
                        }
                        for w in s.words
                    ],
                }
                for s in job.transcript.segments
            ],
        }
    return doc


def _from_doc(doc: dict) -> AnalysisJob:
    transcript = None
    if doc.get("transcript"):
        t = doc["transcript"]
        segments = []
        for s in t["segments"]:
            words = [
                TranscriptWord(
                    start=w["start"], end=w["end"], word=w["word"], probability=w["probability"]
                )
                for w in s.get("words", [])
            ]
            segments.append(
                TranscriptSegment(start=s["start"], end=s["end"], text=s["text"], words=words)
            )
        transcript = Transcript(
            language=t["language"],
            duration_seconds=t["duration_seconds"],
            segments=segments,
        )
    return AnalysisJob(
        id=doc["_id"],
        import_job_id=doc["import_job_id"],
        conversation_id=doc["conversation_id"],
        storage_key=doc["storage_key"],
        status=JobStatus(doc["status"]),
        attempts=doc["attempts"],
        transcript=transcript,
        error=doc.get("error"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


class MongoAnalysisJobRepository(AnalysisJobRepository):
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db["analysis_jobs"]

    async def save(self, job: AnalysisJob) -> None:
        await self._col.insert_one(_to_doc(job))

    async def update(self, job: AnalysisJob) -> None:
        doc = _to_doc(job)
        doc.pop("_id")
        await self._col.update_one({"_id": job.id}, {"$set": doc})

    async def find_by_id(self, job_id: UUID) -> AnalysisJob | None:
        doc = await self._col.find_one({"_id": job_id})
        return _from_doc(doc) if doc else None

    async def find_pending(self) -> list[AnalysisJob]:
        docs = await self._col.find({"status": JobStatus.PENDING}).to_list(length=50)
        return [_from_doc(d) for d in docs]

    async def find_by_conversation(self, conversation_id: UUID) -> list[AnalysisJob]:
        docs = await self._col.find({"conversation_id": conversation_id}).to_list(length=50)
        return [_from_doc(d) for d in docs]
