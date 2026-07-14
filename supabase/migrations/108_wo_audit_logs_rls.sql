-- Migration 108: Add RLS policies for wo_audit_logs
--
-- PROBLEM: wo_audit_logs has no RLS policies, so authenticated users cannot read audit logs
-- SOLUTION: Add tenant isolation policy for reading audit logs

-- Enable RLS
ALTER TABLE wo_audit_logs ENABLE ROW LEVEL SECURITY;

-- Grant SELECT to authenticated users
GRANT SELECT ON wo_audit_logs TO authenticated;

-- Create tenant isolation policy
CREATE POLICY "wo_audit_logs_tenant_isolation" ON wo_audit_logs
FOR SELECT TO authenticated
USING (tenant_id = public.get_my_tenant_id());

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT 'Migration 108 applied successfully' as result;