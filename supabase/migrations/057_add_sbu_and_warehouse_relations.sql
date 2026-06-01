-- Migration 057: Add SBU and Warehouse relations

-- 1. Add sbu_id to md_warehouses
ALTER TABLE md_warehouses ADD COLUMN IF NOT EXISTS sbu_id UUID REFERENCES tenant_sbus(id) ON DELETE SET NULL;

-- 2. Add warehouse_id to tenant_users
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES md_warehouses(id) ON DELETE SET NULL;

-- Optional: Re-create vw_location_capacity if we need sbu_id exposed, but right now the view only uses location tables.
