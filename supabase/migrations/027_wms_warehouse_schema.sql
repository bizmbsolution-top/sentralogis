-- WMS (Warehouse Management System) — Foundation Schema
-- Eksekusi di Supabase SQL Editor
-- Semua tabel menggunakan IF NOT EXISTS untuk mencegah duplicate

-- ============================================
-- 1. MASTER DATA GUDANG
-- ============================================

-- 1a. Daftar Gedung / Warehouse
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

-- 1b. Zona / Rak / Bin dalam Gudang
CREATE TABLE IF NOT EXISTS md_warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  zone TEXT,
  rack TEXT,
  shelf TEXT,
  bin TEXT,
  location_type TEXT NOT NULL DEFAULT 'STORAGE' CHECK (location_type IN ('STORAGE', 'PICKING', 'RECEIVING', 'SHIPPING', 'QUARANTINE', 'RETURN')),
  max_weight_kg NUMERIC(12, 2),
  max_volume_m3 NUMERIC(12, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_md_warehouse_locations_wh ON md_warehouse_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_md_warehouse_locations_tenant ON md_warehouse_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_warehouse_locations_code ON md_warehouse_locations(code);

-- ============================================
-- 2. MASTER DATA SKU / PRODUK
-- ============================================
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

-- ============================================
-- 3. OPERASIONAL WMS
-- ============================================

-- 3a. Inventory / Stok Aktual
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

-- 3b. Task Gudang (pengganti job_orders khusus WMS)
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

-- 3c. Detail Barang per Task
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
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE md_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_product_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_task_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: tenant isolation
CREATE POLICY tenant_isolation_md_warehouses ON md_warehouses
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_md_warehouse_locations ON md_warehouse_locations
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_md_product_skus ON md_product_skus
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_wh_inventory ON wh_inventory
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_wh_tasks ON wh_tasks
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY tenant_isolation_wh_task_items ON wh_task_items
  USING (task_id IN (SELECT id FROM wh_tasks WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())));
