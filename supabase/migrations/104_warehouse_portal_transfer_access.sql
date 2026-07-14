-- Migration 104: Enable public SELECT for transfer tables for PWA Portal
-- The PWA Portal uses anon key (localStorage session) so we need public access policies.

DROP POLICY IF EXISTS "Enable public SELECT for transfer orders" ON wh_transfer_orders;
CREATE POLICY "Enable public SELECT for transfer orders" ON wh_transfer_orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for transfer orders" ON wh_transfer_orders;
CREATE POLICY "Enable public UPDATE for transfer orders" ON wh_transfer_orders
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable public SELECT for transfer details" ON wh_transfer_details;
CREATE POLICY "Enable public SELECT for transfer details" ON wh_transfer_details
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable public UPDATE for transfer details" ON wh_transfer_details;
CREATE POLICY "Enable public UPDATE for transfer details" ON wh_transfer_details
  FOR UPDATE USING (true);
