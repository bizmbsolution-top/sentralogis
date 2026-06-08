-- 092_add_outbound_picking_entries.sql
ALTER TABLE wh_outbound_shipment_items ADD COLUMN IF NOT EXISTS picking_entries JSONB DEFAULT '[]'::jsonb;
NOTIFY pgrst, 'reload schema';
