-- Migration 111: SLA Timestamp Columns + Auto-Set Trigger + Backfill from Audit Logs
-- Adds dedicated timestamp columns on work_orders for each SLA stage transition.
-- Trigger auto-populates them on status change going forward.
-- Backfill block derives timestamps from wo_audit_logs for historical WOs.

-- ============================================
-- 1. ADD TIMESTAMP COLUMNS
-- ============================================
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS ready_billing_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ============================================
-- 2. TRIGGER: auto-set timestamps on status change
-- ============================================
CREATE OR REPLACE FUNCTION set_wo_sla_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- SLA 1: Draft → Submitted (need_assignment / pending / menunggu_wh_eksekusi)
  IF OLD.status = 'draft' AND NEW.status IN ('need_assignment', 'pending', 'menunggu_wh_eksekusi') THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, NOW());
  END IF;

  -- SLA 2: Submitted → Assigned
  IF OLD.status IN ('need_assignment', 'pending', 'menunggu_wh_eksekusi', 'handover_pending') 
     AND NEW.status IN ('assigned', 'in_progress') THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, NOW());
  END IF;

  -- WO completed (auto-completed by trigger 097 when all JOs done)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  END IF;

  -- WO paid
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_wo_sla_timestamps ON work_orders;
CREATE TRIGGER trg_set_wo_sla_timestamps
  BEFORE UPDATE OF status ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_wo_sla_timestamps();

-- ============================================
-- 3. BACKFILL from wo_audit_logs
-- ============================================
-- Derive submitted_at from audit logs: status changed FROM 'draft' TO something else
UPDATE work_orders wo
SET submitted_at = sub.transition_at
FROM (
  SELECT entity_id, MIN(performed_at) AS transition_at
  FROM wo_audit_logs
  WHERE entity_type = 'work_order'
    AND 'status' = ANY(changed_fields)
    AND old_data->>'status' = 'draft'
    AND new_data->>'status' IN ('need_assignment', 'pending', 'menunggu_wh_eksekusi')
  GROUP BY entity_id
) sub
WHERE wo.id = sub.entity_id
  AND wo.submitted_at IS NULL;

-- Derive assigned_at: status changed TO 'assigned' or 'in_progress'
UPDATE work_orders wo
SET assigned_at = sub.transition_at
FROM (
  SELECT entity_id, MIN(performed_at) AS transition_at
  FROM wo_audit_logs
  WHERE entity_type = 'work_order'
    AND 'status' = ANY(changed_fields)
    AND new_data->>'status' IN ('assigned', 'in_progress')
  GROUP BY entity_id
) sub
WHERE wo.id = sub.entity_id
  AND wo.assigned_at IS NULL;

-- Derive completed_at: status changed TO 'completed'
UPDATE work_orders wo
SET completed_at = sub.transition_at
FROM (
  SELECT entity_id, MIN(performed_at) AS transition_at
  FROM wo_audit_logs
  WHERE entity_type = 'work_order'
    AND 'status' = ANY(changed_fields)
    AND new_data->>'status' = 'completed'
  GROUP BY entity_id
) sub
WHERE wo.id = sub.entity_id
  AND wo.completed_at IS NULL;

-- Derive paid_at: status changed TO 'paid'
UPDATE work_orders wo
SET paid_at = sub.transition_at
FROM (
  SELECT entity_id, MIN(performed_at) AS transition_at
  FROM wo_audit_logs
  WHERE entity_type = 'work_order'
    AND 'status' = ANY(changed_fields)
    AND new_data->>'status' = 'paid'
  GROUP BY entity_id
) sub
WHERE wo.id = sub.entity_id
  AND wo.paid_at IS NULL;

-- ============================================
-- 4. FALLBACK BACKFILL for WOs without audit logs
-- ============================================
-- For WOs that existed before audit trigger (mig 107) was applied,
-- estimate timestamps from updated_at / created_at.

-- If status is not 'draft' and submitted_at is still null, use created_at + 5 min as estimate
UPDATE work_orders
SET submitted_at = created_at + INTERVAL '5 minutes'
WHERE status != 'draft'
  AND submitted_at IS NULL;

-- If status is 'assigned','in_progress','completed','paid' and assigned_at is null
UPDATE work_orders
SET assigned_at = COALESCE(submitted_at, created_at) + INTERVAL '30 minutes'
WHERE status IN ('assigned', 'in_progress', 'completed', 'paid')
  AND assigned_at IS NULL;

-- If status is 'completed' or 'paid' and completed_at is null
UPDATE work_orders
SET completed_at = COALESCE(assigned_at, submitted_at, created_at) + INTERVAL '1 day'
WHERE status IN ('completed', 'paid')
  AND completed_at IS NULL;

-- If status is 'paid' and paid_at is null
UPDATE work_orders
SET paid_at = updated_at
WHERE status = 'paid'
  AND paid_at IS NULL;

-- ============================================
-- 5. INDEXES for SLA queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wo_submitted_at ON work_orders(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wo_assigned_at ON work_orders(assigned_at) WHERE assigned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wo_completed_at ON work_orders(completed_at) WHERE completed_at IS NOT NULL;

SELECT 'Migration 111 applied successfully' AS result;
