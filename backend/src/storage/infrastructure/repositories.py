from src.shared.mongo_repository import MongoRepository


class MongoStoredObjectRepository(MongoRepository):
    collection_name = "storage_objects"
