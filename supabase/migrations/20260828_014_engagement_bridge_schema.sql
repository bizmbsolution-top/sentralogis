-- ============================================================================
-- Migration: 20260828_014_engagement_bridge_schema.sql
-- Description: U-03 Engagement Bridge — foundation hardening + bridge table
-- ADR-032: Resolve-or-Create Bridge for canonical commercial_work_orders
--
-- BLOCKERS FIXED:
--   1. commercial_work_orders.service_scope_id was NOT NULL but ADR-032
--      declared it relaxed. Lazy engagement creation requires NULLABLE.
--   2. No partial unique index for open-engagement-per-customer — required
--      for concurrency-safe idempotency of resolve-or-create.
--   3. No legacy_wo_bridge side-table for operational shadowing.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. RELAX service_scope_id (FOUNDATION BLOCKER)
--    ADR-032: "NO fake service_scope_id (schema already relaxed)"
--    The ALTER was never applied in Stage R migrations. Fix now.
--    Migration risk: LOW — relaxes constraint, zero data change.
--    Rollback: ALTER TABLE commercial_work_orders ALTER COLUMN service_scope_id SET NOT NULL;
-- ----------------------------------------------------------------------------
ALTER TABLE public.commercial_work_orders
  ALTER COLUMN service_scope_id DROP NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. PARTIAL UNIQUE INDEX for concurrency-safe idempotency
--    One OPEN engagement (DRAFT/SUBMITTED) per tenant+customer pair.
--    Prevents duplicate creation under concurrent requests.
--    Migration risk: LOW — additive index, no data change.
--    Rollback: DROP INDEX IF EXISTS uq_com_wo_open_per_customer;
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_com_wo_open_per_customer
  ON public.commercial_work_orders (tenant_id, customer_id)
  WHERE status IN ('DRAFT', 'SUBMITTED');

-- ----------------------------------------------------------------------------
-- 3. LEGACY WO BRIDGE TABLE (ADR-032 side-table)
--    Maps legacy work_orders.id ↔ commercial_work_orders.id
--    Additive only — no existing data modified.
--    Migration risk: LOW — new empty table.
--    Rollback: DROP TABLE IF EXISTS public.legacy_wo_bridge;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legacy_wo_bridge (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.md_tenants(id),
  legacy_wo_id    UUID NOT NULL,  -- work_orders.id — no FK (legacy table not in canonical FK graph)
  engagement_id   UUID NOT NULL REFERENCES public.commercial_work_orders(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id),
  CONSTRAINT uq_legacy_wo_bridge_legacy UNIQUE (legacy_wo_id),
  CONSTRAINT uq_legacy_wo_bridge_engagement UNIQUE (engagement_id)
);

CREATE INDEX IF NOT EXISTS idx_legacy_wo_bridge_tenant ON public.legacy_wo_bridge(tenant_id);
CREATE INDEX IF NOT EXISTS idx_legacy_wo_bridge_engagement ON public.legacy_wo_bridge(engagement_id);

-- ----------------------------------------------------------------------------
-- 4. GRANTS + RLS for legacy_wo_bridge
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, DELETE ON public.legacy_wo_bridge TO authenticated;

ALTER TABLE public.legacy_wo_bridge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legacy_wo_bridge_isolation ON public.legacy_wo_bridge;
CREATE POLICY legacy_wo_bridge_isolation ON public.legacy_wo_bridge
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

COMMIT;
