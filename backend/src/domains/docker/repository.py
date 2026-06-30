from uuid import UUID, uuid4
from typing import Optional
import json
from ..docker.models import (
    DockerHostCreate, DockerHostUpdate, DockerHostResponse,
    ComposeProjectCreate, ComposeProjectResponse,
    DeployTemplateCreate, DeployTemplateResponse,
    ContainerLogCreate, ContainerLogResponse,
)
from ...database import db


class DockerHostRepository:
    def __init__(self, crypto_service=None):
        self.crypto = crypto_service

    async def create(self, data: DockerHostCreate, created_by: UUID) -> DockerHostResponse:
        tags_json = json.dumps(data.tags)
        enc_password = None
        enc_key = None
        enc_passphrase = None

        if data.password and self.crypto:
            enc_password = self.crypto.encrypt(data.password)
        if data.ssh_key and self.crypto:
            enc_key = self.crypto.encrypt(data.ssh_key)
        if data.ssh_key_passphrase and self.crypto:
            enc_passphrase = self.crypto.encrypt(data.ssh_key_passphrase)

        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """
                INSERT INTO docker_hosts
                (name, host, port, username, auth_type, password_encrypted,
                 ssh_key_encrypted, ssh_key_passphrase_encrypted, default_path,
                 tags, docker_context, created_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id, name, host, port, username, auth_type,
                          default_path, tags, docker_context, is_active,
                          last_connected_at, created_at, updated_at
                """,
                (data.name, data.host, data.port, data.username, data.auth_type,
                 enc_password, enc_key, enc_passphrase, data.default_path,
                 tags_json, data.docker_context, str(created_by))
            )
            row = await cursor.fetchone()
            return self._row_to_response(row)

    async def get_by_id(self, host_id: UUID) -> Optional[DockerHostResponse]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """
                SELECT id, name, host, port, username, auth_type,
                       default_path, tags, docker_context, is_active,
                       last_connected_at, created_at, updated_at
                FROM docker_hosts WHERE id = %s
                """,
                (str(host_id),)
            )
            row = await cursor.fetchone()
            return self._row_to_response(row) if row else None

    async def list(self) -> list[DockerHostResponse]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """
                SELECT id, name, host, port, username, auth_type,
                       default_path, tags, docker_context, is_active,
                       last_connected_at, created_at, updated_at
                FROM docker_hosts ORDER BY name
                """
            )
            rows = await cursor.fetchall()
            return [self._row_to_response(r) for r in rows]

    async def update(self, host_id: UUID, data: DockerHostUpdate) -> DockerHostResponse:
        updates = []
        values = []

        def add(name, val, transform=None):
            if val is not None:
                updates.append(f"{name} = %s")
                values.append(transform(val) if transform else val)

        add("name", data.name)
        add("host", data.host)
        add("port", data.port)
        add("username", data.username)
        add("auth_type", data.auth_type)
        add("default_path", data.default_path)
        add("tags", data.tags, lambda v: json.dumps(v))
        add("docker_context", data.docker_context)
        add("is_active", data.is_active)

        if data.password is not None:
            enc = self.crypto.encrypt(data.password) if self.crypto else data.password
            updates.append("password_encrypted = %s")
            values.append(enc)
        if data.ssh_key is not None:
            enc = self.crypto.encrypt(data.ssh_key) if self.crypto else data.ssh_key
            updates.append("ssh_key_encrypted = %s")
            values.append(enc)
        if data.ssh_key_passphrase is not None:
            enc = self.crypto.encrypt(data.ssh_key_passphrase) if self.crypto else data.ssh_key_passphrase
            updates.append("ssh_key_passphrase_encrypted = %s")
            values.append(enc)

        updates.append("updated_at = NOW()")
        values.append(str(host_id))

        async with db.get_connection() as conn:
            await conn.execute(
                f"UPDATE docker_hosts SET {', '.join(updates)} WHERE id = %s",
                tuple(values)
            )
        return await self.get_by_id(host_id)

    async def delete(self, host_id: UUID):
        async with db.get_connection() as conn:
            await conn.execute("DELETE FROM docker_hosts WHERE id = %s", (str(host_id),))

    async def update_last_connected(self, host_id: UUID):
        async with db.get_connection() as conn:
            await conn.execute(
                "UPDATE docker_hosts SET last_connected_at = NOW() WHERE id = %s",
                (str(host_id),)
            )

    async def get_encrypted_creds(self, host_id: UUID) -> Optional[dict]:
        """Return encrypted credential fields for SSHClient decryption."""
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT auth_type, password_encrypted, ssh_key_encrypted, ssh_key_passphrase_encrypted FROM docker_hosts WHERE id = %s",
                (str(host_id),)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    def _row_to_response(self, row) -> DockerHostResponse:
        tags_raw = row.get("tags", "[]")
        if isinstance(tags_raw, str):
            tags = json.loads(tags_raw)
        else:
            tags = tags_raw or []
        return DockerHostResponse(
            id=str(row["id"]),
            name=row["name"],
            host=row["host"],
            port=row["port"],
            username=row["username"],
            auth_type=row["auth_type"],
            default_path=row.get("default_path", "/opt/docker"),
            tags=tags,
            docker_context=row.get("docker_context"),
            is_active=row.get("is_active", True),
            last_connected_at=row.get("last_connected_at").isoformat() if row.get("last_connected_at") else None,
            created_at=row["created_at"].isoformat() if row.get("created_at") else None,
            updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
        )


