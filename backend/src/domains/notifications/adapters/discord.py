import httpx
from typing import Dict, Any, Optional
from uuid import UUID


class DiscordAdapter:
    """Discord Webhook notification adapter"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Discord adapter
        
        Config format:
        {
            "webhook_url": "https://discord.com/api/webhooks/123456/abcdef..."
        }
        """
        self.webhook_url = config.get("webhook_url")
        
        if not self.webhook_url:
            raise ValueError("webhook_url is required in Discord config")
    
    async def send(self, message: str, incident_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Send notification via Discord webhook
        
        Args:
            message: Message text to send
            incident_id: Optional incident ID for context
        
        Returns:
            Dict with status, response, and optional error
        """
        payload = {
            "content": message,
            "username": "ServiceOps",
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.webhook_url,
                    json=payload
                )
                response.raise_for_status()
                
                return {
                    "status": "sent",
                    "response": {"status_code": response.status_code},
                    "error_message": None
                }
        
        except httpx.TimeoutException as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"Discord webhook timeout: {str(e)}"
            }
        
        except httpx.HTTPStatusError as e:
            return {
                "status": "failed",
                "response": {"status_code": e.response.status_code, "body": e.response.text},
                "error_message": f"Discord webhook error: {e.response.status_code} - {e.response.text}"
            }
        
        except Exception as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"Unexpected error: {str(e)}"
            }
    
    def format_alert_message(self, alert_data: Dict[str, Any]) -> str:
        """
        Format alert data into Discord message
        
        Args:
            alert_data: Dict containing alert information
        
        Returns:
            Formatted message string
        """
        severity = alert_data.get("severity", "unknown").upper()
        emoji = {
            "CRITICAL": "🔴",
            "WARNING": "⚠️",
            "INFO": "ℹ️"
        }.get(severity, "🔔")
        
        lines = [
            f"{emoji} **{severity} ALERT**",
            f"**Message:** {alert_data.get('message', 'No message')}",
        ]
        
        if alert_data.get("asset_name"):
            lines.append(f"**Asset:** {alert_data['asset_name']}")
        
        if alert_data.get("rule_name"):
            lines.append(f"**Rule:** {alert_data['rule_name']}")
        
        if alert_data.get("check_name"):
            lines.append(f"**Check:** {alert_data['check_name']}")
        
        if alert_data.get("incident_id"):
            lines.append(f"**Incident ID:** `{alert_data['incident_id']}`")
        
        return "\n".join(lines)
