from datetime import timezone
from uuid import UUID

from motor.motor_asyncio import AsyncIOMotorDatabase

from src.scheduler.domain import CronJob, JobRun
from src.scheduler.domain.repositories import CronJobRepository, JobRunRepository
from src.shared.mongo_repository import MongoRepository


def _ensure_tz(dt):
    return dt.replace(tzinfo=timezone.utc) if dt and dt.tzinfo is None else dt


def _job_from_doc(doc: dict) -> CronJob:
    return CronJob(
        id=UUID(str(doc["_id"])),
        name=doc["name"],
        cron_expr=doc["cron_expr"],
        enabled=doc.get("enabled", True),
        last_run_at=_ensure_tz(doc.get("last_run_at")),
        created_at=_ensure_tz(doc["created_at"]),
    )


def _job_to_doc(job: CronJob) -> dict:
    return {
        "_id": str(job.id),
        "name": job.name,
        "cron_expr": job.cron_expr,
        "enabled": job.enabled,
        "last_run_at": job.last_run_at,
        "created_at": job.created_at,
    }


def _run_from_doc(doc: dict) -> JobRun:
    return JobRun(
        id=UUID(str(doc["_id"])),
        job_name=doc["job_name"],
        started_at=_ensure_tz(doc["started_at"]),
        status=doc["status"],
        logs=doc.get("logs", []),
        finished_at=_ensure_tz(doc.get("finished_at")),
    )


def _run_to_doc(run: JobRun) -> dict:
    return {
        "_id": str(run.id),
        "job_name": run.job_name,
        "started_at": run.started_at,
        "status": run.status,
        "logs": run.logs,
        "finished_at": run.finished_at,
    }


class MongoCronJobRepository(CronJobRepository):
    collection_name = "scheduler_cron_jobs"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db[self.collection_name]

    async def save(self, job: CronJob) -> None:
        await self._col.insert_one(_job_to_doc(job))

    async def update(self, job: CronJob) -> None:
        await self._col.replace_one({"_id": str(job.id)}, _job_to_doc(job))

    async def find_by_name(self, name: str) -> CronJob | None:
        doc = await self._col.find_one({"name": name})
        return _job_from_doc(doc) if doc else None

    async def find_by_id(self, job_id: UUID) -> CronJob | None:
        doc = await self._col.find_one({"_id": str(job_id)})
        return _job_from_doc(doc) if doc else None

    async def list_all(self) -> list[CronJob]:
        cursor = self._col.find({}).sort("name", 1)
        return [_job_from_doc(doc) async for doc in cursor]


class MongoJobRunRepository(JobRunRepository):
    collection_name = "scheduler_job_runs"

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db[self.collection_name]

    async def save(self, run: JobRun) -> None:
        await self._col.insert_one(_run_to_doc(run))

    async def update(self, run: JobRun) -> None:
        await self._col.replace_one({"_id": str(run.id)}, _run_to_doc(run))

    async def find_by_job(self, job_name: str, limit: int = 20) -> list[JobRun]:
        cursor = self._col.find({"job_name": job_name}).sort("started_at", -1).limit(limit)
        return [_run_from_doc(doc) async for doc in cursor]


class OrgIdsQuery:
    """Read-side helper: fetch all organization IDs for scheduler jobs."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db["organizations"]

    async def all_org_ids(self) -> list[UUID]:
        cursor = self._col.find({}, {"_id": 1})
        return [UUID(str(doc["_id"])) async for doc in cursor]
