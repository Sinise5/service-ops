# ServiceOps Docker Management — Implementation Plan

**Branch:** `feature/docker-management`
**Base:** `main`
**Reference Design:** `docs/DOCKER_MANAGEMENT_DESIGN.md`

---

## Phase 0: Prerequisites & Setup

**Tasks:**
- [ ] Install `asyncssh` in backend (`uv add asyncssh`)
- [ ] Add `cryptography` if not present (for Fernet)
- [ ] Install frontend editor deps (`@monaco-editor/react`)
- [ ] Install frontend YAML/JSON package (`yaml` for YAML preview)
- [ ] Install Docker icon (SimpleIcons): `npm install simple-icons`

**Verification:** `uv sync` passes, `npm install` passes

---

## Phase 1: Backend — DB Schema + Models

**Files to create:**
- `backend/src/domains/docker/__init__.py`
- `backend/src/domains/docker/models.py` — Pydantic models
- `backend/src/domains/docker/repository.py` — DB CRUD

**New tables (SQL migration in init.sql):**
- `docker_hosts`
- `docker_container_cache`
- `docker_compose_projects`
- `docker_deploy_templates`

**Models:**
- `DockerHost` (id, name, host, port, username, auth_type, password_encrypted, ssh_key_encrypted, ssh_key_passphrase_encrypted, default_path, tags, is_active, last_connected_at, created_by, timestamps)
- `ContainerItem` (id, name, image, status, state, ports, created, labels)
- `ImageItem`, `VolumeItem`, `ComposeProject`
- `DeployTemplate` (id, name, image, default_ports, default_envs, default_volumes, description, is_system)

**Verification:** `from domains.docker.models import *` works, alembic migration runs clean

---

## Phase 2: Backend — Encryption + SSH Client

**Files to create:**
- `backend/src/domains/docker/crypto.py` — Fernet encryption wrapper
- `backend/src/domains/docker/ssh_client.py` — AsyncSSH wrapper

**Tasks:**
- [ ] `CryptoService` class: generate_key, encrypt, decrypt
- [ ] Key file at `backend/.docker_enc_key`, load via env `DOCKER_ENC_KEY` fallback
- [ ] `SSHClient` class: connection context manager, exec(), exec_stream()
- [ ] Connection pool: `SSHPool` (dict of host_id → SSHClient with last_used)
- [ ] Auto-retry on transient failures (3x exp backoff)
- [ ] Known hosts policy: `KnownHostsPolicy.Ignore` (flexible per use case)

**Verification:** `python -c "from domains.docker.ssh_client import SSHClient; print('OK')"`

---

## Phase 3: Backend — Docker Service Layer

**Files to create:**
- `backend/src/domains/docker/service.py`
- `backend/src/domains/docker/formatter.py` — output parser

**Methods:**
- `list_containers(host_id, all=True)`
- `container_inspect(host_id, cid)`
- `container_stats(host_id, cid)`
- `container_logs(host_id, cid, tail=100)`
- `container_stream_logs(host_id, cid)` — async generator for WS
- `container_action(host_id, cid, action: start|stop|restart|remove)`
- `container_exec(host_id, cid, command)`
- `list_images(host_id)`
- `pull_image(host_id, image)`
- `remove_image(host_id, image_id)`
- `list_volumes(host_id)`
- `remove_volume(host_id, name)`
- `deploy_container(host_id, params)`
- `scale_replica(host_id, service, replicas, compose_path)`
- `compose_up/down/restart(host_id, project_id)`
- `list_compose_projects(host_id)`
- `compose_config(host_id, project_id)`
- `read_file(host_id, path)` — read compose file for editor
- `write_file(host_id, path, content)` — save compose file
- `test_connection(host_id)` — test SSH + `docker ps`

**Anti-Pattern Guards:**
- Never log decrypted credentials
- Always catch SSH exceptions and return structured errors
- Validate docker_hosts ownership (created_by → auth middleware)

**Verification:** Mock SSH, call `list_containers()`, returns structured output

---

## Phase 4: Backend — Routes (API Endpoints)

