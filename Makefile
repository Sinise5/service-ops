.PHONY: help local-build local-start local-stop docker-build docker-up docker-down build up down restart logs logs-all health clean test db-init

# =============================================================
# MODE DETECTION
# =============================================================
DOCKER_CMD := $(shell command -v docker 2>/dev/null)
UV_CMD := $(shell command -v uv 2>/dev/null)
NODE_CMD := $(shell command -v npm 2>/dev/null)

help: ## Show this help message
	@echo "ServiceOps — Dual Mode (Local + Docker)"
	@echo ""
	@echo "LOCAL MODE (no Docker required):"
	@grep -E '^local-' $(MAKEFILE_LIST) | awk -F: '{print "  " $$1}' | sed 's/local-/make local-/'
	@echo ""
	@echo "DOCKER MODE:"
	@grep -E '^docker-|^build|^up|^down' $(MAKEFILE_LIST) | grep -v local | awk -F: '{print "  " $$1}' | head -10
	@echo ""
	@echo "Examples:"
	@echo "  make local-start   # Run backend + frontend locally (no Docker)"
	@echo "  make local-stop    # Kill local processes"
	@echo "  make docker-up     # Start with Docker Compose"
	@echo "  make health        # Check service status"

# =============================================================
# LOCAL MODE — Run natively (uv + Node)
# =============================================================

local-build: ## Install dependencies locally (uv + npm)
	@echo "📦 Installing local dependencies..."
	@if [ -z "$(UV_CMD)" ]; then echo "❌ uv not found — install: curl -LsSf https://astral.sh/uv/install.sh | sh"; exit 1; fi
	@if [ -z "$(NODE_CMD)" ]; then echo "❌ npm not found"; exit 1; fi
	cd backend && uv sync
	cd frontend && npm install -q
	@echo "✅ Dependencies installed"

local-start: local-build ## Start backend + frontend locally
	@echo "🚀 Starting ServiceOps (LOCAL MODE)"
	@echo ""
	@echo "Killing existing processes on ports 9080, 5173..."
	@lsof -ti:9080 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo ""
	@echo "Backend (port 9080):"
	@mkdir -p /tmp/logs
	@cd backend && uv run python run_server.py > /tmp/serviceops-backend.log 2>&1 &
	@sleep 4
	@echo ""
	@echo "Frontend (port 5173):"
	@cd frontend && npm run dev > /tmp/serviceops-frontend.log 2>&1 &
	@sleep 3
	@echo ""
	@echo "✅ Services started:"
	@echo "   Frontend:  http://localhost:5173"
	@echo "   Backend:   http://localhost:9080"
	@echo "   Login:     admin@serviceops.local / admin123"
	@echo ""
	@echo "Logs:"
	@echo "   Backend:  tail -f /tmp/serviceops-backend.log"
	@echo "   Frontend: tail -f /tmp/serviceops-frontend.log"

local-stop: ## Stop local services
	@echo "⏹️  Stopping local services..."
	@lsof -ti:9080 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "✅ Services stopped"

local-be: ## Start backend only (fast, skip dependency install)
	@echo "🐍 Starting backend (uv run)..."
	@lsof -ti:9080 | xargs kill -9 2>/dev/null || true
	@cd backend && uv run python run_server.py > /tmp/serviceops-backend.log 2>&1 &
	@sleep 4
	@curl -s --max-time 2 http://localhost:9080/health && echo "" || echo "⚠️  Backend may not be ready yet"

local-be-fast: ## Restart backend fast (no uv sync, assumes deps installed)
	@echo "🐍 Fast restart backend..."
	@lsof -ti:9080 | xargs kill -9 2>/dev/null || true
	@cd backend && uv run python run_server.py > /tmp/serviceops-backend.log 2>&1 &
	@sleep 4
	@curl -s --max-time 2 http://localhost:9080/health && echo "" || echo "⚠️  Backend may not be ready yet"

local-test: ## Run backend tests locally
	@echo "🧪 Running tests..."
	cd backend && uv run pytest tests/ -v

