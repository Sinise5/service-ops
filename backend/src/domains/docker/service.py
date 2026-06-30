import json
import re
from typing import AsyncGenerator, Optional
from uuid import UUID

from .ssh_client import SSHClient, SSHError
from .models import (
    ContainerInfo, ContainerStats, ContainerInspect,
    ImageInfo, VolumeInfo,
    DeployRequest,
)
from .repository import DockerHostRepository


class DockerService:
    def __init__(self, host: DockerHostRepository, crypto_service, host_id: UUID):
        self.host_repo = host
        self.crypto = crypto_service
        self.host_id = host_id
        self._ssh_client: Optional[SSHClient] = None

    async def _get_ssh_client(self) -> SSHClient:
        creds = await self.host_repo.get_encrypted_creds(self.host_id)
        if not creds:
            raise SSHError("Host not found")

        password = None
        ssh_key = None
        passphrase = None

        if creds["auth_type"] == "password" and creds["password_encrypted"]:
            password = self.crypto.decrypt(creds["password_encrypted"])
        elif creds["auth_type"] == "key" and creds["ssh_key_encrypted"]:
            ssh_key = self.crypto.decrypt(creds["ssh_key_encrypted"])
            if creds["ssh_key_passphrase_encrypted"]:
                passphrase = self.crypto.decrypt(creds["ssh_key_passphrase_encrypted"])

        host_info = await self.host_repo.get_by_id(self.host_id)
        return SSHClient(
            host=host_info.host,
            port=host_info.port,
            username=host_info.username,
            auth_type=creds["auth_type"],
            password=password,
            ssh_key=ssh_key,
            ssh_key_passphrase=passphrase,
        )

    async def _run(self, cmd: str, cwd: Optional[str] = None, timeout: int = 30) -> tuple[str, str, int]:
        ssh = await self._get_ssh_client()
        host_info = await self.host_repo.get_by_id(self.host_id)
        work_dir = cwd or host_info.default_path

        # If docker context is set, prepend docker context flag
        if host_info.docker_context:
            cmd = f"docker --context {host_info.docker_context} {cmd}"

        return await ssh.exec(cmd, timeout=timeout, cwd=work_dir)

    def _parse_ps_line(self, line: str) -> Optional[dict]:
        """Parse a single docker ps JSON line."""
        try:
            return json.loads(line.strip())
        except json.JSONDecodeError:
            return None

    # ─── Container Operations ───────────────────
    async def list_containers(self, all_containers: bool = True) -> list[ContainerInfo]:
        flag = "-a" if all_containers else ""
        context_flag = ""
        host_info = await self.host_repo.get_by_id(self.host_id)
        if host_info.docker_context:
            context_flag = f"--context {host_info.docker_context}"

        stdout, stderr, code = await self._run(
            f"docker {context_flag} ps {flag} --format '{{{{json .}}}}'",
            timeout=15
        )
        if code != 0:
            raise SSHError(f"docker ps failed: {stderr}")

        containers = []
        for line in stdout.strip().split("\n"):
            if not line.strip():
                continue
            data = self._parse_ps_line(line)
            if not data:
                continue

            # Parse ports (docker ps format: "0.0.0.0:8080->80/tcp")
            ports = []
            ports_str = data.get("Ports", "")
            if ports_str:
                ports = [p.strip() for p in ports_str.split(", ")]

            containers.append(ContainerInfo(
                container_id=data.get("ID", ""),
                name=data.get("Names", ""),
                image=data.get("Image", ""),
                status=data.get("Status", ""),
                state=data.get("State", ""),
                created=data.get("CreatedAt", ""),
                ports=ports,
                labels={},  # Labels as dict from raw inspect
            ))
        return containers

    async def container_inspect(self, container_id: str) -> ContainerInspect:
        context_flag = ""
        host_info = await self.host_repo.get_by_id(self.host_id)
        if host_info.docker_context:
            context_flag = f"--context {host_info.docker_context}"

        stdout, stderr, code = await self._run(
            f"docker {context_flag} inspect {container_id}",
            timeout=15
        )
        if code != 0:
            raise SSHError(f"docker inspect failed: {stderr}")

        raw = json.loads(stdout)[0]
        state = raw.get("State", {})
        config = raw.get("Config", {})
        network = raw.get("NetworkSettings", {})
        mounts = raw.get("Mounts", [])
        host_config = raw.get("HostConfig", {})

        return ContainerInspect(
            container_id=raw.get("Id", ""),
            name=raw.get("Name", "").lstrip("/"),
            image=raw.get("Config", {}).get("Image", ""),
            image_id=raw.get("Image", ""),
            created=raw.get("Created", ""),
            state=state,
            config=config,
            network_settings=network,
            mounts=mounts,
            host_config=host_config,
            inspect_raw=raw,
        )

    async def container_stats(self, container_id: str, stream: bool = False) -> ContainerStats:
        context_flag = ""
        host_info = await self.host_repo.get_by_id(self.host_id)
        if host_info.docker_context:
            context_flag = f"--context {host_info.docker_context}"

        stream_flag = "" if stream else "--no-stream"
        stdout, stderr, code = await self._run(
            f"docker {context_flag} stats {stream_flag} --no-trunc --format '{{{{json .}}}}' {container_id}",
            timeout=15
        )
        if code != 0:
            raise SSHError(f"docker stats failed: {stderr}")

        line = stdout.strip().split("\n")[0]
        data = json.loads(line)

        # Parse CPU percentage
        cpu_str = data.get("CPUPerc", "0%").replace("%", "")

        # Parse memory
        mem_str = data.get("MemUsage", "0B / 0B")
        mem_parts = mem_str.split(" / ")
        mem_usage = mem_parts[0] if len(mem_parts) > 0 else "N/A"
        mem_total = mem_parts[1] if len(mem_parts) > 1 else "N/A"
        mem_pct = data.get("MemPerc", "0%").replace("%", "")

        return ContainerStats(
            container_id=container_id,
            name=data.get("Name", ""),
            cpu_percent=float(cpu_str) if cpu_str else 0.0,
            mem_usage=f"{mem_usage} / {mem_total}",
            mem_percent=float(mem_pct) if mem_pct else 0.0,
            net_io=data.get("NetIO", "0B / 0B"),
            block_io=data.get("BlockIO", "0B / 0B"),
            pids=int(data.get("PIDs", 0) or 0),
        )

    async def container_logs(
        self, container_id: str, tail: int = 100, timestamps: bool = False
    ) -> str:
        context_flag = ""
        host_info = await self.host_repo.get_by_id(self.host_id)
        if host_info.docker_context:
            context_flag = f"--context {host_info.docker_context}"

        ts_flag = "--timestamps" if timestamps else ""
        stdout, stderr, code = await self._run(
            f"timeout 30 docker {context_flag} logs --tail {tail} {ts_flag} {container_id} 2>&1",
            timeout=60
        )
        # docker logs returns exit code 0 even on error
        return stdout + stderr

    async def container_stream_logs(
        self, container_id: str, tail: int = 100
    ) -> AsyncGenerator[str, None]:
        context_flag = ""
        host_info = await self.host_repo.get_by_id(self.host_id)
        if host_info.docker_context:
            context_flag = f"--context {host_info.docker_context}"

        ssh = await self._get_ssh_client()
        work_dir = host_info.default_path

        cmd = f"docker {context_flag} logs -f --tail {tail} {container_id}"
        async for line in ssh.exec_stream(cmd, cwd=work_dir):
            yield line

    async def container_action(
        self, container_id: str, action: str
    ) -> dict:
        """action: start | stop | restart | remove"""
        if action == "remove":
            cmd = f"docker rm -f {container_id}"
        else:
            cmd = f"docker {action} {container_id}"

        stdout, stderr, code = await self._run(cmd, timeout=30)
        return {"success": code == 0, "message": (stdout + stderr).strip()}

    async def container_exec(
        self, container_id: str, command: str
    ) -> tuple[str, str, int]:
        stdout, stderr, code = await self._run(
            f"docker exec {container_id} sh -c {command!r}",
            timeout=30
        )
        return stdout, stderr, code

    async def deploy_container(self, req: DeployRequest) -> str:
        context_flag = ""
        host_info = await self.host_repo.get_by_id(self.host_id)
        if host_info.docker_context:
            context_flag = f"--context {host_info.docker_context}"

        port_args = " ".join([f"-p {p.host_port}:{p.container_port}/{p.protocol}" for p in req.ports])
        env_args = " ".join([f"-e {e.key}={e.value}" for e in req.envs])
        vol_args = " ".join([f"-v {v.host_path}:{v.container_path}" + (":ro" if v.read_only else "") for v in req.volumes])

        restart_flag = f"--restart {req.restart_policy}" if req.restart_policy != "no" else ""
        priv_flag = "--privileged" if req.privileged else ""
        tty_flag = "-t" if req.tty else ""

        cmd_extra = " ".join(filter(None, [restart_flag, priv_flag, tty_flag]))
        if req.network:
            cmd_extra += f" --network {req.network}"
        if req.command:
            cmd_extra += f" {req.command}"
        if req.workdir:
            cmd_extra += f" -w {req.workdir}"

        cmd = f"docker {context_flag} run -d --name {req.container_name} {port_args} {env_args} {vol_args} {cmd_extra} {req.image}"
        stdout, stderr, code = await self._run(cmd, timeout=60)
        if code != 0:
            raise SSHError(f"docker run failed: {stderr}")
        return stdout.strip()

    async def scale_replica(
        self, service: str, replicas: int, compose_path: Optional[str] = None
    ) -> str:
        if compose_path:
            stdout, stderr, code = await self._run(
                f"docker compose -f {compose_path} up -d --scale {service}={replicas}",
                timeout=60
            )
        else:
            stdout, stderr, code = await self._run(
                f"docker service scale {service}={replicas}",
                timeout=60
            )
        if code != 0:
            raise SSHError(f"Scale failed: {stderr}")
        return stdout.strip()

    # ─── Image Operations ────────────────────────
    async def list_images(self) -> list[ImageInfo]:
        stdout, stderr, code = await self._run(
            "docker images --format '{{json .}}'",
            timeout=15
        )
        if code != 0:
            raise SSHError(f"docker images failed: {stderr}")

        images = []
        for line in stdout.strip().split("\n"):
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                repo_tag = data.get("Repository", "<none>")
                tag = data.get("Tag", "<none>")
                if ":" not in f"{repo_tag}:{tag}":
                    full_tag = f"{repo_tag}:{tag}"
                else:
                    full_tag = f"{repo_tag}"
                images.append(ImageInfo(
                    repository=repo_tag,
                    tag=tag,
                    image_id=data.get("ID", ""),
                    created=data.get("CreatedAt", ""),
                    size=data.get("Size", ""),
                ))
            except json.JSONDecodeError:
                continue
        return images

    async def pull_image(self, image: str) -> str:
        stdout, stderr, code = await self._run(f"docker pull {image}", timeout=300)
        if code != 0:
            raise SSHError(f"docker pull failed: {stderr}")
        return stdout + stderr

    async def remove_image(self, image_id: str, force: bool = False) -> str:
        force_flag = "-f" if force else ""
        stdout, stderr, code = await self._run(
            f"docker rmi {force_flag} {image_id}",
            timeout=30
        )
        return stdout + stderr

    # ─── Volume Operations ──────────────────────
    async def list_volumes(self) -> list[VolumeInfo]:
        stdout, stderr, code = await self._run(
            "docker volume ls --format '{{json .}}'",
            timeout=10
        )
        if code != 0:
            raise SSHError(f"docker volume ls failed: {stderr}")

        volumes = []
        for line in stdout.strip().split("\n"):
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                volumes.append(VolumeInfo(
                    name=data.get("Name", ""),
                    driver=data.get("Driver", "local"),
                    mountpoint=data.get("Mountpoint", ""),
                    scope=data.get("Scope", "local"),
                    labels={},
                ))
            except json.JSONDecodeError:
                continue
        return volumes

    async def remove_volume(self, name: str, force: bool = False) -> str:
        force_flag = "-f" if force else ""
        stdout, stderr, code = await self._run(
            f"docker volume rm {force_flag} {name}",
            timeout=15
        )
        return stdout + stderr

    # ─── Compose Operations ──────────────────────
    async def compose_build(self, project_path: str, services: Optional[list[str]] = None) -> str:
        svc_args = " ".join(services) if services else ""
        cmd = f"docker compose -f {project_path} build {svc_args}"
        stdout, stderr, code = await self._run(cmd, timeout=600)
        if code != 0:
            raise SSHError(f"docker compose build failed: {stderr}")
        return stdout + stderr

    async def compose_up(self, project_path: str, build: bool = False) -> str:
        build_flag = "--build " if build else ""
        stdout, stderr, code = await self._run(
            f"docker compose -f {project_path} up -d {build_flag}".strip(),
            timeout=600
        )
        if code != 0:
            raise SSHError(f"docker compose up failed: {stderr}")
        return stdout + stderr

    async def compose_down(self, project_path: str, remove_volumes: bool = False) -> str:
        vol_flag = "-v" if remove_volumes else ""
        stdout, stderr, code = await self._run(
            f"docker compose -f {project_path} down {vol_flag}",
            timeout=60
        )
        return stdout + stderr

    async def compose_restart(self, project_path: str) -> str:
        stdout, stderr, code = await self._run(
            f"docker compose -f {project_path} restart",
            timeout=60
        )
        if code != 0:
            raise SSHError(f"docker compose restart failed: {stderr}")
        return stdout + stderr

    async def compose_scale(self, project_path: str, service: str, replicas: int) -> str:
        stdout, stderr, code = await self._run(
            f"docker compose -f {project_path} up -d --scale {service}={replicas}",
            timeout=60
        )
        if code != 0:
            raise SSHError(f"docker compose scale failed: {stderr}")
        return stdout + stderr

    async def compose_config(self, project_path: str) -> str:
        stdout, stderr, code = await self._run(
            f"docker compose -f {project_path} config",
            timeout=15
        )
        if code != 0:
            raise SSHError(f"docker compose config failed: {stderr}")
        return stdout

    async def compose_services(self, project_path: str) -> list[str]:
        stdout, stderr, code = await self._run(
            f"docker compose -f {project_path} config --services",
            timeout=15
        )
        if code != 0:
            raise SSHError(f"docker compose config --services failed: {stderr}")
        return [s.strip() for s in stdout.strip().split("\n") if s.strip()]

    async def read_file(self, path: str) -> str:
        stdout, stderr, code = await self._run(f"cat {path}", timeout=10)
        if code != 0:
            raise SSHError(f"Failed to read {path}: {stderr}")
        return stdout

    async def write_file(self, path: str, content: str) -> str:
        # Escape content for shell
        escaped = content.replace("'", "'\\''")
        stdout, stderr, code = await self._run(
            f"cat > {path} << 'DOCKER_EOF'\n{content}\nDOCKER_EOF",
            timeout=15
        )
        if code != 0:
            raise SSHError(f"Failed to write {path}: {stderr}")
        return "File written successfully"

    async def compose_status(self, project_path: str) -> dict:
        """Get running services count."""
        try:
            containers = await self.list_containers(all_containers=False)
            # Filter containers in this compose project
            stdout, _, _ = await self._run(
                f"docker compose -f {project_path} config --project-name",
                timeout=10
            )
            project_name = stdout.strip()
            relevant = [c for c in containers if project_name in c.name or project_path in c.name]
            running = sum(1 for c in relevant if c.state == "running")
            return {"total": len(relevant), "running": running}
        except Exception:
            return {"total": 0, "running": 0}

    # ─── System Operations ─────────────────────────
    async def system_prune(self, target: str = "all") -> dict:
        """Prune docker system: containers, images, volumes, networks.
        target: all | containers | images | volumes | networks
        """
        cmd_map = {
            "all": "docker system prune -af",
            "containers": "docker container prune -f",
            "images": "docker image prune -af",
            "volumes": "docker volume prune -f",
            "networks": "docker network prune -f",
        }
        cmd = cmd_map.get(target, cmd_map["all"])
        stdout, stderr, code = await self._run(cmd, timeout=120)
        return {"target": target, "output": (stdout + stderr).strip(), "code": code}

    async def bulk_container_action(self, container_ids: list[str], action: str) -> dict:
        """Perform action (start|stop|restart) on multiple containers."""
        results = {}
        for cid in container_ids:
            try:
                result = await self.container_action(cid, action)
                results[cid] = {"success": True, "message": result.get("message", "")}
            except Exception as e:
                results[cid] = {"success": False, "error": str(e)}
        return results

    # ─── Connection Test ─────────────────────────
    async def test_connection(self) -> dict:
        ssh = await self._get_ssh_client()
        return await ssh.test_connection()
