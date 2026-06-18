from .models import AlertRuleCreate, AlertRuleUpdate, AlertIncidentCreate, NotificationChannelCreate
from ...database import db
from uuid import UUID
from typing import List
import json


class AlertRuleRepository:
    async def create(self, rule: AlertRuleCreate) -> UUID:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """INSERT INTO alert_rules (check_id, name, condition, threshold, conditions, logic, severity, enabled)
                   VALUES (%s, %s, %s, %s, %s::json, %s, %s, %s) RETURNING id""",
                (str(rule.check_id) if rule.check_id else None, rule.name, rule.condition,
                 rule.threshold, json.dumps(rule.conditions) if rule.conditions else None,
                 rule.logic or "AND", rule.severity, rule.enabled)
            )
            row = await cursor.fetchone()
            return row["id"]

    async def get_by_id(self, rule_id: UUID) -> dict | None:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM alert_rules WHERE id = %s", (str(rule_id),)
            )
            return await cursor.fetchone()

    async def list(self) -> List[dict]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM alert_rules ORDER BY created_at DESC"
            )
            return await cursor.fetchall() or []

    async def update(self, rule_id: UUID, rule: AlertRuleUpdate):
        updates = []
        values = []
        for field in ["name", "condition", "threshold", "conditions", "logic", "severity", "enabled"]:
            val = getattr(rule, field, None)
            if val is not None:
                if field == "conditions":
                    updates.append(f"{field} = %s::json")
                    values.append(json.dumps(val) if val else None)
                else:
                    updates.append(f"{field} = %s")
                    values.append(val)
        updates.append("updated_at = NOW()")
        values.append(str(rule_id))
        async with db.get_connection() as conn:
            await conn.execute(
                f"UPDATE alert_rules SET {', '.join(updates)} WHERE id = %s",
                tuple(values)
            )

    async def toggle(self, rule_id: UUID, enabled: bool):
        async with db.get_connection() as conn:
            await conn.execute(
                "UPDATE alert_rules SET enabled = %s, updated_at = NOW() WHERE id = %s",
                (enabled, str(rule_id))
            )

    async def delete(self, rule_id: UUID):
        async with db.get_connection() as conn:
            await conn.execute(
                "DELETE FROM alert_rules WHERE id = %s",
                (str(rule_id),)
            )

    async def get_by_check(self, check_id: UUID) -> List[dict]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM alert_rules WHERE check_id = %s AND enabled = true ORDER BY created_at DESC",
                (str(check_id),)
            )
            return await cursor.fetchall() or []


class AlertIncidentRepository:
    async def create(self, incident: AlertIncidentCreate) -> UUID:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """INSERT INTO alert_incidents (rule_id, check_id, severity, message)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                (str(incident.rule_id) if incident.rule_id else None, 
                 str(incident.check_id) if incident.check_id else None,
                 incident.severity, incident.message)
            )
            row = await cursor.fetchone()
            incident_id = row["id"]
            
            # Add timeline entry
            await conn.execute(
                """INSERT INTO incident_timeline (incident_id, event_type, message)
                   VALUES (%s, 'created', %s)""",
                (str(incident_id), f"Incident created: {incident.message}")
            )
            
            return incident_id

    async def list(self, status: str = None, limit: int = 50) -> List[dict]:
        async with db.get_connection() as conn:
            if status:
                cursor = await conn.execute(
                    "SELECT * FROM alert_incidents WHERE status = %s ORDER BY triggered_at DESC LIMIT %s",
                    (status, limit)
                )
            else:
                cursor = await conn.execute(
                    "SELECT * FROM alert_incidents ORDER BY triggered_at DESC LIMIT %s",
                    (limit,)
                )
            return await cursor.fetchall() or []

    async def acknowledge(self, incident_id: UUID, user_id: UUID):
        async with db.get_connection() as conn:
            await conn.execute(
                "UPDATE alert_incidents SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = %s WHERE id = %s",
                (str(user_id), str(incident_id))
            )
            await conn.execute(
                """INSERT INTO incident_timeline (incident_id, user_id, event_type, message)
                   VALUES (%s, %s, 'acknowledged', 'Incident acknowledged')""",
                (str(incident_id), str(user_id))
            )

    async def resolve(self, incident_id: UUID):
        async with db.get_connection() as conn:
            await conn.execute(
                "UPDATE alert_incidents SET status = 'resolved', resolved_at = NOW() WHERE id = %s",
                (str(incident_id),)
            )
            await conn.execute(
                """INSERT INTO incident_timeline (incident_id, event_type, message)
                   VALUES (%s, 'resolved', 'Incident resolved')""",
                (str(incident_id),)
            )

    async def count_open(self) -> int:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT COUNT(*) as count FROM alert_incidents WHERE status = 'open'"
            )
            row = await cursor.fetchone()
            return row["count"]
    
    async def add_comment(self, incident_id: UUID, user_id: UUID, comment: str):
        async with db.get_connection() as conn:
            await conn.execute(
                """INSERT INTO incident_timeline (incident_id, user_id, event_type, message)
                   VALUES (%s, %s, 'commented', %s)""",
                (str(incident_id), str(user_id), comment)
            )
    
    async def get_timeline(self, incident_id: UUID) -> List[dict]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT it.*, u.email as user_email 
                   FROM incident_timeline it
                   LEFT JOIN users u ON u.id = it.user_id
                   WHERE it.incident_id = %s 
                   ORDER BY it.created_at ASC""",
                (str(incident_id),)
            )
            return await cursor.fetchall() or []


class NotificationChannelRepository:
    async def create(self, channel: NotificationChannelCreate) -> UUID:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "INSERT INTO notification_channels (name, type, config) VALUES (%s, %s, %s) RETURNING id",
                (channel.name, channel.type, str(channel.config))
            )
            row = await cursor.fetchone()
            return row["id"]

    async def list(self) -> List[dict]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM notification_channels ORDER BY created_at DESC"
            )
            return await cursor.fetchall() or []
