from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.analyzer.domain import AnalysisJob
from src.analyzer.infrastructure.repositories import MongoAnalysisJobRepository
from src.shared.database import get_db
from src.shared.deps import get_current_user

router = APIRouter(prefix="/analyzer", tags=["analyzer"])


def _repo() -> MongoAnalysisJobRepository:
    return MongoAnalysisJobRepository(get_db())


class SegmentOut(BaseModel):
    start: float
    end: float
    text: str


class AnalysisJobResponse(BaseModel):
    id: str
    import_job_id: str
    conversation_id: str
    storage_key: str
    status: str
    attempts: int
    error: str | None
    created_at: str
    updated_at: str
    transcript: dict | None


def _to_response(job: AnalysisJob) -> AnalysisJobResponse:
    transcript = None
    if job.transcript:
        transcript = {
            "language": job.transcript.language,
            "duration_seconds": job.transcript.duration_seconds,
            "word_count": job.transcript.word_count,
            "full_text": job.transcript.full_text,
            "segments": [
                {"start": s.start, "end": s.end, "text": s.text} for s in job.transcript.segments
            ],
        }
    return AnalysisJobResponse(
        id=str(job.id),
        import_job_id=str(job.import_job_id),
        conversation_id=str(job.conversation_id),
        storage_key=job.storage_key,
        status=job.status,
        attempts=job.attempts,
        error=job.error,
        created_at=job.created_at.isoformat(),
        updated_at=job.updated_at.isoformat(),
        transcript=transcript,
    )


@router.get("/jobs/{job_id}", response_model=AnalysisJobResponse)
async def get_analysis_job(
    job_id: UUID,
    repo: MongoAnalysisJobRepository = Depends(_repo),
    _user=Depends(get_current_user),
):
    job = await repo.find_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis job not found")
    return _to_response(job)


@router.get("/conversation/{conversation_id}", response_model=list[AnalysisJobResponse])
async def list_jobs_for_conversation(
    conversation_id: UUID,
    repo: MongoAnalysisJobRepository = Depends(_repo),
    _user=Depends(get_current_user),
):
    jobs = await repo.find_by_conversation(conversation_id)
    return [_to_response(j) for j in jobs]
