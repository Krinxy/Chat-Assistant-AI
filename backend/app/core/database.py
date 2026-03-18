import logging
from typing import Optional

import motor.motor_asyncio
from pymongo.errors import ConnectionFailure

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
_database: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None


async def connect_to_mongo() -> None:
    global _client, _database
    _client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
    _database = _client[settings.DATABASE_NAME]
    try:
        await _client.admin.command("ping")
        logger.info("Connected to MongoDB successfully.")
    except ConnectionFailure as exc:
        logger.error("MongoDB connection failed: %s", exc)
        raise


async def disconnect_from_mongo() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("Disconnected from MongoDB.")


def get_database() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError("Database not initialised. Call connect_to_mongo() first.")
    return _database
