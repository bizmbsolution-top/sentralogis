-- ============================================================================
-- SENTRALOGIS DATA-4E CANONICAL MIGRATION
-- Architecture: ADR-075 fw_locations → md_locations
-- Status: AUTHORIZED FOR EXECUTION
-- ============================================================================

-- PHASE 1: Create canonical md_locations from fw_locations
INSERT INTO public.md_locations (tenant_id, location_code, name, location_type, external_code, is_active, created_at, updated_at)
SELECT fl.tenant_id, 'FW-' || fl.location_id::TEXT, fl.name, fl.type, fl.location_id::TEXT, true, fl.created_at, fl.updated_at
FROM public.fw_locations fl
WHERE NOT EXISTS (
  SELECT 1 FROM public.md_locations ml
  WHERE ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
);

-- PHASE 2: Drop old FK constraints (both naming conventions)
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fw_order_headers_origin_port_id_fkey;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_port;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fw_order_headers_dest_port_id_fkey;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_dest_port;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fw_legs_start_location_id_fkey;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_start_location;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fw_legs_end_location_id_fkey;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_end_location;

-- PHASE 3: Transform FK values (tenant-scoped)
UPDATE public.fw_order_headers oh SET origin_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id;

UPDATE public.fw_order_headers oh SET dest_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.dest_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id;

UPDATE public.fw_legs leg SET start_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id;

UPDATE public.fw_legs leg SET end_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.end_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id;

-- PHASE 4: Add new FK constraints (conditional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fw_order_headers_origin_location') THEN
    ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_origin_location
      FOREIGN KEY (origin_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fw_order_headers_dest_location') THEN
    ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_dest_location
      FOREIGN KEY (dest_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fw_legs_start_location_md') THEN
    ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_start_location_md
      FOREIGN KEY (start_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fw_legs_end_location_md') THEN
    ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_end_location_md
      FOREIGN KEY (end_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
END $$;
