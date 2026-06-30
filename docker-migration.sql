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
