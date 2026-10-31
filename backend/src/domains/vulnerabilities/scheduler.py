import asyncio
import logging

from ...config import settings
from .service import vulnerability_feed_service

logger = logging.getLogger(__name__)


class VulnerabilityFeedScheduler:
    def __init__(self):
        self.is_running = False
        self.interval_seconds = max(60, settings.vulnerability_feed_interval_seconds)

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        logger.info("CVE feed scheduler started (every %s seconds)", self.interval_seconds)
        asyncio.create_task(self._run())

    async def stop(self):
        self.is_running = False

    async def sync_now(self) -> dict:
        return await vulnerability_feed_service.sync(force=True)

    async def _run(self):
        while self.is_running:
            try:
                result = await vulnerability_feed_service.sync()
                if not result.get("success"):
                    logger.warning("CVE feed sync did not complete: %s", result.get("message"))
            except Exception:
                logger.exception("Unhandled CVE feed scheduler error")
            await asyncio.sleep(self.interval_seconds)


vulnerability_feed_scheduler = VulnerabilityFeedScheduler()
