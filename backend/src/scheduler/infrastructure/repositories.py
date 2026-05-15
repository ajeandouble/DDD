from src.shared.mongo_repository import MongoRepository


class MongoCronJobRepository(MongoRepository):
    collection_name = "scheduler_cron_jobs"
