-- Docker Management extension tables
-- Applied after init.sql (02-docker-migration.sql)

CREATE TABLE IF NOT EXISTS docker_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 22,
    username VARCHAR(100) NOT NULL,
    auth_type VARCHAR(20) DEFAULT 'password' NOT NULL,
    password_encrypted TEXT,
    ssh_key_encrypted TEXT,
    ssh_key_passphrase_encrypted TEXT,
    default_path VARCHAR(500) DEFAULT '/opt/docker',
    docker_context VARCHAR(100),
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    last_connected_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS docker_compose_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES docker_hosts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    path VARCHAR(500) NOT NULL,
    services JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS docker_deploy_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image VARCHAR(500) NOT NULL,
    default_ports JSONB DEFAULT '[]',
    default_envs JSONB DEFAULT '[]',
    default_volumes JSONB DEFAULT '[]',
    restart_policy VARCHAR(50) DEFAULT 'no',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS container_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES docker_hosts(id) ON DELETE CASCADE,
    container_id VARCHAR(100) NOT NULL,
    container_name VARCHAR(255),
    content TEXT,
    stream VARCHAR(10) DEFAULT 'stdout',
    timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_container_logs_container ON container_logs(container_id);
CREATE INDEX IF NOT EXISTS idx_container_logs_created ON container_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_docker_hosts_created_by ON docker_hosts(created_by);

-- Seed system deploy templates
INSERT INTO docker_deploy_templates (name, description, image, default_ports, default_envs, default_volumes, restart_policy, is_system)
VALUES
  ('Nginx', 'Web server with port 80', 'nginx:alpine',
   '[{"host_port": 80, "container_port": 80, "protocol": "tcp"}]',
   '[]', '[]', 'unless-stopped', TRUE),
  ('PostgreSQL', 'PostgreSQL 16 database', 'postgres:16',
   '[{"host_port": 5432, "container_port": 5432, "protocol": "tcp"}]',
   '[{"key": "POSTGRES_PASSWORD", "value": "changeme"}]',
   '[{"host_path": "/data/postgres", "container_path": "/var/lib/postgresql/data", "read_only": false}]',
   'unless-stopped', TRUE),
  ('Redis', 'Redis 7 in-memory cache', 'redis:7-alpine',
   '[{"host_port": 6379, "container_port": 6379, "protocol": "tcp"}]',
   '[]', '[]', 'unless-stopped', TRUE),
  ('MySQL', 'MySQL 8 database', 'mysql:8',
   '[{"host_port": 3306, "container_port": 3306, "protocol": "tcp"}]',
   '[{"key": "MYSQL_ROOT_PASSWORD", "value": "changeme"}]',
   '[{"host_path": "/data/mysql", "container_path": "/var/lib/mysql", "read_only": false}]',
   'unless-stopped', TRUE),
  ('Node.js App', 'Node.js 20 runtime', 'node:20-alpine',
   '[{"host_port": 3000, "container_port": 3000, "protocol": "tcp"}]',
   '[{"key": "NODE_ENV", "value": "production"}]', '[]', 'unless-stopped', TRUE),
  ('Python App', 'Python 3.12 slim', 'python:3.12-slim',
   '[{"host_port": 8000, "container_port": 8000, "protocol": "tcp"}]',
   '[{"key": "PYTHONUNBUFFERED", "value": "1"}]', '[]', 'unless-stopped', TRUE)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS host_alert_rules (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id       UUID NOT NULL REFERENCES docker_hosts(id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    metric        VARCHAR(64) NOT NULL,  -- cpu_percent, memory_percent, disk_used_percent, disk_inode_percent
    operator      VARCHAR(8)  NOT NULL DEFAULT 'gt',  -- gt, lt, gte, lte, eq
    threshold     FLOAT NOT NULL,
    duration_minutes   INT NOT NULL DEFAULT 5,  -- sustained breach before firing
    cooldown_minutes   INT NOT NULL DEFAULT 10,  -- min seconds between re-fire
    severity      VARCHAR(32) NOT NULL DEFAULT 'warning',  -- info, warning, critical
    enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_host_alert_rules_host ON host_alert_rules(host_id);
CREATE INDEX IF NOT EXISTS idx_host_alert_rules_enabled ON host_alert_rules(enabled);

-- link alert rules to notification channels
CREATE TABLE IF NOT EXISTS host_alert_rule_channels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id     UUID NOT NULL REFERENCES host_alert_rules(id) ON DELETE CASCADE,
    channel_id  UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    UNIQUE(rule_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_host_alert_rule_channels_rule ON host_alert_rule_channels(rule_id);
CREATE INDEX IF NOT EXISTS idx_host_alert_rule_channels_ch ON host_alert_rule_channels(channel_id);

-- incidents from host alert rules
CREATE TABLE IF NOT EXISTS host_alert_incidents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID NOT NULL REFERENCES host_alert_rules(id) ON DELETE CASCADE,
    metric          VARCHAR(64) NOT NULL,
    value           FLOAT NOT NULL,
    threshold       FLOAT NOT NULL,
    severity        VARCHAR(32) NOT NULL DEFAULT 'warning',
    message         TEXT,
    status          VARCHAR(32) NOT NULL DEFAULT 'open',  -- open, acknowledged, resolved
    triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID,
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_host_alert_incidents_rule ON host_alert_incidents(rule_id);
CREATE INDEX IF NOT EXISTS idx_host_alert_incidents_status ON host_alert_incidents(status);
CREATE INDEX IF NOT EXISTS idx_host_alert_incidents_triggered ON host_alert_incidents(triggered_at);

-- track sustained breaches per rule (persistent across scheduler runs)
CREATE TABLE IF NOT EXISTS host_alert_sustained (
    rule_id           UUID PRIMARY KEY REFERENCES host_alert_rules(id) ON DELETE CASCADE,
    breach_count      INT NOT NULL DEFAULT 0,  -- consecutive checks in breach
    last_value        FLOAT,
    last_checked_at   TIMESTAMPTZ,
    in_cooldown_until TIMESTAMPTZ  -- no fire until this time passes
);

