"""Utility functions for HTTP response handling."""
import json
from uuid import UUID
from robyn import Response


class UUIDEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)


def json_response(data, status_code: int = 200) -> Response:
    """Return a JSON response with proper serialization."""
    return Response(
        status_code=status_code,
        body=json.dumps(data, cls=UUIDEncoder),
        headers={"Content-Type": "application/json"},
    )


def get_header(request, key: str, default: str | None = None) -> str | None:
    """Extract a header from a Robyn request."""
    headers = getattr(request, "headers", {})
    if isinstance(headers, dict):
        return headers.get(key.lower(), headers.get(key, default))
    return default
