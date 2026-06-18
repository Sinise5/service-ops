from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class CheckResult:
    status: str  # 'success', 'warning', 'failure'
    response_time_ms: Optional[float] = None
    output: Optional[str] = None
    error_message: Optional[str] = None


class MonitorPlugin(ABC):
    @abstractmethod
    async def execute(self, config: dict) -> CheckResult:
        """Execute the check with given config"""
        pass
    
    @abstractmethod
    def validate_config(self, config: dict) -> bool:
        """Validate check configuration"""
        pass
