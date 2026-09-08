-- ==========================================
-- Migration 052: Phase 5A-1 Consolidation Number Canonical Authority
-- Date: 2026-09-05
-- Purpose: Align forwarding consol_number with canonical number authority pattern
--   - Create next_consol_number() atomic server-side generator
--   - Harden trigger with SECURITY DEFINER + SET search_path
--   - Add sequence grants for authenticated access
-- ==========================================

-- ==========================================
-- 1. Canonical consol_number authority (mirrors U-11/035/041)
-- ==========================================
-- Format: FWD-YYYYMM-NNN (3 digits per PRD 190726.md)
-- Atomic nextval() sequence; UNIQUE(tenant_id, consol_number) safety net.
-- SECURITY DEFINER so it can read the sequence; p_tenant_id carried for
-- tenant-scoped call semantics (uniqueness per tenant enforced by table).
-- Rollback: DROP FUNCTION IF EXISTS public.next_consol_number(UUID);

CREATE OR REPLACE FUNCTION public.next_consol_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_consol_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq := nextval('public.fw_consolidation_seq');
  v_consol_number := 'FWD-' || v_year || v_month || '-' || lpad(v_seq::text, 3, '0');
  RETURN v_consol_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_consol_number(UUID) TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.fw_consolidation_seq TO authenticated;

COMMENT ON FUNCTION public.next_consol_number(UUID) IS
  'Phase 5A-1: Atomic server-side Consolidation number generator. Format: FWD-YYYYMM-NNN. Client MUST NOT generate canonical consol numbers.';

-- ==========================================
-- 2. Harden trigger to use canonical authority
-- ==========================================
-- Drop old trigger/function and recreate with SECURITY DEFINER.
-- Rollback: DROP TRIGGER IF EXISTS trg_generate_fw_consol_number ON public.fw_consolidations;
--          DROP FUNCTION IF EXISTS public.generate_fw_consol_number();

DROP TRIGGER IF EXISTS trg_generate_fw_consol_number ON public.fw_consolidations;
DROP FUNCTION IF EXISTS public.generate_fw_consol_number();

CREATE OR REPLACE FUNCTION public.generate_fw_consol_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.consol_number IS NULL OR NEW.consol_number = '' THEN
    NEW.consol_number := public.next_consol_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_generate_fw_consol_number
  BEFORE INSERT ON public.fw_consolidations
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_fw_consol_number();

COMMENT ON FUNCTION public.generate_fw_consol_number() IS
  'Phase 5A-1: Auto-generate consol_number via next_consol_number() when not provided.';

-- ==========================================
-- 3. Verification
-- ==========================================
SELECT 'phase5a1_consol_number_canonical_authority' AS migration_name;
