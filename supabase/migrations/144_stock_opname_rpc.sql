-- Migration 144: Stock Opname RPC

-- 1. Create Stock Opname
CREATE OR REPLACE FUNCTION create_stock_opname(
    p_tenant_id UUID,
    p_warehouse_id UUID,
    p_opname_type TEXT,
    p_schedule_date DATE,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_location_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_opname_id UUID;
    v_opname_number TEXT;
BEGIN
    -- Generate Number: SO-YYMMDD-NNN
    v_opname_number := 'SO-' || to_char(NOW(), 'YYMMDD') || '-' || LPAD(CAST(CAST(random() * 1000 AS INT) AS TEXT), 3, '0');

    -- Create Header
    INSERT INTO wh_stock_opname (
        tenant_id, warehouse_id, opname_number, status, opname_type, schedule_date, notes, created_by
    ) VALUES (
        p_tenant_id, p_warehouse_id, v_opname_number, 'DRAFT', p_opname_type, p_schedule_date, p_notes, p_user_id
    ) RETURNING id INTO v_opname_id;

    -- Snapshot Inventory
    IF p_location_id IS NOT NULL THEN
        -- Only specific location
        INSERT INTO wh_stock_opname_items (
            opname_id, tenant_id, product_sku_id, location_id, system_qty, batch_number
        )
        SELECT 
            v_opname_id, p_tenant_id, product_sku_id, location_id, quantity, batch_number
        FROM wh_inventory
        WHERE tenant_id = p_tenant_id 
          AND warehouse_id = p_warehouse_id 
          AND location_id = p_location_id
          AND status = 'AVAILABLE';
    ELSE
        -- All locations in warehouse
        INSERT INTO wh_stock_opname_items (
            opname_id, tenant_id, product_sku_id, location_id, system_qty, batch_number
        )
        SELECT 
            v_opname_id, p_tenant_id, product_sku_id, location_id, quantity, batch_number
        FROM wh_inventory
        WHERE tenant_id = p_tenant_id 
          AND warehouse_id = p_warehouse_id
          AND status = 'AVAILABLE';
    END IF;

    RETURN v_opname_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Finalize Stock Opname
CREATE OR REPLACE FUNCTION finalize_stock_opname(p_opname_id UUID, p_user_id UUID) RETURNS VOID AS $$
DECLARE
    v_opname RECORD;
    v_item RECORD;
    v_inventory_id UUID;
    v_movement_type TEXT;
    v_adjustment_qty NUMERIC;
BEGIN
    -- Fetch Opname
    SELECT * INTO v_opname FROM wh_stock_opname
    WHERE id = p_opname_id AND status = 'REVIEW'
    FOR UPDATE;

    IF v_opname IS NULL THEN
        RAISE EXCEPTION 'Opname not found or not in REVIEW status';
    END IF;

    -- Loop through items with variance
    FOR v_item IN 
        SELECT * FROM wh_stock_opname_items
        WHERE opname_id = p_opname_id AND variance != 0
    LOOP
        v_adjustment_qty := ABS(v_item.variance);

        IF v_item.variance > 0 THEN
            v_movement_type := 'ADJUSTMENT_PLUS';
        ELSE
            v_movement_type := 'ADJUSTMENT_MINUS';
        END IF;

        -- Find the inventory record
        SELECT id INTO v_inventory_id FROM wh_inventory
        WHERE tenant_id = v_opname.tenant_id
          AND warehouse_id = v_opname.warehouse_id
          AND product_sku_id = v_item.product_sku_id
          AND location_id = v_item.location_id
          AND COALESCE(batch_number, '') = COALESCE(v_item.batch_number, '')
          AND status = 'AVAILABLE'
        LIMIT 1 FOR UPDATE;

        IF v_inventory_id IS NOT NULL THEN
            UPDATE wh_inventory
            SET quantity = quantity + v_item.variance, updated_at = NOW()
            WHERE id = v_inventory_id;
        ELSE
            -- Should only happen for ADJUSTMENT_PLUS if the item wasn't originally there
            IF v_item.variance > 0 THEN
                INSERT INTO wh_inventory (
                    tenant_id, warehouse_id, location_id, product_sku_id, quantity,
                    batch_number, received_date, status
                ) VALUES (
                    v_opname.tenant_id, v_opname.warehouse_id, v_item.location_id, v_item.product_sku_id, v_adjustment_qty,
                    v_item.batch_number, CURRENT_DATE, 'AVAILABLE'
                ) RETURNING id INTO v_inventory_id;
            ELSE
                RAISE EXCEPTION 'Cannot subtract from non-existent inventory for SKU %', v_item.product_sku_id;
            END IF;
        END IF;

        -- Log movement
        INSERT INTO wh_inventory_movements (
            tenant_id, inventory_id, movement_type, 
            from_location_id, to_location_id,
            quantity, reference_type, reference_id, notes, created_by
        ) VALUES (
            v_opname.tenant_id, v_inventory_id, v_movement_type, 
            CASE WHEN v_movement_type = 'ADJUSTMENT_MINUS' THEN v_item.location_id ELSE NULL END,
            CASE WHEN v_movement_type = 'ADJUSTMENT_PLUS' THEN v_item.location_id ELSE NULL END,
            v_adjustment_qty, 'STOCK_OPNAME', v_opname.opname_number, 
            'Variance adjustment from opname ' || v_opname.opname_number, p_user_id
        );
    END LOOP;

    -- Update Opname Status
    UPDATE wh_stock_opname 
    SET status = 'APPROVED', 
        approved_by = p_user_id, 
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_opname_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
