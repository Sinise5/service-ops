from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import List, Optional


class AssetTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None


class AssetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    asset_type_id: UUID
    owner_id: Optional[UUID] = None
    tags: List[str] = []


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    owner_id: Optional[UUID] = None


class AssetResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    asset_type_id: UUID
    status: str
    owner_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
