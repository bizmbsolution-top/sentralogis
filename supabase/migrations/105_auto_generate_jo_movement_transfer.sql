-- Migration 105: Auto-generate JO for Internal Movements and WO+JOs for Transfers
-- [AI] Stock card needs JO numbers for tracking & costing.

-- ============================================================
-- PART A: Internal Movement — generate JO on execution
-- ============================================================

CREATE OR REPLACE FUNCTION execute_internal_movement(p_movement_id UUID)
RETURNS UUID AS $$
DECLARE
  v_mov RECORD;
  v_qty_remaining NUMERIC;
  v_deduct NUMERIC;
  v_dest_inv_id UUID;
  v_source_inv RECORD;
  v_wo_id UUID;
  v_wo_item_id UUID;
  v_jo_number TEXT;
BEGIN
  -- Lock & fetch the PENDING movement
  SELECT * INTO v_mov FROM wh_internal_movements
  WHERE id = p_movement_id AND status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movement not found or already executed';
  END IF;

  -- Mark IN_PROGRESS
  UPDATE wh_internal_movements SET status = 'IN_PROGRESS' WHERE id = p_movement_id;

  -- ============== AUTO-GENERATE JO ==============
  v_jo_number := 'IM-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  INSERT INTO work_orders (tenant_id, wo_number, status, notes, created_by)
  VALUES (v_mov.tenant_id, v_jo_number, 'completed', 'Auto-generated for Internal Movement', v_mov.created_by)
  RETURNING id INTO v_wo_id;

  INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status)
  VALUES (v_mov.tenant_id, v_wo_id, 'WAREHOUSE',
    jsonb_build_object('movement_id', p_movement_id, 'from_location', v_mov.from_location_id, 'to_location', v_mov.to_location_id),
    'completed')
  RETURNING id INTO v_wo_item_id;

  INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
  VALUES (v_mov.tenant_id, v_wo_item_id, v_jo_number, 'completed', 'WAREHOUSE', 'Internal Movement: ' || p_movement_id);

  -- Store wo_item_id in reference_id so StockCardModal can look up JO number
  UPDATE wh_internal_movements SET reference_id = v_wo_item_id::TEXT WHERE id = p_movement_id;
  -- ===============================================

  v_qty_remaining := v_mov.quantity;

  -- Deduct from source (FIFO)
  FOR v_source_inv IN
    SELECT * FROM wh_inventory
    WHERE tenant_id = v_mov.tenant_id
      AND warehouse_id = v_mov.warehouse_id
      AND product_sku_id = v_mov.product_sku_id
      AND location_id = v_mov.from_location_id
      AND quantity > 0
    ORDER BY received_date ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_qty_remaining <= 0;

    v_deduct := LEAST(v_source_inv.quantity, v_qty_remaining);

    UPDATE wh_inventory SET quantity = quantity - v_deduct, updated_at = NOW()
    WHERE id = v_source_inv.id;

    -- Find or create destination record
    SELECT id INTO v_dest_inv_id FROM wh_inventory
    WHERE tenant_id = v_mov.tenant_id
      AND warehouse_id = v_mov.warehouse_id
      AND product_sku_id = v_mov.product_sku_id
      AND location_id = v_mov.to_location_id
      AND status = v_source_inv.status
      AND COALESCE(batch_number, '') = COALESCE(v_source_inv.batch_number, '')
      AND COALESCE(expiry_date, '1970-01-01') = COALESCE(v_source_inv.expiry_date, '1970-01-01')
    LIMIT 1 FOR UPDATE;

    IF v_dest_inv_id IS NOT NULL THEN
      UPDATE wh_inventory SET quantity = quantity + v_deduct, updated_at = NOW()
      WHERE id = v_dest_inv_id;
    ELSE
      INSERT INTO wh_inventory (
        tenant_id, warehouse_id, location_id, product_sku_id, quantity,
        batch_number, expiry_date, received_date, unit_cost, status
      ) VALUES (
        v_mov.tenant_id, v_mov.warehouse_id, v_mov.to_location_id, v_mov.product_sku_id, v_deduct,
        v_source_inv.batch_number, v_source_inv.expiry_date, v_source_inv.received_date, v_source_inv.unit_cost, v_source_inv.status
      ) RETURNING id INTO v_dest_inv_id;
    END IF;

    -- Audit log
    INSERT INTO wh_inventory_movements (
      tenant_id, inventory_id, movement_type, from_location_id, to_location_id,
      quantity, reference_type, notes, created_by
    ) VALUES (
      v_mov.tenant_id, v_dest_inv_id, 'TRANSFER', v_mov.from_location_id, v_mov.to_location_id,
      v_deduct, 'INTERNAL_MOVEMENT', 'Executed movement order', v_mov.executed_by
    );

    v_qty_remaining := v_qty_remaining - v_deduct;
  END LOOP;

  IF v_qty_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient stock in source location';
  END IF;

  -- Mark COMPLETED
  UPDATE wh_internal_movements
  SET status = 'COMPLETED', executed_at = NOW()
  WHERE id = p_movement_id;

  RETURN p_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PART B: Transfer — generate WO + WO Items + JOs + link
