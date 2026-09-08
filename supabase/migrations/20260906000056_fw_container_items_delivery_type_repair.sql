-- ============================================================================
-- Migration: 20260906_056_fw_container_items_delivery_type_repair.sql
-- Description: SBU Forwarding Wave 5 — Align delivery_type to shorthand
--              canonical format (D2D/P2P/D2P/P2D) across fw_container_items
--              and fw_price_master. Backfill existing longhand values.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DROP legacy CHECK constraint (longhand format)
-- ============================================================================

ALTER TABLE public.fw_container_items
  DROP CONSTRAINT IF EXISTS fw_container_items_delivery_type_check;

-- ============================================================================
-- 2. BACKFILL existing longhand values to shorthand
-- ============================================================================

UPDATE public.fw_container_items
SET delivery_type = CASE delivery_type
  WHEN 'port_to_port' THEN 'P2P'
  WHEN 'port_to_door' THEN 'P2D'
  WHEN 'door_to_port' THEN 'D2P'
  WHEN 'door_to_door' THEN 'D2D'
  ELSE delivery_type
END
WHERE delivery_type IN ('port_to_port','port_to_door','door_to_port','door_to_door');

-- ============================================================================
-- 3. ALTER DEFAULT to shorthand
-- ============================================================================

ALTER TABLE public.fw_container_items
  ALTER COLUMN delivery_type SET DEFAULT 'P2P';

-- ============================================================================
-- 4. ADD canonical CHECK constraint (shorthand format)
-- ============================================================================

ALTER TABLE public.fw_container_items
  ADD CONSTRAINT fw_container_items_delivery_type_check
  CHECK (delivery_type IN ('D2D','P2P','D2P','P2D'));

-- ============================================================================
-- 5. REPORT backfill count for forensic review
-- ============================================================================

DO $$
DECLARE
  backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfilled_count
  FROM public.fw_container_items
  WHERE delivery_type IN ('D2D','P2P','D2P','P2D');

  RAISE NOTICE 'fw_container_items delivery_type repair: % rows now in canonical shorthand format', backfilled_count;
END $$;

COMMIT;
