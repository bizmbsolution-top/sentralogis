-- ============================================================================
-- Migration: 20260906_055_fw_order_headers_lineage_repair.sql
-- Description: SBU Forwarding Wave 1 — fw_order_headers lineage repair
--              Replace legacy work_orders(wo_id) reference with canonical
--              commercial_work_orders(id) via deterministic backfill.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD work_order_id COLUMN (nullable during backfill)
-- ============================================================================

ALTER TABLE public.fw_order_headers
  ADD COLUMN IF NOT EXISTS work_order_id UUID;

CREATE INDEX IF NOT EXISTS idx_fw_order_headers_work_order_id
  ON public.fw_order_headers(work_order_id);

-- ============================================================================
-- 2. BACKFILL work_order_id deterministically
--
--    Mapping chain:
--      fw_order_headers.wo_id (legacy work_orders.id)
--        → legacy_wo_bridge.legacy_wo_id
--        → legacy_wo_bridge.engagement_id
--        → commercial_work_orders.id
-- ============================================================================

UPDATE public.fw_order_headers oh
SET work_order_id = lb.engagement_id
FROM public.legacy_wo_bridge lb
WHERE oh.wo_id = lb.legacy_wo_id
  AND oh.tenant_id = lb.tenant_id;

-- ============================================================================
-- 3. REPORT unmapped rows (for forensic review)
-- ============================================================================

DO $$
DECLARE
  unmapped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmapped_count
  FROM public.fw_order_headers
  WHERE work_order_id IS NULL;

  IF unmapped_count > 0 THEN
    RAISE WARNING 'fw_order_headers lineage repair: % rows could not be mapped to commercial_work_orders', unmapped_count;
  END IF;
END $$;

-- ============================================================================
-- 4. ADD FK constraint (NOT VALID — validate separately)
-- ============================================================================

ALTER TABLE public.fw_order_headers
  ADD CONSTRAINT fk_fw_order_headers_work_order
  FOREIGN KEY (work_order_id)
  REFERENCES public.commercial_work_orders(id)
  ON DELETE RESTRICT
  NOT VALID;

-- ============================================================================
-- 5. VALIDATE existing rows (safe because backfill already mapped valid refs)
-- ============================================================================

ALTER TABLE public.fw_order_headers
  VALIDATE CONSTRAINT fk_fw_order_headers_work_order;

-- ============================================================================
-- 6. PRESERVE legacy wo_id column for compatibility
--    (removal deferred to future wave after all readers/writers migrated)
-- ============================================================================

COMMIT;
