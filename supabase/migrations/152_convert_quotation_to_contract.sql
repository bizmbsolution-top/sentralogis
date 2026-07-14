-- Migration 152: Convert CRM Quotation to Master Contract & Billing Rates
-- Enables 1-click conversion from won/accepted CRM quotations to active storage contracts and rate cards.

CREATE OR REPLACE FUNCTION public.fn_convert_quotation_to_contract(
    p_quotation_id UUID,
    p_contract_number TEXT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_deal_id UUID;
    v_customer_id UUID;
    v_quote_number TEXT;
    v_contract_id UUID;
    v_contract_number TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_rates_count INT := 0;
    v_inserted_count INT := 0;
BEGIN
    -- 1. Get Quotation info
    SELECT tenant_id, deal_id, quote_number
    INTO v_tenant_id, v_deal_id, v_quote_number
    FROM public.crm_quotations
    WHERE id = p_quotation_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quotation not found');
    END IF;

    -- 2. Get Customer entity ID from Deal
    IF v_deal_id IS NOT NULL THEN
        SELECT entity_id INTO v_customer_id
        FROM public.crm_deals
        WHERE id = v_deal_id;
    END IF;

    IF v_customer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Customer entity not found for this deal/quotation');
    END IF;

    -- 3. Ensure Entity is marked as Customer and Active
    UPDATE public.md_entities
    SET is_customer = true,
        is_active = true
    WHERE id = v_customer_id;

    -- 4. Mark Quotation as ACCEPTED and Deal as WON if not already
    UPDATE public.crm_quotations
    SET status = 'ACCEPTED',
        updated_at = NOW()
    WHERE id = p_quotation_id AND status != 'ACCEPTED';

    IF v_deal_id IS NOT NULL THEN
        UPDATE public.crm_deals
        SET stage = 'WON',
            updated_at = NOW()
        WHERE id = v_deal_id AND stage != 'WON';
    END IF;

    -- 5. Determine Contract Number and Dates
    v_contract_number := COALESCE(NULLIF(TRIM(p_contract_number), ''), 'CTR/' || COALESCE(v_quote_number, TO_CHAR(NOW(), 'YYYYMMDD-HH24MI')));
    v_start_date := COALESCE(p_start_date, CURRENT_DATE);
    v_end_date := COALESCE(p_end_date, CURRENT_DATE + INTERVAL '1 year');

    -- 6. Insert into md_storage_contracts
    INSERT INTO public.md_storage_contracts (
        tenant_id,
        contract_number,
        customer_id,
        start_date,
        end_date,
        committed_space,
        uom_space,
        billing_method,
        status,
        notes,
        created_by
    ) VALUES (
        v_tenant_id,
        v_contract_number,
        v_customer_id,
        v_start_date,
        v_end_date,
        0,
        'PALLET',
        'HYBRID',
        'ACTIVE',
        'Auto-converted from Quotation ID: ' || p_quotation_id || ' (' || COALESCE(v_quote_number, '') || ')',
        auth.uid()
    )
    RETURNING id INTO v_contract_id;

    -- 7. Copy line items from crm_quotation_items to md_billing_rates
    INSERT INTO public.md_billing_rates (
        contract_id,
        tenant_id,
        charge_code,
        rate_value,
        uom,
        valid_from,
        valid_to,
        is_active,
        created_by
    )
    SELECT
        v_contract_id,
        v_tenant_id,
        COALESCE(srv.charge_code, 'VAS'),
        COALESCE(qi.nego_price, qi.unit_price, 0),
        COALESCE(qi.uom, 'PCS'),
        v_start_date,
        v_end_date,
        true,
        auth.uid()
    FROM public.crm_quotation_items qi
    LEFT JOIN public.md_services srv ON qi.service_id = srv.id
    WHERE qi.quotation_id = p_quotation_id
      AND COALESCE(qi.nego_price, qi.unit_price, 0) > 0;

    GET DIAGNOSTICS v_rates_count = ROW_COUNT;

    -- 8. If no rates were inserted from crm_quotation_items, check crm_sbu_customer_rates
    IF v_rates_count = 0 THEN
        INSERT INTO public.md_billing_rates (
            contract_id,
            tenant_id,
            charge_code,
            rate_value,
            uom,
            valid_from,
            valid_to,
            is_active,
            created_by
        )
        SELECT
            v_contract_id,
            v_tenant_id,
            CASE 
                WHEN sbu_type = 'WAREHOUSE' THEN 'STR-FIX'
                WHEN sbu_type = 'TRUCKING' THEN 'TRK-TRIP'
                ELSE 'VAS'
            END,
            unit_price,
            COALESCE(uom, 'Unit'),
            v_start_date,
            v_end_date,
            true,
            auth.uid()
        FROM public.crm_sbu_customer_rates
        WHERE customer_id = v_customer_id
          AND tenant_id = v_tenant_id
          AND is_active = true
          AND unit_price > 0;

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
        v_rates_count := v_rates_count + v_inserted_count;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number,
        'rates_count', v_rates_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_convert_quotation_to_contract(UUID, TEXT, DATE, DATE) TO authenticated;
