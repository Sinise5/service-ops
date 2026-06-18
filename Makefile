.PHONY: help local-build local-start local-stop docker-build docker-up docker-down build up down restart logs logs-all health clean test

# =============================================================
# MODE DETECTION
# =============================================================
DOCKER_CMD := $(shell command -v docker 2>/dev/null)
PYTHON_CMD := $(shell command -v python3 2>/dev/null)
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
# LOCAL MODE — Run natively (Python + Node)
# =============================================================

local-build: ## Install dependencies locally
	@echo "📦 Installing local dependencies..."
	@if [ -z "$(PYTHON_CMD)" ]; then echo "❌ Python 3 not found"; exit 1; fi
	@if [ -z "$(NODE_CMD)" ]; then echo "❌ npm not found"; exit 1; fi
	cd backend && python3 -m venv .venv 2>/dev/null || true
	cd backend && source .venv/bin/activate && pip install -q -r requirements.txt
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
	@cd backend && source .venv/bin/activate && PORT=9080 python3 run_server.py &
	@sleep 3
	@echo ""
	@echo "Frontend (port 5173):"
	@cd frontend && npm run dev &
	@sleep 3
	@echo ""
	@echo "✅ Services started:"
	@echo "   Frontend:  http://localhost:5173"
	@echo "   Backend:   http://localhost:9080"
	@echo "   Login:     admin@serviceops.local / admin123"
	@echo ""
	@echo "Logs:"
	@echo "   Backend:  tail -f /tmp/serviceops-backend.log"
	@echo "   Frontend: see npm output above"

local-stop: ## Stop local services
	@echo "⏹️  Stopping local services..."
	@pkill -f "python3 run_server.py" 2>/dev/null || true
	@pkill -f "npm run dev" 2>/dev/null || true
	@sleep 1
	@echo "✅ Services stopped"

local-test: ## Run backend tests locally
	@echo "🧪 Running tests..."
	cd backend && source .venv/bin/activate && python3 -m pytest tests/ -v

local-db-reset: ## Reset local database
	@echo "🔄 Resetting database..."
	@echo "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" | psql postgresql://postgres:postgres@localhost:5432/serviceops
	@echo "✅ Database reset"

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
	@if [ -n "$(DOCKER_CMD)" ]; then docker compose logs -f; else echo "⚠️  Not in Docker mode"; fi

logs-all: logs ## Alias: view all logs

health: ## Check service health
	@echo "🏥 Health Check:"
	@echo ""
	@echo "Backend (9080):"
	@curl -s http://localhost:9080/health 2>&1 | head -c 100 || echo "❌ Not responding"
	@echo ""
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
	@find frontend -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleanup complete"

# =============================================================
# QUICK START
# =============================================================

quick-start: ## One-command start (Docker if available, else local)
	@if [ -n "$(DOCKER_CMD)" ]; then \
		echo "🐳 Docker detected — starting with Docker Compose..."; \
		make docker-build && make docker-up; \
	else \
		echo "🐍 Docker not found — starting locally..."; \
		make local-start; \
	fi
	@echo ""
	@echo "✅ ServiceOps started!"
	@echo "   Access: http://localhost:5173"
