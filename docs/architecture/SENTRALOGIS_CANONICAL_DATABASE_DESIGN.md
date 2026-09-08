# SENTRALOGIS — CANONICAL DATABASE DESIGN v1.0
## PostgreSQL / Supabase Schema Architecture & DDL Specification
**Document Version:** 1.0.0-DDL-SPEC  
**Status:** APPROVED DATABASE DESIGN  
**Classification:** Internal Technical Standard  

---

# 1. DATABASE ARCHITECTURE PRINCIPLES

1. **Domain-Oriented Prefixes**: Every table carries a strict domain prefix:
   - `com_*` : Commercial Domain
   - `shp_*` : Forwarding & Journey Orchestration Domain
   - `svc_*` : Service Request Contracts
   - `trk_*` : SBU Trucking Execution Domain
   - `cus_*` : SBU Customs Clearance Domain
   - `wh_*`  : SBU Warehouse Domain
   - `exc_*` : Partner & Carrier Exchange Domain
   - `fin_*` : Finance & Accounting Domain
   - `int_*` : Intelligence & Control Tower Projections
   - `md_*`  : Enterprise Master Data
2. **Table-per-Type (TPT) Polymorphic Relational Design**: Avoid polymorphic text FK columns (e.g. `source_table`, `source_id`) that break PostgreSQL referential integrity. Kargo physical units use a base table `shp_units` joined to subtype tables (`shp_unit_containers`, `shp_unit_bulk`, `shp_unit_packages`, `shp_unit_vehicles`) via concrete 1:1 Foreign Keys.
3. **Deterministic Multi-Tenancy**: Every transactional table contains `tenant_id UUID NOT NULL REFERENCES md_tenants(id)` enforced by Row Level Security (RLS).
4. **Audit & Optimistic Concurrency**: Every mutable table includes `created_at`, `updated_at`, `created_by`, `updated_by`, and an integer `version_no` for optimistic concurrency locking.

---

# 2. CANONICAL DATABASE SCHEMA (DDL SPECIFICATION)

