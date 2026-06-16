import psycopg
import psycopg.rows
from contextlib import asynccontextmanager
from .config import settings


class Database:
    def __init__(self):
        self.conn = None

    async def connect(self):
        self.conn = await psycopg.AsyncConnection.connect(
            settings.database_url,
            row_factory=psycopg.rows.dict_row,
        )
        print(f"✓ Database connected: {settings.database_url}")

    async def close(self):
        if self.conn:
            await self.conn.close()
            self.conn = None

    @asynccontextmanager
    async def get_connection(self):
        if not self.conn or self.conn.closed:
            await self.connect()
        try:
            yield self.conn
        except Exception as e:
            print(f"[DB] Error: {e}")
            await self.conn.rollback()
            raise
        else:
            await self.conn.commit()


db = Database()