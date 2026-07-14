-- Migration 100: Link Transfers to Inbound and Outbound
-- [AI] why this change: Enables Warehouse Transfers to directly spawn Outbound and Inbound tasks without needing a dummy Job Order.

ALTER TABLE wh_outbound_shipments ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES wh_transfer_orders(id) ON DELETE CASCADE;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES wh_transfer_orders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_wh_outbound_transfer ON wh_outbound_shipments(transfer_id);
CREATE INDEX IF NOT EXISTS idx_wh_inbound_transfer ON wh_inbound_receipts(transfer_id);

-- Also allow wo_item_id to be nullable if we use transfer_id
ALTER TABLE wh_outbound_shipments ALTER COLUMN wo_item_id DROP NOT NULL;
ALTER TABLE wh_inbound_receipts ALTER COLUMN wo_item_id DROP NOT NULL;

-- RPC to create a warehouse transfer
CREATE OR REPLACE FUNCTION create_warehouse_transfer(
    p_tenant_id UUID,
    p_from_warehouse_id UUID,
    p_to_warehouse_id UUID,
    p_items JSONB, -- Array of { inventory_id, product_sku_id, quantity }
    p_notes TEXT,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_transfer_id UUID;
    v_transfer_number TEXT;
    v_outbound_id UUID;
    v_inbound_id UUID;
    v_outbound_number TEXT;
    v_inbound_number TEXT;
    v_item JSONB;
BEGIN
    -- 1. Generate Numbers
    v_transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_outbound_number := 'OUT-' || v_transfer_number;
    v_inbound_number := 'RCV-' || v_transfer_number;

    -- 2. Create Transfer Order
    INSERT INTO wh_transfer_orders (
        tenant_id, transfer_number, from_warehouse_id, to_warehouse_id,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, v_transfer_number, p_from_warehouse_id, p_to_warehouse_id,
        'CREATED', p_notes, p_user_id
    ) RETURNING id INTO v_transfer_id;

    -- 3. Create Outbound Shipment (for origin warehouse)
    INSERT INTO wh_outbound_shipments (
        tenant_id, warehouse_id, transfer_id, shipment_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_from_warehouse_id, v_transfer_id, v_outbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_outbound_id;

    -- 4. Create Inbound Receipt (for destination warehouse)
    INSERT INTO wh_inbound_receipts (
        tenant_id, warehouse_id, transfer_id, receipt_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_to_warehouse_id, v_transfer_id, v_inbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_inbound_id;

    -- 5. Create Transfer Details
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Insert Transfer Detail
        INSERT INTO wh_transfer_details (
            tenant_id, transfer_id, inventory_id, product_sku_id, quantity
        ) VALUES (
            p_tenant_id, v_transfer_id, (v_item->>'inventory_id')::UUID, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC
        );
        
        -- Note: We do not create wh_outbound_shipment_items here.
        -- The Picking flow should read from wh_transfer_details because it's a transfer!
        -- Actually, wait, the picking flow reads from wh_outbound_shipment_items!
        -- Let's populate wh_outbound_shipment_items so the picking UI works natively!
        INSERT INTO wh_outbound_shipment_items (
            tenant_id, shipment_id, product_sku_id, planned_qty, picked_qty, status
        ) VALUES (
            p_tenant_id, v_outbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );
        
        -- Also populate wh_inbound_receipt_items for the receiving UI
        INSERT INTO wh_inbound_receipt_items (
            tenant_id, receipt_id, product_sku_id, expected_qty, actual_good_qty, status
        ) VALUES (
            p_tenant_id, v_inbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );
    END LOOP;

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