**Files to create:**
- `backend/src/domains/docker/routes.py`
- Register router in `backend/src/main.py`

**Endpoints (30+):**

| Group | Method | Path |
|-------|--------|------|
| Hosts | GET/POST/PUT/DELETE | `/docker/hosts[/:id]` |
| Hosts | POST | `/docker/hosts/:id/test` |
| Containers | GET | `/docker/hosts/:id/containers` |
| Containers | GET | `/docker/hosts/:id/containers/:cid/inspect` |
| Containers | GET | `/docker/hosts/:id/containers/:cid/stats` |
| Containers | POST | `/docker/hosts/:id/containers/:cid/[start\|stop\|restart]` |
| Containers | DELETE | `/docker/hosts/:id/containers/:cid` |
| Containers | GET | `/docker/hosts/:id/containers/:cid/logs` |
| Containers | WS | `/docker/hosts/:id/containers/:cid/logs/stream` |
| Containers | POST | `/docker/hosts/:id/containers/exec` |
| Containers | POST | `/docker/hosts/:id/containers/:cid/replica` |
| Images | GET/POST/DELETE | `/docker/hosts/:id/images` |
| Images | POST | `/docker/hosts/:id/images/pull` |
| Volumes | GET/DELETE | `/docker/hosts/:id/volumes` |
| Volumes | GET | `/docker/hosts/:id/volumes/:name/inspect` |
| Compose | GET/POST | `/docker/hosts/:id/compose/projects` |
| Compose | POST | `/docker/hosts/:id/compose/:project_id/[up\|down\|restart]` |
| Compose | GET/PUT | `/docker/hosts/:id/compose/:project_id/file` |
| Compose | POST | `/docker/hosts/:id/compose/:project_id/scale` |
| Deploy | POST | `/docker/hosts/:id/deploy` |
| Templates | GET/POST/PUT/DELETE | `/docker/templates` |

**Auth:** All endpoints under `/docker/*` require JWT auth (existing middleware).
Resource ownership enforced for host operations.

**WebSocket handler** for live logs:
- Accept WS connection
- Run `docker logs -f --tail N <cid>` via SSH
- Stream each line to WS client
- Handle disconnect gracefully (close SSH process)

**Verification:** `curl http://localhost:8080/docker/hosts` returns `200 []`

---

## Phase 5: Frontend — Navigation + Routing

**Files to create/modify:**
- `frontend/src/pages/DockerPage.tsx` — main Docker page
- `frontend/src/App.tsx` — tambah route + sidebar item
- `frontend/src/components/Layout.tsx` — tambah Docker nav link

**Tasks:**
- [ ] Route: `/docker` → `DockerPage`
- [ ] Sidebar icon: `SiDocker` (SimpleIcons)
- [ ] Lazy load DockerPage (code-split)

**Layout:**
```
[Dashboard] [Assets] [Monitoring] [...] [Docker] [Settings]
```

**Verification:** Navigate to /docker — page renders placeholder

---

## Phase 6: Frontend — VM Host Management

**Files to create:**
- `frontend/src/components/docker/HostManager.tsx`
- `frontend/src/components/docker/HostCard.tsx`
- `frontend/src/components/docker/HostForm.tsx` — add/edit modal

**Features:**
- [ ] Card grid layout for VM hosts (konsisten dengan DashboardPage)
- [ ] Add VM button → modal form
- [ ] Edit VM (click card gear icon)
- [ ] Delete VM (with confirmation)
- [ ] Test connection button
- [ ] Connection status indicator (online/offline/connecting)
- [ ] Last connected timestamp
- [ ] Auto-refresh status every 30s
- [ ] Loading skeleton while fetching hosts
- [ ] Error state if fetch fails

**Verification:** Add VM with test credentials, card shows online

---

## Phase 7: Frontend — Container List + Cards

**Files to create:**
- `frontend/src/components/docker/ContainerList.tsx`
- `frontend/src/components/docker/ContainerCard.tsx`

