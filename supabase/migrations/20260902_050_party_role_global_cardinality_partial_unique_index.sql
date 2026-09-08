-- ============================================================================
-- Migration: 20260902_050_party_role_global_cardinality_partial_unique_index.sql
-- Description: DATA-4E-BR8 — Database-level enforcement of GLOBAL party role cardinality
-- Architecture: ADR-077 (RATIFIED 2026-09-02) + ADR-070 AMENDMENT (RATIFIED 2026-09-02)
-- Authority: Human authorization "I AUTHORIZE DATA-4E-BR8 IMPLEMENTATION: PARTY ROLE GLOBAL CARDINALITY INDEX ONLY."
-- ============================================================================
-- This migration adds a partial unique index that enforces:
--   At most one GLOBAL role of each role_type per (tenant_id, party_id)
--   when context_type = 'GLOBAL' AND context_id IS NULL.
-- The existing uq_party_role UNIQUE constraint is preserved unchanged.
-- This index is additive and does not modify any existing constraint, RLS, or data.
-- ============================================================================

DROP INDEX IF EXISTS public.idx_party_roles_global_unique;
CREATE UNIQUE INDEX idx_party_roles_global_unique
  ON public.party_roles (tenant_id, party_id, role_type)
  WHERE context_type = 'GLOBAL' AND context_id IS NULL;

NOTIFY pgrst, 'reload schema';
