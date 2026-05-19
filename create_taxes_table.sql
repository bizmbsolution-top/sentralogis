-- 1. Create md_taxes table
CREATE TABLE IF NOT EXISTS public.md_taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL UNIQUE,
  rate numeric NOT NULL DEFAULT 0, -- e.g. 1.1 for 1.1%
  type varchar(20) DEFAULT 'VAT', -- VAT, WHT (Withholding Tax)
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.md_taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for all authenticated users" ON public.md_taxes FOR SELECT TO authenticated USING (true);

-- 3. Insert default tax types
INSERT INTO public.md_taxes (name, rate, type, description)
VALUES 
  ('NON-TAX', 0, 'NONE', 'Tanpa Pajak'),
  ('PPN 1.1%', 1.1, 'VAT', 'PPN Jasa Logistik 1.1%'),
  ('PPN 11%', 11, 'VAT', 'PPN Standar 11%'),
  ('PPH 23 (2%)', -2, 'WHT', 'PPH 23 Jasa 2% (Pengurang)'),
  ('PPN 1.1% + PPH 23', -0.9, 'VAT-WHT', 'Net Tax (1.1% - 2%)')
ON CONFLICT (name) DO NOTHING;
