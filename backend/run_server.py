#!/usr/bin/env python3
"""
ServiceOps Backend Server Runner
Properly initializes database, redis, and scheduler before starting Robyn
"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.main import app
from src.database import db
from src.redis_client import redis_client
from src.domains.monitoring.scheduler import scheduler
from src.domains.vulnerabilities.scheduler import vulnerability_feed_scheduler
from src.config import settings

async def startup():
    """Initialize shared clients and start background schedulers."""
    print(f"🔌 Connecting to database: {settings.database_url}")
    await db.connect()
    print("✅ Database connected")
    
    print(f"🔌 Connecting to Redis: {settings.redis_url}")
    await redis_client.connect()
    print("✅ Redis connected")
    
    print("🔌 Starting monitoring scheduler...")
    await scheduler.start()
    print("✅ Scheduler started")

    print("🔌 Starting CVE feed scheduler...")
    await vulnerability_feed_scheduler.start()
    print("✅ CVE feed scheduler started")

async def shutdown():
    """Stop background tasks and close shared connections."""
    await vulnerability_feed_scheduler.stop()
    await scheduler.stop()
    await db.close()
    await redis_client.close()

if __name__ == "__main__":
    import os
    # Prevent interactive port prompts
    os.environ['ROBYN_PORT'] = str(settings.port)
    
    print(f"🚀 Starting ServiceOps Backend on {settings.host}:{settings.port}")
    app.startup_handler(startup)
    app.shutdown_handler(shutdown)
    app.start(port=settings.port, host=settings.host)
