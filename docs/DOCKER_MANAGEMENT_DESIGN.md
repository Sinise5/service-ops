# ServiceOps Docker Management — Design Document

**Author:** Hermes Agent  
**Date:** 2026-06-30  
**Status:** Approved — Ready for Implementation

---

## 1. Overview

Tambah menu **Docker** di ServiceOps untuk manage Docker containers, images, volumes, dan Compose projects di remote VM via SSH. User bisa add VM (SSH host/user/password atau SSH key), lalu manage Docker di VM tersebut langsung dari UI ServiceOps.

---

## 2. Architecture

### 2.1 Stack
- **Backend:** Python async (Robyn), SSH via `asyncssh`, Docker CLI wrapper
- **Frontend:** SolidJS + Tailwind (konsisten dengan existing pages)
- **Database:** SQLite (existing ServiceOps DB), tabel baru `docker_hosts`, `docker_containers_cache`
- **Security:** SSH credentials di-encrypt dengan Fernet (AES-128) sebelum disimpan ke DB

### 2.2 SSH + Docker CLI Flow
```
User (Browser)
    ↓ HTTP/WebSocket
ServiceOps Backend (port 8080)
    ↓ SSH (port 22)
Remote VM
    ↓
Docker Engine (CLI: docker ps, docker logs, etc.)
```

### 2.3 Folder Structure

**Backend:**
```
backend/src/domains/docker/
├── __init__.py
├── models.py          # Pydantic models
├── routes.py          # API endpoints
├── repository.py      # DB operations
├── service.py         # SSH + Docker CLI logic
└── ssh_client.py      # AsyncSSH wrapper
```

**Frontend:**
```
frontend/src/pages/DockerPage.tsx       # Main Docker page
frontend/src/components/docker/
│   ├── HostManager.tsx     # Add/edit/delete VM
│   ├── HostCard.tsx         # VM card with connection status
│   ├── ContainerList.tsx   # docker ps output
│   ├── ContainerCard.tsx   # Individual container card
│   ├── ContainerDetail.tsx # Inspect + stats modal
│   ├── ContainerLogs.tsx    # Live logs viewer
│   ├── ImageList.tsx        # docker images
│   ├── VolumeList.tsx       # docker volume ls
│   ├── ComposePanel.tsx    # docker compose management
│   ├── DeployForm.tsx       # Deploy from image form
│   └── ScaleDialog.tsx      # Scale replica dialog
```

---

## 3. Database Schema

### Table: `docker_hosts`
```sql
CREATE TABLE docker_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                    -- Display name (e.g. "Production API Server")
    host TEXT NOT NULL,                    -- IP atau hostname
    port INTEGER DEFAULT 22,               -- SSH port
    username TEXT NOT NULL,                 -- SSH username
    auth_type TEXT DEFAULT 'password',      -- 'password' | 'key'
    password_encrypted TEXT,               -- Fernet encrypted (nullable if key)
    ssh_key_encrypted TEXT,                -- Fernet encrypted private key (nullable if password)
    ssh_key_passphrase_encrypted TEXT,      -- Optional passphrase untuk key
    default_path TEXT DEFAULT '/opt/docker', -- Default Docker project path
    tags TEXT,                              -- JSON array of tags
    is_active BOOLEAN DEFAULT TRUE,
    last_connected_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `docker_container_cache`
```sql
CREATE TABLE docker_container_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES docker_hosts(id) ON DELETE CASCADE,
    container_id TEXT NOT NULL,           -- Docker container ID
    name TEXT NOT NULL,
    image TEXT,
    status TEXT,
    state TEXT,
    created_at TIMESTAMP,
    ports TEXT,                             -- JSON
    labels TEXT,                            -- JSON
    last_fetched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(host_id, container_id)
);
```

### Table: `docker_compose_projects`
```sql
CREATE TABLE docker_compose_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES docker_hosts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    services TEXT,                         -- JSON array of service names
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Encryption Key
- Encryption key disimpan di `backend/.docker_enc_key` (auto-generated on first run)
- Key di-load via environment variable `DOCKER_ENC_KEY` atau fallback ke file
- Fernet encryption → `f.encrypt(password.encode()).decode()`

---

## 4. API Endpoints

### 4.1 Host Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/docker/hosts` | List all Docker hosts |
| POST | `/docker/hosts` | Add new Docker host |
| GET | `/docker/hosts/:id` | Get host detail |
| PUT | `/docker/hosts/:id` | Update host |
| DELETE | `/docker/hosts/:id` | Delete host |
| POST | `/docker/hosts/:id/test` | Test SSH connection |

