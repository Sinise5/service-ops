# ServiceOps Platform — Project Overview (Part 2)

**Lanjutan dari PROJECT_OVERVIEW.md bagian 1**

---

## 5. Arsitektur Sistem

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  Web Browser (Chrome, Firefox, Safari)                      │
│  Mobile App (future: React Native)                          │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                            │
│  SolidJS + Tailwind CSS (Port 5173)                         │
│  - 11 Pages (Dashboard, Assets, Monitoring, etc.)           │
│  - API Client (fetch + JWT auth)                            │
│  - State Management (SolidJS stores)                         │
└─────────────────────────────────────────────────────────────┘
                          ↓ REST API
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                            │
│  FastAPI (Python 3.12) + Robyn (Port 9080)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  9 Domain Modules:                                   │   │
│  │  - auth (JWT + bcrypt)                               │   │
│  │  - assets (CMDB)                                     │   │
│  │  - monitoring (health checks)                        │   │
│  │  - alerts (rules + incidents)                        │   │
│  │  - notifications (Telegram/Discord/Email)            │   │
│  │  - sla (uptime tracking)                             │   │
│  │  - topology (dependency graph)                       │   │
│  │  - logs (centralized logging)                        │   │
│  │  - audit (activity tracking)                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Background Workers:                                         │
│  - Monitoring Scheduler (executes checks every 30s)         │
│  - Alert Evaluator (checks rules after each execution)      │
│  - Notification Sender (delivers alerts)                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER                          │
│                                                              │
│  PostgreSQL 15 (Port 5432)          Redis 7 (Port 6379)     │
│  - 26 tables                        - Session cache         │
│  - Full-text search                 - Job queue             │
│  - UUID primary keys                - Rate limiting         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  INTEGRATION LAYER                           │
│                                                              │
│  Telegram Bot API    Discord Webhooks    SMTP Servers       │
│  Custom Webhooks     External APIs       Log Shippers       │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Database Schema (26 Tables)

**Core Tables:**

| Table | Rows (avg) | Purpose |
|-------|------------|---------|
| `users` | 10-100 | User accounts + roles |
| `asset_types` | 8 | Predefined asset categories |
| `assets` | 100-10,000 | IT resource inventory |
| `contacts` | 50-500 | Asset contact information |
| `monitoring_checks` | 200-5,000 | Health check configurations |
| `check_results` | 10,000-1M | Execution history (rolling 30 days) |
| `alert_rules` | 100-1,000 | Alert conditions |
| `incidents` | 500-50,000 | Incident records |
| `incident_comments` | 1,000-100,000 | Timeline comments |
| `incident_timeline` | 2,000-200,000 | Status changes |
| `notification_channels` | 5-50 | Delivery endpoints |
| `notification_logs` | 10,000-1M | Delivery records (rolling 30 days) |
| `sla_targets` | 50-500 | Uptime targets |
| `sla_reports` | 500-5,000 | Generated reports |
| `dependencies` | 100-10,000 | Topology edges |
| `logs` | 100,000-10M | Centralized logs (rolling 30 days) |
| `audit_logs` | 10,000-1M | User activity tracking |

**Schema Design Principles:**
- ✅ UUID primary keys — distributed system ready
- ✅ Created/updated timestamps — full audit trail
- ✅ Soft deletes — `deleted_at` column (not implemented yet)
- ✅ JSON columns — flexible metadata storage
- ✅ Foreign keys — referential integrity enforced
- ✅ Indexes — optimized for read-heavy workloads

### 5.3 API Design

**REST Principles:**
- ✅ Resource-based URLs — `/assets`, `/monitoring/checks`
- ✅ HTTP verbs — GET (read), POST (create), PUT (update), DELETE (delete)
- ✅ JSON payloads — request + response
- ✅ Status codes — 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Error
- ✅ Pagination — `page` + `limit` query params
- ✅ Filtering — query params for search/filter
- ✅ Authentication — JWT bearer token

