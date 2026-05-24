-- Master Token Prices Configuration
-- Stores current token price and price history for audit trail

CREATE TABLE IF NOT EXISTS public.token_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_token INTEGER NOT NULL DEFAULT 1000,
  currency VARCHAR(3) DEFAULT 'IDR',
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history table for audit trail
CREATE TABLE IF NOT EXISTS public.token_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_price INTEGER NOT NULL,
  new_price INTEGER NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default price
INSERT INTO public.token_prices (price_per_token, currency, notes) 
VALUES (1000, 'IDR', 'Default token price')
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.token_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_price_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read current price
CREATE POLICY "token_prices_read_all" ON public.token_prices
  FOR SELECT USING (true);

-- Only owner/admin can update
CREATE POLICY "token_prices_update_owner" ON public.token_prices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('owner', 'superadmin')
    )
  );

CREATE POLICY "token_price_history_read_all" ON public.token_price_history
  FOR SELECT USING (true);

CREATE POLICY "token_price_history_insert_owner" ON public.token_price_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('owner', 'superadmin')
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_token_prices_effective ON public.token_prices(effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_token_price_history_created ON public.token_price_history(created_at DESC);
