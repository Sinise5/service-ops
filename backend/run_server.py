#!/usr/bin/env python3
"""
ServiceOps Backend Server Runner
Properly initializes database, redis, and scheduler before starting Robyn
"""
import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.main import app
from src.database import db
from src.redis_client import redis_client
from src.domains.monitoring.scheduler import scheduler
from src.config import settings

async def startup():
    """Initialize all async resources"""
    print(f"🔌 Connecting to database: {settings.database_url}")
    await db.connect()
    print("✅ Database connected")
    
    print(f"🔌 Connecting to Redis: {settings.redis_url}")
    await redis_client.connect()
    print("✅ Redis connected")
    
    print("🔌 Starting monitoring scheduler...")
    await scheduler.start()
    print("✅ Scheduler started")

if __name__ == "__main__":
    import os
    # Prevent interactive port prompts
    os.environ['ROBYN_PORT'] = str(settings.port)
    
    print(f"🚀 Starting ServiceOps Backend on {settings.host}:{settings.port}")
    asyncio.run(startup())
    
    # Start Robyn with explicit port
    print(f"✅ Startup complete. Robyn server listening on port {settings.port}")
    app.start(port=settings.port, host=settings.host)
