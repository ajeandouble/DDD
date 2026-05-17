import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID, uuid4

import bcrypt


@dataclass
class User:
    id: UUID
    email: str
    password_hash: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def register(cls, email: str, password: str) -> "User":
        salt = bcrypt.gensalt()
        return cls(
            id=uuid4(),
            email=email,
            password_hash=bcrypt.hashpw(password.encode(), salt).decode(),
        )

    def verify_password(self, password: str) -> bool:
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())


class Role(StrEnum):
    admin = "admin"
    supervisor = "supervisor"
    editor = "editor"
    viewer = "viewer"


@dataclass
class Group:
    id: UUID
    name: str
    org_id: UUID
    owner_id: UUID
    member_ids: list[UUID] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(cls, name: str, org_id: UUID, owner_id: UUID) -> "Group":
        return cls(id=uuid4(), name=name, org_id=org_id, owner_id=owner_id)

    def add_member(self, user_id: UUID) -> None:
        if user_id not in self.member_ids:
            self.member_ids.append(user_id)

    def remove_member(self, user_id: UUID) -> None:
        self.member_ids = [m for m in self.member_ids if m != user_id]


@dataclass
class ApiKey:
    id: UUID
    name: str
    key_hash: str
    key_prefix: str
    owner_id: UUID
    scope_type: str | None
    scope_id: UUID | None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def create(
        cls,
        name: str,
        owner_id: UUID,
        scope_type: str | None = None,
        scope_id: UUID | None = None,
    ) -> tuple["ApiKey", str]:
        raw_key = "ddd_" + uuid4().hex
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        key_prefix = raw_key[4:12]
        return (
            cls(
                id=uuid4(),
                name=name,
                key_hash=key_hash,
                key_prefix=key_prefix,
                owner_id=owner_id,
                scope_type=scope_type,
                scope_id=scope_id,
            ),
            raw_key,
        )

    @staticmethod
    def hash_raw(raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode()).hexdigest()


# Union type for request authentication
Principal = User | ApiKey
