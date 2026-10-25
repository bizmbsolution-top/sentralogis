-- Migration: 20261005_002_settlement_uniqueness_hardening.sql
-- Description: Settlement Database Uniqueness Hardening (Phase 5D-3 / ADR-067 Hardening)
-- Ratified by: Human Architect Decision, 2026-10-05 (Option 3B)
--
-- Target:
--   Table: public.fin_settlements
--   Constraint: uq_fin_settlements_tenant_allocation UNIQUE (tenant_id, allocation_id)
--
-- Purpose:
--   Enforce database-level invariant preventing duplicate settlement records
--   for the same tenant and allocation pair. Concurrency defense for production.
--
-- Non-destructive / additive / idempotent.
-- Zero business data rows created, modified, or deleted.

BEGIN;

ALTER TABLE public.fin_settlements
ADD CONSTRAINT uq_fin_settlements_tenant_allocation
UNIQUE (tenant_id, allocation_id);

COMMIT;
