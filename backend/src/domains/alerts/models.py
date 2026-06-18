from pydantic import BaseModel, model_validator
from uuid import UUID
from datetime import datetime
from typing import Optional


class AlertRuleCreate(BaseModel):
    check_id: Optional[UUID] = None
    name: str
    condition: Optional[str] = None  # Optional for advanced rules
    threshold: Optional[float] = None
    conditions: Optional[list] = None  # Optional - use for advanced multi-condition rules
    logic: Optional[str] = "AND"  # AND or OR
    severity: str = "warning"
    enabled: bool = True
    
    @model_validator(mode='before')
    @classmethod
    def empty_to_none(cls, data):
        if isinstance(data, dict):
            return {k: None if v == '' else v for k, v in data.items()}
        return data


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    conditions: Optional[list] = None
    logic: Optional[str] = None
    severity: Optional[str] = None
    enabled: Optional[bool] = None


class AlertRuleResponse(BaseModel):
    id: UUID
    check_id: UUID
    name: str
    condition: Optional[str]
    threshold: Optional[float]
    conditions: Optional[list]
    logic: str
    severity: str
    enabled: bool
    created_at: datetime


class AlertIncidentCreate(BaseModel):
    rule_id: Optional[UUID] = None
    check_id: Optional[UUID] = None  # Optional for manual incidents
    severity: str = "warning"
    message: str = ""


class AlertIncidentResponse(BaseModel):
    id: UUID
    rule_id: UUID
    check_id: UUID
    status: str
    severity: str
    message: str
    triggered_at: datetime
    resolved_at: Optional[datetime]
    acknowledged_at: Optional[datetime]
    acknowledged_by: Optional[UUID]


class NotificationChannelCreate(BaseModel):
    name: str
    type: str  # 'telegram', 'discord', 'email', 'webhook'
    config: dict  # channel-specific config (chat_id, webhook_url, etc.)
    enabled: bool = True


class NotificationChannelResponse(BaseModel):
    id: UUID
    name: str
    type: str
    enabled: bool
    created_at: datetime
