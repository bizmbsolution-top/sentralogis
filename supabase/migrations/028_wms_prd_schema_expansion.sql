-- WMS Full Schema — Foundation + PRD Expansion
-- Eksekusi di Supabase SQL Editor
-- Semua DDL menggunakan IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- ============================================
-- A. FOUNDATION TABLES (from 027)
-- ============================================

-- A1. md_warehouses
CREATE TABLE IF NOT EXISTS md_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contact_person TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_md_warehouses_tenant ON md_warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_warehouses_code ON md_warehouses(code);

-- A2. md_warehouse_locations
CREATE TABLE IF NOT EXISTS md_warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  zone TEXT,
  rack TEXT,
  shelf TEXT,
  bin TEXT,
  location_type TEXT NOT NULL DEFAULT 'STORAGE'
    CHECK (location_type IN ('STORAGE', 'PICKING', 'RECEIVING', 'SHIPPING', 'QUARANTINE', 'RETURN')),
  max_weight_kg NUMERIC(12, 2),
  max_volume_m3 NUMERIC(12, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_md_warehouse_locations_wh ON md_warehouse_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_md_warehouse_locations_tenant ON md_warehouse_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_warehouse_locations_code ON md_warehouse_locations(code);

-- A3. md_product_skus
CREATE TABLE IF NOT EXISTS md_product_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  sku_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'PCS' CHECK (unit IN ('PCS', 'BOX', 'PALLET', 'KG', 'TON', 'LITER', 'METER', 'UNIT')),
  weight_kg NUMERIC(12, 4),
  length_cm NUMERIC(12, 2),
  width_cm NUMERIC(12, 2),
  height_cm NUMERIC(12, 2),
  volume_m3 NUMERIC(12, 4),
  storage_rule TEXT DEFAULT 'FIFO' CHECK (storage_rule IN ('FIFO', 'FEFO', 'LIFO', 'NONE')),
  is_hazardous BOOLEAN NOT NULL DEFAULT false,
  requires_cold_storage BOOLEAN NOT NULL DEFAULT false,
  min_stock_level NUMERIC(12, 2) DEFAULT 0,
  max_stock_level NUMERIC(12, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_md_product_skus_tenant ON md_product_skus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_product_skus_code ON md_product_skus(sku_code);
CREATE INDEX IF NOT EXISTS idx_md_product_skus_category ON md_product_skus(category);

-- A4. wh_inventory
CREATE TABLE IF NOT EXISTS wh_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
  quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
  available_quantity NUMERIC(15, 2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  batch_number TEXT,
  expiry_date DATE,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unit_cost NUMERIC(15, 2),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'QUARANTINE', 'DAMAGED', 'EXPIRED', 'RESERVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_inventory_tenant ON wh_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_warehouse ON wh_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_product ON wh_inventory(product_sku_id);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_location ON wh_inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_status ON wh_inventory(status);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_batch ON wh_inventory(batch_number);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_expiry ON wh_inventory(expiry_date);

-- A5. wh_tasks
CREATE TABLE IF NOT EXISTS wh_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  wo_item_id UUID,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  task_number TEXT NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('INBOUND', 'OUTBOUND', 'PICKING', 'PACKING', 'PUTAWAY', 'TRANSFER', 'STOCK_OPNAME', 'ADJUSTMENT')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  assigned_to UUID,
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wh_tasks_tenant ON wh_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_tasks_warehouse ON wh_tasks(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_tasks_type ON wh_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_wh_tasks_status ON wh_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wh_tasks_assigned ON wh_tasks(assigned_to);

-- A6. wh_task_items
CREATE TABLE IF NOT EXISTS wh_task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES wh_tasks(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  expected_quantity NUMERIC(15, 2) NOT NULL,
  actual_quantity NUMERIC(15, 2),
  batch_number TEXT,
  expiry_date DATE,
  unit_cost NUMERIC(15, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_task_items_task ON wh_task_items(task_id);
CREATE INDEX IF NOT EXISTS idx_wh_task_items_product ON wh_task_items(product_sku_id);

-- ============================================
-- B. PRD-COMPLIANT SCHEMA EXPANSION
-- ============================================

-- B1. ENHANCE EXISTING TABLES
-- -------------------------------------------

-- md_warehouses — add PRD fields
ALTER TABLE md_warehouses ADD COLUMN IF NOT EXISTS warehouse_type TEXT
  CHECK (warehouse_type IN ('DC', 'SUB_DC', 'SHOP', 'DARK_STORE'));
ALTER TABLE md_warehouses ADD COLUMN IF NOT EXISTS ownership TEXT
  CHECK (ownership IN ('OWN', '3PL_MANAGED', 'KONSINYASI'));
ALTER TABLE md_warehouses ADD COLUMN IF NOT EXISTS parent_warehouse_id UUID
  REFERENCES md_warehouses(id) ON DELETE SET NULL;
ALTER TABLE md_warehouses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'));
ALTER TABLE md_warehouses ADD COLUMN IF NOT EXISTS total_capacity_sqm NUMERIC(12, 2);
ALTER TABLE md_warehouses ADD COLUMN IF NOT EXISTS total_capacity_cbm NUMERIC(12, 2);

-- md_warehouse_locations — add hierarchy & PRD fields
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS area_id UUID;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS zone_id UUID;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS bin_type TEXT
  CHECK (bin_type IN ('RACK', 'FLOOR', 'YARD_GRID'));
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS aisle TEXT;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS bay TEXT;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS bin_status TEXT NOT NULL DEFAULT 'EMPTY'
  CHECK (bin_status IN ('EMPTY', 'OCCUPIED', 'RESERVED', 'BLOCKED'));

-- md_product_skus — add SKU hierarchy & PRD fields
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS parent_sku_id UUID
  REFERENCES md_product_skus(id) ON DELETE SET NULL;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS sku_level TEXT
  CHECK (sku_level IN ('BASE_UNIT', 'INNER_PACK', 'MASTER_CASE', 'PALLET'));
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS commodity_type TEXT
  CHECK (commodity_type IN ('FROZEN', 'CHILL', 'DRY', 'HAZMAT', 'FRAGILE', 'PHARMA'));
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS conversion_to_base NUMERIC(12, 4) DEFAULT 1;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS is_sellable BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS is_stockable BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS dimension_cm TEXT;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS stack_limit INTEGER;

-- wh_inventory — add unique inventory tracking per PRD
ALTER TABLE wh_inventory ADD COLUMN IF NOT EXISTS inventory_code TEXT;
ALTER TABLE wh_inventory ADD COLUMN IF NOT EXISTS parent_inventory_id UUID
  REFERENCES wh_inventory(id) ON DELETE SET NULL;
ALTER TABLE wh_inventory ADD COLUMN IF NOT EXISTS serial_number TEXT;

CREATE INDEX IF NOT EXISTS idx_wh_inventory_code ON wh_inventory(inventory_code);

-- -------------------------------------------
-- B2. NEW TABLES — WAREHOUSE HIERARCHY
-- -------------------------------------------

-- B2a. Areas within a warehouse
CREATE TABLE IF NOT EXISTS md_warehouse_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  area_code TEXT NOT NULL,
  area_name TEXT NOT NULL,
  area_type TEXT NOT NULL CHECK (area_type IN (
    'YARD', 'INDOOR_FLOOR', 'RACKING', 'COLD_FREEZER', 'COLD_CHILLER', 'HAZMAT', 'BONDED'
  )),
  area_category TEXT DEFAULT 'GENERAL'
    CHECK (area_category IN ('GENERAL', 'FOOD_GRADE', 'DANGEROUS_GOODS')),
  storage_type TEXT DEFAULT 'PALLET_STACK'
    CHECK (storage_type IN ('BULK_FLOOR', 'PALLET_STACK', 'RACK_SELECTIVE', 'RACK_DRIVE_IN', 'CANTILEVER')),
  total_capacity NUMERIC(12, 2),
  uom_capacity TEXT DEFAULT 'PALLET' CHECK (uom_capacity IN ('PALLET', 'CBM', 'SQM')),
  temperature_min NUMERIC(8, 2),
  temperature_max NUMERIC(8, 2),
  humidity_max NUMERIC(8, 2),
  is_hazmat_certified BOOLEAN NOT NULL DEFAULT false,
  is_bonded_zone BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_md_warehouse_areas_wh ON md_warehouse_areas(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_md_warehouse_areas_tenant ON md_warehouse_areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_warehouse_areas_type ON md_warehouse_areas(area_type);

-- B2b. Zones within an area
CREATE TABLE IF NOT EXISTS md_warehouse_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES md_warehouse_areas(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  zone_code TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  zone_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (zone_status IN ('ACTIVE', 'FULL', 'MAINTENANCE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_md_warehouse_zones_area ON md_warehouse_zones(area_id);
CREATE INDEX IF NOT EXISTS idx_md_warehouse_zones_tenant ON md_warehouse_zones(tenant_id);

-- Wire up FK for md_warehouse_locations → areas / zones
ALTER TABLE md_warehouse_locations DROP CONSTRAINT IF EXISTS fk_mwl_area;
ALTER TABLE md_warehouse_locations ADD CONSTRAINT fk_mwl_area
  FOREIGN KEY (area_id) REFERENCES md_warehouse_areas(id) ON DELETE SET NULL;

ALTER TABLE md_warehouse_locations DROP CONSTRAINT IF EXISTS fk_mwl_zone;
ALTER TABLE md_warehouse_locations ADD CONSTRAINT fk_mwl_zone
  FOREIGN KEY (zone_id) REFERENCES md_warehouse_zones(id) ON DELETE SET NULL;

-- -------------------------------------------
-- B3. NEW TABLES — STORAGE CONTRACT & BILLING
-- -------------------------------------------

-- B3a. Storage Contract
CREATE TABLE IF NOT EXISTS md_storage_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contract_number TEXT NOT NULL,
  customer_id UUID,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  area_id UUID REFERENCES md_warehouse_areas(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  committed_space NUMERIC(12, 2),
  uom_space TEXT DEFAULT 'PALLET' CHECK (uom_space IN ('PALLET', 'CBM', 'SQM')),
  max_overflow NUMERIC(12, 2) DEFAULT 0,
  billing_method TEXT NOT NULL DEFAULT 'MONTHLY_FIXED'
    CHECK (billing_method IN ('MONTHLY_FIXED', 'PER_TRANSACTION', 'HYBRID')),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_md_storage_contracts_tenant ON md_storage_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_storage_contracts_customer ON md_storage_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_md_storage_contracts_wh ON md_storage_contracts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_md_storage_contracts_status ON md_storage_contracts(status);

-- B3b. Billing Rate
CREATE TABLE IF NOT EXISTS md_billing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES md_storage_contracts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  charge_code TEXT NOT NULL CHECK (charge_code IN (
    'STR-FIX', 'STR-CBM', 'STR-SQM', 'STR-COLD',
    'HD-IN', 'HD-OUT', 'HD-PICK', 'HD-KIT', 'HD-ALAT', 'HD-DOC'
  )),
  rate_value NUMERIC(15, 2) NOT NULL,
  uom TEXT NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_md_billing_rates_contract ON md_billing_rates(contract_id);
CREATE INDEX IF NOT EXISTS idx_md_billing_rates_tenant ON md_billing_rates(tenant_id);

-- -------------------------------------------
-- B4. NEW TABLES — OPERATIONS
-- -------------------------------------------

-- B4a. Transformation Order (Kitting, Bundling, Break-Bulk, Repack)
CREATE TABLE IF NOT EXISTS wh_transformation_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  to_number TEXT NOT NULL,
  to_type TEXT NOT NULL CHECK (to_type IN ('BREAK_BULK', 'KITTING', 'BUNDLING', 'REPACK')),
  status TEXT NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  output_sku_id UUID REFERENCES md_product_skus(id) ON DELETE SET NULL,
  planned_output_qty NUMERIC(15, 2),
  actual_output_qty NUMERIC(15, 2),
  input_bom JSONB,
  location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  assigned_to UUID,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wh_transformation_orders_tenant ON wh_transformation_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_transformation_orders_type ON wh_transformation_orders(to_type);
CREATE INDEX IF NOT EXISTS idx_wh_transformation_orders_status ON wh_transformation_orders(status);

-- B4b. Temperature Log (Cold Chain IoT)
CREATE TABLE IF NOT EXISTS wh_temperature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES md_warehouse_zones(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  temperature_c NUMERIC(8, 2) NOT NULL,
  humidity_pct NUMERIC(8, 2),
  sensor_id TEXT,
  status TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (status IN ('NORMAL', 'HIGH_ALERT', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_wh_temperature_logs_zone ON wh_temperature_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_wh_temperature_logs_tenant ON wh_temperature_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_temperature_logs_recorded ON wh_temperature_logs(recorded_at);
CREATE INDEX IF NOT EXISTS idx_wh_temperature_logs_status ON wh_temperature_logs(status);

-- B4c. Inventory Movement Log (audit trail)
CREATE TABLE IF NOT EXISTS wh_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  inventory_id UUID NOT NULL REFERENCES wh_inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'INBOUND', 'OUTBOUND', 'TRANSFER', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS',
    'PICKING', 'PUTAWAY', 'KITTING_CONSUME', 'KITTING_OUTPUT'
  )),
  from_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  quantity NUMERIC(15, 2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wh_inventory_movements_inv ON wh_inventory_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_movements_tenant ON wh_inventory_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_movements_type ON wh_inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_wh_inventory_movements_created ON wh_inventory_movements(created_at);

-- B4d. Daily Stock Snapshot (for billing)
CREATE TABLE IF NOT EXISTS wh_daily_stock_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  contract_id UUID NOT NULL REFERENCES md_storage_contracts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  area_id UUID REFERENCES md_warehouse_areas(id) ON DELETE SET NULL,
  total_pallets NUMERIC(12, 2) DEFAULT 0,
  total_cbm NUMERIC(12, 2) DEFAULT 0,
  total_sqm NUMERIC(12, 2) DEFAULT 0,
  sku_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_daily_snapshot_contract ON wh_daily_stock_snapshots(contract_id);
CREATE INDEX IF NOT EXISTS idx_wh_daily_snapshot_date ON wh_daily_stock_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_wh_daily_snapshot_tenant ON wh_daily_stock_snapshots(tenant_id);

-- ============================================
-- C. ROW LEVEL SECURITY — All tables
-- ============================================
-- Use DROP IF EXISTS so script is idempotent
ALTER TABLE md_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_product_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_warehouse_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_warehouse_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_storage_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_billing_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_transformation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_daily_stock_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_md_warehouses ON md_warehouses;
CREATE POLICY tenant_isolation_md_warehouses ON md_warehouses
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_md_warehouse_locations ON md_warehouse_locations;
CREATE POLICY tenant_isolation_md_warehouse_locations ON md_warehouse_locations
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_md_product_skus ON md_product_skus;
CREATE POLICY tenant_isolation_md_product_skus ON md_product_skus
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_wh_inventory ON wh_inventory;
CREATE POLICY tenant_isolation_wh_inventory ON wh_inventory
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_wh_tasks ON wh_tasks;
CREATE POLICY tenant_isolation_wh_tasks ON wh_tasks
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_wh_task_items ON wh_task_items;
CREATE POLICY tenant_isolation_wh_task_items ON wh_task_items
  USING (task_id IN (SELECT id FROM wh_tasks WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

DROP POLICY IF EXISTS tenant_isolation_md_warehouse_areas ON md_warehouse_areas;
CREATE POLICY tenant_isolation_md_warehouse_areas ON md_warehouse_areas
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_md_warehouse_zones ON md_warehouse_zones;
CREATE POLICY tenant_isolation_md_warehouse_zones ON md_warehouse_zones
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_md_storage_contracts ON md_storage_contracts;
CREATE POLICY tenant_isolation_md_storage_contracts ON md_storage_contracts
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_md_billing_rates ON md_billing_rates;
CREATE POLICY tenant_isolation_md_billing_rates ON md_billing_rates
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_wh_transformation_orders ON wh_transformation_orders;
CREATE POLICY tenant_isolation_wh_transformation_orders ON wh_transformation_orders
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_wh_temperature_logs ON wh_temperature_logs;
CREATE POLICY tenant_isolation_wh_temperature_logs ON wh_temperature_logs
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS tenant_isolation_wh_inventory_movements ON wh_inventory_movements;
CREATE POLICY tenant_isolation_wh_inventory_movements ON wh_inventory_movements
  USING (inventory_id IN (
    SELECT id FROM wh_inventory WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  ));

DROP POLICY IF EXISTS tenant_isolation_wh_daily_stock_snapshots ON wh_daily_stock_snapshots;
CREATE POLICY tenant_isolation_wh_daily_stock_snapshots ON wh_daily_stock_snapshots
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