-- ============================================================

CREATE OR REPLACE FUNCTION create_warehouse_transfer(
    p_tenant_id UUID,
    p_from_warehouse_id UUID,
    p_to_warehouse_id UUID,
    p_items JSONB,
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

    -- WO/JO vars
    v_wo_id UUID;
    v_wo_number TEXT;
    v_wo_item_outbound_id UUID;
    v_wo_item_inbound_id UUID;
    v_jo_outbound_number TEXT;
    v_jo_inbound_number TEXT;
BEGIN
    -- 1. Generate Numbers
    v_transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_outbound_number := 'OUT-' || v_transfer_number;
    v_inbound_number := 'RCV-' || v_transfer_number;
    v_wo_number := 'WO-' || v_transfer_number;
    v_jo_outbound_number := 'JO-' || v_transfer_number || '-OUT';
    v_jo_inbound_number := 'JO-' || v_transfer_number || '-IN';

    -- ============== CREATE WORK ORDER ==============
    INSERT INTO work_orders (tenant_id, wo_number, status, notes, created_by)
    VALUES (p_tenant_id, v_wo_number, 'need_assignment', 'Transfer: ' || COALESCE(p_notes, ''), p_user_id)
    RETURNING id INTO v_wo_id;

    -- WO Item — Outbound (Picking/Loading at source)
    INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status)
    VALUES (p_tenant_id, v_wo_id, 'WAREHOUSE',
      jsonb_build_object('transfer_id', v_transfer_id, 'direction', 'OUTBOUND', 'warehouse_id', p_from_warehouse_id),
      'need_assignment')
    RETURNING id INTO v_wo_item_outbound_id;

    -- JO — Outbound
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
    VALUES (p_tenant_id, v_wo_item_outbound_id, v_jo_outbound_number, 'pending', 'WAREHOUSE', 'Transfer OUT: ' || v_transfer_number);

    -- WO Item — Inbound (Receiving/Putaway at destination)
    INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status)
    VALUES (p_tenant_id, v_wo_id, 'WAREHOUSE',
      jsonb_build_object('transfer_id', v_transfer_id, 'direction', 'INBOUND', 'warehouse_id', p_to_warehouse_id),
      'need_assignment')
    RETURNING id INTO v_wo_item_inbound_id;

    -- JO — Inbound
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
    VALUES (p_tenant_id, v_wo_item_inbound_id, v_jo_inbound_number, 'pending', 'WAREHOUSE', 'Transfer IN: ' || v_transfer_number);
    -- ===============================================

    -- 2. Create Transfer Order
    INSERT INTO wh_transfer_orders (
        tenant_id, transfer_number, from_warehouse_id, to_warehouse_id,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, v_transfer_number, p_from_warehouse_id, p_to_warehouse_id,
        'CREATED', p_notes, p_user_id
    ) RETURNING id INTO v_transfer_id;

    -- 3. Create Outbound Shipment (for origin warehouse) — linked to outbound WO Item
    INSERT INTO wh_outbound_shipments (
        tenant_id, warehouse_id, transfer_id, wo_item_id, shipment_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_from_warehouse_id, v_transfer_id, v_wo_item_outbound_id, v_outbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_outbound_id;

    -- 4. Create Inbound Receipt (for destination warehouse) — linked to inbound WO Item
    INSERT INTO wh_inbound_receipts (
        tenant_id, warehouse_id, transfer_id, wo_item_id, receipt_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_to_warehouse_id, v_transfer_id, v_wo_item_inbound_id, v_inbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_inbound_id;

    -- 5. Create Transfer Details + Outbound/Inbound items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO wh_transfer_details (
            tenant_id, transfer_id, inventory_id, product_sku_id, quantity
        ) VALUES (
            p_tenant_id, v_transfer_id, (v_item->>'inventory_id')::UUID, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC
        );

        INSERT INTO wh_outbound_shipment_items (
            tenant_id, shipment_id, product_sku_id, planned_qty, picked_qty, status
        ) VALUES (
            p_tenant_id, v_outbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );

        INSERT INTO wh_inbound_receipt_items (
            tenant_id, receipt_id, product_sku_id, expected_qty, actual_good_qty, status
        ) VALUES (
            p_tenant_id, v_inbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );
    END LOOP;

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
