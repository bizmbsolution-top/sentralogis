-- ============================================================================
-- Migration: 20260902_037_external_reference_foundation.sql
-- Description: DATA-3 External Reference Foundation
-- Architecture: ADR-071 External Reference Architecture
-- ============================================================================

-- 1. external_references — Canonical external system identity mappings
CREATE TABLE IF NOT EXISTS public.external_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PARTY', 'LOCATION', 'CARRIER', 'SHIPMENT', 'ORDER')),
  entity_id UUID NOT NULL,
  external_system TEXT NOT NULL CHECK (external_system IN ('ERP', 'CRM', 'TMS', 'WMS', 'CUSTOMS', 'OTHER')),
  external_id TEXT NOT NULL,
  external_context JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_external_reference UNIQUE (tenant_id, entity_type, entity_id, external_system)
);

CREATE INDEX IF NOT EXISTS idx_ext_ref_tenant ON public.external_references(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ext_ref_entity ON public.external_references(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ext_ref_system ON public.external_references(external_system);
CREATE INDEX IF NOT EXISTS idx_ext_ref_external_id ON public.external_references(external_system, external_id);
CREATE INDEX IF NOT EXISTS idx_ext_ref_tenant_system ON public.external_references(tenant_id, external_system);
CREATE INDEX IF NOT EXISTS idx_ext_ref_active ON public.external_references(tenant_id, entity_type, entity_id, is_active) WHERE is_active = true;

ALTER TABLE public.external_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "external_references_tenant_isolation" ON public.external_references;
CREATE POLICY "external_references_tenant_isolation" ON public.external_references
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_references TO authenticated;

-- 2. Updated at trigger
DROP TRIGGER IF EXISTS trg_external_references_updated_at ON public.external_references;
CREATE TRIGGER trg_external_references_updated_at
BEFORE UPDATE ON public.external_references
FOR EACH ROW EXECUTE FUNCTION update_party_tables_updated_at();

NOTIFY pgrst, 'reload schema';
