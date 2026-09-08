-- ============================================================================
-- Migration: 20260827_013_commercial_capability_bindings.sql
-- Description: Progressive Capability Composition Schema (Phase 4A)
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 4A)
-- Classification: Production-Safe / Non-Destructive / Additive-Only
-- ADR-018: Reuses commercial_work_orders as engagement root
-- ADR-019: Adds nullable cross-domain refs to cus_declarations
-- ADR-020: Capability binding unique (tenant_id, work_order_id, capability_type)
-- ============================================================================

-- 1. commercial_capability_bindings
-- Tracks which service capabilities are active under a commercial work order (engagement).
-- Supports: CUSTOMS, FORWARDING, TRUCKING, WAREHOUSE as peer capabilities.
CREATE TABLE IF NOT EXISTS public.commercial_capability_bindings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.md_tenants(id),
  work_order_id     UUID NOT NULL REFERENCES public.commercial_work_orders(id) ON DELETE CASCADE,
  capability_type   TEXT NOT NULL CHECK (capability_type IN ('CUSTOMS', 'FORWARDING', 'TRUCKING', 'WAREHOUSE')),
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED')),
  scope             JSONB DEFAULT '{}'::jsonb,
  pricing           JSONB DEFAULT '{}'::jsonb,
  currency          TEXT NOT NULL DEFAULT 'IDR',
  activated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  deactivated_at    TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES auth.users(id),
  -- ADR-020: One active capability type per work order per tenant
  CONSTRAINT uq_com_capability_binding UNIQUE (tenant_id, work_order_id, capability_type)
);

-- 2. Add nullable cross-domain reference columns to cus_declarations (ADR-019)
-- These references enable progressive composition without breaking standalone customs.
-- All ON DELETE SET NULL: if the referenced entity is deleted, the declaration survives.
ALTER TABLE public.cus_declarations
  ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES public.shp_shipments(id) ON DELETE SET NULL;

ALTER TABLE public.cus_declarations
  ADD COLUMN IF NOT EXISTS execution_leg_id UUID REFERENCES public.shp_execution_legs(id) ON DELETE SET NULL;

-- Note: job_orders FK uses text-based reference since job_orders PK may vary across tenants.
-- We add as a UUID column without FK constraint for maximum flexibility with existing trucking schema.
ALTER TABLE public.cus_declarations
  ADD COLUMN IF NOT EXISTS job_order_id UUID;

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_com_cap_tenant ON public.commercial_capability_bindings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_com_cap_wo ON public.commercial_capability_bindings(work_order_id);
CREATE INDEX IF NOT EXISTS idx_com_cap_type ON public.commercial_capability_bindings(tenant_id, capability_type);
CREATE INDEX IF NOT EXISTS idx_com_cap_status ON public.commercial_capability_bindings(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_cus_dec_shipment ON public.cus_declarations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_cus_dec_exec_leg ON public.cus_declarations(execution_leg_id);
CREATE INDEX IF NOT EXISTS idx_cus_dec_jo ON public.cus_declarations(job_order_id);

-- 4. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_capability_bindings TO authenticated;

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.commercial_capability_bindings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS com_capability_bindings_tenant_isolation ON public.commercial_capability_bindings;
CREATE POLICY com_capability_bindings_tenant_isolation ON public.commercial_capability_bindings
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
