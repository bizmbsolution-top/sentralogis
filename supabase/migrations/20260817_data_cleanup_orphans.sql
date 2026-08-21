-- Data Cleanup Remediation (Pre-flight approved)
-- 1. Merging Antonio's Duplicate Profile
-- Source Profile (P2): 5bc80a1f-4120-4dc9-b767-b589dff5411d
-- Target Profile (P1): f474cb1a-dd17-46dc-a3d0-bfeba7e0d085

BEGIN;

-- Move driver_tenant_links from Source to Target, avoiding duplicates
UPDATE public.driver_tenant_links source
SET profile_id = 'f474cb1a-dd17-46dc-a3d0-bfeba7e0d085'
WHERE source.profile_id = '5bc80a1f-4120-4dc9-b767-b589dff5411d'
AND NOT EXISTS (
  SELECT 1 FROM public.driver_tenant_links target
  WHERE target.profile_id = 'f474cb1a-dd17-46dc-a3d0-bfeba7e0d085'
  AND target.tenant_id = source.tenant_id
);

-- Deactivate Source Profile ONLY if all links have been moved
UPDATE public.driver_profiles
SET is_active = false
WHERE id = '5bc80a1f-4120-4dc9-b767-b589dff5411d'
AND NOT EXISTS (
  SELECT 1 FROM public.driver_tenant_links 
  WHERE profile_id = '5bc80a1f-4120-4dc9-b767-b589dff5411d'
);

-- 2. Phone Desyncs (Align md_drivers.whatsapp to canonical format)
UPDATE public.md_drivers
SET whatsapp = public.normalize_phone(whatsapp)
WHERE whatsapp IS NOT NULL AND public.normalize_phone(whatsapp) != whatsapp;

-- 3. Resolve 16 Orphan Drivers (Create profiles and links for drivers without them)
-- 3a. Create driver_profiles for orphans that don't have a profile yet
INSERT INTO public.driver_profiles (phone, full_name, is_active)
SELECT DISTINCT ON (public.normalize_phone(d.whatsapp))
       public.normalize_phone(d.whatsapp), d.name, true
FROM public.md_drivers d
WHERE d.whatsapp IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.driver_tenant_links l WHERE l.driver_id = d.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.driver_profiles p WHERE p.phone = public.normalize_phone(d.whatsapp)
  )
ORDER BY public.normalize_phone(d.whatsapp), d.id;

-- 3b. Create driver_tenant_links for the orphans
INSERT INTO public.driver_tenant_links (profile_id, tenant_id, driver_id, is_active)
SELECT p.id, d.tenant_id, d.id, true
FROM public.md_drivers d
JOIN public.driver_profiles p ON p.phone = public.normalize_phone(d.whatsapp)
WHERE NOT EXISTS (
  SELECT 1 FROM public.driver_tenant_links l WHERE l.driver_id = d.id
);

COMMIT;
