from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class DependencyCreate(BaseModel):
    source_asset_id: UUID
    target_asset_id: UUID
    dependency_type: str  # 'calls', 'connects', 'depends_on', 'uses'
    description: Optional[str] = None
    metadata: Optional[dict] = None


class DependencyResponse(BaseModel):
    id: UUID
    source_asset_id: UUID
    target_asset_id: UUID
    dependency_type: str
    description: Optional[str]
    metadata: Optional[dict]
    created_at: datetime


class TopologyNode(BaseModel):
    id: UUID
    name: str
    type: str
    ip_address: Optional[str]
    metadata: Optional[dict]


class TopologyEdge(BaseModel):
    source: UUID
    target: UUID
    type: str
    description: Optional[str]


class TopologyGraph(BaseModel):
    nodes: List[TopologyNode]
    edges: List[TopologyEdge]
