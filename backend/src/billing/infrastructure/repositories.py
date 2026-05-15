from src.shared.mongo_repository import MongoRepository


class MongoUsageRecordRepository(MongoRepository):
    collection_name = "billing_usage_records"


class MongoInvoiceRepository(MongoRepository):
    collection_name = "billing_invoices"
