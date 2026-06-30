"""Git operations over SSH."""
from typing import Optional
from uuid import UUID

from .ssh_client import SSHClient, SSHError
from .repository import DockerHostRepository


class GitService:
    def __init__(self, host_repo: DockerHostRepository, crypto_service, host_id: UUID):
        self.host_repo = host_repo
        self.crypto = crypto_service
        self.host_id = host_id

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

    def _git_cmd(self, *args: str) -> str:
        """Build a git command string with proper shell quoting.
        Filters out empty strings to prevent '' being passed as arguments."""
        import shlex
        valid = [a for a in args if a]
        return "git " + " ".join(shlex.quote(a) for a in valid)

    async def clone(
        self,
        url: str,
        path: str,
        branch: Optional[str] = None,
        depth: Optional[int] = None,
    ) -> str:
        ssh = await self._get_ssh_client()
        args = ["clone"]
        if branch:
            args.extend(["--branch", branch])
        if depth:
            args.extend(["--depth", str(depth)])
        args.extend([url, path])
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=300)
        if code != 0:
            raise SSHError(f"git clone failed: {stderr}")
        return stdout + stderr

    async def pull(self, path: str, rebase: bool = False) -> str:
        ssh = await self._get_ssh_client()
        args = ["-C", path, "pull"]
        if rebase:
            args.append("--rebase")
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=120)
        if code != 0:
            raise SSHError(f"git pull failed: {stderr}")
        return stdout + stderr

    async def fetch(self, path: str, all_remotes: bool = True) -> str:
        ssh = await self._get_ssh_client()
        args = ["-C", path, "fetch"]
        if all_remotes:
            args.append("--all")
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=120)
        if code != 0:
            raise SSHError(f"git fetch failed: {stderr}")
        return stdout + stderr

    async def checkout(self, path: str, branch: str, create: bool = False) -> str:
        ssh = await self._get_ssh_client()
        if not branch:
            raise SSHError("git checkout failed: branch name is required")
        args = ["-C", path, "checkout"]
        if create:
            if "/" in branch:
                # Remote ref → create local tracking branch (--track <remote/branch>)
                args.extend(["--track", branch])
            else:
                args.extend(["-b", branch])
        else:
            args.append(branch)
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=60)
        if code != 0:
            raise SSHError(f"git checkout failed: {stderr}")
        return stdout + stderr

    async def branch_list(self, path: str) -> list[dict]:
        ssh = await self._get_ssh_client()
        cmd = self._git_cmd("-C", path, "branch", "-a",
                            "--format=%(refname:short)|%(objectname:short)|%(upstream:short)")
        stdout, stderr, code = await ssh.exec(cmd, timeout=30)
        if code != 0:
            if "not a git" in stderr.lower() or "fatal" in stderr.lower():
                return []
            raise SSHError(f"git branch failed: {stderr}")

        branches = []
        current = None
        cmd2 = self._git_cmd("-C", path, "rev-parse", "--abbrev-ref", "HEAD")
        stdout2, _, code2 = await ssh.exec(cmd2, timeout=10)
        if code2 == 0:
            current = stdout2.strip()
        # Also get HEAD hash for detached state detection
        current_hash = None
        cmd3 = self._git_cmd("-C", path, "rev-parse", "HEAD")
        stdout3, _, code3 = await ssh.exec(cmd3, timeout=10)
        if code3 == 0:
            current_hash = stdout3.strip()

        for line in stdout.strip().splitlines():
            if not line.strip():
                continue
            parts = line.split("|", 2)
            name = parts[0].strip()
            if name in ("origin", "upstream", "HEAD") or name.startswith("HEAD "):
                continue
            hash_part = parts[1].strip() if len(parts) > 1 and parts[1].strip() else None
            is_current = (
                name == current or
                (hash_part and current_hash and current_hash.startswith(hash_part))
            )
            branches.append({
                "name": name,
                "hash": parts[1].strip() if len(parts) > 1 and parts[1].strip() else None,
                "upstream": parts[2].strip() if len(parts) > 2 and parts[2].strip() else None,
                "is_current": is_current,
                "is_remote": name.startswith("remotes/") or "/" in name,
            })
        return branches

    async def log(self, path: str, n: int = 20, branch: Optional[str] = None) -> list[dict]:
        ssh = await self._get_ssh_client()
        args = ["-C", path, "log", f"--format=%H|%an|%ae|%ad|%s", f"-{n}", "--date=iso"]
        if branch:
            args.append(branch)
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=30)
        if code != 0:
            raise SSHError(f"git log failed: {stderr}")

        commits = []
        for line in stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("|", 4)
            commits.append({
                "hash": parts[0] if len(parts) > 0 else "",
                "author": parts[1] if len(parts) > 1 else "",
                "email": parts[2] if len(parts) > 2 else "",
                "date": parts[3] if len(parts) > 3 else "",
                "message": parts[4] if len(parts) > 4 else "",
            })
        return commits

    async def status(self, path: str, porcelain: bool = True) -> dict:
        ssh = await self._get_ssh_client()
        args = ["-C", path, "status"]
        if porcelain:
            args.append("--porcelain")
        args.append("-b")
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=30)
        if code != 0:
            raise SSHError(f"git status failed: {stderr}")

        lines = stdout.strip().split("\n")
        branch_line = ""
        changes = {"staged": [], "unstaged": [], "untracked": []}

        for line in lines:
            if line.startswith("##"):
                branch_line = line
            elif line.startswith(" "):
                status_code = line[1:3]
                file_path = line[3:].strip()
                changes["unstaged"].append({"status": status_code, "file": file_path})
            elif line.startswith("?"):
                changes["untracked"].append({"file": line[3:].strip()})
            elif line.startswith("!"):
                changes.setdefault("ignored", []).append({"file": line[3:].strip()})
            else:
                status_code = line[0:2]
                file_path = line[3:].strip()
                changes["staged"].append({"status": status_code, "file": file_path})

        current_branch = ""
        tracking_branch = ""
        if "..." in branch_line:
            parts = branch_line.replace("## ", "").split("...")
            current_branch = parts[0].strip()
            tracking_branch = parts[1].strip().split(" ")[0] if parts[1] else ""

        return {
            "branch": current_branch,
            "tracking": tracking_branch,
            "ahead": 0,
            "behind": 0,
            "changes": changes,
            "raw": stdout,
        }

    async def remote_list(self, path: str) -> list[dict]:
        ssh = await self._get_ssh_client()
        cmd = self._git_cmd("-C", path, "remote", "-v")
        stdout, stderr, code = await ssh.exec(cmd, timeout=15)
        if code != 0:
            raise SSHError(f"git remote failed: {stderr}")

        remotes = []
        for line in stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split()
            if len(parts) >= 3:
                remotes.append({
                    "name": parts[0],
                    "url": parts[1],
                    "type": parts[2].strip("()"),
                })
        return remotes

    async def remote_add(self, path: str, name: str, url: str) -> str:
        ssh = await self._get_ssh_client()
        cmd = self._git_cmd("-C", path, "remote", "add", name, url)
        stdout, stderr, code = await ssh.exec(cmd, timeout=30)
        if code != 0:
            raise SSHError(f"git remote add failed: {stderr}")
        return stdout + stderr

    async def push(
        self,
        path: str,
        remote: str = "origin",
        branch: Optional[str] = None,
        set_upstream: bool = False,
        force: bool = False,
    ) -> str:
        ssh = await self._get_ssh_client()
        args = ["-C", path, "push"]
        if force:
            args.append("--force")
        if set_upstream:
            args.append("-u")
        args.append(remote)
        if branch:
            args.append(branch)
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=120)
        if code != 0:
            raise SSHError(f"git push failed: {stderr}")
        return stdout + stderr

    async def stash(self, path: str, message: Optional[str] = None, pop: bool = False) -> str:
        ssh = await self._get_ssh_client()
        if pop:
            args = ["-C", path, "stash", "pop"]
        else:
            args = ["-C", path, "stash"]
            if message:
                args.extend(["push", "-m", message])
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=60)
        if code != 0:
            raise SSHError(f"git stash failed: {stderr}")
        return stdout + stderr

    async def diff(self, path: str, staged: bool = False, branch: Optional[str] = None) -> str:
        ssh = await self._get_ssh_client()
        args = ["-C", path, "diff"]
        if staged:
            args.append("--cached")
        if branch:
            args.append(branch)
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=30)
        if code != 0:
            raise SSHError(f"git diff failed: {stderr}")
        return stdout + stderr

    async def reset(self, path: str, target: str = "HEAD", hard: bool = False) -> str:
        ssh = await self._get_ssh_client()
        args = ["-C", path, "reset"]
        if hard:
            args.append("--hard")
        args.append(target)
        cmd = self._git_cmd(*args)
        stdout, stderr, code = await ssh.exec(cmd, timeout=30)
        if code != 0:
            raise SSHError(f"git reset failed: {stderr}")
        return stdout + stderr

    async def rev_parse(self, path: str, ref: str = "HEAD") -> str:
        ssh = await self._get_ssh_client()
        cmd = self._git_cmd("-C", path, "rev-parse", ref)
        stdout, stderr, code = await ssh.exec(cmd, timeout=15)
        if code != 0:
            raise SSHError(f"git rev-parse failed: {stderr}")
        return stdout.strip()

    async def guess_remote_url(self, path: str) -> str:
        """Guess the web URL of the remote repository."""
        remotes = await self.remote_list(path)
        if not remotes:
            return ""
        url = remotes[0]["url"]
        if url.startswith("git@"):
            url = url[4:]
            url = url.replace(":", "/")
        url = url.rstrip(".git")
        if "gitlab" in url:
            return f"https://{url}"
        elif "github" in url:
            return f"https://{url}"
        elif "bitbucket" in url:
            return f"https://{url}"
        return f"https://{url}"

    async def list_dir(self, path: str) -> dict:
        """List directory contents via SSH."""
        ssh = await self._get_ssh_client()
        cmd = f"ls -1F {path} 2>/dev/null || echo ''"
        stdout, stderr, code = await ssh.exec(cmd, timeout=15)

        entries = []
        for line in stdout.strip().splitlines():
            if not line.strip():
                continue
            name = line.rstrip("\n")
            is_dir = name.endswith("/")
            is_link = name.endswith("@")
            is_exec = name.endswith("*")
            display = name.rstrip("/@*")
            entries.append({
                "name": display,
                "is_dir": is_dir,
                "is_link": is_link,
                "is_exec": is_exec,
            })
        return {
            "path": path,
            "entries": entries,
        }
