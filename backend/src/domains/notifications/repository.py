from uuid import UUID
from typing import Optional, List
import json
from ...database import db
from .models import (
    NotificationChannelCreate, NotificationChannelUpdate,
    NotificationLogCreate
)

class NotificationChannelRepository:
    """Repository for notification_channels table"""

    async def create(self, channel: NotificationChannelCreate) -> dict:
        """Create a new notification channel"""
        import json as json_lib
        async with db.get_connection() as conn:
            result = await conn.execute(
                """INSERT INTO notification_channels (name, type, config, enabled)
                   VALUES (%s, %s, %s, true)
                   RETURNING id, name, type, config, enabled, created_at""",
                (channel.name, channel.type, json_lib.dumps(channel.config))
            )
            row = await result.fetchone()
            return dict(row) if row else None

    async def get_by_id(self, channel_id: UUID) -> Optional[dict]:
        """Get notification channel by ID"""
        async with db.get_connection() as conn:
            result = await conn.execute(
                "SELECT * FROM notification_channels WHERE id = %s",
                (str(channel_id),)
            )
            row = await result.fetchone()
            return dict(row) if row else None

    async def list_enabled(self, channel_type: Optional[str] = None) -> List[dict]:
        """List all enabled notification channels, optionally filtered by type"""
        query = "SELECT * FROM notification_channels WHERE enabled = true"
        params = []
        if channel_type:
            query += " AND type = %s"
            params.append(channel_type)
        query += " ORDER BY created_at DESC"
        async with db.get_connection() as conn:
            result = await conn.execute(query, tuple(params))
            rows = await result.fetchall()
            return [dict(row) for row in rows]

    async def list(self, limit: int = 50, offset: int = 0) -> List[dict]:
        """List all notification channels with pagination"""
        async with db.get_connection() as conn:
            result = await conn.execute(
                "SELECT * FROM notification_channels ORDER BY created_at DESC LIMIT %s OFFSET %s",
                (limit, offset)
            )
            rows = await result.fetchall()
            return [dict(row) for row in rows]

    async def update(self, channel_id: UUID, channel: NotificationChannelUpdate) -> Optional[dict]:
        """Update a notification channel"""
        updates = []
        values = []
        if channel.name is not None:
            updates.append("name = %s")
            values.append(channel.name)
        if channel.config is not None:
            updates.append("config = %s")
            values.append(json.dumps(channel.config))
        if channel.enabled is not None:
            updates.append("enabled = %s")
            values.append(channel.enabled)
        if not updates:
            return await self.get_by_id(channel_id)
        updates.append("updated_at = NOW()")
        values.append(str(channel_id))
        
        async with db.get_connection() as conn:
            result = await conn.execute(
                f"UPDATE notification_channels SET {', '.join(updates)} WHERE id = %s RETURNING *",
                tuple(values)
            )
            row = await result.fetchone()
            return dict(row) if row else None

    async def delete(self, channel_id: UUID) -> bool:
        """Delete a notification channel"""
        async with db.get_connection() as conn:
            result = await conn.execute(
                "DELETE FROM notification_channels WHERE id = %s",
                (str(channel_id),)
            )
            return result.rowcount > 0


class NotificationLogRepository:
    """Repository for notification_logs table"""

    async def create(self, log: NotificationLogCreate) -> dict:
        """Create a notification log entry"""
        async with db.get_connection() as conn:
            result = await conn.execute(
                """INSERT INTO notification_logs (channel_id, alert_incident_id, status, payload, response, error_message)
                   VALUES (%s, %s, %s, %s, %s, %s)
                   RETURNING id, channel_id, alert_incident_id, status, payload, response, error_message, sent_at""",
                (str(log.channel_id), str(log.alert_incident_id) if log.alert_incident_id else None,
                 log.status, json.dumps(log.payload) if log.payload else None, json.dumps(log.response) if log.response else None, log.error_message)
            )
            row = await result.fetchone()
            return dict(row) if row else None

    async def list_by_channel(self, channel_id: UUID, limit: int = 20) -> List[dict]:
        """List notification logs for a channel"""
        async with db.get_connection() as conn:
            result = await conn.execute(
                "SELECT * FROM notification_logs WHERE channel_id = %s ORDER BY sent_at DESC LIMIT %s",
                (str(channel_id), limit)
            )
            rows = await result.fetchall()
            return [dict(row) for row in rows]

    async def list_by_incident(self, incident_id: UUID, limit: int = 20) -> List[dict]:
        """List notification logs for an incident"""
        async with db.get_connection() as conn:
            result = await conn.execute(
                "SELECT * FROM notification_logs WHERE alert_incident_id = %s ORDER BY sent_at DESC LIMIT %s",
                (str(incident_id), limit)
            )
            rows = await result.fetchall()
            return [dict(row) for row in rows]
