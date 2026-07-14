-- Add container_number column to job_orders table if not exists
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS container_number text;
CREATE INDEX IF NOT EXISTS idx_job_orders_container_number ON job_orders(container_number);
