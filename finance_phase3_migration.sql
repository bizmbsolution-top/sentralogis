-- PHASE 3: DIGITALIZATION & BILLING POLICY

-- 1. Tambahkan kolom billing_method ke tabel customers
-- Opsi: 'epod' (langsung tagih setelah scan QR oleh driver) 
-- atau 'hardcopy' (tunggu surat jalan fisik kembali ke finance)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_method VARCHAR(20) DEFAULT 'hardcopy';

-- 2. Tambahkan kolom POD status di Job Orders untuk tracking audit fisik
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS pod_status VARCHAR(20) DEFAULT 'pending'; -- pending, received_hq, verified
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS pod_received_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS pod_received_by UUID REFERENCES auth.users(id);

-- 3. Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN customers.billing_method IS 'Kebijakan penagihan: epod (digital) atau hardcopy (fisik)';
COMMENT ON COLUMN job_orders.pod_status IS 'Status audit dokumen fisik Surat Jalan di HQ';
