from ...utils import json_response
import json
from robyn import Request
from robyn.responses import Response
from .models import DependencyCreate
from .repository import topo_repo


async def create_dependency(request: Request):
    try:
        body = json.loads(request.body)
        dep = DependencyCreate(**body)
        dep_id = await topo_repo.create_dependency(dep)
        return json_response({"id": str(dep_id)}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_dependencies(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        deps = await topo_repo.get_dependencies(asset_id)
        return json_response(deps, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_topology_graph(request: Request):
    try:
        graph = await topo_repo.get_graph()
        return json_response(graph, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def remove_dependency(request: Request):
    try:
        dep_id = request.path_params.get("dep_id")
        await topo_repo.remove_dependency(dep_id)
        return json_response({"message": "Deleted"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_impact_analysis(request: Request):
    try:
        asset_id = request.path_params.get("asset_id")
        impact = await topo_repo.get_upstream_impact(asset_id)
        return json_response(impact, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)
