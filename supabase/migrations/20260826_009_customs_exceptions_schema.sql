-- ============================================================================
-- Migration: 20260826_009_customs_exceptions_schema.sql
-- Description: Canonical Exception Registry, Validation Runs & Readiness Schema
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 3D-6D-6)
-- Classification: Production-Safe / Non-Destructive / Idempotent
-- ============================================================================

-- 1. cus_declaration_validation_runs (Historical Validation Run Tracking)
CREATE TABLE IF NOT EXISTS public.cus_declaration_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  overall_status VARCHAR(30) NOT NULL, -- 'READY', 'READY_WITH_WARNINGS', 'BLOCKED', 'NOT_READY'
  rule_set_version VARCHAR(30) NOT NULL DEFAULT '2026.1-BTKI',
  engine_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  trigger_type VARCHAR(30) NOT NULL DEFAULT 'MANUAL', -- 'IMPORT', 'MANUAL', 'ITEM_CHANGE', 'DOCUMENT_CHANGE', 'EXCEPTION_RESOLUTION', 'SYSTEM'
  triggered_by UUID,
  total_lines INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  info_count INTEGER NOT NULL DEFAULT 0,
  execution_duration_ms INTEGER NOT NULL DEFAULT 0,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. cus_declaration_exceptions (Canonical Exception Registry & Lifecycle)
CREATE TABLE IF NOT EXISTS public.cus_declaration_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  validation_run_id UUID REFERENCES public.cus_declaration_validation_runs(id) ON DELETE SET NULL,
  classification_line_id UUID REFERENCES public.cus_classification_lines(id) ON DELETE SET NULL,
  item_sequence INTEGER,
  sku_code TEXT,
  rule_code VARCHAR(40) NOT NULL,
  fingerprint TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'BLOCKING', 'WARNING', 'INFORMATIONAL'
  category VARCHAR(30) NOT NULL, -- 'IDENTITY', 'CARGO', 'CLASSIFICATION', 'VALUATION', 'ORIGIN', 'DOCUMENTS', 'TAX', 'LARTAS'
  resolution_policy VARCHAR(30) NOT NULL DEFAULT 'FIX_REQUIRED', -- 'FIX_REQUIRED', 'AUTHORIZED_OVERRIDE', 'APPROVAL_REQUIRED', 'SYSTEM_ONLY'
  readiness_impact VARCHAR(30) NOT NULL DEFAULT 'BLOCKS_READINESS', -- 'BLOCKS_READINESS', 'WARNING_ALLOWED', 'INFORMATIONAL_ONLY'
  rule_source TEXT DEFAULT 'RULE SOURCE REQUIRED',
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'WAIVED', 'REJECTED', 'REOPENED'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  current_value TEXT,
  expected_value TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  source VARCHAR(30) NOT NULL DEFAULT 'DETERMINISTIC_ENGINE',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_by UUID,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_type VARCHAR(40), -- 'DATA_CORRECTED', 'DOCUMENT_ATTACHED', 'CLASSIFICATION_OVERRIDDEN', 'MANUALLY_WAIVED', 'AUTO_RESOLVED'
  resolution_note TEXT,
  reopened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cus_exception_fingerprint UNIQUE (tenant_id, declaration_id, fingerprint)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_cus_val_run_dec ON public.cus_declaration_validation_runs(declaration_id);
CREATE INDEX IF NOT EXISTS idx_cus_val_run_tenant ON public.cus_declaration_validation_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cus_exc_dec ON public.cus_declaration_exceptions(declaration_id);
CREATE INDEX IF NOT EXISTS idx_cus_exc_tenant_status ON public.cus_declaration_exceptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cus_exc_severity ON public.cus_declaration_exceptions(declaration_id, severity);
CREATE INDEX IF NOT EXISTS idx_cus_exc_category ON public.cus_declaration_exceptions(declaration_id, category);
CREATE INDEX IF NOT EXISTS idx_cus_exc_line ON public.cus_declaration_exceptions(classification_line_id);
CREATE INDEX IF NOT EXISTS idx_cus_exc_fingerprint ON public.cus_declaration_exceptions(tenant_id, declaration_id, fingerprint);

-- 4. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cus_declaration_validation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cus_declaration_exceptions TO authenticated;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.cus_declaration_validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_declaration_exceptions ENABLE ROW LEVEL SECURITY;

-- 5a. cus_declaration_validation_runs: Tenant Isolation
DROP POLICY IF EXISTS cus_val_runs_tenant_isolation ON public.cus_declaration_validation_runs;
CREATE POLICY cus_val_runs_tenant_isolation ON public.cus_declaration_validation_runs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 5b. cus_declaration_exceptions: Tenant Isolation
DROP POLICY IF EXISTS cus_exceptions_tenant_isolation ON public.cus_declaration_exceptions;
CREATE POLICY cus_exceptions_tenant_isolation ON public.cus_declaration_exceptions
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 6. NOTIFY PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
