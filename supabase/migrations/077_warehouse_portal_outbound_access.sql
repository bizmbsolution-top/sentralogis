-- Enable public access for warehouse portal (anon client) for outbound shipments

DROP POLICY IF EXISTS "Enable public SELECT for outbound shipments" ON wh_outbound_shipments;
CREATE POLICY "Enable public SELECT for outbound shipments" ON wh_outbound_shipments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for outbound shipments" ON wh_outbound_shipments;
CREATE POLICY "Enable public UPDATE for outbound shipments" ON wh_outbound_shipments FOR UPDATE USING (true);

-- Enable public access for outbound shipment items
DROP POLICY IF EXISTS "Enable public SELECT for outbound shipment items" ON wh_outbound_shipment_items;
CREATE POLICY "Enable public SELECT for outbound shipment items" ON wh_outbound_shipment_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for outbound shipment items" ON wh_outbound_shipment_items;
CREATE POLICY "Enable public UPDATE for outbound shipment items" ON wh_outbound_shipment_items FOR UPDATE USING (true);
