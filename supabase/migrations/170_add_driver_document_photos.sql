-- Migration 170: Add document photo columns to md_drivers
-- SIM Photo, E-KTP Photo, STNK Photo

ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS sim_photo_url TEXT;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS ktp_photo_url TEXT;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS stnk_photo_url TEXT;
