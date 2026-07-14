-- Migration: 113_multi_warehouse_contracts
-- Description: Convert md_storage_contracts from 1:1 warehouse to 1:N warehouses

-- 1. Create junction table for contract <-> warehouses
CREATE TABLE IF NOT EXISTS public.md_contract_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES public.md_storage_contracts(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.md_warehouses(id) ON DELETE RESTRICT,
  committed_space NUMERIC(12, 2) DEFAULT 0,
  uom_space TEXT DEFAULT 'PALLET',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_md_contract_warehouses_contract ON public.md_contract_warehouses(contract_id);
CREATE INDEX IF NOT EXISTS idx_md_contract_warehouses_warehouse ON public.md_contract_warehouses(warehouse_id);

-- 2. Add warehouse_id to md_billing_rates (nullable, for warehouse-specific rates)
ALTER TABLE public.md_billing_rates 
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.md_warehouses(id) ON DELETE CASCADE;

-- 3. Migrate existing data from md_storage_contracts to md_contract_warehouses
INSERT INTO public.md_contract_warehouses (tenant_id, contract_id, warehouse_id, committed_space, uom_space)
SELECT tenant_id, id, warehouse_id, committed_space, uom_space
FROM public.md_storage_contracts
WHERE warehouse_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Alter md_storage_contracts to make old columns nullable
ALTER TABLE public.md_storage_contracts
  ALTER COLUMN warehouse_id DROP NOT NULL;

-- 5. Enable RLS on new table
ALTER TABLE public.md_contract_warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_md_contract_warehouses ON public.md_contract_warehouses;
CREATE POLICY tenant_isolation_md_contract_warehouses ON public.md_contract_warehouses
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