### 4.2 Container Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/docker/hosts/:id/containers` | List containers (`docker ps -a`) |
| GET | `/docker/hosts/:id/containers/:cid/inspect` | Container inspect |
| GET | `/docker/hosts/:id/containers/:cid/stats` | Real-time stats |
| POST | `/docker/hosts/:id/containers/:cid/start` | Start container |
| POST | `/docker/hosts/:id/containers/:cid/stop` | Stop container |
| POST | `/docker/hosts/:id/containers/:cid/restart` | Restart container |
| DELETE | `/docker/hosts/:id/containers/:cid` | Remove container |
| GET | `/docker/hosts/:id/containers/:cid/logs` | Get logs (with `tail` param) |
| WS | `/docker/hosts/:id/containers/:cid/logs/stream` | Live log streaming |
| POST | `/docker/hosts/:id/containers/exec` | Exec command in container |
| POST | `/docker/hosts/:id/containers/:cid/replica` | Scale replicas |

### 4.3 Image Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/docker/hosts/:id/images` | List images |
| POST | `/docker/hosts/:id/images/pull` | Pull image |
| DELETE | `/docker/hosts/:id/images/:image_id` | Remove image |

### 4.4 Volume Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/docker/hosts/:id/volumes` | List volumes |
| GET | `/docker/hosts/:id/volumes/:name/inspect` | Inspect volume |
| DELETE | `/docker/hosts/:id/volumes/:name` | Remove volume |

### 4.5 Docker Compose
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/docker/hosts/:id/compose/projects` | List compose projects |
| POST | `/docker/hosts/:id/compose/projects` | Add compose project path |
| GET | `/docker/hosts/:id/compose/:project_id/config` | Show compose config |
| POST | `/docker/hosts/:id/compose/:project_id/up` | docker compose up -d |
| POST | `/docker/hosts/:id/compose/:project_id/down` | docker compose down |
| POST | `/docker/hosts/:id/compose/:project_id/restart` | docker compose restart |
| GET | `/docker/hosts/:id/compose/:project_id/services` | List services in compose |
| POST | `/docker/hosts/:id/compose/:project_id/scale` | Scale service replicas |
| PUT | `/docker/hosts/:id/compose/:project_id/files` | Edit docker-compose.yml |

### 4.6 Deploy from Image
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/docker/hosts/:id/deploy` | Deploy container from image |
| GET | `/docker/hosts/:id/deploy/form` | Get deploy form schema |

---

## 5. SSH Client — Implementation Details

### 5.1 AsyncSSH Wrapper
```python
# domains/docker/ssh_client.py
import asyncssh
from asyncssh import connect, SSHClientConnection
from contextlib import asynccontextmanager
import asyncio

class SSHClient:
    def __init__(self, host, port, username, auth_type, password=None, key=None, key_passphrase=None):
        self.host = host
        self.port = port
        self.username = username
        self.auth_type = auth_type
        self.password = password
        self.key = key
        self.key_passphrase = key_passphrase
        self._conn: SSHClientConnection = None

    @asynccontextmanager
    async def connection(self):
        connect_kwargs = {"username": self.username, "port": self.port}
        if self.auth_type == "password":
            connect_kwargs["password"] = self.password
        else:
            connect_kwargs["client_keys"] = [self.key]
            if self.key_passphrase:
                connect_kwargs["passphrase"] = self.key_passphrase

        async with connect(self.host, **connect_kwargs) as conn:
            self._conn = conn
            yield conn

    async def exec(self, command: str, timeout: int = 30) -> tuple[str, str, int]:
        async with self.connection() as conn:
            result = await conn.run(command, timeout=timeout)
            return result.stdout, result.stderr, result.exit_status

    async def exec_stream(self, command: str):
        """Return async iterator for streaming output (logs)"""
        async with self.connection() as conn:
            async with conn.create_process(command) as process:
                async for line in process.stdout:
                    yield line
```

