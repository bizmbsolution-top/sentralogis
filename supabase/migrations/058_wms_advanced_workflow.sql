-- Migration 058: WMS Advanced Workflow Architecture (Inbound, Outbound, VAS, BOM, LPN)

-- ==========================================
-- 1. INBOUND & OUTBOUND SHIPMENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS wh_inbound_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id),
  wo_item_id UUID, -- Link to Work Order (Optional)
  receipt_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'EXPECTED' CHECK (status IN ('EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING', 'PUTAWAY_IN_PROGRESS', 'COMPLETED')),
  expected_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  transporter_id UUID REFERENCES md_entities(id),
  fleet_id UUID REFERENCES md_fleets(id),
  driver_id UUID REFERENCES md_drivers(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS wh_inbound_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES wh_inbound_receipts(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id),
  expected_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_good_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  quarantine_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  rejected_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  damage_source TEXT CHECK (damage_source IN ('TRANSPORTER', 'WAREHOUSE_STAFF', 'SUPPLIER', 'OTHER')),
  damage_condition TEXT CHECK (damage_condition IN ('DAMAGED_PACKAGE_FULL_CONTENT', 'GOOD_PACKAGE_MISSING_CONTENT', 'TOTAL_DAMAGE')),
  damage_notes TEXT,
  batch_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wh_outbound_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id),
  wo_item_id UUID,
  shipment_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'PICKING', 'STAGING', 'TRUCK_ARRIVED', 'LOADING', 'DISPATCHED')),
  transporter_id UUID REFERENCES md_entities(id),
  fleet_id UUID REFERENCES md_fleets(id),
  driver_id UUID REFERENCES md_drivers(id),
  dispatched_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS wh_outbound_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES wh_outbound_shipments(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id),
  requested_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  picked_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  loaded_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. BILL OF MATERIALS (BOM) FOR KITTING
-- ==========================================
CREATE TABLE IF NOT EXISTS md_bill_of_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  kit_sku_id UUID NOT NULL REFERENCES md_product_skus(id),
  bom_number TEXT NOT NULL,
  name TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS md_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES md_bill_of_materials(id) ON DELETE CASCADE,
  component_sku_id UUID NOT NULL REFERENCES md_product_skus(id),
  quantity_required NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 3. VALUE-ADDED SERVICES (VAS) ORDERS
-- ==========================================
CREATE TABLE IF NOT EXISTS wh_vas_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id),
  vas_number TEXT NOT NULL,
  vas_type TEXT NOT NULL CHECK (vas_type IN ('KITTING', 'BUNDLING', 'REPACKING', 'QC')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  bom_id UUID REFERENCES md_bill_of_materials(id),
  target_sku_id UUID REFERENCES md_product_skus(id),
  target_qty NUMERIC(15,2),
  completed_qty NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- ==========================================
-- 4. LICENSE PLATE NUMBER (LPN) IN INVENTORY
-- ==========================================
ALTER TABLE wh_inventory ADD COLUMN IF NOT EXISTS lpn_code TEXT;
ALTER TABLE wh_inventory ADD COLUMN IF NOT EXISTS parent_lpn_code TEXT;
CREATE INDEX IF NOT EXISTS idx_wh_inventory_lpn ON wh_inventory(lpn_code);

-- ==========================================
-- 5. MILESTONE & AUDIT LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS wh_milestone_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('INBOUND_RECEIPT', 'OUTBOUND_SHIPMENT', 'VAS_ORDER', 'LPN_CREATION')),
  reference_id UUID NOT NULL,
  milestone_event TEXT NOT NULL,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 6. RLS POLICIES
-- ==========================================
ALTER TABLE wh_inbound_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_inbound_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_outbound_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_outbound_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_vas_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_milestone_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_wh_inb_rec ON wh_inbound_receipts USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY tenant_isolation_wh_inb_itm ON wh_inbound_receipt_items USING (receipt_id IN (SELECT id FROM wh_inbound_receipts WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY tenant_isolation_wh_out_shp ON wh_outbound_shipments USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY tenant_isolation_wh_out_itm ON wh_outbound_shipment_items USING (shipment_id IN (SELECT id FROM wh_outbound_shipments WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY tenant_isolation_md_bom ON md_bill_of_materials USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY tenant_isolation_md_bom_itm ON md_bom_items USING (bom_id IN (SELECT id FROM md_bill_of_materials WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY tenant_isolation_wh_vas ON wh_vas_orders USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY tenant_isolation_wh_logs ON wh_milestone_logs USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

SELECT '058_wms_advanced_workflow created successfully' as result;
