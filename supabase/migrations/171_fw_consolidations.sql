-- Migration 171: SBU Forwarding Consolidations and Price Master

-- 1. DROP EXISTING TABLES IF ANY
DROP TABLE IF EXISTS public.fw_container_items CASCADE;
DROP TABLE IF EXISTS public.fw_container_assignments CASCADE;
DROP TABLE IF EXISTS public.fw_consolidations CASCADE;
DROP TABLE IF EXISTS public.fw_price_master CASCADE;

-- 2. fw_price_master
CREATE TABLE IF NOT EXISTS public.fw_price_master (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             UUID NOT NULL,
  origin_port           TEXT NOT NULL,
  destination_port      TEXT NOT NULL,
  service_type          TEXT NOT NULL CHECK (service_type IN ('FCL', 'LCL')),
  container_type        TEXT,           
  delivery_type         TEXT NOT NULL DEFAULT 'D2D' CHECK (delivery_type IN ('D2D','P2P','D2P','P2D')),
  sell_price            NUMERIC,        
  sell_per_cbm          NUMERIC,        
  sell_min_cbm          NUMERIC,        
  cogs_pickup               NUMERIC DEFAULT 0,
  cogs_port_haulage_origin  NUMERIC DEFAULT 0,
  cogs_ocean_freight        NUMERIC DEFAULT 0,
  cogs_thc_origin           NUMERIC DEFAULT 0,
  cogs_thc_dest             NUMERIC DEFAULT 0,
  cogs_port_haulage_dest    NUMERIC DEFAULT 0,
  cogs_last_mile            NUMERIC DEFAULT 0,
  cogs_documentation        NUMERIC DEFAULT 0,
  cogs_other                NUMERIC DEFAULT 0,
  currency              TEXT DEFAULT 'IDR',
  effective_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date           DATE,           
  is_active             BOOLEAN DEFAULT true,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fw_price_master_unique UNIQUE (
    tenant_id, origin_port, destination_port,
    service_type, container_type, delivery_type, effective_date
  )
);

