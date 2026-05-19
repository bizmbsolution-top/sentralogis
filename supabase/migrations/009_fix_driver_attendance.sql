-- Fix driver_attendance table - add missing columns
-- Eksekusi ini di Supabase SQL Editor

-- Add status column if not exists
ALTER TABLE driver_attendance ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'CHECK_IN';

-- Add attendance_type column if not exists  
ALTER TABLE driver_attendance ADD COLUMN IF NOT EXISTS attendance_type TEXT;

-- Add latitude/longitude columns if not exists
ALTER TABLE driver_attendance ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE driver_attendance ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;