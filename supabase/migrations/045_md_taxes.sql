-- Migration 045: Master Tax Table
-- Tax rates are configurable since Indonesian tax regulations change frequently

CREATE TABLE IF NOT EXISTS public.md_taxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_md_taxes_active ON public.md_taxes(is_active);
CREATE INDEX IF NOT EXISTS idx_md_taxes_code ON public.md_taxes(code);

ALTER TABLE public.md_taxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS md_taxes_select ON public.md_taxes;
DROP POLICY IF EXISTS md_taxes_all ON public.md_taxes;

CREATE POLICY md_taxes_select ON public.md_taxes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY md_taxes_all ON public.md_taxes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed default PPN 11%
INSERT INTO public.md_taxes (code, name, rate, description, is_active)
VALUES
  ('PPN', 'Pajak Pertambahan Nilai', 11, 'PPN 11% sesuai tarif perpajakan Indonesia', true)
ON CONFLICT DO NOTHING;

-- Add tax_id FK to invoices table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'tax_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN tax_id UUID REFERENCES public.md_taxes(id) ON DELETE SET NULL;
  END IF;
END $$;

SELECT '045_md_taxes OK' AS result;
