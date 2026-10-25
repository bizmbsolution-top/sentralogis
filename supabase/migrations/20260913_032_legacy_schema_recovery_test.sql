-- ============================================================================
-- Migration: 20260913_032_legacy_schema_recovery_test.sql
-- Scope: SENTRALOGIS-TEST ONLY (kfagaaggfwkqqwlzhdxm)
-- Purpose: EXISTING-TEST RECONCILIATION / PROVENANCE VERIFICATION ARTIFACT
-- NOT A FRESH-DATABASE EXECUTABLE SCHEMA MIGRATION
--
-- This file is a READ-ONLY VERIFICATION ARTIFACT.
-- It contains NO DDL, NO DML, NO schema changes, NO data changes.
-- It confirms that the Level 3.32 legacy schema recovery was physically
-- applied to SENTRALOGIS-TEST during Level 3.32.
--
-- The original executable artifact was:
--   20260912_032_legacy_schema_recovery_test.sql
-- That file was renamed to this file because it shared migration version
-- 20260912 with 20260912_022_operational_schema_recovery.sql, creating a
-- version collision that prevented independent migration-history recording.
--
-- Physical application of the seven recovery tables was independently
-- verified through read-only database inspection during Levels 3.32-3.35G.
-- This file does NOT re-execute any DDL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- VERIFICATION: Confirm the seven Level 3.32 recovery tables exist.
-- Read-only SELECT. No mutation.
-- ----------------------------------------------------------------------------
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
        'md_entities',
        'md_drivers',
        'md_fleets',
        'work_orders',
        'wo_items',
        'job_orders',
        'job_tracking'
  )
ORDER BY table_name;