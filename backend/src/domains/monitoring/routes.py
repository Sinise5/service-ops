from ...utils import json_response
from robyn import Robyn, Request
from robyn.responses import Response
from .models import MonitoringCheckCreate, MonitoringCheckUpdate
from .repository import MonitoringCheckRepository, MonitoringResultRepository
from ...shared import require_auth
import json

app = Robyn(__file__)
check_repo = MonitoringCheckRepository()
result_repo = MonitoringResultRepository()


@app.post("/monitoring/checks")
@require_auth
async def create_check(request: Request):
    try:
        body = json.loads(request.body)
        check_data = MonitoringCheckCreate(**body)
        check_id = await check_repo.create(check_data)
        return json_response({"id": str(check_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.get("/monitoring/checks/asset/:asset_id")
@require_auth
async def list_checks(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        checks = await check_repo.list_by_asset(asset_id)
        return json_response(checks, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.get("/monitoring/checks/:check_id")
@require_auth
async def get_check(request: Request):
    try:
        check_id = request.path_params.get("check_id")
        check = await check_repo.get_by_id(check_id)
        if not check:
            return json_response({"error": "Check not found"}, 404)
        return json_response(check, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.get("/monitoring/results/:check_id")
@require_auth
async def get_results(request: Request):
    try:
        check_id = request.path_params.get("check_id")
        limit = int(request.query_params.get("limit", 50))
        results = await result_repo.get_recent(check_id, limit=limit)
        return json_response(results, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.put("/monitoring/checks/:check_id")
@require_auth
async def update_check(request: Request):
    try:
        check_id = request.path_params.get("check_id")
        body = json.loads(request.body)
        check_data = MonitoringCheckUpdate(**body)
        await check_repo.update(check_id, check_data)
        return json_response({"message": "Check updated"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.delete("/monitoring/checks/:check_id")
@require_auth
async def delete_check(request: Request):
    try:
        check_id = request.path_params.get("check_id")
        await check_repo.delete(check_id)
        return json_response({"message": "Check deleted"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)
