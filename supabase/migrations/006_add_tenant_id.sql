-- Add tenant_id to driver_attendance and fleet_inspections
-- Eksekusi ini di Supabase SQL Editor

-- Add tenant_id column to driver_attendance
ALTER TABLE driver_attendance ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add tenant_id column to fleet_inspections
ALTER TABLE fleet_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_driver_attendance_tenant ON driver_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleet_inspections_tenant ON fleet_inspections(tenant_id);