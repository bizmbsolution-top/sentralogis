UPDATE job_orders
SET status = 'PEKERJAAN SELESAI', completed_at = now(), updated_at = now(), departure_detected_at = null
WHERE tenant_id = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff'
  AND status NOT IN ('COMPLETED', 'PEKERJAAN SELESAI', 'DONE', 'INVOICED', 'PAID', 'VERIFIED', 'READY_FOR_BILLING', 'AWAITING_AUDIT', 'REJECTED', 'CANCELLED', 'HANDOVER_REJECTED', 'draft');

UPDATE wo_items wi
SET status = 'COMPLETED', updated_at = now()
WHERE wi.wo_id IN (
  SELECT wo_id FROM job_orders
  WHERE tenant_id = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff' AND status = 'PEKERJAAN SELESAI' AND completed_at = now()
)
AND wi.status NOT IN ('COMPLETED', 'DONE', 'INVOICED', 'PAID', 'REJECTED', 'CANCELLED');

UPDATE md_fleets
SET status = 'available', updated_at = now()
WHERE entity_id = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff' AND status != 'available';

UPDATE md_drivers
SET status = 'available', is_working = false, updated_at = now()
WHERE tenant_id = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff' AND status != 'available';

SELECT status, count(*) as cnt FROM job_orders
WHERE tenant_id = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff'
GROUP BY status ORDER BY cnt DESC;
