from .models import UserCreate, RoleCreate
from ...database import db
from uuid import UUID
import bcrypt


class UserRepository:
    async def create(self, user: UserCreate) -> dict:
        """Create new user"""
        hashed = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt())
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """INSERT INTO users (email, username, first_name, last_name, hashed_password)
                   VALUES (%s, %s, %s, %s, %s)
                   RETURNING id, email, username, first_name, last_name, status, created_at""",
                (user.email, user.email.split('@')[0], '', '', hashed.decode())
            )
            row = await cursor.fetchone()
            return dict(row)
    
    async def get_by_email(self, email: str) -> dict | None:
        """Get user by email"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id, email, username, first_name, last_name, hashed_password, status, created_at FROM users WHERE email = %s",
                (email,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
    
    async def get_by_id(self, user_id: UUID) -> dict | None:
        """Get user by ID"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id, email, username, first_name, last_name, status, created_at FROM users WHERE id = %s",
                (str(user_id),)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
    
    async def update(self, user_id: UUID, data: dict):
        """Update user"""
        updates = []
        values = []
        
        if 'first_name' in data:
            updates.append("first_name = %s")
            values.append(data['first_name'])
        
        if 'last_name' in data:
            updates.append("last_name = %s")
            values.append(data['last_name'])
        
        if not updates:
            return
        
        updates.append("updated_at = NOW()")
        values.append(str(user_id))
        
        async with db.get_connection() as conn:
            await conn.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
                tuple(values)
            )


class RoleRepository:
    async def create(self, role: RoleCreate) -> UUID:
        """Create new role"""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "INSERT INTO roles (name, description) VALUES (%s, %s) RETURNING id",
                (role.name, role.description)
            )
            row = await cursor.fetchone()
            return row["id"]
    
    async def assign_to_user(self, user_id: UUID, role_id: UUID):
        """Assign role to user"""
        async with db.get_connection() as conn:
            await conn.execute(
                "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (str(user_id), str(role_id))
            )
