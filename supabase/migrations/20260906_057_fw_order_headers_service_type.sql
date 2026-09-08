-- ============================================================================
-- Migration: 20260906_057_fw_order_headers_service_type.sql
-- Description: SBU Forwarding Wave 5 — Add service_type column to
--              fw_order_headers to support FCL/LCL canonical domain model.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD service_type COLUMN
-- ============================================================================

ALTER TABLE public.fw_order_headers
  ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'FCL' CHECK (service_type IN ('FCL', 'LCL'));

-- ============================================================================
-- 2. BACKFILL existing rows to FCL (conservative default)
-- ============================================================================

UPDATE public.fw_order_headers
SET service_type = 'FCL'
WHERE service_type IS NULL;

-- ============================================================================
-- 3. INDEX for common filter
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fw_order_headers_service_type
  ON public.fw_order_headers(service_type);

COMMIT;
