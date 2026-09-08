BEGIN;

-- ============================================================================
-- 1. TENANT TOKEN PRICES (tenant-specific, effective-dated)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_token_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  price_per_token INTEGER NOT NULL DEFAULT 1000,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_tenant_token_prices_tenant ON public.tenant_token_prices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_token_prices_effective ON public.tenant_token_prices(effective_from, effective_to);

ALTER TABLE public.tenant_token_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_token_prices_tenant_isolation ON public.tenant_token_prices
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE ON public.tenant_token_prices TO authenticated;

-- ============================================================================
-- 2. TENANT SERVICE RATES (per-tenant, per-service, effective-dated)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('TRUCKING', 'CUSTOMS', 'WMS_INBOUND', 'WMS_OUTBOUND', 'WMS_TRANSFER', 'FORWARDING')),
  tokens_per_completion NUMERIC(8,2) NOT NULL DEFAULT 1,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, service_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_tenant_service_rates_tenant ON public.tenant_service_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_service_rates_service ON public.tenant_service_rates(service_type);
CREATE INDEX IF NOT_EXISTS idx_tenant_service_rates_effective ON public.tenant_service_rates(effective_from, effective_to);

ALTER TABLE public.tenant_service_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_service_rates_tenant_isolation ON public.tenant_service_rates
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE ON public.tenant_service_rates TO authenticated;

-- ============================================================================
-- 3. TOKEN CONSUMPTION EVENTS (immutable ledger)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.token_consumption_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('JO', 'SHP', 'CUS_DECLARATION', 'WH_INBOUND', 'WH_OUTBOUND', 'WH_TRANSFER')),
  source_id UUID NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('TRUCKING', 'CUSTOMS', 'WMS_INBOUND', 'WMS_OUTBOUND', 'WMS_TRANSFER', 'FORWARDING')),
  tokens_consumed NUMERIC(8,2) NOT NULL,
  token_value_snapshot INTEGER NOT NULL,
  monetary_equivalent NUMERIC(18,2) NOT NULL,
  rule_version INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_type, source_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_token_consumption_tenant ON public.token_consumption_events(tenant_id);
CREATE INDEX IF NOT_EXISTS idx_token_consumption_source ON public.token_consumption_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_token_consumption_service ON public.token_consumption_events(service_type);
CREATE INDEX IF NOT EXISTS idx_token_consumption_consumed_at ON public.token_consumption_events(consumed_at);

ALTER TABLE public.token_consumption_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY token_consumption_tenant_isolation ON public.token_consumption_events
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT ON public.token_consumption_events TO authenticated;

-- ============================================================================
-- 4. IDEMPOTENCY PROTECTION (prevent duplicate consumption)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_token_consumption_idempotency
  ON public.token_consumption_events(tenant_id, idempotency_key);

-- ============================================================================
-- 5. HISTORICAL VALUE SNAPSHOT (preserve economics at consumption)
-- ============================================================================
-- The token_value_snapshot field preserves the token value at time of consumption.
-- Future changes to tenant_token_prices MUST NOT mutate historical records.

-- ============================================================================
-- 6. RLS POLICIES FOR EXISTING TABLES (extend with tenant-safe patterns)
-- ============================================================================

-- tenant_token_prices: only Super Admin can mutate
CREATE POLICY tenant_token_prices_superadmin_mutate ON public.tenant_token_prices
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'superadmin')
    )
  );

CREATE POLICY tenant_token_prices_superadmin_update ON public.tenant_token_prices
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'superadmin')
    )
  );

-- tenant_service_rates: only Super Admin can mutate
CREATE POLICY tenant_service_rates_superadmin_mutate ON public.tenant_service_rates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'superadmin')
    )
  );

CREATE POLICY tenant_service_rates_superadmin_update ON public.tenant_service_rates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('owner', 'superadmin')
    )
  );

COMMIT;