**Features:**
- [ ] Click VM card → show container list
- [ ] Breadcrumb: Hosts > VM Name
- [ ] Table or card layout (toggleable)
- [ ] Filter bar: All/Running/Stopped
- [ ] Search by container name
- [ ] Status badges: 🟢 Running, 🔴 Stopped, 🟡 Restarting, ⚫ Exited
- [ ] Action buttons per row: Start/Stop/Restart/Logs/Stats/Inspect/Remove
- [ ] Multi-select + bulk action (stop, restart)
- [ ] Refresh button
- [ ] Auto-refresh every 10s (configurable)
- [ ] Empty state when no containers
- [ ] Error state when SSH fails

**Verification:** Click VM → shows containers with status badges

---

## Phase 8: Frontend — Container Detail + Stats + Logs

**Files to create:**
- `frontend/src/components/docker/ContainerDetail.tsx`
- `frontend/src/components/docker/ContainerStats.tsx`
- `frontend/src/components/docker/ContainerLogs.tsx`

**ContainerDetail (Modal):**
- [ ] Tabbed: Overview / Env / Ports / Volumes / Inspect JSON
- [ ] Overview: ID, Image, Created, Status, Command, Platform
- [ ] Env Vars: key-value table, copyable
- [ ] Ports: host→container mapping table
- [ ] Volumes: host→container mounts table
- [ ] Full inspect JSON viewer (collapsible)

**ContainerStats (Inline Modal):**
- [ ] CPU usage (gauge + percentage)
- [ ] Memory usage (gauge + MB/GB)
- [ ] Network I/O (RX/TX bytes)
- [ ] Block I/O (read/write)
- [ ] PID count
- [ ] Auto-refresh every 3s or SSE push
- [ ] Sparkline chart for CPU/memory over time (last 60s)

**ContainerLogs (Panel/Modal):**
- [ ] Tail selector: 50, 100, 200, 500, All
- [ ] Start/Stop streaming button (WebSocket)
- [ ] Auto-scroll (toggle on/off)
- [ ] Copy all button
- [ ] Download logs as .txt
- [ ] Clear log buffer
- [ ] Timestamp toggle
- [ ] Colorized output (stderr in red)
- [ ] Search within logs (CTRL+F native browser)

**Verification:** Open container → see stats updating, logs streaming

---

## Phase 9: Frontend — Images + Volumes + Compose

**Files to create:**
- `frontend/src/components/docker/ImageList.tsx`
- `frontend/src/components/docker/VolumeList.tsx`
- `frontend/src/components/docker/ComposePanel.tsx`

**ImageList:**
- [ ] Gallery/card display (like Docker Hub)
- [ ] Pull image form (input: image:tag)
- [ ] Image detail: tag, size, created, layers
- [ ] Remove image (with confirmation)
- [ ] Search/filter images

**VolumeList:**
- [ ] Table listing with name, driver, mountpoint, size
- [ ] Inspect volume (modal)
- [ ] Remove volume (with warning if in use)
- [ ] Prune unused volumes button

**ComposePanel:**
- [ ] List compose projects per VM
- [ ] Add project path
- [ ] Project card: path, services, status
- [ ] Up/Down/Restart buttons
- [ ] Scale service dialog
- [ ] Edit compose file (Monaco editor)
- [ ] Validate YAML before save
- [ ] View compose config (`docker compose config`)

**Verification:** Pull nginx:alpine from UI, see it in image list

---

## Phase 10: Frontend — Deploy Form + Templates + Scale

**Files to create:**
- `frontend/src/components/docker/DeployForm.tsx`
- `frontend/src/components/docker/ScaleDialog.tsx`
- `frontend/src/components/docker/TemplateManager.tsx`
- `frontend/src/components/docker/ReplicaStats.tsx`

**DeployForm:**
- [ ] Image input (autocomplete from local images or pull)
- [ ] Container name
- [ ] Port mapping (dynamic add/remove rows)
- [ ] Env vars (dynamic add/remove rows)
- [ ] Volume mounts (dynamic add/remove rows)
- [ ] Network selector (host, bridge, overlay)
- [ ] Restart policy (no, always, unless-stopped, on-failure)
- [ ] Privileged / TTY / Interactive checkboxes
- [ ] Template selector — apply template pre-fills the form
- [ ] Deploy & Start button
- [ ] Deploy result: container ID, link to inspect

