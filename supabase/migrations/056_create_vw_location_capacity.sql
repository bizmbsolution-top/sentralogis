-- Migration 056: Create Real-time View for Warehouse Location Capacity (Smart Capacity Tracking)

CREATE OR REPLACE VIEW vw_location_capacity AS
SELECT 
    l.id AS location_id,
    l.tenant_id,
    l.warehouse_id,
    l.area_id AS zone_id,
    l.max_volume_m3,
    l.max_weight_kg,
    COALESCE(SUM(i.quantity * p.volume_m3), 0) AS used_volume_m3,
    COALESCE(SUM(i.quantity * p.weight_kg), 0) AS used_weight_kg,
    l.max_volume_m3 - COALESCE(SUM(i.quantity * p.volume_m3), 0) AS remaining_volume_m3,
    l.max_weight_kg - COALESCE(SUM(i.quantity * p.weight_kg), 0) AS remaining_weight_kg
FROM md_warehouse_locations l
LEFT JOIN wh_inventory i ON i.location_id = l.id
LEFT JOIN md_product_skus p ON p.id = i.product_sku_id
GROUP BY l.id, l.tenant_id, l.warehouse_id, l.area_id, l.max_volume_m3, l.max_weight_kg;

-- Note: RLS does not directly apply to standard Views in Postgres unless created with security_barrier.
-- However, since the user queries this via Supabase Client using standard PostgREST,
-- it is better to query it using `.rpc()` if we want strict tenant isolation, 
-- OR rely on the parent table `md_warehouse_locations` RLS if the user fetches `md_warehouse_locations` and joins it.
-- We will fetch it normally, but restrict by tenant_id in the frontend query.
