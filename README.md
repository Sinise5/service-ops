# ServiceOps Platform

Production-ready observability and CMDB platform — Datadog/New Relic alternative.

## Features

- **Asset Registry (CMDB)** — Universal asset management with types, tags, relationships
- **Monitoring Engine** — Extensible plugin architecture (HTTP, Ping, SSL, TCP, DNS)
- **Auth & RBAC** — JWT authentication with role-based access control
- **Modern Stack** — Python 3.12 + Robyn (async), SolidJS + Tailwind, PostgreSQL + Redis
- **Notifications** — Telegram, Discord, Email, Webhook channels
- **SLA & Uptime** — Tracking, reporting, incident correlation
- **Topology & Impact Analysis** — Dependency graph, failure impact visualization

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker & Docker Compose
- uv (Python package manager): `curl -LsSf https://astral.sh/uv/install.sh | sh`

### Setup

```bash
# 1. Clone repository
git clone https://gitlab.com/QTI/QTI-Research/service-ops.git
cd serviceops

# 2. Start databases
docker compose up -d postgres redis

# 3. Install backend + run migrations
cd backend
uv sync
uv run alembic upgrade head
cd ..

# 4. Start backend (port 8080)
cd backend && PORT=8080 python run_server.py &

# 5. Start frontend (separate terminal, port 5173)
cd frontend
npm install
npm run dev
```

**Backend API:** http://localhost:8080  
**Frontend:** http://localhost:5173

### Default Credentials

```
Email: admin@serviceops.local
Password: admin123
```

## Testing

```bash
cd backend

# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=src --cov-report=html
```

**Current Status:** 68/68 tests passing ✅

## Technology Stack

### Backend
- **Framework:** Robyn 0.84+ (Rust-backed async Python)
- **Database:** PostgreSQL 14+ (asyncpg driver)
- **Cache:** Redis 7+
- **Auth:** JWT (PyJWT) + bcrypt
- **Testing:** pytest + pytest-asyncio

### Frontend
- **Framework:** SolidJS 1.8+
- **Router:** @solidjs/router 0.13.3
- **UI:** Tailwind CSS 3+ + shadcn/ui
- **Build:** Vite 5+

## Roadmap

| Phase | Status | Target |
|-------|--------|--------|
| Phase 0-11: Core Backend | ✅ Complete | — |
| Phase 12: Notifications | ✅ Complete | — |
| Phase 13: Frontend + Fixes | ✅ Complete | 2026-06-16 |
| Phase 14: Production Ready | ⏳ Next | 2026-06-30 |

See `docs/ROADMAP.md` for detailed breakdown.

## License

Proprietary — QTI Internal Project

---

**Last Updated:** 2026-06-16  
**Status:** ✅ Phase 13 Complete — Ready for Phase 14
