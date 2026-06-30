import asyncio
import asyncssh
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
import logging

logger = logging.getLogger(__name__)


class SSHError(Exception):
    pass


class SSHClient:
    """
    Async SSH client wrapper with connection pooling support.
    All Docker operations go through this client.
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        auth_type: str,
        password: Optional[str] = None,
        ssh_key: Optional[str] = None,
        ssh_key_passphrase: Optional[str] = None,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.auth_type = auth_type
        self.password = password
        self.ssh_key = ssh_key
        self.ssh_key_passphrase = ssh_key_passphrase

    def _connect_kwargs(self) -> dict:
        kwargs = {
            "username": self.username,
            "port": self.port,
            "known_hosts": None,  # Disable host key verification for flexibility
        }
        if self.auth_type == "password" and self.password:
            kwargs["password"] = self.password
        elif self.auth_type == "key" and self.ssh_key:
            # Parse key — can be PEM content or file path
            import tempfile, os
            # Write key to temp file (permissions 600)
            fd, path = tempfile.mkstemp(mode="w", suffix=".key")
            try:
                os.write(fd, self.ssh_key.encode())
                os.fchmod(fd, 0o600)
                os.close(fd)
                client_keys = [path]
                if self.ssh_key_passphrase:
                    kwargs["passphrase"] = self.ssh_key_passphrase
                kwargs["client_keys"] = client_keys
            except Exception:
                os.close(fd)
                raise
        return kwargs

    @asynccontextmanager
    async def connection(self) -> AsyncGenerator:
        kwargs = self._connect_kwargs()
        try:
            async with asyncssh.connect(self.host, **kwargs) as conn:
                yield conn
        except asyncssh.PermissionDenied as e:
            raise SSHError(f"Permission denied: {e}")
        except asyncssh.ConnectionLost as e:
            raise SSHError(f"Connection lost: {e}")
        except asyncssh.InvalidKey as e:
            raise SSHError(f"Invalid SSH key: {e}")
        except Exception as e:
            raise SSHError(f"SSH connection failed: {e}")

    async def exec(
        self,
        command: str,
        timeout: int = 30,
        cwd: Optional[str] = None,
    ) -> tuple[str, str, int]:
        """
        Execute a command via SSH.
        Returns (stdout, stderr, exit_code).
        """
        async with self.connection() as conn:
            env = {}
            if cwd:
                # Prepend cd to command
                command = f"cd {cwd!r} && {command}"

            result = await conn.run(
                command,
                timeout=timeout,
                check=False,
                environment=env,
            )
            stdout = result.stdout if result.stdout else ""
            stderr = result.stderr if result.stderr else ""
            return stdout, stderr, result.exit_status

    async def exec_stream(self, command: str, cwd: Optional[str] = None):
        """
        Async generator that yields lines from a streaming command.
        Use for docker logs -f etc.
        """
        if cwd:
            command = f"cd {cwd!r} && {command}"

        async with self.connection() as conn:
            async with conn.create_process(command) as process:
                async for line in process.stdout:
                    yield line
                await process.exit(0)

    async def test_connection(self) -> dict:
        """Test SSH + basic docker access."""
        try:
            stdout, stderr, code = await self.exec("docker version --format '{{.Server.Version}}'", timeout=10)
            if code == 0:
                return {"status": "online", "docker_version": stdout.strip()}
            else:
                return {"status": "offline", "error": stderr.strip() or "Docker not accessible"}
        except SSHError as e:
            return {"status": "offline", "error": str(e)}
        except Exception as e:
            return {"status": "offline", "error": f"Unexpected error: {e}"}


# ─────────────────────────────────────────────
# Connection Pool
# ─────────────────────────────────────────────
class SSHPool:
    """
    Simple SSH connection pool — one SSHClient per host_id.
    Keeps connections alive for reuse.
    """
    def __init__(self, max_per_host: int = 5):
        self._clients: dict[str, SSHClient] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._last_used: dict[str, float] = {}
        self.max_per_host = max_per_host
        self._pool_lock = asyncio.Lock()

    async def acquire(self, host_id: str, **ssh_kwargs) -> SSHClient:
        async with self._pool_lock:
            if host_id not in self._locks:
                self._locks[host_id] = asyncio.Lock()
        return SSHClient(**ssh_kwargs)

    async def release(self, host_id: str):
        # Currently no persistent connection caching
        # Just let the context manager handle cleanup
        pass

    async def evict_all(self):
        """Close all pooled connections."""
        self._clients.clear()
        self._last_used.clear()


# Global pool instance
ssh_pool = SSHPool()
