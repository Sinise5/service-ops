from .repository import UserRepository, RoleRepository
from .models import UserCreate, TokenResponse
from ...config import settings
import jwt
from datetime import datetime, timedelta
import bcrypt


class AuthService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.role_repo = RoleRepository()
    
    async def register(self, user_data: UserCreate) -> dict:
        """Register new user"""
        return await self.user_repo.create(user_data)
    
    async def login(self, email: str, password: str) -> TokenResponse:
        """Login user and return JWT token"""
        import sys
        print(f"[AUTH SERVICE] Login attempt: {email}", file=sys.stderr, flush=True)
        
        user = await self.user_repo.get_by_email(email)
        print(f"[AUTH SERVICE] User lookup result: {user is not None}", file=sys.stderr, flush=True)
        
        if not user:
            print(f"[AUTH SERVICE] User not found: {email}", file=sys.stderr, flush=True)
            raise Exception("Invalid credentials")
        
        # hashed_password from DB is already bytes, don't encode
        hash_bytes = user['hashed_password']
        print(f"[AUTH SERVICE] Hash type: {type(hash_bytes)}, length: {len(hash_bytes) if hash_bytes else 0}", file=sys.stderr, flush=True)
        
        if isinstance(hash_bytes, str):
            hash_bytes = hash_bytes.encode()
        
        password_match = bcrypt.checkpw(password.encode(), hash_bytes)
        print(f"[AUTH SERVICE] Password match: {password_match}", file=sys.stderr, flush=True)
        
        if not password_match:
            raise Exception("Invalid credentials")
        
        token = self._create_token(str(user['id']))
        print(f"[AUTH SERVICE] Token created successfully", file=sys.stderr, flush=True)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=settings.jwt_expire_minutes * 60
        )
    
    def _create_token(self, user_id: str) -> str:
        """Create JWT token"""
        payload = {
            "sub": user_id,
            "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    
    def verify_token(self, token: str) -> str:
        """Verify JWT token and return user_id"""
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            return payload["sub"]
        except jwt.ExpiredSignatureError:
            raise Exception("Token expired")
        except jwt.InvalidTokenError:
            raise Exception("Invalid token")
    
    async def create_api_key(self, user_id: str, name: str) -> str:
        """Create API key for user"""
        import secrets
        api_key = f"sk_{secrets.token_urlsafe(32)}"
        # TODO: Store in database when api_keys table exists
        return api_key


auth_service = AuthService()
