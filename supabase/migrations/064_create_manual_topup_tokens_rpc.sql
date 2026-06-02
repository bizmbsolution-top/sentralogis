-- Migration 064: Create manual_topup_tokens RPC
-- This function is called by injectTokensAction() and grantTokenToTenant()
-- when owner approves a topup or manually grants tokens.

-- Drop existing function if it exists (idempotent)
DROP FUNCTION IF EXISTS public.manual_topup_tokens(text, numeric, text);

CREATE OR REPLACE FUNCTION public.manual_topup_tokens(
  p_tenant_code TEXT,
  p_amount_received NUMERIC,
  p_note TEXT DEFAULT 'Manual injection by owner'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_token_amount INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 1. Find tenant by code
  SELECT id, token_balance INTO v_tenant_id, v_current_balance
  FROM public.tenants
  WHERE tenant_code = p_tenant_code;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Tenant not found: ' || p_tenant_code
    );
  END IF;

  -- 2. Convert amount_received to tokens (divide by 1000)
  -- p_amount_received is in Rupiah * 1000 (e.g., 50000 for 50 tokens)
  v_token_amount := GREATEST(FLOOR(p_amount_received / 1000), 1);
  v_new_balance := COALESCE(v_current_balance, 0) + v_token_amount;

  -- 3. Insert into token_transactions ledger
  INSERT INTO public.token_transactions (
    tenant_id, tenant_code, amount, transaction_type, description, created_at
  ) VALUES (
    v_tenant_id, p_tenant_code, v_token_amount, 'TOPUP',
    COALESCE(p_note, 'Manual injection'), NOW()
  );

  -- 4. Update tenants.token_balance
  UPDATE public.tenants
  SET token_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', v_token_amount || ' tokens added to ' || p_tenant_code,
    'tokens_added', v_token_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.manual_topup_tokens(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_topup_tokens(text, numeric, text) TO service_role;

SELECT '064_create_manual_topup_tokens_rpc OK' AS result;
