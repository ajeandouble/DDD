import asyncio
import logging
import traceback
from datetime import datetime, timezone
from typing import Awaitable, Callable
from uuid import UUID

from croniter import croniter

from src.scheduler.domain import CronJob, JobRun
from src.scheduler.domain.repositories import CronJobRepository, JobRunRepository

logger = logging.getLogger(__name__)

LogFn = Callable[[str], None]
Job = Callable[[LogFn], Awaitable[None]]

# Registry of built-in jobs: name -> (default_cron_expr, job_fn)
_registry: dict[str, tuple[str, Job]] = {}

# Injected repo factories — set during lifespan startup
_job_repo_factory: Callable[[], CronJobRepository] | None = None
_run_repo_factory: Callable[[], JobRunRepository] | None = None


def register_job(name: str, cron_expr: str, job: Job) -> None:
    _registry[name] = (cron_expr, job)


def init_scheduler(
    job_repo_factory: Callable[[], CronJobRepository],
    run_repo_factory: Callable[[], JobRunRepository],
) -> None:
    global _job_repo_factory, _run_repo_factory
    _job_repo_factory = job_repo_factory
    _run_repo_factory = run_repo_factory


async def sync_jobs_to_db() -> None:
    """Upsert built-in jobs into DB, preserving user-edited cron_expr/enabled."""
    assert _job_repo_factory
    repo = _job_repo_factory()
    for name, (default_cron, _) in _registry.items():
        existing = await repo.find_by_name(name)
        if existing is None:
            await repo.save(CronJob.create(name=name, cron_expr=default_cron))


async def _execute(job_fn: Job, run: JobRun, run_repo: JobRunRepository) -> None:
    def log(line: str) -> None:
        run.append_log(line)

    try:
        await job_fn(log)
        run.finish(success=True)
    except Exception:
        run.append_log(traceback.format_exc())
        run.finish(success=False)
    finally:
        await run_repo.update(run)


async def trigger_job(job_id: UUID) -> JobRun | None:
    """Manually trigger a job by ID; returns the created run."""
    assert _job_repo_factory and _run_repo_factory
    job = await _job_repo_factory().find_by_id(job_id)
    if job is None or job.name not in _registry:
        return None
    _, job_fn = _registry[job.name]
    run_repo = _run_repo_factory()
    run = JobRun.start(job.name)
    await run_repo.save(run)
    asyncio.create_task(_execute(job_fn, run, run_repo))
    return run


async def run_scheduler() -> None:
    """Tick every 30 seconds; fire enabled jobs whose cron expression is due."""
    assert _job_repo_factory and _run_repo_factory
    last_fired: dict[str, datetime] = {}

    while True:
        now = datetime.now(timezone.utc).replace(second=0, microsecond=0)

        jobs = await _job_repo_factory().list_all()
        for job in jobs:
            if not job.enabled or job.name not in _registry:
                continue
            prev = croniter(job.cron_expr, now).get_prev(datetime)
            if last_fired.get(job.name) == prev:
                continue

            last_fired[job.name] = prev
            logger.info("Scheduler firing job %r (expr=%r)", job.name, job.cron_expr)

            _, job_fn = _registry[job.name]
            run_repo = _run_repo_factory()
            run = JobRun.start(job.name)
            await run_repo.save(run)

            job.mark_ran(now)
            await _job_repo_factory().update(job)

            asyncio.create_task(_execute(job_fn, run, run_repo))

        await asyncio.sleep(30)
