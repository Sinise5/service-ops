from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any

# Notification Channel Models
class NotificationChannelCreate(BaseModel):
    """Create notification channel request"""
    name: str = Field(..., min_length=1, max_length=255)
    type: str = Field(..., description="email, telegram, discord, slack, webhook")
    config: Dict[str, Any] = Field(..., description="Channel-specific config (tokens, URLs, etc.)")

class NotificationChannelUpdate(BaseModel):
    """Update notification channel request"""
    name: Optional[str] = Field(None, max_length=255)
    config: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None

class NotificationChannelResponse(BaseModel):
    """Notification channel response"""
    id: UUID
    name: str
    type: str
    config: Dict[str, Any]
    enabled: bool
    created_at: datetime
    updated_at: datetime

class NotificationChannelListResponse(BaseModel):
    """List notification channels response"""
    channels: list[NotificationChannelResponse]
    total: int
    limit: int
    offset: int

# Notification Log Models
class NotificationLogCreate(BaseModel):
    """Create notification log entry"""
    channel_id: UUID
    alert_incident_id: Optional[UUID] = None
    status: str = Field(..., description="sent, failed, retrying")
    payload: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class NotificationLogResponse(BaseModel):
    """Notification log response"""
    id: UUID
    channel_id: UUID
    alert_incident_id: Optional[UUID]
    status: str
    payload: Optional[Dict[str, Any]]
    response: Optional[Dict[str, Any]]
    error_message: Optional[str]
    sent_at: datetime

class NotificationLogListResponse(BaseModel):
    """List notification logs response"""
    logs: list[NotificationLogResponse]
    total: int
    limit: int
    offset: int

# Test notification request
class TestNotificationRequest(BaseModel):
    """Test sending notification to a channel"""
    channel_id: UUID
    test_message: str = Field(default="Test notification from ServiceOps")

class TestNotificationResponse(BaseModel):
    """Test notification response"""
    success: bool
    message: str
    log_id: Optional[UUID] = None
