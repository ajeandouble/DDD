from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4


@dataclass
class Organization:
    name: str
    owner_id: UUID
    id: UUID = field(default_factory=uuid4)
    member_ids: list[UUID] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, name: str, owner_id: UUID) -> "Organization":
        return cls(name=name, owner_id=owner_id, member_ids=[owner_id])

    def add_member(self, user_id: UUID) -> None:
        if user_id not in self.member_ids:
            self.member_ids.append(user_id)

    def remove_member(self, user_id: UUID) -> None:
        if user_id != self.owner_id:
            self.member_ids = [m for m in self.member_ids if m != user_id]

    def is_member(self, user_id: UUID) -> bool:
        return user_id in self.member_ids


@dataclass
class Project:
    name: str
    organization_id: UUID
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, name: str, organization_id: UUID) -> "Project":
        return cls(name=name, organization_id=organization_id)


@dataclass
class Subproject:
    name: str
    project_id: UUID
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, name: str, project_id: UUID) -> "Subproject":
        return cls(name=name, project_id=project_id)


@dataclass
class Campaign:
    name: str
    subproject_id: UUID
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, name: str, subproject_id: UUID) -> "Campaign":
        return cls(name=name, subproject_id=subproject_id)
