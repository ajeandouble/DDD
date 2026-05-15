from src.scopes.domain.events import (
    CampaignCreated,
    OrganizationCreated,
    ProjectCreated,
    SubprojectCreated,
)
from src.shared.events import subscribe


def _authz():
    from src.iam.application.authorization_service import AuthorizationService
    from src.iam.infrastructure.enforcer import get_enforcer
    from src.iam.infrastructure.repositories import MongoGroupRepository
    from src.shared.database import get_db

    db = get_db()
    return AuthorizationService(get_enforcer(), MongoGroupRepository(db), db)


async def _on_organization_created(event: OrganizationCreated) -> None:
    await _authz().seed_org(event.org_id, event.owner_id)


async def _on_project_created(event: ProjectCreated) -> None:
    await _authz().register_lineage("project", event.project_id, "org", event.org_id)


async def _on_subproject_created(event: SubprojectCreated) -> None:
    await _authz().register_lineage("subproject", event.subproject_id, "project", event.project_id)


async def _on_campaign_created(event: CampaignCreated) -> None:
    await _authz().register_lineage(
        "campaign", event.campaign_id, "subproject", event.subproject_id
    )


def register_handlers() -> None:
    subscribe(OrganizationCreated, _on_organization_created)
    subscribe(ProjectCreated, _on_project_created)
    subscribe(SubprojectCreated, _on_subproject_created)
    subscribe(CampaignCreated, _on_campaign_created)
