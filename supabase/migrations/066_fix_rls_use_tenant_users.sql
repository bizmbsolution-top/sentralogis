-- Migration 066: Fix RLS policies for all master tables
--
-- PROBLEMS FIXED:
-- 1. "Allow full access for owner" policy queried auth.users directly
--    → authenticated role has NO access to auth.users → 403 for ALL users
-- 2. Old policies referenced profiles.tenant_id which does NOT exist
--    → tenant_id lives in tenant_users, not profiles
-- 3. Multiple overlapping policies including dangerous USING(true) ones
--    that bypassed all tenant isolation (security hole)
--
-- SOLUTION:
-- 1. Created get_my_tenant_id() SECURITY DEFINER function
--    → Runs as postgres, bypasses RLS, safely reads from tenant_users
-- 2. Consolidated to exactly 1 policy per table
-- 3. Added proper GRANT permissions
-- 4. Removed all USING(true) policies
--
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. SECURITY DEFINER helper function
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO anon;

-- ============================================
-- 2. md_locations
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_locations TO authenticated;

DROP POLICY IF EXISTS "Allow full access for owner" ON public.md_locations;
DROP POLICY IF EXISTS "Allow all for authenticated tenant users" ON public.md_locations;
DROP POLICY IF EXISTS "stable_tenant_access" ON public.md_locations;
DROP POLICY IF EXISTS "md_locations_tenant_isolation" ON public.md_locations;

CREATE POLICY "md_locations_tenant_isolation" ON public.md_locations
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ============================================
-- 3. md_entities
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_entities TO authenticated;

DROP POLICY IF EXISTS "Allow full access for owner" ON public.md_entities;
DROP POLICY IF EXISTS "Allow all for authenticated tenant users" ON public.md_entities;
DROP POLICY IF EXISTS "stable_tenant_access" ON public.md_entities;
DROP POLICY IF EXISTS "md_entities_tenant_isolation" ON public.md_entities;
DROP POLICY IF EXISTS "entities_full_access" ON public.md_entities;
DROP POLICY IF EXISTS "entities_read_for_all" ON public.md_entities;
DROP POLICY IF EXISTS "entities_read_only" ON public.md_entities;
DROP POLICY IF EXISTS "entities_simple_access" ON public.md_entities;

CREATE POLICY "md_entities_tenant_isolation" ON public.md_entities
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ============================================
-- 4. md_fleets
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_fleets TO authenticated;

DROP POLICY IF EXISTS "Allow full access for owner" ON public.md_fleets;
DROP POLICY IF EXISTS "Allow all for authenticated tenant users" ON public.md_fleets;
DROP POLICY IF EXISTS "stable_tenant_access" ON public.md_fleets;
DROP POLICY IF EXISTS "md_fleets_tenant_isolation" ON public.md_fleets;
DROP POLICY IF EXISTS "Allow Public Read md_fleets" ON public.md_fleets;
DROP POLICY IF EXISTS "Allow public read access on md_fleets" ON public.md_fleets;
DROP POLICY IF EXISTS "fleets_access" ON public.md_fleets;

CREATE POLICY "md_fleets_tenant_isolation" ON public.md_fleets
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ============================================
-- 5. md_drivers
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_drivers TO authenticated;

DROP POLICY IF EXISTS "Allow full access for owner" ON public.md_drivers;
DROP POLICY IF EXISTS "Allow all for authenticated tenant users" ON public.md_drivers;
DROP POLICY IF EXISTS "stable_tenant_access" ON public.md_drivers;
DROP POLICY IF EXISTS "md_drivers_tenant_isolation" ON public.md_drivers;
DROP POLICY IF EXISTS "Allow public read access on md_drivers" ON public.md_drivers;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.md_drivers;
DROP POLICY IF EXISTS "drivers_access" ON public.md_drivers;

CREATE POLICY "md_drivers_tenant_isolation" ON public.md_drivers
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ============================================
-- 6. tenant_sbus
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_sbus TO authenticated;

DROP POLICY IF EXISTS "Allow full access for owner" ON public.tenant_sbus;
DROP POLICY IF EXISTS "Allow all for authenticated tenant users" ON public.tenant_sbus;
DROP POLICY IF EXISTS "stable_tenant_access" ON public.tenant_sbus;
DROP POLICY IF EXISTS "tenant_sbus_isolation" ON public.tenant_sbus;
DROP POLICY IF EXISTS "allow_all_read_sbus" ON public.tenant_sbus;
DROP POLICY IF EXISTS "manage_tenant_sbus_policy" ON public.tenant_sbus;
DROP POLICY IF EXISTS "tenant_sbus_read_all" ON public.tenant_sbus;

CREATE POLICY "tenant_sbus_isolation" ON public.tenant_sbus
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ============================================
-- 7. Reload PostgREST cache
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- 8. Verification
-- ============================================
SELECT '066_fix_rls_master_tables OK' AS result;
