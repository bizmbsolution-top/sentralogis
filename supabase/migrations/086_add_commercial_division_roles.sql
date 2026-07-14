-- 1. Add division column to tenant_users
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS division VARCHAR(50);

-- 2. Insert new roles into tenant_roles
INSERT INTO public.tenant_roles (role_code, role_name, permissions)
VALUES
  ('hq_commercial_director', 'HQ Commercial Director', '{commercial, crm, reports, view, create, edit, approve}'),
  ('hq_sales_manager', 'HQ Sales Manager', '{commercial, crm, view, create, edit}'),
  ('hq_sales_staff', 'HQ Sales Staff', '{commercial, crm, view, create, edit}'),
  ('hq_pricing_analyst', 'HQ Pricing Analyst', '{commercial, billing, view, create, edit}'),
  ('hq_marketing_staff', 'HQ Marketing Staff', '{crm, marketing, view, create, edit}')
ON CONFLICT (role_code) DO UPDATE 
SET role_name = EXCLUDED.role_name, permissions = EXCLUDED.permissions;
