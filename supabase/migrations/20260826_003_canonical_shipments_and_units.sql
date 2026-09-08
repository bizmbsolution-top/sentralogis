-- ============================================================================
-- Migration: 20260826_003_canonical_shipments_and_units.sql
-- Description: Canonical Forwarding & Journey Orchestration Schema
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 1)
-- ============================================================================

-- 1. shp_shipments (Operational Aggregate Root)
CREATE TABLE IF NOT EXISTS public.shp_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  shipment_number TEXT NOT NULL,
  work_order_id UUID NOT NULL REFERENCES public.commercial_work_orders(id) ON DELETE RESTRICT,
  service_scope_id UUID NOT NULL REFERENCES public.commercial_service_scopes(id),
  customer_id UUID NOT NULL REFERENCES public.md_entities(id),
  shipper_id UUID REFERENCES public.md_entities(id),
  consignee_id UUID REFERENCES public.md_entities(id),
  notify_party_id UUID REFERENCES public.md_entities(id),
  origin_location_id UUID NOT NULL REFERENCES public.md_locations(id),
  destination_location_id UUID NOT NULL REFERENCES public.md_locations(id),
  global_status shp_global_status NOT NULL DEFAULT 'DRAFT',
  tracking_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  master_bl_number TEXT,
  house_bl_number TEXT,
  booking_reference TEXT,
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  actual_departure_at TIMESTAMPTZ,
  actual_delivery_at TIMESTAMPTZ,
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_shp_number UNIQUE (tenant_id, shipment_number)
);

-- 2. shp_manifest_items (Commercial Commodities in Shipment)
CREATE TABLE IF NOT EXISTS public.shp_manifest_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES public.shp_shipments(id) ON DELETE CASCADE,
  item_sequence INTEGER NOT NULL DEFAULT 1,
  commodity_name TEXT NOT NULL,
  hs_code TEXT,
  package_quantity INTEGER NOT NULL DEFAULT 1,
  package_type TEXT NOT NULL DEFAULT 'COLLI',
  gross_weight_kg NUMERIC(15, 3) NOT NULL,
  volume_cbm NUMERIC(15, 4) NOT NULL,
  declared_customs_value NUMERIC(18, 2),
  declared_currency TEXT DEFAULT 'IDR',
  is_dangerous_goods BOOLEAN DEFAULT FALSE,
  dg_un_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_shp_manifest_item_seq UNIQUE (shipment_id, item_sequence)
);

-- 3. shp_units (Base Table for Polymorphic Handling Units)
CREATE TABLE IF NOT EXISTS public.shp_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES public.shp_shipments(id) ON DELETE CASCADE,
  unit_type shp_unit_type NOT NULL,
  unit_identifier TEXT NOT NULL,
  total_gross_weight_kg NUMERIC(15, 3) NOT NULL,
  total_volume_cbm NUMERIC(15, 4),
  current_location_id UUID REFERENCES public.md_locations(id),
  status TEXT NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Subtype: Containers
CREATE TABLE IF NOT EXISTS public.shp_unit_containers (
  unit_id UUID PRIMARY KEY REFERENCES public.shp_units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  container_number TEXT NOT NULL,
  iso_type TEXT NOT NULL DEFAULT '20GP',
  seal_number TEXT,
  tare_weight_kg NUMERIC(15, 3) DEFAULT 2200,
  max_payload_kg NUMERIC(15, 3) DEFAULT 28000,
  temperature_celsius NUMERIC(5, 2),
  is_soc BOOLEAN DEFAULT FALSE
);

-- 5. Subtype: Bulk Cargo
CREATE TABLE IF NOT EXISTS public.shp_unit_bulk (
  unit_id UUID PRIMARY KEY REFERENCES public.shp_units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  bulk_type TEXT NOT NULL, -- DRY_BULK, LIQUID_BULK
  metric_tonnage NUMERIC(15, 3) NOT NULL,
  moisture_percentage NUMERIC(5, 2),
  surveyor_report_number TEXT,
  surveyor_entity_id UUID REFERENCES public.md_entities(id)
);

-- 6. Subtype: Packages / Pallets
CREATE TABLE IF NOT EXISTS public.shp_unit_packages (
  unit_id UUID PRIMARY KEY REFERENCES public.shp_units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  parent_container_unit_id UUID REFERENCES public.shp_units(id),
  package_type TEXT NOT NULL, -- PALLET, WOODEN_CRATE, CARTON
  colli_count INTEGER NOT NULL DEFAULT 1,
  length_cm NUMERIC(10, 2),
  width_cm NUMERIC(10, 2),
  height_cm NUMERIC(10, 2),
  is_stackable BOOLEAN DEFAULT TRUE
);

