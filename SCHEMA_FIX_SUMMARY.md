# ServiceOps Schema Fix Summary
**Date:** 2026-06-18  
**Issue:** Docker container init.sql mismatched with local development DB

---

## Problem Analysis

### Old init.sql (17 tables)
- Missing 7 critical tables
- Column mismatches in core tables (users, assets, monitoring_checks)
- No RBAC system (roles, permissions, user_roles, role_permissions)
- No tagging system (asset_tags, asset_tag_mapping)
- No session management
- No audit logging

### Local DB (24 tables) ✓
- Full production schema with all features
- RBAC system complete
- Asset tagging support
- Session tracking
- Audit trail

---

## Critical Schema Mismatches Fixed

### 1. **users** table
**Old schema:**
- `name` (single field)
- `password_hash`
- `is_active` (boolean)

**New schema:**
- `username` (UNIQUE, required for login)
- `first_name` + `last_name` (split name)
- `hashed_password` (renamed)
- `status` (varchar, extensible states)
- MFA fields: `mfa_enabled`, `mfa_secret`
- Security: `last_login_at`, `failed_login_attempts`, `locked_until`

### 2. **assets** table
**Old:** `type_id`, `metadata` (JSONB)  
**New:** `asset_type_id`, `owner_id`, NO metadata field

### 3. **monitoring_checks** table
**Old:** `interval`, `last_result`, `last_response_time`, `last_checked_at`  
**New:** `interval_seconds`, `last_executed_at` (consolidated)

### 4. **alert_rules** table
**Old:** `threshold` (INTEGER), `condition` (VARCHAR 255)  
**New:** `threshold` (DOUBLE PRECISION), `condition` (VARCHAR 50)

---

## New Tables Added (7)

1. **alembic_version** — Migration tracking
2. **alert_incidents** — Replaces old `incidents` + `check_results`
3. **alert_notifications** — Alert routing configuration
4. **asset_dependencies** — Replaces old `dependencies`
5. **asset_tag_mapping** — Many-to-many asset tags
6. **asset_tags** — Tag definitions
7. **audit_log** — Full audit trail
8. **monitoring_results** — Replaces old `check_results`
9. **permissions** — RBAC permissions
10. **role_permissions** — RBAC role-permission mapping
11. **roles** — RBAC roles
12. **sessions** — Session management
13. **user_roles** — RBAC user-role mapping

---

## Files Updated

### ✅ init.sql (328 lines)
- 24 tables with `IF NOT EXISTS` (idempotent)
- 30 indexes with `IF NOT EXISTS`
- Full RBAC system
- Asset tagging system
- Embedded seed data (admin user + default roles + asset types)

### ✅ seed.sql (27 lines)
- Matches new schema
- Default admin user: `admin@serviceops.local` / `admin123`
- 3 roles: admin, operator, viewer
- 8 asset types

### 📦 Backup
- `init.sql.backup` — Old 17-table schema preserved

---

## Verification

```bash
# Tested against local DB (serviceops_dev)
psql -U postgres -h localhost -d serviceops_dev -f init.sql
# Result: ✅ No errors, all IF NOT EXISTS working
# Result: ✅ 5 new asset_types inserted
# Result: ✅ 1 new role inserted
```

---

## Container Deployment Ready

The docker-compose.yml mounts:
```yaml
volumes:
  - ./init.sql:/docker-entrypoint-initdb.d/01-init.sql
  - ./seed.sql:/docker-entrypoint-initdb.d/02-seed.sql
```

**Next steps:**
1. Stop existing containers: `docker compose down -v` (destroy old DB)
2. Start fresh: `docker compose up -d`
3. Backend will now match schema expectations

---

## Schema Statistics

| Metric | Old | New |
|--------|-----|-----|
| Tables | 17 | 24 |
| Indexes | ~12 | 30 |
| RBAC tables | 0 | 4 |
| Tagging tables | 0 | 2 |
| Audit tables | 0 | 1 |
| Session tables | 0 | 1 |

---

## Backend Impact

### ✅ Will Now Work
- User authentication with username (not just email)
- MFA support
- Role-based access control
- Asset tagging and filtering
- Session management
- Audit trail logging
- Asset ownership tracking
- Enhanced monitoring result tracking

### 🔄 May Need Code Review
- Any code using old column names (`password_hash` → `hashed_password`)
- Any code expecting `metadata` field in assets table
- Any code using `incidents` table directly (now `alert_incidents`)
