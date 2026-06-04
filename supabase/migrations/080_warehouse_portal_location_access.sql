-- Migration 080: Enable public SELECT for md_warehouse_locations for PWA Portal
-- The PWA Portal needs to read the location code from the database using anon key

DROP POLICY IF EXISTS "Enable public SELECT for warehouse locations" ON md_warehouse_locations;
CREATE POLICY "Enable public SELECT for warehouse locations" ON md_warehouse_locations FOR SELECT USING (true);
