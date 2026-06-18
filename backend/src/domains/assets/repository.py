from .models import AssetCreate, AssetUpdate, AssetTypeCreate
from ...database import db
from uuid import UUID
from typing import List


class AssetRepository:
    async def create(self, asset: AssetCreate) -> UUID:
        """Create new asset"""
        try:
            async with db.get_connection() as conn:
                cursor = await conn.execute(
                    """INSERT INTO assets (name, description, asset_type_id, owner_id)
                       VALUES (%s, %s, %s, %s) RETURNING id""",
                    (asset.name, asset.description, str(asset.asset_type_id), str(asset.owner_id) if asset.owner_id else None)
                )
                row = await cursor.fetchone()
                if not row:
                    raise ValueError("Insert failed - no ID returned")
                asset_id = row["id"]
                
                # Add tags
                for tag_name in asset.tags:
                    await self._add_tag(asset_id, tag_name, conn)
                
                return asset_id
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            print(f"[REPO ERROR] Asset create failed: {error_msg}")
            import traceback
            traceback.print_exc()
            raise ValueError(error_msg) from e
    
    async def get_by_id(self, asset_id: UUID) -> dict | None:
        """Get asset by ID"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM assets WHERE id = %s",
                (str(asset_id),)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
    
    async def list(self, skip: int = 0, limit: int = 50, filters: dict = None) -> List[dict]:
        """List assets with pagination"""
        async with db.get_connection() as conn:
            query = """SELECT a.id, a.name, a.description, a.asset_type_id, 
                       at.name as asset_type_name, a.status, a.owner_id, 
                       a.created_at, a.updated_at
                       FROM assets a
                       LEFT JOIN asset_types at ON a.asset_type_id = at.id
                       WHERE a.status != 'decommissioned'"""
            params = []
            
            if filters:
                if 'asset_type_id' in filters:
                    query += " AND a.asset_type_id = %s"
                    params.append(str(filters['asset_type_id']))
                if 'status' in filters:
                    query += " AND a.status = %s"
                    params.append(filters['status'])
            
            query += " ORDER BY a.created_at DESC LIMIT %s OFFSET %s"
            params.extend([str(limit), str(skip)])
            
            cursor = await conn.execute(query, tuple(params))
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
    
    async def update(self, asset_id: UUID, asset: AssetUpdate):
        """Update asset"""
        updates = []
        values = []
        
        if asset.name:
            updates.append("name = %s")
            values.append(asset.name)
        if asset.description:
            updates.append("description = %s")
            values.append(asset.description)
        if asset.status:
            updates.append("status = %s")
            values.append(asset.status)
        if asset.owner_id:
            updates.append("owner_id = %s")
            values.append(str(asset.owner_id))
        
        updates.append("updated_at = NOW()")
        values.append(str(asset_id))
        
        async with db.get_connection() as conn:
            await conn.execute(
                f"UPDATE assets SET {', '.join(updates)} WHERE id = %s",
                tuple(values)
            )
    
    async def delete(self, asset_id: UUID):
        """Delete asset"""
        async with db.get_connection() as conn:
            await conn.execute("DELETE FROM assets WHERE id = %s", (str(asset_id),))
    
    async def count(self, filters: dict = None) -> int:
        """Count assets"""
        query = "SELECT COUNT(*) as count FROM assets WHERE status != 'decommissioned'"
        params = []
        
        if filters:
            if 'asset_type_id' in filters:
                query += " AND asset_type_id = %s"
                params.append(str(filters['asset_type_id']))
            if 'status' in filters:
                query += " AND status = %s"
                params.append(filters['status'])
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(query, params if params else ())
            row = await cursor.fetchone()
            return row["count"] if row else 0
    
    async def _add_tag(self, asset_id: UUID, tag_name: str, conn):
        """Add tag to asset"""
        await conn.execute(
            "INSERT INTO asset_tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            (tag_name,)
        )
        cursor = await conn.execute(
            "SELECT id FROM asset_tags WHERE name = %s",
            (tag_name,)
        )
        row = await cursor.fetchone()
        tag_id = row["id"]
        await conn.execute(
            "INSERT INTO asset_tag_mapping (asset_id, tag_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (str(asset_id), str(tag_id))
        )


class AssetTypeRepository:
    async def create(self, asset_type: AssetTypeCreate) -> UUID:
        """Create asset type"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "INSERT INTO asset_types (name, description) VALUES (%s, %s) RETURNING id",
                (asset_type.name, asset_type.description)
            )
            row = await cursor.fetchone()
            return row["id"]
    
    async def list(self) -> List[dict]:
        """List all asset types"""
        async with db.get_connection() as conn:
            cursor = await conn.execute("SELECT * FROM asset_types ORDER BY name")
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
