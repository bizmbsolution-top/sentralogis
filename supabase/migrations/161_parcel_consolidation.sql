-- 161_parcel_consolidation.sql
-- Tables for Parcel Consolidation & Dispatch Hub (Multi-Shipper LCL/Parcel Consolidation)

CREATE TABLE IF NOT EXISTS wh_master_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id),
  job_order_id UUID REFERENCES job_orders(id),
  master_box_code TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  consignee_name TEXT NOT NULL,
  consignee_address TEXT,
  total_parcels INTEGER DEFAULT 0,
  total_weight_kg NUMERIC(12, 2) DEFAULT 0,
  total_cbm NUMERIC(12, 4) DEFAULT 0,
  packing_material TEXT DEFAULT 'Kardus Master L',
  status TEXT NOT NULL DEFAULT 'SEALED', -- SEALED, DISPATCHED
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wh_parcel_inbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id),
  customer_id UUID REFERENCES md_entities(id),
  parcel_code TEXT NOT NULL,
  shipper_name TEXT NOT NULL,
  consignee_name TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  consignee_address TEXT,
  qty INTEGER DEFAULT 1,
  weight_kg NUMERIC(12, 2) DEFAULT 0,
  length_cm NUMERIC(10, 2) DEFAULT 0,
  width_cm NUMERIC(10, 2) DEFAULT 0,
  height_cm NUMERIC(10, 2) DEFAULT 0,
  cbm NUMERIC(12, 4) DEFAULT 0,
  location_id UUID REFERENCES md_warehouse_locations(id),
  status TEXT NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, CONSOLIDATED, DISPATCHED
  master_box_id UUID REFERENCES wh_master_boxes(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE wh_master_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_parcel_inbound ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read for authenticated users on wh_master_boxes" ON wh_master_boxes FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated users on wh_master_boxes" ON wh_master_boxes FOR ALL USING (true);

CREATE POLICY "Enable read for authenticated users on wh_parcel_inbound" ON wh_parcel_inbound FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated users on wh_parcel_inbound" ON wh_parcel_inbound FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_parcel_inbound_city ON wh_parcel_inbound(destination_city, status);
CREATE INDEX IF NOT EXISTS idx_parcel_inbound_master_box ON wh_parcel_inbound(master_box_id);
CREATE INDEX IF NOT EXISTS idx_master_boxes_warehouse ON wh_master_boxes(warehouse_id);
