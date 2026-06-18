import asyncio
import json
from datetime import datetime
from ...database import db
from ..monitoring.plugin_registry import PluginRegistry
from ..alerts.repository import AlertIncidentRepository
from ..alerts.models import AlertIncidentCreate
import logging

logger = logging.getLogger(__name__)


class MonitoringScheduler:
    def __init__(self):
        self.is_running = False
        self.interval_check = 30  # Check every 30 seconds if checks need to run
        self.incident_repo = AlertIncidentRepository()

    async def start(self):
        """Start the scheduler background task"""
        if self.is_running:
            logger.warning("Scheduler already running")
            return
        
        self.is_running = True
        logger.info("Monitoring scheduler started")
        asyncio.create_task(self._run_scheduler())

    async def stop(self):
        """Stop the scheduler"""
        self.is_running = False
        logger.info("Monitoring scheduler stopped")

    async def _run_scheduler(self):
        """Main scheduler loop"""
        while self.is_running:
            try:
                await self._execute_due_checks()
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
            
            await asyncio.sleep(self.interval_check)

    async def _execute_due_checks(self):
        """Find and execute checks that are due"""
        try:
            async with db.get_connection() as conn:
                cursor = await conn.execute("""
                    SELECT mc.id, mc.check_type, mc.config, mc.asset_id, 
                           ar.id as rule_id, ar.name as rule_name, ar.condition, ar.threshold, ar.severity
                    FROM monitoring_checks mc
                    LEFT JOIN alert_rules ar ON ar.check_id = mc.id AND ar.enabled = true
                    WHERE mc.enabled = true
                    AND (mc.last_executed_at IS NULL 
                         OR NOW() - mc.last_executed_at > INTERVAL '1 second' * mc.interval_seconds)
                    LIMIT 10
                """)
                checks = await cursor.fetchall() or []
                
                for check in checks:
                    await self._run_check(check, conn)
        except Exception as e:
            logger.error(f"Error fetching due checks: {e}")

    async def _run_check(self, check: dict, conn):
        """Execute a single monitoring check"""
        try:
            check_id = check["id"]
            check_type = check["check_type"]
            config = check["config"]
            
            # Get plugin and execute
            registry = PluginRegistry()
            plugin_class = registry.get_plugin(check_type)
            if not plugin_class:
                logger.warning(f"Plugin not found: {check_type}")
                return
            
            plugin = plugin_class()
            result = await plugin.execute(config)
            
            # Store result
            await conn.execute("""
                INSERT INTO monitoring_results (check_id, status, response_time_ms, error_message)
                VALUES (%s, %s, %s, %s)
            """, (str(check_id), result.status, result.response_time_ms, result.error_message))
            
            # Update last executed time
            await conn.execute("""
                UPDATE monitoring_checks SET last_executed_at = NOW() WHERE id = %s
            """, (str(check_id),))
            
            # Evaluate alert rules
            if check.get("rule_id"):
                await self._evaluate_alert(check, result)
            
            logger.info(f"Check executed: {check_id} -> {result.status}")
        except Exception as e:
            logger.error(f"Error running check {check.get('id')}: {e}")

    async def _evaluate_alert(self, check: dict, result):
        """Evaluate alert rule based on check result"""
        try:
            rule_id = check["rule_id"]
            condition = check["condition"]
            threshold = check.get("threshold")
            
            should_trigger = False
            
            if condition == "check_failed" and result.status == "failed":
                should_trigger = True
            elif condition == "threshold_exceeded" and threshold and result.response_time_ms and result.response_time_ms > threshold:
                should_trigger = True
            
            if should_trigger:
                # Create incident if none open
                async with db.get_connection() as conn:
                    cursor = await conn.execute("""
                        SELECT id FROM alert_incidents
                        WHERE rule_id = %s AND status = 'open'
                        LIMIT 1
                    """, (str(rule_id),))
                    existing = await cursor.fetchone()
                    
                    if not existing:
                        await conn.execute("""
                            INSERT INTO alert_incidents (rule_id, check_id, status, severity, message)
                            VALUES (%s, %s, 'open', %s, %s)
                        """, (str(rule_id), str(check["id"]), check.get("severity", "warning"),
                              f"Alert triggered: {condition}"))
                        logger.info(f"Alert incident created for rule: {rule_id}")
                
                # Send notifications
                await self._send_notification(check, result)
        except Exception as e:
            logger.error(f"Error evaluating alert: {e}")

    async def _send_notification(self, check: dict, result):
        """Send notification for triggered alert rule"""
        from ..alerts.notification_service import notification_service
        
        try:
            rule_id = check.get("rule_id")
            if not rule_id:
                return
            
            async with db.get_connection() as conn:
                # Get notification channels for this rule
                cursor = await conn.execute("""
                    SELECT nc.id, nc.name, nc.type, nc.config
                    FROM alert_notifications an
                    JOIN notification_channels nc ON nc.id = an.channel_id
                    WHERE an.rule_id = %s AND nc.enabled = true
                """, (str(rule_id),))
                channels = await cursor.fetchall() or []
                
                if not channels:
                    return
                
                rule_name = check.get("rule_name", "Unknown Alert")
                severity = check.get("severity", "warning")
                message = f"Alert: {rule_name}\nSeverity: {severity}\nCheck Type: {check.get('check_type', 'unknown')}\nStatus: {result.status}"
                
                if result.error_message:
                    message += f"\nError: {result.error_message}"
                
                for channel in channels:
                    config = channel["config"]
                    if isinstance(config, str):
                        config = json.loads(config)
                    
                    await notification_service.send(
                        channel["type"],
                        config,
                        message,
                        f"ServiceOps Alert: {rule_name}"
                    )
                
                logger.info(f"Notifications sent for alert rule: {rule_id} to {len(channels)} channels")
        except Exception as e:
            logger.error(f"Error sending notification: {e}")


scheduler = MonitoringScheduler()
