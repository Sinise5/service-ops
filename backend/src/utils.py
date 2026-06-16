"""Shared utilities — safe to import anywhere (no circular deps)"""
from robyn import Request
from robyn.responses import Response
import json


def get_header(request: Request, name: str, default: str = "") -> str:
    """Safe header getter for Robyn 0.84"""
    try:
        return request.headers.get(name) or default
    except TypeError:
        if hasattr(request.headers, name.lower()):
            return getattr(request.headers, name.lower(), default)
        return default


def json_response(data: dict, status_code: int = 200) -> Response:
    """Safe JSON response for Robyn 0.84"""
    return Response(
        status_code=status_code,
        description=json.dumps(data, default=str),
        headers={"Content-Type": "application/json"}
    )