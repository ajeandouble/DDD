from src.iam.domain.events import OrgMemberAdded, OrgMemberRemoved
from src.shared.events import subscribe


def _org_repo():
    from src.scopes.infrastructure.repositories import MongoOrganizationRepository
    from src.shared.database import get_db

    return MongoOrganizationRepository(get_db())


async def _on_org_member_added(event: OrgMemberAdded) -> None:
    repo = _org_repo()
    org = await repo.find_by_id(event.org_id)
    if org is None:
        return
    org.add_member(event.user_id)
    await repo.update(org)


async def _on_org_member_removed(event: OrgMemberRemoved) -> None:
    repo = _org_repo()
    org = await repo.find_by_id(event.org_id)
    if org is None:
        return
    org.remove_member(event.user_id)
    await repo.update(org)


def register_handlers() -> None:
    subscribe(OrgMemberAdded, _on_org_member_added)
    subscribe(OrgMemberRemoved, _on_org_member_removed)
