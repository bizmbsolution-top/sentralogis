-- Migration 079: Enable public SELECT for jo_warehouse_assignments & wo_item_manifests for PWA Portal
-- The PWA Portal uses anon key (localStorage session) so we need public access policies for assignments

DROP POLICY IF EXISTS "Enable public SELECT for jo_warehouse_assignments" ON jo_warehouse_assignments;
CREATE POLICY "Enable public SELECT for jo_warehouse_assignments" ON jo_warehouse_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public SELECT for wo_item_manifests" ON wo_item_manifests;
CREATE POLICY "Enable public SELECT for wo_item_manifests" ON wo_item_manifests FOR SELECT USING (true);
