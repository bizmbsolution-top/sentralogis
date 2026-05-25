-- Migration 042: Create Master Data for Driver Allowances (Uang Jalan)
-- Eksekusi file ini di Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.md_driver_allowances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    origin_city TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    fleet_type_id UUID NOT NULL REFERENCES public.md_fleet_types(id) ON DELETE RESTRICT,
    amount NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, origin_city, destination_city, fleet_type_id)
);

-- Index untuk mempercepat lookup
CREATE INDEX IF NOT EXISTS idx_driver_allowances_lookup ON public.md_driver_allowances(tenant_id, origin_city, destination_city, fleet_type_id);

-- Enable RLS
ALTER TABLE public.md_driver_allowances ENABLE ROW LEVEL SECURITY;

-- Policy untuk Tenant Isolation
CREATE POLICY "driver_allowances_isolation" ON public.md_driver_allowances
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Trigger updated_at (asumsikan trigger function handle_updated_at sudah ada dari skema sebelumnya)
DROP TRIGGER IF EXISTS trg_md_driver_allowances_updated_at ON public.md_driver_allowances;
CREATE TRIGGER trg_md_driver_allowances_updated_at
  BEFORE UPDATE ON public.md_driver_allowances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

SELECT '042_master_driver_allowances OK' AS result;