**ScaleDialog:**
- [ ] Service selector (from compose)
- [ ] Current replicas count
- [ ] +/- stepper or number input
- [ ] Preview command
- [ ] Apply button

**TemplateManager:**
- [ ] System templates list (nginx, postgres, redis, mysql, node, python)
- [ ] User-created templates
- [ ] Create from current deploy form
- [ ] Edit template metadata (name, image, default config)
- [ ] Delete template
- [ ] Template preview card

**ReplicaStats:**
- [ ] Per-replica status overview
- [ ] Per-container stats in scale mode

**Templates (built-in):**
```
1. Nginx — image: nginx:alpine, port 80:80
2. PostgreSQL — image: postgres:16, port 5432:5432, env: POSTGRES_PASSWORD
3. Redis — image: redis:7-alpine, port 6379:6379
4. MySQL — image: mysql:8, port 3306:3306, env: MYSQL_ROOT_PASSWORD
5. Node.js App — image: node:20-alpine, port 3000:3000
6. Python App — image: python:3.12-slim, port 8000:8000
```

**Verification:** Deploy nginx, see it show up in container list

---

## Phase 11: Frontend — File Editor (Monaco for YAML)

**File to create:**
- `frontend/src/components/docker/ComposeEditor.tsx`

**Tasks:**
- [ ] Integrate `@monaco-editor/react`
- [ ] YAML language server (syntax highlight)
- [ ] Load file content on open
- [ ] Save → `PUT /docker/.../compose/:project_id/file`
- [ ] Validate → `POST /docker/.../compose/:project_id/validate` (runs `docker compose config`)
- [ ] Diff view before save
- [ ] Keyboard shortcuts (Ctrl+S save, Ctrl+Shift+V validate)
- [ ] Dark theme (konsisten dengan ServiceOps)

**Verification:** Open compose file → edit → save → compose up works

---

## Phase 12: Testing & Security Hardening

**Tasks:**
- [ ] Unit tests: CryptoService (encrypt/decrypt round-trip)
- [ ] Unit tests: SSHClient mock, DockerService mock
- [ ] Integration test: DB CRUD for docker_hosts
- [ ] Integration test: Full deploy flow (mock SSH)
- [ ] Security review: no credential leak in logs
- [ ] Security review: RBAC enforcement
- [ ] Add Docker domain to domain registry (`backend/src/domains/__init__.py`)
- [ ] Add Docker migration to init.sql / alembic
- [ ] Error handling audit: all external errors → user-friendly messages
- [ ] Performance audit: SSH connection pooling, caching

**Verification:** `pytest backend/tests/domains/docker/` passes

---

## Milestone Summaries

| Phase | Scope | Est. Runs |
|-------|-------|-----------|
| 0 | Dependencies | 1 run |
| 1 | DB + Models | 1 run |
| 2 | Encryption + SSH | 1 run |
| 3 | Docker Service | 1 run |
| 4 | API Routes | 1 run |
| 5 | Frontend Nav | 1 run |
| 6 | Host Management | 1 run |
| 7 | Container List | 1 run |
| 8 | Detail/Stats/Logs | 1 run |
| 9 | Images/Volumes/Compose | 1 run |
| 10 | Deploy/Templates/Scale | 1 run |
| 11 | File Editor (Monaco) | 1 run |
| 12 | Testing + Security | 1 run |

---

## Anti-Pattern Guards

1. **No credential logging** — `SSHClient` init params masked in logs
2. **No plaintext passwords in JSON response** — `password_encrypted` field excluded from API output
3. **No blocking IO** — async everywhere (asyncssh, asyncio)
4. **No monolithic route file** — split routes by resource (host/container/image/volume/compose)
5. **No hardcoded paths** — `default_path` stored per host, used for compose operations
6. **No infinite buffer** — log viewer caps at 5000 lines; user must load more
