BEGIN;

-- ============================================================================
-- TOKEN-3: Extend existing Master Token trigger with idempotency + snapshot
-- ============================================================================

CREATE OR REPLACE FUNCTION public.deduct_tokens_on_jo_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sbu_type TEXT;
  v_tokens_per_jo INTEGER;
  v_new_balance INTEGER;
  v_tenant_code TEXT;
  v_tenant_name TEXT;
  v_admin_user_id UUID;
  v_admin_whatsapp TEXT;
  v_token_value INTEGER;
  v_idempotency_key TEXT;
  v_existing_consumption UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'PAID', 'completed', 'RECEIVED')
  THEN
    v_sbu_type := NEW.sbu_type;
    IF v_sbu_type IS NULL THEN
      SELECT sbu_type INTO v_sbu_type
      FROM wo_items
      WHERE id = NEW.wo_item_id;
    END IF;
    IF v_sbu_type IS NULL THEN
      v_sbu_type := 'TRUCKING';
    END IF;

    -- Idempotency key
    v_idempotency_key := 'JO:' || NEW.id::TEXT || ':TRUCKING';

    -- Check for existing consumption
    SELECT id INTO v_existing_consumption
    FROM public.token_consumption_events
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_existing_consumption IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Get token rate
    SELECT tokens_per_jo INTO v_tokens_per_jo
    FROM public.sbu_token_rates
    WHERE sbu_type = v_sbu_type;

    IF v_tokens_per_jo IS NULL OR v_tokens_per_jo <= 0 THEN
      v_tokens_per_jo := 1;
    END IF;

    -- Get tenant token value (snapshot)
    SELECT COALESCE(
      (SELECT price_per_token FROM public.tenant_token_prices
       WHERE tenant_id = NEW.tenant_id AND is_active = true
         AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
       ORDER BY effective_from DESC LIMIT 1),
      (SELECT price_per_token FROM public.token_prices ORDER BY effective_from DESC LIMIT 1),
      1000
    ) INTO v_token_value;

    -- Get tenant code
    SELECT tenant_code, name INTO v_tenant_code, v_tenant_name
    FROM public.tenants
    WHERE id = NEW.tenant_id;

    -- Deduct balance
    UPDATE public.tenants
    SET token_balance = GREATEST(COALESCE(token_balance, 0) - v_tokens_per_jo, 0),
        updated_at = NOW()
    WHERE id = NEW.tenant_id
    RETURNING token_balance INTO v_new_balance;

    -- Record immutable consumption event
    INSERT INTO public.token_consumption_events (
      tenant_id, source_type, source_id, service_type,
      tokens_consumed, token_value_snapshot, monetary_equivalent,
      rule_version, idempotency_key, consumed_at
    ) VALUES (
      NEW.tenant_id, 'JO', NEW.id, v_sbu_type,
      v_tokens_per_jo, v_token_value, v_tokens_per_jo * v_token_value,
      1, v_idempotency_key, NOW()
    );

    -- Legacy transaction record
    INSERT INTO public.token_transactions (
      tenant_id, tenant_code, amount, transaction_type, description, created_at
    ) VALUES (
      NEW.tenant_id, v_tenant_code, v_tokens_per_jo, 'CONSUME',
      v_sbu_type || ' - JO ' || COALESCE(NEW.jo_number, NEW.id::text),
      NOW()
    );

    -- Low balance notification
    IF v_new_balance <= 5 THEN
      SELECT tu.user_id INTO v_admin_user_id
      FROM public.tenant_users tu
      WHERE tu.tenant_id = NEW.tenant_id
        AND tu.is_active = true
        AND tu.role_code IN ('tenant_superadmin', 'tenant_admin', 'superadmin', 'admin_wo', 'director')
      ORDER BY CASE WHEN tu.role_code IN ('tenant_superadmin', 'tenant_admin') THEN 0 ELSE 1 END
      LIMIT 1;

      IF v_admin_user_id IS NOT NULL THEN
        IF v_new_balance <= 0 THEN
          INSERT INTO public.notifications (user_id, tenant_id, role, title, message, type, link, created_at)
          VALUES (v_admin_user_id, NEW.tenant_id, 'tenant_admin', 'Token Balance Habis',
            'Saldo token ' || COALESCE(v_tenant_name, v_tenant_code) || ' habis (0 TKN).',
            'token_critical', '/tenant/token', NOW());
        ELSE
          INSERT INTO public.notifications (user_id, tenant_id, role, title, message, type, link, created_at)
          VALUES (v_admin_user_id, NEW.tenant_id, 'tenant_admin', 'Token Hampir Habis',
            'Sisa saldo token ' || COALESCE(v_tenant_name, v_tenant_code) || ': ' || v_new_balance || ' TKN.',
            'token_warning', '/tenant/token', NOW());
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_tokens_on_jo_complete() TO service_role;

SELECT '20260902_032_token_foundation OK' AS result;
