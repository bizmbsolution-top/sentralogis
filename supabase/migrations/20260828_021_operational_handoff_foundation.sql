-- ============================================================================
-- Migration: 20260828_021_operational_handoff_foundation.sql
-- Description: U-18 Operational Handoff Foundation Implementation
-- Ratified by: ADR-051 (Generic Operational Handoff Contract)
--              ADR-052 (Forwarding SBU Handoff Adapter)
--              ADR-053 (Customs SBU Handoff Adapter)
--              ADR-054 (Trucking SBU Handoff Adapter)
--              ADR-055 (Warehouse SBU Handoff Adapter)
--              ADR-056 (Handoff Idempotency, Retry, & Compensation)
--
-- SCOPE (U-18 "canonical foundation"):
--   1. operational_handoffs canonical aggregate (DB-generated UUID PK,
--      DB-authoritative handoff_number, UNIQUE(tenant_id, handoff_number),
--      allocation child, target_domain, loose polymorphic domain reference).
--   2. next_operational_handoff_number() atomic server-side number authority
--      (mirrors U-11/U-13/U-15 sequence patterns; format OH-YYYY-MM-NNNN).
--   3. operational_handoffs RLS (tenant-scoped via get_my_tenant_id()).
--   4. No direct operational execution engines — translation & seam only.
--
-- Non-destructive / additive / idempotent.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. OPERATIONAL HANDOFF STATUS ENUM (canonical lifecycle; ADR-051/056)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_operational_handoff_status AS ENUM (
    'ISSUED',
    'ACKNOWLEDGED',
    'ACCEPTED',
    'EXECUTING',
    'FULFILLED',
    'FAILED',
    'REJECTED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE com_operational_handoff_status IS
  'U-18/ADR-051: Operational handoff lifecycle. ISSUED=handoff created; ACKNOWLEDGED=adapter received; ACCEPTED=domain committed; EXECUTING=domain in progress; FULFILLED=domain complete; FAILED=execution error; REJECTED=domain declined; CANCELLED=voided pre-execution.';

-- ----------------------------------------------------------------------------
-- 2. OPERATIONAL HANDOFF NUMBER SEQUENCE (atomic; ADR-051)
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_operational_handoff START WITH 1 INCREMENT BY 1;

COMMENT ON SEQUENCE public.seq_operational_handoff IS
  'U-18/ADR-051: Atomic sequence for Operational Handoff business number generation.';

-- ----------------------------------------------------------------------------
-- 3. OPERATIONAL HANDOFFS TABLE (canonical handoff contract aggregate)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operational_handoffs (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES public.md_tenants(id),
  handoff_number              TEXT NOT NULL,
  fulfillment_id              UUID NOT NULL REFERENCES public.fulfillments(id)
                                ON DELETE RESTRICT,
  fulfillment_allocation_id   UUID NOT NULL REFERENCES public.fulfillment_allocations(id)
                                ON DELETE RESTRICT,
  target_domain               TEXT NOT NULL,
  status                      com_operational_handoff_status NOT NULL DEFAULT 'ISSUED',
  idempotency_key             UUID,
  request_payload             JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_domain_reference   JSONB,
  failure_code                TEXT,
  failure_reason              TEXT,
  attempt_count               INTEGER NOT NULL DEFAULT 1
                                CONSTRAINT operational_handoff_attempt_positive CHECK (attempt_count >= 1),
  issued_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at             TIMESTAMPTZ,
  accepted_at                 TIMESTAMPTZ,
  executing_at                TIMESTAMPTZ,
  fulfilled_at                TIMESTAMPTZ,
  failed_at                   TIMESTAMPTZ,
  rejected_at                 TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  UUID REFERENCES auth.users(id),
  updated_by                  UUID REFERENCES auth.users(id),
  CONSTRAINT uq_operational_handoff_number      UNIQUE (tenant_id, handoff_number),
  CONSTRAINT uq_operational_handoff_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operational_handoffs_tenant     ON public.operational_handoffs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operational_handoffs_fl         ON public.operational_handoffs(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_operational_handoffs_alloc      ON public.operational_handoffs(fulfillment_allocation_id);
CREATE INDEX IF NOT EXISTS idx_operational_handoffs_status     ON public.operational_handoffs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_operational_handoffs_domain     ON public.operational_handoffs(tenant_id, target_domain);

COMMENT ON TABLE public.operational_handoffs IS
  'U-18/ADR-051: Operational handoff contract seam — formal bridge between Fulfillment allocations and sovereign operational domains. NOT an operational engine.';

COMMENT ON COLUMN public.operational_handoffs.assigned_domain_reference IS
  'U-18/ADR-051: Loose polymorphic pointer ({ reference_type, reference_id, reference_number }) to domain aggregate (shp_shipments, cus_declarations, svc_service_requests).';

-- ----------------------------------------------------------------------------
-- 4. next_operational_handoff_number() ATOMIC NUMBER AUTHORITY (ADR-051)
--    Format: OH-YYYY-MM-NNNN
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_operational_handoff_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_handoff_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq := nextval('seq_operational_handoff');
  v_handoff_number := 'OH-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_handoff_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_operational_handoff_number(UUID) TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.seq_operational_handoff TO authenticated;

COMMENT ON FUNCTION public.next_operational_handoff_number(UUID) IS
  'U-18/ADR-051: Atomic server-side Operational Handoff number generator. Format: OH-YYYY-MM-NNNN. Client MUST NOT generate canonical handoff numbers.';

-- ----------------------------------------------------------------------------
-- 5. GRANTS + RLS for operational_handoffs (tenant isolation)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_handoffs TO authenticated;

ALTER TABLE public.operational_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operational_handoffs_isolation ON public.operational_handoffs;
CREATE POLICY operational_handoffs_isolation ON public.operational_handoffs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

COMMIT;
