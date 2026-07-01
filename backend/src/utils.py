"""Utility functions for HTTP response handling."""
import json
from uuid import UUID
from robyn import Response


class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        return super().default(obj)


def json_response(data, status_code: int = 200) -> Response:
    """Return a JSON response with proper serialization + CORS + no-cache."""
    return Response(
        status_code=status_code,
        body=json.dumps(data, cls=UUIDEncoder),
        headers={
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, X-User-ID",
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


def get_header(request, key: str, default: str | None = None) -> str | None:
    """Extract a header from a Robyn request.
    
    Robyn headers may be a dict, Headers object (with .get()), or other.
    Try multiple approaches to find the value.
    """
    key_lower = key.lower()
    headers = getattr(request, "headers", {})
    
    # Dict-style
    if isinstance(headers, dict):
        return headers.get(key_lower, headers.get(key, default))
    
    # Headers object or similar — try common access patterns
    if hasattr(headers, "get"):
        val = headers.get(key)
        if val is None:
            val = headers.get(key_lower)
        if val is not None:
            return str(val)
    
    # Try __getitem__
    try:
        return str(headers[key_lower])
    except (KeyError, TypeError):
        pass
    
    try:
        return str(headers[key])
    except (KeyError, TypeError):
        pass
    
    return default
