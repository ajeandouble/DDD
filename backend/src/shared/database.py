import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None

_POOL_CONFIG = {
    "maxPoolSize": 50,
    "minPoolSize": 5,
    "maxIdleTimeMS": 30_000,
    "serverSelectionTimeoutMS": 5_000,
    "connectTimeoutMS": 5_000,
}


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("Database not initialised — call connect() first")
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[os.environ["MONGO_DB"]]


async def connect() -> None:
    global _client
    _client = AsyncIOMotorClient(os.environ["MONGO_URI"], **_POOL_CONFIG)


async def disconnect() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
