from .models import DependencyCreate
from ...database import db
from uuid import UUID
from typing import List


class TopologyRepository:
    async def create_dependency(self, dep: DependencyCreate) -> UUID:
        fields = ["source_asset_id", "target_asset_id", "dependency_type"]
        values = [str(dep.source_asset_id), str(dep.target_asset_id), dep.dependency_type]
        
        if dep.description:
            fields.append("description")
            values.append(dep.description)
        if dep.metadata:
            fields.append("metadata")
            values.append(dep.metadata)
        
        placeholders = [f"${i+1}" for i in range(len(fields))]
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                f"INSERT INTO asset_dependencies ({', '.join(fields)}) VALUES ({', '.join(placeholders)}) ON CONFLICT ON CONSTRAINT uq_dependency DO UPDATE SET description = EXCLUDED.description RETURNING id",
                values
            )
            row = await cursor.fetchone()
            return row["id"]

    async def get_dependencies(self, asset_id: UUID) -> List[dict]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT ad.*, 
                   src.name as source_name,
                   tgt.name as target_name
                FROM asset_dependencies ad
                JOIN assets src ON src.id = ad.source_asset_id
                JOIN assets tgt ON tgt.id = ad.target_asset_id
                WHERE ad.source_asset_id = %s OR ad.target_asset_id = %s
                ORDER BY ad.dependency_type""",
                (str(asset_id), str(asset_id))
            )
            return await cursor.fetchall() or []

    async def get_graph(self) -> dict:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT a.id, a.name, at.name as type
                FROM assets a
                LEFT JOIN asset_types at ON a.asset_type_id = at.id
                WHERE a.id IN (
                    SELECT source_asset_id FROM asset_dependencies
                    UNION
                    SELECT target_asset_id FROM asset_dependencies
                )"""
            )
            nodes = await cursor.fetchall() or []
            
            cursor = await conn.execute(
                """SELECT ad.source_asset_id as source, 
                   ad.target_asset_id as target, 
                   ad.dependency_type as type,
                   ad.description
                FROM asset_dependencies ad"""
            )
            edges = await cursor.fetchall() or []
            
            return {"nodes": [dict(n) for n in nodes], "edges": [dict(e) for e in edges]}

    async def remove_dependency(self, dep_id: UUID):
        async with db.get_connection() as conn:
            await conn.execute(
                "DELETE FROM asset_dependencies WHERE id = %s",
                (str(dep_id),)
            )

    async def get_upstream_impact(self, asset_id: UUID) -> List[dict]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """WITH RECURSIVE upstream AS (
                    SELECT source_asset_id as id, 1 as depth
                    FROM asset_dependencies WHERE target_asset_id = %s
                    UNION ALL
                    SELECT ad.source_asset_id, u.depth + 1
                    FROM asset_dependencies ad
                    JOIN upstream u ON u.id = ad.target_asset_id
                    WHERE u.depth < 10
                )
                SELECT DISTINCT a.id, a.name, at.name as type, u.depth
                FROM upstream u
                JOIN assets a ON a.id = u.id
                LEFT JOIN asset_types at ON a.asset_type_id = at.id
                ORDER BY u.depth"""
            )
            return await cursor.fetchall() or []


topo_repo = TopologyRepository()
