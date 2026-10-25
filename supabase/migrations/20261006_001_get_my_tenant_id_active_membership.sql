-- ============================================================================
-- Migration: 20261006_001_get_my_tenant_id_active_membership.sql
-- Description: D-COPILOT-TENANT-REMEDIATION-01 — Ensure public.get_my_tenant_id()
--              strictly requires tenant_users.is_active = true for staff
--              membership resolution.
-- Scope: Updates public.get_my_tenant_id() RLS helper function only.
-- Non-destructive / additive / idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1. Check if the user is a registered active staff member
    (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
    -- 2. Check if the user is the owner of a tenant
    (SELECT id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_tenant_id() TO anon;

NOTIFY pgrst, 'reload schema';
