from ...utils import json_response
from robyn import Request
from robyn.responses import Response
from .models import AssetCreate, AssetUpdate, AssetTypeCreate
from .repository import AssetRepository, AssetTypeRepository
from ..auth.middleware import require_auth
import json

# Handler functions only — no own Robyn app
asset_repo = AssetRepository()
asset_type_repo = AssetTypeRepository()


async def create_asset(request: Request):
    try:
        body = json.loads(request.body)
        asset_data = AssetCreate(**body)
        asset_id = await asset_repo.create(asset_data)
        return json_response({"id": str(asset_id)}, 201)
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        # Extract meaningful error message
        error_msg = str(e)
        if not error_msg or error_msg == "0":
            error_msg = "Invalid asset data or foreign key constraint violation"
        
        if "foreign key" in error_msg.lower() or "asset_type_id" in error_msg.lower():
            error_msg = "Invalid asset_type_id - asset type does not exist"
        
        print(f"[ERROR] Asset create failed: {error_msg}")
        return json_response({"error": error_msg}, 400)


async def list_assets(request: Request):
    try:
        skip_str = request.query_params.get("skip", "0")
        limit_str = request.query_params.get("limit", "50")
        skip = int(skip_str)
        limit = int(limit_str)
        assets = await asset_repo.list(skip=skip, limit=limit)
        return json_response(assets, 200)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return json_response({"error": str(e) or "0"}, 400)


async def get_asset(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        asset = await asset_repo.get_by_id(asset_id)
        if not asset:
            return json_response({"error": "Asset not found"}, 404)
        return json_response(asset, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def update_asset(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        body = json.loads(request.body)
        asset_data = AssetUpdate(**body)
        await asset_repo.update(asset_id, asset_data)
        return json_response({"message": "Asset updated"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def delete_asset(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        await asset_repo.delete(asset_id)
        return json_response({"message": "Asset deleted"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def create_asset_type(request: Request):
    try:
        body = json.loads(request.body)
        asset_type_data = AssetTypeCreate(**body)
        asset_type_id = await asset_type_repo.create(asset_type_data)
        return json_response({"id": str(asset_type_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def list_asset_types(request: Request):
    try:
        asset_types = await asset_type_repo.list()
        return json_response(asset_types, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)
