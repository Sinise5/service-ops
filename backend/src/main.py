from robyn import Robyn, Request
from robyn.responses import Response
import json

from .database import db
from .redis_client import redis_client
from .config import settings
from .shared import get_header, json_response

app = Robyn(__file__)

# CORS helper
def cors_response(data, status_code=200):
    """Return Response with CORS headers"""
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json"
    }
    import json as _json
    return Response(
        status_code=status_code,
        headers=headers,
        description=_json.dumps(data)
    )

# CORS OPTIONS handler
@app.options("/*")
async def options_handler(request: Request):
    return Response(
        status_code=204,
        headers={
            b"Access-Control-Allow-Origin": b"*",
            b"Access-Control-Allow-Methods": b"GET, POST, PUT, DELETE, OPTIONS",
            b"Access-Control-Allow-Headers": b"Content-Type, Authorization"
        },
        description=""
    )

@app.get("/health")
async def health(request: Request):
    return {"status": "ok", "version": "0.1.0"}

@app.get("/")
async def root(request: Request):
    return {"message": "ServiceOps API v0.1.0"}

@app.get("/me")
async def current_user(request: Request):
    """Alias for /auth/me"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return cors_response({"error": "Unauthorized"}, status_code=401)
    try:
        from uuid import UUID
        token = auth_header[7:]
        user_id = auth_service.verify_token(token)
        user = await auth_service.user_repo.get_by_id(UUID(str(user_id)))
        if user:
            for k, v in user.items():
                if hasattr(v, 'isoformat'):
                    user[k] = v.isoformat()
        return cors_response(user)
    except Exception as e:
        return cors_response({"error": str(e)}, status_code=401)

# Import domain services
from .domains.auth.service import auth_service
from .domains.auth.models import UserCreate, LoginRequest
from .domains.assets.repository import AssetRepository, AssetTypeRepository
from .domains.assets.models import AssetCreate, AssetUpdate, AssetTypeCreate
from .domains.monitoring.repository import MonitoringCheckRepository, MonitoringResultRepository
from .domains.alerts.routes import (
    create_alert_rule, list_alert_rules, get_alert_rule, update_alert_rule, toggle_alert_rule,
    list_incidents, acknowledge_incident, resolve_incident,
    get_incident_timeline, add_incident_comment
)
from .domains.notifications.routes import (
    create_notification_channel, list_notification_channels, get_notification_channel,
    update_notification_channel, delete_notification_channel, test_notification_channel,
    get_channel_logs, get_incident_logs
)
from .domains.logs.routes import (
    ingest_log, bulk_ingest_logs, search_logs,
    get_asset_logs, get_log_stats
)
from .domains.sla.routes import (
    create_target, list_targets, get_target, update_target,
    generate_report, get_reports, get_uptime_summary, list_asset_uptime
)
from .domains.topology.routes import (
    create_dependency, get_dependencies, get_topology_graph,
    remove_dependency, get_impact_analysis
)
from .domains.audit.routes import (
    get_audit_logs, get_user_activity,
    health_check, metrics, run_backup
)
from .domains.monitoring.models import MonitoringCheckCreate, MonitoringCheckUpdate
from .domains.monitoring.scheduler import scheduler

# Initialize repos
asset_repo = AssetRepository()
asset_type_repo = AssetTypeRepository()
check_repo = MonitoringCheckRepository()
result_repo = MonitoringResultRepository()

# ============= AUTH ROUTES =============
@app.post("/auth/register")
async def register(request: Request):
    try:
        body = json.loads(request.body)
        user_data = UserCreate(**body)
        result = await auth_service.register(user_data)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/auth/login")
async def login(request: Request):
    import datetime
    log_file = "/tmp/serviceops_login_debug.log"
    try:
        with open(log_file, "a") as f:
            f.write(f"\n[{datetime.datetime.now()}] LOGIN START\n")
            f.flush()
        
        body = json.loads(request.body)
        with open(log_file, "a") as f:
            f.write(f"Body parsed: {body}\n")
            f.flush()
        
        creds = LoginRequest(**body)
        with open(log_file, "a") as f:
            f.write(f"Creds validated: {creds.email}\n")
            f.flush()
        
        token = await auth_service.login(creds.email, creds.password)
        with open(log_file, "a") as f:
            f.write(f"Token generated successfully\n")
            f.flush()
        return cors_response(token.model_dump())
    except Exception as e:
        with open(log_file, "a") as f:
            f.write(f"ERROR: {type(e).__name__}: {str(e)}\n")
            import traceback
            traceback.print_exc(file=f)
            f.flush()
        print(f"[LOGIN] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return cors_response({"error": "Invalid credentials"}, status_code=401)

@app.get("/auth/me")
async def get_me(request: Request):
    auth_header = get_header(request, "Authorization", "")
    if not auth_header.startswith("Bearer "):
        return cors_response({"error": "Unauthorized"}, status_code=401)
    try:
        from uuid import UUID
        token = auth_header[7:]
        user_id = auth_service.verify_token(token)
        user = await auth_service.user_repo.get_by_id(UUID(str(user_id)))
        # Convert datetime + UUID fields to ISO/string
        if user:
            for k, v in user.items():
                if isinstance(v, UUID):
                    user[k] = str(v)
                elif hasattr(v, 'isoformat'):
                    user[k] = v.isoformat()
        return cors_response(user)
    except Exception as e:
        return cors_response({"error": str(e)}, status_code=401)

@app.put("/auth/me")
async def update_me(request: Request):
    auth_header = get_header(request, "Authorization", "")
    if not auth_header.startswith("Bearer "):
        return cors_response({"error": "Unauthorized"}, status_code=401)
    try:
        from uuid import UUID
        token = auth_header[7:]
        user_id = auth_service.verify_token(token)
        body = json.loads(request.body)
        await auth_service.user_repo.update(UUID(str(user_id)), body)
        user = await auth_service.user_repo.get_by_id(UUID(str(user_id)))
        if user:
            for k, v in user.items():
                if hasattr(v, 'isoformat'):
                    user[k] = v.isoformat()
        return cors_response(user)
    except Exception as e:
        return cors_response({"error": str(e)}, status_code=400)

# ============= ASSET ROUTES =============
@app.post("/assets")
async def create_asset(request: Request):
    try:
        body = json.loads(request.body)
        asset_data = AssetCreate(**body)
        asset_id = await asset_repo.create(asset_data)
        return json_response({"id": str(asset_id)}, 201)
    except Exception as e:
        return Response(status_code=400, body=json.dumps({"error": str(e)}))

@app.get("/assets")
async def list_assets(request: Request):
    try:
        assets = await asset_repo.list()
        return json_response(assets, 200)
    except Exception as e:
        return Response(status_code=400, body=json.dumps({"error": str(e)}))

@app.get("/assets/:asset_id")
async def get_asset(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        asset = await asset_repo.get_by_id(asset_id)
        if not asset:
            return json_response({"error": "Asset not found"}, 404)
        return json_response(asset, 200)
    except Exception as e:
        return Response(status_code=400, body=json.dumps({"error": str(e)}))

@app.put("/assets/:asset_id")
async def update_asset(request: Request):
    try:
        from uuid import UUID
        asset_id = request.path_params.get("asset_id")
        body = json.loads(request.body)
        asset_data = AssetUpdate(**body)
        await asset_repo.update(UUID(asset_id), asset_data)
        return json_response({"message": "Asset updated"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)

@app.delete("/assets/:asset_id")
async def delete_asset(request: Request):
    try:
        from uuid import UUID
        asset_id = request.path_params.get("asset_id")
        await asset_repo.delete(UUID(asset_id))
        return json_response({"message": "Asset deleted"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)

@app.post("/asset-types")
async def create_asset_type(request: Request):
    try:
        body = json.loads(request.body)
        asset_type_data = AssetTypeCreate(**body)
        asset_type_id = await asset_type_repo.create(asset_type_data)
        return json_response({"id": str(asset_type_id)}, 201)
    except Exception as e:
        return Response(status_code=400, body=json.dumps({"error": str(e)}))

@app.get("/asset-types")
async def list_asset_types(request: Request):
    try:
        asset_types = await asset_type_repo.list()
        return json_response(asset_types, 200)
    except Exception as e:
        return Response(status_code=400, body=json.dumps({"error": str(e)}))

# ============= MONITORING ROUTES =============
@app.post("/monitoring/checks")
async def create_check(request: Request):
    try:
        body = json.loads(request.body)
        check_data = MonitoringCheckCreate(**body)
        check_id = await check_repo.create(check_data)
        return json_response({"id": str(check_id)}, 201)
    except Exception as e:
        return Response(status_code=400, body=json.dumps({"error": str(e)}))

@app.get("/monitoring/checks")
async def list_all_checks(request: Request):
    try:
        checks = await check_repo.list_all()
        return cors_response(checks, 200)
    except Exception as e:
        return cors_response({"error": str(e)}, 400)

@app.get("/monitoring/checks/asset/:asset_id")
async def list_checks_by_asset(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        checks = await check_repo.list_by_asset(asset_id)
        return json_response(checks, 200)
    except Exception as e:
        return Response(status_code=400, body=json.dumps({"error": str(e)}))

@app.get("/monitoring/checks/:check_id")
async def get_check_by_id(request: Request):
    try:
        from uuid import UUID
        check_id = request.path_params.get("check_id")
        check = await check_repo.get_by_id(UUID(check_id))
        if not check:
            return json_response({"error": "Check not found"}, 404)
        return json_response(check, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)

@app.put("/monitoring/checks/:check_id")
async def update_check(request: Request):
    try:
        from uuid import UUID
        check_id = request.path_params.get("check_id")
        body = json.loads(request.body)
        check_data = MonitoringCheckUpdate(**body)
        await check_repo.update(UUID(check_id), check_data)
        return json_response({"message": "Check updated"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)

@app.post("/monitoring/checks/:check_id/execute")
async def execute_check_now(request: Request):
    """Execute a monitoring check immediately and return result"""
    try:
        from uuid import UUID
        from .domains.monitoring.plugin_registry import PluginRegistry
        check_id = request.path_params.get("check_id")
        
        # Get check details
        check = await check_repo.get_by_id(UUID(check_id))
        if not check:
            return json_response({"error": "Check not found"}, 404)
        
        # Execute via plugin
        registry = PluginRegistry()
        plugin_class = registry.get_plugin(check['check_type'])
        if not plugin_class:
            return json_response({"error": f"Plugin not found: {check['check_type']}"}, 400)
        
        plugin = plugin_class()
        result = await plugin.execute(check.get('config', {}))
        
        # Store result
        async with db.get_connection() as conn:
            await conn.execute("""
                INSERT INTO monitoring_results (check_id, status, response_time_ms, error_message)
                VALUES (%s, %s, %s, %s)
            """, (str(check_id), result.status, result.response_time_ms, result.error_message))
        
        return json_response({
            "status": result.status,
            "response_time_ms": result.response_time_ms,
            "error_message": result.error_message,
            "executed_at": "now"
        }, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)

@app.get("/monitoring/results/:check_id")
async def get_check_results(request: Request):
    try:
        check_id = request.path_params.get("check_id")
        results = await result_repo.get_recent(check_id, limit=50)
        return json_response(results, 200)
    except Exception as e:
        return Response(status_code=400, body=json.dumps({"error": str(e)}))

@app.post("/run-cycle")
async def run_monitoring_cycle(request: Request):
    """Manual trigger for monitoring + alert cycle"""
    try:
        await scheduler._execute_due_checks()
        return cors_response({"message": "Monitoring cycle executed"}, 200)
    except Exception as e:
        return cors_response({"error": str(e)}, 400)

# ============= ALERT ROUTES =============
@app.post("/alerts/rules")
async def create_rule(request: Request):
    return await create_alert_rule(request)

@app.get("/alerts/rules")
async def list_rules(request: Request):
    return await list_alert_rules(request)

@app.get("/alerts/rules/:rule_id")
async def get_rule(request: Request):
    return await get_alert_rule(request)

@app.put("/alerts/rules/:rule_id")
async def update_rule(request: Request):
    return await update_alert_rule(request)

@app.post("/alerts/rules/:rule_id/toggle")
async def toggle_rule(request: Request):
    return await toggle_alert_rule(request)

@app.delete("/alerts/rules/:rule_id")
async def delete_rule(request: Request):
    """Delete an alert rule"""
    try:
        from uuid import UUID
        rule_id = request.path_params.get("rule_id")
        # Import delete function from alerts routes
        from .domains.alerts.repository import AlertRuleRepository
        repo = AlertRuleRepository()
        await repo.delete(UUID(rule_id))
        return cors_response({"message": "Rule deleted"}, 200)
    except Exception as e:
        return cors_response({"error": str(e)}, 400)

@app.get("/alerts/incidents")
async def list_alert_incidents(request: Request):
    return await list_incidents(request)

@app.get("/incidents")
async def list_incidents_alias(request: Request):
    """Alias for /alerts/incidents for frontend compatibility"""
    return await list_incidents(request)

@app.post("/incidents")
async def create_incident_route(request: Request):
    """Create incident from check failure"""
    try:
        from uuid import UUID
        body = json.loads(request.body)
        from .domains.alerts.repository import AlertIncidentRepository
        repo = AlertIncidentRepository()
        incident_id = await repo.create(body)
        return cors_response({"id": str(incident_id)}, 201)
    except Exception as e:
        return cors_response({"error": str(e)}, 400)

@app.post("/incidents/:incident_id/acknowledge")
async def ack_incident_alias(request: Request):
    """Alias for /alerts/incidents/:incident_id/acknowledge"""
    return await acknowledge_incident(request)

@app.post("/alerts/incidents/:incident_id/acknowledge")
async def ack_incident(request: Request):
    return await acknowledge_incident(request)

@app.post("/alerts/incidents/:incident_id/resolve")
async def resolve_alert_incident(request: Request):
    return await resolve_incident(request)

# ============= NOTIFICATION CHANNEL ROUTES =============
@app.post("/notifications/channels")
async def create_channel(request: Request):
    return await create_notification_channel(request)

@app.get("/notifications/channels")
async def list_channels(request: Request):
    return await list_notification_channels(request)

@app.get("/notifications/channels/:channel_id")
async def get_channel(request: Request):
    return await get_notification_channel(request)

@app.put("/notifications/channels/:channel_id")
async def update_channel(request: Request):
    return await update_notification_channel(request)

@app.delete("/notifications/channels/:channel_id")
async def delete_channel(request: Request):
    return await delete_notification_channel(request)

@app.post("/notifications/channels/test")
async def test_channel(request: Request):
    return await test_notification_channel(request)

@app.get("/notifications/channels/:channel_id/logs")
async def channel_logs(request: Request):
    return await get_channel_logs(request)

@app.get("/notifications/incidents/:incident_id/logs")
async def incident_logs(request: Request):
    return await get_incident_logs(request)

@app.get("/alerts/incidents/:incident_id/timeline")
async def get_timeline(request: Request):
    return await get_incident_timeline(request)

@app.post("/alerts/incidents/:incident_id/comments")
async def add_comment(request: Request):
    return await add_incident_comment(request)

# ============= LOG ROUTES =============
@app.post("/logs/ingest")
async def ingest(request: Request):
    return await ingest_log(request)

@app.post("/logs/bulk")
async def bulk_ingest(request: Request):
    return await bulk_ingest_logs(request)

@app.post("/logs/search")
async def search(request: Request):
    return await search_logs(request)

@app.get("/logs/assets/:asset_id")
async def asset_logs(request: Request):
    return await get_asset_logs(request)

@app.get("/logs/stats")
async def log_stats(request: Request):
    return await get_log_stats(request)

# ============= SLA ROUTES =============
@app.post("/sla/targets")
async def create_sla_target(request: Request):
    return await create_target(request)

@app.get("/sla/targets")
async def list_sla_targets(request: Request):
    return await list_targets(request)

@app.get("/sla/targets/:target_id")
async def get_sla_target(request: Request):
    return await get_target(request)

@app.put("/sla/targets/:target_id")
async def update_sla_target(request: Request):
    return await update_target(request)

@app.post("/sla/targets/:target_id/reports")
async def generate_sla_report(request: Request):
    return await generate_report(request)

@app.get("/sla/reports")
async def list_sla_reports(request: Request):
    return await get_reports(request)

@app.get("/sla/uptime/summary")
async def uptime_summary(request: Request):
    return await get_uptime_summary(request)

@app.get("/sla/uptime/assets")
async def assets_uptime(request: Request):
    return await list_asset_uptime(request)

# ============= TOPOLOGY ROUTES =============
@app.post("/topology/dependencies")
async def create_dep(request: Request):
    return await create_dependency(request)

@app.get("/topology/assets/:asset_id/dependencies")
async def get_deps(request: Request):
    return await get_dependencies(request)

@app.get("/topology/graph")
async def get_graph(request: Request):
    return await get_topology_graph(request)

@app.delete("/topology/dependencies/:dep_id")
async def delete_dep(request: Request):
    return await remove_dependency(request)

@app.get("/topology/assets/:asset_id/impact")
async def impact_analysis(request: Request):
    return await get_impact_analysis(request)

# ============= AUDIT & SYSTEM ROUTES =============
@app.get("/audit/logs")
async def audit_logs(request: Request):
    return await get_audit_logs(request)

@app.get("/audit/users/:user_id/activity")
async def user_activity(request: Request):
    return await get_user_activity(request)

@app.get("/metrics")
async def system_metrics(request: Request):
    return await metrics(request)

@app.post("/backup")
async def backup(request: Request):
    return await run_backup(request)

if __name__ == "__main__":
    import asyncio
    
    async def startup():
        await db.connect()
        await redis_client.connect()
        await scheduler.start()
    
    asyncio.run(startup())
    app.start(port=settings.port, host=settings.host)
