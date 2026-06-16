from ...utils import json_response
from robyn import Request
from robyn.responses import Response
import json
from uuid import UUID
from .service import NotificationService
from .repository import NotificationChannelRepository, NotificationLogRepository
from .models import (
    NotificationChannelCreate, NotificationChannelUpdate,
    TestNotificationRequest
)
from ..auth.middleware import require_auth

notification_service = NotificationService()
channel_repo = NotificationChannelRepository()
log_repo = NotificationLogRepository()


# Create notification channel
@require_auth
async def create_notification_channel(request: Request):
    try:
        data = json.loads(request.body)
        channel_data = NotificationChannelCreate(**data)
        
        channel = await channel_repo.create(channel_data)
        
        return json_response({"success": True, "channel": channel}, 201)
    except ValueError as e:
        return json_response({"error": str(e)}, 400)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# List notification channels
@require_auth
async def list_notification_channels(request: Request):
    try:
        limit = int(request.query_params.get("limit", "50"))
        offset = int(request.query_params.get("offset", "0"))
        
        channels = await channel_repo.list(limit, offset)
        
        return json_response({"success": True, "channels": channels, "total": len(channels)}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# Get notification channel by ID
@require_auth
async def get_notification_channel(request: Request):
    try:
        channel_id = UUID(request.path_params.get("channel_id"))
        
        channel = await channel_repo.get_by_id(channel_id)
        if not channel:
            return json_response({"error": "Channel not found"}, 404)
        
        return json_response({"success": True, "channel": channel}, 200)
    except ValueError:
        return json_response({"error": "Invalid channel ID"}, 400)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# Update notification channel
@require_auth
async def update_notification_channel(request: Request):
    try:
        channel_id = UUID(request.path_params.get("channel_id"))
        data = json.loads(request.body)
        channel_data = NotificationChannelUpdate(**data)
        
        channel = await channel_repo.update(channel_id, channel_data)
        if not channel:
            return json_response({"error": "Channel not found"}, 404)
        
        return json_response({"success": True, "channel": channel}, 200)
    except ValueError as e:
        return json_response({"error": str(e)}, 400)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# Delete notification channel
@require_auth
async def delete_notification_channel(request: Request):
    try:
        channel_id = UUID(request.path_params.get("channel_id"))
        
        deleted = await channel_repo.delete(channel_id)
        if not deleted:
            return json_response({"error": "Channel not found"}, 404)
        
        return json_response({"success": True, "message": "Channel deleted"}, 200)
    except ValueError:
        return json_response({"error": "Invalid channel ID"}, 400)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# Test notification channel
@require_auth
async def test_notification_channel(request: Request):
    try:
        data = json.loads(request.body)
        test_data = TestNotificationRequest(**data)
        
        result = await notification_service.test_channel(
            test_data.channel_id,
            test_data.test_message
        )
        
        return json_response(result, 200 if result.get("success") else 400)
    except ValueError as e:
        return json_response({"error": str(e)}, 400)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# Get notification logs for a channel
@require_auth
async def get_channel_logs(request: Request):
    try:
        channel_id = UUID(request.path_params.get("channel_id"))
        limit = int(request.query_params.get("limit", "20"))
        
        logs = await log_repo.list_by_channel(channel_id, limit)
        
        return json_response({"success": True, "logs": logs, "total": len(logs)}, 200)
    except ValueError:
        return json_response({"error": "Invalid channel ID"}, 400)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# Get notification logs for an incident
@require_auth
async def get_incident_logs(request: Request):
    try:
        incident_id = UUID(request.path_params.get("incident_id"))
        limit = int(request.query_params.get("limit", "20"))
        
        logs = await log_repo.list_by_incident(incident_id, limit)
        
        return json_response({"success": True, "logs": logs, "total": len(logs)}, 200)
    except ValueError:
        return json_response({"error": "Invalid incident ID"}, 400)
    except Exception as e:
        return json_response({"error": str(e)}, 500)
