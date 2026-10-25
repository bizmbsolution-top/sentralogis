-- Migration: 20260912000001_claim_fix
-- Purpose: Migration history reconciliation for claim_proposal_for_execution fix
-- Applied: 2026-09-12 (Level 3.25)
-- Status: NO-OP - The actual DDL was applied directly to SENTRALOGIS-TEST during Level 3.25.
-- This file exists only to reconcile Supabase migration history.
-- The fix (table aliases cp.proposal_number, cp.lifecycle_state) is already present in the database.

-- No schema changes. Verification only.
SELECT '20260912000001_claim_fix OK' AS result;