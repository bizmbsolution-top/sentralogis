-- Migration 033: Add FK constraints to restored trucking tables for Supabase joins
-- The !customer_id join syntax requires actual FK constraints in the database
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. WORK ORDERS FKs
-- ============================================
-- customer_id → md_entities(id) — needed for !customer_id joins
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_work_orders_customer;
ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_customer
  FOREIGN KEY (customer_id) REFERENCES md_entities(id) ON DELETE SET NULL;

-- transporter_id → md_entities(id) — needed for !transporter_id joins
ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_work_orders_transporter;
ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_transporter
  FOREIGN KEY (transporter_id) REFERENCES md_entities(id) ON DELETE SET NULL;

-- ============================================
-- 2. JOB ORDERS FKs
-- ============================================
-- transporter_id → md_entities(id)
ALTER TABLE job_orders DROP CONSTRAINT IF EXISTS fk_job_orders_transporter;
ALTER TABLE job_orders ADD CONSTRAINT fk_job_orders_transporter
  FOREIGN KEY (transporter_id) REFERENCES md_entities(id) ON DELETE SET NULL;

-- fleet_id → md_fleets(id) — needed for !md_fleets joins
ALTER TABLE job_orders DROP CONSTRAINT IF EXISTS fk_job_orders_fleet;
ALTER TABLE job_orders ADD CONSTRAINT fk_job_orders_fleet
  FOREIGN KEY (fleet_id) REFERENCES md_fleets(id) ON DELETE SET NULL;

-- driver_id → md_drivers(id) — needed for !md_drivers joins
ALTER TABLE job_orders DROP CONSTRAINT IF EXISTS fk_job_orders_driver;
ALTER TABLE job_orders ADD CONSTRAINT fk_job_orders_driver
  FOREIGN KEY (driver_id) REFERENCES md_drivers(id) ON DELETE SET NULL;

-- ============================================
-- 3. WO_ITEMS FKs
-- ============================================
-- wo_id → work_orders(id)
-- Already exists from CREATE TABLE

-- ============================================
-- 4. VERIFICATION
-- ============================================
SELECT '033_fk_constraints OK' AS result;
