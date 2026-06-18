import httpx
from typing import Dict, Any, Optional
from uuid import UUID


class TelegramAdapter:
    """Telegram Bot API notification adapter"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Telegram adapter
        
        Config format:
        {
            "bot_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
            "chat_id": "-1001234567890"
        }
        """
        self.bot_token = config.get("bot_token")
        self.chat_id = config.get("chat_id")
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"
        
        if not self.bot_token:
            raise ValueError("bot_token is required in Telegram config")
        if not self.chat_id:
            raise ValueError("chat_id is required in Telegram config")
    
    async def send(self, message: str, incident_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Send notification via Telegram
        
        Args:
            message: Message text to send
            incident_id: Optional incident ID for context
        
        Returns:
            Dict with status, response, and optional error
        """
        payload = {
            "chat_id": self.chat_id,
            "text": message,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.api_url}/sendMessage",
                    json=payload
                )
                response.raise_for_status()
                
                return {
                    "status": "sent",
                    "response": response.json(),
                    "error_message": None
                }
        
        except httpx.TimeoutException as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"Telegram API timeout: {str(e)}"
            }
        
        except httpx.HTTPStatusError as e:
            return {
                "status": "failed",
                "response": {"status_code": e.response.status_code, "body": e.response.text},
                "error_message": f"Telegram API error: {e.response.status_code} - {e.response.text}"
            }
        
        except Exception as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"Unexpected error: {str(e)}"
            }
    
    def format_alert_message(self, alert_data: Dict[str, Any]) -> str:
        """
        Format alert data into Telegram message
        
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
        
        message_parts = [
            f"{emoji} *{severity} ALERT*",
            "",
            f"*Message:* {alert_data.get('message', 'No message')}",
        ]
        
        if alert_data.get("asset_name"):
            message_parts.append(f"*Asset:* {alert_data['asset_name']}")
        
        if alert_data.get("rule_name"):
            message_parts.append(f"*Rule:* {alert_data['rule_name']}")
        
        if alert_data.get("check_name"):
            message_parts.append(f"*Check:* {alert_data['check_name']}")
        
        if alert_data.get("incident_id"):
            message_parts.append(f"*Incident ID:* `{alert_data['incident_id']}`")
        
        return "\n".join(message_parts)
