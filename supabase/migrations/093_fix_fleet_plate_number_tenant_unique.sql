-- 093_fix_fleet_plate_number_tenant_unique.sql
-- Drop the global unique constraint on plate_number
ALTER TABLE md_fleets DROP CONSTRAINT IF EXISTS md_fleets_plate_number_key;

-- Add a new unique constraint scoped to tenant_id
ALTER TABLE md_fleets ADD CONSTRAINT md_fleets_tenant_id_plate_number_key UNIQUE (tenant_id, plate_number);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