**API Conventions:**
```
GET    /assets              → List all assets
POST   /assets              → Create new asset
GET    /assets/{id}         → Get single asset
PUT    /assets/{id}         → Update asset
DELETE /assets/{id}         → Delete asset

GET    /monitoring/checks   → List checks
POST   /monitoring/checks   → Create check
GET    /monitoring/checks/{id}/results → Get check results

POST   /auth/login          → Login (get JWT token)
POST   /auth/register       → Register new user
GET    /auth/me             → Get current user profile
```

### 5.4 Background Worker Architecture

**Monitoring Scheduler:**
```python
# Pseudocode
while True:
    # Fetch all enabled checks
    checks = db.query(MonitoringCheck).filter(enabled=True).all()
    
    # Filter checks that are due (last_checked_at + interval < now)
    due_checks = [c for c in checks if c.is_due()]
    
    # Execute checks in parallel (ThreadPoolExecutor)
    with ThreadPoolExecutor(max_workers=10) as executor:
        results = executor.map(execute_check, due_checks)
    
    # Save results to database
    for check, result in zip(due_checks, results):
        db.save(CheckResult(
            check_id=check.id,
            status=result.status,
            response_time=result.response_time,
            error=result.error
        ))
        
        # Evaluate alert rules
        evaluate_alert_rules(check, result)
    
    # Sleep 30 seconds
    time.sleep(30)
```

**Alert Evaluator:**
```python
def evaluate_alert_rules(check, result):
    rules = db.query(AlertRule).filter(check_id=check.id, enabled=True).all()
    
    for rule in rules:
        if rule.condition_met(result):
            # Create incident
            incident = Incident(
                rule_id=rule.id,
                asset_id=check.asset_id,
                severity=rule.severity,
                message=f"Alert triggered: {rule.name}",
                status="open"
            )
            db.save(incident)
            
            # Send notifications
            send_notifications(incident, rule.notification_channels)
```

---

## 6. Tech Stack

### 6.1 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.12+ | Core language |
| **FastAPI** | 0.110+ | Web framework |
| **Robyn** | 0.84+ | Rust-backed ASGI server (alternative to Uvicorn) |
| **SQLAlchemy** | 2.0+ | ORM + query builder |
| **asyncpg** | 0.29+ | Async PostgreSQL driver |
| **PyJWT** | 2.8+ | JWT token handling |
| **bcrypt** | 4.1+ | Password hashing |
| **httpx** | 0.27+ | Async HTTP client (for monitoring checks) |
| **pytest** | 8.0+ | Testing framework |
| **pytest-asyncio** | 0.23+ | Async test support |
| **redis-py** | 5.0+ | Redis client |
| **python-multipart** | 0.0.9+ | File upload support |

**Why FastAPI?**
- ✅ Async/await native — high concurrency
- ✅ Pydantic validation — type-safe request/response
- ✅ Auto-generated OpenAPI docs — `/docs` endpoint
- ✅ Dependency injection — clean architecture
- ✅ Performance — comparable to Node.js/Go

**Why Robyn over Uvicorn?**
- ✅ Rust-backed — 2-3x faster than pure Python ASGI
- ✅ Built-in WebSocket support
- ✅ Lower memory footprint
- ✅ Still ASGI-compliant — works with FastAPI

### 6.2 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **SolidJS** | 1.8+ | Reactive UI framework |
| **@solidjs/router** | 0.13+ | Client-side routing |
| **Tailwind CSS** | 3.4+ | Utility-first CSS |
| **Vite** | 5.2+ | Build tool + dev server |
| **TypeScript** | 5.4+ | Type-safe JavaScript |
| **lucide-solid** | 0.378+ | Icon library |
| **@tanstack/solid-query** | — | Server state management (future) |

**Why SolidJS over React?**
- ✅ True reactivity — no virtual DOM, no re-renders
- ✅ Smaller bundle — ~7KB vs React 42KB
- ✅ Faster — 1.5-2x faster than React
- ✅ Less boilerplate — no `useEffect` needed
- ✅ Better DX — simpler mental model

