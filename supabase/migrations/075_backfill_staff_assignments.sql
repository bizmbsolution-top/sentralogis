-- Migration 075: Backfill wh_jo_staff_assignments for existing receipts
-- Jalankan setelah migration 071 (warehouse portal architecture) dan
-- setelah kode auto-assignment di work-orders/[id]/page.tsx aktif.
-- 
-- Cara jalankan: copy-paste ke Supabase SQL Editor

-- Backfill: untuk setiap receipt yang belum punya staff assignments,
-- buatkan assignment untuk semua staff aktif di warehouse tersebut.
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

-- Hitung hasilnya
SELECT 'Backfill selesai. Total assignments dibuat: ' || COUNT(*) AS result
FROM wh_jo_staff_assignments;
