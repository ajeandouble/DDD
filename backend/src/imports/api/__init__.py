from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.imports.domain.models import ImportJob
from src.imports.infrastructure.repositories import MongoImportJobRepository
from src.shared.database import get_db
from src.iam.domain.models import User
from src.shared.deps import get_current_user

router = APIRouter(prefix="/imports", tags=["imports"])


def _repo() -> MongoImportJobRepository:
    return MongoImportJobRepository(get_db())


class ImportJobCreate(BaseModel):
    conversation_id: UUID
    filename: str
    content_type: str


class ImportJobResponse(BaseModel):
    id: str
    conversation_id: str
    filename: str
    content_type: str
    status: str
    storage_key: str | None
    created_at: str
    failed_reason: str | None


def _to_response(job: ImportJob) -> ImportJobResponse:
    return ImportJobResponse(
        id=str(job.id),
        conversation_id=str(job.conversation_id),
        filename=job.filename,
        content_type=job.content_type,
        status=job.status,
        storage_key=job.storage_key,
        created_at=job.created_at.isoformat(),
        failed_reason=job.failed_reason,
    )


@router.post("/", response_model=ImportJobResponse, status_code=status.HTTP_201_CREATED)
async def create_import_job(
    body: ImportJobCreate,
    repo: MongoImportJobRepository = Depends(_repo),
    user: User = Depends(get_current_user),
):
    job = ImportJob.create(
        conversation_id=body.conversation_id,
        filename=body.filename,
        content_type=body.content_type,
        created_by=user.id,
    )
    await repo.save(job)
    return _to_response(job)


@router.get("/conversation/{conversation_id}", response_model=list[ImportJobResponse])
async def list_imports_for_conversation(
    conversation_id: UUID,
    repo: MongoImportJobRepository = Depends(_repo),
    _user: User = Depends(get_current_user),
):
    jobs = await repo.find_by_conversation(conversation_id)
    return [_to_response(j) for j in jobs]


@router.get("/{job_id}", response_model=ImportJobResponse)
async def get_import_job(
    job_id: UUID,
    repo: MongoImportJobRepository = Depends(_repo),
    _user: User = Depends(get_current_user),
):
    job = await repo.find_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import job not found")
    return _to_response(job)