```sql
-- ============================================================================
-- EXTENSIONS & ENUMS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Commercial Enums
CREATE TYPE com_incoterm_type AS ENUM (
  'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'
);

CREATE TYPE com_work_order_status AS ENUM (
  'DRAFT', 'SUBMITTED', 'CONFIRMED', 'IN_EXECUTION', 'FULFILLED', 'BILLED', 'CLOSED', 'CANCELLED'
);

-- Shipment Enums
CREATE TYPE shp_global_status AS ENUM (
  'DRAFT', 'PLANNED', 'BOOKED', 'IN_TRANSIT', 'AT_INTERMEDIATE_NODE',
  'CUSTOMS_HOLD', 'CUSTOMS_RELEASED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'EXCEPTION_HOLD', 'CANCELLED'
);

CREATE TYPE shp_unit_type AS ENUM (
  'CONTAINER', 'BULK_MT', 'BREAKBULK', 'PALLET', 'BOX', 'VEHICLE', 'TANK'
);

CREATE TYPE shp_transport_mode AS ENUM (
  'ROAD_TRUCK', 'OCEAN_VESSEL', 'BARGE', 'AIR_FREIGHT', 'RAIL_FREIGHT',
  'PORT_TERMINAL_HANDLING', 'WAREHOUSE_STAGING', 'CUSTOMS_CLEARANCE'
);

CREATE TYPE shp_execution_provider_type AS ENUM (
  'INTERNAL_SBU', 'EXTERNAL_VENDOR'
);

-- Service Request Enums
CREATE TYPE svc_request_status AS ENUM (
  'ISSUED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'EXECUTING', 'FULFILLED', 'REROUTING', 'CANCELLED'
);

-- Customs Enums
CREATE TYPE cus_declaration_type AS ENUM (
  'PIB_IMPORT', 'PEB_EXPORT', 'TPB_BC23', 'TRANSIT_BC12'
);

CREATE TYPE cus_channel_type AS ENUM (
  'GREEN', 'YELLOW', 'RED', 'PRIORITY'
);

-- ============================================================================
-- 1. COMMERCIAL DOMAIN (com_*)
-- ============================================================================

CREATE TABLE commercial_service_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  scope_code TEXT NOT NULL,
  scope_name TEXT NOT NULL,
  incoterm com_incoterm_type NOT NULL DEFAULT 'DAP',
  incoterm_named_place TEXT,
  origin_scope_node_id UUID REFERENCES md_locations(id),
  dest_scope_node_id UUID REFERENCES md_locations(id),
  included_services TEXT[] NOT NULL DEFAULT '{}',
  excluded_services TEXT[] NOT NULL DEFAULT '{}',
  billing_currency TEXT NOT NULL DEFAULT 'IDR',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_com_scope_code UNIQUE (tenant_id, scope_code)
);

CREATE TABLE commercial_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  wo_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES md_entities(id),
  service_scope_id UUID NOT NULL REFERENCES commercial_service_scopes(id),
  contract_reference TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_fulfillment_date DATE,
  status com_work_order_status NOT NULL DEFAULT 'DRAFT',
  currency TEXT NOT NULL DEFAULT 'IDR',
  total_agreed_revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  commercial_notes TEXT,
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_com_wo_number UNIQUE (tenant_id, wo_number)
);

CREATE TABLE commercial_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  work_order_id UUID NOT NULL REFERENCES commercial_work_orders(id) ON DELETE CASCADE,
  line_sequence INTEGER NOT NULL DEFAULT 1,
  service_product_sku TEXT NOT NULL,
  service_description TEXT NOT NULL,
  quantity NUMERIC(15, 3) NOT NULL DEFAULT 1,
  unit_of_measure TEXT NOT NULL DEFAULT 'UNIT',
  unit_sell_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_sell_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_com_wo_line_seq UNIQUE (work_order_id, line_sequence)
);

-- ============================================================================
-- 2. FORWARDING & JOURNEY ORCHESTRATION DOMAIN (shp_*)
-- ============================================================================

CREATE TABLE shp_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  shipment_number TEXT NOT NULL,
  work_order_id UUID NOT NULL REFERENCES commercial_work_orders(id) ON DELETE RESTRICT,
  service_scope_id UUID NOT NULL REFERENCES commercial_service_scopes(id),
  customer_id UUID NOT NULL REFERENCES md_entities(id),
  shipper_id UUID REFERENCES md_entities(id),
  consignee_id UUID REFERENCES md_entities(id),
  notify_party_id UUID REFERENCES md_entities(id),
  origin_location_id UUID NOT NULL REFERENCES md_locations(id),
  destination_location_id UUID NOT NULL REFERENCES md_locations(id),
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

CREATE TABLE shp_manifest_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES shp_shipments(id) ON DELETE CASCADE,
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

-- Base Table for Polymorphic Handling Units
CREATE TABLE shp_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES shp_shipments(id) ON DELETE CASCADE,
  unit_type shp_unit_type NOT NULL,
  unit_identifier TEXT NOT NULL,
  total_gross_weight_kg NUMERIC(15, 3) NOT NULL,
  total_volume_cbm NUMERIC(15, 4),
  current_location_id UUID REFERENCES md_locations(id),
  status TEXT NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subtype: Containers
CREATE TABLE shp_unit_containers (
  unit_id UUID PRIMARY KEY REFERENCES shp_units(id) ON DELETE CASCADE,
  container_number TEXT NOT NULL,
  iso_type TEXT NOT NULL DEFAULT '20GP', -- e.g. 20GP, 40GP, 40HC, 20RF
  seal_number TEXT,
  tare_weight_kg NUMERIC(15, 3) DEFAULT 2200,
  max_payload_kg NUMERIC(15, 3) DEFAULT 28000,
  temperature_celsius NUMERIC(5, 2),
  is_soc BOOLEAN DEFAULT FALSE -- Shipper Owned Container
);

-- Subtype: Bulk Cargo
CREATE TABLE shp_unit_bulk (
  unit_id UUID PRIMARY KEY REFERENCES shp_units(id) ON DELETE CASCADE,
  bulk_type TEXT NOT NULL, -- DRY_BULK, LIQUID_BULK
  metric_tonnage NUMERIC(15, 3) NOT NULL,
  moisture_percentage NUMERIC(5, 2),
  surveyor_report_number TEXT,
  surveyor_entity_id UUID REFERENCES md_entities(id)
);

-- Subtype: Packages / Pallets
CREATE TABLE shp_unit_packages (
  unit_id UUID PRIMARY KEY REFERENCES shp_units(id) ON DELETE CASCADE,
  parent_container_unit_id UUID REFERENCES shp_units(id),
  package_type TEXT NOT NULL, -- PALLET, WOODEN_CRATE, CARTON
  colli_count INTEGER NOT NULL DEFAULT 1,
  length_cm NUMERIC(10, 2),
  width_cm NUMERIC(10, 2),
  height_cm NUMERIC(10, 2),
  is_stackable BOOLEAN DEFAULT TRUE
);

-- Subtype: Vehicles (CBU)
CREATE TABLE shp_unit_vehicles (
  unit_id UUID PRIMARY KEY REFERENCES shp_units(id) ON DELETE CASCADE,
  vin_number TEXT NOT NULL,
  engine_number TEXT,
  vehicle_model TEXT NOT NULL,
  color TEXT,
  is_drivable BOOLEAN DEFAULT TRUE
);

-- Execution Plans & Legs
CREATE TABLE shp_execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  shipment_id UUID NOT NULL UNIQUE REFERENCES shp_shipments(id) ON DELETE CASCADE,
  plan_version INTEGER NOT NULL DEFAULT 1,
  total_legs INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shp_execution_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES shp_shipments(id) ON DELETE CASCADE,
  execution_plan_id UUID NOT NULL REFERENCES shp_execution_plans(id) ON DELETE CASCADE,
  leg_sequence INTEGER NOT NULL,
  leg_code TEXT NOT NULL,
  transport_mode shp_transport_mode NOT NULL,
  execution_provider_type shp_execution_provider_type NOT NULL DEFAULT 'INTERNAL_SBU',
  origin_location_id UUID NOT NULL REFERENCES md_locations(id),
  destination_location_id UUID NOT NULL REFERENCES md_locations(id),
  assigned_vendor_id UUID REFERENCES md_entities(id),
  planned_start_at TIMESTAMPTZ,
  planned_end_at TIMESTAMPTZ,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_shp_leg_seq UNIQUE (execution_plan_id, leg_sequence)
);

CREATE TABLE shp_leg_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  execution_leg_id UUID NOT NULL REFERENCES shp_execution_legs(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES shp_units(id) ON DELETE CASCADE,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_shp_leg_unit UNIQUE (execution_leg_id, unit_id)
);

CREATE TABLE shp_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES shp_shipments(id) ON DELETE CASCADE,
  execution_leg_id UUID REFERENCES shp_execution_legs(id),
  milestone_code TEXT NOT NULL,
  milestone_label TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location_id UUID REFERENCES md_locations(id),
  recorded_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE shp_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  shipment_id UUID NOT NULL REFERENCES shp_shipments(id) ON DELETE CASCADE,
  execution_leg_id UUID REFERENCES shp_execution_legs(id),
  exception_type TEXT NOT NULL, -- DEMURRAGE_RISK, CUSTOMS_HOLD, BREAKDOWN, DELAY
  severity TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. CROSS-DOMAIN SERVICE REQUEST CONTRACTS (svc_*)
-- ============================================================================

CREATE TABLE svc_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  request_number TEXT NOT NULL,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  causation_id UUID,
  idempotency_key TEXT NOT NULL,
  source_domain TEXT NOT NULL DEFAULT 'FORWARDING',
  target_domain TEXT NOT NULL, -- TRUCKING, CUSTOMS, WAREHOUSE, EXCHANGE
  shipment_id UUID REFERENCES shp_shipments(id),
  execution_leg_id UUID REFERENCES shp_execution_legs(id),
  work_order_id UUID REFERENCES commercial_work_orders(id),
  service_product_sku TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  sla_target_time TIMESTAMPTZ,
  status svc_request_status NOT NULL DEFAULT 'ISSUED',
  assigned_domain_job_id UUID,
  rejection_reason TEXT,
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_svc_request_number UNIQUE (tenant_id, request_number),
  CONSTRAINT uq_svc_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- ============================================================================
-- 4. CUSTOMS CLEARANCE EXECUTION DOMAIN (cus_*)
-- ============================================================================

CREATE TABLE cus_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  declaration_number TEXT NOT NULL, -- No Aju 26-digit
  service_request_id UUID REFERENCES svc_service_requests(id),
  work_order_id UUID REFERENCES commercial_work_orders(id),
  importer_id UUID NOT NULL REFERENCES md_entities(id),
  ppjk_id UUID REFERENCES md_entities(id),
  declaration_type cus_declaration_type NOT NULL DEFAULT 'PIB_IMPORT',
  customs_office_code TEXT NOT NULL,
  billing_code TEXT,
  total_duty_and_tax NUMERIC(18, 2) DEFAULT 0,
  ntpn_payment_ref TEXT,
  paid_at TIMESTAMPTZ,
  channel cus_channel_type,
  sppb_number TEXT,
  sppb_date DATE,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cus_dec_number UNIQUE (tenant_id, declaration_number)
);

CREATE TABLE cus_classification_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES cus_declarations(id) ON DELETE CASCADE,
  item_sequence INTEGER NOT NULL DEFAULT 1,
  hs_code TEXT NOT NULL,
  goods_description TEXT NOT NULL,
  cif_value_usd NUMERIC(18, 2) NOT NULL,
  bm_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ppn_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 11,
  pph_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 2.5,
  calculated_bm_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  calculated_ppn_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  calculated_pph_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. FINANCE DOMAIN (fin_*)
-- ============================================================================

CREATE TYPE fin_transaction_type AS ENUM (
  'REVENUE', 'OPERATIONAL_COGS', 'PASS_THROUGH_DISBURSEMENT'
);

CREATE TABLE fin_financial_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  transaction_type fin_transaction_type NOT NULL,
  work_order_id UUID REFERENCES commercial_work_orders(id),
  shipment_id UUID REFERENCES shp_shipments(id),
  execution_leg_id UUID REFERENCES shp_execution_legs(id),
  service_request_id UUID REFERENCES svc_service_requests(id),
  vendor_entity_id UUID REFERENCES md_entities(id),
  account_code TEXT NOT NULL,
  description TEXT NOT NULL,
  debit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  is_reconciled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. EVENT OUTBOX & AUDITING
-- ============================================================================

CREATE TABLE event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_version TEXT NOT NULL DEFAULT '1.0.0',
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  causation_id UUID,
  producer_domain TEXT NOT NULL,
  payload JSONB NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_consumption_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  event_id UUID NOT NULL,
  consumer_name TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  error_message TEXT,
  CONSTRAINT uq_event_consumer UNIQUE (event_id, consumer_name)
);

CREATE TABLE event_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  event_id UUID NOT NULL,
  consumer_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  failure_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. PERFORMANCE INDEXES & RLS ENFORCEMENT
-- ============================================================================

CREATE INDEX idx_com_wo_tenant ON commercial_work_orders(tenant_id);
CREATE INDEX idx_shp_shipments_tenant ON shp_shipments(tenant_id);
CREATE INDEX idx_shp_shipments_wo ON shp_shipments(work_order_id);
CREATE INDEX idx_shp_shipments_token ON shp_shipments(tracking_token);
CREATE INDEX idx_shp_units_shipment ON shp_units(shipment_id);
CREATE INDEX idx_shp_legs_shipment ON shp_execution_legs(shipment_id);
CREATE INDEX idx_svc_requests_tenant ON svc_service_requests(tenant_id);
CREATE INDEX idx_svc_requests_shipment ON svc_service_requests(shipment_id);
CREATE INDEX idx_cus_dec_tenant ON cus_declarations(tenant_id);
CREATE INDEX idx_fin_ledger_shipment ON fin_financial_ledger_entries(shipment_id);
CREATE INDEX idx_event_outbox_unpublished ON event_outbox(is_published) WHERE is_published = FALSE;

-- RLS Declarations
ALTER TABLE commercial_service_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_manifest_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_unit_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_unit_bulk ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_unit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_unit_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_execution_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_leg_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE shp_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cus_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cus_classification_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_financial_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_com_wo" ON commercial_work_orders
  FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id()) WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_isolation_shp" ON shp_shipments
  FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id()) WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_isolation_svc_req" ON svc_service_requests
  FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id()) WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_isolation_cus_dec" ON cus_declarations
  FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id()) WITH CHECK (tenant_id = public.get_my_tenant_id());
```

---
*Approved by PostgreSQL / Supabase Database Architecture Group*
