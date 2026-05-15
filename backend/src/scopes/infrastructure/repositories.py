from uuid import UUID

from src.scopes.domain.models import Campaign, Organization, Project, Subproject
from src.scopes.domain.repositories import (
    CampaignRepository,
    OrganizationRepository,
    ProjectRepository,
    SubprojectRepository,
)
from src.shared.mongo_repository import MongoRepository

# --- Organization ---


def _org_to_doc(org: Organization) -> dict:
    return {
        "_id": str(org.id),
        "name": org.name,
        "owner_id": str(org.owner_id),
        "member_ids": [str(m) for m in org.member_ids],
        "created_at": org.created_at,
    }


def _org_from_doc(doc: dict) -> Organization:
    return Organization(
        id=UUID(doc["_id"]),
        name=doc["name"],
        owner_id=UUID(doc["owner_id"]),
        member_ids=[UUID(m) for m in doc.get("member_ids", [])],
        created_at=doc["created_at"],
    )


class MongoOrganizationRepository(MongoRepository, OrganizationRepository):
    collection_name = "organizations"

    async def save(self, org: Organization) -> None:
        await self._col.insert_one(_org_to_doc(org))

    async def find_by_id(self, org_id: UUID) -> Organization | None:
        doc = await self._col.find_one({"_id": str(org_id)})
        return _org_from_doc(doc) if doc else None

    async def find_by_member(self, user_id: UUID) -> list[Organization]:
        docs = await self._col.find({"member_ids": str(user_id)}).to_list(length=100)
        return [_org_from_doc(d) for d in docs]

    async def update(self, org: Organization) -> None:
        doc = _org_to_doc(org)
        doc.pop("_id")
        await self._col.update_one({"_id": str(org.id)}, {"$set": doc})

    async def delete(self, org_id: UUID) -> None:
        await self._col.delete_one({"_id": str(org_id)})


# --- Project ---


def _project_to_doc(p: Project) -> dict:
    return {
        "_id": str(p.id),
        "name": p.name,
        "organization_id": str(p.organization_id),
        "created_at": p.created_at,
    }


def _project_from_doc(doc: dict) -> Project:
    return Project(
        id=UUID(doc["_id"]),
        name=doc["name"],
        organization_id=UUID(doc["organization_id"]),
        created_at=doc["created_at"],
    )


class MongoProjectRepository(MongoRepository, ProjectRepository):
    collection_name = "projects"

    async def save(self, project: Project) -> None:
        await self._col.insert_one(_project_to_doc(project))

    async def find_by_id(self, project_id: UUID) -> Project | None:
        doc = await self._col.find_one({"_id": str(project_id)})
        return _project_from_doc(doc) if doc else None

    async def find_by_organization(self, org_id: UUID) -> list[Project]:
        docs = await self._col.find({"organization_id": str(org_id)}).to_list(length=100)
        return [_project_from_doc(d) for d in docs]

    async def update(self, project: Project) -> None:
        doc = _project_to_doc(project)
        doc.pop("_id")
        await self._col.update_one({"_id": str(project.id)}, {"$set": doc})

    async def delete(self, project_id: UUID) -> None:
        await self._col.delete_one({"_id": str(project_id)})


# --- Subproject ---


def _subproject_to_doc(sp: Subproject) -> dict:
    return {
        "_id": str(sp.id),
        "name": sp.name,
        "project_id": str(sp.project_id),
        "created_at": sp.created_at,
    }


def _subproject_from_doc(doc: dict) -> Subproject:
    return Subproject(
        id=UUID(doc["_id"]),
        name=doc["name"],
        project_id=UUID(doc["project_id"]),
        created_at=doc["created_at"],
    )


class MongoSubprojectRepository(MongoRepository, SubprojectRepository):
    collection_name = "subprojects"

    async def save(self, subproject: Subproject) -> None:
        await self._col.insert_one(_subproject_to_doc(subproject))

    async def find_by_id(self, subproject_id: UUID) -> Subproject | None:
        doc = await self._col.find_one({"_id": str(subproject_id)})
        return _subproject_from_doc(doc) if doc else None

    async def find_by_project(self, project_id: UUID) -> list[Subproject]:
        docs = await self._col.find({"project_id": str(project_id)}).to_list(length=100)
        return [_subproject_from_doc(d) for d in docs]

    async def update(self, subproject: Subproject) -> None:
        doc = _subproject_to_doc(subproject)
        doc.pop("_id")
        await self._col.update_one({"_id": str(subproject.id)}, {"$set": doc})

    async def delete(self, subproject_id: UUID) -> None:
        await self._col.delete_one({"_id": str(subproject_id)})


# --- Campaign ---


def _campaign_to_doc(c: Campaign) -> dict:
    return {
        "_id": str(c.id),
        "name": c.name,
        "subproject_id": str(c.subproject_id),
        "created_at": c.created_at,
    }


def _campaign_from_doc(doc: dict) -> Campaign:
    return Campaign(
        id=UUID(doc["_id"]),
        name=doc["name"],
        subproject_id=UUID(doc["subproject_id"]),
        created_at=doc["created_at"],
    )


class MongoCampaignRepository(MongoRepository, CampaignRepository):
    collection_name = "campaigns"

    async def save(self, campaign: Campaign) -> None:
        await self._col.insert_one(_campaign_to_doc(campaign))

    async def find_by_id(self, campaign_id: UUID) -> Campaign | None:
        doc = await self._col.find_one({"_id": str(campaign_id)})
        return _campaign_from_doc(doc) if doc else None

    async def find_by_subproject(self, subproject_id: UUID) -> list[Campaign]:
        docs = await self._col.find({"subproject_id": str(subproject_id)}).to_list(length=100)
        return [_campaign_from_doc(d) for d in docs]

    async def update(self, campaign: Campaign) -> None:
        doc = _campaign_to_doc(campaign)
        doc.pop("_id")
        await self._col.update_one({"_id": str(campaign.id)}, {"$set": doc})

    async def delete(self, campaign_id: UUID) -> None:
        await self._col.delete_one({"_id": str(campaign_id)})
