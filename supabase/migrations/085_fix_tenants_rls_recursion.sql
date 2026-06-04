-- Migration 085: Fix Infinite Recursion in tenants RLS

-- Drop the recursive policy
DROP POLICY IF EXISTS "tenants_read_access" ON public.tenants;

-- Create a safe policy that avoids querying public.tenants within the policy
CREATE POLICY "tenants_read_access" ON public.tenants
FOR SELECT USING (
  -- 1. Jika user adalah pemilik (owner) tenant ini
  user_id = auth.uid() 
  OR 
  -- 2. Jika user terdaftar sebagai staff di tenant_users untuk tenant ini
  id IN (
    SELECT tenant_id 
    FROM public.tenant_users 
    WHERE user_id = auth.uid()
  )
);

SELECT '085_fix_tenants_rls_recursion OK' AS result;
