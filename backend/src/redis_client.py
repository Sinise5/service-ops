import redis.asyncio as redis
from .config import settings


class RedisClient:
    def __init__(self):
        self.client = None

    async def connect(self):
        """Initialize Redis connection"""
        self.client = await redis.from_url(settings.redis_url, decode_responses=True)
        await self.client.ping()

    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()

    async def get(self, key: str):
        """Get value from Redis"""
        if not self.client:
            raise RuntimeError("Redis not connected")
        return await self.client.get(key)

    async def set(self, key: str, value: str, ex: int = None):
        """Set value in Redis"""
        if not self.client:
            raise RuntimeError("Redis not connected")
        return await self.client.set(key, value, ex=ex)


redis_client = RedisClient()