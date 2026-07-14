-- Add wo_item_id to wh_transfer_orders to link transfers directly to work orders
ALTER TABLE wh_transfer_orders ADD COLUMN IF NOT EXISTS wo_item_id UUID REFERENCES wo_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wh_transfer_orders_wo_item ON wh_transfer_orders(wo_item_id);
