from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class OrgMemberAdded:
    org_id: UUID
    user_id: UUID


@dataclass(frozen=True)
class OrgMemberRemoved:
    org_id: UUID
    user_id: UUID
