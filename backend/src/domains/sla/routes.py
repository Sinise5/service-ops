from ...utils import json_response
import json
from robyn import Request
from robyn.responses import Response
from .models import SLATargetCreate, SLATargetUpdate
from .repository import sla_repo
from ...database import db


async def create_target(request: Request):
    try:
        body = json.loads(request.body)
        target = SLATargetCreate(**body)
        target_id = await sla_repo.create_target(target)
        return json_response({"id": str(target_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def list_targets(request: Request):
    try:
        asset_id = request.query_params.get("asset_id", None)
        targets = await sla_repo.list_targets(asset_id)
        return json_response(targets, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_target(request: Request):
    try:
        target_id = request.path_params.get("target_id")
        target = await sla_repo.get_target(target_id)
        if not target:
            return json_response({"error": "Target not found"}, 404)
        return json_response(target, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def update_target(request: Request):
    try:
        target_id = request.path_params.get("target_id")
        body = json.loads(request.body)
        update = SLATargetUpdate(**body)
        await sla_repo.update_target(target_id, update)
        return json_response({"message": "Updated"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def generate_report(request: Request):
    try:
        target_id = request.path_params.get("target_id")
        body = json.loads(request.body)
        start = body.get("period_start")
        end = body.get("period_end")
        report_id = await sla_repo.generate_report(target_id, start, end)
        return json_response({"id": str(report_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_reports(request: Request):
    try:
        target_id = request.query_params.get("target_id", None)
        limit = int(request.query_params.get("limit", "50"))
        reports = await sla_repo.get_reports(target_id, limit)
        return json_response(reports, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_uptime_summary(request: Request):
    try:
        asset_id = request.query_params.get("asset_id")
        days = int(request.query_params.get("days", "30"))
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT
                   COUNT(*) as total_checks,
                   COUNT(*) FILTER (WHERE status = 'success') as successful_checks,
                   ROUND(COUNT(*) FILTER (WHERE status = 'success')::numeric / GREATEST(COUNT(*), 1) * 100, 2) as uptime_pct,
                   ROUND(AVG(response_time_ms)::numeric, 2) as avg_response_time,
                   MAX(response_time_ms) as max_response_time,
                   MIN(checked_at) as period_start,
                   MAX(checked_at) as period_end
                FROM monitoring_results mr
                JOIN monitoring_checks mc ON mc.id = mr.check_id
                WHERE mc.asset_id = %s AND mr.checked_at >= NOW() - INTERVAL '%s days'""",
                (str(asset_id), str(days))
            )
            row = await cursor.fetchone()
            if not row or row["total_checks"] == 0:
                return json_response({"error": "No data"}, 404)
            return json_response(dict(row), 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def list_asset_uptime(request: Request):
    try:
        days = int(request.query_params.get("days", "30"))
        
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """SELECT a.id as asset_id, a.name as asset_name,
                   COUNT(mr.id) as total_checks,
                   COUNT(*) FILTER (WHERE mr.status = 'success') as successful_checks,
                   ROUND(COUNT(*) FILTER (WHERE mr.status = 'success')::numeric / GREATEST(COUNT(mr.id), 1) * 100, 2) as uptime_percentage,
                   GREATEST(0, ((%s::int * 1440) - (COUNT(*) FILTER (WHERE mr.status != 'success') * 5))) as downtime_minutes,
                   CASE
                     WHEN ROUND(COUNT(*) FILTER (WHERE mr.status = 'success')::numeric / GREATEST(COUNT(mr.id), 1) * 100, 2) >= 99.5 THEN 'healthy'
                     WHEN ROUND(COUNT(*) FILTER (WHERE mr.status = 'success')::numeric / GREATEST(COUNT(mr.id), 1) * 100, 2) >= 95 THEN 'warning'
                     ELSE 'critical'
                   END as status
                FROM assets a
                JOIN monitoring_checks mc ON mc.asset_id = a.id
                JOIN monitoring_results mr ON mr.check_id = mc.id
                WHERE mr.checked_at >= NOW() - INTERVAL '%s days'
                GROUP BY a.id, a.name
                ORDER BY uptime_percentage ASC""",
                (days, days)
            )
            rows = await cursor.fetchall() or []
            return json_response([dict(r) for r in rows], 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)
