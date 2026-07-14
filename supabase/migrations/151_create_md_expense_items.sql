-- Migration: 151_create_md_expense_items.sql
-- Creates master table for expense items used in extra cost flow
CREATE TABLE IF NOT EXISTS md_expense_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  expense_code text NOT NULL,
  expense_name text NOT NULL,
  sbu_type text NOT NULL,
  category text NOT NULL,
  default_uom text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  expense_account_id uuid REFERENCES finance_coa(id) NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_md_expense_items_tenant ON md_expense_items (tenant_id);

-- Seed default expenses (example rows)
INSERT INTO md_expense_items (tenant_id, expense_code, expense_name, sbu_type, category, default_uom, description, expense_account_id)
SELECT
  tenant_id,
  'FUEL' AS expense_code,
  'Fuel Surcharge' AS expense_name,
  'TRUCKING' AS sbu_type,
  'EXPENSE' AS category,
  'KM' AS default_uom,
  'Automatic fuel surcharge per kilometer' AS description,
  NULL AS expense_account_id
FROM (SELECT DISTINCT tenant_id FROM md_services) t;

-- Row Level Security (RLS)
ALTER TABLE md_expense_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow tenant access" ON md_expense_items USING (tenant_id = auth.uid());
