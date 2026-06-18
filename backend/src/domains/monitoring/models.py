from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any


class MonitoringCheckCreate(BaseModel):
    asset_id: UUID
    check_type: str  # ping, http, tcp, ssl, dns
    name: str
    config: Dict[str, Any]
    interval_seconds: int = 300
    enabled: bool = True


class MonitoringCheckUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    interval_seconds: Optional[int] = None
    enabled: Optional[bool] = None


class MonitoringCheckResponse(BaseModel):
    id: UUID
    asset_id: UUID
    check_type: str
    name: str
    config: Dict[str, Any]
    interval_seconds: int
    enabled: bool
    created_at: datetime
    updated_at: datetime


class MonitoringResultResponse(BaseModel):
    id: UUID
    check_id: UUID
    status: str
    response_time_ms: Optional[float]
    output: Optional[str]
    error_message: Optional[str]
    checked_at: datetime
