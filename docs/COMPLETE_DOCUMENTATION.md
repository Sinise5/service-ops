# ServiceOps Platform — Complete Documentation

**Version:** 1.0.0 | **Status:** Production Ready | **Last Updated:** 30 June 2026  
**Stack:** Robyn (Python) + SolidJS (TypeScript) + PostgreSQL + Redis + Docker

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Setup & Installation](#3-setup--installation)
4. [Configuration](#4-configuration)
5. [API Reference](#5-api-reference)
6. [Testing](#6-testing)
7. [Deployment](#7-deployment)
8. [Development Guide](#8-development-guide)
9. [User Guide](#9-user-guide)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Project Overview

### What is ServiceOps?

ServiceOps is a production-ready IT operations platform providing:

- **Asset Management (CMDB)** — Track servers, databases, APIs, and infrastructure
- **Monitoring** — HTTP, Ping, SSL, TCP health checks with automated scheduling
- **Alerting** — Rule-based alert conditions with severity levels
- **Incident Management** — Full lifecycle: triggered → acknowledged → resolved
- **Notifications** — Telegram, Discord, Email, Webhook channels
- **SLA Tracking** — Uptime targets vs. actual performance
- **Topology** — Visual dependency mapping with impact analysis
- **Logs** — Centralized log ingestion and search

### Key Features

| Feature | Status | Description |
|---------|--------|-------------|
| Asset CRUD | ✅ Complete | Create, read, update, delete assets with types |
| Monitoring Checks | ✅ Complete | HTTP, Ping, SSL, TCP scheduled checks |
| Alert Rules | ✅ Complete | Rule engine with severity + threshold |
| Incident Mgmt | ✅ Complete | Lifecycle with timeline + comments |
| Notifications | ✅ Complete | Telegram, Discord, Email, Webhooks |
| SLA Tracking | ✅ Complete | Uptime % vs. target with reports |
| Topology | ✅ Complete | Visual dependency graph |
| Logs | ✅ Complete | Searchable log ingestion |
| Auth | ✅ Complete | JWT login + protected routes |
| Docker Management | ✅ Complete | Multi-host Docker via SSH — containers, images, volumes, Compose |
| CSV Import | ✅ Complete | Bulk asset import |

---

## 2. Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (SolidJS)                │
│              http://localhost:5173                   │
├─────────────────────────────────────────────────────┤
│                   Backend (Robyn)                  │
│              http://localhost:9080                    │
├─────────────────────────────────────────────────────┤
│   PostgreSQL (persistence)    │    Redis (caching)   │
├─────────────────────────────────────────────────────┤
│   Telegram Bot    │   Discord    │   Email (SMTP)    │
└─────────────────────────────────────────────────────┘
```

### Directory Structure

```
serviceops/
├── backend/
│   ├── src/
│   │   ├── main.py              # Robyn application entry
│   │   ├── config.py            # Configuration management
│   │   ├── database.py          # PostgreSQL connection
│   │   ├── seed.py              # Database seeding
│   │   ├── domains/
│   │   │   ├── auth/            # Authentication
│   │   │   ├── assets/          # Asset management
│   │   │   ├── monitoring/      # Health checks
│   │   │   ├── alerts/          # Alert rules + incidents
│   │   │   ├── notifications/   # Notification channels
│   │   │   ├── sla/             # SLA tracking
│   │   │   ├── topology/        # Dependency mapping
│   │   │   ├── logs/            # Log ingestion
│   │   │   └── docker/          # Docker management (SSH + Docker CLI)
│   │   └── shared/              # Shared utilities
│   ├── tests/                   # Test files
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # App entry + routing
│   │   ├── components/
│   │   │   ├── Layout.tsx       # Navigation layout
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/               # Page components
│   │   ├── stores/              # State management
│   │   └── lib/                 # API client
│   └── package.json
├── docker-compose.yml           # Container orchestration
├── Dockerfile.backend           # Backend container
├── Dockerfile.frontend          # Frontend container
├── init.sql                     # DB schema init
├── seed.sql                     # Initial data
└── Makefile                     # Automation targets
```

### Database Schema (26 Tables)

**Core Tables:**
- `users` — Authentication and profiles
- `asset_types` — Categorized asset types (8 predefined)
- `assets` — IT resource inventory
- `contacts` — Asset contact info
- `monitoring_checks` — Health check configurations
- `check_results` — Execution history
- `alert_rules` — Alert conditions
- `incidents` — Active/resolved incidents
- `incident_comments` — Timeline comments
- `incident_timeline` — Status change history
- `notification_channels` — Delivery endpoints
- `notification_logs` — Delivery records
- `sla_targets` — Uptime targets per asset
- `sla_reports` — Generated reports
- `dependencies` — Topology edges
- `logs` — Centralized log storage

**Docker Tables (Phase 15):**
- `docker_hosts` — Remote VM SSH credentials (encrypted)
- `docker_container_cache` — Cached container list per host
- `docker_compose_projects` — Tracked compose projects per host

---

## 3. Setup & Installation

### Prerequisites

- **Docker** >= 24.0
- **Docker Compose** >= 2.20
- **Python** >= 3.9 (for local dev)
- **Node.js** >= 18 (for frontend dev)
- **uv** (Python package manager)

### Docker Deployment (Recommended)

```bash
# Clone repository
git clone https://gitlab.com/QTI/QTI-Research/service-ops.git
cd serviceops

# Start all services
make docker-up

# Access
# Frontend: http://localhost:5173
# Backend: http://localhost:9080

# Default login
# Email: admin@serviceops.local
# Password: admin123

# Stop services
make docker-down
```

### Local Development Setup

```bash
# 1. Start database
docker compose up -d postgres

# 2. Backend setup
cd backend
uv sync
cp .env.example .env  # If exists
cd ..

# 3. Run backend (terminal 1)
PORT=9080 python backend/run_server.py

# 4. Frontend setup (terminal 2)
cd frontend
npm install

# 5. Run frontend (terminal 2)
npm run dev

# 6. Access
# Frontend: http://localhost:5173
# API: http://localhost:9080

# 7. Quick start (one command)
make local-start
```

### Database Initialization

```bash
# The docker-compose.yml runs init.sql + seed.sql automatically
# For local dev:
psql -h localhost -U postgres -d serviceops -f init.sql
psql -h localhost -U postgres -d serviceops -f seed.sql

# Default seed data includes:
# - Admin user (admin@serviceops.local)
# - 8 asset types
# - 1 SLA target
# - 1 monitoring check
```

---

## 4. Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 9080 | Backend server port |
| `DATABASE_URL` | postgresql://postgres:postgres@localhost:5432/serviceops | DB connection |
| `REDIS_URL` | redis://localhost:6379 | Cache connection |
| `JWT_SECRET` | auto-generated | Token signing key |
| `JWT_EXPIRY` | 3600 | Token validity (seconds) |
| `CORS_ORIGINS` | ["http://localhost:5173"] | Allowed origins |
| `LOG_LEVEL` | INFO | Logging level |

### Docker Configuration

**File:** `docker-compose.yml`

```yaml
services:
  backend:
    build: .
    ports:
      - "9080:9080"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/serviceops
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
      - ./seed.sql:/docker-entrypoint-initdb.d/seed.sql

  redis:
    image: redis:7-alpine
```

### Makefile Targets

| Target | Description |
|--------|-------------|
| `make docker-up` | Start all Docker services |
| `make docker-down` | Stop all Docker services |
| `make local-start` | Kill ports 9080,5173 + start local dev |
| `make local-backend` | Start backend only |
| `make local-frontend` | Start frontend only |
| `make kill-port` | Kill processes on 9080,5173 |
| `make test` | Run backend tests |
| `make test-backend` | Run backend tests only |
| `make test-frontend` | Run frontend tests (if configured) |
| `make clean` | Remove Docker volumes |

---

## 5. API Reference

### Authentication

#### POST /auth/login

Login with email/password to receive JWT token.

**Request:**
```json
{
  "email": "admin@serviceops.local",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "admin@serviceops.local",
    "name": "Admin User"
  }
}
```

**Response (401):**
```json
{
  "detail": "Invalid credentials"
}
```

#### POST /auth/register

Register new user.

**Request:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "secure_password"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "email": "newuser@example.com",
  "name": "New User"
}
```

### Assets

#### GET /assets

List all assets.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type_id` (optional) — Filter by asset type
- `search` (optional) — Search by name
- `status` (optional) — Filter by status
- `page` (default: 1) — Pagination
- `limit` (default: 50) — Items per page

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Production API",
    "type_id": "uuid",
    "type_name": "API",
    "description": "Main production API",
    "metadata": {
      "environment": "prod",
      "region": "jakarta"
    },
    "status": "healthy",
    "created_at": "2026-06-01T00:00:00Z",
    "updated_at": "2026-06-18T10:00:00Z"
  }
]
```

#### POST /assets

Create new asset.

**Request:**
```json
{
  "name": "New API Server",
  "type_id": "uuid",
  "description": "Main production API server",
  "metadata": {
    "environment": "production",
    "region": "jakarta"
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "New API Server",
  "type_id": "uuid",
  "description": "Main production API server",
  "metadata": {
    "environment": "production",
    "region": "jakarta"
  },
  "status": "healthy",
  "created_at": "2026-06-18T12:00:00Z"
}
```

#### GET /assets/{id}

Get single asset details.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Production API",
  "type_id": "uuid",
  "type_name": "API",
  "description": "Main production API",
  "metadata": {"environment": "prod"},
  "status": "healthy",
  "created_at": "2026-06-01T00:00:00Z",
  "updated_at": "2026-06-18T10:00:00Z"
}
```

#### PUT /assets/{id}

Update asset.

**Request:**
```json
{
  "name": "Updated API Server",
  "description": "Updated description"
}
```

#### DELETE /assets/{id}

Delete asset.

**Response (200):**
```json
{
  "message": "Asset deleted successfully"
}
```

### Asset Types

#### GET /asset-types

List all asset types.

**Response:**
```json
[
  {"id": "uuid", "name": "Server", "icon": "server"},
  {"id": "uuid", "name": "Database", "icon": "database"},
  {"id": "uuid", "name": "API", "icon": "api"},
  {"id": "uuid", "name": "Cache", "icon": "cache"},
  {"id": "uuid", "name": "Queue", "icon": "queue"},
  {"id": "uuid", "name": "Load Balancer", "icon": "lb"},
  {"id": "uuid", "name": "Storage", "icon": "storage"},
  {"id": "uuid", "name": "Other", "icon": "other"}
]
```

### CSV Import

#### POST /assets/import

Import assets from CSV.

**Headers:** `Content-Type: multipart/form-data`

**CSV Format:**
```csv
Name,Type,Environment,Owner,Region
production-api,API,prod,devops,jakarta
main-db,Database,prod,dba,singapore
cache-cluster,Cache,prod,devops,jakarta
```

**Response (200):**
```json
{
  "imported": 3,
  "failed": 0,
  "errors": []
}
```

### Monitoring

#### GET /monitoring/checks

List monitoring checks.

**Query Parameters:**
- `asset_id` (optional) — Filter by asset
- `type` (optional) — Filter by check type
- `enabled` (optional) — Filter by enabled status

**Response:**
```json
[
  {
    "id": "uuid",
    "asset_id": "uuid",
    "asset_name": "Production API",
    "name": "API Health Check",
    "check_type": "http",
    "config": {
      "url": "http://api.example.com/health",
      "method": "GET",
      "expected_status": 200,
      "timeout": 5
    },
    "interval": 60,
    "enabled": true,
    "last_result": "success",
    "last_response_time": 150,
    "last_checked_at": "2026-06-18T12:00:00Z"
  }
]
```

#### POST /monitoring/checks

Create monitoring check.

**Request (HTTP Check):**
```json
{
  "asset_id": "uuid",
  "name": "API Health Check",
  "check_type": "http",
  "config": {
    "url": "http://api.example.com/health",
    "method": "GET",
    "expected_status": 200,
    "timeout": 5
  },
  "interval": 60,
  "enabled": true
}
```

**Request (Ping Check):**
```json
{
  "asset_id": "uuid",
  "name": "Server Ping",
  "check_type": "ping",
  "config": {
    "host": "192.168.1.1",
    "timeout": 5
  },
  "interval": 300,
  "enabled": true
}
```

**Request (SSL Check):**
```json
{
  "asset_id": "uuid",
  "name": "API SSL Check",
  "check_type": "ssl",
  "config": {
    "host": "api.example.com",
    "port": 443
  },
  "interval": 3600,
  "enabled": true
}
```

#### GET /monitoring/checks/{id}/results

Get check execution history.

**Response:**
```json
[
  {
    "id": "uuid",
    "check_id": "uuid",
    "status": "success",
    "response_time": 150,
    "status_code": 200,
    "error": null,
    "checked_at": "2026-06-18T12:00:00Z"
  }
]
```

#### PUT /monitoring/checks/{id}

Update check (enable/disable).

**Request:**
```json
{
  "enabled": false,
  "interval": 120
}
```

#### DELETE /monitoring/checks/{id}

Delete monitoring check.

### Alerts & Incidents

#### GET /alerts/rules

List alert rules.

**Query Parameters:**
- `check_id` (optional) — Filter by monitoring check
- `enabled` (optional) — Filter by enabled status
- `severity` (optional) — Filter by severity level

**Response:**
```json
[
  {
    "id": "uuid",
    "check_id": "uuid",
    "check_name": "API Health Check",
    "asset_name": "Production API",
    "name": "API Critical Alert",
    "condition": "status_code != 200",
    "severity": "critical",
    "threshold": 1,
    "enabled": true,
    "created_at": "2026-06-01T00:00:00Z"
  }
]
```

#### POST /alerts/rules

Create alert rule.

**Request:**
```json
{
  "check_id": "uuid",
  "name": "API Critical Alert",
  "condition": "status_code != 200",
  "severity": "critical",
  "threshold": 1,
  "enabled": true
}
```

#### GET /alerts/incidents

List incidents.

**Query Parameters:**
- `asset_id` (optional) — Filter by asset
- `rule_id` (optional) — Filter by rule
- `status` (optional) — Filter: open/acknowledged/resolved
- `severity` (optional) — Filter: info/warning/critical

**Response:**
```json
[
  {
    "id": "uuid",
    "rule_id": "uuid",
    "rule_name": "API Critical Alert",
    "asset_id": "uuid",
    "asset_name": "Production API",
    "severity": "critical",
    "status": "open",
    "message": "HTTP status 503 != expected 200",
    "acknowledged_by": null,
    "acknowledged_at": null,
    "resolved_by": null,
    "resolved_at": null,
    "resolution_note": null,
    "created_at": "2026-06-18T10:15:00Z"
  }
]
```

#### POST /alerts/incidents/{id}/acknowledge

Acknowledge incident.

**Request:**
```json
{
  "note": "Investigating API failure"
}
```

#### POST /alerts/incidents/{id}/resolve

Resolve incident.

**Request:**
```json
{
  "note": "Restarted API service"
}
```

#### GET /alerts/incidents/{id}/timeline

Get incident timeline.

**Response:**
```json
[
  {
    "action": "created",
    "user_id": "system",
    "note": null,
    "created_at": "2026-06-18T10:15:00Z"
  },
  {
    "action": "acknowledged",
    "user_id": "uuid",
    "note": "Investigating",
    "created_at": "2026-06-18T10:16:00Z"
  },
  {
    "action": "comment",
    "user_id": "uuid",
    "note": "Found the cause",
    "created_at": "2026-06-18T10:20:00Z"
  },
  {
    "action": "resolved",
    "user_id": "uuid",
    "note": "Restarted API service",
    "created_at": "2026-06-18T10:25:00Z"
  }
]
```

### Notifications

#### GET /notifications/channels

List notification channels.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Telegram Alerts",
    "type": "telegram",
    "enabled": true,
    "last_tested_at": "2026-06-18T10:00:00Z",
    "last_test_status": "success",
    "created_at": "2026-06-01T00:00:00Z"
  }
]
```

#### POST /notifications/channels

Create notification channel.

**Request (Telegram):**
```json
{
  "name": "Telegram Alerts",
  "type": "telegram",
  "config": {
    "bot_token": "123456789:ABCdef...",
    "chat_id": "-1001234567890"
  }
}
```

**Request (Email):**
```json
{
  "name": "Email Alerts",
  "type": "email",
  "config": {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "alerts@example.com",
    "smtp_password": "app-password",
    "from_address": "noreply@serviceops.local",
    "to_address": "team@example.com"
  }
}
```

#### POST /notifications/channels/{id}/test

Test notification channel.

**Response (200):**
```json
{
  "success": true,
  "message": "Test notification sent"
}
```

#### GET /notifications/channels/{id}/logs

Get delivery logs.

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "alert",
    "status": "sent",
    "message": "Alert: API failed",
    "response": "ok",
    "created_at": "2026-06-18T10:15:00Z"
  }
]
```

### SLA

#### GET /sla/targets

List SLA targets.

**Response:**
```json
[
  {
    "id": "uuid",
    "asset_id": "uuid",
    "asset_name": "Production API",
    "target_uptime": 99.9,
    "current_uptime": 99.95,
    "downtime_minutes": 7.2,
    "status": "pass",
    "period": "monthly",
    "last_report_at": "2026-06-18T00:00:00Z"
  }
]
```

#### POST /sla/targets

Create SLA target.

**Request:**
```json
{
  "asset_id": "uuid",
  "target_uptime": 99.9,
  "period": "monthly"
}
```

### Topology

#### GET /topology

Get topology graph data.

**Response:**
```json
{
  "nodes": [
    {"id": "uuid", "name": "Production API", "type": "API", "status": "healthy"},
    {"id": "uuid", "name": "Main Database", "type": "Database", "status": "healthy"}
  ],
  "edges": [
    {"source": "uuid1", "target": "uuid2", "type": "depends_on"},
    {"source": "uuid3", "target": "uuid1", "type": "serves"}
  ]
}
```

#### POST /topology/dependencies

Create dependency.

**Request:**
```json
{
  "source_asset_id": "uuid",
  "target_asset_id": "uuid",
  "dependency_type": "depends_on"
}
```

### Logs

#### POST /logs/ingest

Ingest log entry.

**Headers:** `Content-Type: application/json`

**Request:**
```json
{
  "asset_id": "uuid",
  "level": "error",
  "message": "Connection timeout to database",
  "metadata": {
    "service": "api",
    "trace_id": "abc123"
  }
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "created_at": "2026-06-18T12:00:00Z"
}
```

#### GET /logs

Search logs.

**Query Parameters:**
- `asset_id` (optional) — Filter by asset
- `level` (optional) — Filter: error/warn/info/debug
- `search` (optional) — Full-text search
- `from_date` (optional) — Start date
- `to_date` (optional) — End date
- `page` (default: 1) — Pagination
- `limit` (default: 50) — Items per page

**Response:**
```json
[
  {
    "id": "uuid",
    "asset_id": "uuid",
    "asset_name": "Production API",
    "level": "error",
    "message": "Connection timeout to database",
    "metadata": {"service": "api"},
    "created_at": "2026-06-18T12:00:00Z"
  }
]
```

### Health & Status

#### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "uptime": "12h 30m",
  "version": "1.0.0"
}
```

---

## 6. Testing

### Backend Tests

```bash
# Run all backend tests
make test
# or
cd backend && pytest -v

# Run specific test file
pytest tests/test_assets.py -v

# Run with coverage
pytest --cov=src tests/

# Run async tests
pytest -v --asyncio-mode=auto
```

**Test Files (9 total):**

| File | Tests | Description |
|------|-------|-------------|
| `tests/test_assets.py` | 8 | Asset CRUD operations |
| `tests/test_auth.py` | 5 | Auth login/register |
| `tests/test_monitoring.py` | 6 | Check creation + execution |
| `tests/test_alerts.py` | 5 | Alert rules + incidents |
| `tests/test_notifications.py` | 4 | Channel management |
| `tests/test_sla.py` | 3 | SLA calculation |
| `tests/test_topology.py` | 3 | Dependency graph |
| `tests/test_logs.py` | 4 | Log ingestion + search |
| `tests/conftest.py` | Fixtures | Test setup + DB |

### Frontend Tests

```bash
cd frontend
npm test
# OR
npm run test:run
```

### Docker Test

```bash
# Test in isolated Docker environment
make docker-test
```

---

## 7. Deployment

### Production Docker Deployment

```bash
# 1. Configure production env
export DATABASE_URL=postgresql://user:pass@prod-db:5432/serviceops
export JWT_SECRET=<secure-random-string>
export CORS_ORIGINS=["https://ops.example.com"]

# 2. Build and run
make docker-up

# 3. Verify
curl http://localhost:9080/health
```

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB (SSD) |
| Database | PostgreSQL 15 | PostgreSQL 15 |
| Cache | Redis 7 | Redis 7 |

### Backup & Restore

```bash
# Manual backup
docker exec serviceops-db-1 pg_dump -U postgres serviceops > backup.sql

# Restore
docker exec -i serviceops-db-1 psql -U postgres serviceops < backup.sql

# Automated backup (recommended)
0 3 * * * pg_dump -U postgres serviceops > /backups/$(date +\%Y\%m\%d).sql
```

### Monitoring

```bash
# Check service status
make service-status
# or
docker compose ps

# View logs
make logs
# or
docker compose logs -f backend

# Health check
curl http://localhost:9080/health
```

---

## 8. Development Guide

### Code Standards

- **Backend:** Python 3.12+, FastAPI, async/await, Pydantic models
- **Frontend:** TypeScript, SolidJS, Tailwind CSS
- **Database:** SQLAlchemy, PostgreSQL with UUID primary keys
- **Formatting:** black (Python), prettier (TypeScript)

### Adding New Feature

1. Create DB migration if needed:
   ```sql
   -- Add to init.sql
   ALTER TABLE assets ADD COLUMN new_field VARCHAR(255);
   ```

2. Add backend route in `backend/src/domains/<feature>/routes.py`

3. Add frontend page in `frontend/src/pages/<Feature>Page.tsx`

4. Add route in `frontend/src/App.tsx`

5. Add nav link in `frontend/src/components/Layout.tsx`

6. Run tests:
   ```bash
   make test
   ```

7. Commit changes:
   ```bash
   git add -A
   git commit -m "feat: Add feature description"
   ```

### Domain Structure

```python
# backend/src/domains/<domain>/routes.py
router = APIRouter(prefix="/<domain>", tags=["<Domain>"])

@router.get("/items")
async def list_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all items"""
    ...

@router.post("/items")
async def create_item(
    data: CreateItemRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new item"""
    ...

@router.get("/items/{item_id}")
async def get_item(
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get item by ID"""
    ...
```

### Component Pattern (Frontend)

```tsx
// frontend/src/pages/ExamplePage.tsx
import { createSignal, createResource, Show } from "solid-js"
import { Layout } from "../components/Layout"

export default function ExamplePage() {
  const [items] = createResource(() => fetchItems())

  return (
    <Layout>
      <div>
        <Show when={items()} fallback={<div>Loading...</div>}>
          <table>
            {items().map(item => <tr>{item.name}</tr>)}
          </table>
        </Show>
      </div>
    </Layout>
  )
}
```

---

## 9. User Guide

See [USER_GUIDE.md](./USER_GUIDE.md) for complete user instructions including:

- **Getting Started** — First login, dashboard overview, quick actions
- **Asset Management** — Creating, editing, filtering, importing assets
- **Monitoring** — HTTP, Ping, SSL, TCP check setup and results
- **Alerts & Incidents** — Rules, lifecycle, acknowledgment, resolution
- **Notifications** — Telegram, Discord, Email channel setup
- **SLA Tracking** — Targets, reports, downtime calculation
- **Topology** — Dependency graph, impact analysis
- **Logs** — Search, filter, ingestion
- **API Usage** — Token authentication, endpoint examples
- **Troubleshooting** — Common issues and solutions

---

## 10. Troubleshooting

### Common Issues

**Problem:** Can't login
- Verify email/password
- Default: admin@serviceops.local / admin123
- Check backend is running: `curl http://localhost:9080/health`

**Problem:** Checks show no results
- New checks take 60 seconds to execute
- Verify check is enabled
- Check backend health
- Review check configuration

**Problem:** Incidents not triggering
- Alert rule must be enabled
- Monitoring check must be enabled
- Condition must match actual failure
- Notification channel must be configured

**Problem:** Telegram alerts not arriving
- Test channel first (click Test button)
- Verify bot token is correct
- Verify chat ID is correct
- Check bot permissions in chat

**Problem:** Docker services not starting
- Check port availability: `lsof -i :9080`
- Check Docker resources: `docker stats`
- View logs: `docker compose logs`
- Rebuild: `docker compose up -d --build`

### Getting Help

- **Documentation:** See docs/ folder
- **API Status:** GET /health
- **Logs:** View backend logs via make logs
- **GitLab:** [gitlab.com/QTI/QTI-Research/service-ops](https://gitlab.com/QTI/QTI-Research/service-ops)
- **Contact:** Support team via Telegram

---

*© 2026 QTI Research. All rights reserved.*