-- 7. Subtype: Vehicles (CBU)
CREATE TABLE IF NOT EXISTS public.shp_unit_vehicles (
  unit_id UUID PRIMARY KEY REFERENCES public.shp_units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  vin_number TEXT NOT NULL,
  engine_number TEXT,
  vehicle_model TEXT NOT NULL,
  color TEXT,
  is_drivable BOOLEAN DEFAULT TRUE
);

-- 8. shp_execution_plans
CREATE TABLE IF NOT EXISTS public.shp_execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  shipment_id UUID NOT NULL UNIQUE REFERENCES public.shp_shipments(id) ON DELETE CASCADE,
  plan_version INTEGER NOT NULL DEFAULT 1,
  total_legs INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. shp_execution_legs
CREATE TABLE IF NOT EXISTS public.shp_execution_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES public.shp_shipments(id) ON DELETE CASCADE,
  execution_plan_id UUID NOT NULL REFERENCES public.shp_execution_plans(id) ON DELETE CASCADE,
  leg_sequence INTEGER NOT NULL,
  leg_code TEXT NOT NULL,
  transport_mode shp_transport_mode NOT NULL,
  execution_provider_type shp_execution_provider_type NOT NULL DEFAULT 'INTERNAL_SBU',
  origin_location_id UUID NOT NULL REFERENCES public.md_locations(id),
  destination_location_id UUID NOT NULL REFERENCES public.md_locations(id),
  assigned_vendor_id UUID REFERENCES public.md_entities(id),
  planned_start_at TIMESTAMPTZ,
  planned_end_at TIMESTAMPTZ,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_shp_leg_seq UNIQUE (execution_plan_id, leg_sequence)
);

-- 10. shp_leg_units (Many-to-Many Binding of Units to Execution Legs)
CREATE TABLE IF NOT EXISTS public.shp_leg_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  execution_leg_id UUID NOT NULL REFERENCES public.shp_execution_legs(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.shp_units(id) ON DELETE CASCADE,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_shp_leg_unit UNIQUE (execution_leg_id, unit_id)
);

-- 11. shp_milestones (Milestone Timeline Records)
CREATE TABLE IF NOT EXISTS public.shp_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES public.shp_shipments(id) ON DELETE CASCADE,
  execution_leg_id UUID REFERENCES public.shp_execution_legs(id),
  milestone_code TEXT NOT NULL,
  milestone_label TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location_id UUID REFERENCES public.md_locations(id),
  recorded_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 12. shp_exceptions (Exceptions & Demurrage Risks)
CREATE TABLE IF NOT EXISTS public.shp_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES public.shp_shipments(id) ON DELETE CASCADE,
  execution_leg_id UUID REFERENCES public.shp_execution_legs(id),
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. INDEXES
CREATE INDEX IF NOT EXISTS idx_shp_shipments_tenant ON public.shp_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shp_shipments_wo ON public.shp_shipments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_shp_shipments_token ON public.shp_shipments(tracking_token);
CREATE INDEX IF NOT EXISTS idx_shp_shipments_status ON public.shp_shipments(global_status);
CREATE INDEX IF NOT EXISTS idx_shp_manifest_shipment ON public.shp_manifest_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shp_units_shipment ON public.shp_units(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shp_units_tenant ON public.shp_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shp_legs_plan ON public.shp_execution_legs(execution_plan_id);
CREATE INDEX IF NOT EXISTS idx_shp_legs_shipment ON public.shp_execution_legs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shp_leg_units_leg ON public.shp_leg_units(execution_leg_id);
CREATE INDEX IF NOT EXISTS idx_shp_milestones_shipment ON public.shp_milestones(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shp_exceptions_shipment ON public.shp_exceptions(shipment_id);

-- 14. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_shipments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_manifest_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_unit_containers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_unit_bulk TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_unit_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_unit_vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_execution_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_execution_legs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_leg_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shp_exceptions TO authenticated;

-- 15. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.shp_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_manifest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_unit_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_unit_bulk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_unit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_unit_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_execution_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_leg_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shp_exceptions ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'shp_shipments', 'shp_manifest_items', 'shp_units', 'shp_unit_containers',
    'shp_unit_bulk', 'shp_unit_packages', 'shp_unit_vehicles', 'shp_execution_plans',
    'shp_execution_legs', 'shp_leg_units', 'shp_milestones', 'shp_exceptions'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY %I_tenant_isolation ON public.%I FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id()) WITH CHECK (tenant_id = public.get_my_tenant_id())', tbl, tbl);
  END LOOP;
END $$;

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
