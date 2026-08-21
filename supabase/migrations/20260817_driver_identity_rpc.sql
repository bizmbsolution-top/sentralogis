-- RPC for Driver Identity Management (Phase 1)
-- Requires public.normalize_phone() from previous migration

-- 1. Create Driver Atomic Flow
CREATE OR REPLACE FUNCTION public.create_driver(
  p_tenant_id UUID,
  p_entity_id UUID,
  p_name TEXT,
  p_whatsapp TEXT,
  p_pin TEXT,
  p_address TEXT,
  p_sim_number TEXT,
  p_sim_class TEXT,
  p_sim_expiry TEXT,
  p_status TEXT,
  p_is_active BOOLEAN,
  p_driver_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_phone TEXT;
  v_profile_id UUID;
  v_driver_id UUID;
  v_link_id UUID;
BEGIN
  v_normalized_phone := public.normalize_phone(p_whatsapp);

  IF v_normalized_phone IS NULL OR v_normalized_phone = '' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;

  -- Find existing profile
  SELECT id INTO v_profile_id
  FROM public.driver_profiles
  WHERE phone = v_normalized_phone
  LIMIT 1;

  -- Create profile if not found
  IF v_profile_id IS NULL THEN
    INSERT INTO public.driver_profiles (phone, full_name, pin_hash, is_active)
    VALUES (v_normalized_phone, p_name, p_pin, true)
    RETURNING id INTO v_profile_id;
  END IF;

  -- Ensure not already linked in this tenant
  IF EXISTS (
    SELECT 1 FROM public.driver_tenant_links
    WHERE profile_id = v_profile_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'PROFILE_CONFLICT: Driver already exists in this tenant';
  END IF;

  -- Insert into md_drivers
  INSERT INTO public.md_drivers (
    tenant_id, entity_id, name, whatsapp, pin, address, 
    sim_number, sim_class, sim_expiry, status, is_active, driver_code
  )
  VALUES (
    p_tenant_id, p_entity_id, p_name, p_whatsapp, p_pin, p_address,
    p_sim_number, p_sim_class, p_sim_expiry, p_status, p_is_active, p_driver_code
  )
  RETURNING id INTO v_driver_id;

  -- Link profile and driver
  INSERT INTO public.driver_tenant_links (profile_id, tenant_id, driver_id, is_active)
  VALUES (v_profile_id, p_tenant_id, v_driver_id, true)
  RETURNING id INTO v_link_id;

  RETURN json_build_object(
    'driver_id', v_driver_id,
    'profile_id', v_profile_id,
    'link_id', v_link_id
  );
END;
$$;


-- 2. Update Driver Atomic Flow
CREATE OR REPLACE FUNCTION public.update_driver(
  p_driver_id UUID,
  p_tenant_id UUID,
  p_name TEXT,
  p_whatsapp TEXT,
  p_is_active BOOLEAN,
  p_address TEXT,
  p_sim_number TEXT,
  p_sim_class TEXT,
  p_sim_expiry TEXT,
  p_status TEXT,
  p_entity_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_phone TEXT;
  v_profile_id UUID;
  v_old_whatsapp TEXT;
  v_conflicting_profile_id UUID;
BEGIN
  -- Verify driver belongs to tenant
  SELECT whatsapp INTO v_old_whatsapp
  FROM public.md_drivers
  WHERE id = p_driver_id AND tenant_id = p_tenant_id;

  IF v_old_whatsapp IS NULL THEN
    RAISE EXCEPTION 'Driver not found in tenant';
  END IF;

  -- Get associated profile
  SELECT profile_id INTO v_profile_id
  FROM public.driver_tenant_links
  WHERE driver_id = p_driver_id AND tenant_id = p_tenant_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Orphan driver: No profile linked';
  END IF;

  v_normalized_phone := public.normalize_phone(p_whatsapp);

  -- Check if phone changed
  IF v_normalized_phone != public.normalize_phone(v_old_whatsapp) THEN
    -- Make sure new phone is not already taken by ANOTHER profile
    SELECT id INTO v_conflicting_profile_id
    FROM public.driver_profiles
    WHERE phone = v_normalized_phone AND id != v_profile_id
    LIMIT 1;

    IF v_conflicting_profile_id IS NOT NULL THEN
      RAISE EXCEPTION 'PROFILE_CONFLICT: Phone number already used by another profile';
    END IF;

    -- Update profile phone
    UPDATE public.driver_profiles
    SET phone = v_normalized_phone, full_name = p_name
    WHERE id = v_profile_id;
  END IF;

  -- Update md_drivers
  UPDATE public.md_drivers
  SET
    name = p_name,
    whatsapp = p_whatsapp,
    is_active = p_is_active,
    address = p_address,
    sim_number = p_sim_number,
    sim_class = p_sim_class,
    sim_expiry = p_sim_expiry,
    status = p_status,
    entity_id = p_entity_id,
    updated_at = NOW()
  WHERE id = p_driver_id AND tenant_id = p_tenant_id;

  RETURN json_build_object('success', true);
END;
$$;


-- 3. Deactivate Driver Atomic Flow
CREATE OR REPLACE FUNCTION public.deactivate_driver(
  p_driver_id UUID,
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify driver belongs to tenant
  IF NOT EXISTS (SELECT 1 FROM public.md_drivers WHERE id = p_driver_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Driver not found in tenant';
  END IF;

  -- Deactivate md_drivers
  UPDATE public.md_drivers
  SET is_active = false, updated_at = NOW()
  WHERE id = p_driver_id AND tenant_id = p_tenant_id;

  -- Deactivate driver_tenant_links
  UPDATE public.driver_tenant_links
  SET is_active = false, updated_at = NOW()
  WHERE driver_id = p_driver_id AND tenant_id = p_tenant_id;

  RETURN json_build_object('success', true);
END;
$$;


-- 4. Merge Driver Profile
CREATE OR REPLACE FUNCTION public.merge_driver_profile(
  p_source_profile_id UUID,
  p_target_profile_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_source_profile_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Cannot merge profile to itself';
  END IF;

  -- Verify both profiles exist
  IF NOT EXISTS (SELECT 1 FROM public.driver_profiles WHERE id = p_source_profile_id) THEN
    RAISE EXCEPTION 'Source profile not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.driver_profiles WHERE id = p_target_profile_id) THEN
    RAISE EXCEPTION 'Target profile not found';
  END IF;

  -- Detect tenant conflict (driver has links in BOTH profiles for the SAME tenant)
  IF EXISTS (
    SELECT 1
    FROM public.driver_tenant_links l1
    JOIN public.driver_tenant_links l2 ON l1.tenant_id = l2.tenant_id
    WHERE l1.profile_id = p_source_profile_id AND l2.profile_id = p_target_profile_id
  ) THEN
    RAISE EXCEPTION 'TENANT_CONFLICT: Both profiles have links in the same tenant. Manual resolution required.';
  END IF;

  -- Move links to target profile
  UPDATE public.driver_tenant_links
  SET profile_id = p_target_profile_id, updated_at = NOW()
  WHERE profile_id = p_source_profile_id;

  -- Deactivate source profile
  UPDATE public.driver_profiles
  SET is_active = false, updated_at = NOW()
  WHERE id = p_source_profile_id;

  RETURN json_build_object('success', true);
END;
$$;
