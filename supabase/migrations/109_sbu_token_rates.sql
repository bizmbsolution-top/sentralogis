-- Migration 109: Create sbu_token_rates table
-- Configurable token consumption rates per SBU type.
-- Owner sets how many tokens are burned per completed JO per SBU.

CREATE TABLE IF NOT EXISTS public.sbu_token_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sbu_type TEXT NOT NULL UNIQUE CHECK (sbu_type IN ('TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING')),
  tokens_per_jo INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed default rates
INSERT INTO public.sbu_token_rates (sbu_type, tokens_per_jo) VALUES
  ('TRUCKING',  2),
  ('WAREHOUSE', 1),
  ('CLEARANCE', 2),
  ('FORWARDING', 1)
ON CONFLICT (sbu_type) DO NOTHING;

-- RLS: everyone can read, only owner/superadmin can manage
ALTER TABLE public.sbu_token_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sbu_token_rates_select" ON public.sbu_token_rates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sbu_token_rates_all" ON public.sbu_token_rates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('superadmin', 'owner')
    )
  );

GRANT SELECT ON public.sbu_token_rates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sbu_token_rates TO authenticated;

SELECT '109_sbu_token_rates OK' AS result;
