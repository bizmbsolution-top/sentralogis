-- Migration 143: Stock Opname Headers & Items
CREATE TABLE IF NOT EXISTS wh_stock_opname (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  opname_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'   
    CHECK (status IN ('DRAFT','IN_PROGRESS','REVIEW','APPROVED','CANCELLED')),
  opname_type TEXT NOT NULL DEFAULT 'FULL'
    CHECK (opname_type IN ('FULL','PARTIAL','CYCLE_COUNT')),
  schedule_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_stock_opname_tenant ON wh_stock_opname(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_stock_opname_warehouse ON wh_stock_opname(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_stock_opname_status ON wh_stock_opname(status);

CREATE TABLE IF NOT EXISTS wh_stock_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_id UUID NOT NULL REFERENCES wh_stock_opname(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id),
  location_id UUID REFERENCES md_warehouse_locations(id),
  system_qty NUMERIC(15,2) NOT NULL DEFAULT 0,
  counted_qty NUMERIC(15,2),
  variance NUMERIC(15,2) GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - system_qty) STORED,
  variance_pct NUMERIC(8,2) GENERATED ALWAYS AS (
    CASE WHEN system_qty > 0 THEN ((COALESCE(counted_qty, 0) - system_qty) / system_qty) * 100 ELSE 0 END
  ) STORED,
  count_status TEXT DEFAULT 'PENDING' CHECK (count_status IN ('PENDING','COUNTED','VERIFIED')),
  counted_by UUID,
  counted_at TIMESTAMPTZ,
  batch_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_stock_opname_items_opname ON wh_stock_opname_items(opname_id);
CREATE INDEX IF NOT EXISTS idx_wh_stock_opname_items_sku ON wh_stock_opname_items(product_sku_id);

-- Enable RLS
ALTER TABLE wh_stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_stock_opname_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "wh_stock_opname_tenant_users_select" ON wh_stock_opname
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = wh_stock_opname.tenant_id AND tenant_users.user_id = auth.uid())
  );

CREATE POLICY "wh_stock_opname_tenant_users_insert" ON wh_stock_opname
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = wh_stock_opname.tenant_id AND tenant_users.user_id = auth.uid())
  );

CREATE POLICY "wh_stock_opname_tenant_users_update" ON wh_stock_opname
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = wh_stock_opname.tenant_id AND tenant_users.user_id = auth.uid())
  );

CREATE POLICY "wh_stock_opname_items_select" ON wh_stock_opname_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = wh_stock_opname_items.tenant_id AND tenant_users.user_id = auth.uid())
  );

CREATE POLICY "wh_stock_opname_items_insert" ON wh_stock_opname_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = wh_stock_opname_items.tenant_id AND tenant_users.user_id = auth.uid())
  );

CREATE POLICY "wh_stock_opname_items_update" ON wh_stock_opname_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM tenant_users WHERE tenant_users.tenant_id = wh_stock_opname_items.tenant_id AND tenant_users.user_id = auth.uid())
  );
