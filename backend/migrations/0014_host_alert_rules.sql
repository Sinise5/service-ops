-- Migration: 0014_host_alert_rules
-- Alert threshold rules per docker host (cpu, memory, disk)
BEGIN;

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

COMMIT;
