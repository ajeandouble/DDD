from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

CampaignParentType = Literal["organization", "project", "subproject"]

VALID_COLORS = {
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#ec4899",
    "#f43f5e",
    "#64748b",
}


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
    color: str | None = None

    @classmethod
    def create(cls, name: str, organization_id: UUID) -> "Project":
        return cls(name=name, organization_id=organization_id)

    def rename(self, name: str) -> None:
        if not name.strip():
            raise ValueError("Name cannot be empty")
        self.name = name.strip()

    def set_color(self, color: str | None) -> None:
        if color is not None and color not in VALID_COLORS:
            raise ValueError(f"Invalid color: {color}")
        self.color = color


@dataclass
class Subproject:
    name: str
    project_id: UUID
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    color: str | None = None

    @classmethod
    def create(cls, name: str, project_id: UUID) -> "Subproject":
        return cls(name=name, project_id=project_id)

    def rename(self, name: str) -> None:
        if not name.strip():
            raise ValueError("Name cannot be empty")
        self.name = name.strip()

    def set_color(self, color: str | None) -> None:
        if color is not None and color not in VALID_COLORS:
            raise ValueError(f"Invalid color: {color}")
        self.color = color


@dataclass
class Campaign:
    name: str
    parent_type: CampaignParentType
    parent_id: UUID
    organization_id: UUID
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    color: str | None = None

    @classmethod
    def create(
        cls,
        name: str,
        parent_type: CampaignParentType,
        parent_id: UUID,
        organization_id: UUID,
    ) -> "Campaign":
        return cls(
            name=name, parent_type=parent_type, parent_id=parent_id, organization_id=organization_id
        )

    def rename(self, name: str) -> None:
        if not name.strip():
            raise ValueError("Name cannot be empty")
        self.name = name.strip()

    def set_color(self, color: str | None) -> None:
        if color is not None and color not in VALID_COLORS:
            raise ValueError(f"Invalid color: {color}")
        self.color = color
