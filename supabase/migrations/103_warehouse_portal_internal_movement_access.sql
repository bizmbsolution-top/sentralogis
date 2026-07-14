-- Migration 103: Enable public SELECT for wh_internal_movements for PWA Portal
-- The PWA Portal uses anon key (localStorage session) so we need public access policies.
-- Application-level filtering is applied in the frontend code.

DROP POLICY IF EXISTS tenant_isolation_wh_internal_movements ON wh_internal_movements;
CREATE POLICY "Enable public SELECT for internal movements" ON wh_internal_movements
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for internal movements" ON wh_internal_movements;
CREATE POLICY "Enable public UPDATE for internal movements" ON wh_internal_movements
  FOR UPDATE USING (true);