**Why Tailwind CSS?**
- ✅ Utility-first — rapid prototyping
- ✅ No context switching — HTML + CSS in same file
- ✅ Consistent design system — spacing, colors, typography
- ✅ Tree-shaking — unused classes removed
- ✅ Responsive built-in — `md:`, `lg:`, `xl:` prefixes

### 6.3 Database & Cache

| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 15+ | Primary database |
| **Redis** | 7+ | Cache + job queue |

**Why PostgreSQL?**
- ✅ JSON support — flexible metadata storage
- ✅ Full-text search — built-in FTS (to_tsvector)
- ✅ ACID compliance — data integrity
- ✅ Mature — 30+ years of development
- ✅ Extensions — PostGIS, pg_trgm, etc.

**Why Redis?**
- ✅ In-memory — sub-millisecond latency
- ✅ Data structures — strings, lists, sets, sorted sets, hashes
- ✅ Pub/sub — real-time messaging
- ✅ Job queue — Celery/RQ support
- ✅ Session storage — JWT token cache

### 6.4 DevOps & Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| **Docker** | 24+ | Containerization |
| **Docker Compose** | 2.20+ | Multi-container orchestration |
| **Make** | — | Build automation |
| **uv** | 0.2+ | Python package manager (Rust-backed, 10-100x faster than pip) |
| **nginx** | 1.25+ | Reverse proxy (production) |
| **systemd** | — | Service management (production) |

---

## 7. Use Case & Skenario

### 7.1 Skenario 1: Startup dengan 10-50 Server

**Profil:**
- Team size: 2-3 engineers
- Infrastructure: 10 servers + 5 databases + 20 API endpoints
- Budget: $0-500/month (no enterprise tools)
- SLA target: 99.9% uptime

**Before ServiceOps:**
- Manual checks via browser (visit URLs)
- No alerting — discover issues via user complaints
- No SLA tracking — report manual via Excel
- No dependency mapping — guesswork when cascading failures

**After ServiceOps:**
- 35 assets in CMDB
- 50 monitoring checks (HTTP + Ping + SSL)
- Telegram alerts to #ops-team channel
- SLA dashboard shows 99.92% uptime
- Topology graph identifies single point of failure

**ROI:**
- Time saved: 10 hours/week → 40 hours/month → $2,000/month (at $50/hour)
- Incident resolution time: 30 min → 5 min (6x faster)
- Prevented outages: 2-3/month → $10,000+ saved

---

### 7.2 Skenario 2: Agency dengan Multiple Clients

**Profil:**
- Team size: 5-10 engineers
- Clients: 10-20 companies
- Infrastructure per client: 5-20 servers
- Need: Multi-tenant monitoring

**Before ServiceOps:**
- Separate UptimeRobot accounts per client ($58/month × 20 = $1,160/month)
- Manual incident reporting via email
- No client-facing SLA dashboard

**After ServiceOps:**
- Single instance with tag-based filtering (`client=company-a`)
- Client-specific Telegram channels
- Auto-generated SLA reports per client
- White-label frontend (coming soon)

**ROI:**
- Cost saved: $1,160/month → $0 (self-hosted)
- Time saved: 20 hours/month reporting → 2 hours/month
- Client satisfaction: +30% (real-time visibility)

---

### 7.3 Skenario 3: Enterprise dengan 500+ Assets

**Profil:**
- Team size: 20-50 engineers (DevOps + SRE)
- Infrastructure: 500 servers + 100 databases + 200 APIs
- Current tools: Datadog ($15/host × 500 = $7,500/month)
- Need: Cost reduction without feature loss

**After ServiceOps:**
- 800 assets in CMDB
- 1,200 monitoring checks
- Integration with PagerDuty via webhooks
- Advanced analytics (future: ML-based anomaly detection)

**ROI:**
- Cost saved: $7,500/month → $500/month (server costs) = $7,000/month saved
- Annual savings: $84,000
- Break-even: 1 month (vs. hiring 1 FTE SRE at $150k/year)

---

## 8. Cara Menggunakan

### 8.1 Quick Start (5 Menit)

