from src.shared.mongo_repository import MongoRepository


class MongoWebhookEndpointRepository(MongoRepository):
    collection_name = "webhooks_endpoints"


class MongoDeliveryRepository(MongoRepository):
    collection_name = "webhooks_deliveries"
