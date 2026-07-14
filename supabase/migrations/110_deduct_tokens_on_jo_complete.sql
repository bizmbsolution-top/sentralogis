-- Migration 110: Deduct tokens when a Job Order is completed
-- Fires AFTER UPDATE of status on job_orders.
-- Deducts tokens per SBU rate, records CONSUME transaction, notifies tenant if low balance.

-- First, ensure amount in token_transactions can be positive (TOPUP/GRANT) or negative (CONSUME)
-- The column already exists as INTEGER/NUMERIC, so negative values work fine.

CREATE OR REPLACE FUNCTION public.deduct_tokens_on_jo_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sbu_type TEXT;
  v_tokens_per_jo INTEGER;
  v_new_balance INTEGER;
  v_tenant_code TEXT;
  v_tenant_name TEXT;
  v_admin_user_id UUID;
  v_admin_whatsapp TEXT;
BEGIN
  -- Only proceed if status changed to a completed/done state
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'PAID', 'completed', 'RECEIVED')
  THEN

    -- 1. Determine SBU type from JO (fallback: wo_items)
    v_sbu_type := NEW.sbu_type;
    IF v_sbu_type IS NULL THEN
      SELECT sbu_type INTO v_sbu_type
      FROM wo_items
      WHERE id = NEW.wo_item_id;
    END IF;
    IF v_sbu_type IS NULL THEN
      v_sbu_type := 'TRUCKING';
    END IF;

    -- 2. Get token rate for this SBU type
    SELECT tokens_per_jo INTO v_tokens_per_jo
    FROM public.sbu_token_rates
    WHERE sbu_type = v_sbu_type;

    IF v_tokens_per_jo IS NULL OR v_tokens_per_jo <= 0 THEN
      v_tokens_per_jo := 1;
    END IF;

    -- 3. Get tenant code
    SELECT tenant_code, name INTO v_tenant_code, v_tenant_name
    FROM public.tenants
    WHERE id = NEW.tenant_id;

    -- 4. Deduct tokens from tenant balance
    UPDATE public.tenants
    SET token_balance = GREATEST(COALESCE(token_balance, 0) - v_tokens_per_jo, 0),
        updated_at = NOW()
    WHERE id = NEW.tenant_id
    RETURNING token_balance INTO v_new_balance;

    -- 5. Record CONSUME transaction (positive amount = tokens spent)
    INSERT INTO public.token_transactions (
      tenant_id, tenant_code, amount, transaction_type, description, created_at
    ) VALUES (
      NEW.tenant_id, v_tenant_code, v_tokens_per_jo, 'CONSUME',
      v_sbu_type || ' - JO ' || COALESCE(NEW.jo_number, NEW.id::text),
      NOW()
    );

    -- 6. Check low balance and notify tenant admin
    IF v_new_balance <= 5 THEN
      -- Find tenant admin user
      SELECT id INTO v_admin_user_id
      FROM public.profiles
      WHERE tenant_id = NEW.tenant_id
        AND role IN ('tenant_admin', 'tenant_superadmin', 'superadmin', 'owner')
      LIMIT 1;

      IF v_admin_user_id IS NOT NULL THEN
        IF v_new_balance <= 0 THEN
          -- Critical: balance exhausted
          INSERT INTO public.notifications (
            user_id, tenant_id, role, title, message, type, link, created_at
          ) VALUES (
            v_admin_user_id, NEW.tenant_id, 'tenant_admin',
            '⚠️ Token Balance Habis',
            'Saldo token ' || COALESCE(v_tenant_name, v_tenant_code) || ' habis (0 TKN). JO baru tidak dapat berjalan hingga top-up dilakukan.',
            'token_critical', '/tenant/token', NOW()
          );
        ELSE
          -- Warning: balance nearly empty
          INSERT INTO public.notifications (
            user_id, tenant_id, role, title, message, type, link, created_at
          ) VALUES (
            v_admin_user_id, NEW.tenant_id, 'tenant_admin',
            '⚠️ Token Hampir Habis',
            'Sisa saldo token ' || COALESCE(v_tenant_name, v_tenant_code) || ': ' || v_new_balance || ' TKN. Segera lakukan top-up agar JO dapat terus berjalan.',
            'token_warning', '/tenant/token', NOW()
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Register trigger on job_orders AFTER UPDATE of status
CREATE OR REPLACE TRIGGER trg_deduct_tokens_on_jo_complete
AFTER UPDATE OF status ON public.job_orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_tokens_on_jo_complete();

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION public.deduct_tokens_on_jo_complete() TO service_role;

SELECT '110_deduct_tokens_on_jo_complete OK' AS result;
