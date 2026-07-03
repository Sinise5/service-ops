# ServiceOps Platform

**Observability, CMDB & Docker Management** — Datadog/New Relic alternative.

**Version:** 1.1.0 · **Branch:** `feature/docker-management` · **Updated:** July 2026

---

## Quick Start

```bash
git clone https://gitlab.com/QTI/QTI-Research/service-ops.git
cd serviceops
docker compose up -d postgres redis          # start DBs
cd backend && uv sync && uv run python -m src.main &  # backend → :9080
cd ../frontend && npm install && npm run dev  # frontend → :5173
```

**Login:** `admin@serviceops.local` / `admin123`

---

## Features

| Feature | Status | Docs |
|---------|--------|------|
| **Docker Management** — containers, images, volumes, Compose via SSH | ✅ | [`DOCKER_MANAGEMENT_GUIDE.md`](./docs/DOCKER_MANAGEMENT_GUIDE.md) |
| **Host Monitoring** — CPU, MEM, disk, top processes, docker df | ✅ | Built-in tab per host |
| **Alert Thresholds** — per-host CPU/MEM/Disk rules + Telegram/Email notif | ✅ | New in Phase 15 |
| **Asset Registry (CMDB)** — types, tags, relationships, CSV import | ✅ | |
| **Monitoring Engine** — HTTP, Ping, SSL, TCP, DNS plugins | ✅ | |
| **Auth & RBAC** — JWT + roles + permissions | ✅ | |
| **Notifications** — Telegram, Email, Discord, Webhook | ✅ | |
| **SLA & Uptime** — tracking, reports, incident correlation | ✅ | |
| **Topology** — dependency graph, impact analysis | ✅ | |

---

## Documentation

| Document | Covers |
|----------|--------|
| [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | System architecture, domain modules, data flow |
| [`PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) | All features, DB schema, API stats, host inventory |
| [`ROADMAP.md`](./docs/ROADMAP.md) | Development phases, timeline, planned features |
| [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Docker deploy, env vars, migration, troubleshooting |
| [`DOCKER_MANAGEMENT_GUIDE.md`](./docs/DOCKER_MANAGEMENT_GUIDE.md) | Docker host/container/image/volume/compose guide |
| [`USER_GUIDE.md`](./docs/USER_GUIDE.md) | User-facing operations for non-admin |
| [`CHANGELOG.md`](./CHANGELOG.md) | Release history |

---

## Tech Stack

| Layer | Stack | Version |
|-------|-------|---------|
| Backend | Python + Robyn | 0.88.0 |
| Database | PostgreSQL + psycopg v3 | 16 |
| Cache | Redis | 7 |
| SSH | asyncssh | 2.14+ |
| Frontend | SolidJS + Tailwind | 1.8+ / 3 |
| Encryption | cryptography (Fernet AES-128) | — |

---

## Project Structure

```
serviceops/
├── backend/
│   ├── src/
│   │   ├── main.py              # App entry + router
│   │   ├── database.py           # psycopg async pool
│   │   ├── config.py             # Env config
│   │   ├── shared.py             # json_response, get_header
│   │   ├── utils.py              # UUIDEncoder, json_response
│   │   ├── domains/
│   │   │   ├── auth/             # JWT, bcrypt, RBAC
│   │   │   ├── assets/           # CMDB
│   │   │   ├── monitoring/       # Check plugins + scheduler
│   │   │   ├── alerts/           # Alert rules, incidents
│   │   │   ├── notifications/    # Telegram/Email/Discord
│   │   │   ├── docker/           # SSH-host management ⭐
│   │   │   ├── logs/             # Log aggregation
│   │   │   ├── sla/              # Uptime tracking
│   │   │   ├── topology/         # Dependency graph
│   │   │   └── audit/            # Audit trail
│   │   └── migrations/           # Incremental SQL
│   ├── .venv/
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/docker/    # Docker page components ⭐
│       │   └── HostMonitor.tsx   # Alert thresholds + monitor
│       └── pages/
├── docs/                         # 📚 All documentation
├── docker-compose.yml            # Production orchestration
├── Dockerfile.backend
├── Dockerfile.frontend
├── init.sql                      # Full schema (fresh DB)
└── docker-migration.sql          # Incremental DDL
```

---

## Branch Status

```
feature/docker-management ── 11 commits ahead of main
  ├── CORS fix (c66318f)
  ├── Alert tables in migration (573b884)
  ├── HostMonitor + alert CRUD (f0b5768)
  └── ... 8 more commits

Next Step: Merge → main, deploy to production (10.10.10.201)
```

---

## License

Proprietary — QTI Internal Project
