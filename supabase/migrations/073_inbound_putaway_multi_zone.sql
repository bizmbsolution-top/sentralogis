-- Migration 073: Inbound Putaway Multi-Zone Support
-- Add putaway_location_id to wh_inbound_receipt_items for good stock rack assignment

ALTER TABLE wh_inbound_receipt_items
  ADD COLUMN IF NOT EXISTS putaway_location_id UUID REFERENCES md_warehouse_locations(id);

ALTER TABLE wh_inbound_receipt_items
  ADD COLUMN IF NOT EXISTS putaway_at TIMESTAMPTZ;

SELECT '073_inbound_putaway_multi_zone executed successfully' as result;
