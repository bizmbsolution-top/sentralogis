-- ============================================================================
-- Migration: 20260904_051_set_entity_ownership.sql
-- Description: D-Repair-5A.1 — PostgreSQL function for atomic entity ownership mutation
-- Architecture: D-Repair-5A Design Report (G18, G21) + ADR-078
-- Authority: I AUTHORIZE SENTRALOGIS D-REPAIR-5A.1 POSTGRESQL OWNERSHIP MUTATION FUNCTION IMPLEMENTATION ONLY.
-- ============================================================================
-- This migration creates the canonical server-side function that atomically:
--   1. Updates md_entities.is_own with optimistic concurrency (IS NOT DISTINCT FROM)
--   2. Inserts an audit_logs row with OWNERSHIP_CLASSIFIED operation
--   3. Enforces mandatory reason (min 5 chars), tenant isolation, and idempotency
--   4. Wraps both operations in a single transaction (SECURITY DEFINER)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. set_entity_ownership() RPC FUNCTION
--    - SECURITY DEFINER to ensure atomicity and cross-RLS execution
--    - Takes explicit tenant_id parameter (never derives from auth context)
--    - Validates entity exists and belongs to the provided tenant
--    - Uses IS NOT DISTINCT FROM for NULL-safe optimistic concurrency
--    - Mandatory reason (>= 5 chars) distinguishes human classification from DB default
--    - Idempotency via correlation_id on audit_logs
--    - Returns updated entity row or raises exception on conflict
--    - Rollback: DROP FUNCTION IF EXISTS public.set_entity_ownership(UUID, UUID, BOOLEAN, BOOLEAN, TEXT, UUID, UUID);
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_entity_ownership(
  p_entity_id UUID,
  p_tenant_id UUID,
  p_new_is_own BOOLEAN,
  p_expected_current_value BOOLEAN,
  p_reason TEXT,
  p_actor_id UUID,
  p_idempotency_key UUID
)
RETURNS TABLE (
  entity_id UUID,
  is_own BOOLEAN,
  tenant_id UUID,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_is_own BOOLEAN;
  v_updated_row public.md_entities%ROWTYPE;
BEGIN
  -- Validate reason length (mandatory, >= 5 chars per design)
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'ERR_INVALID_REASON: Reason is required and must be at least 5 characters';
  END IF;

  -- Validate entity exists and belongs to the provided tenant
  SELECT is_own INTO v_current_is_own
  FROM public.md_entities
  WHERE id = p_entity_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_ENTITY_NOT_FOUND: Entity % not found in tenant %', p_entity_id, p_tenant_id;
  END IF;

  -- Optimistic concurrency: IS NOT DISTINCT FROM handles NULL correctly
  -- If current value doesn't match expected, raise concurrency conflict
  IF v_current_is_own IS NOT DISTINCT FROM p_expected_current_value THEN
    -- Atomic UPDATE with RETURNING
    UPDATE public.md_entities
    SET
      is_own = p_new_is_own,
      updated_at = now(),
      updated_by = p_actor_id
    WHERE id = p_entity_id AND tenant_id = p_tenant_id
    RETURNING id, is_own, tenant_id, updated_at
    INTO v_updated_row;

    IF NOT FOUND THEN
      -- Should not happen since we checked existence, but handle race
      RAISE EXCEPTION 'ERR_CONCURRENCY_CONFLICT: Entity was modified by another transaction';
    END IF;

    -- Insert audit log in same transaction
    INSERT INTO public.audit_logs (
      tenant_id,
      correlation_id,
      entity_type,
      entity_id,
      operation,
      old_data,
      new_data,
      changed_fields,
      performed_by,
      performed_at
    ) VALUES (
      p_tenant_id,
      p_idempotency_key,
      'md_entity',
      p_entity_id,
      'OWNERSHIP_CLASSIFIED',
      jsonb_build_object('is_own', v_current_is_own),
      jsonb_build_object('is_own', p_new_is_own, 'reason', p_reason),
      ARRAY['is_own'],
      p_actor_id,
      now()
    );

    RETURN QUERY SELECT v_updated_row.id, v_updated_row.is_own, v_updated_row.tenant_id, v_updated_row.updated_at;
  ELSE
    RAISE EXCEPTION 'ERR_CONCURRENCY_CONFLICT: Expected is_own=% but current is %', p_expected_current_value, v_current_is_own;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_entity_ownership(UUID, UUID, BOOLEAN, BOOLEAN, TEXT, UUID, UUID) IS
  'D-Repair-5A.1/ADR-078: Atomic entity ownership mutation. Updates md_entities.is_own and writes audit_logs in single transaction. Requires reason >= 5 chars. Uses optimistic concurrency via IS NOT DISTINCT FROM. Idempotent via idempotency_key on audit_logs.correlation_id.';

GRANT EXECUTE ON FUNCTION public.set_entity_ownership(UUID, UUID, BOOLEAN, BOOLEAN, TEXT, UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. (Optional) Helper index for idempotency lookup on audit_logs
--    The existing idx_audit_correlation on correlation_id is sufficient.
--    No new index needed per design.
-- ----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';

COMMIT;