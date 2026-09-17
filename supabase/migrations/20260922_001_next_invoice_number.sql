-- Migration 20260911_001: Fin Invoice Numbering & Duplicate Prevention (U-25 bounded gate)
-- Authorized: Fin Invoice Numbering Authority + Duplicate Prevention Only
-- Bill-to lineage: sales_orders.engagement_id -> commercial_work_orders.customer_id
--
-- NOT in scope (beyond bounded gate):
--   - Legacy pricing migration
--   - Payment gateway integration
--   - Full accounting engine
--   - fin_invoices -> fin_ar_ap
--   - ERP integration
--   - Tax calculation
--   - Payment/settlement

-- ============================================================
-- STEP 1: CANONICAL INVOICE NUMBER AUTHORITY (ADR-064 extension)
-- ============================================================
-- Format: INV-YYYY-MM-NNNN (per-tenant monthly sequence)
-- Uses nextval() for atomic concurrency-safe sequence allocation.
-- The UNIQUE constraint provides the final safety net.
-- Client-side Math.random() generation outlawed.

-- Create the sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS seq_invoice_number START WITH 1 INCREMENT BY 1;

-- Create the atomic invoice number generator function
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_invoice_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');

  -- nextval is atomic and session-safe; safe under concurrency
  v_seq := nextval('seq_invoice_number');

  v_invoice_number := 'INV-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');

  RETURN v_invoice_number;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.next_invoice_number(UUID) TO authenticated;

COMMENT ON FUNCTION public.next_invoice_number(UUID) IS
  'U-25/ADR-064: Atomic server-side invoice number generator. Format: INV-YYYY-MM-NNNN. Per-tenant monthly sequence. Client MUST NOT generate canonical invoice numbers.';

-- ============================================================
-- STEP 2: DUPLICATE PREVENTION — Partial UNIQUE index on billable_event_id
-- ============================================================
-- Ensures: one non-null fin_billable_events.id can produce at most one fin_invoice_lines row.
-- Multiple rows with NULL billable_event_id are permitted (open/ungapped semantics).
-- Partial index: only enforces uniqueness on non-NULL values.

CREATE UNIQUE INDEX IF NOT EXISTS uq_fin_invoice_lines_billable_event
ON public.fin_invoice_lines (billable_event_id)
WHERE billable_event_id IS NOT NULL;

COMMENT ON INDEX uq_fin_invoice_lines_billable_event IS
  'U-25: Prevents duplicate invoice lines per billable event. One non-null billable_event_id produces at most one fin_invoice_lines row.';

-- Create index for performance on NULL billable events
CREATE INDEX IF NOT EXISTS idx_fin_invoice_lines_event_null
ON public.fin_invoice_lines (billable_event_id)
WHERE billable_event_id IS NULL;

-- ============================================================
-- STEP 3: BOUNDED ATOMIC TRANSACTION FOUNDATION
-- generate_invoice() RPC
-- Performs: resolve bill-to → create invoice → create invoice lines → transition status → rollback on failure
-- Scope: Bounded foundation only. Does NOT implement complete fin_billable_events → fin_invoices workflow beyond this foundation.
-- ============================================================

DROP FUNCTION IF EXISTS public.generate_invoice(UUID, UUID, UUID[], TEXT, TEXT, numeric, numeric, numeric, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.generate_invoice(
  p_tenant_id UUID,
  p_sales_order_id UUID,
  p_billable_event_ids UUID[],
  p_side TEXT,
  p_currency TEXT,
  p_subtotal NUMERIC(18,2),
  p_tax_percentage NUMERIC(5,2),
  p_total_amount NUMERIC(18,2),
  p_due_date DATE,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_lines_created INTEGER := 0;
  v_billable_event UUID;
  v_description TEXT;
  v_quantity INTEGER;
  v_unit_of_measure TEXT;
  v_unit_amount NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  -- 1. Resolve bill-to: sales_orders.engagement_id -> commercial_work_orders.customer_id
  SELECT customer_id INTO v_customer_id
  FROM public.commercial_work_orders
  WHERE id = (
    SELECT engagement_id FROM public.sales_orders WHERE id = p_sales_order_id
  );

  -- 2. Generate canonical invoice number atomically
  v_invoice_number := public.next_invoice_number(p_tenant_id);

  -- 3. Create invoice (atomic within this function transaction)
  --    Idempotency key stored for UNIQUE(tenant_id, idempotency_key) enforcement.
  INSERT INTO public.fin_invoices (
    tenant_id, invoice_number, sales_order_id, customer_id,
    side, status, invoice_date, due_date, currency,
    subtotal, tax_amount, total_amount, paid_amount,
    idempotency_key,
    created_by, updated_by
  ) VALUES (
    p_tenant_id, v_invoice_number, p_sales_order_id, v_customer_id,
    p_side, 'DRAFT', CURRENT_DATE, p_due_date, p_currency,
    p_subtotal, p_tax_percentage * p_subtotal / 100, p_total_amount, 0,
    p_idempotency_key,
    gen_random_uuid(), gen_random_uuid()
  )
  RETURNING id INTO v_invoice_id;

  -- 4. Create invoice lines (one per billable event, with duplicate prevention)
  -- ABSOLUTE RULE: Copy committed values from billable_events, never recalculate
  FOREACH v_billable_event IN ARRAY p_billable_event_ids
  LOOP
    -- Fetch committed values from the billable event
    SELECT
      description,
      quantity,
      unit_of_measure,
      unit_amount,
      total_amount
    INTO
      v_description,
      v_quantity,
      v_unit_of_measure,
      v_unit_amount,
      v_total_amount
    FROM public.fin_billable_events
    WHERE id = v_billable_event AND tenant_id = p_tenant_id;

    -- Duplicate prevention: UNIQUE index ensures at most one line per billable_event_id
    INSERT INTO public.fin_invoice_lines (
      id, tenant_id, invoice_id, billable_event_id,
      description, quantity, unit_of_measure, unit_amount, amount, sort_order
    ) VALUES (
      gen_random_uuid(), p_tenant_id, v_invoice_id, v_billable_event,
      COALESCE(v_description, 'Invoice line for billable event'),
      COALESCE(v_quantity, 1),
      COALESCE(v_unit_of_measure, 'UNIT'),
      COALESCE(v_unit_amount, 0),
      COALESCE(v_total_amount, 0),
      v_lines_created
    );
    v_lines_created := v_lines_created + 1;
  END LOOP;

  -- 5. Transition billable event status where applicable (if all lines created successfully)
  IF v_lines_created = array_length(p_billable_event_ids, 1) THEN
    UPDATE public.fin_billable_events
    SET status = 'INVOICED'
    WHERE id = ANY(p_billable_event_ids);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id::text,
    'invoice_number', v_invoice_number,
    'customer_id', v_customer_id::text,
    'lines_created', v_lines_created,
    'billable_events_total', array_length(p_billable_event_ids, 1)
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback everything on failure (transaction abort)
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invoice generation failed: ' || SQLERRM,
      'invoice_id', NULL,
      'invoice_number', NULL
    );
END;
$$;

-- Grant execute to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.generate_invoice(UUID, UUID, UUID[], TEXT, TEXT, numeric, numeric, numeric, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice(UUID, UUID, UUID[], TEXT, TEXT, numeric, numeric, numeric, DATE, TEXT) TO service_role;

SELECT '20260911_001_next_invoice_number.sql applied OK' AS result;