**Step 1: Clone Repository**
```bash
git clone https://gitlab.com/QTI/QTI-Research/service-ops.git
cd serviceops
```

**Step 2: Start dengan Docker Compose**
```bash
make docker-up
# atau: docker compose up -d
```

**Step 3: Buka Browser**
```
Frontend: http://localhost:5173
Backend API: http://localhost:9080

Login:
Email: admin@serviceops.local
Password: admin123
```

**Step 4: Create First Asset**
```
1. Go to Assets page
2. Click + New Asset
3. Fill: Name="My API", Type=API
4. Click Save
```

**Step 5: Create Monitoring Check**
```
1. Go to Monitoring page
2. Click + New Check
3. Select asset: My API
4. Type: HTTP
5. URL: https://api.example.com/health
6. Interval: 60 seconds
7. Click Save
```

**Step 6: Wait 60 Seconds**
- Check executes automatically
- View results in Monitoring page → click check row → View Results

---

### 8.2 Setup Telegram Alerts (10 Menit)

**Step 1: Create Telegram Bot**
```
1. Open Telegram
2. Search @BotFather
3. Send: /newbot
4. Name: ServiceOps Alerts
5. Username: serviceops_alerts_bot
6. Copy bot token: 123456789:ABCdef...
```

**Step 2: Get Chat ID**
```
1. Create private group in Telegram
2. Add bot to group
3. Send any message in group
4. Visit: https://api.telegram.org/bot<TOKEN>/getUpdates
5. Find "chat":{"id":-1001234567890}
6. Copy chat ID (dengan minus sign)
```

**Step 3: Configure in ServiceOps**
```
1. Go to Notifications page
2. Click + New Channel
3. Type: Telegram
4. Bot Token: paste token
5. Chat ID: paste chat ID
6. Click Test → verify message arrives
7. Click Save
```

**Step 4: Link Alert Rule**
```
1. Go to Alerts page
2. Click + New Rule
3. Select monitoring check
4. Condition: status_code != 200
5. Severity: critical
6. Enable rule
7. Link to Telegram channel
8. Click Save
```

---

### 8.3 Production Deployment

**Option A: Docker Compose (Recommended)**
```bash
# 1. Clone repository
git clone https://gitlab.com/QTI/QTI-Research/service-ops.git
cd serviceops

# 2. Configure environment
cp .env.example .env
nano .env
# Update: DATABASE_URL, JWT_SECRET, CORS_ORIGINS

# 3. Start services
docker compose -f docker-compose.prod.yml up -d

# 4. Configure nginx reverse proxy
sudo nano /etc/nginx/sites-available/serviceops
# (see docs/DEPLOYMENT.md for nginx config)

# 5. Enable SSL with Let's Encrypt
sudo certbot --nginx -d ops.example.com
```

**Option B: Manual Deployment**
```bash
# Backend
cd backend
uv sync --frozen
uv run alembic upgrade head
PORT=9080 uv run python run_server.py &

# Frontend (build)
cd frontend
npm install
npm run build
# Serve dist/ folder via nginx

# systemd service
sudo cp scripts/serviceops-backend.service /etc/systemd/system/
sudo systemctl enable serviceops-backend
sudo systemctl start serviceops-backend
```

---

### 8.4 Common Workflows

**Workflow 1: Add New Server to Monitoring**
```
1. Assets → + New Asset
   Name: Production Web Server
   Type: Server
   IP: 192.168.1.100

2. Monitoring → + New Check
   Type: Ping
   Target: 192.168.1.100
   Interval: 300 seconds

3. Alerts → + New Rule
   Condition: check_failed
   Severity: warning
   Link to Telegram channel
```

**Workflow 2: Investigate Incident**
```
1. Incidents page → click incident row
2. View timeline → see when created, acknowledged
3. Check related monitoring results
4. View asset dependencies → identify impact
5. Add comment: "Found root cause: disk full"
6. Mark as resolved
```

**Workflow 3: Monthly SLA Report**
```
1. SLA page → select asset
2. View current month report
3. Export to CSV
4. Send to stakeholders via email
```

