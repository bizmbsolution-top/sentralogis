-- Fix driver and fleet status that are on_road but no active job
-- Eksekusi ini di Supabase SQL Editor

-- 1. Reset drivers who are marked as on_road/working but have no active job orders
UPDATE md_drivers 
SET 
  is_working = false,
  status = 'available'
WHERE 
  is_working = true 
  AND id NOT IN (
    SELECT DISTINCT driver_id 
    FROM job_orders 
    WHERE status IN ('DITERIMA', 'STARTED', 'LOADING', 'UNLOADING', 'MENUNGGU BERANGKAT', 'MENUNGGU MULAI / START')
    AND driver_id IS NOT NULL
  );

-- 2. Reset fleets that are on_road but have no active job orders
UPDATE md_fleets 
SET status = 'available'
WHERE 
  status = 'on_road'
  AND id NOT IN (
    SELECT DISTINCT fleet_id 
    FROM job_orders 
    WHERE status IN ('DITERIMA', 'STARTED', 'LOADING', 'UNLOADING', 'MENUNGGU BERANGKAT', 'MENUNGGU MULAI / START')
    AND fleet_id IS NOT NULL
  );

-- 3. Show current status
SELECT 
  (SELECT COUNT(*) FROM md_drivers WHERE is_working = true) as working_drivers,
  (SELECT COUNT(*) FROM md_drivers WHERE status = 'on_duty') as on_duty_drivers,
  (SELECT COUNT(*) FROM md_fleets WHERE status = 'on_road') as on_road_fleets;