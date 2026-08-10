-- Migration to normalize existing whatsapp numbers in md_drivers to 628... format

UPDATE md_drivers
SET whatsapp = 
    CASE
        -- If it starts with +62, replace with 62
        WHEN whatsapp LIKE '+62%' THEN '62' || substring(regexp_replace(whatsapp, '\D', '', 'g') from 3)
        -- If it starts with 0, replace 0 with 62
        WHEN whatsapp LIKE '0%' THEN '62' || substring(regexp_replace(whatsapp, '\D', '', 'g') from 2)
        -- If it already starts with 62, just strip non-digits
        WHEN whatsapp LIKE '62%' THEN regexp_replace(whatsapp, '\D', '', 'g')
        -- Default case, just strip non-digits
        ELSE regexp_replace(whatsapp, '\D', '', 'g')
    END
WHERE whatsapp IS NOT NULL;
