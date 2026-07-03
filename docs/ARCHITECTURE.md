# ServiceOps Platform — Architecture Overview

**Version:** 1.1.0  
**Updated:** July 2026

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (SolidJS)                         │
│                    http://localhost:5173                           │
└────────────────────┬─────────────────────────────────────────────┘
                     │ HTTP (Vite proxy → /api/*)
                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ServiceOps Backend (Robyn 0.88)                │
│                    http://0.0.0.0:9080                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                    Domains                               │     │
│  │  ┌──────┐ ┌──────┐ ┌────┐ ┌────┐ ┌──────┐ ┌──────┐   │     │
│  │  │Auth  │ │Assets│ │Mon │ │Alrt│ │Notif │ │Docker│   │     │
│  │  └──────┘ └──────┘ └────┘ └────┘ └──────┘ └──────┘   │     │
│  │  ┌──────┐ ┌──────┐ ┌────┐ ┌────┐                       │     │
│  │  │Audit │ │Logs  │ │SLA │ │Topo│                       │     │
│  │  └──────┘ └──────┘ └────┘ └────┘                       │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                    Middleware                             │     │
│  │  • CORS (before_request) • Auth/JWT • Audit Logging     │     │
│  └─────────────────────────────────────────────────────────┘     │
└────────┬────────────┬────────────────┬───────────────────────────┘
         │            │                │ SSH (asyncssh)
         ▼            ▼                ▼
┌────────────────┐ ┌───────┐  ┌──────────────────┐
│   PostgreSQL   │ │ Redis │  │   Remote VM      │
│  serviceops_dev│ │ cache │  │   Docker Host    │
└────────────────┘ └───────┘  └──────────────────┘
```

---

## Domain Modules

### Auth (`backend/src/domains/auth/`)
- JWT-based authentication (access + refresh tokens)
- bcrypt password hashing
- RBAC: roles → permissions → users
- Middleware: `@requires_auth`, `@requires_role`

### Assets (`backend/src/domains/assets/`)
- CMDB (Configuration Management Database)
- Asset types, tags, relationships
- CSV import bulk upload

### Monitoring (`backend/src/domains/monitoring/`)
- Plugin architecture: HTTP, Ping, TCP, DNS, SSL
- Scheduler: background task checker (every 30s)
- Check results → alert evaluation

### Alerts (`backend/src/domains/alerts/`)
- Alert rules + threshold evaluation
- Incident lifecycle: open → acknowledged → resolved
- Notification dispatch via rule→channel mapping

### Notifications (`backend/src/domains/notifications/`)
- Multi-channel: Telegram, Email, Discord, Slack, Webhook
- Rate limiting + retry logic
- Test-before-save

### Docker (`backend/src/domains/docker/`)
- **ssh_client.py** — async SSH via `asyncssh` with connection pooling
- **service.py** — business logic: list/start/stop/remove containers
- **crypto.py** — Fernet AES-128 credential encryption
- **routes.py** — 40+ REST endpoints
- **monitor** — SSH exec `uptime`, `ps aux`, `free`, `df`, `docker`
- **alerts** — per-host alert rules with sustained breach tracking

### Logs (`backend/src/domains/logs/`)
- Search/index container logs
- Stream logs via SSE

### SLA (`backend/src/domains/sla/`)
- Uptime calculation
- Policy-based SLA tracking

---

## Key Design Decisions

### Docker SSH Integration
```
Backend → asyncssh → Remote VM → docker CLI commands
```
- **Why not Docker API remotely?** — Clients prefer existing SSH infrastructure
- **Why asyncssh?** — Non-blocking + connection pooling
- **Encryption** — All credentials encrypted with Fernet before DB storage

### Host Alerting System
```
Monitor plugin → exec SSH → parse stdout → evaluate rules → fire incident
                                                                ↓
                                                  notification via Telegram/Email/etc
```
- Sustained breach tracking — `host_alert_sustained` table persists breach count
- Cooldown prevents notification spam
- Multi-metric: CPU %, Memory %, Disk %, Inode %

### CORS
- `before_request` middleware handles OPTIONS preflight
- `json_response` utility adds CORS headers to every JSON response
- All origins allowed (`*`) for dev — restrict in production

---

## Technology Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| **Backend** | Python + Robyn | 0.88.0 | Async web framework (Rust-backed) |
| **Database** | PostgreSQL | 16 | Primary database |
| **Cache** | Redis | 7 | Sessions, rate limiter, SSE |
| **ORMLess** | psycopg (v3) | 3.1+ | Async SQL driver |
| **SSH** | asyncssh | 2.14+ | Remote Docker host access |
| **Encryption** | cryptography (Fernet) | — | AES-128 credential cipher |
| **Frontend** | SolidJS | 1.8+ | Reactive UI framework |
| **Styling** | Tailwind CSS | 3 | Utility-first CSS |
| **Build** | Vite | 5+ | Frontend bundler |
| **Router** | @solidjs/router | 0.13 | Client-side routing |

---

## Data Flow Example

### User adds alert rule:

```
1. Browser → POST /hosts/:id/alerts/rules
2. Backend route → parse body → validate
3. Repo → INSERT INTO host_alert_rules
4. Response 201 → { id: "uuid" }
5. Browser calls GET /hosts/:id/alerts/rules → refresh list
```

### Scheduler checks alerts:

```
1. Every 30s → scheduler, iterates all host_alert_rules
2. For each rule → SSH exec → get metric value
3. Compare vs threshold (with duration)
4. If breach sustained → INSERT host_alert_incident
5. Dispatch notification via rule channels
```
