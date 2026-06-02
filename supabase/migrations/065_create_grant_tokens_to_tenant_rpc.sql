-- Migration 065: Create grant_tokens_to_tenant RPC
-- This function is called by GrantTokenModal when owner manually grants tokens.
-- Unlike manual_topup_tokens which takes amount in Rupiah*1000,
-- this function takes the direct token amount.

DROP FUNCTION IF EXISTS public.grant_tokens_to_tenant(text, numeric);

CREATE OR REPLACE FUNCTION public.grant_tokens_to_tenant(
  p_tenant_code TEXT,
  p_token_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
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

  -- 2. Validate token amount
  IF p_token_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Token amount must be greater than 0'
    );
  END IF;

  v_new_balance := COALESCE(v_current_balance, 0) + p_token_amount;

  -- 3. Insert into token_transactions ledger
  INSERT INTO public.token_transactions (
    tenant_id, tenant_code, amount, transaction_type, description, created_at
  ) VALUES (
    v_tenant_id, p_tenant_code, p_token_amount, 'GRANT',
    'Manual grant by owner', NOW()
  );

  -- 4. Update tenants.token_balance
  UPDATE public.tenants
  SET token_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', p_token_amount || ' tokens granted to ' || p_tenant_code,
    'tokens_added', p_token_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.grant_tokens_to_tenant(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_tokens_to_tenant(text, integer) TO service_role;

SELECT '065_create_grant_tokens_to_tenant_rpc OK' AS result;
