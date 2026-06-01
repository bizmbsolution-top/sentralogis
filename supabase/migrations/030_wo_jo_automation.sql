-- Migration 030: Add SBU context to Job Orders

ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS sbu_type TEXT DEFAULT 'TRUCKING';
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS sbu_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES md_warehouses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_orders_sbu_type ON job_orders(sbu_type);
CREATE INDEX IF NOT EXISTS idx_job_orders_warehouse ON job_orders(warehouse_id);

-- Update existing job orders to be explicitly TRUCKING (since WMS wasn't active yet)
UPDATE job_orders SET sbu_type = 'TRUCKING' WHERE sbu_type IS NULL;
