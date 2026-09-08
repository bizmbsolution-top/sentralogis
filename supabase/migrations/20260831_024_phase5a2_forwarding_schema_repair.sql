-- ==========================================
-- Migration 024: Phase 5A-2 Forwarding Schema Repair
-- Date: 2026-08-31
-- Purpose: Repair broken forwarding schema:
--   - fw_locations: add tenant_id + RLS
--   - fw_order_headers: create with corrected schema (tenant_id, RLS, no broken enums)
--   - fw_legs: create with corrected schema (tenant_id, RLS, fix syntax, no broken enums)
--   - fw_price_master: add missing columns from failed migration 178
-- ==========================================

-- ==========================================
-- 1. fw_locations: add tenant_id + RLS
-- ==========================================
ALTER TABLE IF EXISTS public.fw_locations 
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

CREATE INDEX IF NOT EXISTS idx_fw_locations_tenant ON public.fw_locations(tenant_id);

ALTER TABLE IF EXISTS public.fw_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fw_locations_tenant_isolation" ON public.fw_locations;
CREATE POLICY "fw_locations_tenant_isolation" ON public.fw_locations
FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ==========================================
-- 2. fw_order_headers: create with corrected schema
-- ==========================================
CREATE TABLE IF NOT EXISTS public.fw_order_headers (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  wo_id UUID NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  vessel_name TEXT,
  voyage_no TEXT,
  etd DATE,
  eta DATE,
  origin_port_id UUID NOT NULL REFERENCES fw_locations(location_id) ON DELETE RESTRICT,
  dest_port_id UUID NOT NULL REFERENCES fw_locations(location_id) ON DELETE RESTRICT,
  cargo_owner_name TEXT,
  cargo_owner_email TEXT,
  cargo_owner_phone TEXT,
  consignee_name TEXT,
  consignee_email TEXT,
  consignee_phone TEXT,
  tracking_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'need_assignment', 'assigned', 'in_transit', 'delivered', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_order_headers_wo_id ON public.fw_order_headers(wo_id);
CREATE INDEX IF NOT EXISTS idx_fw_order_headers_tracking_token ON public.fw_order_headers(tracking_token);
CREATE INDEX IF NOT EXISTS idx_fw_order_headers_customer_id ON public.fw_order_headers(customer_id);
CREATE INDEX IF NOT EXISTS idx_fw_order_headers_status ON public.fw_order_headers(status);
CREATE INDEX IF NOT EXISTS idx_fw_order_headers_tenant ON public.fw_order_headers(tenant_id);

ALTER TABLE IF EXISTS public.fw_order_headers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fw_order_headers_tenant_isolation" ON public.fw_order_headers;
CREATE POLICY "fw_order_headers_tenant_isolation" ON public.fw_order_headers
FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ==========================================
-- 3. fw_legs: create with corrected schema
-- ==========================================
CREATE TABLE IF NOT EXISTS public.fw_legs (
  leg_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES fw_order_headers(order_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  leg_type TEXT NOT NULL DEFAULT 'SEA' CHECK (leg_type IN ('SEA', 'LAND', 'AIR', 'CONSOLIDATION')),
  start_location_id UUID NOT NULL REFERENCES fw_locations(location_id) ON DELETE RESTRICT,
  end_location_id UUID NOT NULL REFERENCES fw_locations(location_id) ON DELETE RESTRICT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  execution_mode TEXT NOT NULL DEFAULT 'OWN' CHECK (execution_mode IN ('OWN', 'VENDOR')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_legs_order ON public.fw_legs(order_id);
CREATE INDEX IF NOT EXISTS idx_fw_legs_leg_type ON public.fw_legs(leg_type);
CREATE INDEX IF NOT EXISTS idx_fw_legs_status ON public.fw_legs(status);
CREATE INDEX IF NOT EXISTS idx_fw_legs_tenant ON public.fw_legs(tenant_id);

ALTER TABLE IF EXISTS public.fw_legs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fw_legs_tenant_isolation" ON public.fw_legs;
CREATE POLICY "fw_legs_tenant_isolation" ON public.fw_legs
FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ==========================================
-- 4. fw_price_master: add missing columns from failed migration 178
-- ==========================================
ALTER TABLE IF EXISTS public.fw_price_master
  ADD COLUMN IF NOT EXISTS tracking_token TEXT,
  ADD COLUMN IF NOT EXISTS sub_type TEXT NOT NULL DEFAULT 'standard' CHECK (sub_type IN ('standard', 'fragile', 'hazardous', 'temperature_controlled')),
  ADD COLUMN IF NOT EXISTS cargo_owner_id UUID REFERENCES customers(customer_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS vendor_origin_cost_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS vendor_destination_cost_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS master_cost_origin_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS master_cost_destination_amount NUMERIC(18,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_fw_price_master_tracking_token ON public.fw_price_master(tracking_token);
CREATE INDEX IF NOT EXISTS idx_fw_price_master_sub_type ON public.fw_price_master(sub_type);
CREATE INDEX IF NOT EXISTS idx_fw_price_master_cargo_owner_id ON public.fw_price_master(cargo_owner_id);

-- ==========================================
-- 5. Verification
-- ==========================================
SELECT 'phase5a2_forwarding_schema_repair' AS migration_name;
