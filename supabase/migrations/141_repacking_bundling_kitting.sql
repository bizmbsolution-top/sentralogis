-- ============================================
-- 6. REPACKING, BUNDLING & KITTING
-- ============================================

-- 6.1 Repacking Orders (Repacking/Bundling/Kitting Tasks)
CREATE TABLE IF NOT EXISTS wh_repacking_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('REPACKING', 'BUNDLING', 'KITTING')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_wh_repacking_orders_tenant ON wh_repacking_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_repacking_orders_warehouse ON wh_repacking_orders(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wh_repacking_orders_type ON wh_repacking_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_wh_repacking_orders_status ON wh_repacking_orders(status);

-- 6.2 Repacking Items (Source + Result Items)
CREATE TABLE IF NOT EXISTS wh_repacking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repacking_order_id UUID NOT NULL REFERENCES wh_repacking_orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  product_sku_id UUID NOT NULL REFERENCES md_product_skus(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('SOURCE', 'RESULT')),
  quantity NUMERIC(15,2) NOT NULL,
  unit_cost NUMERIC(15,2),
  source_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  target_location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL,
  batch_number TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_repacking_items_order ON wh_repacking_items(repacking_order_id);
CREATE INDEX IF NOT EXISTS idx_wh_repacking_items_product ON wh_repacking_items(product_sku_id);
CREATE INDEX IF NOT EXISTS idx_wh_repacking_items_type ON wh_repacking_items(item_type);

-- 6.3 Enable Row Level Security
ALTER TABLE wh_repacking_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_repacking_items ENABLE ROW LEVEL SECURITY;

-- 6.4 RLS Policies for wh_repacking_orders
CREATE POLICY "wh_repacking_orders_tenant_users_select" ON wh_repacking_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = wh_repacking_orders.tenant_id
      AND tenant_users.user_id = auth.uid()
    )
  );

CREATE POLICY "wh_repacking_orders_tenant_users_insert" ON wh_repacking_orders
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = wh_repacking_orders.tenant_id
      AND tenant_users.user_id = auth.uid()
    )
  );

CREATE POLICY "wh_repacking_orders_tenant_users_update" ON wh_repacking_orders
  FOR UPDATE USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = wh_repacking_orders.tenant_id
      AND tenant_users.user_id = auth.uid()
    )
  );

-- 6.5 RLS Policies for wh_repacking_items
CREATE POLICY "wh_repacking_items_order_access_select" ON wh_repacking_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wh_repacking_orders
      WHERE wh_repacking_orders.id = wh_repacking_items.repacking_order_id
      AND EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_users.tenant_id = wh_repacking_orders.tenant_id
        AND tenant_users.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "wh_repacking_items_order_access_insert" ON wh_repacking_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wh_repacking_orders
      WHERE wh_repacking_orders.id = wh_repacking_items.repacking_order_id
      AND wh_repacking_orders.tenant_id = wh_repacking_items.tenant_id
      AND wh_repacking_orders.warehouse_id = wh_repacking_items.warehouse_id
      AND EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_users.tenant_id = wh_repacking_orders.tenant_id
        AND tenant_users.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "wh_repacking_items_order_access_update" ON wh_repacking_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM wh_repacking_orders
      WHERE wh_repacking_orders.id = wh_repacking_items.repacking_order_id
      AND wh_repacking_orders.tenant_id = wh_repacking_items.tenant_id
      AND wh_repacking_orders.warehouse_id = wh_repacking_items.warehouse_id
      AND EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_users.tenant_id = wh_repacking_orders.tenant_id
        AND tenant_users.user_id = auth.uid()
      )
    )
  );
