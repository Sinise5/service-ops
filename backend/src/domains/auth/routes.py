"""Auth route handlers (called from main.py)"""
from ...utils import json_response, get_header
from robyn import Request
from robyn.responses import Response
from .models import UserCreate, LoginRequest
from .service import auth_service
import json


def register_handler(request: Request) -> Response:
    try:
        body = json.loads(request.body)
        user_data = UserCreate(**body)
        result = auth_service.register_sync(user_data)
        return json_response(result, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


def login_handler(request: Request) -> Response:
    try:
        body = json.loads(request.body)
        creds = LoginRequest(**body)
        token = auth_service.login_sync(creds.email, creds.password)
        return json_response(token.model_dump(), 200)
    except Exception as e:
        return json_response({"error": str(e)}, 401)


def get_me_handler(request: Request) -> Response:
    auth_header = get_header(request, "Authorization", "")
    if not auth_header.startswith("Bearer "):
        return json_response({"error": "Unauthorized"}, 401)
    
    try:
        token = auth_header[7:]
        user_id = auth_service.verify_token(token)
        user = auth_service.user_repo.get_by_id_sync(user_id)
        return json_response(user, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 401)
