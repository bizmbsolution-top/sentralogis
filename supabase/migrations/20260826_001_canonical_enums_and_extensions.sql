-- ============================================================================
-- Migration: 20260826_001_canonical_enums_and_extensions.sql
-- Description: Canonical PostgreSQL enums & extensions for Sentralogis Target Architecture v1.0
-- Non-destructive: Safe creation with IF NOT EXISTS and DO block exception handling
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CANONICAL ENUMS

-- Commercial Enums
DO $$ BEGIN
  CREATE TYPE com_incoterm_type AS ENUM (
    'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE com_work_order_status AS ENUM (
    'DRAFT', 'SUBMITTED', 'CONFIRMED', 'IN_EXECUTION', 'FULFILLED', 'BILLED', 'CLOSED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Shipment & Forwarding Enums
DO $$ BEGIN
  CREATE TYPE shp_global_status AS ENUM (
    'DRAFT', 'PLANNED', 'BOOKED', 'IN_TRANSIT', 'AT_INTERMEDIATE_NODE',
    'CUSTOMS_HOLD', 'CUSTOMS_RELEASED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'EXCEPTION_HOLD', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shp_unit_type AS ENUM (
    'CONTAINER', 'BULK_MT', 'BREAKBULK', 'PALLET', 'BOX', 'VEHICLE', 'TANK'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shp_transport_mode AS ENUM (
    'ROAD_TRUCK', 'OCEAN_VESSEL', 'BARGE', 'AIR_FREIGHT', 'RAIL_FREIGHT',
    'PORT_TERMINAL_HANDLING', 'WAREHOUSE_STAGING', 'CUSTOMS_CLEARANCE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shp_execution_provider_type AS ENUM (
    'INTERNAL_SBU', 'EXTERNAL_VENDOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service Request Enums
DO $$ BEGIN
  CREATE TYPE svc_request_status AS ENUM (
    'ISSUED', 'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'EXECUTING', 'FULFILLED', 'REROUTING', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customs Clearance Enums
DO $$ BEGIN
  CREATE TYPE cus_declaration_type AS ENUM (
    'PIB_IMPORT', 'PEB_EXPORT', 'TPB_BC23', 'TRANSIT_BC12'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cus_channel_type AS ENUM (
    'GREEN', 'YELLOW', 'RED', 'PRIORITY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Finance Transaction Type Enum
DO $$ BEGIN
  CREATE TYPE fin_transaction_type AS ENUM (
    'REVENUE', 'OPERATIONAL_COGS', 'PASS_THROUGH_DISBURSEMENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
