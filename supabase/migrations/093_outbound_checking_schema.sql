-- 093_outbound_checking_schema.sql

-- Tambahkan checked_qty dan damage_qty ke tabel item pengiriman keluar
ALTER TABLE wh_outbound_shipment_items ADD COLUMN IF NOT EXISTS checked_qty NUMERIC(15,2) DEFAULT 0;
ALTER TABLE wh_outbound_shipment_items ADD COLUMN IF NOT EXISTS damage_qty NUMERIC(15,2) DEFAULT 0;

-- Buat tabel pencatatan kerusakan (damage) untuk Outbound
CREATE TABLE IF NOT EXISTS wh_outbound_damage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_item_id UUID NOT NULL REFERENCES wh_outbound_shipment_items(id) ON DELETE CASCADE,
  damage_qty NUMERIC(15,2) NOT NULL,
  damage_source TEXT CHECK (damage_source IN ('WAREHOUSE_STAFF', 'PICKING', 'OTHER')),
  damage_condition TEXT CHECK (damage_condition IN ('DAMAGED_PACKAGE_FULL_CONTENT', 'GOOD_PACKAGE_MISSING_CONTENT', 'TOTAL_DAMAGE')),
  damage_notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aktifkan RLS
ALTER TABLE wh_outbound_damage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public ALL for outbound damage records"
  ON wh_outbound_damage_records FOR ALL USING (true);

-- Berikan izin ke anon dan authenticated (diperlukan untuk PostgREST)
GRANT ALL ON TABLE wh_outbound_damage_records TO anon;
GRANT ALL ON TABLE wh_outbound_damage_records TO authenticated;

GRANT ALL ON TABLE wh_outbound_shipment_items TO anon;
GRANT ALL ON TABLE wh_outbound_shipment_items TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';
