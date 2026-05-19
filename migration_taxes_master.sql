-- ==========================================
-- MASTER TAX MIGRATION
-- ==========================================

-- 1. Create md_taxes table first
CREATE TABLE IF NOT EXISTS public.md_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL UNIQUE,
  rate numeric NOT NULL DEFAULT 0,
  type varchar(20) DEFAULT 'VAT',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Insert default tax types
INSERT INTO public.md_taxes (name, rate, type, description)
VALUES 
  ('NON-TAX', 0, 'NONE', 'Tanpa Pajak'),
  ('PPN 1.1%', 1.1, 'VAT', 'PPN Jasa Logistik 1.1%'),
  ('PPN 11%', 11, 'VAT', 'PPN Standar 11%'),
  ('PPH 23 (2%)', -2, 'WHT', 'PPH 23 Jasa 2% (Pengurang)'),
  ('PPN 1.1% + PPH 23', -0.9, 'VAT-WHT', 'Net Tax (1.1% - 2%)')
ON CONFLICT (name) DO NOTHING;

-- 3. Add tax_id columns to transactional tables
ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS tax_id uuid REFERENCES public.md_taxes(id);
ALTER TABLE public.extra_costs ADD COLUMN IF NOT EXISTS tax_id uuid REFERENCES public.md_taxes(id);

-- 4. Enable RLS for md_taxes
ALTER TABLE public.md_taxes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON public.md_taxes;
CREATE POLICY "Allow read access for all authenticated users" ON public.md_taxes FOR SELECT TO authenticated USING (true);
