-- Migration 082: Fix RLS tenant_id extraction for Tenant Owners
--
-- PROBLEM:
-- get_my_tenant_id() previously only read from `tenant_users`. 
-- Tenant Owners (who create the tenant) are recorded in the `tenants` table 
-- but might not have a record in `tenant_users`. This caused the function 
-- to return NULL for them, blocking INSERT operations to RLS-protected tables 
-- (such as `tenant_sbus`) with the error "new row violates row-level security policy".
--
-- SOLUTION:
-- Update get_my_tenant_id() to check `tenant_users` first. If no record is found,
-- check if the user is the owner of a tenant in the `tenants` table.

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1. Check if the user is a registered staff member
    (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1),
    -- 2. Check if the user is the owner of a tenant
    (SELECT id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO anon;

-- Reload cache for PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '082_fix_rls_tenant_owner_access OK' AS result;
