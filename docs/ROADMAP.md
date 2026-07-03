# ServiceOps Platform — Development Roadmap

**Target:** Production v2.0 by Q4 2026  
**Current:** Phase 15 Complete (Docker Management)  
**Branch:** `feature/docker-management` (awaiting merge → `main`)

---

## Legend

| Icon | Meaning |
|------|---------|
| ✅ | Complete |
| 🔄 | In Progress |
| 📋 | Planned (low priority) |
| 🚀 | Deployed to Production |

---

## ✅ Phase 0–11: Core Backend

**Status:** ✅ Complete (v1.0 foundation)

| Module | Status | Notes |
|--------|--------|-------|
| Authentication | ✅ | JWT + bcrypt + refresh tokens |
| RBAC | ✅ | Roles, permissions, role-permission mapping |
| Asset Registry (CMDB) | ✅ | Types, tags, relationships, CSV import |
| Monitoring Checks | ✅ | HTTP, Ping, TCP, DNS, SSL plugins |
| Check Scheduler | ✅ | Background task every 30s |
| Alert Rules | ✅ | Threshold-based evaluation |
| Incident Management | ✅ | Open → Ack → Resolved lifecycle |
| SLA Tracking | ✅ | Uptime calculation per check |
| Topology Graph | ✅ | Asset dependency visualization |
| Log Aggregation | ✅ | Search + filter |
| Audit Logging | ✅ | All CRUD actions tracked |
| Notifications | ✅ | Telegram, Email, Discord, Webhook |

---

## ✅ Phase 12: Notifications

**Status:** ✅ Complete

### Deliverables
- ✅ Multi-channel notification dispatch (Telegram, Email, Discord, Slack, Webhook)
- ✅ Notification channels CRUD
- ✅ Test-before-save (dry-run)
- ✅ Rate limiting + retry queue
- ✅ Alert rule ↔ channel mapping
- ✅ Notification templates

### Success Metrics
- ✅ Alert fires → notification sent within 5s
- ✅ Failed notification logged + retry
- ✅ 200+ concurrent notifications handled

---

## ✅ Phase 13: Frontend + Bug Fixes

**Status:** ✅ Complete

### Bug Fixes (Week 14)
| # | Bug | Fix |
|---|-----|-----|
| 1 | Token lost on page refresh | AuthStore localStorage init |
| 2 | Notifications page → logout | Middleware simplified |
| 3 | Asset types dropdown empty | Proxy route added |
| 4 | SLA/Incidents/Checks 400 error | QueryParams default values |
| 5 | Topology page hang → never loads | SQL JOIN fixed |

### Deliverables
- ✅ All 52 API endpoints wired in frontend
- ✅ 11 pages functional (Dashboard, Assets, Monitoring, Alerts, Notifications, SLA, Topology, Logs, Users, Settings, Docker)
- ✅ Zero TypeScript build errors
- ✅ Consistent Layout wrapper across all pages

---

## ✅ Phase 14: Production Readiness

**Status:** ✅ Complete

### Deliverables
- ✅ Docker multi-stage builds (`Dockerfile.backend`, `Dockerfile.frontend`)
- ✅ Docker Compose orchestration (`docker-compose.yml`)
- ✅ Migration service (`docker-migration.sql` with all DDL)
- ✅ Health checks for all services
- ✅ API documentation (OpenAPI/Swagger @ `/docs`)
- ✅ CORS properly configured
- ✅ CI/CD pipeline (GitHub Actions `.github/workflows/`)

### Known Gaps
- 🔄 Rate limiting belum strict (production hardening)
- 🔄 MFA (multi-factor authentication) — planned
- 🔄 Backup/restore UI — planned

---

## ✅ Phase 15: Docker Management

**Status:** ✅ Complete  
**Commits:** `c66318f` (latest)

### Features

| Feature | Since | API Endpoints |
|---------|-------|---------------|
| Multi-host SSH connection | Week 18 | POST `/docker/hosts/:id/test` |
| Container CRUD | Week 18 | 6 endpoints |
| Image management | Week 19 | 4 endpoints |
| Volume management | Week 19 | 3 endpoints |
| Docker Compose | Week 19 | 8 endpoints |
| Credential encryption (Fernet AES-128) | Week 18 | Built-in |
| Host monitoring (top CPU/MEM/df) | Week 20 | GET `/docker/hosts/:id/monitor` |
| Alert thresholds (CPU/Mem/Disk) | Week 20 | 6 endpoints |

