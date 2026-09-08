-- ============================================================================
-- Migration: 20260828_020_fulfillment_foundation.sql
-- Description: U-15 Fulfillment Foundation Implementation
-- Ratified by: ADR-039 (Composition Not Engine)
--              ADR-040 (Shipment != Fulfillment)
--              ADR-041 (Fulfillment Number Authority)
--              ADR-042 (Fulfillment Cardinality & Lineage)
--              ADR-043 (Fulfillment State & Events)
--              ADR-044 (Commercial Amendment vs Fulfillment Change)
--
-- SCOPE (U-15 "canonical foundation"):
--   1. fulfillments canonical aggregate (DB-generated UUID PK, DB-authoritative
--      fulfillment_number, UNIQUE(tenant_id, fulfillment_number), Sales Order
--      parent 1:N revisions, versioned revision model).
--   2. fulfillment_allocations capability composition (1:N per fulfillment,
--      FORWARDING/CUSTOMS/TRUCKING/WAREHOUSE, referencing capability bindings).
--   3. next_fulfillment_number() atomic server-side number authority (mirrors
--      U-11 next_quote_number() / U-13 next_sales_order()).
--   4. fulfillments RLS (tenant-scoped via get_my_tenant_id()).
--   5. No operational payloads — no WO/JO/Shipment/SR creation here.
--
-- NOT in scope (deferred):
--   - Full allocation arithmetic engine (partial fulfillment tracking basis only)
--   - Event subscription from operational domains (SEA wiring deferred)
--   - Forwarding execution / carrier booking / container planning
--   - Customer visibility UI / Control Tower / Marketplace
--
-- Non-destructive / additive / idempotent. Rollback notes per section.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. FULFILLMENT STATUS ENUM (canonical lifecycle; ADR-043 boundary)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_fulfillment_status AS ENUM (
    'PLANNED',
    'ACTIVE',
    'PARTIALLY_FULFILLED',
    'FULFILLED',
    'CLOSED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE com_fulfillment_status IS
  'U-15/ADR-043: Fulfillment lifecycle. PLANNED=composition drafted; ACTIVE=handoff begun; PARTIALLY_FULFILLED=some allocations delivered; FULFILLED=all complete; CLOSED=accounting done; CANCELLED=voided pre-execution.';

-- ----------------------------------------------------------------------------
-- 2. FULFILLMENT NUMBER SEQUENCE (atomic; ADR-041)
--    Rollback: DROP SEQUENCE IF EXISTS public.seq_fulfillment;
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_fulfillment START WITH 1 INCREMENT BY 1;

COMMENT ON SEQUENCE public.seq_fulfillment IS
  'U-15/ADR-041: Atomic sequence for Fulfillment business number generation.';

-- ----------------------------------------------------------------------------
-- 3. FULFILLMENTS TABLE (canonical composition aggregate)
--    ADR-042: child of Sales Order (sales_orders), 1:N revisions.
--    ADR-041: PK = DB-generated UUID (never client); fulfillment_number DB-authoritative.
--    Revision model: one SO may have multiple fulfillment rows (revision_no increments).
--    Rollback: DROP TABLE IF EXISTS public.fulfillments;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fulfillments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES public.md_tenants(id),
  sales_order_id              UUID NOT NULL REFERENCES public.sales_orders(id)
                                ON DELETE RESTRICT,
  fulfillment_number          TEXT NOT NULL,
  revision_no                 INTEGER NOT NULL DEFAULT 1
                                CONSTRAINT fulfillment_revision_positive CHECK (revision_no >= 1),
  status                      com_fulfillment_status NOT NULL DEFAULT 'PLANNED',
  idempotency_key             UUID,
  target_fulfillment_date     DATE,
  version_no                  INTEGER NOT NULL DEFAULT 1
                                CONSTRAINT fulfillment_version_positive CHECK (version_no >= 1),
  cancelled_at                TIMESTAMPTZ,
  cancelled_reason            TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  UUID REFERENCES auth.users(id),
  updated_by                  UUID REFERENCES auth.users(id),
  CONSTRAINT uq_fulfillment_number      UNIQUE (tenant_id, fulfillment_number),
  CONSTRAINT uq_fulfillment_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fulfillments_tenant     ON public.fulfillments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_so         ON public.fulfillments(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_status     ON public.fulfillments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fulfillments_revision   ON public.fulfillments(sales_order_id, revision_no);

COMMENT ON TABLE public.fulfillments IS
  'U-15/ADR-039/042: Fulfillment composition aggregate — per-SO versioned plan of capability allocations. NOT an operational engine.';

COMMENT ON COLUMN public.fulfillments.revision_no IS
  'U-15/ADR-042/043: Revision number. Incremented on each Fulfillment plan change (replanning). Historical revisions immutable.';

COMMENT ON COLUMN public.fulfillments.fulfillment_number IS
  'U-15/ADR-041: Canonical business number. Allocated ONLY by next_fulfillment_number(). Client MUST NOT generate. Format: FL-YYYY-MM-NNNN.';

COMMENT ON CONSTRAINT uq_fulfillment_number ON public.fulfillments IS
  'U-15/ADR-041: Prevents duplicate Fulfillment numbers per tenant.';

COMMENT ON CONSTRAINT uq_fulfillment_idempotency ON public.fulfillments IS
  'U-15: Idempotency key for retry-safe creation (tenant-scoped).';

-- ----------------------------------------------------------------------------
-- 4. FULFILLMENT ALLOCATIONS (capability composition per fulfillment)
--    ADR-039: scopes capability allocations, tracks progress.
--    ADR-042: Fulfillment -> capability allocation 1:N.
--    ADR-040/038: FORWARDING allocations reference shipments (optional).
--    ADR-020: capability_type matches commercial_capability_bindings.capability_type.
--    Rollback: DROP TABLE IF EXISTS public.fulfillment_allocations;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fulfillment_allocations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES public.md_tenants(id),
  fulfillment_id              UUID NOT NULL REFERENCES public.fulfillments(id)
                                ON DELETE CASCADE,
  capability_type             TEXT NOT NULL, -- matches commercial_capability_registry.capability_code (FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE)
  capability_binding_id       UUID REFERENCES public.commercial_capability_bindings(id)
                                ON DELETE SET NULL,
  allocated_quantity          NUMERIC(18,3) NOT NULL DEFAULT 0
                                CONSTRAINT allocation_qty_nonneg CHECK (allocated_quantity >= 0),
  delivered_quantity          NUMERIC(18,3) NOT NULL DEFAULT 0
                                CONSTRAINT delivery_qty_nonneg CHECK (delivered_quantity >= 0),
  status                      TEXT NOT NULL DEFAULT 'PLANNED',
  shipment_id                 UUID REFERENCES public.shp_shipments(id)
                                ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fulfillment_allocations_tenant ON public.fulfillment_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_allocations_fulfillment ON public.fulfillment_allocations(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_allocations_capability ON public.fulfillment_allocations(capability_type);
CREATE INDEX IF NOT EXISTS idx_fulfillment_allocations_shipment ON public.fulfillment_allocations(shipment_id);

COMMENT ON TABLE public.fulfillment_allocations IS
  'U-15/ADR-039/042: Per-fulfillment capability allocation. Tracks planned/allocated/delivered quantities per capability. NOT an operational engine.';

COMMENT ON COLUMN public.fulfillment_allocations.capability_type IS
  'U-15/ADR-020/042: Capability type from registry (FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE).';

COMMENT ON COLUMN public.fulfillment_allocations.capability_binding_id IS
  'U-15/ADR-020: Optional reference to the engagement-level capability binding this allocation consumes.';

COMMENT ON COLUMN public.fulfillment_allocations.shipment_id IS
  'U-15/ADR-040/038: Optional linkage to the Shipment executing the FORWARDING allocation. One allocation -> one Shipment (partial shipments = multiple allocations).';

-- ----------------------------------------------------------------------------
-- 5. next_fulfillment_number() ATOMIC NUMBER AUTHORITY (ADR-041; mirrors U-11/035)
--    Format: FL-YYYY-MM-NNNN
--    Concurrency: nextval() is atomic & session-safe. UNIQUE(tenant_id,
--    fulfillment_number) is the safety net. No SELECT MAX + increment.
--    SECURITY DEFINER so it can read the sequence; p_tenant_id is carried for
--    tenant-scoped call semantics (uniqueness per tenant enforced by table).
--    Rollback: DROP FUNCTION IF EXISTS public.next_fulfillment_number(UUID);
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_fulfillment_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_fulfillment_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq := nextval('seq_fulfillment');
  v_fulfillment_number := 'FL-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_fulfillment_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_fulfillment_number(UUID) TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.seq_fulfillment TO authenticated;

COMMENT ON FUNCTION public.next_fulfillment_number(UUID) IS
  'U-15/ADR-041: Atomic server-side Fulfillment number generator. Format: FL-YYYY-MM-NNNN. Client MUST NOT generate canonical Fulfillment numbers.';

-- ----------------------------------------------------------------------------
-- 6. GRANTS + RLS for fulfillments (tenant isolation)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fulfillments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fulfillment_allocations TO authenticated;

ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fulfillments_isolation ON public.fulfillments;
CREATE POLICY fulfillments_isolation ON public.fulfillments
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS fulfillment_allocations_isolation ON public.fulfillment_allocations;
CREATE POLICY fulfillment_allocations_isolation ON public.fulfillment_allocations
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

COMMIT;