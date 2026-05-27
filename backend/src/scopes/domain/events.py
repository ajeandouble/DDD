from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class OrganizationCreated:
    org_id: UUID
    owner_id: UUID


@dataclass(frozen=True)
class ProjectCreated:
    project_id: UUID
    org_id: UUID


@dataclass(frozen=True)
class SubprojectCreated:
    subproject_id: UUID
    project_id: UUID


@dataclass(frozen=True)
class CampaignCreated:
    campaign_id: UUID
    parent_type: str
    parent_id: UUID
    organization_id: UUID
