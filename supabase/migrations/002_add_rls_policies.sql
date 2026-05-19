-- Add RLS Policies untuk Driver Portal
-- Eksekusi ini di Supabase SQL Editor

-- Nonaktifkan RLS untuk simplicity (driver portal tidak pakai full auth)
ALTER TABLE driver_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_performance_logs DISABLE ROW LEVEL SECURITY;