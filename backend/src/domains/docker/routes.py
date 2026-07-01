"""Docker management HTTP routes."""
import json
from uuid import UUID
from robyn import Request

from .models import (
    DockerHostCreate, DockerHostUpdate, DeployRequest,
    ComposeProjectCreate, DeployTemplateCreate,
)
from .repository import (
    DockerHostRepository, ComposeProjectRepository,
    DeployTemplateRepository, ContainerLogRepository,
)
from .service import DockerService
from .crypto import CryptoService
from ...utils import json_response, get_header
from ...config import settings


_CRYPTO = CryptoService()
_HOST_REPO = DockerHostRepository(crypto_service=_CRYPTO)
_COMPOSE_REPO = ComposeProjectRepository()
_TEMPLATE_REPO = DeployTemplateRepository()
_LOG_REPO = ContainerLogRepository()


def _get_service(request: Request, host_id: str) -> DockerService:
    """Get a service instance for a given host ID."""
    return DockerService(_HOST_REPO, _CRYPTO, UUID(host_id))


def _get_user_id(request: Request) -> str:
    """Extract user ID from auth middleware. Return a valid UUID hex string."""
    uid = getattr(request, "user_id", None)
    if uid:
        # uid may already be a UUID; try to convert
        try:
            return str(UUID(str(uid)))
        except ValueError:
            pass
    return "00000000-0000-0000-0000-000000000000"  # system / nil UUID


async def _verify_ssh_password(request: Request, host_id: str) -> bool:
    """Verify X-SSH-Password header matches decrypted stored password.
    Returns True if match (or password auth not used)."""
    header_pass = get_header(request, "x-ssh-password")
    if not header_pass:
        return False
    try:
        creds = await _HOST_REPO.get_encrypted_creds(UUID(host_id))
        if not creds:
            return False
        if creds["auth_type"] == "password" and creds["password_encrypted"]:
            stored = _CRYPTO.decrypt(creds["password_encrypted"])
            return stored == header_pass
        # Key-based auth — skip password check
        if creds["auth_type"] == "key":
            return True
    except Exception:
        pass
    return False


async def _verify_login_password(request: Request, user_id: str) -> bool:
    """Verify X-Password header matches user's login password (bcrypt)."""
    from ..auth.repository import UserRepository
    header_pw = get_header(request, "x-password")
    if not header_pw:
        return False
    try:
        import bcrypt
        hashed = await UserRepository().get_hashed_password(UUID(user_id))
        if not hashed:
            return False
        hash_bytes = hashed.encode() if isinstance(hashed, str) else hashed
        return bcrypt.checkpw(header_pw.encode(), hash_bytes)
    except Exception:
        return False

