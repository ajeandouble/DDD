from src.shared.mongo_repository import MongoRepository


class MongoAnalysisJobRepository(MongoRepository):
    collection_name = "analyzer_jobs"


class MongoTranscriptRepository(MongoRepository):
    collection_name = "analyzer_transcripts"
