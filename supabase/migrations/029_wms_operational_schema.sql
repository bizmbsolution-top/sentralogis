-- WMS Operational Schema — Receipt, Picking, Transfer, Transformation, Billing
-- Based on USER FLOW & DATABASE SCHEMA document
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 0. ALTER EXISTING TABLES
-- ============================================
ALTER TABLE wh_inventory ADD COLUMN IF NOT EXISTS customer_id UUID;

-- ============================================
-- 1. RECEIPT ORDER (Inbound)
-- ============================================
CREATE TABLE IF NOT EXISTS wh_receipt_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  receipt_number TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('FORWARDING_JO', 'TRANSFER_IN', 'DIRECT_CUSTOMER', 'RETURN')),
  source_id TEXT,
  customer_id UUID,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  expected_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wh_receipt_orders_tenant ON wh_receipt_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_receipt_orders_status ON wh_receipt_orders(status);
CREATE INDEX IF NOT EXISTS idx_wh_receipt_orders_wh ON wh_receipt_orders(warehouse_id);

CREATE TABLE IF NOT EXISTS wh_receipt_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  receipt_id UUID NOT NULL REFERENCES wh_receipt_orders(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
  expected_quantity NUMERIC(15, 2),
  actual_quantity NUMERIC(15, 2),
  uom TEXT DEFAULT 'PCS',
  lot_number TEXT,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RECEIVED', 'DAMAGED', 'SHORT', 'OVER')),
  damage_notes TEXT,
  photo_url TEXT,
  generated_inventory_id UUID REFERENCES wh_inventory(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_receipt_details_receipt ON wh_receipt_details(receipt_id);
CREATE INDEX IF NOT EXISTS idx_wh_receipt_details_sku ON wh_receipt_details(product_sku_id);
ALTER TABLE wh_receipt_details ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- ============================================
-- 2. PICKING LIST (Outbound)
-- ============================================
CREATE TABLE IF NOT EXISTS wh_picking_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  picking_number TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('FORWARDING_JO', 'TRANSFER_OUT', 'DIRECT_CUSTOMER', 'SALES_ORDER')),
  source_id TEXT,
  customer_id UUID,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  scheduled_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  assigned_picker UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wh_picking_lists_tenant ON wh_picking_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_picking_lists_status ON wh_picking_lists(status);
CREATE INDEX IF NOT EXISTS idx_wh_picking_lists_wh ON wh_picking_lists(warehouse_id);

CREATE TABLE IF NOT EXISTS wh_picking_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  picking_list_id UUID NOT NULL REFERENCES wh_picking_lists(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES wh_inventory(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
  requested_quantity NUMERIC(15, 2),
  picked_quantity NUMERIC(15, 2),
  from_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PICKED', 'NOT_FOUND', 'DAMAGED')),
  fefo_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  override_by UUID,
  picked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_picking_details_list ON wh_picking_details(picking_list_id);
CREATE INDEX IF NOT EXISTS idx_wh_picking_details_inv ON wh_picking_details(inventory_id);
CREATE INDEX IF NOT EXISTS idx_wh_picking_details_sku ON wh_picking_details(product_sku_id);
ALTER TABLE wh_picking_details ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- ============================================
-- 3. TRANSFER ORDER (Inter-Warehouse)
-- ============================================
CREATE TABLE IF NOT EXISTS wh_transfer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  transfer_number TEXT NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  to_warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  transfer_type TEXT DEFAULT 'REPLENISHMENT' CHECK (transfer_type IN ('REPLENISHMENT', 'CONSIGNMENT', 'RETURN', 'RECALL')),
  customer_id UUID,
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PICKING', 'SHIPPED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wh_transfer_orders_tenant ON wh_transfer_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_transfer_orders_from ON wh_transfer_orders(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_transfer_orders_to ON wh_transfer_orders(to_warehouse_id);

CREATE TABLE IF NOT EXISTS wh_transfer_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  transfer_id UUID NOT NULL REFERENCES wh_transfer_orders(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES wh_inventory(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
  quantity NUMERIC(15, 2) NOT NULL,
  from_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PICKED', 'SHIPPED', 'RECEIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_transfer_details_transfer ON wh_transfer_details(transfer_id);
CREATE INDEX IF NOT EXISTS idx_wh_transfer_details_inv ON wh_transfer_details(inventory_id);
ALTER TABLE wh_transfer_details ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- ============================================
-- 4. TRANSFORMATION (Kitting / Break-Bulk)
-- ============================================
CREATE TABLE IF NOT EXISTS wh_transformation_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  transformation_order_id UUID NOT NULL REFERENCES wh_transformation_orders(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES wh_inventory(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
  planned_quantity NUMERIC(15, 2),
  consumed_quantity NUMERIC(15, 2),
  status TEXT NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'CONSUMED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_transformation_comp_order ON wh_transformation_components(transformation_order_id);
CREATE INDEX IF NOT EXISTS idx_wh_transformation_comp_inv ON wh_transformation_components(inventory_id);
ALTER TABLE wh_transformation_components ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE TABLE IF NOT EXISTS wh_transformation_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  transformation_order_id UUID NOT NULL REFERENCES wh_transformation_orders(id) ON DELETE CASCADE,
  generated_inventory_id UUID NOT NULL REFERENCES wh_inventory(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
  quantity NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_transformation_out_order ON wh_transformation_outputs(transformation_order_id);
CREATE INDEX IF NOT EXISTS idx_wh_transformation_out_inv ON wh_transformation_outputs(generated_inventory_id);
ALTER TABLE wh_transformation_outputs ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- ============================================
-- 5. TEMPERATURE ALERT (Cold Chain)
-- ============================================
CREATE TABLE IF NOT EXISTS wh_temperature_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES md_warehouse_zones(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('HIGH_TEMP', 'LOW_TEMP', 'SENSOR_OFFLINE')),
  threshold_value NUMERIC(8, 2),
  actual_value NUMERIC(8, 2),
  duration_minutes INTEGER,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_temperature_alerts_zone ON wh_temperature_alerts(zone_id);
CREATE INDEX IF NOT EXISTS idx_wh_temperature_alerts_tenant ON wh_temperature_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_temperature_alerts_resolved ON wh_temperature_alerts(is_resolved);

-- ============================================
-- 6. BILLING INVOICE
-- ============================================
CREATE TABLE IF NOT EXISTS wh_billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  contract_id UUID NOT NULL REFERENCES md_storage_contracts(id) ON DELETE CASCADE,
  customer_id UUID,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_amount NUMERIC(18, 2) DEFAULT 0,
  tax_amount NUMERIC(18, 2) DEFAULT 0,
  grand_total NUMERIC(18, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')),
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wh_billing_invoices_tenant ON wh_billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_billing_invoices_contract ON wh_billing_invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_wh_billing_invoices_status ON wh_billing_invoices(status);

CREATE TABLE IF NOT EXISTS wh_billing_invoice_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES wh_billing_invoices(id) ON DELETE CASCADE,
  charge_code TEXT NOT NULL,
  charge_name TEXT,
  rate_value NUMERIC(15, 2),
  quantity NUMERIC(12, 4),
  uom TEXT,
  amount NUMERIC(18, 2),
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_billing_invoice_details_inv ON wh_billing_invoice_details(invoice_id);
ALTER TABLE wh_billing_invoice_details ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- ============================================
-- 7. VIEWS
-- ============================================

CREATE OR REPLACE VIEW v_wh_customer_stock AS
SELECT
  i.tenant_id,
  i.customer_id,
  i.product_sku_id,
  ps.sku_code,
  ps.name AS product_name,
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  a.area_type,
  i.batch_number AS lot_number,
  i.expiry_date,
  i.status,
  COUNT(*) AS item_count,
  SUM(i.quantity) AS total_quantity,
  ml.code AS location_code
FROM wh_inventory i
JOIN md_product_skus ps ON i.product_sku_id = ps.id
JOIN md_warehouse_locations ml ON i.location_id = ml.id
JOIN md_warehouses w ON i.warehouse_id = w.id
LEFT JOIN md_warehouse_zones z ON ml.zone_id = z.id
LEFT JOIN md_warehouse_areas a ON z.area_id = a.id
WHERE i.status IN ('AVAILABLE', 'RESERVED')
GROUP BY i.tenant_id, i.customer_id, i.product_sku_id, ps.sku_code, ps.name,
         w.id, w.name, a.area_type, i.batch_number, i.expiry_date, i.status, ml.code;

CREATE OR REPLACE VIEW v_wh_utilization AS
SELECT
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  a.id AS area_id,
  a.area_name,
  a.area_type,
  a.total_capacity,
  a.uom_capacity,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('AVAILABLE', 'RESERVED')) AS occupied_units,
  CASE WHEN a.total_capacity > 0
    THEN ROUND((COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('AVAILABLE', 'RESERVED'))::DECIMAL / a.total_capacity) * 100, 1)
    ELSE 0
  END AS utilization_pct
FROM md_warehouses w
JOIN md_warehouse_areas a ON w.id = a.warehouse_id
LEFT JOIN md_warehouse_zones z ON a.id = z.area_id
LEFT JOIN md_warehouse_locations ml ON z.id = ml.zone_id
LEFT JOIN wh_inventory i ON ml.id = i.location_id
GROUP BY w.id, w.name, a.id, a.area_name, a.area_type, a.total_capacity, a.uom_capacity;

-- ============================================
-- 8. FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION fn_wh_fefo_pick(
  p_sku_id UUID,
  p_quantity NUMERIC
) RETURNS TABLE(
  inventory_id UUID,
  lot_number TEXT,
  expiry_date DATE,
  location_id UUID,
  available_qty NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.batch_number,
    i.expiry_date,
    i.location_id,
    i.available_quantity
  FROM wh_inventory i
  WHERE i.product_sku_id = p_sku_id
    AND i.status = 'AVAILABLE'
    AND i.available_quantity > 0
  ORDER BY i.expiry_date ASC NULLS LAST, i.received_date ASC
  LIMIT CEIL(p_quantity)::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION fn_wh_calculate_storage_charge(
  p_contract_id UUID,
  p_period_start DATE,
  p_period_end DATE
) RETURNS NUMERIC(18, 2) LANGUAGE plpgsql AS $$
DECLARE
  avg_daily_pallet NUMERIC;
  committed_space NUMERIC;
  overflow_space NUMERIC;
  fixed_rate NUMERIC;
  multiplier NUMERIC;
  total_charge NUMERIC(18, 2) := 0;
BEGIN
  SELECT AVG(total_pallets) INTO avg_daily_pallet
  FROM wh_daily_stock_snapshots
  WHERE contract_id = p_contract_id
    AND snapshot_date BETWEEN p_period_start AND p_period_end;

  SELECT sc.committed_space, sc.max_overflow
  INTO committed_space, overflow_space
  FROM md_storage_contracts sc
  WHERE sc.id = p_contract_id;

  SELECT rate_value INTO fixed_rate
  FROM md_billing_rates
  WHERE contract_id = p_contract_id
    AND charge_code = 'STR-FIX'
    AND is_active = true;

  IF avg_daily_pallet > committed_space THEN
    overflow_space := LEAST(avg_daily_pallet - committed_space, COALESCE(overflow_space, 0));
    total_charge := (committed_space * COALESCE(fixed_rate, 0)) + (overflow_space * COALESCE(fixed_rate, 0) * 1.5);
  ELSE
    total_charge := COALESCE(avg_daily_pallet * COALESCE(fixed_rate, 0), 0);
  END IF;

  RETURN total_charge;
END;
$$;

-- ============================================
-- 9. TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION fn_wh_update_bin_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    IF OLD.location_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM wh_inventory
      WHERE location_id = OLD.location_id
        AND status IN ('AVAILABLE', 'RESERVED', 'QUARANTINE')
        AND id != COALESCE(NEW.id, OLD.id)
    ) THEN
      UPDATE md_warehouse_locations SET bin_status = 'EMPTY'
      WHERE id = OLD.location_id;
    END IF;

    IF NEW.location_id IS NOT NULL THEN
      UPDATE md_warehouse_locations SET bin_status = 'OCCUPIED'
      WHERE id = NEW.location_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wh_update_bin_status ON wh_inventory;
CREATE TRIGGER trg_wh_update_bin_status
  AFTER UPDATE OF location_id ON wh_inventory
  FOR EACH ROW EXECUTE FUNCTION fn_wh_update_bin_status();

CREATE OR REPLACE FUNCTION fn_wh_log_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.location_id IS DISTINCT FROM NEW.location_id
     OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO wh_inventory_movements (
      id, tenant_id, inventory_id, movement_type,
      from_location_id, to_location_id, quantity, notes, created_by
    ) VALUES (
      gen_random_uuid(),
      NEW.tenant_id,
      COALESCE(NEW.id, OLD.id),
      CASE
        WHEN OLD.location_id IS NULL THEN 'PUTAWAY'
        WHEN NEW.location_id IS NULL THEN 'OUTBOUND'
        WHEN OLD.status = 'RESERVED' AND NEW.status = 'AVAILABLE' THEN 'ADJUSTMENT_PLUS'
        ELSE 'TRANSFER'
      END,
      OLD.location_id,
      NEW.location_id,
      NEW.quantity,
      'Auto-logged by movement trigger',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wh_log_movement ON wh_inventory;
CREATE TRIGGER trg_wh_log_movement
  AFTER UPDATE ON wh_inventory
  FOR EACH ROW EXECUTE FUNCTION fn_wh_log_movement();

-- ============================================
-- 10. RLS POLICIES
-- ============================================
ALTER TABLE wh_receipt_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_receipt_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_picking_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_picking_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_transfer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_transfer_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_transformation_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_transformation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_temperature_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_billing_invoice_details ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policies TEXT[][] := ARRAY[
    ARRAY['wh_receipt_orders', 'tenant_isolation_wh_receipt_orders'],
    ARRAY['wh_picking_lists', 'tenant_isolation_wh_picking_lists'],
    ARRAY['wh_transfer_orders', 'tenant_isolation_wh_transfer_orders'],
    ARRAY['wh_transformation_components', 'tenant_isolation_wh_transformation_components'],
    ARRAY['wh_transformation_outputs', 'tenant_isolation_wh_transformation_outputs'],
    ARRAY['wh_temperature_alerts', 'tenant_isolation_wh_temperature_alerts'],
    ARRAY['wh_billing_invoices', 'tenant_isolation_wh_billing_invoices'],
    ARRAY['wh_billing_invoice_details', 'tenant_isolation_wh_billing_invoice_details'],
    ARRAY['wh_receipt_details', 'tenant_isolation_wh_receipt_details'],
    ARRAY['wh_picking_details', 'tenant_isolation_wh_picking_details'],
    ARRAY['wh_transfer_details', 'tenant_isolation_wh_transfer_details']
  ];
  t TEXT[];
BEGIN
  FOREACH t SLICE 1 IN ARRAY policies LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t[2], t[1]);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))',
      t[2], t[1]
    );
  END LOOP;
END $$;
