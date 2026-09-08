-- ============================================================================
-- DATA-4E LIVE VERIFICATION
-- READ-ONLY — SAFE TO RUN IN SUPABASE SQL EDITOR
-- ============================================================================
-- Purpose: Verify prerequisite constraints for migration 049
-- No data modification. All statements are SELECT-only.
-- ============================================================================

-- ============================================================================
-- CHECK 1 — Duplicate (tenant_id, external_code)
-- ============================================================================
SELECT
  tenant_id,
  external_code,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id) AS affected_ids
FROM public.md_locations
WHERE external_code IS NOT NULL
GROUP BY tenant_id, external_code
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================================================
-- CHECK 2 — Duplicate (tenant_id, location_code)
-- ============================================================================
SELECT
  tenant_id,
  location_code,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(id) AS affected_ids
FROM public.md_locations
WHERE location_code IS NOT NULL
GROUP BY tenant_id, location_code
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ============================================================================
-- CHECK 3 — Generated FW-<location_id> Collision
-- ============================================================================
SELECT
  fl.tenant_id,
  fl.location_id AS fw_location_id,
  'FW-' || fl.location_id::TEXT AS generated_location_code,
  ml.id AS existing_md_location_id,
  ml.name AS existing_md_location_name
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.location_code = 'FW-' || fl.location_id::TEXT
ORDER BY fl.tenant_id, fl.location_id;

-- ============================================================================
-- CHECK 4 — Ambiguous Canonical Mapping
-- ============================================================================
SELECT
  fl.tenant_id,
  fl.location_id AS fw_location_id,
  fl.location_id::TEXT AS external_code,
  COUNT(ml.id) AS matching_md_location_count,
  ARRAY_AGG(ml.id) AS matching_ids
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
GROUP BY fl.tenant_id, fl.location_id
HAVING COUNT(ml.id) > 1
ORDER BY matching_md_location_count DESC;

-- ============================================================================
-- CHECK 5 — Missing Canonical Mapping After Proposed Insert
-- ============================================================================
SELECT
  COUNT(*) AS total_fw_locations,
  COUNT(ml.id) AS already_mapped,
  COUNT(*) - COUNT(ml.id) AS would_insert
FROM public.fw_locations fl
LEFT JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT;

-- ============================================================================
-- CHECK 6 — Existing fw_locations References
-- ============================================================================
SELECT
  'fw_order_headers.origin_port_id' AS source,
  COUNT(*) AS reference_count
FROM public.fw_order_headers
WHERE origin_port_id IS NOT NULL

UNION ALL

SELECT
  'fw_order_headers.dest_port_id' AS source,
  COUNT(*) AS reference_count
FROM public.fw_order_headers
WHERE dest_port_id IS NOT NULL

UNION ALL

SELECT
  'fw_legs.start_location_id' AS source,
  COUNT(*) AS reference_count
FROM public.fw_legs
WHERE start_location_id IS NOT NULL

UNION ALL

SELECT
  'fw_legs.end_location_id' AS source,
  COUNT(*) AS reference_count
FROM public.fw_legs
WHERE end_location_id IS NOT NULL;

-- ============================================================================
-- CHECK 7 — Unresolvable References
-- ============================================================================
-- fw_order_headers.origin_port_id that doesn't match any fw_locations
SELECT
  'fw_order_headers.origin_port_id' AS source_table_column,
  oh.order_id,
  oh.tenant_id,
  oh.origin_port_id AS unresolved_reference
FROM public.fw_order_headers oh
LEFT JOIN public.fw_locations fl
  ON fl.location_id = oh.origin_port_id
  AND fl.tenant_id = oh.tenant_id
WHERE fl.location_id IS NULL

UNION ALL

-- fw_order_headers.dest_port_id that doesn't match any fw_locations
SELECT
  'fw_order_headers.dest_port_id' AS source_table_column,
  oh.order_id,
  oh.tenant_id,
  oh.dest_port_id AS unresolved_reference
FROM public.fw_order_headers oh
LEFT JOIN public.fw_locations fl
  ON fl.location_id = oh.dest_port_id
  AND fl.tenant_id = oh.tenant_id