### Architecture
```
Frontend → fetch/BASE → Backend (9080) → SSH → Remote Docker Host
          ↑ CORS      ↑ psycopg v3       ↑ asyncssh
          ↑ SolidJS    ↑ Robyn 0.88      ↑ Docker CLI
```

### Known Issues
- ❌ Host offline = permission denied (`/var/run/docker.sock`) — SSH user perlu grup `docker`
- ❌ CORS bytes vs string issue — **FIXED** in `c66318f`
- ❌ HostMonitor render crash — **FIXED** in `530e8a9`

---

## 🔄 Phase 16: RBAC & Permissions Refinement

**Status:** 📋 Planned  
**Priority:** Medium  
**Dependencies:** Phase 15 merge → `main`

### Scope
| Item | Type | ETA |
|------|------|-----|
| Host-level Docker access control | Feature | TBD |
| Permission `docker:manage` role gating | Feature | TBD |
| Audit logging for Docker operations | Feature | TBD |
| User action history viewer | Feature | TBD |

---

## 📋 Phase 17: Agent System + Dashboard

**Status:** 📋 Planned  
**Priority:** Medium  
**Dependencies:** Phase 16

### Scope
| Item | Type | Notes |
|------|------|-------|
| Lightweight agent (Go/Python) | Feature | Installed on each host |
| Real-time CPU/Mem/Disk/NVIDIA metrics | Feature | Agent → API push |
| Live dashboard with charts | Feature | Recharts or Chart.js |
| Anomaly detection | Feature | Threshold + ML baseline |

---

## 📋 Phase 18: Advanced Infrastructure

**Status:** 📋 Planned  
**Priority:** Low–Medium

### Scope
| Item | Priority | Notes |
|------|----------|-------|
| Multi-tenancy | Medium | Tenant-isolated SaaS |
| Kubernetes cluster view | Medium | `kubectl` via SSH |
| Ansible playbook executor | Low | Config management |
| Backup/restore automation | High | DB + config snapshot |
| PDF SLA reports | Low | Scheduled email reports |

---

## Timeline

```
Week  1─11  ████████████  Phase 0–11: Core Backend ✅
Week 12─13  ██████       Phase 12: Notifications ✅
Week 14     ███          Phase 13: Frontend Fixes ✅
Week 15─16  ██████       Phase 14: Production Ready ✅
Week 17─20  ██████████   Phase 15: Docker Management ✅
───────────── NOW ─────────────
Week 21+    —            Phase 16+: RBAC, Agent, Advanced ⏳
```

---

## Production Hosts

| Host | IP | Docker | Status | Notes |
|------|----|--------|--------|-------|
| 🚀 Primary | 10.10.10.201 | 29.4.3 | ✅ Online | Deployed |
| 🚀 GPU | 10.10.10.139 | 29.2.0 | ✅ Online | Tesla T4 |
| 🚀 Windmill | 10.10.10.165 | 24.0.7 | ✅ Online | App runner |
| ❌ CDC Console | 10.10.10.118 | — | ❌ Offline | Needs `sudo usermod -aG docker isep` |
| ❌ DGX | 10.10.10.154 | — | ❌ Offline | ^ |
| ❌ Dify Old | 10.10.10.216 | — | ❌ Offline | ^ |
| ❌ MCP | 10.10.10.86 | — | ❌ Offline | ^ |
| ❌ WA WAHA | 10.10.10.200 | — | ❌ Offline | ^ |

---

## Definition of Done (v2.0)

### Functional
- [x] Multi-user RBAC (admin, manager, viewer)
- [x] Asset registry + 5 check types
- [x] Alert rules + incidents
- [x] Log management + search
- [x] SLA + uptime tracking
- [x] Topology graph + impact
- [x] Notifications (Telegram, Email, Discord, Slack)
- [x] Docker management (containers, images, volumes, compose)
- [x] Host monitoring + alert thresholds
- [ ] Agent-based host metrics
- [ ] Real-time dashboard charts

### Non-Functional
- [x] 68/68 unit tests
- [ ] CI/CD green pipeline
- [ ] Production Docker images
- [x] OpenAPI documentation
- [ ] Backup/restore verified
- [ ] Security audit pass

---

**Next Action:** Merge `feature/docker-management` → `main`, deploy to production (10.10.10.201)
