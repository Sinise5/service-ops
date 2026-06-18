-- Add conditions + logic columns to alert_rules table
ALTER TABLE alert_rules 
ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS logic VARCHAR(10) DEFAULT 'AND';

-- Make condition column nullable (was required, now optional)
ALTER TABLE alert_rules 
ALTER COLUMN condition DROP NOT NULL;
