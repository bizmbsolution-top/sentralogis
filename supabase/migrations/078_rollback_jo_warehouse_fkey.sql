-- Migration 078: Rollback jo_warehouse_assignments Foreign Key
-- Revert the FK back to job_orders (instead of wo_job_orders) because the Warehouse Admin Dashboard actually relies on job_orders to fetch assignments.

ALTER TABLE jo_warehouse_assignments 
  DROP CONSTRAINT IF EXISTS jo_warehouse_assignments_job_order_id_fkey;

ALTER TABLE jo_warehouse_assignments
  ADD CONSTRAINT jo_warehouse_assignments_job_order_id_fkey 
  FOREIGN KEY (job_order_id) REFERENCES job_orders(id) ON DELETE CASCADE;

SELECT '078_rollback_jo_warehouse_fkey executed successfully' as result;