local-db-init: ## Run DB migrations (create docker_* tables)
	@echo "🔄 Running DB migrations..."
	@psql "postgresql://postgres:postgres@localhost:5432/serviceops_dev" -c "CREATE TABLE IF NOT EXISTS docker_hosts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL, host VARCHAR(255) NOT NULL, port INTEGER DEFAULT 22, username VARCHAR(100) NOT NULL, auth_type VARCHAR(20) DEFAULT 'password' NOT NULL, password_encrypted TEXT, ssh_key_encrypted TEXT, ssh_key_passphrase_encrypted TEXT, default_path VARCHAR(500) DEFAULT '/opt/docker', docker_context VARCHAR(100), tags JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT TRUE, last_connected_at TIMESTAMPTZ, created_by UUID, created_at TIMESTAMPTZ DEFAULT now() NOT NULL, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL);" 2>&1
	@psql "postgresql://postgres:postgres@localhost:5432/serviceops_dev" -c "CREATE TABLE IF NOT EXISTS docker_compose_projects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), host_id UUID NOT NULL REFERENCES docker_hosts(id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, path VARCHAR(500) NOT NULL, services JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT now() NOT NULL, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL);" 2>&1
	@psql "postgresql://postgres:postgres@localhost:5432/serviceops_dev" -c "CREATE TABLE IF NOT EXISTS docker_deploy_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL, description TEXT, image VARCHAR(500) NOT NULL, default_ports JSONB DEFAULT '[]', default_envs JSONB DEFAULT '[]', default_volumes JSONB DEFAULT '[]', restart_policy VARCHAR(50) DEFAULT 'no', is_system BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT now() NOT NULL);" 2>&1
	@psql "postgresql://postgres:postgres@localhost:5432/serviceops_dev" -c "CREATE TABLE IF NOT EXISTS container_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), host_id UUID REFERENCES docker_hosts(id) ON DELETE CASCADE, container_id VARCHAR(100) NOT NULL, container_name VARCHAR(255), content TEXT, stream VARCHAR(10) DEFAULT 'stdout', timestamp TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now() NOT NULL);" 2>&1
	@psql "postgresql://postgres:postgres@localhost:5432/serviceops_dev" -c "CREATE INDEX IF NOT EXISTS idx_container_logs_container ON container_logs(container_id); CREATE INDEX IF NOT EXISTS idx_container_logs_created ON container_logs(created_at DESC); CREATE INDEX IF NOT EXISTS idx_docker_hosts_created_by ON docker_hosts(created_by);" 2>&1
	@echo "✅ DB tables created"

local-db-seed: ## Seed system deploy templates
	@echo "🌱 Seeding system templates..."
	@psql "postgresql://postgres:postgres@localhost:5432/serviceops_dev" -c "INSERT INTO docker_deploy_templates (name, description, image, default_ports, default_envs, default_volumes, restart_policy, is_system) VALUES ('Nginx', 'Web server with port 80', 'nginx:alpine', '[{\"host_port\": 80, \"container_port\": 80, \"protocol\": \"tcp\"}]', '[]', '[]', 'unless-stopped', TRUE), ('PostgreSQL', 'PostgreSQL 16 database', 'postgres:16', '[{\"host_port\": 5432, \"container_port\": 5432, \"protocol\": \"tcp\"}]', '[{\"key\": \"POSTGRES_PASSWORD\", \"value\": \"changeme\"}]', '[{\"host_path\": \"/data/postgres\", \"container_path\": \"/var/lib/postgresql/data\", \"read_only\": false}]', 'unless-stopped', TRUE), ('Redis', 'Redis 7 in-memory cache', 'redis:7-alpine', '[{\"host_port\": 6379, \"container_port\": 6379, \"protocol\": \"tcp\"}]', '[]', '[]', 'unless-stopped', TRUE), ('MySQL', 'MySQL 8 database', 'mysql:8', '[{\"host_port\": 3306, \"container_port\": 3306, \"protocol\": \"tcp\"}]', '[{\"key\": \"MYSQL_ROOT_PASSWORD\", \"value\": \"changeme\"}]', '[{\"host_path\": \"/data/mysql\", \"container_path\": \"/var/lib/mysql\", \"read_only\": false}]', 'unless-stopped', TRUE), ('Node.js App', 'Node.js 20 runtime', 'node:20-alpine', '[{\"host_port\": 3000, \"container_port\": 3000, \"protocol\": \"tcp\"}]', '[{\"key\": \"NODE_ENV\", \"value\": \"production\"}]', '[]', 'unless-stopped', TRUE), ('Python App', 'Python 3.12 slim', 'python:3.12-slim', '[{\"host_port\": 8000, \"container_port\": 8000, \"protocol\": \"tcp\"}]', '[{\"key\": \"PYTHONUNBUFFERED\", \"value\": \"1\"}]', '[]', 'unless-stopped', TRUE) ON CONFLICT DO NOTHING;" 2>&1
	@echo "✅ Templates seeded"

