from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from croniter import croniter


@dataclass
class CronJob:
    id: UUID
    name: str
    cron_expr: str
    enabled: bool = True
    last_run_at: datetime | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, name: str, cron_expr: str) -> "CronJob":
        return cls(id=uuid4(), name=name, cron_expr=cron_expr)

    def mark_ran(self, at: datetime) -> None:
        self.last_run_at = at

    @property
    def next_run_at(self) -> datetime | None:
        try:
            return croniter(self.cron_expr, datetime.now(timezone.utc)).get_next(datetime)
        except Exception:
            return None

    def update(self, cron_expr: str | None, enabled: bool | None) -> None:
        if cron_expr is not None:
            if not croniter.is_valid(cron_expr):
                raise ValueError(f"Invalid cron expression: {cron_expr!r}")
            self.cron_expr = cron_expr
        if enabled is not None:
            self.enabled = enabled


class JobStatus:
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


@dataclass
class JobRun:
    id: UUID
    job_name: str
    started_at: datetime
    status: str
    logs: list[str] = field(default_factory=list)
    finished_at: datetime | None = None

    @classmethod
    def start(cls, job_name: str) -> "JobRun":
        return cls(
            id=uuid4(),
            job_name=job_name,
            started_at=datetime.now(timezone.utc),
            status=JobStatus.RUNNING,
        )

    def append_log(self, line: str) -> None:
        self.logs.append(line)

    def finish(self, success: bool) -> None:
        self.finished_at = datetime.now(timezone.utc)
        self.status = JobStatus.SUCCESS if success else JobStatus.FAILED
