-- ============================================================================
-- Migration: 20260826_011_customs_ceisa_preparations_schema.sql
-- Description: CEISA 4.0 Preparation Runs, Immutable Artifacts & Multi-Layer Validation
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 3D-6D-8)
-- Classification: Production-Safe / Non-Destructive / Idempotent
-- ============================================================================

-- 1. Create CEISA Preparation Runs Table
CREATE TABLE IF NOT EXISTS public.cus_ceisa_preparations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL DEFAULT 1,
  message_type VARCHAR(50) NOT NULL DEFAULT 'PIB_BC20',
  schema_version VARCHAR(50) NOT NULL DEFAULT 'CEISA-4.0-XML-v1.0',
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'VALIDATING', 'INVALID', 'READY_FOR_REVIEW', 'READY_TO_TRANSMIT', 'SUPERSEDED')),
  artifact_format VARCHAR(10) NOT NULL DEFAULT 'XML'
    CHECK (artifact_format IN ('XML', 'EDI', 'JSON')),
  artifact_content TEXT,
  artifact_checksum VARCHAR(64),
  artifact_size_bytes INTEGER,
  item_count INTEGER NOT NULL DEFAULT 0,
  blocking_errors_count INTEGER NOT NULL DEFAULT 0,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create CEISA Multi-Layer Validation Results Table
CREATE TABLE IF NOT EXISTS public.cus_ceisa_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  preparation_id UUID NOT NULL REFERENCES public.cus_ceisa_preparations(id) ON DELETE CASCADE,
  layer VARCHAR(20) NOT NULL
    CHECK (layer IN ('DOMAIN', 'SCHEMA', 'BUSINESS_RULE')),
  rule_code VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL
    CHECK (severity IN ('BLOCKING', 'WARNING', 'INFO')),
  field_path TEXT NOT NULL,
  message TEXT NOT NULL,
  expected_value TEXT,
  actual_value TEXT,
  resolution_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cus_ceisa_prep_dec ON public.cus_ceisa_preparations(declaration_id, version_no DESC);
CREATE INDEX IF NOT EXISTS idx_cus_ceisa_prep_tenant_status ON public.cus_ceisa_preparations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cus_ceisa_val_prep ON public.cus_ceisa_validation_results(preparation_id, layer);
CREATE INDEX IF NOT EXISTS idx_cus_ceisa_val_rule ON public.cus_ceisa_validation_results(rule_code, severity);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.cus_ceisa_preparations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_ceisa_validation_results ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Tenant Isolation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cus_ceisa_preparations' AND policyname = 'tenant_isolation_cus_ceisa_preparations'
  ) THEN
    CREATE POLICY tenant_isolation_cus_ceisa_preparations ON public.cus_ceisa_preparations
      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cus_ceisa_validation_results' AND policyname = 'tenant_isolation_cus_ceisa_validation_results'
  ) THEN
    CREATE POLICY tenant_isolation_cus_ceisa_validation_results ON public.cus_ceisa_validation_results
      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
  END IF;
END $$;

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
