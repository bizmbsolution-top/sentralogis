-- 1. Add division column to tenant_users
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS division VARCHAR(50);

-- 2. Insert new roles into tenant_roles
INSERT INTO public.tenant_roles (role_code, role_name, permissions)
VALUES
  ('hq_commercial_director', 'HQ Commercial Director', '{"modules": ["commercial", "crm", "reports"], "actions": ["view", "create", "edit", "approve"]}'),
  ('hq_sales_manager', 'HQ Sales Manager', '{"modules": ["commercial", "crm"], "actions": ["view", "create", "edit"]}'),
  ('hq_sales_staff', 'HQ Sales Staff', '{"modules": ["commercial", "crm"], "actions": ["view", "create", "edit"]}'),
  ('hq_pricing_analyst', 'HQ Pricing Analyst', '{"modules": ["commercial", "billing"], "actions": ["view", "create", "edit"]}'),
  ('hq_marketing_staff', 'HQ Marketing Staff', '{"modules": ["crm", "marketing"], "actions": ["view", "create", "edit"]}')
ON CONFLICT (role_code) DO UPDATE 
SET role_name = EXCLUDED.role_name, permissions = EXCLUDED.permissions;
