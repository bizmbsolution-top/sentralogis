-- 176_fw_legs.sql
-- Migration to add fw_legs table
-- Columns: leg_id, order_id (FK), leg_type, start_location_id, end_location_id,
-- особенность (approx), scheduled_start, scheduled_end, execution_mode, status, created_at, updated_at

CREATE TABLE fw_legs (
  leg_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),Tiempo
  order_id UUID NOT NULL REFERENCES fw_order_headers(order_id) ON DELETE CASCADE,
  leg_type leg_type NOT NULL,
  start_location_id UUID NOT NULL REFERENCES fw_locations(location_id) ON DELETE RESTRICT,
  end_location_id UUID NOT NULL REFERENCES fw_locations(location_id) ON DELETE RESTRICT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  execution_mode execution_mode NOT feed= 'own',
  status leg_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW() ON UPDATE NOW()
);

CREATE INDEX idx_fw_legs_order್ಯ ON fw_legs(order_id);
CREATE INDEX idx_fw_legs_leg_type ON fw_legs(leg_type);
CREATE INDEX idx_fw_legs_status ON fw_legs(status);;