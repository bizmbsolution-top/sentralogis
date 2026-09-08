-- ============================================================================
-- Migration: 20260826_007_legacy_compatibility_views.sql
-- Description: Read-Only Legacy Compatibility Views & Sanitized Tracking Projection
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 1)
-- ============================================================================

-- 1. v_legacy_fw_consolidations (Backward-compatible View for Forwarding Dashboard)
CREATE OR REPLACE VIEW public.v_legacy_fw_consolidations AS
SELECT 
  s.id,
  s.tenant_id,
  s.shipment_number AS consol_number,
  s.shipper_id AS shipping_line_id,
  e.name AS shipping_line_name,
  s.booking_reference AS vessel_name,
  s.master_bl_number AS voyage_number,
  loc_orig.name AS origin_port,
  loc_dest.name AS destination_port,
  s.etd::DATE AS etd,
  s.eta::DATE AS eta,
  s.actual_departure_at AS actual_etd,
  s.actual_delivery_at AS actual_eta,
  s.global_status::TEXT AS status,
  s.created_at,
  s.updated_at
FROM public.shp_shipments s
LEFT JOIN public.md_entities e ON s.shipper_id = e.id
LEFT JOIN public.md_locations loc_orig ON s.origin_location_id = loc_orig.id
LEFT JOIN public.md_locations loc_dest ON s.destination_location_id = loc_dest.id;

-- 2. v_legacy_fw_containers (Backward-compatible View for Container Stuffing)
CREATE OR REPLACE VIEW public.v_legacy_fw_containers AS
SELECT 
  u.id,
  u.tenant_id,
  u.shipment_id AS consolidation_id,
  c.container_number,
  c.iso_type AS container_type,
  c.seal_number,
  u.status,
  c.tare_weight_kg,
  c.max_payload_kg,
  u.total_gross_weight_kg,
  u.total_volume_cbm,
  u.created_at,
  u.updated_at
FROM public.shp_units u
JOIN public.shp_unit_containers c ON u.id = c.unit_id
WHERE u.unit_type = 'CONTAINER';

-- 3. fn_get_sanitized_customer_tracking (Zero-Cost Public Tracking Projection)
CREATE OR REPLACE FUNCTION public.fn_get_sanitized_customer_tracking(p_tracking_token TEXT)
RETURNS TABLE (
  shipment_id UUID,
  shipment_number TEXT,
  global_status TEXT,
  origin_name TEXT,
  origin_city TEXT,
  destination_name TEXT,
  destination_city TEXT,
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  actual_departure_at TIMESTAMPTZ,
  actual_delivery_at TIMESTAMPTZ,
  milestones JSONB,
  manifest_items JSONB
) SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS shipment_id,
    s.shipment_number,
    s.global_status::TEXT,
    orig.name AS origin_name,
    orig.city AS origin_city,
    dest.name AS destination_name,
    dest.city AS destination_city,
    s.etd,
    s.eta,
    s.actual_departure_at,
    s.actual_delivery_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', m.milestone_code,
            'label', m.milestone_label,
            'occurred_at', m.occurred_at
          ) ORDER BY m.occurred_at ASC
        )
        FROM public.shp_milestones m 
        WHERE m.shipment_id = s.id
      ),
      '[]'::jsonb
    ) AS milestones,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'commodity', mi.commodity_name,
            'packages', mi.package_quantity,
            'package_type', mi.package_type,
            'gross_weight_kg', mi.gross_weight_kg,
            'volume_cbm', mi.volume_cbm
          ) ORDER BY mi.item_sequence ASC
        )
        FROM public.shp_manifest_items mi 
        WHERE mi.shipment_id = s.id
      ),
      '[]'::jsonb
    ) AS manifest_items
  FROM public.shp_shipments s
  JOIN public.md_locations orig ON s.origin_location_id = orig.id
  JOIN public.md_locations dest ON s.destination_location_id = dest.id
  WHERE s.tracking_token = p_tracking_token;
END;
$$;

-- 4. GRANTS
GRANT SELECT ON public.v_legacy_fw_consolidations TO authenticated;
GRANT SELECT ON public.v_legacy_fw_containers TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_sanitized_customer_tracking(TEXT) TO anon, authenticated, service_role;

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
