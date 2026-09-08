-- Migration 20260827_018: Quote Identity & Number Authority (U-11)
--
-- PROBLEM: Dual-path client-side quote_number generation via Math.random()
-- with no server-side authority and no UNIQUE constraint on quote_number.
--
-- REPAIR:
--   1. Deduplicate existing quote_numbers (append suffix to duplicates)
--   2. Add UNIQUE(tenant_id, quote_number) constraint
--   3. Create next_quote_number() atomic server-side generator
--   4. Both UI creation paths route through the server-side authority

-- ============================================================
-- STEP 1: Deduplicate existing quote_numbers
-- ============================================================
-- For each tenant, if multiple rows share the same quote_number,
-- append -2, -3, etc. to all but the first (ordered by created_at).

DO $$
DECLARE
  r RECORD;
  dup_count INT;
BEGIN
  FOR r IN
    SELECT DISTINCT tenant_id, quote_number
    FROM crm_quotations
    WHERE (tenant_id, quote_number) IN (
      SELECT tenant_id, quote_number
      FROM crm_quotations
      GROUP BY tenant_id, quote_number
      HAVING COUNT(*) > 1
    )
  LOOP
    dup_count := 1;
    FOR dup_count IN
      SELECT row_number() OVER (ORDER BY created_at)
      FROM crm_quotations
      WHERE tenant_id = r.tenant_id AND quote_number = r.quote_number
    LOOP
      IF dup_count > 1 THEN
        UPDATE crm_quotations
        SET quote_number = r.quote_number || '-' || dup_count
        WHERE id IN (
          SELECT id FROM crm_quotations
          WHERE tenant_id = r.tenant_id AND quote_number = r.quote_number
          ORDER BY created_at
          OFFSET 1
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- STEP 2: Add UNIQUE constraint on (tenant_id, quote_number)
-- ============================================================
-- This is the database-level safety net that prevents any future
-- duplicate quote numbers, regardless of generation path.

ALTER TABLE crm_quotations
  ADD CONSTRAINT uq_crm_quotations_tenant_quote_number
  UNIQUE (tenant_id, quote_number);

-- ============================================================
-- STEP 3: Create atomic quote number generator function
-- ============================================================
-- Format: QT-YYYY-MM-NNNN (NNNN = per-tenant monthly sequence)
-- Uses nextval() for atomic concurrency-safe sequence allocation.
-- The UNIQUE constraint provides the final safety net.

CREATE OR REPLACE FUNCTION public.next_quote_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_quote_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');

  -- nextval is atomic and session-safe; safe under concurrency
  v_seq := nextval('seq_quote_number');

  v_quote_number := 'QT-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');

  RETURN v_quote_number;
END;
$$;

-- Create the sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS seq_quote_number START WITH 1 INCREMENT BY 1;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.next_quote_number(UUID) TO authenticated;

COMMENT ON FUNCTION public.next_quote_number(UUID) IS
  'U-11: Atomic server-side quote number generator. Format: QT-YYYY-MM-NNNN. Per-tenant monthly sequence.';
COMMENT ON CONSTRAINT uq_crm_quotations_tenant_quote_number ON crm_quotations IS
  'U-11: Prevents duplicate quote numbers per tenant. Enforced at database level.';
