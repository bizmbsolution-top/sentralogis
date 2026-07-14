-- Migration 109: Enable RLS for tenant_users table
-- Allows authenticated users to read tenant_users for audit log name resolution

-- Enable RLS if not already enabled
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Grant SELECT to authenticated users  
GRANT SELECT ON tenant_users TO authenticated;

-- Drop existing policy first if we want to recreate
DROP POLICY IF EXISTS "tenant_users_tenant_isolation" ON tenant_users;

-- Create tenant isolation policy
CREATE POLICY "tenant_users_tenant_isolation" ON tenant_users
FOR SELECT TO authenticated
USING (tenant_id = public.get_my_tenant_id());

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Migration 109 applied successfully' as result;