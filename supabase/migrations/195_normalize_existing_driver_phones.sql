-- Migration: 195_normalize_existing_driver_phones.sql
-- Description: Normalizes md_drivers whatsapp to canonical 628xxxxxxxxxx format

-- 1. Create a function to normalize phone numbers
CREATE OR REPLACE FUNCTION normalize_phone(phone_str TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
BEGIN
    IF phone_str IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove non-digits
    cleaned := regexp_replace(phone_str, '\D', '', 'g');
    
    -- Replace leading 0 with 62
    IF cleaned LIKE '0%' THEN
        cleaned := '62' || substr(cleaned, 2);
    END IF;
    
    RETURN cleaned;
END;
$$ LANGUAGE plpgsql;

-- 2. Update existing drivers that are not yet normalized
UPDATE md_drivers
SET whatsapp = normalize_phone(whatsapp)
WHERE whatsapp IS NOT NULL 
  AND whatsapp != normalize_phone(whatsapp);
