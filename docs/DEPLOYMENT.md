# ServiceOps Platform — Deployment Guide

**Version:** 1.1.0  
**Updated:** July 2026

---

## 1. Architecture (Docker Deploy)

```
┌──────────────┐     ┌──────────────────┐    ┌─────────────┐
│  Nginx/Rev Proxy  │ → │ ServiceOps       │ → │ PostgreSQL  │
│  (optional)       │    │ Backend (Python)  │    │             │
│  port 80/443      │    │ port 9080          │    │ port 5432   │
└──────────────────┘    └────────┬─────────┘    └─────────────┘
                                  │                  ↑
                                  │ SSH              │
                                  ▼                  │
                           ┌──────────────┐    ┌─────────────┐
                           │ Remote VM    │    │   Redis     │
                           │ Docker Host  │    │   port 6379 │
                           └──────────────┘    └─────────────┘
```

## 2. Production Deploy (10.10.10.201)

### Step 1 — Clone & checkout

```bash
ssh isep@10.10.10.201
git clone https://gitlab.com/QTI/QTI-Research/service-ops.git
cd serviceops
git checkout feature/docker-management   # until merged to main
```

### Step 2 — Setup env

```bash
# Backend config
cat > backend/.env << 'EOF'
PORT=9080
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/serviceops_dev
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=<generate-random-64-chars>
CORS_ORIGINS='["http://localhost:5173","https://serviceops.yourdomain.com"]'
LOG_LEVEL=info
EOF

# Generate JWT secret
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### Step 3 — Start with Docker Compose

```bash
# Start all services
docker compose up -d --build

# Check logs
docker compose logs -f backend
docker compose logs -f migrate  # verify migration ran

# Check health
curl http://localhost:9080/health
```

### Step 4 — Verify

```bash
# API health
curl http://localhost:9080/health
# → {"status":"ok"}

# Frontend
curl http://localhost:5173
# → HTML page loads
```

---

## 3. Migration System

### Docker Compose Migration Flow

```
Compose starts → migrate container → psql -f docker-migration.sql → exit 0 → backend starts
                                                                    ↓ exit 1
                                                                    compose stops
```

**File: `docker-migration.sql`**
- Contains ALL DDL (`CREATE TABLE IF NOT EXISTS`)
- Safe for fresh install AND incremental updates
- Includes: `docker_hosts`, `docker_compose_projects`, `host_alert_rules`, etc.

### Manual Migration

```bash
# Fresh DB
psql -d serviceops_dev -f init.sql

# Incremental
psql -d serviceops_dev -f docker-migration.sql

# Or run individual migrations
psql -d serviceops_dev -f backend/migrations/0013_docker_alerts.sql
psql -d serviceops_dev -f backend/migrations/0014_host_alert_rules.sql
```

---

## 4. Environment Variables

| Variable | Default | Required | Notes |
|----------|---------|----------|-------|
| `PORT` | `9080` | ✅ | Backend listen port |
| `DATABASE_URL` | — | ✅ | PostgreSQL connection string |
| `REDIS_URL` | — | ✅ | Redis connection string |
| `JWT_SECRET` | — | ✅ | Generate with `secrets.token_urlsafe(64)` |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 🔲 | JSON array of allowed origins |
| `LOG_LEVEL` | `info` | 🔲 | debug/info/warning/error |
| `DOCKER_ENC_KEY` | auto-generated | 🔲 | Fernet key path (default: `.docker_enc_key`) |

---

## 5. Post-Deploy Checklist

- [ ] Backend health check → `curl /health`
- [ ] Frontend loads → browser open
- [ ] Login → `admin@serviceops.local / admin123`
- [ ] Docker hosts visible → sidebar → Docker
- [ ] Test connection → each host
- [ ] Alert rules → add threshold rule
- [ ] CORS → frontend can call API without errors
- [ ] Notifications → test channel → send test message

---

## 6. Troubleshooting

### Backend won't start

```bash
docker compose logs backend
# Check DB_URL, Redis connection, port conflicts
```

### Migration failed

```bash
docker compose logs migrate
#  psql error → fix SQL → re-run manually:
docker compose run --rm migrate sh -c "psql \$DATABASE_URL -f /docker-migration.sql"
```

### Host offline (permission denied)

```bash
# SSH ke host, add user to docker group
ssh isep@10.10.10.X
sudo usermod -aG docker isep
exit
# Re-login SSH session or:
sudo systemctl restart docker
```

### CORS errors in browser

```bash
# Check backend response headers:
curl -sv -H "Origin: http://localhost:5173" http://localhost:9080/health 2>&1 | grep -i access-control
# Should have: access-control-allow-origin: *
```

---

## 7. Docker Image Build

### Backend

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY backend/ .
RUN pip install uv && uv sync --frozen --no-dev
CMD ["uv", "run", "python", "-m", "src.main"]
```

### Frontend

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/ .
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
```
