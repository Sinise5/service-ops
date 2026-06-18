from uuid import UUID
from typing import Dict, Any, Optional
import asyncio
from .repository import NotificationChannelRepository, NotificationLogRepository
from .models import NotificationLogCreate
from .adapter_factory import NotificationAdapterFactory


class NotificationService:
    """Service for sending notifications via various channels"""
    
    def __init__(self):
        self.channel_repo = NotificationChannelRepository()
        self.log_repo = NotificationLogRepository()
    
    async def send_to_channel(
        self,
        channel_id: UUID,
        message: str,
        alert_incident_id: Optional[UUID] = None,
        alert_data: Optional[Dict[str, Any]] = None,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Send notification to a specific channel with retry logic
        
        Args:
            channel_id: Notification channel ID
            message: Message text to send
            alert_incident_id: Optional alert incident ID
            alert_data: Optional structured alert data for formatting
            max_retries: Maximum retry attempts (default: 3)
        
        Returns:
            Dict with success status, log_id, and details
        """
        # Get channel config
        channel = await self.channel_repo.get_by_id(channel_id)
        if not channel:
            return {
                "success": False,
                "error": "Channel not found",
                "log_id": None
            }
        
        if not channel.get("enabled"):
            return {
                "success": False,
                "error": "Channel is disabled",
                "log_id": None
            }
        
        # Create adapter
        try:
            adapter = NotificationAdapterFactory.create(
                channel["type"],
                channel["config"]
            )
        except ValueError as e:
            return {
                "success": False,
                "error": str(e),
                "log_id": None
            }
        
        # Format message if alert_data provided
        formatted_message = message
        if alert_data and hasattr(adapter, 'format_alert_message'):
            if channel["type"] == "email":
                subject, formatted_message = adapter.format_alert_message(alert_data)
            else:
                formatted_message = adapter.format_alert_message(alert_data)
        
        # Send with retry logic
        last_error = None
        for attempt in range(max_retries):
            try:
                # Send notification
                if channel["type"] == "email" and alert_data:
                    result = await adapter.send(formatted_message, alert_incident_id, subject=subject)
                else:
                    result = await adapter.send(formatted_message, alert_incident_id)
                
                # Log result
                log_entry = NotificationLogCreate(
                    channel_id=channel_id,
                    alert_incident_id=alert_incident_id,
                    status=result["status"],
                    payload={"message": message, "attempt": attempt + 1},
                    response=result.get("response"),
                    error_message=result.get("error_message")
                )
                log = await self.log_repo.create(log_entry)
                
                # Return on success
                if result["status"] == "sent":
                    return {
                        "success": True,
                        "log_id": log["id"],
                        "attempt": attempt + 1
                    }
                
                last_error = result.get("error_message", "Unknown error")
                
                # Exponential backoff before retry
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
            
            except Exception as e:
                last_error = str(e)
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
        
        # All retries failed
        return {
            "success": False,
            "error": f"Failed after {max_retries} attempts: {last_error}",
            "log_id": None
        }
    
    async def send_to_all_channels(
        self,
        message: str,
        channel_type: Optional[str] = None,
        alert_incident_id: Optional[UUID] = None,
        alert_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send notification to all enabled channels (optionally filtered by type)
        
        Args:
            message: Message text to send
            channel_type: Optional filter by channel type
            alert_incident_id: Optional alert incident ID
            alert_data: Optional structured alert data
        
        Returns:
            Dict with summary of results
        """
        channels = await self.channel_repo.list_enabled(channel_type)
        
        if not channels:
            return {
                "success": False,
                "sent": 0,
                "failed": 0,
                "results": [],
                "error": "No enabled channels found"
            }
        
        # Send to all channels in parallel
        tasks = [
            self.send_to_channel(
                channel["id"],
                message,
                alert_incident_id,
                alert_data
            )
            for channel in channels
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Summarize results
        sent = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
        failed = len(results) - sent
        
        return {
            "success": sent > 0,
            "sent": sent,
            "failed": failed,
            "total": len(channels),
            "results": [
                {
                    "channel_id": str(channels[i]["id"]),
                    "channel_name": channels[i]["name"],
                    "success": r.get("success") if isinstance(r, dict) else False,
                    "error": r.get("error") if isinstance(r, dict) else str(r)
                }
                for i, r in enumerate(results)
            ]
        }
    
    async def test_channel(self, channel_id: UUID, test_message: str = "Test notification from ServiceOps") -> Dict[str, Any]:
        """
        Test sending notification to a channel
        
        Args:
            channel_id: Channel ID to test
            test_message: Test message text
        
        Returns:
            Dict with test result
        """
        return await self.send_to_channel(channel_id, test_message, max_retries=1)
