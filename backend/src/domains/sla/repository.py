from .models import SLATargetCreate, SLATargetUpdate
from ...database import db
from uuid import UUID
from typing import List
from datetime import datetime, timedelta


class SLARepository:
    async def create_target(self, target: SLATargetCreate) -> UUID:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """INSERT INTO sla_targets (asset_id, name, target_uptime, measurement_window)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                (str(target.asset_id), target.name, target.target_uptime, target.measurement_window)
            )
            row = await cursor.fetchone()
            return row["id"]

    async def list_targets(self, asset_id: UUID = None) -> List[dict]:
        query = "SELECT * FROM sla_targets WHERE 1=1"
        params = []
        if asset_id:
            query += " AND asset_id = %s"
            params.append(str(asset_id))
        query += " ORDER BY created_at DESC"
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(query, params)
            return await cursor.fetchall() or []

    async def get_target(self, target_id: UUID) -> dict:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM sla_targets WHERE id = %s",
                (str(target_id),)
            )
            return await cursor.fetchone()

    async def update_target(self, target_id: UUID, update: SLATargetUpdate):
        fields = []
        params = []
        if update.name is not None:
            fields.append("name = %s")
            params.append(update.name)
        if update.target_uptime is not None:
            fields.append("target_uptime = %s")
            params.append(update.target_uptime)
        if update.measurement_window is not None:
            fields.append("measurement_window = %s")
            params.append(update.measurement_window)
        if update.enabled is not None:
            fields.append("enabled = %s")
            params.append(update.enabled)
        
        if not fields:
            return
        
        fields.append("updated_at = NOW()")
        params.append(str(target_id))
        
        async with db.get_connection() as conn:
            await conn.execute(
                f"UPDATE sla_targets SET {', '.join(fields)} WHERE id = %s",
                params
            )

    async def generate_report(self, target_id: UUID, start: datetime, end: datetime):
        target = await self.get_target(target_id)
        if not target:
            raise ValueError(f"SLA target {target_id} not found")
        
        asset_id = target["asset_id"]
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT COUNT(*) as total,
                   SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful
                   FROM monitoring_results mr
                   JOIN monitoring_checks mc ON mc.id = mr.check_id
                   WHERE mc.asset_id = %s AND mr.checked_at BETWEEN %s AND %s""",
                (str(asset_id), start, end)
            )
            row = await cursor.fetchone()
            total = row["total"] or 0
            successful = row["successful"] or 0
            failed = total - successful
            
            uptime_pct = (successful / total * 100) if total > 0 else 100.0
            met_target = uptime_pct >= target["target_uptime"]
            downtime_minutes = failed * 5.0  # Assuming 5-min check intervals
            
            cursor = await conn.execute(
                """INSERT INTO sla_reports 
                   (target_id, period_start, period_end, uptime_percentage, 
                    total_checks, successful_checks, failed_checks, 
                    total_downtime_minutes, met_target)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                (str(target_id), start, end, uptime_pct,
                 total, successful, failed, downtime_minutes, met_target)
            )
            row = await cursor.fetchone()
            return row["id"]

    async def get_reports(self, target_id: UUID = None, limit: int = 50) -> List[dict]:
        query = "SELECT * FROM sla_reports WHERE 1=1"
        params = []
        if target_id:
            query += " AND target_id = %s"
            params.append(str(target_id))
        query += " ORDER BY period_start DESC LIMIT %s"
        params.append(limit)
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(query, params)
            return await cursor.fetchall() or []
    
    async def get_uptime_summary(self, target_id: UUID) -> dict:
        """Get uptime summary for SLA target"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT AVG(uptime_percentage) as avg_uptime,
                          MAX(uptime_percentage) as max_uptime,
                          MIN(uptime_percentage) as min_uptime,
                          COUNT(*) as total_reports
                   FROM sla_reports WHERE target_id = %s""",
                (str(target_id),)
            )
            row = await cursor.fetchone()
            return row if row else {"avg_uptime": None, "max_uptime": None, "min_uptime": None, "total_reports": 0}
    
    async def list_asset_uptime(self, asset_id: UUID = None, limit: int = 50) -> List[dict]:
        """List uptime data for assets"""
        query = """SELECT DISTINCT st.id, st.asset_id, st.name, st.target_uptime,
                          sr.uptime_percentage, sr.period_end
                   FROM sla_targets st
                   LEFT JOIN sla_reports sr ON st.id = sr.target_id
                   WHERE 1=1"""
        params = []
        if asset_id:
            query += " AND st.asset_id = %s"
            params.append(str(asset_id))
        query += " ORDER BY sr.period_end DESC LIMIT %s"
        params.append(limit)
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(query, params)
            return await cursor.fetchall() or []


sla_repo = SLARepository()
