-- ==========================================
-- Migration 053: Phase 5A Wave 2 - Forwarding WO Number Authority
-- Date: 2026-09-05
-- Purpose: Harden forwarding work order number generation
--   - Create next_forwarding_wo_number() atomic server-side generator
--   - Add seq_forwarding_wo sequence
--   - Grant sequence access to authenticated
-- ==========================================

-- ==========================================
-- 1. Forwarding WO number authority
-- ==========================================
-- Format: {TENANT_CODE}-{CUSTOMER_CODE}-FWD-{MMYY}-{NNN}
-- Atomic nextval() sequence; UNIQUE(tenant_id, wo_number) safety net.
-- SECURITY DEFINER so it can read the sequence; tenant/customer codes
-- are passed as parameters (already cleaned by application layer).
-- Rollback: DROP FUNCTION IF EXISTS public.next_forwarding_wo_number(UUID, TEXT, TEXT);

CREATE SEQUENCE IF NOT EXISTS public.seq_forwarding_wo START 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.next_forwarding_wo_number(
  p_tenant_id UUID,
  p_tenant_code TEXT,
  p_customer_code TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_wo_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq := nextval('public.seq_forwarding_wo');
  v_wo_number := p_tenant_code || '-' || p_customer_code || '-FWD-' || v_month || v_year || '-' || lpad(v_seq::text, 3, '0');
  RETURN v_wo_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_forwarding_wo_number(UUID, TEXT, TEXT) TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.seq_forwarding_wo TO authenticated;

COMMENT ON FUNCTION public.next_forwarding_wo_number(UUID, TEXT, TEXT) IS
  'Phase 5A Wave 2: Atomic server-side Forwarding WO number generator. Format: {TENANT}-{CUSTOMER}-FWD-{MMYY}-{NNN}. Client MUST NOT generate canonical forwarding WO numbers.';

COMMENT ON SEQUENCE public.seq_forwarding_wo IS
  'Phase 5A Wave 2: Atomic sequence for Forwarding WO number generation.';

-- ==========================================
-- 2. Verification
-- ==========================================
SELECT 'phase5a2_forwarding_wo_number_authority' AS migration_name;
