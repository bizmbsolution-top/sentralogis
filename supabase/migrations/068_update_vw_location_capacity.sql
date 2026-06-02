DROP VIEW IF EXISTS vw_location_capacity;

CREATE OR REPLACE VIEW vw_location_capacity AS
SELECT 
    l.id AS location_id,
    l.code AS location_code,
    l.warehouse_id,
    l.tenant_id,
    l.area_id AS zone_id,
    l.max_volume_m3,
    l.max_weight_kg,
    COALESCE(SUM(a.quantity), 0) AS total_qty,
    COALESCE(SUM(a.quantity * m.unit_weight_kg), 0) AS used_weight_kg,
    COALESCE(SUM(a.quantity * m.unit_volume_m3), 0) AS used_volume_m3
FROM md_warehouse_locations l
LEFT JOIN jo_warehouse_assignments a ON l.id = a.warehouse_location_id
LEFT JOIN wo_item_manifests m ON a.wo_item_manifest_id = m.id
GROUP BY l.id, l.tenant_id, l.warehouse_id, l.area_id, l.max_volume_m3, l.max_weight_kg;

-- Grant permissions
GRANT SELECT ON vw_location_capacity TO authenticated, anon;
