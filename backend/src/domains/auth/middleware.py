"""Auth middleware for protected routes"""
from functools import wraps
from ...utils import get_header, json_response
from robyn import Request
from .service import auth_service


def require_auth(func):
    """Decorator to require valid JWT authentication"""
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        auth_header = get_header(request, "Authorization", "")
        if not auth_header.startswith("Bearer "):
            return json_response({"error": "Unauthorized"}, 401)
        try:
            token = auth_header[7:]
            auth_service.verify_token(token)
            return await func(request, *args, **kwargs)
        except Exception as e:
            return json_response({"error": str(e)}, 401)
    return wrapper
