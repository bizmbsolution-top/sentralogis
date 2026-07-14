-- Migration 106: Integration for HQ Work Order Transfers
-- Allows single-entry from HQ Work Orders to generate Outbound & Inbound WO Items and Transfer Orders.

CREATE OR REPLACE FUNCTION create_transfer_from_hq_wo(
    p_tenant_id UUID,
    p_wo_id UUID,
    p_wo_number TEXT,
    p_from_warehouse_id UUID,
    p_to_warehouse_id UUID,
    p_items JSONB,
    p_notes TEXT,
    p_user_id UUID,
    p_sbu_type TEXT,
    p_deal_price NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_transfer_id UUID;
    v_transfer_number TEXT;
    v_outbound_id UUID;
    v_inbound_id UUID;
    v_outbound_number TEXT;
    v_inbound_number TEXT;
    v_item JSONB;

    -- WO/JO vars
    v_wo_item_outbound_id UUID;
    v_wo_item_inbound_id UUID;
    v_jo_outbound_number TEXT;
    v_jo_inbound_number TEXT;
BEGIN
    -- 1. Generate Numbers
    v_transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_outbound_number := 'OUT-' || v_transfer_number;
    v_inbound_number := 'RCV-' || v_transfer_number;
    
    v_jo_outbound_number := p_wo_number || '-OUT';
    v_jo_inbound_number := p_wo_number || '-IN';

    -- 2. Create Transfer Order First (so we have v_transfer_id for the JSON fields)
    INSERT INTO wh_transfer_orders (
        tenant_id, transfer_number, from_warehouse_id, to_warehouse_id,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, v_transfer_number, p_from_warehouse_id, p_to_warehouse_id,
        'CREATED', p_notes, p_user_id
    ) RETURNING id INTO v_transfer_id;

    -- 3. WO Item — Outbound (Picking/Loading at source)
    INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status, max_jo_count, item_code, unit_price, total_revenue)
    VALUES (p_tenant_id, p_wo_id, p_sbu_type,
      jsonb_build_object(
        'transfer_id', v_transfer_id, 
        'direction', 'OUTBOUND', 
        'warehouse_id', p_from_warehouse_id, 
        'operation_type', 'STOCK_TRANSFER',
        'notes', p_notes
      ),
      'need_assignment', 1, p_wo_number || '-OUT', p_deal_price, p_deal_price)
    RETURNING id INTO v_wo_item_outbound_id;

    -- JO — Outbound
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
    VALUES (p_tenant_id, v_wo_item_outbound_id, v_jo_outbound_number, 'pending', p_sbu_type, 'Transfer OUT: ' || v_transfer_number);

    -- 4. WO Item — Inbound (Receiving/Putaway at destination)
    INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status, max_jo_count, item_code, unit_price, total_revenue)
    VALUES (p_tenant_id, p_wo_id, p_sbu_type,
      jsonb_build_object(
        'transfer_id', v_transfer_id, 
        'direction', 'INBOUND', 
        'warehouse_id', p_to_warehouse_id,
        'operation_type', 'STOCK_TRANSFER',
        'notes', p_notes
      ),
      'need_assignment', 1, p_wo_number || '-IN', 0, 0)
    RETURNING id INTO v_wo_item_inbound_id;

    -- JO — Inbound
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
    VALUES (p_tenant_id, v_wo_item_inbound_id, v_jo_inbound_number, 'pending', p_sbu_type, 'Transfer IN: ' || v_transfer_number);

    -- 5. Create Outbound Shipment (for origin warehouse)
    INSERT INTO wh_outbound_shipments (
        tenant_id, warehouse_id, transfer_id, wo_item_id, shipment_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_from_warehouse_id, v_transfer_id, v_wo_item_outbound_id, v_outbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_outbound_id;

    -- 6. Create Inbound Receipt (for destination warehouse)
    INSERT INTO wh_inbound_receipts (
        tenant_id, warehouse_id, transfer_id, wo_item_id, receipt_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_to_warehouse_id, v_transfer_id, v_wo_item_inbound_id, v_inbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_inbound_id;

    -- 7. Create Transfer Details + Outbound/Inbound items + Manifests
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Insert Transfer Details
        INSERT INTO wh_transfer_details (
            tenant_id, transfer_id, inventory_id, product_sku_id, quantity
        ) VALUES (
            p_tenant_id, v_transfer_id, 
            NULLIF(v_item->>'inventory_id', '')::UUID, 
            (v_item->>'product_sku_id')::UUID, 
            (v_item->>'quantity')::NUMERIC
        );

        -- Insert Outbound Item
        INSERT INTO wh_outbound_shipment_items (
            tenant_id, shipment_id, product_sku_id, planned_qty, picked_qty, status
        ) VALUES (
            p_tenant_id, v_outbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );

        -- Insert Inbound Item
        INSERT INTO wh_inbound_receipt_items (
            tenant_id, receipt_id, product_sku_id, expected_qty, actual_good_qty, status
        ) VALUES (
            p_tenant_id, v_inbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );

        -- Insert Manifest for Outbound WO Item
        INSERT INTO wo_item_manifests (
            wo_item_id, tenant_id, product_sku_id, quantity, unit_weight_kg, unit_volume_m3, notes
        ) VALUES (
            v_wo_item_outbound_id, p_tenant_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 
            COALESCE((v_item->>'unit_weight_kg')::NUMERIC, 0), 
            COALESCE((v_item->>'unit_volume_m3')::NUMERIC, 0), 
            v_item->>'notes'
        );

        -- Insert Manifest for Inbound WO Item
        INSERT INTO wo_item_manifests (
            wo_item_id, tenant_id, product_sku_id, quantity, unit_weight_kg, unit_volume_m3, notes
        ) VALUES (
            v_wo_item_inbound_id, p_tenant_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 
            COALESCE((v_item->>'unit_weight_kg')::NUMERIC, 0), 
            COALESCE((v_item->>'unit_volume_m3')::NUMERIC, 0), 
            v_item->>'notes'
        );
    END LOOP;

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
