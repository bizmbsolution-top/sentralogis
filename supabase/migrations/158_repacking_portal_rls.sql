-- Migration 158: Enable public SELECT/UPDATE for Repacking Orders & Items (Portal Access)
-- Similar to 076_warehouse_portal_receipt_access.sql for isolated WA+PIN staff portal.

DROP POLICY IF EXISTS "Enable public SELECT for repacking orders" ON wh_repacking_orders;
CREATE POLICY "Enable public SELECT for repacking orders" ON wh_repacking_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for repacking orders" ON wh_repacking_orders;
CREATE POLICY "Enable public UPDATE for repacking orders" ON wh_repacking_orders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable public SELECT for repacking items" ON wh_repacking_items;
CREATE POLICY "Enable public SELECT for repacking items" ON wh_repacking_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for repacking items" ON wh_repacking_items;
CREATE POLICY "Enable public UPDATE for repacking items" ON wh_repacking_items FOR UPDATE USING (true);
