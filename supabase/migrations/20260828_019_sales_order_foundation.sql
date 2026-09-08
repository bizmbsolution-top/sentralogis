-- ============================================================================
-- Migration: 20260828_019_sales_order_foundation.sql
-- Description: U-13 Sales Order Foundation
-- Ratified by: ADR-034 (Engagement -> Sales Order 1:N)
--              ADR-035 (Sales Order Number Authority)
--              ADR-036 (Sales Order Fulfillment Boundary)
--              ADR-037 (Sales Order -> Work Order Cardinality)
--              ADR-038 (Shipment -> Sales Order Reference)
--
-- SCOPE (U-13 "smallest correct foundation"):
--   1. sales_orders canonical header (DB-generated UUID PK, DB-authoritative
--      so_number, UNIQUE(tenant_id, so_number), Engagement parent 1:N,
--      nullable quote reference).
--   2. next_sales_order() atomic server-side number authority (mirrors U-11
--      next_quote_number()). Client MUST NOT generate canonical SO numbers.
--   3. sales_orders RLS (tenant-scoped via get_my_tenant_id()).
--   4. ADR-038 minimum operational reference: shp_shipments.sales_order_id
--      (ONE SO -> MANY Shipments). This is the ONLY protected operational
--      schema mutation permitted by U-13 (Requirement §32).
--
-- NOT in scope (deferred, see U-13 report):
--   - sales_order_items / SO sell-line table (governed by a future PRICING ADR
--     deferred from U-12A §K; commercial_line_items cannot safely represent SO
--     lines because its parent FK points to the Engagement, not the SO).
--   - WO ownership column (ADR-037 is enforced as a domain invariant in U-13;
--     the physical fulfillment composition belongs to the Fulfillment phase).
--
-- Non-destructive / additive / idempotent. Rollback notes per section.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SO STATUS ENUM (canonical lifecycle; ADR-036 boundary)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_sales_order_status AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'IN_FULFILLMENT',
    'PARTIALLY_FULFILLED',
    'FULFILLED',
    'CLOSED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. SO NUMBER SEQUENCE (atomic; ADR-035)
--    Rollback: DROP SEQUENCE IF EXISTS public.seq_sales_order;
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS seq_sales_order START WITH 1 INCREMENT BY 1;

-- ----------------------------------------------------------------------------
-- 3. SALES_ORDERS TABLE (canonical customer commercial commitment)
--    ADR-034: child of Engagement (commercial_work_orders), 1:N (NOT unique).
--    ADR-035: PK = DB-generated UUID (never client); so_number DB-authoritative.
--    Quote: optional (direct SO valid); Quote generic IS NOT mandatory.
--    Rollback: DROP TABLE IF EXISTS public.sales_orders;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.md_tenants(id),
  engagement_id         UUID NOT NULL REFERENCES public.commercial_work_orders(id)
                          ON DELETE RESTRICT,
  quote_id              UUID REFERENCES public.crm_quotations(id)
                          ON DELETE SET NULL,
  so_number             TEXT NOT NULL,
  status                com_sales_order_status NOT NULL DEFAULT 'DRAFT',
  idempotency_key       UUID,
  order_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  target_fulfillment_date DATE,
  currency              TEXT NOT NULL DEFAULT 'IDR',
  total_agreed_revenue  NUMERIC(18,2) NOT NULL DEFAULT 0
                          CONSTRAINT sales_order_revenue_nonneg CHECK (total_agreed_revenue >= 0),
  payment_terms_days    INTEGER NOT NULL DEFAULT 30
                          CONSTRAINT sales_order_payment_terms_nonneg CHECK (payment_terms_days >= 0),
  incoterm              TEXT,
  commercial_notes      TEXT,
  version_no            INTEGER NOT NULL DEFAULT 1
                          CONSTRAINT sales_order_version_positive CHECK (version_no >= 1),
  confirmed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancelled_reason      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES auth.users(id),
  updated_by            UUID REFERENCES auth.users(id),
  CONSTRAINT uq_sales_order_number      UNIQUE (tenant_id, so_number),
  CONSTRAINT uq_sales_order_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant     ON public.sales_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_engagement ON public.sales_orders(engagement_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_quote       ON public.sales_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status      ON public.sales_orders(tenant_id, status);

-- ----------------------------------------------------------------------------
-- 4. next_sales_order() ATOMIC NUMBER AUTHORITY (ADR-035; mirrors U-11)
--    Format: SO-YYYY-MM-NNNN
--    Concurrency: nextval() is atomic & session-safe. UNIQUE(tenant_id,
--    so_number) is the safety net. No SELECT MAX + increment.
--    SECURITY DEFINER so it can read the sequence; p_tenant_id is carried for
--    tenant-scoped call semantics (uniqueness per tenant enforced by table).
--    Rollback: DROP FUNCTION IF EXISTS public.next_sales_order(UUID);
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.next_sales_order(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_so_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq := nextval('seq_sales_order');
  v_so_number := 'SO-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_so_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_sales_order(UUID) TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.seq_sales_order TO authenticated;

COMMENT ON FUNCTION public.next_sales_order(UUID) IS
  'U-13/ADR-035: Atomic server-side Sales Order number generator. Format: SO-YYYY-MM-NNNN. Client MUST NOT generate canonical SO numbers.';
COMMENT ON CONSTRAINT uq_sales_order_number ON public.sales_orders IS
  'U-13/ADR-035: Prevents duplicate SO numbers per tenant. Enforced at database level.';

-- ----------------------------------------------------------------------------
-- 5. ADR-038: MINIMUM OPERATIONAL REFERENCE — Shipment -> Sales Order (1..N)
--    ONE SO -> MANY Shipments. Additive nullable FK. ON DELETE SET NULL so a
--    cancelled/removed SO does not cascade-destroy the operational shipment.
--    This is the single protected-operational mutation authorized in U-13.
--    Rollback: ALTER TABLE public.shp_shipments DROP COLUMN IF EXISTS sales_order_id;
-- ----------------------------------------------------------------------------
ALTER TABLE public.shp_shipments
  ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shp_shipments_sales_order ON public.shp_shipments(sales_order_id);

-- ----------------------------------------------------------------------------
-- 6. GRANTS + RLS for sales_orders (tenant isolation)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_orders TO authenticated;

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_orders_isolation ON public.sales_orders;
CREATE POLICY sales_orders_isolation ON public.sales_orders
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

COMMIT;