### 5.2 Docker CLI Wrapper
```python
# domains/docker/service.py

class DockerService:
    def __init__(self, ssh_client: SSHClient, working_dir: str = "/opt/docker"):
        self.ssh = ssh_client
        self.working_dir = working_dir

    async def docker_command(self, args: str, timeout: int = 30) -> DockerResult:
        cmd = f"docker {args}"
        stdout, stderr, code = await self.ssh.exec(cmd, timeout=timeout)
        return DockerResult(stdout=stdout, stderr=stderr, code=code)

    # Container operations
    async def list_containers(self, all_containers: bool = True) -> list[Container]:
        flag = "-a" if all_containers else ""
        stdout, _, _ = await self.docker_command(f"ps {flag} --format '{{json .}}'")
        return [Container(**json.loads(line)) for line in stdout.strip().split("\n") if line]

    async def get_logs(self, container_id: str, tail: int = 100) -> str:
        stdout, _, _ = await self.docker_command(f"logs {container_id} --tail {tail}")
        return stdout

    async def deploy_container(self, image: str, name: str, ports: dict, envs: dict, volumes: list, detach: bool = True) -> str:
        port_args = " ".join([f"-p {host}:{container}" for host, container in ports.items()])
        env_args = " ".join([f"-e {k}={v}" for k, v in envs.items()])
        vol_args = " ".join([f"-v {v}" for v in volumes])
        cmd = f"run -d --name {name} {port_args} {env_args} {vol_args} {image}"
        stdout, _, code = await self.docker_command(cmd)
        return stdout.strip()

    async def scale_replica(self, container_id_or_name: str, replicas: int, compose_path: str = None) -> str:
        if compose_path:
            # Scale via docker compose
            cmd = f"compose -f {compose_path} scale {container_id_or_name}={replicas}"
        else:
            # Swarm mode or single container
            cmd = f"service scale {container_id_or_name}={replicas}"
        stdout, stderr, code = await self.docker_command(cmd, timeout=60)
        return stdout
```

---

## 6. Frontend — UI Design

### 6.1 Navigation
Tambah sidebar item: **Docker** (icon: `SiDocker`)

