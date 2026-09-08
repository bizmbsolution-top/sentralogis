-- 174_fw_locations.sql
-- Migration to add fw_locations table
-- Required columns: location_id (UUID), name, type (location_type enum), created_at, updated_at

CREATE TABLE public.fw_locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fw_locations_name ON public.fw_locations(name);