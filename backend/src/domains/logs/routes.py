from ...utils import json_response
import json
from robyn import Request
from robyn.responses import Response
from .models import LogCreate, LogFilter
from .repository import log_repo


async def ingest_log(request: Request):
    try:
        body = json.loads(request.body)
        log = LogCreate(**body)
        log_id = await log_repo.ingest(log)
        return json_response({"id": str(log_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def bulk_ingest_logs(request: Request):
    try:
        body = json.loads(request.body)
        logs = [LogCreate(**item) for item in body]
        count = await log_repo.bulk_ingest(logs)
        return json_response({"ingested": count}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def search_logs(request: Request):
    try:
        body = json.loads(request.body)
        log_filter = LogFilter(**body)
        results = await log_repo.search(log_filter)
        return json_response(results, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_asset_logs(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        limit = int(request.query_params.get("limit", "50"))
        results = await log_repo.get_asset_logs(asset_id, limit)
        return json_response(results, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_log_stats(request: Request):
    try:
        stats = await log_repo.count_by_level()
        return json_response(stats, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)
