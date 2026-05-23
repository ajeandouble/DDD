from uuid import UUID

from motor.motor_asyncio import AsyncIOMotorDatabase

from src.webhooks.domain import Delivery, DeliveryStatus, WebhookEndpoint
from src.webhooks.domain.repositories import DeliveryRepository, WebhookEndpointRepository


def _ep_to_doc(ep: WebhookEndpoint) -> dict:
    return {
        "_id": ep.id,
        "org_id": ep.org_id,
        "url": ep.url,
        "secret": ep.secret,
        "event_types": ep.event_types,
        "transformer": ep.transformer,
        "enabled": ep.enabled,
        "trigger_scope": ep.trigger_scope,
        "trigger_scope_id": ep.trigger_scope_id,
        "created_at": ep.created_at,
    }


def _ep_from_doc(doc: dict) -> WebhookEndpoint:
    return WebhookEndpoint(
        id=doc["_id"],
        org_id=doc["org_id"],
        url=doc["url"],
        secret=doc.get("secret", ""),
        event_types=doc.get("event_types", ["conversation.transcribed"]),
        transformer=doc.get("transformer", "result = payload"),
        enabled=doc.get("enabled", True),
        trigger_scope=doc.get("trigger_scope"),
        trigger_scope_id=doc.get("trigger_scope_id"),
        created_at=doc["created_at"],
    )


def _del_to_doc(d: Delivery) -> dict:
    return {
        "_id": d.id,
        "endpoint_id": d.endpoint_id,
        "event_type": d.event_type,
        "payload_sent": d.payload_sent,
        "status": d.status,
        "response_code": d.response_code,
        "error": d.error,
        "created_at": d.created_at,
    }


def _del_from_doc(doc: dict) -> Delivery:
    return Delivery(
        id=doc["_id"],
        endpoint_id=doc["endpoint_id"],
        event_type=doc["event_type"],
        payload_sent=doc.get("payload_sent", {}),
        status=DeliveryStatus(doc["status"]),
        response_code=doc.get("response_code"),
        error=doc.get("error"),
        created_at=doc["created_at"],
    )


class MongoWebhookEndpointRepository(WebhookEndpointRepository):
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db["webhooks_endpoints"]

    async def save(self, ep: WebhookEndpoint) -> None:
        await self._col.insert_one(_ep_to_doc(ep))

    async def update(self, ep: WebhookEndpoint) -> None:
        doc = _ep_to_doc(ep)
        doc.pop("_id")
        await self._col.update_one({"_id": ep.id}, {"$set": doc})

    async def find_by_id(self, ep_id: UUID) -> WebhookEndpoint | None:
        doc = await self._col.find_one({"_id": ep_id})
        return _ep_from_doc(doc) if doc else None

    async def find_by_org(self, org_id: UUID) -> list[WebhookEndpoint]:
        docs = await self._col.find({"org_id": org_id}).to_list(length=100)
        return [_ep_from_doc(d) for d in docs]

    async def find_enabled_for_event(self, event_type: str) -> list[WebhookEndpoint]:
        docs = await self._col.find({"enabled": True, "event_types": event_type}).to_list(
            length=200
        )
        return [_ep_from_doc(d) for d in docs]

    async def delete(self, ep_id: UUID) -> None:
        await self._col.delete_one({"_id": ep_id})


class MongoDeliveryRepository(DeliveryRepository):
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col = db["webhooks_deliveries"]

    async def save(self, d: Delivery) -> None:
        await self._col.insert_one(_del_to_doc(d))

    async def find_by_endpoint(self, endpoint_id: UUID, limit: int = 50) -> list[Delivery]:
        docs = (
            await self._col.find({"endpoint_id": endpoint_id})
            .sort("created_at", -1)
            .to_list(length=limit)
        )
        return [_del_from_doc(d) for d in docs]
