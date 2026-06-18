from ...database import db
from uuid import UUID
from typing import Optional
from datetime import datetime


class AuditLogger:
    async def log(
        self,
        user_id: Optional[UUID],
        action: str,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        changes: Optional[dict] = None,
        status: str = "success"
    ):
        async with db.get_connection() as conn:
            await conn.execute(
                """INSERT INTO audit_log 
                   (user_id, action, resource_type, resource_id, ip_address, user_agent, changes, status)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (str(user_id) if user_id else None, action, resource_type,
                 str(resource_id) if resource_id else None, ip_address, user_agent,
                 changes, status)
            )

    async def get_logs(
        self,
        user_id: Optional[UUID] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ):
        query = "SELECT * FROM audit_log WHERE 1=1"
        params = []
        
        if user_id:
            query += " AND user_id = %s"
            params.append(str(user_id))
        if action:
            query += " AND action = %s"
            params.append(action)
        if resource_type:
            query += " AND resource_type = %s"
            params.append(resource_type)
        if start_date:
            query += " AND created_at >= %s"
            params.append(start_date)
        if end_date:
            query += " AND created_at <= %s"
            params.append(end_date)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(query, params)
            return await cursor.fetchall() or []

    async def get_user_activity(self, user_id: UUID, days: int = 30):
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT action, resource_type, COUNT(*) as count
                   FROM audit_log
                   WHERE user_id = %s AND created_at >= NOW() - INTERVAL '%s days'
                   GROUP BY action, resource_type
                   ORDER BY count DESC""",
                (str(user_id), str(days))
            )
            return await cursor.fetchall() or []


audit_logger = AuditLogger()
