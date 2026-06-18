from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class SLATargetCreate(BaseModel):
    asset_id: UUID
    name: str
    target_uptime: float  # 99.9, 99.99, etc
    measurement_window: str  # 'daily', 'weekly', 'monthly'


class SLATargetUpdate(BaseModel):
    name: Optional[str] = None
    target_uptime: Optional[float] = None
    measurement_window: Optional[str] = None
    enabled: Optional[bool] = None


class SLATargetResponse(BaseModel):
    id: UUID
    asset_id: UUID
    name: str
    target_uptime: float
    measurement_window: str
    enabled: bool
    created_at: datetime
    updated_at: datetime


class SLAReportResponse(BaseModel):
    id: UUID
    target_id: UUID
    period_start: datetime
    period_end: datetime
    uptime_percentage: float
    total_checks: int
    successful_checks: int
    failed_checks: int
    total_downtime_minutes: float
    met_target: bool
    generated_at: datetime
