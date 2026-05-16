from src.analyzer.domain import AnalysisJob
from src.analyzer.infrastructure.repositories import MongoAnalysisJobRepository
from src.imports.domain.events import FileIngested
from src.shared.database import get_db
from src.shared.events import subscribe

import src.analyzer.application as worker_module


async def on_file_ingested(event: FileIngested) -> None:
    db = get_db()
    repo = MongoAnalysisJobRepository(db)
    job = AnalysisJob.create(
        import_job_id=event.job_id,
        conversation_id=event.conversation_id,
        storage_key=event.storage_key,
    )
    await repo.save(job)
    await worker_module.enqueue(job.id)


def register_handlers() -> None:
    subscribe(FileIngested, on_file_ingested)
