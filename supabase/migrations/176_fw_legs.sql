-- 176_fw_legs.sql
-- Migration to add fw_legs table
-- Columns: leg_id, order_id (FK), leg_type, start_location_id, end_location_id,
-- особенность (approx), scheduled_start, scheduled_end, execution_mode, status, created_at, updated_at

CREATE TABLE public.fw_legs (
  leg_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.fw_order_headers(order_id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  leg_type TEXT NOT NULL DEFAULT 'SEA' CHECK (leg_type IN ('SEA', 'LAND', 'AIR', 'CONSOLIDATION')),
  start_location_id UUID NOT NULL REFERENCES public.fw_locations(location_id) ON DELETE RESTRICT,
  end_location_id UUID NOT NULL REFERENCES public.fw_locations(location_id) ON DELETE RESTRICT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  execution_mode TEXT NOT NULL DEFAULT 'OWN' CHECK (execution_mode IN ('OWN', 'VENDOR')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fw_legs_order ON public.fw_legs(order_id);
CREATE INDEX idx_fw_legs_leg_type ON public.fw_legs(leg_type);
CREATE INDEX idx_fw_legs_status ON public.fw_legs(status);
CREATE INDEX idx_fw_legs_tenant ON public.fw_legs(tenant_id);

ALTER TABLE public.fw_legs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fw_legs_tenant_isolation" ON public.fw_legs
FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());