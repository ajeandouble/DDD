from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.scheduler.application import trigger_job
from src.scheduler.infrastructure.repositories import MongoCronJobRepository, MongoJobRunRepository
from src.shared.database import get_db
from src.shared.deps import get_authz, get_current_user

router = APIRouter(prefix="/scheduler", tags=["scheduler"])


def _job_repo():
    return MongoCronJobRepository(get_db())


def _run_repo():
    return MongoJobRunRepository(get_db())


class CronJobResponse(BaseModel):
    id: str
    name: str
    cron_expr: str
    enabled: bool
    last_run_at: str | None
    next_run_at: str | None
    created_at: str


class JobRunResponse(BaseModel):
    id: str
    job_name: str
    started_at: str
    finished_at: str | None
    status: str
    logs: list[str]


class UpdateJobBody(BaseModel):
    cron_expr: str | None = None
    enabled: bool | None = None


async def _require_superadmin(user, authz) -> None:
    if not authz.is_superadmin(f"user:{user.id}"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)


@router.get("/jobs", response_model=list[CronJobResponse])
async def list_jobs(
    job_repo=Depends(_job_repo),
    user=Depends(get_current_user),
    authz=Depends(get_authz),
):
    await _require_superadmin(user, authz)
    jobs = await job_repo.list_all()
    return [
        CronJobResponse(
            id=str(j.id),
            name=j.name,
            cron_expr=j.cron_expr,
            enabled=j.enabled,
            last_run_at=j.last_run_at.isoformat() if j.last_run_at else None,
            next_run_at=j.next_run_at.isoformat() if j.next_run_at else None,
            created_at=j.created_at.isoformat(),
        )
        for j in jobs
    ]


@router.patch("/jobs/{job_id}", response_model=CronJobResponse)
async def update_job(
    job_id: UUID,
    body: UpdateJobBody,
    job_repo=Depends(_job_repo),
    user=Depends(get_current_user),
    authz=Depends(get_authz),
):
    await _require_superadmin(user, authz)
    job = await job_repo.find_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=404)
    try:
        job.update(cron_expr=body.cron_expr, enabled=body.enabled)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    await job_repo.update(job)
    return CronJobResponse(
        id=str(job.id),
        name=job.name,
        cron_expr=job.cron_expr,
        enabled=job.enabled,
        last_run_at=job.last_run_at.isoformat() if job.last_run_at else None,
        next_run_at=job.next_run_at.isoformat(),
        created_at=job.created_at.isoformat(),
    )


@router.post("/jobs/{job_id}/trigger", response_model=JobRunResponse, status_code=202)
async def trigger(
    job_id: UUID,
    user=Depends(get_current_user),
    authz=Depends(get_authz),
):
    await _require_superadmin(user, authz)
    run = await trigger_job(job_id)
    if run is None:
        raise HTTPException(status_code=404)
    return JobRunResponse(
        id=str(run.id),
        job_name=run.job_name,
        started_at=run.started_at.isoformat(),
        finished_at=run.finished_at.isoformat() if run.finished_at else None,
        status=run.status,
        logs=run.logs,
    )


@router.get("/jobs/{job_id}/runs", response_model=list[JobRunResponse])
async def list_runs(
    job_id: UUID,
    job_repo=Depends(_job_repo),
    run_repo=Depends(_run_repo),
    user=Depends(get_current_user),
    authz=Depends(get_authz),
):
    await _require_superadmin(user, authz)
    job = await job_repo.find_by_id(job_id)
    if job is None:
        raise HTTPException(status_code=404)
    runs = await run_repo.find_by_job(job.name)
    return [
        JobRunResponse(
            id=str(r.id),
            job_name=r.job_name,
            started_at=r.started_at.isoformat(),
            finished_at=r.finished_at.isoformat() if r.finished_at else None,
            status=r.status,
            logs=r.logs,
        )
        for r in runs
    ]
