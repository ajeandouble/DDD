from typing import cast

from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase


class MongoRepository:
    collection_name: str

    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        self._col: AsyncIOMotorCollection = cast(AsyncIOMotorCollection, db[self.collection_name])
