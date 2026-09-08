-- ============================================================================
-- Migration: 20260828_016_capability_binding_transition.sql
-- Description: U-06 Capability Binding Lifecycle — atomic transition function
--
-- WHY A SCHEMA OBJECT IS REQUIRED (mandate §13/§16 proof):
--   Supabase-JS cannot wrap UPDATE + INSERT in one transaction. The existing
--   repository convention emits outbox events sequentially after mutation,
--   which cannot guarantee "binding updated ⟺ event recorded".
--   This SECURITY DEFINER function makes the pair ATOMIC and adds an
--   OPTIMISTIC CONCURRENCY GUARD (previous_status match) so two concurrent
--   transitions can never interleave silently.
--
-- SAFETY:
--   Additive only. No table altered. No RLS weakened (function validates
--   tenant explicitly; direct table RLS untouched).
--   Rollback: DROP FUNCTION public.fn_transition_capability_binding(...);
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_transition_capability_binding(
  p_binding_id      UUID,
  p_tenant_id       UUID,
  p_expected_status TEXT,          -- optimistic concurrency guard
  p_new_status      TEXT,
  p_event_name      TEXT,
  p_actor           UUID,
  p_correlation_id  UUID,
  p_payload         JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_updated RECORD;
  v_expected_event TEXT;
BEGIN
  -- §17 constraint: the event name is NOT caller-trusted. It is derived from
  -- the target status against the canonical family and any mismatched or
  -- unknown name raises — the RPC cannot manufacture unrelated events.
  v_expected_event := CASE p_new_status
    WHEN 'ACTIVE'    THEN 'capability.binding.activated'
    WHEN 'SUSPENDED' THEN 'capability.binding.suspended'
    WHEN 'COMPLETED' THEN 'capability.binding.completed'
    WHEN 'CANCELLED' THEN 'capability.binding.cancelled'
    ELSE NULL
  END;

  IF v_expected_event IS NULL OR p_new_status NOT IN ('ACTIVE','SUSPENDED','COMPLETED','CANCELLED') THEN
    RAISE EXCEPTION 'INVALID_STATUS: %', p_new_status;
  END IF;
  IF p_event_name IS DISTINCT FROM v_expected_event THEN
    RAISE EXCEPTION 'INVALID_EVENT_NAME: % (expected %)', p_event_name, v_expected_event;
  END IF;

  -- Atomic guarded UPDATE: matches id + tenant + expected previous status.
  UPDATE public.commercial_capability_bindings b
     SET status        = p_new_status,
         completed_at  = CASE WHEN p_new_status = 'COMPLETED' THEN NOW() ELSE b.completed_at END,
         deactivated_at = CASE WHEN p_new_status IN ('SUSPENDED', 'CANCELLED') THEN NOW()
                              WHEN p_new_status = 'ACTIVE' THEN NULL
                              ELSE b.deactivated_at END,
         updated_at    = NOW()
     WHERE b.id = p_binding_id
       AND b.tenant_id = p_tenant_id
       AND b.status = p_expected_status
  RETURNING b.id, b.tenant_id, b.work_order_id, b.capability_type, b.status
    INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'NOT_FOUND_OR_STALE');
  END IF;

  -- Outbox event committed in the SAME statement stream (atomic with update).
  INSERT INTO public.event_outbox (
    tenant_id, event_name, event_version, aggregate_type, aggregate_id,
    correlation_id, causation_id, producer_domain, payload
  ) VALUES (
    v_updated.tenant_id,
    p_event_name,
    '1.0.0',
    'CapabilityBinding',
    v_updated.id,
    COALESCE(p_correlation_id, v_updated.work_order_id),
    p_actor,
    'COMMERCIAL',
    -- §15F: caller payload merged FIRST, canonical identity LAST —
    -- the caller can NEVER override tenant/binding/status identity keys.
    p_payload ||
    jsonb_build_object(
      'binding_id', v_updated.id,
      'work_order_id', v_updated.work_order_id,
      'capability_code', v_updated.capability_type,
      'previous_status', p_expected_status,
      'new_status', p_new_status,
      'actor', p_actor
    )
  );

  RETURN jsonb_build_object(
    'outcome', 'TRANSITIONED',
    'binding_id', v_updated.id,
    'previous_status', p_expected_status,
    'new_status', v_updated.status
  );
END;
$fn$;

-- §16: APPLICATION-ONLY ACCESS. No interactive role (PUBLIC/anon/authenticated)
-- may execute this definer function directly — the RPC can never become an
-- authorization bypass around commercial:manage. Only the service role used
-- by the application boundary (post-identity/authz gates) may call it.
REVOKE ALL ON FUNCTION public.fn_transition_capability_binding(
  UUID, UUID, TEXT, TEXT, TEXT, UUID, UUID, JSONB
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_transition_capability_binding(
  UUID, UUID, TEXT, TEXT, TEXT, UUID, UUID, JSONB
) FROM anon;
REVOKE ALL ON FUNCTION public.fn_transition_capability_binding(
  UUID, UUID, TEXT, TEXT, TEXT, UUID, UUID, JSONB
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transition_capability_binding(
  UUID, UUID, TEXT, TEXT, TEXT, UUID, UUID, JSONB
) TO service_role;

COMMIT;
