-- Fix: Drop existing policies then re-create (safe to re-run)
DROP POLICY IF EXISTS "Enable ALL for authenticated" ON md_warehouse_staff;
DROP POLICY IF EXISTS "Enable ALL for authenticated" ON wh_staff_attendance;
DROP POLICY IF EXISTS "Enable ALL for authenticated" ON wh_jo_staff_assignments;
DROP POLICY IF EXISTS "Enable public SELECT for login" ON md_warehouse_staff;
DROP POLICY IF EXISTS "Enable public SELECT for attendance" ON wh_staff_attendance;
DROP POLICY IF EXISTS "Enable public INSERT for attendance" ON wh_staff_attendance;
DROP POLICY IF EXISTS "Enable public UPDATE for attendance" ON wh_staff_attendance;
DROP POLICY IF EXISTS "Enable public SELECT for assignments" ON wh_jo_staff_assignments;
DROP POLICY IF EXISTS "Enable public UPDATE for assignments" ON wh_jo_staff_assignments;

CREATE POLICY "Enable ALL for authenticated" ON md_warehouse_staff FOR ALL USING (true);
CREATE POLICY "Enable ALL for authenticated" ON wh_staff_attendance FOR ALL USING (true);
CREATE POLICY "Enable ALL for authenticated" ON wh_jo_staff_assignments FOR ALL USING (true);
CREATE POLICY "Enable public SELECT for login" ON md_warehouse_staff FOR SELECT USING (true);
CREATE POLICY "Enable public SELECT for attendance" ON wh_staff_attendance FOR SELECT USING (true);
CREATE POLICY "Enable public INSERT for attendance" ON wh_staff_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public UPDATE for attendance" ON wh_staff_attendance FOR UPDATE USING (true);
CREATE POLICY "Enable public SELECT for assignments" ON wh_jo_staff_assignments FOR SELECT USING (true);
CREATE POLICY "Enable public UPDATE for assignments" ON wh_jo_staff_assignments FOR UPDATE USING (true);

-- Then run backfill
INSERT INTO wh_jo_staff_assignments (tenant_id, jo_id, receipt_id, staff_id, assigned_role, assigned_by, status)
SELECT
  r.tenant_id,
  r.wo_item_id AS jo_id,
  r.id AS receipt_id,
  s.id AS staff_id,
  s.role AS assigned_role,
  NULL AS assigned_by,
  'ASSIGNED' AS status
FROM wh_inbound_receipts r
CROSS JOIN LATERAL (
  SELECT id, role FROM md_warehouse_staff
  WHERE warehouse_id = r.warehouse_id
    AND is_active = true
    AND role IN ('SECURITY', 'TALLY', 'PUTAWAY')
) s
WHERE r.wo_item_id IS NOT NULL
  AND r.status NOT IN ('COMPLETED', 'CANCELLED')
  AND NOT EXISTS (
    SELECT 1 FROM wh_jo_staff_assignments a
    WHERE a.jo_id = r.wo_item_id
      AND a.staff_id = s.id
  )
ON CONFLICT (jo_id, staff_id) DO NOTHING;

SELECT COUNT(*) AS total_assignments FROM wh_jo_staff_assignments;
