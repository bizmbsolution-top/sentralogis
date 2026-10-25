-- SENTRALOGIS - LEVEL 3.50 DR1 CANONICAL MIGRATION RESOLUTION - MIGRATION A
-- TARGET: SENTRALOGIS-TEST ONLY (project ref kfagaaggfwkqqwlzhdxm)
-- AUTHORIZATION: Level 3.50 execute migration 20260914_004 on TEST only
-- SOURCE: Level 3.48 DR1 canonical migration resolution design; Level 3.49 forensic preflight
--
-- PURPOSE: Bring the existing TEST tenant_users table into canonical convergence
-- by adding the single missing canonical column is_active.
--
-- This is the ONLY schema mutation of the existing TEST tenant_users table in the
-- canonical forward lineage. It is narrowly scoped.
--
-- is_owner is LEFT IN PLACE as legacy compatibility state (Level 3.47 DR1-REOPEN-B).
-- No data is modified. No constraints are added. No indexes are created. No RLS,
-- triggers, functions, or other tables are touched.
--
-- SAFE ON EXISTING TEST: ADD COLUMN IF NOT EXISTS -> adds is_active.
-- SAFE ON FRESH DATABASE: 20260914_003 already creates is_active -> no-op.
--
-- SAFETY: single statement. No transaction needed (DDL autocommit). No destructive op.

ALTER TABLE public.tenant_users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;