from .models import MonitoringCheckCreate, MonitoringCheckUpdate
from .plugin_interface import CheckResult
from ...database import db
from uuid import UUID
from typing import List
import json


class MonitoringCheckRepository:
    async def create(self, check: MonitoringCheckCreate) -> UUID:
        """Create monitoring check"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """INSERT INTO monitoring_checks 
                   (asset_id, check_type, name, config, interval_seconds, enabled)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
                (str(check.asset_id), check.check_type, check.name, 
                 json.dumps(check.config), check.interval_seconds, check.enabled)
            )
            row = await cursor.fetchone()
            return row["id"]
    
    async def get_by_id(self, check_id: UUID) -> dict | None:
        """Get check by ID"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM monitoring_checks WHERE id = %s",
                (str(check_id),)
            )
            row = await cursor.fetchone()
            if row:
                result = dict(row)
                result['id'] = str(result['id'])
                result['asset_id'] = str(result['asset_id'])
                result['created_at'] = str(result.get('created_at', ''))
                result['updated_at'] = str(result.get('updated_at', ''))
                result['config'] = json.loads(result['config']) if isinstance(result['config'], str) else result['config']
                return result
            return None
    
    async def list_by_asset(self, asset_id: UUID) -> List[dict]:
        """List checks for an asset"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM monitoring_checks WHERE asset_id = %s ORDER BY created_at DESC",
                (str(asset_id),)
            )
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                result = dict(row)
                result['id'] = str(result['id'])
                result['asset_id'] = str(result['asset_id'])
                result['created_at'] = str(result.get('created_at', ''))
                result['updated_at'] = str(result.get('updated_at', ''))
                result['config'] = json.loads(result['config']) if isinstance(result['config'], str) else result['config']
                results.append(result)
            return results
    
    async def list_all(self) -> List[dict]:
        """List all checks"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM monitoring_checks ORDER BY created_at DESC"
            )
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                result = dict(row)
                result['id'] = str(result['id'])
                result['asset_id'] = str(result['asset_id'])
                result['created_at'] = str(result.get('created_at', ''))
                result['updated_at'] = str(result.get('updated_at', ''))
                result['config'] = json.loads(result['config']) if isinstance(result['config'], str) else result['config']
                results.append(result)
            return results
    
    async def update(self, check_id: UUID, check: MonitoringCheckUpdate):
        """Update monitoring check"""
        updates = []
        values = []
        
        if check.name:
            updates.append("name = %s")
            values.append(check.name)
        if check.config:
            updates.append("config = %s")
            values.append(json.dumps(check.config))
        if check.interval_seconds:
            updates.append("interval_seconds = %s")
            values.append(check.interval_seconds)
        if check.enabled is not None:
            updates.append("enabled = %s")
            values.append(check.enabled)
        
        updates.append("updated_at = NOW()")
        values.append(str(check_id))
        
        async with db.get_connection() as conn:
            await conn.execute(
                f"UPDATE monitoring_checks SET {', '.join(updates)} WHERE id = %s",
                tuple(values)
            )
    
    async def delete(self, check_id: UUID):
        """Delete monitoring check"""
        async with db.get_connection() as conn:
            await conn.execute(
                "DELETE FROM monitoring_checks WHERE id = %s",
                (str(check_id),)
            )
    
    async def get_enabled_checks(self) -> List[dict]:
        """Get all enabled checks"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM monitoring_checks WHERE enabled = true ORDER BY created_at DESC"
            )
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                result = dict(row)
                result['config'] = json.loads(result['config']) if isinstance(result['config'], str) else result['config']
                results.append(result)
            return results


class MonitoringResultRepository:
    async def save(self, check_id: UUID, result: CheckResult):
        """Save monitoring result"""
        async with db.get_connection() as conn:
            await conn.execute(
                """INSERT INTO monitoring_results 
                   (check_id, status, response_time_ms, output, error_message)
                   VALUES (%s, %s, %s, %s, %s)""",
                (str(check_id), result.status, result.response_time_ms, 
                 result.output, result.error_message)
            )
    
    async def get_recent(self, check_id: UUID, limit: int = 50) -> List[dict]:
        """Get recent results for a check"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT * FROM monitoring_results 
                   WHERE check_id = %s 
                   ORDER BY checked_at DESC 
                   LIMIT %s""",
                (str(check_id), limit)
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
