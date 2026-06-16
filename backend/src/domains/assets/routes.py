from ...utils import json_response
from robyn import Robyn, Request
from robyn.responses import Response
from .models import AssetCreate, AssetUpdate, AssetTypeCreate
from .repository import AssetRepository, AssetTypeRepository
from ...shared import require_auth
import json

app = Robyn(__file__)
asset_repo = AssetRepository()
asset_type_repo = AssetTypeRepository()


@app.post("/assets")
@require_auth
async def create_asset(request: Request):
    try:
        body = json.loads(request.body)
        asset_data = AssetCreate(**body)
        asset_id = await asset_repo.create(asset_data)
        return json_response({"id": str(asset_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.get("/assets")
@require_auth
async def list_assets(request: Request):
    try:
        skip = int(request.query_params.get("skip", 0))
        limit = int(request.query_params.get("limit", 50))
        assets = await asset_repo.list(skip=skip, limit=limit)
        return json_response(assets, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.get("/assets/:asset_id")
@require_auth
async def get_asset(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        asset = await asset_repo.get_by_id(asset_id)
        if not asset:
            json_response({"error": "Check not found"}, 404)
        return json_response(asset, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.put("/assets/:asset_id")
@require_auth
async def update_asset(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        body = json.loads(request.body)
        asset_data = AssetUpdate(**body)
        await asset_repo.update(asset_id, asset_data)
        return json_response({"message": "Asset updated"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.delete("/assets/:asset_id")
@require_auth
async def delete_asset(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        await asset_repo.delete(asset_id)
        return json_response({"message": "Asset deleted"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.post("/asset-types")
@require_auth
async def create_asset_type(request: Request):
    try:
        body = json.loads(request.body)
        asset_type_data = AssetTypeCreate(**body)
        asset_type_id = await asset_type_repo.create(asset_type_data)
        return json_response({"id": str(asset_type_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


@app.get("/asset-types")
async def list_asset_types(request: Request):
    try:
        asset_types = await asset_type_repo.list()
        return json_response(asset_types, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)