# =============================================================
# DOCKER MODE — Use Docker Compose
# =============================================================

docker-build: ## Build Docker images
	@if [ -z "$(DOCKER_CMD)" ]; then echo "❌ Docker not installed"; exit 1; fi
	@echo "🔨 Building Docker images..."
	docker compose build
	@echo "✅ Images built"

docker-up: ## Start Docker services
	@if [ -z "$(DOCKER_CMD)" ]; then echo "❌ Docker not installed"; exit 1; fi
	@echo "🚀 Starting Docker services..."
	docker compose up -d
	@sleep 5
	@echo "✅ Services started:"
	@echo "   Frontend:  http://localhost:5173"
	@echo "   Backend:   http://localhost:9080"
	@echo "   Database:  localhost:5432"

docker-down: ## Stop Docker services
	@echo "⏹️  Stopping Docker services..."
	docker compose down
	@echo "✅ Services stopped"

docker-logs: ## View Docker logs (all services)
	docker compose logs -f

docker-restart: ## Restart Docker services
	@echo "🔄 Restarting Docker services..."
	docker compose restart
	@echo "✅ Services restarted"

# =============================================================
# UNIVERSAL SHORTCUTS
# =============================================================

build: ## Alias: build (auto-detect mode)
	@if [ -n "$(DOCKER_CMD)" ]; then make docker-build; else echo "⚠️  Docker not available. Use: make local-build"; fi

up: ## Alias: start services (auto-detect mode)
	@if [ -n "$(DOCKER_CMD)" ]; then make docker-up; else make local-start; fi

down: ## Alias: stop services (auto-detect mode)
	@if [ -n "$(DOCKER_CMD)" ]; then make docker-down; else make local-stop; fi

restart: docker-restart ## Alias: restart services

logs: ## View logs (Docker mode only)
	@if [ -n "$(DOCKER_CMD)" ]; then docker compose logs -f; else echo "⚠️  Not in Docker mode — use: tail -f /tmp/serviceops-backend.log"; fi

logs-all: logs ## Alias: view all logs

health: ## Check service health
	@echo "🏥 Health Check:"
	@echo ""
	@echo "Backend (9080):"
	@curl -s http://localhost:9080/health 2>&1 | head -c 200 || echo "❌ Not responding"
	@echo ""
	@echo "Frontend (5173):"
	@curl -s -I http://localhost:5173 2>&1 | head -1 || echo "❌ Not responding"
	@echo ""

clean: ## Clean up (remove containers, volumes, cache)
	@echo "🗑️  Cleaning up..."
	@if [ -n "$(DOCKER_CMD)" ]; then \
		docker compose down -v; \
		echo "  Docker containers + volumes removed"; \
	fi
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleanup complete"

db-init: local-db-init local-db-seed ## Init DB tables + seed templates (local)

# =============================================================
# QUICK START
# =============================================================

quick-start: ## One-command start (Docker if available, else local)
	@if [ -n "$(DOCKER_CMD)" ]; then \
		echo "🐳 Docker detected — starting with Docker Compose..."; \
		make docker-build && make docker-up; \
	else \
		echo "🐍 Docker not found — starting locally with uv..."; \
		make local-start; \
	fi
	@echo ""
	@echo "✅ ServiceOps started!"
	@echo "   Access: http://localhost:5173"
