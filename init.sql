-- ServiceOps Database Schema Initialization
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset types table
CREATE TABLE IF NOT EXISTS asset_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets table (CMDB)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type_id UUID REFERENCES asset_types(id) ON DELETE RESTRICT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'healthy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monitoring checks table
CREATE TABLE IF NOT EXISTS monitoring_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    check_type VARCHAR(50) NOT NULL, -- http, ping, ssl, tcp
    config JSONB NOT NULL,
    interval INTEGER DEFAULT 60, -- seconds
    enabled BOOLEAN DEFAULT true,
    last_result VARCHAR(50),
    last_response_time INTEGER,
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Check results table
CREATE TABLE IF NOT EXISTS check_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_id UUID REFERENCES monitoring_checks(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- success, failure
    response_time INTEGER,
    status_code INTEGER,
    error TEXT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_id UUID REFERENCES monitoring_checks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    condition VARCHAR(255) NOT NULL, -- status_code != 200, response_time > 3000
    severity VARCHAR(50) DEFAULT 'warning', -- info, warning, critical
    threshold INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- open, acknowledged, resolved
    message TEXT NOT NULL,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident comments table
CREATE TABLE IF NOT EXISTS incident_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident timeline table
CREATE TABLE IF NOT EXISTS incident_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- created, acknowledged, comment, resolved
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification channels table
CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- telegram, discord, email, webhook
    config JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMP,
    last_test_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES notification_channels(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- alert, test, system
    status VARCHAR(50) NOT NULL, -- sent, failed, pending
    message TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA targets table
CREATE TABLE IF NOT EXISTS sla_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    target_uptime DECIMAL(5,2) NOT NULL, -- 99.9
    period VARCHAR(50) DEFAULT 'monthly', -- monthly, quarterly
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA reports table
CREATE TABLE IF NOT EXISTS sla_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID REFERENCES sla_targets(id) ON DELETE CASCADE,
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    actual_uptime DECIMAL(5,2) NOT NULL,
    downtime_minutes INTEGER DEFAULT 0,
    status VARCHAR(50), -- pass, fail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dependencies table (topology)
CREATE TABLE IF NOT EXISTS dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    target_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'depends_on', -- depends_on, serves, backs_up
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_asset_id, target_asset_id, dependency_type)
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    level VARCHAR(50) NOT NULL, -- error, warn, info, debug
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_type_id ON assets(type_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_checks_asset_id ON monitoring_checks(asset_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_checks_enabled ON monitoring_checks(enabled);
CREATE INDEX IF NOT EXISTS idx_check_results_check_id ON check_results(check_id);
CREATE INDEX IF NOT EXISTS idx_check_results_checked_at ON check_results(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rules_check_id ON alert_rules(check_id);
CREATE INDEX IF NOT EXISTS idx_incidents_rule_id ON incidents(rule_id);
CREATE INDEX IF NOT EXISTS idx_incidents_asset_id ON incidents(asset_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel_id ON notification_logs(channel_id);
CREATE INDEX IF NOT EXISTS idx_logs_asset_id ON logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_asset_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_asset_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_checks_updated_at BEFORE UPDATE ON monitoring_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON notification_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_targets_updated_at BEFORE UPDATE ON sla_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
