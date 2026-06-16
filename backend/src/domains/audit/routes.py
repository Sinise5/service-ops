from ...utils import json_response
from robyn import Request
from robyn.responses import Response
from .service import audit_logger


async def get_audit_logs(request: Request):
    try:
        user_id = request.query_params.get("user_id")
        action = request.query_params.get("action")
        resource_type = request.query_params.get("resource_type")
        limit = int(request.query_params.get("limit", "100"))
        
        logs = await audit_logger.get_logs(
            user_id=user_id, action=action,
            resource_type=resource_type, limit=limit
        )
        return json_response(logs, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_user_activity(request: Request):
    try:
        user_id = request.path_params.get("user_id")
        days = int(request.query_params.get("days", "30"))
        activity = await audit_logger.get_user_activity(user_id, days)
        return json_response(activity, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


# Health check endpoint
async def health_check(request: Request):
    try:
        from ...database import db
        async with db.get_connection() as conn:
            await conn.execute("SELECT 1")
        
        return json_response({
            "status": "healthy",
            "version": "1.0.0",
            "uptime": "running",
            "database": "connected",
            "scheduler": "active"
        }, 200)
    except Exception as e:
        return json_response({
            "status": "unhealthy",
            "error": str(e)
        }, 503)


# Metrics endpoint
async def metrics(request: Request):
    try:
        from ...database import db
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT COUNT(*) FROM assets"
            )
            assets = (await cursor.fetchone())[0]
            
            cursor = await conn.execute(
                "SELECT COUNT(*) FROM alert_incidents WHERE status != 'resolved'"
            )
            open_incidents = (await cursor.fetchone())[0]
            
            cursor = await conn.execute(
                "SELECT COUNT(*) FROM monitoring_checks WHERE enabled = true"
            )
            active_checks = (await cursor.fetchone())[0]
            
        return json_response({
            "assets_total": assets,
            "open_incidents": open_incidents,
            "active_checks": active_checks
        }, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# Backup endpoint
async def run_backup(request: Request):
    try:
        import subprocess
        from datetime import datetime
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"/tmp/serviceops_backup_{timestamp}.sql"
        
        result = subprocess.run(
            ["pg_dump", "-h", "localhost", "-U", "postgres", "-d", "serviceops_dev", "-f", filename],
            capture_output=True, text=True, timeout=120
        )
        
        if result.returncode == 0:
            return json_response({
                "message": "Backup completed",
                "file": filename,
                "size": f"{result.stdout} bytes"
            }, 200)
        else:
            return json_response({"error": result.stderr}, 500)
    except Exception as e:
        return json_response({"error": str(e)}, 500)
