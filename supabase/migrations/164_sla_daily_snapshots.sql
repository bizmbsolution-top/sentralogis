-- Migration 164: Create sla_daily_snapshots table and capture_sla_snapshot RPC
-- Phase 3: SLA Trend Analysis

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.sla_daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sla_stage TEXT NOT NULL,          -- 'SLA 1', 'SLA 2', ... 'SLA 7'
  total_count INTEGER DEFAULT 0,
  pass_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  compliance_pct NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, snapshot_date, sla_stage)
);

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_sla_snapshots_tenant_date 
  ON public.sla_daily_snapshots(tenant_id, snapshot_date);

-- 3. Enable RLS
ALTER TABLE public.sla_daily_snapshots ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sla_daily_snapshots TO authenticated;
GRANT ALL ON public.sla_daily_snapshots TO service_role;

DROP POLICY IF EXISTS "tenant_isolation_sla_daily_snapshots" ON public.sla_daily_snapshots;
CREATE POLICY "tenant_isolation_sla_daily_snapshots" ON public.sla_daily_snapshots
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('superadmin', 'owner', 'director', 'hq_admin')
    )
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('superadmin', 'owner', 'director', 'hq_admin')
    )
  );

-- 4. Create RPC capture_sla_snapshot
CREATE OR REPLACE FUNCTION public.capture_sla_snapshot(p_tenant_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  v_total INTEGER;
  v_pass INTEGER;
  v_fail INTEGER;
  v_pct NUMERIC;
BEGIN
  -- ── SLA 1: WO Draft → Submit (target: 30 min = 1800 sec) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (submitted_at - created_at)) <= 1800)
  INTO v_total, v_pass
  FROM public.work_orders
  WHERE tenant_id = p_tenant_id
    AND submitted_at IS NOT NULL
    AND status != 'cancelled';

  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;

  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 1', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;

  -- ── SLA 2: Submit → SBU Assigned (target: 60 min = 3600 sec) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (assigned_at - submitted_at)) <= 3600)
  INTO v_total, v_pass
  FROM public.work_orders
  WHERE tenant_id = p_tenant_id
    AND assigned_at IS NOT NULL
    AND submitted_at IS NOT NULL
    AND status != 'cancelled';

  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;

  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 2', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;

  -- ── SLA 3: Assigned → Completed (target per SBU) ──
  -- TRUCKING: 3 days (259200 s), WAREHOUSE: 1 day (86400 s), CLEARANCE: 2 days (172800 s), FORWARDING: 4 days (345600 s)
  WITH wo_sbu AS (
    SELECT 
      wo.id,
      wo.assigned_at,
      wo.completed_at,
      COALESCE(
        (
          SELECT CASE 
            WHEN wi.sbu_type = 'WAREHOUSE' THEN 86400
            WHEN wi.sbu_type = 'CLEARANCE' THEN 172800
            WHEN wi.sbu_type = 'FORWARDING' THEN 345600
            ELSE 259200
          END
          FROM public.wo_items wi
          WHERE wi.wo_id = wo.id AND wi.sbu_type IS NOT NULL
          GROUP BY wi.sbu_type
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ),
        259200
      ) AS target_seconds
    FROM public.work_orders wo
    WHERE wo.tenant_id = p_tenant_id
      AND wo.assigned_at IS NOT NULL
      AND wo.completed_at IS NOT NULL
      AND wo.status != 'cancelled'
  )
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (completed_at - assigned_at)) <= target_seconds)
  INTO v_total, v_pass
  FROM wo_sbu;

  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;

  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 3', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;

  -- ── SLA 4: Done → Ready Billing (target: 3 days = 259200 sec) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ready_billing_at - completed_at)) <= 259200)
  INTO v_total, v_pass
  FROM public.work_orders
  WHERE tenant_id = p_tenant_id
    AND completed_at IS NOT NULL
    AND ready_billing_at IS NOT NULL
    AND status != 'cancelled';

  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;

  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 4', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;

  -- ── SLA 5: Ready → Invoiced (target: 1 day = 86400 sec) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (invoiced_at - ready_billing_at)) <= 86400)
  INTO v_total, v_pass
  FROM public.work_orders
  WHERE tenant_id = p_tenant_id
    AND ready_billing_at IS NOT NULL
    AND invoiced_at IS NOT NULL
    AND status != 'cancelled';

  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;

  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 5', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;

  -- ── SLA 6: Customer Invoice → Paid (simplified: paid = passed) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE i.status = 'paid')
  INTO v_total, v_pass
  FROM public.invoices i
  JOIN public.work_orders wo ON i.wo_id = wo.id
  WHERE wo.tenant_id = p_tenant_id
    AND i.status IN ('sent', 'accepted', 'paid', 'overdue');

  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;

  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 6', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;

  -- ── SLA 7: Vendor Invoice → Paid (simplified: paid = passed in last 30 days) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid')
  INTO v_total, v_pass
  FROM public.vendor_invoices
  WHERE tenant_id = p_tenant_id
    AND status IN ('submitted', 'verified', 'approved', 'paid')
    AND received_at >= NOW() - INTERVAL '30 days';

  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;

  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 7', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;

END;
$$ LANGUAGE plpgsql;

SELECT '164_sla_daily_snapshots OK' AS result;
