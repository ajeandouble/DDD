from abc import ABC, abstractmethod
from uuid import UUID

from src.analyzer.domain import AnalysisJob


class AnalysisJobRepository(ABC):
    @abstractmethod
    async def save(self, job: AnalysisJob) -> None: ...

    @abstractmethod
    async def find_by_id(self, job_id: UUID) -> AnalysisJob | None: ...

    @abstractmethod
    async def update(self, job: AnalysisJob) -> None: ...
