from typing import Callable

from src.analyzer.domain import AnalysisJob
from src.analyzer.domain.repositories import AnalysisJobRepository
from src.imports.domain.events import FileIngested
from src.shared.events import subscribe

import src.analyzer.application as worker_module


def register_handlers(repo_factory: Callable[[], AnalysisJobRepository]) -> None:
    async def _on_file_ingested(event: FileIngested) -> None:
        repo = repo_factory()
        job = AnalysisJob.create(
            import_job_id=event.job_id,
            conversation_id=event.conversation_id,
            storage_key=event.storage_key,
        )
        await repo.save(job)
        await worker_module.enqueue(job.id)

    subscribe(FileIngested, _on_file_ingested)
