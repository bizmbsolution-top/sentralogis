-- SLA Auto-Escalation Tracking Table
CREATE TABLE IF NOT EXISTS public.sla_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  wo_id uuid,
  jo_id uuid,
  sla_stage varchar(20) NOT NULL,
  breach_type varchar(20) NOT NULL,
  escalation_level int NOT NULL DEFAULT 1,
  notified_role varchar(50),
  notified_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid,
  details text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.sla_escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated to read sla_escalations" ON public.sla_escalations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow system to insert sla_escalations" ON public.sla_escalations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow system to update sla_escalations" ON public.sla_escalations FOR UPDATE TO authenticated USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sla_escalations_tenant ON public.sla_escalations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sla_escalations_unresolved ON public.sla_escalations(tenant_id, resolved_at) WHERE resolved_at IS NULL;

COMMENT ON TABLE public.sla_escalations IS 'Tracks SLA breach escalations and notifications sent';
