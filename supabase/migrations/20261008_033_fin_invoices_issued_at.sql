-- Migration: 20261008_033_fin_invoices_issued_at.sql
-- Description: Add issued_at TIMESTAMPTZ column to fin_invoices (D-2.A)
-- Ratified by: Likas Sonada (Platform Owner / Human Architect), R2-C.4J / R2-C.4K / R2-C.4N
--
-- Contract:
--   - Additive nullable column: issued_at TIMESTAMPTZ NULL DEFAULT NULL.
--   - D-5 Preserved: Historical DRAFT invoices remain untouched (ZERO backfill).
--   - Set upon explicit transition to ISSUED status.

BEGIN;

ALTER TABLE public.fin_invoices
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ NULL DEFAULT NULL;

COMMENT ON COLUMN public.fin_invoices.issued_at IS 'Explicit business timestamp when the invoice was transitioned from DRAFT to ISSUED. Null for legacy/draft invoices.';

COMMIT;
