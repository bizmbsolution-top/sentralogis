-- 178_fw_price_master.sql
-- Migration to add missing fields to fw_price_master
-- Add tracking_token, sub_type, cargo_owner_id, vendor_origin_cost_breakdown, vendor_destination_cost_breakdown
-- Modify column sizes maybe

ALTER TABLE fw_price_master 
  ADD COLUMN tracking_token TEXT,
  ADD COLUMN sub_type sub_type NOT NULL DEFAULT 'standard',
  ADD COLUMN cargo_owner_id UUID REFERENCES customers(customer_id) ON DELETE RESTRICT,
  ADD COLUMN vendor_origin_cost_breakdown JSONB,
  ADD COLUMN vendor_destination_cost_breakdown JSONB,
  ADD COLUMN master_cost_origin_amount NUMERIC(18,2),
  ADD COLUMN master_cost_destination_amount NUMERIC(18,2);

-- Index for performance
CREATE INDEX idx_fw_price_master_tracking_token ON fw_price_master(tracking_token);
CREATE INDEX idx_fw_price_master_sub_type ON fw_price_master(sub_type);
CREATE INDEX idx_fw_price_master_cargo_owner_id ON fw_price_master(cargo_owner_id);
}