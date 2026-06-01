-- Migration: 056_jo_warehouse_assignments.sql
-- Description: Create junction table for assigning Job Orders to specific Warehouse Locations, tracking capacity usage.

CREATE TABLE IF NOT EXISTS jo_warehouse_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
    warehouse_location_id UUID NOT NULL REFERENCES md_warehouse_locations(id) ON DELETE CASCADE,
    allocated_cbm NUMERIC(12, 2) DEFAULT 0,
    allocated_kg NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE jo_warehouse_assignments ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Enable read for authenticated users on jo_warehouse_assignments" ON jo_warehouse_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users on jo_warehouse_assignments" ON jo_warehouse_assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users on jo_warehouse_assignments" ON jo_warehouse_assignments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users on jo_warehouse_assignments" ON jo_warehouse_assignments FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to auto-update updated_at
CREATE TRIGGER update_jo_warehouse_assignments_updated_at
    BEFORE UPDATE ON jo_warehouse_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
