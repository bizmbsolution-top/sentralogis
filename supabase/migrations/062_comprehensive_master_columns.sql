-- Migration 062: Comprehensive master table column additions
-- Adds all columns referenced in code but potentially missing from DB
-- Safe to run: uses IF NOT EXISTS on all statements

-- ============================================
-- 1. md_entities
-- ============================================
ALTER TABLE md_entities ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE md_entities ADD COLUMN IF NOT EXISTS created_by UUID;

-- ============================================
-- 2. md_drivers
-- ============================================
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS medical_expiry DATE;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS last_medical_check DATE;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 3. md_fleet_types
-- ============================================
ALTER TABLE md_fleet_types ADD COLUMN IF NOT EXISTS dimension JSONB DEFAULT '{"length":0,"width":0,"height":0}'::jsonb;
ALTER TABLE md_fleet_types ADD COLUMN IF NOT EXISTS time_multiplier NUMERIC(5,2) DEFAULT 1.0;
ALTER TABLE md_fleet_types ADD COLUMN IF NOT EXISTS fuel_consumption NUMERIC(5,2) DEFAULT 1.0;
ALTER TABLE md_fleet_types ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- ============================================
-- 4. md_fleets
-- ============================================
ALTER TABLE md_fleets ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;
ALTER TABLE md_fleets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE md_fleets ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE md_fleets ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE md_fleets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 5. md_locations
-- ============================================
ALTER TABLE md_locations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'ID';
ALTER TABLE md_locations ADD COLUMN IF NOT EXISTS address_notes TEXT;
ALTER TABLE md_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 6. md_entity_addresses (ensure table exists)
-- ============================================
CREATE TABLE IF NOT EXISTS md_entity_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES md_entities(id) ON DELETE CASCADE,
  address_name TEXT NOT NULL DEFAULT '',
  address_type TEXT NOT NULL DEFAULT 'operational',
  address TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT '',
  province TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  latitude NUMERIC(10,7) DEFAULT 0,
  longitude NUMERIC(10,7) DEFAULT 0,
  contact_person TEXT DEFAULT '',
  contact_phone TEXT DEFAULT '',
  address_directions TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 7. md_transporters (ensure table exists)
-- ============================================
CREATE TABLE IF NOT EXISTS md_transporters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  transporter_code TEXT NOT NULL,
  transporter_name TEXT NOT NULL,
  transporter_type TEXT DEFAULT 'OWN_FLEET',
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  contract_number TEXT DEFAULT '',
  contract_start_date DATE,
  contract_end_date DATE,
  payment_terms TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, transporter_code)
);

-- ============================================
-- 8. md_transporter_fleets (ensure table exists)
-- ============================================
CREATE TABLE IF NOT EXISTS md_transporter_fleets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id UUID NOT NULL REFERENCES md_transporters(id) ON DELETE CASCADE,
  fleet_id UUID NOT NULL REFERENCES md_fleets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transporter_id, fleet_id)
);

-- ============================================
-- 9. md_transporter_drivers (ensure table exists)
-- ============================================
CREATE TABLE IF NOT EXISTS md_transporter_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id UUID NOT NULL REFERENCES md_transporters(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES md_drivers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transporter_id, driver_id)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_md_drivers_entity ON md_drivers(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_md_fleets_entity ON md_fleets(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_md_entity_addresses_entity ON md_entity_addresses(entity_id);
CREATE INDEX IF NOT EXISTS idx_md_transporters_tenant ON md_transporters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_transporter_fleets_tf ON md_transporter_fleets(transporter_id);
CREATE INDEX IF NOT EXISTS idx_md_transporter_drivers_td ON md_transporter_drivers(transporter_id);

-- ============================================
-- 10. invoices — add tenant_id for proper scoping
-- ============================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID;
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id) WHERE tenant_id IS NOT NULL;

-- Backfill tenant_id from work_orders for existing records
UPDATE invoices i
SET tenant_id = wo.tenant_id
FROM work_orders wo
WHERE i.wo_id = wo.id AND i.tenant_id IS NULL;

SELECT '062_comprehensive_master_columns OK' AS result;
