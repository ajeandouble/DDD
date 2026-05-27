from uuid import UUID

from motor.motor_asyncio import AsyncIOMotorDatabase


class OrgScopeQuery:
    """Read-side query: collect scope IDs belonging to an org across context collections.
    Used only for Casbin role lookups — never for writes."""

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._db = db

    async def project_ids(self, org_id: UUID) -> list[UUID]:
        return [
            doc["_id"]
            async for doc in self._db["projects"].find({"organization_id": org_id}, {"_id": 1})
        ]

    async def subproject_ids(self, project_ids: list[UUID]) -> list[UUID]:
        ids: list[UUID] = []
        for pid in project_ids:
            async for doc in self._db["subprojects"].find({"project_id": pid}, {"_id": 1}):
                ids.append(doc["_id"])
        return ids

    async def campaign_ids(self, org_id: UUID) -> list[UUID]:
        return [
            doc["_id"]
            async for doc in self._db["campaigns"].find({"organization_id": org_id}, {"_id": 1})
        ]

    async def all_domains(self, org_id: UUID) -> list[str]:
        """All Casbin domain strings for every scope in the org."""
        domains = [f"org:{org_id}"]
        pids = await self.project_ids(org_id)
        domains.extend(f"project:{pid}" for pid in pids)
        sids = await self.subproject_ids(pids)
        domains.extend(f"subproject:{sid}" for sid in sids)
        cids = await self.campaign_ids(org_id)
        domains.extend(f"campaign:{cid}" for cid in cids)
        return domains
