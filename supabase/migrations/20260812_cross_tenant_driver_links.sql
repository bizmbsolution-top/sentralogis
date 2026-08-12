-- Cross-Tenant Driver Identity (Phase 2)
-- Opsi B (Per-Tenant Copy): master data tetap per-tenant di md_drivers/md_fleets/md_entities,
-- identitas driver kanonik (phone + PIN) dipusatkan di driver_profiles, dihubungkan ke
-- md_drivers per-tenant lewat driver_tenant_links.

-- 1. Canonical phone normalizer (deterministic, format 628xx...)
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN NULL;
  END IF;
  v_clean := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF v_clean LIKE '0%' THEN
    v_clean := '62' || substring(v_clean from 2);
  ELSIF v_clean LIKE '8%' THEN
    v_clean := '62' || v_clean;
  END IF;
  RETURN v_clean;
END;
$$;

-- 2. driver_profiles — identitas kanonik driver (1 per orang)
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  pin_hash TEXT,
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_driver_profiles_phone
  ON public.driver_profiles ((public.normalize_phone(phone)));

-- 3. driver_tenant_links — profile → md_drivers per tenant
CREATE TABLE IF NOT EXISTS public.driver_tenant_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.md_drivers(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_tenant_links_profile_id
  ON public.driver_tenant_links (profile_id);

CREATE INDEX IF NOT EXISTS idx_driver_tenant_links_driver_id
  ON public.driver_tenant_links (driver_id);

CREATE INDEX IF NOT EXISTS idx_driver_tenant_links_tenant_id
  ON public.driver_tenant_links (tenant_id);

-- 4. Backfill: group existing md_drivers by canonical phone into driver_profiles,
--    then create one link per (profile, tenant, driver).
--    DISTINCT ON (normalize_phone) guards against duplicate raw whatsapp formats
--    (085.../628.../62...) that normalize to the same canonical phone.
INSERT INTO public.driver_profiles (phone, full_name)
SELECT DISTINCT ON (public.normalize_phone(d.whatsapp))
       public.normalize_phone(d.whatsapp), d.name
FROM public.md_drivers d
WHERE d.whatsapp IS NOT NULL
  AND public.normalize_phone(d.whatsapp) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.driver_profiles p
    WHERE p.phone = public.normalize_phone(d.whatsapp)
  )
ORDER BY public.normalize_phone(d.whatsapp), d.id;

-- DISTINCT ON (profile_id, tenant_id) keeps one driver per (profile, tenant) so a
-- phone registered twice in the same tenant can't violate UNIQUE (profile_id, tenant_id).
INSERT INTO public.driver_tenant_links (profile_id, tenant_id, driver_id)
SELECT DISTINCT ON (p.id, d.tenant_id) p.id, d.tenant_id, d.id
FROM public.md_drivers d
JOIN public.driver_profiles p
  ON p.phone = public.normalize_phone(d.whatsapp)
WHERE d.whatsapp IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.driver_tenant_links l
    WHERE l.profile_id = p.id AND l.tenant_id = d.tenant_id AND l.driver_id = d.id
  )
ORDER BY p.id, d.tenant_id, d.id;

-- 5. RLS: service-role only (diakses via server API dengan admin client)
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_tenant_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "driver_profiles_service_role" ON public.driver_profiles;
CREATE POLICY "driver_profiles_service_role" ON public.driver_profiles
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "driver_tenant_links_service_role" ON public.driver_tenant_links;
CREATE POLICY "driver_tenant_links_service_role" ON public.driver_tenant_links
FOR ALL USING (true) WITH CHECK (true);

-- Revoke client-only roles from these tables (masters + anon), keep only service role.
REVOKE ALL ON public.driver_profiles FROM anon, authenticated;
REVOKE ALL ON public.driver_tenant_links FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';