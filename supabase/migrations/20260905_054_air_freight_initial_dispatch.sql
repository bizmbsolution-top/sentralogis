-- Wave 7: Air Freight Initial Dispatch Path
-- Adds aircraft_name and flight_number to shp_execution_legs
-- Follows existing Sea Freight pattern: route + schedule already on leg;
-- transport identity (vessel_name/voyage_number) was in fw_consolidations;
-- for Air Freight we add the equivalent transport identity to the generic leg.

BEGIN;

-- 1. Add air freight transport identity columns to canonical execution legs
ALTER TABLE public.shp_execution_legs
  ADD COLUMN IF NOT EXISTS aircraft_name TEXT,
  ADD COLUMN IF NOT EXISTS flight_number TEXT;

-- 2. Index for tenant-scoped queries by flight number (operational lookup)
CREATE INDEX IF NOT EXISTS idx_shp_legs_flight_number
  ON public.shp_execution_legs (tenant_id, flight_number)
  WHERE flight_number IS NOT NULL;

-- 3. Grant authenticated access (aligned with existing leg grants)
GRANT SELECT, INSERT, UPDATE ON public.shp_execution_legs TO authenticated;

COMMIT;