### 6.2 Page Layout
```
┌─────────────────────────────────────────────────────────┐
│ [Docker icon] Docker Management              [+ Add VM] │
├─────────────────────────────────────────────────────────┤
│ Filter: [All Hosts ▼] [Running] [Stopped] [All]        │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│ │ VM Card     │ │ VM Card     │ │ VM Card     │       │
│ │ ○ Online    │ │ ○ Online    │ │ ● Offline   │       │
│ │ 3 containers│ │ 12 running  │ │ 0 containers│       │
│ │ prod-api-1  │ │ staging     │ │ broken-vm   │       │
│ │ [Connect ▶] │ │ [Connect ▶] │ │ [Retry]    │       │
│ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### 6.3 VM Card States
- **Online** (green dot) — SSH connected, can list containers
- **Offline** (red dot) — SSH failed, show error
- **Connecting** (yellow dot, spinner) — testing connection

### 6.4 Container List (setelah klik VM)
```
┌────────────────────────────────────────────────────────────────────┐
│ prod-api-1          ○ Connected          [Refresh] [🔍 Filter]     │
│ /opt/docker                                        [Terminal] [📦]  │
├────────────────────────────────────────────────────────────────────┤
│ Name         │ Image         │ Status  │ Ports      │ Actions    │
│──────────────┼───────────────┼─────────┼────────────┼────────────│
│ nginx-proxy  │ nginx:alpine   │ ● Run   │ :80→8080   │ ▶ ⏹ 🔄 🗑  │
│ api-server   │ myapp:v2.1     │ ● Run   │ :3000      │ ▶ ⏹ 🔄 🗑  │
│ postgres-db  │ postgres:16    │ ● Run   │ :5432      │ ▶ ⏹ 🔄 🗑  │
│ redis-cache  │ redis:7        │ ○ Stop  │ —          │ ▶ ⏹ 🔄 🗑  │
│ backup-cron  │ cron:latest    │ ○ Exit  │ —          │ ▶ ⏹ 🔄 🗑  │
└────────────────────────────────────────────────────────────────────┘
```

**Status indicators:** 🟢 Running | 🔴 Stopped | 🟡 Restarting | ⚫ Exited

**Action buttons per row:**
- ▶ Start (if stopped)
- ⏹ Stop (if running)
- 🔄 Restart
- 📊 Stats (opens modal)
- 📜 Logs (opens live log viewer)
- 🔍 Inspect (opens detail modal)
- 🗑 Remove
- ⚙️ Edit/Scale (opens dialog)

### 6.5 Container Detail Modal
```
┌─────────────────────────────────────────────────────────┐
│ Container Detail — api-server                    [✕]    │
├─────────────────────────────────────────────────────────┤
│ [Tabs: Overview | Env Vars | Ports | Volumes | Logs]   │
├─────────────────────────────────────────────────────────┤
│ Overview:                                               │
│   ID:       a1b2c3d4e5f6                               │
│   Image:    myapp:v2.1                                 │
│   Created:  2024-06-15 10:30:00                        │
│   Status:   Up 15 days                                 │
│   Command:  /bin/sh -c node server.js                  │
│   Platform: linux/amd64                                │
│                                                         │
│ [View Full Inspect JSON]                               │
└─────────────────────────────────────────────────────────┘
```

### 6.6 Live Logs Viewer
```
┌─────────────────────────────────────────────────────────┐
│ Logs — api-server          [tail: 100 ▼] [▶ Stream]   │
├─────────────────────────────────────────────────────────┤
│ [Auto-scroll: ON ▼]  [Copy All] [Clear] [Download]    │
├─────────────────────────────────────────────────────────┤
│ Jun 30 01:00:01 INFO  Server started on port 3000     │
│ Jun 30 01:00:02 INFO  Connected to Redis              │
│ Jun 30 01:00:05 INFO  GET /api/health 200 2ms          │
│ Jun 30 01:00:10 WARN  High memory usage: 85%           │
│ Jun 30 01:00:15 ERROR Failed to connect to DB          │
│ >>> Streaming live...                                  │
└─────────────────────────────────────────────────────────┘
```

**Streaming:** SSE or WebSocket. Sends new log lines as they come via `docker logs -f`.

### 6.7 Add/Edit VM Dialog
```
┌─────────────────────────────────────────────────────────┐
│ Add Docker Host                                   [✕]  │
├─────────────────────────────────────────────────────────┤
│ Display Name:  [Production API Server         ]       │
│ Host/IP:       [192.168.1.10                   ]       │
│ SSH Port:      [22                              ]       │
│ Username:      [deploy                          ]       │
│                                                         │
│ Auth Method:   (●) Password   ( ) SSH Key              │
│                                                         │
│ Password:      [••••••••••••                     ]     │
│              atau                                       │
│ SSH Private Key:                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Paste private key content here...]                 │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│ Key Passphrase:  [••••••••••••                    ]     │
│                                                         │
│ Default Path:   [/opt/docker                     ]     │
│ Tags:           [production] [api] [vps]               │
│                                                         │
│ [Test Connection]              [Cancel] [Save Host]    │
└─────────────────────────────────────────────────────────┘
```

### 6.8 Deploy Container Form
```
┌─────────────────────────────────────────────────────────┐
│ Deploy Container                                  [✕]  │
├─────────────────────────────────────────────────────────┤
│ Image:         [nginx:alpine                     ] 🔍  │
│ Container Name:[my-nginx                         ]       │
│                                                         │
│ Ports:   [+ Add Port]                                  │
│   Host: [8080] → Container: [80]                       │
│                                                         │
│ Environment Variables:  [+ Add Env]                    │
│   Key: [PORT    ]  Value: [8080             ]          │
│   Key: [APP_ENV ]  Value: [production      ]          │
│                                                         │
│ Volumes:  [+ Add Volume]                               │
│   Host Path: [/data/nginx] → Container: [/var/log/nginx]│
│                                                         │
│ Auto-restart: [✓]  Privileged: [ ]  TTY: [ ]          │
│                                                         │
│                          [Cancel]  [Deploy & Start]    │
└─────────────────────────────────────────────────────────┘
```

### 6.9 Docker Compose Panel
```
┌─────────────────────────────────────────────────────────┐
│ Compose Projects — prod-api-1                          │
├─────────────────────────────────────────────────────────┤
│ [+ Add Project]                                         │
├─────────────────────────────────────────────────────────┤
│ 📁 ./docker/compose.yml — "webapp"                     │
│   Services: nginx, api, postgres, redis                │
│   Status: ● Running (3/3)                              │
│   [▶ Up] [⏹ Down] [🔄 Restart] [📝 Edit] [📊 Scale]    │
│                                                         │
│ 📁 ./staging/docker-compose.yml — "staging-app"         │
│   Services: app, db                                    │
│   Status: ● Running (2/2)                              │
│   [▶ Up] [⏹ Down] [🔄 Restart] [📝 Edit] [📊 Scale]    │
└─────────────────────────────────────────────────────────┘
```

### 6.10 Scale Replica Dialog
```
┌─────────────────────────────────────────────────────────┐
│ Scale Replicas                                    [✕]  │
├─────────────────────────────────────────────────────────┤
│ Service:  [nginx              ▼]                        │
│ Current Replicas: 3                                     │
│                                                         │
│ New Replicas:  [5     ] [−] [+]                         │
│                                                         │
│ Preview: docker compose -f ./docker/docker-compose.yml  │
│          scale nginx=5                                  │
│                          [Cancel]  [Apply]             │
└─────────────────────────────────────────────────────────┘
```

### 6.11 Edit Docker Compose File
```
┌─────────────────────────────────────────────────────────┐
│ Edit docker-compose.yml                           [✕]  │
├─────────────────────────────────────────────────────────┤
│ File: ./docker/docker-compose.yml                       │
│ [Monaco Editor — YAML]                                  │
│ version: '3'                                            │
│ services:                                               │
│   nginx:                                                │
│     image: nginx:alpine                                  │
│     ports:                                              │
│       - "80:80"                                         │
│     volumes:                                            │
│       - ./data/nginx:/var/log/nginx                     │
│                                                         │
│ [Validate YAML]  [Cancel]  [Save & Restart]            │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Password storage | Fernet AES-128 encryption before DB insert |
| SSH key storage | Encrypted with Fernet, passphrase protected |
| Encryption key | Stored in `.docker_enc_key` file, 0600 only |
| Key rotation | Env var override allows key rotation without DB re-encrypt |
| SSH connection | `asyncssh` with known hosts check disabled (flexible for VMs) |
| Credential exposure | Never log decrypted passwords/keys; mask in responses |
| RBAC | Only users with `docker:manage` permission can access Docker menu |
| Docker socket | Not exposed; all Docker ops via SSH + CLI only |

