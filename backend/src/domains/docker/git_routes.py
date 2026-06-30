"""Git management HTTP routes — non-git paths handled gracefully."""
import json
from uuid import UUID
from robyn import Request

from .git_service import GitService
from .ssh_client import SSHError
from .repository import DockerHostRepository
from .crypto import CryptoService
from ...utils import json_response

_CRYPTO = CryptoService()
_HOST_REPO = DockerHostRepository(crypto_service=_CRYPTO)


def _get_service(request: Request, host_id: str) -> GitService:
    return GitService(_HOST_REPO, _CRYPTO, UUID(host_id))


async def git_clone(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        url = body.get("url", "").strip()
        path = body.get("path", "").strip()
        branch = body.get("branch") or None
        depth = body.get("depth")
        if not url or not path:
            return json_response({"error": "url and path are required"}, 400)
        service = _get_service(request, host_id)
        result = await service.clone(url, path, branch=branch, depth=depth)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_pull(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        rebase = body.get("rebase", False)
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        result = await service.pull(path, rebase=rebase)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_fetch(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        result = await service.fetch(path)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_checkout(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        branch = body.get("branch", "").strip()
        create = body.get("create", False)
        if not path or not branch:
            return json_response({"error": "path and branch are required"}, 400)
        service = _get_service(request, host_id)
        result = await service.checkout(path, branch, create=create)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_branch_list(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        branches = await service.branch_list(path)
        return json_response({"branches": branches}, 200)
    except SSHError:
        return json_response({"branches": []}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_log(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        n = int(body.get("n", 20))
        branch = body.get("branch") or None
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        commits = await service.log(path, n=n, branch=branch)
        return json_response({"commits": commits}, 200)
    except SSHError:
        return json_response({"commits": []}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_status(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        try:
            status = await service.status(path)
            return json_response(status, 200)
        except SSHError:
            return json_response({
                "branch": "", "tracking": "", "ahead": 0, "behind": 0,
                "changes": {"staged": [], "unstaged": [], "untracked": []},
                "raw": "",
            }, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_remote_list(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        try:
            remotes = await service.remote_list(path)
            return json_response({"remotes": remotes}, 200)
        except SSHError:
            return json_response({"remotes": []}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_remote_add(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        name = body.get("name", "").strip()
        url = body.get("url", "").strip()
        if not path or not name or not url:
            return json_response({"error": "path, name, and url are required"}, 400)
        service = _get_service(request, host_id)
        result = await service.remote_add(path, name, url)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_push(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        remote = body.get("remote", "origin")
        branch = body.get("branch") or None
        set_upstream = body.get("set_upstream", False)
        force = body.get("force", False)
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        result = await service.push(path, remote=remote, branch=branch,
                                    set_upstream=set_upstream, force=force)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_stash(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        pop = body.get("pop", False)
        message = body.get("message") or None
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        result = await service.stash(path, message=message, pop=pop)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_diff(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        staged = body.get("staged", False)
        branch = body.get("branch") or None
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        try:
            diff = await service.diff(path, staged=staged, branch=branch)
            return json_response({"diff": diff}, 200)
        except SSHError:
            return json_response({"diff": ""}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_reset(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        target = body.get("target", "HEAD")
        hard = body.get("hard", False)
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        result = await service.reset(path, target=target, hard=hard)
        return json_response({"message": result}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_web_url(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        try:
            url = await service.guess_remote_url(path)
            return json_response({"url": url}, 200)
        except SSHError:
            return json_response({"url": ""}, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)


async def git_ls_dir(request: Request):
    try:
        host_id = request.path_params.get("host_id")
        body = json.loads(request.body)
        path = body.get("path", "").strip()
        if not path:
            return json_response({"error": "path is required"}, 400)
        service = _get_service(request, host_id)
        result = await service.list_dir(path)
        return json_response(result, 200)
    except Exception as e:
        return json_response({"error": str(e)}, 500)
