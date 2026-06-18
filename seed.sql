-- ServiceOps Initial Data Seeding
-- Matches 24-table schema from init.sql

-- Default admin user (password: admin123)
INSERT INTO users (email, username, hashed_password, first_name, last_name, status)
VALUES ('admin@serviceops.local', 'admin', '$2b$12$KIXxPfxOvKhhzVKUFC.Pt.wLz4sV1A21E7eqSwqrLEXlh4Q7Pvm0O', 'Admin', 'User', 'active')
ON CONFLICT (email) DO NOTHING;

-- Default roles
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrator with full access'),
  ('operator', 'Operator with monitoring access'),
  ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Pre-defined asset types
INSERT INTO asset_types (name, description)
VALUES
  ('Server', 'Physical or virtual server'),
  ('Database', 'Database instance'),
  ('API', 'API endpoint or service'),
  ('Cache', 'Cache layer (Redis, Memcached)'),
  ('Queue', 'Message queue (RabbitMQ, Kafka)'),
  ('Load Balancer', 'Load balancer instance'),
  ('Storage', 'Storage system (S3, NFS)'),
  ('Other', 'Other asset type')
ON CONFLICT (name) DO NOTHING;