### 7.1 Credential Flow
```
User Input (plain password/key)
    ↓
Backend receives via HTTPS
    ↓
Fernet encrypt (using DOCKER_ENC_KEY)
    ↓
Store encrypted string in docker_hosts table
    ↓
On use: Fernet decrypt → SSH connect
```

---

## 8. Real-time Features

### 8.1 Container Stats (SSE)
- Endpoint: `GET /docker/hosts/:id/containers/:cid/stats`
- Returns: `docker stats --no-stream --format '{{json .}}'`
- Frontend polls every 3 seconds OR uses SSE for push updates

### 8.2 Live Log Streaming (WebSocket)
- Endpoint: `WS /docker/hosts/:id/containers/:cid/logs/stream?tail=100`
- Backend exec: `docker logs -f <container_id>`
- Stream raw output line-by-line to frontend
- Frontend: SSE or WebSocket, append to log buffer, auto-scroll

### 8.3 Connection Status (Heartbeat)
- Frontend polls `GET /docker/hosts/:id` every 30s
- Shows online/offline status on VM cards
- Background: ping SSH connection every 30s to keep alive

---

## 9. Performance & UX

| Aspect | Approach |
|--------|----------|
| SSH connection reuse | Pool of SSH connections per host (max 5) |
| Container list cache | Cache `docker ps` result for 10 seconds |
| Lazy load | Images/volumes loaded only when tab clicked |
| Error recovery | Auto-retry SSH on transient failures (3x, exponential backoff) |
| Loading states | Skeleton loaders for container list |
| Large log handling | Tail 100 by default, max 5000 lines buffer on frontend |

---

## 10. File Editor (Compose/YAML)

Use Monaco Editor integrated in frontend:
- Syntax highlighting for YAML
- Validation on save (run `docker compose config` before apply)
- Auto-format on save
- Diff view before overwrite

---

## 11. Full Feature Matrix

| Feature | Priority | Status |
|---------|----------|--------|
| Add/Edit/Delete VM (SSH) | P0 | |
| Test SSH connection | P0 | |
| List containers | P0 | |
| Container detail (inspect) | P0 | |
| Container stats | P0 | |
| Start/Stop/Restart | P0 | |
| Remove container | P0 | |
| Container logs (tail) | P0 | |
| Live log streaming | P0 | |
| List images | P1 | |
| Pull image | P1 | |
| Remove image | P1 | |
| List volumes | P1 | |
| Remove volume | P1 | |
| Deploy from image | P1 | |
| Clone container | P1 | |
| Docker Compose list | P1 | |
| Compose up/down/restart | P1 | |
| Compose scale | P1 | |
| Edit compose file | P1 | |
| Scale replicas | P1 | |
| Exec in container | P2 | |
| Container env vars view | P1 | |
| Container ports view | P1 | |
| Container volumes view | P1 | |

---

## 12. User Decisions (Approved 2026-06-30)

| # | Question | Decision |
|---|----------|----------|
| 1 | RBAC scope | **All users** — Docker menu visible to everyone who can login |
| 2 | Log retention | **Both** — user can choose to save logs to DB (toggle in UI) or stream live only |
| 3 | Docker contexts | **Supported** — detect and use docker contexts per host |
| 4 | Default SSH port | **22**, but configurable per VM (custom port in add/edit form) |
| 5 | Deploy templates | **Built-in templates** (nginx, postgres, redis, mysql, node, python) + user can **create their own** templates from deploy form |
