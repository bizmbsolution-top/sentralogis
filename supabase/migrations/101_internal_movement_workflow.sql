-- Migration 101: Internal Movement Workflow (PENDING → COMPLETED by staff)
-- 1. Extend status to support PENDING/IN_PROGRESS workflow
ALTER TABLE wh_internal_movements DROP CONSTRAINT IF EXISTS wh_internal_movements_status_check;
ALTER TABLE wh_internal_movements ADD CONSTRAINT wh_internal_movements_status_check
  CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
ALTER TABLE wh_internal_movements ALTER COLUMN status SET DEFAULT 'PENDING';

-- 2. Add executed_by column (who physically moved the stock)
ALTER TABLE wh_internal_movements ADD COLUMN IF NOT EXISTS executed_by UUID;
ALTER TABLE wh_internal_movements ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;

-- 3. RPC: Execute a PENDING movement (atomic stock transfer + status update)
CREATE OR REPLACE FUNCTION execute_internal_movement(p_movement_id UUID)
RETURNS UUID AS $$
DECLARE
  v_mov RECORD;
  v_qty_remaining NUMERIC;
  v_deduct NUMERIC;
  v_dest_inv_id UUID;
  v_source_inv RECORD;
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
