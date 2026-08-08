-- EasyGo GPS Provider Integration
-- Adds support for external GPS hardware tracking via EasyGo API
-- Tenant: PT Armada Transport Mandiri (ATM) - c0611a0a-6210-4d6e-8206-504e6936adea

-- 1. GPS Provider Configurations (per-tenant API credentials)
CREATE TABLE IF NOT EXISTS public.gps_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_name VARCHAR(50) NOT NULL, -- 'easygo', 'wialon', 'flespi', etc.
  api_token TEXT NOT NULL,
  api_url TEXT NOT NULL DEFAULT 'https://vtsapi.easygo-gps.co.id',
  is_active BOOLEAN DEFAULT true,
  config JSONB, -- additional provider-specific settings
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, provider_name)
);

-- 2. Add EasyGo mapping columns to md_fleets
ALTER TABLE public.md_fleets
ADD COLUMN IF NOT EXISTS easygo_vehicle_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS easygo_nopol VARCHAR(100);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_fleets_easygo_vehicle_id ON public.md_fleets(easygo_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gps_provider_configs_tenant ON public.gps_provider_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gps_provider_configs_active ON public.gps_provider_configs(tenant_id, is_active) WHERE is_active = true;

-- 4. RLS policies
ALTER TABLE public.gps_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for gps_provider_configs"
  ON public.gps_provider_configs FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 5. Insert EasyGo config for ATM tenant
INSERT INTO public.gps_provider_configs (tenant_id, provider_name, api_token, api_url, is_active)
VALUES (
  'c0611a0a-6210-4d6e-8206-504e6936adea',
  'easygo',
  'CADE23CEBB4C4F3B9126D1CB304E790D',
  'https://vtsapi.easygo-gps.co.id',
  true
) ON CONFLICT (tenant_id, provider_name) DO NOTHING;

-- 6. Add source column for EasyGo GPS points (if not exists from migration 20260727)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_tracking' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.job_tracking ADD COLUMN source VARCHAR(50) DEFAULT 'pwa';
  END IF;
END $$;
