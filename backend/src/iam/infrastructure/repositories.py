from uuid import UUID

from src.iam.domain.models import ApiKey, Group, Tag, User
from src.iam.domain.repositories import (
    ApiKeyRepository,
    GroupRepository,
    TagRepository,
    UserRepository,
)
from src.shared.mongo_repository import MongoRepository

# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


def _user_to_doc(user: User) -> dict:
    return {
        "_id": user.id,
        "email": user.email,
        "password_hash": user.password_hash,
        "created_at": user.created_at,
    }


def _user_from_doc(doc: dict) -> User:
    return User(
        id=doc["_id"],
        email=doc["email"],
        password_hash=doc["password_hash"],
        created_at=doc["created_at"],
    )


class MongoUserRepository(MongoRepository, UserRepository):
    collection_name = "iam_users"

    async def save(self, user: User) -> None:
        await self._col.insert_one(_user_to_doc(user))

    async def find_by_email(self, email: str) -> User | None:
        doc = await self._col.find_one({"email": email})
        return _user_from_doc(doc) if doc else None

    async def find_by_id(self, user_id: UUID) -> User | None:
        doc = await self._col.find_one({"_id": user_id})
        return _user_from_doc(doc) if doc else None


# ---------------------------------------------------------------------------
# Group
# ---------------------------------------------------------------------------


def _group_to_doc(group: Group) -> dict:
    return {
        "_id": group.id,
        "name": group.name,
        "org_id": group.org_id,
        "owner_id": group.owner_id,
        "member_ids": list(group.member_ids),
        "created_at": group.created_at,
    }


def _group_from_doc(doc: dict) -> Group:
    return Group(
        id=doc["_id"],
        name=doc["name"],
        org_id=doc["org_id"],
        owner_id=doc["owner_id"],
        member_ids=list(doc.get("member_ids", [])),
        created_at=doc["created_at"],
    )


class MongoGroupRepository(MongoRepository, GroupRepository):
    collection_name = "iam_groups"

    async def save(self, group: Group) -> None:
        await self._col.replace_one({"_id": group.id}, _group_to_doc(group), upsert=True)

    async def find_by_id(self, group_id: UUID) -> Group | None:
        doc = await self._col.find_one({"_id": group_id})
        return _group_from_doc(doc) if doc else None

    async def find_by_org(self, org_id: UUID) -> list[Group]:
        docs = await self._col.find({"org_id": org_id}).to_list(length=500)
        return [_group_from_doc(d) for d in docs]

    async def find_by_member_in_org(self, user_id: UUID, org_id: UUID) -> list[Group]:
        docs = await self._col.find({"org_id": org_id, "member_ids": user_id}).to_list(length=500)
        return [_group_from_doc(d) for d in docs]

    async def delete(self, group_id: UUID) -> None:
        await self._col.delete_one({"_id": group_id})


# ---------------------------------------------------------------------------
# ApiKey
# ---------------------------------------------------------------------------


def _apikey_to_doc(key: ApiKey) -> dict:
    return {
        "_id": key.id,
        "name": key.name,
        "key_hash": key.key_hash,
        "key_prefix": key.key_prefix,
        "owner_id": key.owner_id,
        "scope_type": key.scope_type,
        "scope_id": key.scope_id,
        "created_at": key.created_at,
    }


def _apikey_from_doc(doc: dict) -> ApiKey:
    return ApiKey(
        id=doc["_id"],
        name=doc["name"],
        key_hash=doc["key_hash"],
        key_prefix=doc["key_prefix"],
        owner_id=doc["owner_id"],
        scope_type=doc.get("scope_type"),
        scope_id=doc.get("scope_id"),
        created_at=doc["created_at"],
    )


class MongoApiKeyRepository(MongoRepository, ApiKeyRepository):
    collection_name = "iam_api_keys"

    async def save(self, api_key: ApiKey) -> None:
        await self._col.insert_one(_apikey_to_doc(api_key))

    async def find_by_id(self, key_id: UUID) -> ApiKey | None:
        doc = await self._col.find_one({"_id": key_id})
        return _apikey_from_doc(doc) if doc else None

    async def find_by_hash(self, key_hash: str) -> ApiKey | None:
        doc = await self._col.find_one({"key_hash": key_hash})
        return _apikey_from_doc(doc) if doc else None

    async def find_by_owner(self, owner_id: UUID) -> list[ApiKey]:
        docs = await self._col.find({"owner_id": owner_id}).to_list(length=200)
        return [_apikey_from_doc(d) for d in docs]

    async def delete(self, key_id: UUID) -> None:
        await self._col.delete_one({"_id": key_id})


# ---------------------------------------------------------------------------
# Tag
# ---------------------------------------------------------------------------


def _tag_to_doc(tag: Tag) -> dict:
    return {
        "_id": tag.id,
        "name": tag.name,
        "org_id": tag.org_id,
        "created_at": tag.created_at,
    }


def _tag_from_doc(doc: dict) -> Tag:
    return Tag(
        id=doc["_id"],
        name=doc["name"],
        org_id=doc["org_id"],
        created_at=doc["created_at"],
    )


class MongoTagRepository(MongoRepository, TagRepository):
    collection_name = "iam_tags"

    async def save(self, tag: Tag) -> None:
        await self._col.insert_one(_tag_to_doc(tag))

    async def find_by_id(self, tag_id: UUID) -> Tag | None:
        doc = await self._col.find_one({"_id": tag_id})
        return _tag_from_doc(doc) if doc else None

    async def find_by_org(self, org_id: UUID) -> list[Tag]:
        docs = await self._col.find({"org_id": org_id}).to_list(length=500)
        return [_tag_from_doc(d) for d in docs]

    async def delete(self, tag_id: UUID) -> None:
        await self._col.delete_one({"_id": tag_id})
