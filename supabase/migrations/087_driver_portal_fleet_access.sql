-- Migration 087: Allow anonymous driver portal to read md_fleets and md_fleet_types
--
-- PROBLEM:
-- Driver portal (anon role) cannot read md_fleets because RLS policy
-- "md_fleets_tenant_isolation" only works for authenticated role.
-- fetchFleets() returns empty array, so fleet selection modal is empty.
--
-- SOLUTION:
-- Add public SELECT policy for md_fleets (same pattern as migration 043)
-- Also add for md_fleet_types since it's joined in the fleet query.

-- 1. md_fleets: public SELECT for driver portal
CREATE POLICY "driver_portal_fleets_select" ON public.md_fleets
FOR SELECT USING (
  auth.role() = 'anon'
);

-- 2. md_fleet_types: public SELECT for driver portal (joined in fleet query)
CREATE POLICY "driver_portal_fleet_types_select" ON public.md_fleet_types
FOR SELECT USING (
  auth.role() = 'anon'
);

-- 3. Reload PostgREST cache
NOTIFY pgrst, 'reload schema';
