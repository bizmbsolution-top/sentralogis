-- 168_fix_driver_code_tenant_unique.sql
-- Drop the global unique constraint on driver_code so different tenants can each start from DRI/001 without colliding
ALTER TABLE md_drivers DROP CONSTRAINT IF EXISTS md_drivers_driver_code_key;
ALTER TABLE md_drivers DROP CONSTRAINT IF EXISTS md_drivers_tenant_id_driver_code_key;

-- Add tenant-scoped unique constraint for drivers
ALTER TABLE md_drivers ADD CONSTRAINT md_drivers_tenant_id_driver_code_key UNIQUE (tenant_id, driver_code);

-- Also fix fleet_code global unique constraint if present
ALTER TABLE md_fleets DROP CONSTRAINT IF EXISTS md_fleets_fleet_code_key;
ALTER TABLE md_fleets DROP CONSTRAINT IF EXISTS md_fleets_tenant_id_fleet_code_key;
ALTER TABLE md_fleets ADD CONSTRAINT md_fleets_tenant_id_fleet_code_key UNIQUE (tenant_id, fleet_code);

NOTIFY pgrst, 'reload schema';
