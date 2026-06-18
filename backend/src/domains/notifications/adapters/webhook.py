import httpx
import json
from typing import Dict, Any, Optional
from uuid import UUID


class WebhookAdapter:
    """Generic Webhook HTTP notification adapter"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize Webhook adapter
        
        Config format:
        {
            "url": "https://hooks.example.com/alerts",
            "method": "POST",
            "headers": {"X-API-Key": "abc123"},
            "content_type": "json"
        }
        """
        self.url = config.get("url")
        self.method = config.get("method", "POST").upper()
        self.headers = config.get("headers", {})
        self.content_type = config.get("content_type", "json")
        
        if not self.url:
            raise ValueError("url is required in Webhook config")
        if self.method not in ("POST", "PUT", "PATCH"):
            raise ValueError(f"Unsupported HTTP method: {self.method}")
    
    async def send(self, message: str, incident_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Send notification via webhook
        
        Args:
            message: Message text to send
            incident_id: Optional incident ID for context
        
        Returns:
            Dict with status, response, and optional error
        """
        headers = {**self.headers}
        
        if self.content_type == "json":
            headers["Content-Type"] = "application/json"
            payload = {
                "text": message,
                "source": "ServiceOps",
                "type": "alert"
            }
            if incident_id:
                payload["incident_id"] = str(incident_id)
            data = json.dumps(payload)
        else:
            headers["Content-Type"] = "text/plain"
            data = message
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.request(
                    method=self.method,
                    url=self.url,
                    headers=headers,
                    content=data
                )
                response.raise_for_status()
                
                return {
                    "status": "sent",
                    "response": {
                        "status_code": response.status_code,
                        "body": response.text[:500],
                        "headers": dict(response.headers)
                    },
                    "error_message": None
                }
        
        except httpx.TimeoutException as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"Webhook timeout: {str(e)}"
            }
        
        except httpx.HTTPStatusError as e:
            return {
                "status": "failed",
                "response": {
                    "status_code": e.response.status_code,
                    "body": e.response.text[:500]
                },
                "error_message": f"Webhook HTTP error: {e.response.status_code}"
            }
        
        except Exception as e:
            return {
                "status": "failed",
                "response": None,
                "error_message": f"Unexpected error: {str(e)}"
            }
