"""Shared utilities and middleware"""
from robyn import Request
from ..utils import get_header, json_response


def require_auth(handler):
    """Decorator to require JWT authentication"""
    async def wrapper(request: Request):
        # Lazy import to avoid circular dependency
        from ..domains.auth.service import auth_service
        
        auth_header = get_header(request, "Authorization", "")
        if not auth_header.startswith("Bearer "):
            return json_response({"error": "Unauthorized"}, 401)
        
        try:
            token = auth_header[7:]
            user_id = auth_service.verify_token(token)
            request.user_id = user_id
            return await handler(request)
        except Exception as e:
            return json_response({"error": str(e)}, 401)
    
    return wrapper
