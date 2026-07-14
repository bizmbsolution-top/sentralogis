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
    SELECT * INTO v_order FROM wh_repacking_orders WHERE id = p_order_id AND status IN ('CREATED', 'IN_PROGRESS') FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found or already completed/cancelled'; END IF;
    UPDATE wh_repacking_orders SET status = 'IN_PROGRESS' WHERE id = p_order_id;
    
    FOR v_src_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'SOURCE' LOOP
        v_qty_remaining := v_src_item.quantity;
        FOR v_source_inv IN SELECT * FROM wh_inventory WHERE tenant_id = v_order.tenant_id AND warehouse_id = v_order.warehouse_id AND product_sku_id = v_src_item.product_sku_id AND location_id = v_src_item.source_location_id AND quantity > 0 ORDER BY received_date ASC, created_at ASC FOR UPDATE LOOP
            IF v_qty_remaining <= 0 THEN EXIT; END IF;
            IF v_source_inv.quantity <= v_qty_remaining THEN v_deduct := v_source_inv.quantity; ELSE v_deduct := v_qty_remaining; END IF;
            UPDATE wh_inventory SET quantity = quantity - v_deduct, updated_at = NOW() WHERE id = v_source_inv.id;
            
            INSERT INTO wh_inventory_movements (tenant_id, inventory_id, movement_type, from_location_id, quantity, reference_type, reference_id, notes, created_by) 
            VALUES (v_order.tenant_id, v_source_inv.id, 'KITTING_CONSUME', v_src_item.source_location_id, v_deduct, v_order.order_type, v_order.id, 'Consumed for ' || v_order.order_type || ' order: ' || v_order.order_number, p_user_id);
            
            v_qty_remaining := v_qty_remaining - v_deduct;
        END LOOP;
        IF v_qty_remaining > 0 THEN RAISE EXCEPTION 'Insufficient stock in source location % for SKU %', v_src_item.source_location_id, v_src_item.product_sku_id; END IF;
    END LOOP;
    
    FOR v_res_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'RESULT' LOOP
        SELECT id INTO v_dest_inv_id FROM wh_inventory WHERE tenant_id = v_order.tenant_id AND warehouse_id = v_order.warehouse_id AND product_sku_id = v_res_item.product_sku_id AND location_id = v_res_item.target_location_id AND status = 'AVAILABLE' AND (customer_id = v_order.customer_id OR customer_id IS NULL) ORDER BY created_at DESC LIMIT 1;
        IF v_dest_inv_id IS NULL THEN
            INSERT INTO wh_inventory (
                tenant_id, warehouse_id, customer_id, location_id, product_sku_id, quantity,
                batch_number, expiry_date, received_date, unit_cost, status
            ) VALUES (
                v_order.tenant_id, v_order.warehouse_id, v_order.customer_id, v_res_item.target_location_id, v_res_item.product_sku_id, v_res_item.quantity,
                v_res_item.batch_number, v_res_item.expiry_date, CURRENT_DATE, v_res_item.unit_cost, 'AVAILABLE'
            ) RETURNING id INTO v_dest_inv_id;
        ELSE
            UPDATE wh_inventory SET quantity = quantity + v_res_item.quantity, updated_at = NOW() WHERE id = v_dest_inv_id;
        END IF;
        
        INSERT INTO wh_inventory_movements (tenant_id, inventory_id, movement_type, to_location_id, quantity, reference_type, reference_id, notes, created_by) 
        VALUES (v_order.tenant_id, v_dest_inv_id, 'KITTING_OUTPUT', v_res_item.target_location_id, v_res_item.quantity, v_order.order_type, v_order.id, 'Result from ' || v_order.order_type || ' order: ' || v_order.order_number, p_user_id);
    END LOOP;
    
    v_jo_number := 'JO-' || to_char(NOW(), 'YYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
    
    INSERT INTO wo_items (tenant_id, sbu_type, status, item_data, created_by) 
    VALUES (v_order.tenant_id, 'WAREHOUSE', 'completed', jsonb_build_object('order_id', p_order_id, 'warehouse_id', v_order.warehouse_id, 'customer_id', v_order.customer_id, 'operation_type', v_order.order_type, 'direction', 'REPACKING'), p_user_id) RETURNING id INTO v_wo_item_id;
    
    -- PERBAIKAN: Menghapus customer_id dari job_orders karena tabel job_orders tidak memilikinya
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, description) 
    VALUES (v_order.tenant_id, v_wo_item_id, v_jo_number, 'completed', 'WAREHOUSE', v_order.order_type || ' Order: ' || v_order.order_number);
    
    UPDATE wh_repacking_orders SET status = 'COMPLETED', executed_by = p_user_id, executed_at = NOW(), completed_at = NOW(), reference_id = v_wo_item_id::TEXT WHERE id = p_order_id;
    
    RETURN p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;