class ComposeProjectRepository:
    async def create(self, host_id: UUID, data: ComposeProjectCreate) -> ComposeProjectResponse:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """
                INSERT INTO docker_compose_projects (host_id, name, path)
                VALUES (%s, %s, %s)
                RETURNING id, host_id, name, path, services, is_active, created_at, updated_at
                """,
                (str(host_id), data.name, data.path)
            )
            row = await cursor.fetchone()
            return self._row_to_response(row)

    async def list_by_host(self, host_id: UUID) -> list[ComposeProjectResponse]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM docker_compose_projects WHERE host_id = %s ORDER BY name",
                (str(host_id),)
            )
            rows = await cursor.fetchall()
            return [self._row_to_response(r) for r in rows]

    async def get_by_id(self, project_id: UUID) -> Optional[ComposeProjectResponse]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM docker_compose_projects WHERE id = %s",
                (str(project_id),)
            )
            row = await cursor.fetchone()
            return self._row_to_response(row) if row else None

    async def update_services(self, project_id: UUID, services: list[str]):
        async with db.get_connection() as conn:
            await conn.execute(
                "UPDATE docker_compose_projects SET services = %s, updated_at = NOW() WHERE id = %s",
                (json.dumps(services), str(project_id))
            )

    async def delete(self, project_id: UUID):
        async with db.get_connection() as conn:
            await conn.execute("DELETE FROM docker_compose_projects WHERE id = %s", (str(project_id),))

    def _row_to_response(self, row) -> ComposeProjectResponse:
        services_raw = row.get("services", "[]")
        services = json.loads(services_raw) if isinstance(services_raw, str) else (services_raw or [])
        return ComposeProjectResponse(
            id=str(row["id"]),
            host_id=str(row["host_id"]),
            name=row["name"],
            path=row["path"],
            services=services,
            is_active=row.get("is_active", True),
        )


class DeployTemplateRepository:
    async def create(self, data: DeployTemplateCreate) -> DeployTemplateResponse:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """
                INSERT INTO docker_deploy_templates
                (name, description, image, default_ports, default_envs,
                 default_volumes, restart_policy, is_system)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING id, name, description, image, default_ports, default_envs,
                          default_volumes, restart_policy, is_system, created_at
                """,
                (data.name, data.description, data.image,
                 json.dumps([p.model_dump() for p in data.default_ports]),
                 json.dumps([e.model_dump() for e in data.default_envs]),
                 json.dumps([v.model_dump() for v in data.default_volumes]),
                 data.restart_policy, data.is_system)
            )
            row = await cursor.fetchone()
            return self._row_to_response(row)

    async def list(self) -> list[DeployTemplateResponse]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM docker_deploy_templates ORDER BY is_system DESC, name"
            )
            rows = await cursor.fetchall()
            return [self._row_to_response(r) for r in rows]

    async def get_by_id(self, template_id: UUID) -> Optional[DeployTemplateResponse]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM docker_deploy_templates WHERE id = %s",
                (str(template_id),)
            )
            row = await cursor.fetchone()
            return self._row_to_response(row) if row else None

    async def delete(self, template_id: UUID):
        async with db.get_connection() as conn:
            # Can't delete system templates
            await conn.execute(
                "DELETE FROM docker_deploy_templates WHERE id = %s AND is_system = FALSE",
                (str(template_id),)
            )

    def _row_to_response(self, row) -> DeployTemplateResponse:
        from ..docker.models import PortMapping, EnvVar, VolumeMount
        def parse_json(raw, model_cls):
            if isinstance(raw, str):
                return [model_cls(**x) for x in json.loads(raw)]
            return raw or []
        return DeployTemplateResponse(
            id=str(row["id"]),
            name=row["name"],
            description=row.get("description"),
            image=row["image"],
            default_ports=parse_json(row.get("default_ports", "[]"), PortMapping),
            default_envs=parse_json(row.get("default_envs", "[]"), EnvVar),
            default_volumes=parse_json(row.get("default_volumes", "[]"), VolumeMount),
            restart_policy=row.get("restart_policy", "no"),
            is_system=row.get("is_system", False),
            created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        )


class ContainerLogRepository:
    async def create(self, data: ContainerLogCreate) -> ContainerLogResponse:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """
                INSERT INTO container_logs (host_id, container_id, container_name,
                                          content, stream, timestamp)
                VALUES (%s,%s,%s,%s,%s,%s)
                RETURNING id, host_id, container_id, container_name, content, stream,
                          timestamp, created_at
                """,
                (data.host_id, data.container_id, data.container_name,
                 data.content, data.stream, data.timestamp)
            )
            row = await cursor.fetchone()
            return ContainerLogResponse(
                id=str(row["id"]),
                host_id=str(row["host_id"]),
                container_id=str(row["container_id"]),
                container_name=str(row["container_name"]),
                content=str(row["content"]),
                stream=str(row["stream"]),
                timestamp=str(row["timestamp"]) if row["timestamp"] else None,
                created_at=row["created_at"].isoformat() if row.get("created_at") else None,
            )

    async def list_by_container(self, container_id: str, host_id: str, limit: int = 100) -> list[ContainerLogResponse]:
        async with db.get_connection() as conn:
            cursor = await conn.execute(
                """
                SELECT * FROM container_logs
                WHERE container_id = %s AND host_id = %s
                ORDER BY created_at DESC LIMIT %s
                """,
                (container_id, host_id, limit)
            )
            rows = await cursor.fetchall()
            return [
                ContainerLogResponse(
                    id=str(r["id"]), host_id=str(r["host_id"]),
                    container_id=str(r["container_id"]),
                    container_name=str(r["container_name"]),
                    content=str(r["content"]), stream=str(r["stream"]),
                    timestamp=str(r["timestamp"]) if r["timestamp"] else None,
                    created_at=r["created_at"].isoformat() if r.get("created_at") else None,
                ) for r in rows
            ]
