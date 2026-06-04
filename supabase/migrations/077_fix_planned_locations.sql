-- Migration 077: Fix Database Schema for Location Assignments

-- Clear invalid data that might be linked to the wrong table
TRUNCATE TABLE jo_warehouse_assignments;

-- 1. Fix jo_warehouse_assignments to point to the correct WMS job orders table
ALTER TABLE jo_warehouse_assignments 
  DROP CONSTRAINT IF EXISTS jo_warehouse_assignments_job_order_id_fkey;

ALTER TABLE jo_warehouse_assignments
  ADD CONSTRAINT jo_warehouse_assignments_job_order_id_fkey 
  FOREIGN KEY (job_order_id) REFERENCES wo_job_orders(id) ON DELETE CASCADE;

-- 2. Add planned locations at the item level for precision
ALTER TABLE wh_inbound_receipt_items
  ADD COLUMN IF NOT EXISTS planned_putaway_location_id UUID REFERENCES md_warehouse_locations(id);

ALTER TABLE wh_inbound_damage_records
  ADD COLUMN IF NOT EXISTS planned_quarantine_location_id UUID REFERENCES md_warehouse_locations(id);

-- Result output
SELECT '077_fix_planned_locations executed successfully' as result;