WHERE fl.location_id IS NULL

UNION ALL

-- fw_legs.start_location_id that doesn't match any fw_locations
SELECT
  'fw_legs.start_location_id' AS source_table_column,
  leg.leg_id AS order_id,
  leg.tenant_id,
  leg.start_location_id AS unresolved_reference
FROM public.fw_legs leg
LEFT JOIN public.fw_locations fl
  ON fl.location_id = leg.start_location_id
  AND fl.tenant_id = leg.tenant_id
WHERE fl.location_id IS NULL

UNION ALL

-- fw_legs.end_location_id that doesn't match any fw_locations
SELECT
  'fw_legs.end_location_id' AS source_table_column,
  leg.leg_id AS order_id,
  leg.tenant_id,
  leg.end_location_id AS unresolved_reference
FROM public.fw_legs leg
LEFT JOIN public.fw_locations fl
  ON fl.location_id = leg.end_location_id
  AND fl.tenant_id = leg.tenant_id
WHERE fl.location_id IS NULL;

-- ============================================================================
-- CHECK 8 — Proposed Constraint Readiness Summary
-- ============================================================================
SELECT
  (SELECT COUNT(*) FROM (
    SELECT tenant_id, external_code
    FROM public.md_locations
    WHERE external_code IS NOT NULL
    GROUP BY tenant_id, external_code
    HAVING COUNT(*) > 1
  ) dup) AS duplicate_external_code,

  (SELECT COUNT(*) FROM (
    SELECT tenant_id, location_code
    FROM public.md_locations
    WHERE location_code IS NOT NULL
    GROUP BY tenant_id, location_code
    HAVING COUNT(*) > 1
  ) dup) AS duplicate_location_code,

  (SELECT COUNT(*) FROM public.fw_locations fl
   JOIN public.md_locations ml
     ON ml.tenant_id = fl.tenant_id
     AND ml.location_code = 'FW-' || fl.location_id::TEXT
  ) AS generated_code_collisions,

  (SELECT COUNT(*) FROM (
    SELECT fl.tenant_id, fl.location_id
    FROM public.fw_locations fl
    JOIN public.md_locations ml
      ON ml.tenant_id = fl.tenant_id
      AND ml.external_code = fl.location_id::TEXT
    GROUP BY fl.tenant_id, fl.location_id
    HAVING COUNT(ml.id) > 1
  ) amb) AS ambiguous_mappings,

  (SELECT COUNT(*) FROM public.fw_locations fl
   LEFT JOIN public.md_locations ml
     ON ml.tenant_id = fl.tenant_id
     AND ml.external_code = fl.location_id::TEXT
   WHERE ml.id IS NULL
  ) AS fw_locations_to_insert,

  (SELECT COUNT(*) FROM (
    SELECT oh.order_id, oh.origin_port_id AS ref
    FROM public.fw_order_headers oh
    LEFT JOIN public.fw_locations fl ON fl.location_id = oh.origin_port_id AND fl.tenant_id = oh.tenant_id
    WHERE fl.location_id IS NULL
    UNION ALL
    SELECT oh.order_id, oh.dest_port_id
    FROM public.fw_order_headers oh
    LEFT JOIN public.fw_locations fl ON fl.location_id = oh.dest_port_id AND fl.tenant_id = oh.tenant_id
    WHERE fl.location_id IS NULL
    UNION ALL
    SELECT leg.leg_id, leg.start_location_id
    FROM public.fw_legs leg
    LEFT JOIN public.fw_locations fl ON fl.location_id = leg.start_location_id AND fl.tenant_id = leg.tenant_id
    WHERE fl.location_id IS NULL
    UNION ALL
    SELECT leg.leg_id, leg.end_location_id
    FROM public.fw_legs leg
    LEFT JOIN public.fw_locations fl ON fl.location_id = leg.end_location_id AND fl.tenant_id = leg.tenant_id
    WHERE fl.location_id IS NULL
  ) unres) AS unresolvable_references;
