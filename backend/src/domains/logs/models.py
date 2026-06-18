from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List

@dataclass
class LogCreate:
    """Log creation model"""
    source: str
    level: str
    message: str
    context: Optional[dict] = None
    timestamp: Optional[datetime] = None

@dataclass
class LogFilter:
    """Log filter model"""
    source: Optional[str] = None
    level: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100
    offset: int = 0
