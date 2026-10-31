from robyn import Request

from ...config import settings
from ...utils import json_response
from ..auth.middleware import require_auth
from .repository import VulnerabilityRepository
from .scheduler import vulnerability_feed_scheduler

repository = VulnerabilityRepository()


@require_auth
async def list_vulnerabilities(request: Request):
    try:
        limit = min(100, max(1, int(request.query_params.get("limit", "50"))))
        offset = max(0, int(request.query_params.get("offset", "0")))
        days = min(365, max(1, int(request.query_params.get("days", "30"))))
        severity = request.query_params.get("severity", "").lower()
        if severity and severity not in {"critical", "high", "medium", "low", "unknown"}:
            return json_response({"error": "Invalid severity filter"}, 400)
        kev_only = request.query_params.get("kev", "false").lower() == "true"
        query = request.query_params.get("q", "")[:200].strip()
        return json_response(await repository.list_feed(limit, offset, query, severity, kev_only, days), 200)
    except ValueError:
        return json_response({"error": "Invalid pagination or date filter"}, 400)
    except Exception as error:
        return json_response({"error": str(error)}, 500)


@require_auth
async def vulnerability_feed_status(request: Request):
    try:
        state = await repository.get_state()
        return json_response({
            "source": "NVD CVE API 2.0",
            "kev_source": "CISA Known Exploited Vulnerabilities catalog",
            "interval_seconds": vulnerability_feed_scheduler.interval_seconds,
            "kev_refresh_interval_seconds": max(60, settings.kev_refresh_interval_seconds),
            "state": state,
        }, 200)
    except Exception as error:
        return json_response({"error": str(error)}, 500)


@require_auth
async def sync_vulnerability_feed(request: Request):
    result = await vulnerability_feed_scheduler.sync_now()
    return json_response(result, 200 if result.get("success") else 503)
