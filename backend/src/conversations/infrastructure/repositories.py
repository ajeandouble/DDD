from uuid import UUID

from src.conversations.domain.models import Conversation, ConversationStats, ScopeType
from src.conversations.domain.repositories import ConversationRepository
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

    async def delete(self, conversation_id: UUID) -> None:
        await self._col.delete_one({"_id": conversation_id})
