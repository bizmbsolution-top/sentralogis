-- Migration 044: Add logo_url to md_entities for transporters & customers
-- Eksekusi di Supabase SQL Editor

ALTER TABLE md_entities ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT '044_md_entities_logo OK' AS result;
