-- Migration 179: Add missing columns to trucking job_orders table
--
-- Migration 030_wo_jo_automation.sql added sbu_type and
-- 030_enterprise_schema.sql had assigned_warehouse_id on the enterprise
-- job_orders (now wo_job_orders), but the trucking job_orders recreated
-- in 032 never got them. The code inserts these columns, causing failures.

ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS sbu_type TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS assigned_warehouse_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_orders_sbu_type ON job_orders (sbu_type);
CREATE INDEX IF NOT EXISTS idx_job_orders_assigned_warehouse ON job_orders (assigned_warehouse_id);

-- Backfill existing JOs with TRUCKING as default sbu_type
UPDATE job_orders SET sbu_type = 'TRUCKING' WHERE sbu_type IS NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT '179_add_missing_job_orders_columns OK' AS result;
