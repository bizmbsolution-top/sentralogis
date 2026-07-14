-- Create Internal Movements Table
CREATE TABLE IF NOT EXISTS wh_internal_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
    product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
    from_location_id UUID NOT NULL REFERENCES md_warehouse_locations(id) ON DELETE CASCADE,
    to_location_id UUID NOT NULL REFERENCES md_warehouse_locations(id) ON DELETE CASCADE,
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
    notes TEXT,
    reference_type TEXT, -- e.g., 'MANUAL', 'REPLENISHMENT', 'DAMAGE_RETURN'
    reference_id TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_internal_movements_tenant ON wh_internal_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_internal_movements_sku ON wh_internal_movements(product_sku_id);
CREATE INDEX IF NOT EXISTS idx_wh_internal_movements_from ON wh_internal_movements(from_location_id);
CREATE INDEX IF NOT EXISTS idx_wh_internal_movements_to ON wh_internal_movements(to_location_id);

ALTER TABLE wh_internal_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_wh_internal_movements ON wh_internal_movements;
CREATE POLICY tenant_isolation_wh_internal_movements ON wh_internal_movements
    FOR ALL USING (tenant_id = auth.uid() OR tenant_id IN (
        SELECT tu.tenant_id FROM tenant_users tu WHERE tu.user_id = auth.uid()
    ));

-- Create RPC for executing internal movement safely
CREATE OR REPLACE FUNCTION process_internal_movement(
    p_tenant_id UUID,
    p_warehouse_id UUID,
    p_product_sku_id UUID,
    p_from_location_id UUID,
    p_to_location_id UUID,
    p_quantity NUMERIC,
    p_notes TEXT,
    p_user_id UUID,
    p_reference_type TEXT DEFAULT 'MANUAL',
    p_reference_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
    v_source_inv RECORD;
    v_dest_inv_id UUID;
    v_qty_remaining NUMERIC := p_quantity;
    v_deduct NUMERIC;
BEGIN
    -- 1. Deduct from source locations
    -- We may have multiple inventory records for the same product at the source location.
    -- We loop through them and deduct until v_qty_remaining is 0.
    FOR v_source_inv IN 
        SELECT * FROM wh_inventory 
        WHERE tenant_id = p_tenant_id 
          AND warehouse_id = p_warehouse_id 
          AND product_sku_id = p_product_sku_id 
          AND location_id = p_from_location_id 
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

        -- Find or create destination record matching the exact same batch, expiry, status
        SELECT id INTO v_dest_inv_id FROM wh_inventory
        WHERE tenant_id = p_tenant_id
          AND warehouse_id = p_warehouse_id
          AND product_sku_id = p_product_sku_id
          AND location_id = p_to_location_id
          AND status = v_source_inv.status
          AND COALESCE(batch_number, '') = COALESCE(v_source_inv.batch_number, '')
          AND COALESCE(expiry_date, '1970-01-01') = COALESCE(v_source_inv.expiry_date, '1970-01-01')
        LIMIT 1 FOR UPDATE;

        IF v_dest_inv_id IS NOT NULL THEN
            UPDATE wh_inventory
            SET quantity = quantity + v_deduct, updated_at = NOW()
            WHERE id = v_dest_inv_id;
        ELSE
            INSERT INTO wh_inventory (
                tenant_id, warehouse_id, location_id, product_sku_id, quantity,
                batch_number, expiry_date, received_date, unit_cost, status
            ) VALUES (
                p_tenant_id, p_warehouse_id, p_to_location_id, p_product_sku_id, v_deduct,
                v_source_inv.batch_number, v_source_inv.expiry_date, v_source_inv.received_date, v_source_inv.unit_cost, v_source_inv.status
            ) RETURNING id INTO v_dest_inv_id;
        END IF;

        -- We should also log into wh_inventory_movements for audit trail
        INSERT INTO wh_inventory_movements (
            tenant_id, inventory_id, movement_type, from_location_id, to_location_id, quantity, reference_type, notes, created_by
        ) VALUES (
            p_tenant_id, v_dest_inv_id, 'TRANSFER', p_from_location_id, p_to_location_id, v_deduct, 'INTERNAL_MOVEMENT', p_notes, p_user_id
        );

        v_qty_remaining := v_qty_remaining - v_deduct;
    END LOOP;

    IF v_qty_remaining > 0 THEN
        RAISE EXCEPTION 'Insufficient stock in source location % for SKU %', p_from_location_id, p_product_sku_id;
    END IF;

    -- 2. Create the movement record
    INSERT INTO wh_internal_movements (
        tenant_id, warehouse_id, product_sku_id, from_location_id, to_location_id,
        quantity, notes, reference_type, reference_id, created_by
    ) VALUES (
        p_tenant_id, p_warehouse_id, p_product_sku_id, p_from_location_id, p_to_location_id,
        p_quantity, p_notes, p_reference_type, p_reference_id, p_user_id
    ) RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
