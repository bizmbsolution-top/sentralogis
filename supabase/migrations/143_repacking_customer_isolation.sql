-- Migration 143: Add Customer Isolation to Repacking Module

-- 1. Add customer_id to repacking orders
ALTER TABLE wh_repacking_orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wh_repacking_orders_customer ON wh_repacking_orders(customer_id);

-- 2. Update execute_repacking_order to handle customer_id
CREATE OR REPLACE FUNCTION execute_repacking_order(p_order_id UUID, p_user_id UUID) RETURNS UUID AS $$
DECLARE
    v_order RECORD;
    v_src_item RECORD;
    v_res_item RECORD;
    v_source_inv RECORD;
    v_dest_inv_id UUID;
    v_qty_remaining NUMERIC;
    v_deduct NUMERIC;
    v_jo_number TEXT;
    v_wo_item_id UUID;
BEGIN
    -- 1. Lock & fetch the order
    SELECT * INTO v_order FROM wh_repacking_orders
    WHERE id = p_order_id AND status IN ('CREATED', 'IN_PROGRESS')
    FOR UPDATE;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found or already completed/cancelled';
    END IF;

    IF v_order.customer_id IS NULL THEN
        RAISE EXCEPTION 'Order must have a customer_id assigned';
    END IF;

    -- Update status to IN_PROGRESS
    UPDATE wh_repacking_orders SET status = 'IN_PROGRESS' WHERE id = p_order_id;

    -- 2. Consume SOURCE items
    FOR v_src_item IN 
        SELECT * FROM wh_repacking_items 
        WHERE repacking_order_id = p_order_id AND item_type = 'SOURCE'
    LOOP
        v_qty_remaining := v_src_item.quantity;

        -- We loop through inventory to deduct (FIFO), strictly matching customer_id
        FOR v_source_inv IN 
            SELECT * FROM wh_inventory 
            WHERE tenant_id = v_order.tenant_id 
              AND warehouse_id = v_order.warehouse_id 
              AND customer_id = v_order.customer_id
              AND product_sku_id = v_src_item.product_sku_id 
              AND location_id = v_src_item.source_location_id 
              AND quantity > 0
            ORDER BY received_date ASC, created_at ASC
            FOR UPDATE
        LOOP
            IF v_qty_remaining <= 0 THEN
                EXIT;
            END IF;

            IF v_source_inv.quantity <= v_qty_remaining THEN
                v_deduct := v_source_inv.quantity;
            ELSE
                v_deduct := v_qty_remaining;
            END IF;

            -- Deduct from source
            UPDATE wh_inventory 
            SET quantity = quantity - v_deduct, updated_at = NOW()
            WHERE id = v_source_inv.id;

            -- Log movement (KITTING_CONSUME)
            INSERT INTO wh_inventory_movements (
                tenant_id, inventory_id, movement_type, from_location_id, quantity, reference_type, reference_id, notes, created_by
            ) VALUES (
                v_order.tenant_id, v_source_inv.id, 'KITTING_CONSUME', v_src_item.source_location_id, v_deduct, v_order.order_type, v_order.order_number, 'Consumed for ' || v_order.order_type || ' order: ' || v_order.order_number, p_user_id
            );

            v_qty_remaining := v_qty_remaining - v_deduct;
        END LOOP;

        IF v_qty_remaining > 0 THEN
            RAISE EXCEPTION 'Insufficient stock in source location % for SKU % and Customer %', v_src_item.source_location_id, v_src_item.product_sku_id, v_order.customer_id;
        END IF;
    END LOOP;

    -- 3. Create RESULT items
    FOR v_res_item IN 
        SELECT * FROM wh_repacking_items 
        WHERE repacking_order_id = p_order_id AND item_type = 'RESULT'
    LOOP
        -- Find or create destination record matching customer_id
        SELECT id INTO v_dest_inv_id FROM wh_inventory
        WHERE tenant_id = v_order.tenant_id
          AND warehouse_id = v_order.warehouse_id
          AND customer_id = v_order.customer_id
          AND product_sku_id = v_res_item.product_sku_id
          AND location_id = v_res_item.target_location_id
          AND status = 'AVAILABLE'
          AND COALESCE(batch_number, '') = COALESCE(v_res_item.batch_number, '')
          AND COALESCE(expiry_date, '1970-01-01') = COALESCE(v_res_item.expiry_date, '1970-01-01')
        LIMIT 1 FOR UPDATE;

        IF v_dest_inv_id IS NOT NULL THEN
            UPDATE wh_inventory
            SET quantity = quantity + v_res_item.quantity, updated_at = NOW()
            WHERE id = v_dest_inv_id;
        ELSE
            INSERT INTO wh_inventory (
                tenant_id, warehouse_id, customer_id, location_id, product_sku_id, quantity,
                batch_number, expiry_date, received_date, unit_cost, status
            ) VALUES (
                v_order.tenant_id, v_order.warehouse_id, v_order.customer_id, v_res_item.target_location_id, v_res_item.product_sku_id, v_res_item.quantity,
                v_res_item.batch_number, v_res_item.expiry_date, CURRENT_DATE, v_res_item.unit_cost, 'AVAILABLE'
            ) RETURNING id INTO v_dest_inv_id;
        END IF;

        -- Log movement (KITTING_OUTPUT)
        INSERT INTO wh_inventory_movements (
            tenant_id, inventory_id, movement_type, to_location_id, quantity, reference_type, reference_id, notes, created_by
        ) VALUES (
            v_order.tenant_id, v_dest_inv_id, 'KITTING_OUTPUT', v_res_item.target_location_id, v_res_item.quantity, v_order.order_type, v_order.order_number, 'Generated from ' || v_order.order_type || ' order: ' || v_order.order_number, p_user_id
        );
    END LOOP;

    -- 4. Generate WO Item and Job Order
    v_jo_number := 'JO-' || to_char(NOW(), 'YYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
    
    INSERT INTO wo_items (tenant_id, sbu_type, status, item_data, created_by)
    VALUES (
      v_order.tenant_id, 
      'WAREHOUSE', 
      'completed', 
      jsonb_build_object(
        'order_id', p_order_id, 
        'warehouse_id', v_order.warehouse_id,
        'customer_id', v_order.customer_id,
        'operation_type', v_order.order_type,
        'direction', 'REPACKING'
      ), 
      p_user_id
    ) RETURNING id INTO v_wo_item_id;

    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, customer_id, description)
    VALUES (v_order.tenant_id, v_wo_item_id, v_jo_number, 'completed', 'WAREHOUSE', v_order.customer_id, v_order.order_type || ' Order: ' || v_order.order_number);

    -- 5. Finalize order
    UPDATE wh_repacking_orders 
    SET status = 'COMPLETED', 
        executed_by = p_user_id, 
        executed_at = NOW(), 
        completed_at = NOW(),
        reference_id = v_wo_item_id::TEXT
    WHERE id = p_order_id;

    RETURN p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
