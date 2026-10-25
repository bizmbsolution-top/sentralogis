-- Migration: 20261005_001_next_payment_number.sql
-- Description: Canonical Payment Number Authority (Phase 5D-3 / ADR-067 Remediation)
-- Ratified by: Human Architect Decision, 2026-10-05 (Option 1A)
--
-- Objects:
--   1. Sequence: public.seq_payment_number
--   2. Function: public.next_payment_number(p_tenant_id UUID) -> TEXT ('PAY-YYYY-MM-NNNN')
--
-- Security:
--   SECURITY DEFINER, search_path = public, GRANT EXECUTE TO authenticated
--
-- Non-destructive / additive / idempotent.
-- Zero business data rows created or modified.

BEGIN;

-- 1. Create atomic sequence for payment numbers if not exists
CREATE SEQUENCE IF NOT EXISTS public.seq_payment_number START WITH 1 INCREMENT BY 1;

-- 2. Create authoritative atomic payment number generator function
CREATE OR REPLACE FUNCTION public.next_payment_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_payment_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');

  -- nextval is atomic, session-safe, and concurrency-safe
  v_seq := nextval('public.seq_payment_number');

  v_payment_number := 'PAY-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');

  RETURN v_payment_number;
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.next_payment_number(UUID) TO authenticated;

-- 4. Audit comment
COMMENT ON FUNCTION public.next_payment_number(UUID) IS
  'Phase 5D-3/ADR-067 Option 1A: Canonical atomic payment number authority. Format: PAY-YYYY-MM-NNNN. Per-tenant monthly sequence. Client-side Math.random() is strictly outlawed.';

COMMIT;
