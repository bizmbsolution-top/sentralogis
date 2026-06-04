-- Migration 076: Enable public SELECT for Inbound/Outbound receipts for PWA Portal
-- The PWA Portal uses anon key (localStorage session) so we need public access policies.
-- Application-level filtering is applied in the frontend code.

-- Inbound Receipts
DROP POLICY IF EXISTS "Enable public SELECT for inbound receipts" ON wh_inbound_receipts;
CREATE POLICY "Enable public SELECT for inbound receipts" ON wh_inbound_receipts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for inbound receipts" ON wh_inbound_receipts;
CREATE POLICY "Enable public UPDATE for inbound receipts" ON wh_inbound_receipts FOR UPDATE USING (true);

-- Inbound Receipt Items
DROP POLICY IF EXISTS "Enable public SELECT for inbound receipt items" ON wh_inbound_receipt_items;
CREATE POLICY "Enable public SELECT for inbound receipt items" ON wh_inbound_receipt_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for inbound receipt items" ON wh_inbound_receipt_items;
CREATE POLICY "Enable public UPDATE for inbound receipt items" ON wh_inbound_receipt_items FOR UPDATE USING (true);

-- Product SKUs & Entities (Needed for joins)
DROP POLICY IF EXISTS "Enable public SELECT for product skus" ON md_product_skus;
CREATE POLICY "Enable public SELECT for product skus" ON md_product_skus FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public SELECT for entities" ON md_entities;
CREATE POLICY "Enable public SELECT for entities" ON md_entities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public SELECT for drivers" ON md_drivers;
CREATE POLICY "Enable public SELECT for drivers" ON md_drivers FOR SELECT USING (true);

-- Inventory (Putaway Needs this)
DROP POLICY IF EXISTS "Enable public INSERT for inventory" ON wh_inventory;
CREATE POLICY "Enable public INSERT for inventory" ON wh_inventory FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable public UPDATE for inventory" ON wh_inventory;
CREATE POLICY "Enable public UPDATE for inventory" ON wh_inventory FOR UPDATE USING (true);

-- Milestone Logs
DROP POLICY IF EXISTS "Enable public INSERT for milestone logs" ON wh_milestone_logs;
CREATE POLICY "Enable public INSERT for milestone logs" ON wh_milestone_logs FOR INSERT WITH CHECK (true);
