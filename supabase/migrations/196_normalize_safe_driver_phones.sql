-- Migration: 196_normalize_safe_driver_phones.sql
-- Description: Normalizes only the phones that do not have canonical duplicates

-- Ensure the normalize_phone function exists (from 195, though 195 was not executed, so we recreate it here)
CREATE OR REPLACE FUNCTION normalize_phone(phone_str TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF phone_str IS NULL THEN
        RETURN NULL;
    END IF;
    
    cleaned := regexp_replace(phone_str, '\D', '', 'g');
    
    IF cleaned LIKE '0%' THEN
        cleaned := '62' || substr(cleaned, 2);
    END IF;
    
    RETURN cleaned;
END;
$$ LANGUAGE plpgsql;

-- Perform safe updates: Only update if the canonical phone is NOT shared by any other driver.
WITH canonical_counts AS (
  SELECT 
    normalize_phone(whatsapp) as canonical_wa, 
    COUNT(*) as dup_count
  FROM md_drivers
  WHERE whatsapp IS NOT NULL AND normalize_phone(whatsapp) IS NOT NULL
  GROUP BY normalize_phone(whatsapp)
)
UPDATE md_drivers d
SET whatsapp = normalize_phone(d.whatsapp)
FROM canonical_counts c
WHERE normalize_phone(d.whatsapp) = c.canonical_wa
  AND c.dup_count = 1
  AND d.whatsapp != normalize_phone(d.whatsapp);