CREATE INDEX IF NOT EXISTS idx_fw_price_master_tenant ON public.fw_price_master(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fw_price_master TO authenticated;
ALTER TABLE public.fw_price_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fw_price_master_tenant_isolation" ON public.fw_price_master
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 2. fw_consolidations
CREATE TABLE IF NOT EXISTS public.fw_consolidations (
  id                              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                       UUID NOT NULL,
  consol_number                   TEXT NOT NULL,   
  shipping_line_id                UUID REFERENCES md_entities(id),
  shipping_line_name              TEXT,
  vessel_name                     TEXT NOT NULL,
  voyage_number                   TEXT,
  origin_port                     TEXT NOT NULL,
  destination_port                TEXT NOT NULL,
  etd                             DATE,
  eta                             DATE,
  actual_etd                      TIMESTAMPTZ,
  actual_eta                      TIMESTAMPTZ,
  consol_warehouse_origin_id      UUID REFERENCES md_warehouses(id),
  consol_warehouse_destination_id UUID REFERENCES md_warehouses(id),
  status                          TEXT DEFAULT 'open' CHECK (status IN ('open','stuffing','shipped','arrived','deconsol_done','closed')),
  created_by                      UUID REFERENCES auth.users(id),
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fw_consolidations_number_unique UNIQUE (tenant_id, consol_number)
);

CREATE INDEX IF NOT EXISTS idx_fw_consolidations_tenant ON public.fw_consolidations(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fw_consolidations TO authenticated;
ALTER TABLE public.fw_consolidations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fw_consolidations_tenant_isolation" ON public.fw_consolidations
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 3. fw_container_assignments
CREATE TABLE IF NOT EXISTS public.fw_container_assignments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL,
  consolidation_id  UUID NOT NULL REFERENCES fw_consolidations(id) ON DELETE CASCADE,
  container_number  TEXT NOT NULL,
  container_type    TEXT NOT NULL CHECK (container_type IN ('20GP','40GP','40HC','20RF','45HC')),
  seal_number       TEXT,
  bl_number         TEXT,            
  max_volume_cbm    NUMERIC,         
  status            TEXT DEFAULT 'empty' CHECK (status IN ('empty','stuffed','shipped','arrived','deconsoled','returned')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_container_assignments_consol ON public.fw_container_assignments(consolidation_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fw_container_assignments TO authenticated;
ALTER TABLE public.fw_container_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fw_container_assignments_tenant_isolation" ON public.fw_container_assignments
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 4. fw_container_items
CREATE TABLE IF NOT EXISTS public.fw_container_items (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL,
  container_assignment_id UUID NOT NULL REFERENCES fw_container_assignments(id) ON DELETE CASCADE,
  wo_item_id              UUID NOT NULL REFERENCES wo_items(id) ON DELETE CASCADE,
  volume_cbm              NUMERIC,
  gross_weight_kg         NUMERIC,
  packages                INTEGER,
  package_type            TEXT,       
  commodity               TEXT,
  description             TEXT,
  delivery_type           TEXT NOT NULL DEFAULT 'port_to_port' CHECK (delivery_type IN ('port_to_port','port_to_door', 'door_to_port', 'door_to_door')),
  delivery_address        TEXT,
  delivery_contact        TEXT,
  delivery_phone          TEXT,
  pickup_wo_id                  UUID REFERENCES work_orders(id),   
  port_haulage_origin_wo_id     UUID REFERENCES work_orders(id),   
  port_haulage_dest_wo_id       UUID REFERENCES work_orders(id),   
  last_mile_wo_id               UUID REFERENCES work_orders(id),   
  price_master_id         UUID REFERENCES fw_price_master(id),
  sell_price_snapshot     NUMERIC,        
  cogs_pickup             NUMERIC DEFAULT 0,  
  cogs_port_haulage_origin NUMERIC DEFAULT 0,
  cogs_ocean_freight      NUMERIC DEFAULT 0,
  cogs_thc_origin         NUMERIC DEFAULT 0,
  cogs_thc_dest           NUMERIC DEFAULT 0,
  cogs_port_haulage_dest  NUMERIC DEFAULT 0,
  cogs_last_mile          NUMERIC DEFAULT 0,  
  cogs_documentation      NUMERIC DEFAULT 0,
  cogs_other              NUMERIC DEFAULT 0,
  goods_received_at       TIMESTAMPTZ,
  is_deconsoled           BOOLEAN DEFAULT false,
  deconsoled_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_container_items_assignment ON public.fw_container_items(container_assignment_id);
CREATE INDEX IF NOT EXISTS idx_fw_container_items_wo_item ON public.fw_container_items(wo_item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fw_container_items TO authenticated;
ALTER TABLE public.fw_container_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fw_container_items_tenant_isolation" ON public.fw_container_items
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 5. Sequences and triggers for consol_number
CREATE SEQUENCE IF NOT EXISTS fw_consolidation_seq START 1;

CREATE OR REPLACE FUNCTION generate_fw_consol_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.consol_number IS NULL OR NEW.consol_number = '' THEN
    NEW.consol_number := 'FWD-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('fw_consolidation_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_fw_consol_number
BEFORE INSERT ON public.fw_consolidations
FOR EACH ROW
EXECUTE FUNCTION generate_fw_consol_number();

-- Update function timestamps
CREATE OR REPLACE FUNCTION update_fw_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fw_price_master_updated_at
BEFORE UPDATE ON public.fw_price_master
FOR EACH ROW EXECUTE FUNCTION update_fw_tables_updated_at();

CREATE TRIGGER trg_fw_consolidations_updated_at
BEFORE UPDATE ON public.fw_consolidations
FOR EACH ROW EXECUTE FUNCTION update_fw_tables_updated_at();

CREATE TRIGGER trg_fw_container_assignments_updated_at
BEFORE UPDATE ON public.fw_container_assignments
FOR EACH ROW EXECUTE FUNCTION update_fw_tables_updated_at();

CREATE TRIGGER trg_fw_container_items_updated_at
BEFORE UPDATE ON public.fw_container_items
FOR EACH ROW EXECUTE FUNCTION update_fw_tables_updated_at();

NOTIFY pgrst, 'reload schema';
