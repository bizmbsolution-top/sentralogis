-- Migration: Create md_driver_allowances (Master Data Uang Jalan)
-- Fixes: PostgREST 404 on embed md_fleet_types(type_name) — table was missing (migration 042 was never applied)
-- Idempotent: safe to run multiple times in Supabase SQL Editor

-- 1. Ensure trigger function exists (only if not already defined)
DO $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_updated_at'
  ) THEN
    CREATE FUNCTION public.handle_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $fn$;

-- 2. Create the table
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

-- 3. Index untuk mempercepat lookup
CREATE INDEX IF NOT EXISTS idx_driver_allowances_lookup
  ON public.md_driver_allowances(tenant_id, origin_city, destination_city, fleet_type_id);

-- 4. Enable RLS
ALTER TABLE public.md_driver_allowances ENABLE ROW LEVEL SECURITY;

-- 5. Policy untuk Tenant Isolation
DROP POLICY IF EXISTS "driver_allowances_isolation" ON public.md_driver_allowances;
CREATE POLICY "driver_allowances_isolation" ON public.md_driver_allowances
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_driver_allowances TO authenticated;

-- 6. Trigger updated_at
DROP TRIGGER IF EXISTS trg_md_driver_allowances_updated_at ON public.md_driver_allowances;
CREATE TRIGGER trg_md_driver_allowances_updated_at
  BEFORE UPDATE ON public.md_driver_allowances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

SELECT '20260811_create_md_driver_allowances OK' AS result;
