-- Migration 095: Add Customer, Shipper, and Consignee to Logistics Orders
-- [AI] Ensures proper entity tracking and reporting across Inbound, Outbound, and Transfer modules

-- 1. wh_inbound_receipts
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS shipper_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wh_inbound_receipts_customer ON wh_inbound_receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_wh_inbound_receipts_shipper ON wh_inbound_receipts(shipper_id);

-- 2. wh_outbound_shipments
ALTER TABLE wh_outbound_shipments ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;
ALTER TABLE wh_outbound_shipments ADD COLUMN IF NOT EXISTS consignee_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wh_outbound_shipments_customer ON wh_outbound_shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_wh_outbound_shipments_consignee ON wh_outbound_shipments(consignee_id);

-- 3. wh_transfer_orders
-- Note: customer_id already exists from 029_wms_operational_schema.sql
ALTER TABLE wh_transfer_orders ADD COLUMN IF NOT EXISTS consignee_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wh_transfer_orders_consignee ON wh_transfer_orders(consignee_id);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';

SELECT '095_inbound_outbound_transfer_contacts OK' AS result;
