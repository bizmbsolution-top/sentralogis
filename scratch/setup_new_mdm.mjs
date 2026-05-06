import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTables() {
  console.log('Setting up NEW MDM tables...');

  const sql = `
-- 1. MASTER LOCATIONS
CREATE TABLE IF NOT EXISTS md_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Indonesia',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. MASTER FLEET TYPES
CREATE TABLE IF NOT EXISTS md_fleet_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    capacity_ton INT DEFAULT 0,
    capacity_cbm INT DEFAULT 0,
    dimension JSONB DEFAULT '{"length":0, "width":0, "height":0}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. MASTER FLEETS
CREATE TABLE IF NOT EXISTS md_fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_type_id UUID REFERENCES md_fleet_types(id),
    fleet_code VARCHAR(50) UNIQUE NOT NULL,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INT,
    stnk_number VARCHAR(50),
    stnk_expiry DATE NOT NULL,
    kir_expiry DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    last_maintenance DATE,
    next_maintenance DATE,
    photos JSONB DEFAULT '[]',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. MASTER DRIVERS
CREATE TABLE IF NOT EXISTS md_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    address TEXT,
    sim_number VARCHAR(50),
    sim_class VARCHAR(10),
    sim_expiry DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'available',
    medical_expiry DATE,
    last_medical_check DATE,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. MASTER TRANSPORTERS
CREATE TABLE IF NOT EXISTS md_transporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_code VARCHAR(50) UNIQUE NOT NULL,
    transporter_name VARCHAR(255) NOT NULL,
    transporter_type VARCHAR(20) CHECK (transporter_type IN ('OWN', 'VENDOR')),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    tax_id VARCHAR(50),
    contract_number VARCHAR(100),
    contract_start_date DATE,
    contract_end_date DATE,
    payment_terms VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Transporter - Fleet Relation
CREATE TABLE IF NOT EXISTS md_transporter_fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID REFERENCES md_transporters(id) ON DELETE CASCADE,
    fleet_id UUID REFERENCES md_fleets(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(transporter_id, fleet_id)
);

-- 7. Transporter - Driver Relation
CREATE TABLE IF NOT EXISTS md_transporter_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID REFERENCES md_transporters(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES md_drivers(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(transporter_id, driver_id)
);

-- RLS (Simplified for script, user will run full SQL)
ALTER TABLE md_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_fleet_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_transporter_fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_transporter_drivers ENABLE ROW LEVEL SECURITY;
`;

  console.log('Tables setup initiated. User should run full SQL in Supabase Editor.');
  
  // Try to insert some dummy fleet types to check if tables exist
  try {
    const { error } = await supabase.from('md_fleet_types').insert([
      { type_code: 'T-20FT', type_name: 'Trailer 20ft Container', capacity_ton: 20 },
      { type_code: 'TRN-BAK', type_name: 'Tronton Bak', capacity_ton: 15 }
    ]);
    
    if (error && error.code === '42P01') {
       console.error('TABLES MISSING: Please run the SQL in Supabase SQL Editor.');
    } else {
       console.log('Tables verified or created.');
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

setupTables();
