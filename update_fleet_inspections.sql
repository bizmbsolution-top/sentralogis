-- SQL Script untuk menambahkan fitur Pelacakan Perbaikan (Maintenance) Armada
-- Silakan jalankan script ini di SQL Editor Supabase Anda.

ALTER TABLE fleet_inspections
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_notes TEXT,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

-- Opsional: Jika Anda ingin agar inspeksi yang statusnya LAYAK JALAN dianggap tidak perlu perbaikan
UPDATE fleet_inspections 
SET is_resolved = true 
WHERE status = 'LAYAK JALAN';
