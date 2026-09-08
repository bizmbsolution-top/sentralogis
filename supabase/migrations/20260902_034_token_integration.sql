BEGIN;

-- ============================================================================
-- TOKEN-4: Service Completion Consumption Integration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CUSTOMS COMPLETION: cus_declarations.status → RELEASED or COMPLETED
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_tokens_on_customs_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_value INTEGER;
  v_idempotency_key TEXT;
  v_existing UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('RELEASED', 'COMPLETED')
  THEN
    v_idempotency_key := 'CUS_DECLARATION:' || NEW.id || ':CUSTOMS';

    SELECT id INTO v_existing
    FROM public.token_consumption_events
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_existing IS NULL THEN
      SELECT COALESCE(
        (SELECT price_per_token FROM public.tenant_token_prices
         WHERE tenant_id = NEW.tenant_id AND is_active = true
           AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
         ORDER BY effective_from DESC LIMIT 1),
        (SELECT price_per_token FROM public.token_prices ORDER BY effective_from DESC LIMIT 1),
        1000
      ) INTO v_token_value;

      INSERT INTO public.token_consumption_events (
        tenant_id, source_type, source_id, service_type,
        tokens_consumed, token_value_snapshot, monetary_equivalent,
        rule_version, idempotency_key, consumed_at
      ) VALUES (
        NEW.tenant_id, 'CUS_DECLARATION', NEW.id, 'CUSTOMS',
        1, v_token_value, 1 * v_token_value,
        1, v_idempotency_key, NOW()
      );

      UPDATE public.tenants
      SET token_balance = GREATEST(COALESCE(token_balance, 0) - 1, 0),
          updated_at = NOW()
      WHERE id = NEW.tenant_id;

      INSERT INTO public.token_transactions (
        tenant_id, tenant_code, amount, transaction_type, description, created_at
      ) VALUES (
        NEW.tenant_id, NEW.tenant_code, 1, 'CONSUME',
        'CUSTOMS - Declaration ' || COALESCE(NEW.declaration_number, NEW.id::text),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_consume_tokens_on_customs_complete
  AFTER UPDATE OF status ON public.cus_declarations
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_tokens_on_customs_complete();

GRANT EXECUTE ON FUNCTION public.consume_tokens_on_customs_complete() TO service_role;

-- ----------------------------------------------------------------------------
-- 2. WMS INBOUND: wh_receipt_orders.status → COMPLETED
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_tokens_on_wms_inbound_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_value INTEGER;
  v_idempotency_key TEXT;
  v_existing UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'COMPLETED'
  THEN
    v_idempotency_key := 'WH_INBOUND:' || NEW.id || ':WMS_INBOUND';

    SELECT id INTO v_existing
    FROM public.token_consumption_events
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_existing IS NULL THEN
      SELECT COALESCE(
        (SELECT price_per_token FROM public.tenant_token_prices
         WHERE tenant_id = NEW.tenant_id AND is_active = true
           AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
         ORDER BY effective_from DESC LIMIT 1),
        (SELECT price_per_token FROM public.token_prices ORDER BY effective_from DESC LIMIT 1),
        1000
      ) INTO v_token_value;

      INSERT INTO public.token_consumption_events (
        tenant_id, source_type, source_id, service_type,
        tokens_consumed, token_value_snapshot, monetary_equivalent,
        rule_version, idempotency_key, consumed_at
      ) VALUES (
        NEW.tenant_id, 'WH_INBOUND', NEW.id, 'WMS_INBOUND',
        1, v_token_value, 1 * v_token_value,
        1, v_idempotency_key, NOW()
      );

      UPDATE public.tenants
      SET token_balance = GREATEST(COALESCE(token_balance, 0) - 1, 0),
          updated_at = NOW()
      WHERE id = NEW.tenant_id;

      INSERT INTO public.token_transactions (
        tenant_id, tenant_code, amount, transaction_type, description, created_at
      ) VALUES (
        NEW.tenant_id, NEW.tenant_code, 1, 'CONSUME',
        'WMS Inbound - Receipt ' || COALESCE(NEW.receipt_number, NEW.id::text),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_consume_tokens_on_wms_inbound_complete
  AFTER UPDATE OF status ON public.wh_receipt_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_tokens_on_wms_inbound_complete();

GRANT EXECUTE ON FUNCTION public.consume_tokens_on_wms_inbound_complete() TO service_role;

-- ----------------------------------------------------------------------------
-- 3. WMS OUTBOUND: wh_shipments.status → COMPLETED
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_tokens_on_wms_outbound_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_value INTEGER;
  v_idempotency_key TEXT;
  v_existing UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'COMPLETED'
  THEN
    v_idempotency_key := 'WH_OUTBOUND:' || NEW.id || ':WMS_OUTBOUND';

    SELECT id INTO v_existing
    FROM public.token_consumption_events
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_existing IS NULL THEN
      SELECT COALESCE(
        (SELECT price_per_token FROM public.tenant_token_prices
         WHERE tenant_id = NEW.tenant_id AND is_active = true
           AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
         ORDER BY effective_from DESC LIMIT 1),
        (SELECT price_per_token FROM public.token_prices ORDER BY effective_from DESC LIMIT 1),
        1000
      ) INTO v_token_value;

      INSERT INTO public.token_consumption_events (
        tenant_id, source_type, source_id, service_type,
        tokens_consumed, token_value_snapshot, monetary_equivalent,
        rule_version, idempotency_key, consumed_at
      ) VALUES (
        NEW.tenant_id, 'WH_OUTBOUND', NEW.id, 'WMS_OUTBOUND',
        1, v_token_value, 1 * v_token_value,
        1, v_idempotency_key, NOW()
      );

      UPDATE public.tenants
      SET token_balance = GREATEST(COALESCE(token_balance, 0) - 1, 0),
          updated_at = NOW()
      WHERE id = NEW.tenant_id;

      INSERT INTO public.token_transactions (
        tenant_id, tenant_code, amount, transaction_type, description, created_at
      ) VALUES (
        NEW.tenant_id, NEW.tenant_code, 1, 'CONSUME',
        'WMS Outbound - Shipment ' || COALESCE(NEW.shipment_number, NEW.id::text),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_consume_tokens_on_wms_outbound_complete
  AFTER UPDATE OF status ON public.wh_shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_tokens_on_wms_outbound_complete();

GRANT EXECUTE ON FUNCTION public.consume_tokens_on_wms_outbound_complete() TO service_role;

-- ----------------------------------------------------------------------------
-- 4. WMS TRANSFER: wh_transfers.status → COMPLETED
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_tokens_on_wms_transfer_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_value INTEGER;
  v_idempotency_key TEXT;
  v_existing UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'COMPLETED'
  THEN
    v_idempotency_key := 'WH_TRANSFER:' || NEW.id || ':WMS_TRANSFER';

    SELECT id INTO v_existing
    FROM public.token_consumption_events
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_existing IS NULL THEN
      SELECT COALESCE(
        (SELECT price_per_token FROM public.tenant_token_prices
         WHERE tenant_id = NEW.tenant_id AND is_active = true
           AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
         ORDER BY effective_from DESC LIMIT 1),
        (SELECT price_per_token FROM public.token_prices ORDER BY effective_from DESC LIMIT 1),
        1000
      ) INTO v_token_value;

      INSERT INTO public.token_consumption_events (
        tenant_id, source_type, source_id, service_type,
        tokens_consumed, token_value_snapshot, monetary_equivalent,
        rule_version, idempotency_key, consumed_at
      ) VALUES (
        NEW.tenant_id, 'WH_TRANSFER', NEW.id, 'WMS_TRANSFER',
        1, v_token_value, 1 * v_token_value,
        1, v_idempotency_key, NOW()
      );

      UPDATE public.tenants
      SET token_balance = GREATEST(COALESCE(token_balance, 0) - 1, 0),
          updated_at = NOW()
      WHERE id = NEW.tenant_id;

      INSERT INTO public.token_transactions (
        tenant_id, tenant_code, amount, transaction_type, description, created_at
      ) VALUES (
        NEW.tenant_id, NEW.tenant_code, 1, 'CONSUME',
        'WMS Transfer - Transfer ' || COALESCE(NEW.transfer_number, NEW.id::text),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_consume_tokens_on_wms_transfer_complete
  AFTER UPDATE OF status ON public.wh_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_tokens_on_wms_transfer_complete();

GRANT EXECUTE ON FUNCTION public.consume_tokens_on_wms_transfer_complete() TO service_role;

-- ----------------------------------------------------------------------------
-- 5. FORWARDING BASE: shp_shipments.global_status → COMPLETED
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_tokens_on_forwarding_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_value INTEGER;
  v_idempotency_key TEXT;
  v_existing UUID;
BEGIN
  IF OLD.global_status IS DISTINCT FROM NEW.global_status
     AND NEW.global_status = 'COMPLETED'
  THEN
    v_idempotency_key := 'SHP:' || NEW.id || ':FORWARDING';

    SELECT id INTO v_existing
    FROM public.token_consumption_events
    WHERE idempotency_key = v_idempotency_key
    LIMIT 1;

    IF v_existing IS NULL THEN
      SELECT COALESCE(
        (SELECT price_per_token FROM public.tenant_token_prices
         WHERE tenant_id = NEW.tenant_id AND is_active = true
           AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
         ORDER BY effective_from DESC LIMIT 1),
        (SELECT price_per_token FROM public.token_prices ORDER BY effective_from DESC LIMIT 1),
        1000
      ) INTO v_token_value;

      INSERT INTO public.token_consumption_events (
        tenant_id, source_type, source_id, service_type,
        tokens_consumed, token_value_snapshot, monetary_equivalent,
        rule_version, idempotency_key, consumed_at
      ) VALUES (
        NEW.tenant_id, 'SHP', NEW.id, 'FORWARDING',
        1, v_token_value, 1 * v_token_value,
        1, v_idempotency_key, NOW()
      );

      UPDATE public.tenants
      SET token_balance = GREATEST(COALESCE(token_balance, 0) - 1, 0),
          updated_at = NOW()
      WHERE id = NEW.tenant_id;

      INSERT INTO public.token_transactions (
        tenant_id, tenant_code, amount, transaction_type, description, created_at
      ) VALUES (
        NEW.tenant_id, NEW.tenant_code, 1, 'CONSUME',
        'Forwarding - Shipment ' || COALESCE(NEW.shipment_number, NEW.id::text),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_consume_tokens_on_forwarding_complete
  AFTER UPDATE OF global_status ON public.shp_shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_tokens_on_forwarding_complete();

GRANT EXECUTE ON FUNCTION public.consume_tokens_on_forwarding_complete() TO service_role;

SELECT '20260902_034_token_integration OK' AS result;
