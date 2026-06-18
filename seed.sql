-- ServiceOps Initial Data Seeding

-- Default admin user (password: admin123)
INSERT INTO users (email, name, password_hash) VALUES
('admin@serviceops.local', 'Admin User', '$2b$12$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz12')
ON CONFLICT (email) DO NOTHING;

-- Pre-defined asset types
INSERT INTO asset_types (name, icon) VALUES
('Server', 'server'),
('Database', 'database'),
('API', 'api'),
('Cache', 'cache'),
('Queue', 'queue'),
('Load Balancer', 'lb'),
('Storage', 'storage'),
('Other', 'other')
ON CONFLICT (name) DO NOTHING;

-- Insert default settings if needed
-- (Additional seeding logic as needed)