async def list_hosts(request: Request):
    try:
        hosts = await _HOST_REPO.list()
        return json_response([h.model_dump() for h in hosts], 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def create_host(request: Request):
    try:
        body = json.loads(request.body)
        data = DockerHostCreate(**body)
        user_id = UUID(_get_user_id(request))
        
        # Prevent duplicate — same host + port + username
        existing = await _HOST_REPO.list()
        for h in existing:
            if h.host == data.host and h.port == data.port and h.username == data.username:
                return json_response({"error": f"Host {data.host}:{data.port} already exists for user {data.username}"}, 409)
        
        host = await _HOST_REPO.create(data, user_id)
        return json_response(host.model_dump(), 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_host(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        host = await _HOST_REPO.get_by_id(UUID(host_id))
        if not host:
            return json_response({"error": "Host not found"}, 404)
        return json_response(host.model_dump(), 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def update_host(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        data = DockerHostUpdate(**body)
        host = await _HOST_REPO.update(UUID(host_id), data)
        return json_response(host.model_dump(), 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def delete_host(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        # Extract user from JWT (Docker routes don't have require_auth middleware)
        from ..auth.service import auth_service
        auth_header = get_header(request, "Authorization", "")
        if not auth_header.startswith("Bearer "):
            return json_response({"error": "Unauthorized"}, 401)
        user_id = auth_service.verify_token(auth_header[7:])
        if not await _verify_login_password(request, user_id):
            return json_response({"error": "Invalid login password (X-Password header)"}, 401)
        await _HOST_REPO.delete(UUID(host_id))
        return json_response({"message": "Host deleted"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def test_host_connection(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        decrypt_error = False
        try:
            service = _get_service(request, host_id)
            result = await service.test_connection()
        except ValueError as ve:
            decrypt_error = True
            result = {"status": "offline", "error": str(ve)}
        except Exception as ve:
            result = {"status": "offline", "error": str(ve)}

        if result.get("status") == "online" and not decrypt_error:
            await _HOST_REPO.update_last_connected(UUID(host_id))

        return json_response(result, 200)
    except Exception as e:
        return json_response({"error": str(e), "status": "offline"}, 500)


async def test_credentials(request: Request):
    """Test SSH credentials without creating a host."""
    try:
        body = json.loads(request.body)
        from .ssh_client import SSHClient
        ssh = SSHClient(
            host=body.get("host", ""),
            port=int(body.get("port", 22)),
            username=body.get("username", ""),
            auth_type=body.get("auth_type", "password"),
            password=body.get("password", ""),
            ssh_key=body.get("ssh_key", ""),
            ssh_key_passphrase=body.get("ssh_key_passphrase", ""),
        )
        result = await ssh.test_connection()
        return json_response(result, 200)
    except Exception as e:
        return json_response({"status": "offline", "error": str(e)}, 200)


async def host_monitor(request: Request):
    """GET /docker/hosts/:host_id/monitor — storage, cpu, mem, uptime, docker df."""
    try:
        host_id = request.path_params.get("host_id")
        service = _get_service(request, host_id)
        result = await service.monitor()
        return json_response(result, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# ═══════════════════════════════════════════════
#  CONTAINER OPERATIONS
# ═══════════════════════════════════════════════

async def list_containers(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        all_flag = request.query_params.get("all", "true").lower() == "true"
        service = _get_service(request, host_id)
        containers = await service.list_containers(all_containers=all_flag)
        return json_response([c.model_dump() for c in containers], 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_inspect(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        service = _get_service(request, host_id)
        info = await service.container_inspect(container_id)
        return json_response(info.model_dump(), 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_stats(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        service = _get_service(request, host_id)
        stats = await service.container_stats(container_id)
        return json_response(stats.model_dump(), 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_logs(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        tail = int(request.query_params.get("tail", "100"))
        timestamps = request.query_params.get("timestamps", "false").lower() == "true"
        service = _get_service(request, host_id)
        logs = await service.container_logs(container_id, tail=tail, timestamps=timestamps)
        return json_response({"logs": logs}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_start(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        service = _get_service(request, host_id)
        result = await service.container_action(container_id, "start")
        return json_response(result, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_stop(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        service = _get_service(request, host_id)
        result = await service.container_action(container_id, "stop")
        return json_response(result, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_restart(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        service = _get_service(request, host_id)
        result = await service.container_action(container_id, "restart")
        return json_response(result, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_remove(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        if not await _verify_ssh_password(request, host_id):
            return json_response({"error": "SSH password required via X-SSH-Password header"}, 401)
        service = _get_service(request, host_id)
        result = await service.container_action(container_id, "remove")
        return json_response(result, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_exec(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        container_id = body.get("container_id")
        command = body.get("command", "sh")
        service = _get_service(request, host_id)
        stdout, stderr, code = await service.container_exec(container_id, command)
        return json_response({"stdout": stdout, "stderr": stderr, "exit_code": code}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def container_replica(request: Request):
    """Scale a container to N replicas (compose-only currently)."""
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        body = json.loads(request.body)
        replicas = int(body.get("replicas", 1))
        compose_path = body.get("compose_path")
        service = _get_service(request, host_id)
        result = await service.scale_replica(container_id, replicas, compose_path=compose_path)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# ═══════════════════════════════════════════════
#  IMAGE OPERATIONS
# ═══════════════════════════════════════════════

async def list_images(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        service = _get_service(request, host_id)
        images = await service.list_images()
        return json_response([i.model_dump() for i in images], 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def pull_image(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        image = body.get("image", "")
        if not image:
            return json_response({"error": "Image name required"}, 400)
        service = _get_service(request, host_id)
        result = await service.pull_image(image)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def remove_image(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        image_id = request.path_params.get("image_id")
        if not await _verify_ssh_password(request, host_id):
            return json_response({"error": "SSH password required via X-SSH-Password header"}, 401)
        force = request.query_params.get("force", "false").lower() == "true"
        service = _get_service(request, host_id)
        result = await service.remove_image(image_id, force=force)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def bulk_remove_images(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        if not await _verify_ssh_password(request, host_id):
            return json_response({"error": "SSH password required via X-SSH-Password header"}, 401)
        body = json.loads(request.body)
        image_ids = body.get("image_ids", [])
        if not image_ids:
            return json_response({"error": "No images specified"}, 400)
        service = _get_service(request, host_id)
        results = []
        for img_id in image_ids:
            try:
                result = await service.remove_image(img_id, force=True)
                results.append({"id": img_id, "status": "deleted", "message": result})
            except Exception as e:
                results.append({"id": img_id, "status": "error", "message": str(e)})
        return json_response({"results": results}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# ═══════════════════════════════════════════════
#  VOLUME OPERATIONS
# ═══════════════════════════════════════════════

async def list_volumes(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        service = _get_service(request, host_id)
        volumes = await service.list_volumes()
        return json_response([v.model_dump() for v in volumes], 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def remove_volume(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        volume_name = request.path_params.get("volume_name")
        service = _get_service(request, host_id)
        result = await service.remove_volume(volume_name)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# ═══════════════════════════════════════════════
#  COMPOSE OPERATIONS
# ═══════════════════════════════════════════════

async def list_compose_projects(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        projects = await _COMPOSE_REPO.list_by_host(UUID(host_id))

        # Get status for each project
        for proj in projects:
            try:
                service = _get_service(request, host_id)
                status = await service.compose_status(proj.path)
                proj.status = "running" if status.get("running", 0) > 0 else "stopped"
            except Exception:
                proj.status = "unknown"

        return json_response([p.model_dump() for p in projects], 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def add_compose_project(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        data = ComposeProjectCreate(**body)
        project = await _COMPOSE_REPO.create(UUID(host_id), data)

        # Detect services
        service = _get_service(request, host_id)
        services = await service.compose_services(data.path)
        await _COMPOSE_REPO.update_services(UUID(project.id), services)

        return json_response(project.model_dump(), 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def compose_up(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        project_id = request.path_params.get("project_id")
        project = await _COMPOSE_REPO.get_by_id(UUID(project_id))
        if not project:
            return json_response({"error": "Project not found"}, 404)
        build = request.query_params.get("build", "false").lower() == "true"
        service = _get_service(request, host_id)
        result = await service.compose_up(project.path, build=build)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def compose_build(request: Request):
    """Build images for a registered compose project."""
    try:
        host_id = request.path_params.get("host_id")
        project_id = request.path_params.get("project_id")
        project = await _COMPOSE_REPO.get_by_id(UUID(project_id))
        if not project:
            return json_response({"error": "Project not found"}, 404)
        body = json.loads(request.body) if request.body else {}
        services = body.get("services", None)
        service = _get_service(request, host_id)
        result = await service.compose_build(project.path, services=services)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def compose_build_up(request: Request):
    """Build + up at an arbitrary path without registering first."""
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        compose_path = body.get("path", "")
        if not compose_path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        # Build first
        build_result = await service.compose_build(compose_path)
        # Then up
        up_result = await service.compose_up(compose_path, build=False)
        return json_response({"build": build_result, "up": up_result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def compose_down(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        project_id = request.path_params.get("project_id")
        project = await _COMPOSE_REPO.get_by_id(UUID(project_id))
        if not project:
            return json_response({"error": "Project not found"}, 404)
        remove_volumes = request.query_params.get("remove_volumes", "false").lower() == "true"
        if not await _verify_ssh_password(request, host_id):
            return json_response({"error": "SSH password required via X-SSH-Password header"}, 401)
        service = _get_service(request, host_id)
        result = await service.compose_down(project.path, remove_volumes=remove_volumes)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def compose_restart(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        project_id = request.path_params.get("project_id")
        project = await _COMPOSE_REPO.get_by_id(UUID(project_id))
        if not project:
            return json_response({"error": "Project not found"}, 404)
        service = _get_service(request, host_id)
        result = await service.compose_restart(project.path)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def compose_scale(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        project_id = request.path_params.get("project_id")
        body = json.loads(request.body)
        service_name = body.get("service", "")
        replicas = int(body.get("replicas", 1))
        project = await _COMPOSE_REPO.get_by_id(UUID(project_id))
        if not project:
            return json_response({"error": "Project not found"}, 404)
        service = _get_service(request, host_id)
        result = await service.compose_scale(project.path, service_name, replicas)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def compose_read_file(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        project_id = request.path_params.get("project_id")
        project = await _COMPOSE_REPO.get_by_id(UUID(project_id))
        if not project:
            return json_response({"error": "Project not found"}, 404)
        service = _get_service(request, host_id)
        content = await service.read_file(project.path)
        return json_response({"path": project.path, "content": content}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def compose_write_file(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        project_id = request.path_params.get("project_id")
        body = json.loads(request.body)
        content = body.get("content", "")

        project = await _COMPOSE_REPO.get_by_id(UUID(project_id))
        if not project:
            return json_response({"error": "Project not found"}, 404)
        service = _get_service(request, host_id)
        result = await service.write_file(project.path, content)

        # Re-detect services after file change
        services = await service.compose_services(project.path)
        await _COMPOSE_REPO.update_services(UUID(project_id), services)

        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def compose_config(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        project_id = request.path_params.get("project_id")
        project = await _COMPOSE_REPO.get_by_id(UUID(project_id))
        if not project:
            return json_response({"error": "Project not found"}, 404)
        service = _get_service(request, host_id)
        config = await service.compose_config(project.path)
        return json_response({"config": config}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# ═══════════════════════════════════════════════
#  SYSTEM OPERATIONS
# ═══════════════════════════════════════════════

async def system_prune(request: Request):
    """Prune Docker system on a host."""
    try:
        host_id = request.path_params.get("host_id")
        if not await _verify_ssh_password(request, host_id):
            return json_response({"error": "SSH password required via X-SSH-Password header"}, 401)
        target = request.query_params.get("target", "all")
        service = _get_service(request, host_id)
        result = await service.system_prune(target)
        return json_response(result, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def bulk_container_action(request: Request):
    """Start/stop/restart multiple containers at once."""
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        container_ids = body.get("container_ids", [])
        action = body.get("action", "")
        if not container_ids or action not in ("start", "stop", "restart"):
            return json_response({"error": "container_ids and action (start|stop|restart) required"}, 400)
        service = _get_service(request, host_id)
        results = await service.bulk_container_action(container_ids, action)
        return json_response(results, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


# ═══════════════════════════════════════════════
#  DEPLOY
# ═══════════════════════════════════════════════

async def deploy_container(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        req = DeployRequest(**body)
        service = _get_service(request, host_id)
        container_id = await service.deploy_container(req)
        return json_response({"container_id": container_id}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def clone_container(request: Request):
    """Clone an existing container: inspect then redeploy with same config."""
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        body = json.loads(request.body)
        new_name = body.get("name", f"{container_id}-clone")

        service = _get_service(request, host_id)
        info = await service.container_inspect(container_id)
        config = info.config
        image = config.get("Image", "")
        env_list = config.get("Env", [])
        ports_config = info.host_config.get("PortBindings", {})
        mounts = info.mounts

        from .models import PortMapping, EnvVar, VolumeMount, DeployRequest

        deploy_req = DeployRequest(
            image=image,
            container_name=new_name,
            ports=[PortMapping(host_port=int(k.split("/")[0].split(":")[0]), container_port=int(k.split("/")[0].split(":")[1])) for k, v in ports_config.items() if ":" in k],
            envs=[EnvVar(key=e.split("=")[0], value="=".join(e.split("=")[1:])) for e in env_list if "=" in e],
            volumes=[VolumeMount(host_path=m.get("Source", ""), container_path=m.get("Destination", ""), read_only=m.get("Mode", "").endswith("ro")) for m in mounts if m.get("Type") == "bind"],
        )
        cid = await service.deploy_container(deploy_req)
        return json_response({"container_id": cid}, 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


# ═══════════════════════════════════════════════
#  TEMPLATES
# ═══════════════════════════════════════════════

async def list_templates(request: Request):
    try:
        templates = await _TEMPLATE_REPO.list()
        return json_response([t.model_dump() for t in templates], 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def create_template(request: Request):
    try:
        body = json.loads(request.body)
        data = DeployTemplateCreate(**body)
        template = await _TEMPLATE_REPO.create(data)
        return json_response(template.model_dump(), 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def delete_template(request: Request):
    try:
        template_id = request.path_params.get("template_id")
        await _TEMPLATE_REPO.delete(UUID(template_id))
        return json_response({"message": "Template deleted"}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


# ═══════════════════════════════════════════════
#  CONTAINER LOGS (DB retention)
# ═══════════════════════════════════════════════

async def save_container_logs(request: Request):
    """Save container logs to DB for later retrieval."""
    try:
        body = json.loads(request.body)
        from .models import ContainerLogCreate
        log = ContainerLogCreate(**body)
        saved = await _LOG_REPO.create(log)
        return json_response(saved.model_dump(), 201)
    except Exception as e:
        return json_response({"error": str(e)}, 400)


async def get_saved_logs(request: Request):
    """Retrieve saved logs from DB."""
    try:
        host_id = request.path_params.get("host_id")
        container_id = request.path_params.get("container_id")
        limit = int(request.query_params.get("limit", "100"))
        logs = await _LOG_REPO.list_by_container(container_id, host_id, limit=limit)
        return json_response([l.model_dump() for l in logs], 200)
    except Exception as e:
        return json_response({"error": str(e)}, 400)
