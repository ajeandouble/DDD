from abc import ABC, abstractmethod
from uuid import UUID

from src.scheduler.domain import CronJob, JobRun


class CronJobRepository(ABC):
    @abstractmethod
    async def save(self, job: CronJob) -> None: ...

    @abstractmethod
    async def update(self, job: CronJob) -> None: ...

    @abstractmethod
    async def find_by_name(self, name: str) -> CronJob | None: ...

    @abstractmethod
    async def find_by_id(self, job_id: UUID) -> CronJob | None: ...

    @abstractmethod
    async def list_all(self) -> list[CronJob]: ...


class JobRunRepository(ABC):
    @abstractmethod
    async def save(self, run: JobRun) -> None: ...

    @abstractmethod
    async def update(self, run: JobRun) -> None: ...

    @abstractmethod
    async def find_by_job(self, job_name: str, limit: int = 20) -> list[JobRun]: ...
