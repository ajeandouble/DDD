from dotenv import load_dotenv

load_dotenv(".env.dev")

import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.shared import database
from src.dev import router as dev_router
from src.iam.api import router as auth_router
from src.iam.api.authz import router as authz_router
from src.iam.application.event_handlers import register_handlers as register_iam_handlers
from src.scopes.application.event_handlers import register_handlers as register_scopes_handlers
from src.analyzer.application.event_handlers import register_handlers as register_analyzer_handlers
from src.analyzer.infrastructure.repositories import MongoAnalysisJobRepository
from src.conversations.application.event_handlers import (
    register_handlers as register_conversation_handlers,
)
from src.conversations.infrastructure.repositories import MongoConversationRepository
from src.iam.infrastructure.enforcer import init_enforcer
from src.conversations.api import router as conversations_router
from src.imports.api import router as imports_router
from src.scopes.api import router as scopes_router
from src.analyzer.api import router as analyzer_router
from src.storage.api import router as storage_router
from src.webhooks.api import router as webhooks_router
from src.webhooks.application import register_handlers as register_webhook_handlers
from src.events.api import router as events_router
from src.events.application import register_handlers as register_sse_handlers
from src.webhooks.infrastructure.repositories import (
    MongoDeliveryRepository,
    MongoWebhookEndpointRepository,
)
from src.billing.api import router as billing_router
from src.billing.application.event_handlers import register_handlers as register_billing_handlers
from src.billing.infrastructure.repositories import (
    MongoInvoiceRepository,
    MongoSubscriptionRepository,
    MongoUsageRepository,
)
from src.scheduler.application import init_scheduler, register_job, run_scheduler, sync_jobs_to_db
from src.scheduler.api import router as scheduler_router
from src.scheduler.infrastructure.repositories import (
    MongoCronJobRepository,
    MongoJobRunRepository,
    OrgIdsQuery,
)
from src.scheduler.jobs.invoice import make_monthly_invoice_job
import src.analyzer.application as analyzer_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    await init_enforcer(database.get_db())
    register_iam_handlers()
    register_scopes_handlers()
    register_analyzer_handlers(repo_factory=lambda: MongoAnalysisJobRepository(database.get_db()))
    register_conversation_handlers(
        repo_factory=lambda: MongoConversationRepository(database.get_db())
    )
    register_sse_handlers()
    register_webhook_handlers(
        ep_repo_factory=lambda: MongoWebhookEndpointRepository(database.get_db()),
        del_repo_factory=lambda: MongoDeliveryRepository(database.get_db()),
    )
    register_billing_handlers(
        sub_repo_factory=lambda: MongoSubscriptionRepository(database.get_db()),
        usage_repo_factory=lambda: MongoUsageRepository(database.get_db()),
    )
    register_job(
        name="monthly_invoices",
        cron_expr="0 0 1 * *",
        job=make_monthly_invoice_job(
            usage_repo_factory=lambda: MongoUsageRepository(database.get_db()),
            invoice_repo_factory=lambda: MongoInvoiceRepository(database.get_db()),
            org_ids_factory=lambda: OrgIdsQuery(database.get_db()).all_org_ids(),
        ),
    )
    init_scheduler(
        job_repo_factory=lambda: MongoCronJobRepository(database.get_db()),
        run_repo_factory=lambda: MongoJobRunRepository(database.get_db()),
    )
    await sync_jobs_to_db()
    analyzer_task = asyncio.create_task(
        analyzer_worker.worker(repo_factory=lambda: MongoAnalysisJobRepository(database.get_db()))
    )
    scheduler_task = asyncio.create_task(run_scheduler())
    yield
    analyzer_task.cancel()
    scheduler_task.cancel()
    await database.disconnect()


app = FastAPI(title="DDD Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(dev_router)
app.include_router(auth_router)
app.include_router(authz_router)
app.include_router(conversations_router)
app.include_router(imports_router)
app.include_router(scopes_router)
app.include_router(analyzer_router)
app.include_router(storage_router)
app.include_router(webhooks_router)
app.include_router(billing_router)
app.include_router(scheduler_router)
app.include_router(events_router)


@app.get("/health")
async def health():
    await database.get_client().admin.command("ping")
    return {"status": "ok"}
