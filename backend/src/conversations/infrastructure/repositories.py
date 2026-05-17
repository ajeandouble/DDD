import re
from uuid import UUID

from src.conversations.domain.models import Conversation, ConversationStats, ScopeType
from src.conversations.domain.repositories import ConversationFilter, ConversationRepository, PagedResult
from src.shared.mongo_repository import MongoRepository


def _to_doc(c: Conversation) -> dict:
    return {
        "_id": c.id,
        "title": c.title,
        "content": c.content,
        "timestamp": c.timestamp,
        "metadata": [list(pair) for pair in c.metadata],
        "emit_webhook": c.emit_webhook,
        "created_by": c.created_by,
        "organization_id": c.organization_id,
        "scope_id": c.scope_id,
        "scope_type": c.scope_type,
        "tag_ids": list(c.tag_ids),
        "stats": {
            "word_count": c.stats.word_count,
            "duration_seconds": c.stats.duration_seconds,
            "cost_cents": c.stats.cost_cents,
        },
    }


def _from_doc(doc: dict) -> Conversation:
    raw_stats = doc.get("stats", {})
    return Conversation(
        id=doc["_id"],
        title=doc["title"],
        content=doc["content"],
        timestamp=doc["timestamp"],
        metadata=[tuple(pair) for pair in doc.get("metadata", [])],
        emit_webhook=doc.get("emit_webhook", False),
        created_by=doc["created_by"],
        organization_id=doc.get("organization_id"),
        scope_id=doc.get("scope_id"),
        scope_type=doc.get("scope_type"),
        tag_ids=list(doc.get("tag_ids", [])),
        stats=ConversationStats(
            word_count=raw_stats.get("word_count"),
            duration_seconds=raw_stats.get("duration_seconds"),
            cost_cents=raw_stats.get("cost_cents"),
        ),
    )


_NUM_OPS = {"gt": "$gt", "gte": "$gte", "lt": "$lt", "lte": "$lte"}


def _string_condition(op: str, value: str) -> dict | str:
    if op == "eq":
        return value
    if op == "contains":
        return {"$regex": re.escape(value), "$options": "i"}
    if op == "regex":
        return {"$regex": value}
    return value


def _build_filter_clause(f: ConversationFilter) -> dict | None:
    if f.field in ("title", "content"):
        return {f.field: _string_condition(f.op, f.value)}
    if f.field == "meta":
        if not f.meta_key:
            return None
        return {"metadata": {"$elemMatch": {"key": f.meta_key, "value": _string_condition(f.op, f.value)}}}
    if f.field in ("stats.word_count", "stats.duration_seconds"):
        if not f.value.lstrip("-+").replace(".", "", 1).isdigit():
            return None
        num = float(f.value)
        if f.op == "eq":
            return {f.field: num}
        mongo_op = _NUM_OPS.get(f.op)
        if mongo_op:
            return {f.field: {mongo_op: num}}
    return None


class MongoConversationRepository(MongoRepository, ConversationRepository):
    collection_name = "conversations"

    async def save(self, conversation: Conversation) -> None:
        await self._col.insert_one(_to_doc(conversation))

    async def find_by_id(self, conversation_id: UUID) -> Conversation | None:
        doc = await self._col.find_one({"_id": conversation_id})
        if doc is None:
            return None
        return _from_doc(doc)

    async def find_all(
        self,
        limit: int = 50,
        organization_id: UUID | None = None,
        scope_id: UUID | None = None,
        scope_type: ScopeType | None = None,
    ) -> list[Conversation]:
        query: dict = {}
        if organization_id is not None:
            query["organization_id"] = organization_id
        if scope_id is not None:
            query["scope_id"] = scope_id
        elif organization_id is not None:
            query["scope_id"] = None
        if scope_type is not None:
            query["scope_type"] = scope_type
        docs = await self._col.find(query).sort("timestamp", -1).to_list(length=limit)
        return [_from_doc(d) for d in docs]

    async def update(self, conversation: Conversation) -> None:
        doc = _to_doc(conversation)
        doc.pop("_id")
        await self._col.update_one({"_id": conversation.id}, {"$set": doc})

    async def search(
        self,
        organization_id: UUID | None,
        scope_id: UUID | None,
        scope_type: ScopeType | None,
        filters: list[ConversationFilter],
        page: int,
        page_size: int,
        sort_by: str = "timestamp",
        sort_dir: int = -1,
    ) -> PagedResult:
        _SORTABLE = {"timestamp", "title", "stats.word_count", "stats.duration_seconds"}
        if sort_by not in _SORTABLE:
            sort_by = "timestamp"

        query: dict = {}
        if organization_id is not None:
            query["organization_id"] = organization_id
        if scope_id is not None:
            query["scope_id"] = scope_id
        elif organization_id is not None:
            query["scope_id"] = None
        if scope_type is not None:
            query["scope_type"] = scope_type

        and_clauses = [c for f in filters if (c := _build_filter_clause(f))]
        if and_clauses:
            query["$and"] = and_clauses

        skip = (page - 1) * page_size
        total = await self._col.count_documents(query)
        docs = (
            await self._col.find(query)
            .sort(sort_by, sort_dir)
            .skip(skip)
            .limit(page_size)
            .to_list(length=page_size)
        )
        return PagedResult(items=[_from_doc(d) for d in docs], total=total, page=page, page_size=page_size)

    async def delete(self, conversation_id: UUID) -> None:
        await self._col.delete_one({"_id": conversation_id})
