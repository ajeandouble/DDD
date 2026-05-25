from calendar import monthrange
from datetime import datetime, timezone
from typing import Callable
from uuid import UUID

from src.billing.application.commands import generate_invoice
from src.billing.domain.repositories import InvoiceRepository, UsageRepository
from src.scheduler.application import LogFn


def make_monthly_invoice_job(
    usage_repo_factory: Callable[[], UsageRepository],
    invoice_repo_factory: Callable[[], InvoiceRepository],
    org_ids_factory: Callable[[], list[UUID]],
) -> Callable[[LogFn], object]:
    async def run(log: LogFn) -> None:
        now = datetime.now(timezone.utc)
        month = now.month - 1 or 12
        year = now.year if now.month > 1 else now.year - 1
        period_start = datetime(year, month, 1, tzinfo=timezone.utc)
        last_day = monthrange(year, month)[1]
        period_end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)

        log(f"Generating invoices for period {period_start.strftime('%Y-%m')}")
        org_ids = await org_ids_factory()
        log(f"Found {len(org_ids)} organisations")

        for org_id in org_ids:
            inv = await generate_invoice(
                org_id=org_id,
                period_start=period_start,
                period_end=period_end,
                usage_repo=usage_repo_factory(),
                invoice_repo=invoice_repo_factory(),
            )
            if inv:
                log(f"  org={org_id} → invoice={inv.id} tokens={inv.total_tokens}")

        log("Done")

    return run
