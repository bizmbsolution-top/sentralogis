-- Migration 052: International Standard SKU Upgrade

-- 1. Tambahkan customer_id untuk mengisolasi SKU per Pelanggan
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_md_product_skus_customer ON md_product_skus(customer_id);

-- 2. International Barcodes
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS upc_code TEXT;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS ean_code TEXT;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS hs_code TEXT;

CREATE INDEX IF NOT EXISTS idx_md_product_skus_upc ON md_product_skus(upc_code);
CREATE INDEX IF NOT EXISTS idx_md_product_skus_ean ON md_product_skus(ean_code);

-- 3. Branding & Manufacturer
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS manufacturer TEXT;

-- 4. Galeri Visual (JSONB Array of URLs)
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- 5. Special Handling Rules
-- Default: no special handling
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS handling_rules JSONB DEFAULT '{"requires_qc": false, "print_barcode_on_inbound": false, "is_fragile": false, "temperature_min": null, "temperature_max": null}'::jsonb;

-- 6. Advanced UOM (Unit of Measurement)
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS base_uom TEXT DEFAULT 'PCS';
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS default_inbound_uom TEXT;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS default_outbound_uom TEXT;

-- uom_conversions JSONB format example:
-- [{"from_uom": "BOX", "to_uom": "PCS", "multiplier": 24}, {"from_uom": "PALLET", "to_uom": "BOX", "multiplier": 50}]
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS uom_conversions JSONB DEFAULT '[]'::jsonb;

-- 7. Inventory Thresholds
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 0;

-- 8. Menambahkan Storage Rule (LIFO/LEFO)
-- Note: Kita tidak bisa drop/add check constraint dengan mudah tanpa mengganti seluruh table jika ada data.
-- Solusi yang lebih aman: kita abaikan constraint check jika DBMS tidak mengizinkan, tapi karena ini Postgres, kita drop dan add constraint baru.
ALTER TABLE md_product_skus DROP CONSTRAINT IF EXISTS md_product_skus_storage_rule_check;
ALTER TABLE md_product_skus ADD CONSTRAINT md_product_skus_storage_rule_check CHECK (storage_rule IN ('FIFO', 'FEFO', 'LIFO', 'LEFO', 'NONE'));
