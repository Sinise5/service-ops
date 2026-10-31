# Changelog

All notable changes to ServiceOps Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added a CVE Feed page backed by scheduled incremental NVD sync, CISA KEV enrichment, severity/search filters, and notifications for new High/Critical or KEV records.

### Changed
- Replaced the primary navigation with a grouped responsive sidebar and refreshed the dashboard summary.
- Replaced outdated GitLab quick-start instructions with the current GitHub repository and verified local setup steps.
- Consolidated current installation, usage, architecture, and project status documentation; marked duplicate overviews as historical.

### Fixed
- Docker Compose now supports configurable host ports and stops startup when the database migration fails.
- Frontend container builds use the npm lockfile, a checked-in Nginx config, and the correct API proxy for Help guides.
- Make targets detect either `docker compose` or the standalone `docker-compose` executable.
- Git and Docker ignore rules exclude local secrets, dependencies, caches, and database files without ignoring `.dockerignore` files.

## [0.13.0] - 2026-06-16

### Added
- Frontend NotificationsPage with channel CRUD and test functionality
- Frontend SLAPage with targets and uptime visualization
- Frontend TopologyPage with dependency graph
- Frontend SettingsPage with profile and API key management
- Proxy route `/asset-types` in Vite config for asset type dropdown
- Layout wrapper to all protected pages (Notifications, SLA, Settings)

### Fixed
- **[CRITICAL]** Token persistence on page refresh - initialized token directly from localStorage in AuthStore
- **[CRITICAL]** Notifications menu logout bug - simplified `require_auth` middleware to avoid immutable Request attribute assignment
- **[CRITICAL]** Asset types dropdown empty - added missing proxy route in frontend
- **[CRITICAL]** SLA/Incidents/Checks 400 errors - added default arguments to all QueryParams.get() calls
- **[CRITICAL]** Topology page hang - fixed SQL queries to JOIN asset_types table instead of selecting non-existent columns
- JSX structure errors in NotificationsPage, SLAPage, SettingsPage - corrected indentation after Layout wrapping
- Port conflict - backend now consistently runs on port 8080 (was intermittently using 9080)

### Changed
- Backend port configuration standardized to 8080 in `.env` and `config.py`
- Auth middleware simplified - removed `request.user_id` assignment (Robyn Request objects are immutable)
- SQL queries in `topology/repository.py` updated to use correct schema (JOIN asset_types, removed type_name/ip_address columns)
- SQL queries in `sla/routes.py` updated to remove non-existent columns

### Testing
- Backend: 68/68 tests passing ✅
- Frontend: All 11 pages load without errors ✅
- Manual E2E: Login → Dashboard → All menu items accessible ✅

## [0.12.0] - 2026-06-12

### Added
- Notification system backend (Telegram, Discord, Email, Slack, Webhook adapters)
- Notification channels CRUD endpoints
- Notification logs and retry logic
- Alert-to-notification integration
- Frontend notification management UI

## [0.11.0] - 2026-06-10

### Added
- Complete backend implementation (52 API endpoints)
- 18 database tables with 12 migrations
- Auth & RBAC system (JWT + bcrypt)
- Asset registry with types and tags
- Monitoring engine (HTTP, Ping, SSL, TCP, DNS checks)
- Alert rules and incident management
- SLA tracking with uptime calculation
- Topology and dependency graph
- Centralized logging with search
- Audit trails

---

**Next Release:** v0.14.0 (Phase 14: Production Readiness)
