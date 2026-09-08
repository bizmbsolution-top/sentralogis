-- 175_fw_order_headers.sql
-- Migration to add fw_order_headers table
-- Columns: order_id (UUID), wo_id (UUID FK to work_orders), customer_id, vessel_name, voyage_no,
-- etd, eta, origin_port_id, dest_port_id (FK to fw_locations),
-- cargo_owner_name, cargo_owner_email, cargo_owner_phone, consignee_name, consignee_email, consignee_phone,
-- tracking_token (unique), status, created_at, updated_at

CREATE TABLE public.fw_order_headers (
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

CREATE INDEX idx_fw_order_headers_wo_id ON public.fw_order_headers(wo_id);
CREATE INDEX idx_fw_order_headers_tracking_token ON public.fw_order_headers(tracking_token);
CREATE INDEX idx_fw_order_headers_customer_id ON public.fw_order_headers(customer_id);
CREATE INDEX idx_fw_order_headers_status ON public.fw_order_headers(status);
CREATE INDEX idx_fw_order_headers_tenant ON public.fw_order_headers(tenant_id);

ALTER TABLE public.fw_order_headers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fw_order_headers_tenant_isolation" ON public.fw_order_headers
FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());