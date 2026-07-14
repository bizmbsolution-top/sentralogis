-- Migration 163: Auto-set ready_billing_at & invoiced_at + RPC get_active_sla_breaches
-- Fixes SLA 3 and SLA 4 which were non-functional due to missing timestamp triggers.

-- ============================================
-- 1. TRIGGER: auto-set ready_billing_at when all JOs complete doc & cost
-- ============================================
CREATE OR REPLACE FUNCTION set_wo_ready_billing_at()
RETURNS TRIGGER AS $$
DECLARE
  v_wo_id UUID;
  v_all_ready BOOLEAN;
BEGIN
  -- Get the work_order_id from wo_item
  SELECT wi.wo_id INTO v_wo_id
  FROM wo_items wi
  WHERE wi.id = NEW.wo_item_id;

  IF v_wo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if ALL job_orders in this WO have is_doc_finished=true AND is_cost_finished=true
  SELECT NOT EXISTS (
    SELECT 1
    FROM wo_items wi
    JOIN job_orders jo ON jo.wo_item_id = wi.id
    WHERE wi.wo_id = v_wo_id
      AND (jo.is_doc_finished = false OR jo.is_cost_finished = false)
  ) INTO v_all_ready;

  -- If all ready and ready_billing_at not yet set, set it now
  IF v_all_ready THEN
    UPDATE work_orders
    SET ready_billing_at = COALESCE(ready_billing_at, NOW())
    WHERE id = v_wo_id
      AND ready_billing_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_wo_ready_billing_at ON job_orders;
CREATE TRIGGER trg_set_wo_ready_billing_at
  AFTER UPDATE OF is_doc_finished, is_cost_finished ON job_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_wo_ready_billing_at();

-- Also fire on INSERT in case JOs are inserted with flags already true
DROP TRIGGER IF EXISTS trg_set_wo_ready_billing_at_insert ON job_orders;
CREATE TRIGGER trg_set_wo_ready_billing_at_insert
  AFTER INSERT ON job_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_wo_ready_billing_at();

-- ============================================
-- 2. TRIGGER: auto-set invoiced_at when invoice is created
-- ============================================
CREATE OR REPLACE FUNCTION set_wo_invoiced_at()
RETURNS TRIGGER AS $$
BEGIN
  -- When an invoice is created (status != 'cancelled'), set invoiced_at on the WO
  IF NEW.wo_id IS NOT NULL AND NEW.status != 'cancelled' THEN
    UPDATE work_orders
    SET invoiced_at = COALESCE(invoiced_at, NOW())
    WHERE id = NEW.wo_id
      AND invoiced_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_wo_invoiced_at ON invoices;
CREATE TRIGGER trg_set_wo_invoiced_at
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_wo_invoiced_at();

-- Also update when invoice status changes from draft to active
CREATE OR REPLACE FUNCTION set_wo_invoiced_at_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When invoice status changes to 'sent' or 'accepted', set invoiced_at
  IF OLD.status = 'draft' AND NEW.status IN ('sent', 'accepted') AND NEW.wo_id IS NOT NULL THEN
    UPDATE work_orders
    SET invoiced_at = COALESCE(invoiced_at, NOW())
    WHERE id = NEW.wo_id
      AND invoiced_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_wo_invoiced_at_status ON invoices;
CREATE TRIGGER trg_set_wo_invoiced_at_status
  AFTER UPDATE OF status ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_wo_invoiced_at_on_status_change();

-- ============================================
-- 3. BACKFILL: set ready_billing_at for completed WOs where all JOs are ready
-- ============================================
UPDATE work_orders wo
SET ready_billing_at = wo.completed_at
WHERE wo.status IN ('completed', 'paid', 'invoiced')
  AND wo.ready_billing_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM wo_items wi
    JOIN job_orders jo ON jo.wo_item_id = wi.id
    WHERE wi.wo_id = wo.id
      AND (jo.is_doc_finished = false OR jo.is_cost_finished = false)
  );

-- ============================================
-- 4. BACKFILL: set invoiced_at from existing invoices
-- ============================================
UPDATE work_orders wo
SET invoiced_at = i.created_at
FROM invoices i
WHERE i.wo_id = wo.id
  AND i.status != 'cancelled'
  AND wo.invoiced_at IS NULL;

-- ============================================
-- 5. INDEXES for new timestamp columns
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wo_ready_billing_at ON work_orders(ready_billing_at) WHERE ready_billing_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wo_invoiced_at ON work_orders(invoiced_at) WHERE invoiced_at IS NOT NULL;

-- ============================================
-- 6. RPC: get_active_sla_breaches
-- ============================================
DROP FUNCTION IF EXISTS get_active_sla_breaches(UUID);
CREATE OR REPLACE FUNCTION get_active_sla_breaches(p_tenant_id UUID)
RETURNS TABLE (
  breach_id UUID,
  breach_type TEXT,
  stage TEXT,
  wo_number TEXT,
  jo_number TEXT,
  overdue_minutes INTEGER,
  customer_name TEXT,
  vendor_name TEXT,
  details TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS breach_id,
    e.breach_type,
    e.stage,
    e.wo_number,
    e.jo_number,
    e.overdue_minutes,
    e.customer_name,
    e.vendor_name,
    e.details,
    CASE
      WHEN e.overdue_minutes >= 480 THEN 'emergency'
      WHEN e.overdue_minutes >= 120 THEN 'critical'
      WHEN e.overdue_minutes >= 30 THEN 'breach'
      ELSE 'warning'
    END AS severity,
    e.created_at
  FROM sla_escalations e
  WHERE e.tenant_id = p_tenant_id
    AND e.resolved_at IS NULL
  ORDER BY e.overdue_minutes DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Also create a real-time SLA breach view for the dashboard
DROP FUNCTION IF EXISTS get_sla_breach_summary(UUID);
CREATE OR REPLACE FUNCTION get_sla_breach_summary(p_tenant_id UUID)
RETURNS TABLE (
  stage TEXT,
  total_breaches BIGINT,
  avg_overdue_minutes NUMERIC,
  worst_overdue_minutes INTEGER,
  unresolved_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.stage,
    COUNT(*) AS total_breaches,
    ROUND(AVG(e.overdue_minutes), 0) AS avg_overdue_minutes,
    MAX(e.overdue_minutes)::INTEGER AS worst_overdue_minutes,
    COUNT(*) FILTER (WHERE e.resolved_at IS NULL) AS unresolved_count
  FROM sla_escalations e
  WHERE e.tenant_id = p_tenant_id
    AND e.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY e.stage
  ORDER BY total_breaches DESC;
END;
$$ LANGUAGE plpgsql STABLE;

SELECT 'Migration 163 applied successfully' AS result;
