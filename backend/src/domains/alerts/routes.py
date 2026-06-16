from ...utils import json_response
from ...utils import get_header
from robyn import Request
from ...utils import get_header
from robyn.responses import Response
from .models import AlertRuleCreate, AlertRuleUpdate
from .repository import AlertRuleRepository, AlertIncidentRepository
from ..notifications.service import NotificationService
from ..notifications.repository import NotificationChannelRepository
import json
import asyncio


rule_repo = AlertRuleRepository()
incident_repo = AlertIncidentRepository()
notification_service = NotificationService()
channel_repo = NotificationChannelRepository()


async def _trigger_incident_notifications(incident_id: str, rule_data: dict, check_data: dict):
    """
    Trigger notifications for a new incident
    
    Args:
        incident_id: UUID of the incident
        rule_data: Alert rule data dict
        check_data: Monitoring check data dict
    """
    try:
        alert_data = {
            "incident_id": incident_id,
            "severity": rule_data.get("severity", "unknown"),
            "message": f"{rule_data.get('name', 'Alert')} triggered",
            "rule_name": rule_data.get("name"),
            "check_name": check_data.get("name") if check_data else "Unknown",
            "asset_name": check_data.get("asset_name") if check_data else None,
            "threshold": rule_data.get("threshold"),
            "condition": rule_data.get("condition")
        }
        
        # Send to all enabled channels (non-blocking, fire-and-forget)
        asyncio.create_task(
            notification_service.send_to_all_channels(
                message=f"Alert triggered: {alert_data['message']}",
                alert_incident_id=incident_id,
                alert_data=alert_data
            )
        )
    except Exception as e:
        # Log error but don't block incident creation
        print(f"Failed to trigger notifications for incident {incident_id}: {e}")


async def create_alert_rule(request: Request):
    try:
        body = json.loads(request.body)
        rule_data = AlertRuleCreate(**body)
        rule_id = await rule_repo.create(rule_data)
        return json_response({"id": str(rule_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def list_alert_rules(request: Request):
    try:
        rules = await rule_repo.list()
        return json_response(rules, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_alert_rule(request: Request):
    try:
        rule_id = request.path_params.get("rule_id")
        rule = await rule_repo.get_by_id(rule_id)
        if not rule:
            return json_response({"error": "Rule not found"}, 404)
        return json_response(rule, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def update_alert_rule(request: Request):
    try:
        rule_id = request.path_params.get("rule_id")
        body = json.loads(request.body)
        rule_data = AlertRuleUpdate(**body)
        await rule_repo.update(rule_id, rule_data)
        return json_response({"message": "Updated"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def toggle_alert_rule(request: Request):
    try:
        rule_id = request.path_params.get("rule_id")
        body = json.loads(request.body)
        await rule_repo.toggle(rule_id, body.get("enabled", True))
        return json_response({"message": "Toggled"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def list_incidents(request: Request):
    try:
        status = request.query_params.get("status", None)
        incidents = await incident_repo.list(status=status)
        return json_response(incidents, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def acknowledge_incident(request: Request):
    try:
        incident_id = request.path_params.get("incident_id")
        user_id = get_header(request, "X-User-ID", "unknown")
        await incident_repo.acknowledge(incident_id, user_id)
        return json_response({"message": "Acknowledged"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def resolve_incident(request: Request):
    try:
        incident_id = request.path_params.get("incident_id")
        await incident_repo.resolve(incident_id)
        return json_response({"message": "Resolved"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_incident_timeline(request: Request):
    try:
        incident_id = request.path_params.get("incident_id")
        timeline = await incident_repo.get_timeline(incident_id)
        return json_response(timeline, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def add_incident_comment(request: Request):
    try:
        incident_id = request.path_params.get("incident_id")
        body = json.loads(request.body)
        user_id = get_header(request, "X-User-ID", "unknown")
        comment = body.get("comment", "")
        await incident_repo.add_comment(incident_id, user_id, comment)
        return json_response({"message": "Comment added"}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)
