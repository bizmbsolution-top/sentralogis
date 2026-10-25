-- ============================================================================
-- SENTRALOGIS MODULAR LAYERED BASELINE MIGRATION
-- Layer:         003 Tables & Sequences
-- Architecture:  D8-02 Option B2 / D8-30 Ratified
-- Baseline:      9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999
-- Generation:    Deterministic Static Formation (Delivery Unit 2 / D8-33)
-- Total Objects: 299
-- Description:   Sequences followed by base tables in topological order
-- ============================================================================
-- ----------------------------------------------------------------------------
-- SECTION 1: SEQUENCES (9 objects)
-- Sequences instantiated prior to table column defaults
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Object:        public.audit_logs_id_seq
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/audit_logs_id_seq.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."audit_logs_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."audit_logs_id_seq" TO "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fw_consolidation_seq
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/fw_consolidation_seq.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."fw_consolidation_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."fw_consolidation_seq" TO "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.inventory_ledger_id_seq
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/inventory_ledger_id_seq.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."inventory_ledger_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."inventory_ledger_id_seq" TO "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.monitoring_events_id_seq
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/monitoring_events_id_seq.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."monitoring_events_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."monitoring_events_id_seq" TO "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.seq_invoice_number
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/seq_invoice_number.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."seq_invoice_number" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seq_invoice_number" TO "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.seq_jo_number
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/seq_jo_number.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."seq_jo_number" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 200000 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seq_jo_number" TO "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.seq_sales_order
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/seq_sales_order.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."seq_sales_order" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seq_sales_order" TO "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.seq_wo_number
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/seq_wo_number.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."seq_wo_number" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 100000 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."seq_wo_number" TO "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.status_history_id_seq
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/sequences/status_history_id_seq.sql
-- Dependencies:  none
-- ============================================================================
CREATE SEQUENCE "public"."status_history_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."status_history_id_seq" TO "anon", "authenticated", "postgres", "service_role";

-- ----------------------------------------------------------------------------
-- SECTION 2: BASE TABLES IN TOPOLOGICAL ORDER (290 objects)
-- Formed according to Unit 1 Kahn DAG with alphabetical tie-breaking
-- Table-local constraints (PK, UNIQUE, CHECK) retained inline
-- Foreign keys deferred to Layer 004
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Object:        public._wo_renumber_temp
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/_wo_renumber_temp.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."_wo_renumber_temp" (

  "id"            uuid,
  "old_wo_number" character varying(50),
  "tenant_name"   text,
  "customer_name" character varying,
  "mmyy"          text,
  "seq_num"       bigint

);

-- ============================================================================
-- Object:        public.addresses
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/addresses.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."addresses" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "address"    text                     NOT NULL,
  "city"       text,
  "type"       text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "addresses_pkey" PRIMARY KEY (id),
  CONSTRAINT "addresses_type_check" CHECK ((type = ANY (ARRAY['pickup'::text, 'dropoff'::text])))

);

-- ============================================================================
-- Object:        public.armada
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/armada.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."armada" (

  "id"             uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid                        NOT NULL,
  "vehicle_number" character varying(50)       NOT NULL,
  "vehicle_type"   character varying(100),
  "is_active"      boolean                     DEFAULT true,
  "created_at"     timestamp without time zone DEFAULT now(),
  "updated_at"     timestamp without time zone DEFAULT now(),
  CONSTRAINT "armada_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.backup_customers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/backup_customers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."backup_customers" (

  "id"              uuid,
  "tenant_id"       uuid,
  "name"            text,
  "email"           text,
  "phone"           text,
  "address"         text,
  "is_active"       boolean,
  "auth_user_id"    uuid,
  "created_by"      uuid,
  "created_at"      timestamp with time zone,
  "updated_at"      timestamp with time zone,
  "customer_code"   text,
  "pic_name"        text,
  "billing_address" text,
  "city"            text,
  "code"            character varying(50),
  "pic_phone"       character varying(20),
  "tax_id"          character varying(50)

);

-- ============================================================================
-- Object:        public.backup_inventory
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/backup_inventory.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."backup_inventory" (

  "id"               uuid,
  "product_id"       uuid,
  "warehouse_id"     uuid,
  "customer_id"      uuid,
  "quantity"         integer,
  "lot_number"       text,
  "status"           text,
  "created_at"       timestamp with time zone,
  "updated_at"       timestamp with time zone,
  "batch_id"         uuid,
  "uom_id"           uuid,
  "location_barcode" text

);

-- ============================================================================
-- Object:        public.backup_products
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/backup_products.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."backup_products" (

  "id"                           uuid,
  "customer_id"                  uuid,
  "sku"                          text,
  "name"                         text,
  "category"                     text,
  "length_cm"                    numeric,
  "width_cm"                     numeric,
  "height_cm"                    numeric,
  "weight_kg"                    numeric,
  "created_at"                   timestamp with time zone,
  "packaging_type"               text,
  "packaging_qty"                numeric,
  "content_qty"                  numeric,
  "total_weight_kg"              numeric,
  "total_volume_m3"              numeric,
  "tenant_id"                    uuid,
  "barcode"                      text,
  "description"                  text,
  "sub_category"                 text,
  "brand"                        text,
  "image_url"                    text,
  "image_urls"                   text[],
  "base_uom_id"                  uuid,
  "default_inbound_uom_id"       uuid,
  "default_outbound_uom_id"      uuid,
  "cbm_override"                 numeric(12,6),
  "cbm"                          numeric(12,6),
  "enable_serial_tracking"       boolean,
  "enable_weight_tracking"       boolean,
  "enable_expiry_tracking"       boolean,
  "enable_batch_tracking"        boolean,
  "enable_variant_tracking"      boolean,
  "enable_custom_attributes"     boolean,
  "default_outbound_strategy"    text,
  "is_active"                    boolean,
  "is_hazardous"                 boolean,
  "requires_temperature_control" boolean,
  "min_temperature"              numeric(5,2),
  "max_temperature"              numeric(5,2),
  "created_by"                   uuid,
  "updated_at"                   timestamp without time zone

);

-- ============================================================================
-- Object:        public.btki_codes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/btki_codes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."btki_codes" (

  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "hs_code"        text                     NOT NULL,
  "description_id" text,
  "description_en" text,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "btki_codes_hs_code_key" UNIQUE (hs_code),
  CONSTRAINT "btki_codes_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.cash_advances
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cash_advances.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cash_advances" (

  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"           uuid,
  "amount"                 numeric(15,2)            NOT NULL DEFAULT 0,
  "description"            text,
  "status"                 text                     DEFAULT 'pending'::text,
  "created_at"             timestamp with time zone DEFAULT now(),
  "updated_at"             timestamp with time zone DEFAULT now(),
  "disbursement_proof_url" text,
  "disbursement_notes"     text,
  "paid_by"                text                     DEFAULT 'sbu_trucking'::text,
  "settled_at"             timestamp with time zone,
  "transfer_proof_url"     text,
  "paid_at"                timestamp with time zone,
  CONSTRAINT "cash_advances_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.companies
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/companies.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."companies" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "type"            text                     NOT NULL,
  "name"            text                     NOT NULL,
  "address"         text,
  "pic_name"        text,
  "pic_phone"       text,
  "notes"           text,
  "is_active"       boolean                  DEFAULT true,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "active_sbus"     text[]                   DEFAULT '{trucking}'::text[],
  "logo_url"        text,
  "organization_id" uuid,
  CONSTRAINT "companies_pkey" PRIMARY KEY (id),
  CONSTRAINT "companies_type_check" CHECK ((type = ANY (ARRAY['company'::text, 'vendor'::text])))

);

-- ============================================================================
-- Object:        public.country_master
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/country_master.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."country_master" (

  "country_code"    text                     NOT NULL,
  "country_name"    text                     NOT NULL,
  "region"          text,
  "fta_memberships" text[],
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "country_master_pkey" PRIMARY KEY (country_code)

);

-- ============================================================================
-- Object:        public.debug_traces
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/debug_traces.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."debug_traces" (

  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "request_id"    text                     NOT NULL,
  "input_query"   text,
  "country_code"  text,
  "stages"        jsonb                    DEFAULT '{}'::jsonb,
  "debug_summary" jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "debug_traces_pkey" PRIMARY KEY (id),
  CONSTRAINT "debug_traces_request_id_key" UNIQUE (request_id)

);

-- ============================================================================
-- Object:        public.driver_profiles
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/driver_profiles.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."driver_profiles" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "phone"      text                     NOT NULL,
  "pin_hash"   text,
  "full_name"  text,
  "is_active"  boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "driver_profiles_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.driver_requests
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/driver_requests.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."driver_requests" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"   uuid,
  "request_type"   character varying(30)    NOT NULL,
  "notes"          text                     NOT NULL,
  "photo_url"      text,
  "status"         character varying(20)    DEFAULT 'pending'::character varying,
  "response_notes" text,
  "approved_by"    uuid,
  "created_at"     timestamp with time zone DEFAULT now(),
  "resolved_at"    timestamp with time zone,
  CONSTRAINT "driver_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "driver_requests_request_type_check"
    CHECK
    (((request_type)::text = ANY ((ARRAY['DELAY'::character varying, 'ACCIDENT'::character varying, 'EXTRA_STOP'::character varying, 'ROUTE_CHANGE'::character varying,
    'OTHER'::character varying])::text[])))

);

-- ============================================================================
-- Object:        public.finance_coa
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/finance_coa.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."finance_coa" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "account_number"   character varying(20)    NOT NULL,
  "account_name"     character varying(100)   NOT NULL,
  "category"         character varying(50)    NOT NULL,
  "is_active"        boolean                  DEFAULT true,
  "created_at"       timestamp with time zone DEFAULT now(),
  "parent_id"        uuid,
  "is_header"        boolean                  DEFAULT false,
  "description"      text,
  "starting_balance" numeric                  DEFAULT 0,
  CONSTRAINT "finance_coa_account_number_key" UNIQUE (account_number),
  CONSTRAINT "finance_coa_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.finance_transactions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/finance_transactions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."finance_transactions" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "type"         text                     NOT NULL,
  "category"     text                     NOT NULL,
  "amount_base"  numeric(15,2)            NOT NULL DEFAULT 0,
  "tax_ppn"      numeric(15,2)            DEFAULT 0,
  "tax_pph"      numeric(15,2)            DEFAULT 0,
  "amount_total" numeric(15,2)            DEFAULT 0,
  "entity_id"    uuid,
  "reference_id" uuid,
  "status"       text                     DEFAULT 'unpaid'::text,
  "due_date"     timestamp with time zone,
  "notes"        text,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "finance_transactions_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.fleets
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fleets.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fleets" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "company_id"       uuid,
  "plate_number"     text                     NOT NULL,
  "truck_type"       text                     NOT NULL,
  "truck_brand"      text,
  "truck_color"      text,
  "year_manufacture" integer,
  "status"           text                     DEFAULT 'active'::text,
  "notes"            text,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  "stnk_expiry"      date,
  "plate_expiry"     date,
  "organization_id"  uuid,
  CONSTRAINT "fleets_pkey" PRIMARY KEY (id),
  CONSTRAINT "fleets_plate_number_key" UNIQUE (plate_number),
  CONSTRAINT "fleets_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'maintenance'::text, 'repaired'::text, 'retired'::text])))

);

-- ============================================================================
-- Object:        public.drivers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/drivers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."drivers" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "company_id"          uuid,
  "name"                text                     NOT NULL,
  "phone"               text                     NOT NULL,
  "address"             text,
  "license_number"      text,
  "license_expiry"      date,
  "status"              text                     DEFAULT 'active'::text,
  "current_fleet_id"    uuid,
  "notes"               text,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  "nik"                 text,
  "license_type"        text,
  "organization_id"     uuid,
  "tenant_id"           uuid,
  "bank_name"           character varying(50),
  "bank_account_number" character varying(30),
  "bank_account_name"   character varying(100),
  CONSTRAINT "drivers_pkey" PRIMARY KEY (id),
  CONSTRAINT "drivers_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))

);

-- ============================================================================
-- Object:        public.fleet_driver_history
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fleet_driver_history.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fleet_driver_history" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "fleet_id"    uuid,
  "driver_id"   uuid,
  "assigned_at" timestamp with time zone DEFAULT now(),
  "assigned_by" text,
  "notes"       text,
  CONSTRAINT "fleet_driver_history_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.fw_consolidation_manifest
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fw_consolidation_manifest.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fw_consolidation_manifest" (

  "id"                    uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "consolidation_id"      uuid,
  "entity_type"           character varying(20),
  "entity_id"             uuid                     NOT NULL,
  "actual_cbm"            numeric                  DEFAULT 0,
  "actual_weight_kg"      numeric                  DEFAULT 0,
  "buying_price_per_cbm"  numeric                  DEFAULT 0,
  "selling_price_per_cbm" numeric                  DEFAULT 0,
  "billing_status"        character varying(20)    DEFAULT 'pending'::character varying,
  "created_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "fw_consolidation_manifest_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.fw_hs_codes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fw_hs_codes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fw_hs_codes" (

  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "code"             character varying(20)    NOT NULL,
  "description_id"   text,
  "description_en"   text,
  "bm_rate"          numeric                  DEFAULT 0,
  "ppn_rate"         numeric                  DEFAULT 11,
  "pph_api_rate"     numeric                  DEFAULT 2.5,
  "pph_non_api_rate" numeric                  DEFAULT 7.5,
  "ppnbm_rate"       numeric                  DEFAULT 0,
  "lartas_desc"      text,
  "regulation_ref"   text,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "fw_hs_codes_code_key" UNIQUE (code),
  CONSTRAINT "fw_hs_codes_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.fw_order_headers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fw_order_headers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fw_order_headers" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "work_order_id"     uuid,
  "customer_id"       uuid,
  "service_type"      text                     NOT NULL DEFAULT 'FCL'::text,
  "vessel_name"       text,
  "voyage_no"         text,
  "etd"               date,
  "eta"               date,
  "origin_port_id"    uuid,
  "dest_port_id"      uuid,
  "cargo_owner_name"  text,
  "cargo_owner_email" text,
  "cargo_owner_phone" text,
  "consignee_name"    text,
  "consignee_email"   text,
  "consignee_phone"   text,
  "tracking_token"    text                     DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  "status"            text                     NOT NULL DEFAULT 'need_assignment'::text,
  "created_by"        uuid,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "fw_order_headers_pkey" PRIMARY KEY (id),
  CONSTRAINT "fw_order_headers_service_type_check" CHECK ((service_type = ANY (ARRAY['FCL'::text, 'LCL'::text]))),
  CONSTRAINT "fw_order_headers_tracking_token_key" UNIQUE (tracking_token)

);

-- ============================================================================
-- Object:        public.fw_legs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fw_legs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fw_legs" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "order_id"          uuid                     NOT NULL,
  "leg_type"          text                     NOT NULL DEFAULT 'SEA'::text,
  "start_location_id" uuid,
  "end_location_id"   uuid,
  "scheduled_start"   timestamp with time zone,
  "scheduled_end"     timestamp with time zone,
  "execution_mode"    text                     NOT NULL DEFAULT 'OWN'::text,
  "status"            text                     NOT NULL DEFAULT 'planned'::text,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "fw_legs_execution_mode_check" CHECK ((execution_mode = ANY (ARRAY['OWN'::text, 'VENDOR'::text]))),
  CONSTRAINT "fw_legs_leg_type_check" CHECK ((leg_type = ANY (ARRAY['SEA'::text, 'LAND'::text, 'AIR'::text, 'CONSOLIDATION'::text]))),
  CONSTRAINT "fw_legs_pkey" PRIMARY KEY (id),
  CONSTRAINT "fw_legs_status_check" CHECK ((status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))

);

-- ============================================================================
-- Object:        public.fw_price_master
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fw_price_master.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fw_price_master" (

  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                uuid                     NOT NULL,
  "origin_port"              text                     NOT NULL,
  "destination_port"         text                     NOT NULL,
  "service_type"             text                     NOT NULL,
  "container_type"           text,
  "delivery_type"            text                     NOT NULL DEFAULT 'D2D'::text,
  "sell_price"               numeric,
  "sell_per_cbm"             numeric,
  "sell_min_cbm"             numeric,
  "cogs_pickup"              numeric                  DEFAULT 0,
  "cogs_port_haulage_origin" numeric                  DEFAULT 0,
  "cogs_ocean_freight"       numeric                  DEFAULT 0,
  "cogs_thc_origin"          numeric                  DEFAULT 0,
  "cogs_thc_dest"            numeric                  DEFAULT 0,
  "cogs_port_haulage_dest"   numeric                  DEFAULT 0,
  "cogs_last_mile"           numeric                  DEFAULT 0,
  "cogs_documentation"       numeric                  DEFAULT 0,
  "cogs_other"               numeric                  DEFAULT 0,
  "currency"                 text                     DEFAULT 'IDR'::text,
  "effective_date"           date                     NOT NULL DEFAULT CURRENT_DATE,
  "expiry_date"              date,
  "is_active"                boolean                  DEFAULT true,
  "notes"                    text,
  "created_at"               timestamp with time zone DEFAULT now(),
  "updated_at"               timestamp with time zone DEFAULT now(),
  CONSTRAINT "fw_price_master_delivery_type_check" CHECK ((delivery_type = ANY (ARRAY['D2D'::text, 'P2P'::text, 'D2P'::text, 'P2D'::text]))),
  CONSTRAINT "fw_price_master_pkey" PRIMARY KEY (id),
  CONSTRAINT "fw_price_master_service_type_check" CHECK ((service_type = ANY (ARRAY['FCL'::text, 'LCL'::text]))),
  CONSTRAINT "fw_price_master_unique" UNIQUE (tenant_id, origin_port, destination_port, service_type, container_type, delivery_type, effective_date)

);

-- ============================================================================
-- Object:        public.general_ledger
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/general_ledger.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."general_ledger" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "transaction_id" uuid,
  "account_code"   text                     NOT NULL,
  "account_name"   text                     NOT NULL,
  "debit"          numeric(15,2)            DEFAULT 0,
  "credit"         numeric(15,2)            DEFAULT 0,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "general_ledger_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.ground_event_types
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/ground_event_types.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."ground_event_types" (

  "event_type"         character varying(50)  NOT NULL,
  "label"              character varying(255) NOT NULL,
  "requires_photo"     boolean                DEFAULT false,
  "requires_container" boolean                DEFAULT false,
  "sort_order"         integer                DEFAULT 0,
  "is_active"          boolean                DEFAULT true,
  CONSTRAINT "ground_event_types_pkey" PRIMARY KEY (event_type)

);

-- ============================================================================
-- Object:        public.hs_agent_config
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_agent_config.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_agent_config" (

  "id"              text                     NOT NULL DEFAULT 'default_agent'::text,
  "ai_weight"       double precision         DEFAULT 0.20,
  "vector_weight"   double precision         DEFAULT 0.60,
  "btki_weight"     double precision         DEFAULT 0.20,
  "graph_weight"    double precision         DEFAULT 1.0,
  "error_threshold" double precision         DEFAULT 0.25,
  "last_optimized"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_agent_config_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.hs_agent_memory
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_agent_memory.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_agent_memory" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "query"            text                     NOT NULL,
  "hs_code"          text                     NOT NULL,
  "decision_type"    text                     NOT NULL,
  "scores_json"      jsonb                    NOT NULL,
  "final_confidence" double precision         NOT NULL,
  "is_correct"       boolean                  DEFAULT true,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_agent_memory_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.hs_codes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_codes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_codes" (

  "code"        text    NOT NULL,
  "description" text,
  "parent_code" text,
  "level"       integer,
  "tarif"       text,
  "lartas"      text,
  "bm_mfn"      text,
  "ppn"         text,
  "ppnbm"       text,
  "cukai"       text,
  "bm_ad"       text,
  "bm_tp"       text,
  "bm_im"       text,
  "pph_api"     text,
  "pph_non_api" text,
  "bk"          text,
  "dhe_sda"     text,
  "note"        text,
  "regulations" jsonb,
  "bm_mfn_reg"  text,
  "ppn_reg"     text,
  "pph_api_reg" text,
  CONSTRAINT "hs_codes_pkey" PRIMARY KEY (code)

);

-- ============================================================================
-- Object:        public.hs_codes_temp
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_codes_temp.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_codes_temp" (

  "code"        text    NOT NULL,
  "description" text,
  "parent_code" text,
  "level"       integer,
  CONSTRAINT "hs_codes_temp_pkey" PRIMARY KEY (code)

);

-- ============================================================================
-- Object:        public.hs_country_registry
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_country_registry.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_country_registry" (

  "code"           text    NOT NULL,
  "name"           text    NOT NULL,
  "tariff_system"  text    NOT NULL,
  "digit_standard" integer DEFAULT 8,
  "region"         text,
  CONSTRAINT "hs_country_registry_pkey" PRIMARY KEY (code)

);

-- ============================================================================
-- Object:        public.hs_embeddings
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_embeddings.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_embeddings" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "hs_code"     text                     NOT NULL,
  "description" text                     NOT NULL,
  "embedding"   public.vector(768),
  "level"       integer,
  "is_official" boolean                  DEFAULT true,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_embeddings_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.hs_feedback
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_feedback.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_feedback" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "query"             text                     NOT NULL,
  "predicted_hs"      text                     NOT NULL,
  "corrected_hs"      text                     NOT NULL,
  "confidence_before" integer,
  "confidence_after"  integer,
  "source"            text,
  "created_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_feedback_pkey" PRIMARY KEY (id),
  CONSTRAINT "hs_feedback_source_check" CHECK ((source = ANY (ARRAY['user'::text, 'intr'::text, 'system'::text])))

);

-- ============================================================================
-- Object:        public.hs_global_patterns
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_global_patterns.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_global_patterns" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "wco_code"              text                     NOT NULL,
  "country_code"          text                     NOT NULL,
  "local_hs"              text                     NOT NULL,
  "usage_frequency"       integer                  DEFAULT 1,
  "correction_rate"       double precision         DEFAULT 0.0,
  "confidence_adjustment" double precision         DEFAULT 1.0,
  "created_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_global_patterns_pkey" PRIMARY KEY (id),
  CONSTRAINT "hs_global_patterns_wco_code_country_code_local_hs_key" UNIQUE (wco_code, country_code, local_hs)

);

-- ============================================================================
-- Object:        public.hs_job_tracking
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_job_tracking.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_job_tracking" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_id"        text                     NOT NULL,
  "query"         text                     NOT NULL,
  "status"        text                     NOT NULL,
  "worker_id"     text,
  "result_json"   jsonb,
  "error_message" text,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_job_tracking_job_id_key" UNIQUE (job_id),
  CONSTRAINT "hs_job_tracking_pkey" PRIMARY KEY (id),
  CONSTRAINT "hs_job_tracking_status_check" CHECK ((status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text])))

);

-- ============================================================================
-- Object:        public.hs_nodes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_nodes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_nodes" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "type"       text                     NOT NULL,
  "name"       text                     NOT NULL,
  "properties" jsonb                    DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_nodes_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.hs_edges
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_edges.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_edges" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "from_node"  uuid,
  "to_node"    uuid,
  "relation"   text                     NOT NULL,
  "weight"     double precision         DEFAULT 1.0,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_edges_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.hs_pattern_memory
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_pattern_memory.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_pattern_memory" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "keyword"          text                     NOT NULL,
  "hs_code"          text                     NOT NULL,
  "weight"           double precision         DEFAULT 1.0,
  "occurrence_count" integer                  DEFAULT 1,
  "last_used"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_pattern_memory_keyword_key" UNIQUE (keyword),
  CONSTRAINT "hs_pattern_memory_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.hs_requests_log
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_requests_log.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_requests_log" (

  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"      text,
  "query"          text                     NOT NULL,
  "result_json"    jsonb,
  "risk_level"     text,
  "final_decision" text,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "hs_requests_log_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.hs_search_requests
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_search_requests.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_search_requests" (

  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "keyword"            text,
  "translated_keyword" text,
  "best_hs_code"       text,
  "confidence"         integer,
  "sources"            jsonb,
  "response_time_ms"   integer,
  "created_at"         timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "hs_search_requests_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.hs_tariff_rates
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/hs_tariff_rates.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."hs_tariff_rates" (

  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "hs_code"      text,
  "country_code" text                     DEFAULT 'ID'::text,
  "tenant_id"    text                     DEFAULT 'DEFAULT_TENANT'::text,
  "bm_mfn"       text,
  "ppn"          text,
  "ppnbm"        text,
  "pph_api"      text,
  "pph_non_api"  text,
  "lartas"       text,
  "description"  text,
  "note"         text,
  "updated_at"   timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "hs_tariff_rates_hs_code_country_code_tenant_id_key" UNIQUE (hs_code, country_code, tenant_id),
  CONSTRAINT "hs_tariff_rates_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.intr_endpoint_cache
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/intr_endpoint_cache.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."intr_endpoint_cache" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "endpoint"         text                     NOT NULL,
  "method"           text                     NOT NULL DEFAULT 'POST'::text,
  "headers"          jsonb                    DEFAULT '{}'::jsonb,
  "payload_template" jsonb                    DEFAULT '{}'::jsonb,
  "success_score"    integer                  DEFAULT 0,
  "last_verified"    timestamp with time zone DEFAULT now(),
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "intr_endpoint_cache_endpoint_method_key" UNIQUE (endpoint, method),
  CONSTRAINT "intr_endpoint_cache_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.intr_rules
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/intr_rules.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."intr_rules" (

  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "hs_code"          text                     NOT NULL,
  "country_code"     text                     NOT NULL,
  "status"           text                     NOT NULL,
  "permit_required"  boolean                  DEFAULT false,
  "permit_type"      text,
  "agency"           text[],
  "restriction_type" text[],
  "description"      text,
  "source_id"        text,
  "effective_from"   date                     DEFAULT CURRENT_DATE,
  "effective_to"     date,
  "is_active"        boolean                  DEFAULT true,
  "confidence_score" double precision         DEFAULT 1.0,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  "hs_level"         text,
  CONSTRAINT "intr_rules_hs_level_check" CHECK ((hs_level = ANY (ARRAY['CHAPTER'::text, 'HEADING'::text, 'SUBHEADING'::text]))),
  CONSTRAINT "intr_rules_pkey" PRIMARY KEY (id),
  CONSTRAINT "intr_rules_status_check" CHECK ((status = ANY (ARRAY['APPROVED'::text, 'RESTRICTED'::text, 'PROHIBITED'::text, 'UNKNOWN'::text])))

);

-- ============================================================================
-- Object:        public.intr_test_log
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/intr_test_log.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."intr_test_log" (

  "test_id"       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "hs_code"       text                     NOT NULL,
  "endpoint"      text,
  "status"        text,
  "health_score"  integer,
  "response_time" integer,
  "report"        jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "intr_test_log_pkey" PRIMARY KEY (test_id)

);

-- ============================================================================
-- Object:        public.inventory_movement_history
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/inventory_movement_history.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."inventory_movement_history" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "item_id"        uuid,
  "warehouse_id"   uuid,
  "old_quantity"   numeric(15,2),
  "new_quantity"   numeric(15,2)            NOT NULL,
  "movement_type"  text                     NOT NULL,
  "reference_type" text,
  "reference_id"   text,
  "changed_by"     uuid,
  "changed_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "correlation_id" text,
  "notes"          text,
  CONSTRAINT "inventory_movement_history_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.job_routes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."job_routes" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"          uuid,
  "sequence"              integer                  NOT NULL,
  "stop_type"             character varying(20)    NOT NULL,
  "source_type"           character varying(20)    NOT NULL,
  "source_id"             text                     NOT NULL,
  "location_name"         character varying(255)   NOT NULL,
  "address"               text                     NOT NULL,
  "latitude"              numeric(10,8),
  "longitude"             numeric(11,8),
  "contact_name"          character varying(255),
  "contact_phone"         character varying(20),
  "distance_km"           numeric(10,2),
  "duration_minutes"      integer,
  "polyline"              text,
  "status"                character varying(20)    DEFAULT 'pending'::character varying,
  "actual_arrival"        timestamp with time zone,
  "actual_departure"      timestamp with time zone,
  "quantity"              integer                  DEFAULT 0,
  "uom"                   character varying(20),
  "pod_photo_url"         text,
  "notes"                 text,
  "created_at"            timestamp with time zone DEFAULT now(),
  "updated_at"            timestamp with time zone DEFAULT now(),
  "geofence_triggered_at" timestamp with time zone,
  CONSTRAINT "job_routes_pkey" PRIMARY KEY (id),
  CONSTRAINT "job_routes_source_type_check" CHECK (((source_type)::text = ANY ((ARRAY['MD_LOCATION'::character varying, 'MD_CONTACT_ADDRESS'::character varying])::text[]))),
  CONSTRAINT "job_routes_stop_type_check" CHECK (((stop_type)::text = ANY ((ARRAY['PICKUP'::character varying, 'DROPOFF'::character varying])::text[])))

);

-- ============================================================================
-- Object:        public.documents
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/documents.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."documents" (

  "id"            uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"  uuid,
  "doc_type"      text,
  "file_url"      text,
  "created_at"    timestamp with time zone    DEFAULT now(),
  "document_name" character varying(255),
  "is_verified"   boolean                     DEFAULT false,
  "verified_by"   uuid,
  "verified_at"   timestamp without time zone,
  "uploaded_by"   uuid,
  "job_route_id"  uuid,
  CONSTRAINT "documents_doc_type_check"
    CHECK ((doc_type = ANY (ARRAY['surat_jalan'::text, 'tanda_terima'::text, 'foto_barang'::text, 'bukti_timbangan'::text, 'pod'::text, 'foto_kejadian'::text]))),
  CONSTRAINT "documents_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.job_status_history
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/job_status_history.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."job_status_history" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"   uuid                     NOT NULL,
  "old_status"     text,
  "new_status"     text                     NOT NULL,
  "changed_by"     uuid,
  "changed_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "correlation_id" text,
  "notes"          text,
  CONSTRAINT "job_status_history_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.job_tracking
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/job_tracking.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."job_tracking" (

  "id"             uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"   uuid,
  "status_update"  character varying(30),
  "created_at"     timestamp without time zone DEFAULT now(),
  "latitude"       double precision,
  "longitude"      double precision,
  "notes"          text,
  "job_route_id"   uuid,
  "photo_url"      text,
  "recorded_at"    timestamp with time zone,
  "source"         character varying(50)       DEFAULT 'pwa'::character varying,
  "accuracy"       numeric,
  "speed"          numeric,
  "heading"        numeric,
  "battery_level"  numeric,
  "client_ping_id" character varying(255),
  CONSTRAINT "job_tracking_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.locations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/locations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."locations" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"            text                     NOT NULL,
  "address"         text                     NOT NULL,
  "city"            text,
  "created_at"      timestamp with time zone DEFAULT now(),
  "latitude"        numeric(10,8),
  "longitude"       numeric(11,8),
  "district"        text,
  "province"        text,
  "zipcode"         text,
  "notes"           text,
  "organization_id" uuid,
  CONSTRAINT "locations_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_customs_hs_codes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_customs_hs_codes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_customs_hs_codes" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "hs_code"            character varying(12)    NOT NULL,
  "description_id"     text                     NOT NULL,
  "description_en"     text,
  "chapter"            character varying(4)     NOT NULL,
  "heading"            character varying(6)     NOT NULL,
  "subheading"         character varying(8)     NOT NULL,
  "bm_rate"            numeric(5,2)             NOT NULL DEFAULT 0,
  "ppn_rate"           numeric(5,2)             NOT NULL DEFAULT 11,
  "pph_rate"           numeric(5,2)             NOT NULL DEFAULT 2.5,
  "lartas_flag"        boolean                  NOT NULL DEFAULT false,
  "lartas_permit_type" text,
  "uom_primary"        character varying(10)    NOT NULL DEFAULT 'PCE'::character varying,
  "source_reference"   text                     DEFAULT 'BTKI-INSW'::text,
  "source_version"     text                     DEFAULT '2026.1'::text,
  "effective_from"     date                     NOT NULL DEFAULT '2026-01-01'::date,
  "effective_to"       date,
  "is_active"          boolean                  NOT NULL DEFAULT true,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "md_customs_hs_codes_hs_code_key" UNIQUE (hs_code),
  CONSTRAINT "md_customs_hs_codes_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_fleet_master
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_fleet_master.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_fleet_master" (

  "id"           uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "fleet_type"   character varying(50)       NOT NULL,
  "fleet_code"   character varying(50)       NOT NULL,
  "fleet_brand"  character varying(100),
  "fleet_model"  character varying(100),
  "capacity_ton" integer                     DEFAULT 0,
  "capacity_cbm" integer                     DEFAULT 0,
  "dimension"    jsonb                       DEFAULT '{"width": 0, "height": 0, "length": 0}'::jsonb,
  "is_active"    boolean                     DEFAULT true,
  "created_at"   timestamp without time zone DEFAULT now(),
  CONSTRAINT "md_fleet_master_fleet_code_key" UNIQUE (fleet_code),
  CONSTRAINT "md_fleet_master_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_services
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_services" (

  "id"                 uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"          uuid                     NOT NULL,
  "sbu_type"           text                     NOT NULL,
  "charge_code"        text                     NOT NULL,
  "service_name"       text                     NOT NULL,
  "category"           text                     NOT NULL,
  "default_uom"        text,
  "description"        text,
  "income_account_id"  uuid,
  "expense_account_id" uuid,
  "is_active"          boolean                  DEFAULT true,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  "created_by"         uuid,
  CONSTRAINT "md_services_category_check"
    CHECK ((category = ANY (ARRAY['STORAGE'::text, 'HANDLING'::text, 'VAS'::text, 'ADMIN'::text, 'TRANSPORT'::text, 'CLEARANCE'::text, 'OTHER'::text]))),
  CONSTRAINT "md_services_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_services_sbu_type_check" CHECK ((sbu_type = ANY (ARRAY['WAREHOUSE'::text, 'TRUCKING'::text, 'FORWARDING'::text, 'CLEARANCE'::text, 'GENERAL'::text]))),
  CONSTRAINT "md_services_tenant_id_charge_code_key" UNIQUE (tenant_id, charge_code)

);

-- ============================================================================
-- Object:        public.md_taxes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_taxes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_taxes" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        character varying(50)    NOT NULL,
  "rate"        numeric                  NOT NULL DEFAULT 0,
  "type"        character varying(20)    DEFAULT 'VAT'::character varying,
  "description" text,
  "is_active"   boolean                  DEFAULT true,
  "created_at"  timestamp with time zone DEFAULT now(),
  "code"        text                     NOT NULL,
  "tenant_id"   uuid,
  CONSTRAINT "md_taxes_name_key" UNIQUE (name),
  CONSTRAINT "md_taxes_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.invoices
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."invoices" (

  "id"                           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "wo_id"                        uuid                     NOT NULL,
  "invoice_number"               text,
  "co_revenue_account_id"        uuid,
  "total_billing"                numeric(15,2)            DEFAULT 0,
  "total_cogs"                   numeric(15,2)            DEFAULT 0,
  "gross_margin"                 numeric(15,2)            DEFAULT 0,
  "tax_amount"                   numeric(15,2)            DEFAULT 0,
  "tax_percentage"               numeric(5,2)             DEFAULT 0,
  "status"                       text                     NOT NULL DEFAULT 'draft'::text,
  "invoice_date"                 date,
  "due_date"                     date,
  "sent_at"                      timestamp with time zone,
  "customer_accepted_invoice_at" timestamp with time zone,
  "paid_at"                      timestamp with time zone,
  "notes"                        text,
  "created_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "tax_id"                       uuid,
  "line_items"                   jsonb,
  CONSTRAINT "invoices_invoice_number_key" UNIQUE (invoice_number),
  CONSTRAINT "invoices_pkey" PRIMARY KEY (id),
  CONSTRAINT "invoices_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'paid'::text, 'cancelled'::text])))

);

-- ============================================================================
-- Object:        public.invoice_line_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/invoice_line_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."invoice_line_items" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id"         uuid                     NOT NULL,
  "jo_id"              uuid                     NOT NULL,
  "description"        text,
  "plate_number"       text,
  "driver_name"        text,
  "amount"             numeric(15,2)            NOT NULL DEFAULT 0,
  "co_cost_account_id" uuid,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_tenants
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_tenants.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_tenants" (

  "id"          uuid                     NOT NULL,
  "tenant_code" character varying(64),
  "name"        text                     NOT NULL,
  "status"      text                     NOT NULL DEFAULT 'active'::text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "md_tenants_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_tenants_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))

);

-- ============================================================================
-- Object:        public.accounting_events
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."accounting_events" (


  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               uuid                     NOT NULL,
  "source_entity_type"      text                     NOT NULL,
  "source_entity_id"        uuid                     NOT NULL,
  "source_reference"        text,
  "accounting_date"         date                     NOT NULL DEFAULT CURRENT_DATE,
  "currency"                text                     NOT NULL,
  "fx_rate"                 numeric(18,6),
  "fx_currency"             text,
  "fx_timestamp"            timestamp with time zone,
  "total_debit"             numeric(18,4)            NOT NULL DEFAULT 0,
  "total_credit"            numeric(18,4)            NOT NULL DEFAULT 0,
  "idempotency_key"         text                     NOT NULL,
  "external_correlation_id" text,
  "external_system"         text,
  "acknowledged_at"         timestamp with time zone,
  "failure_reason"          text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"              uuid,
  "updated_by"              uuid,
  "status" public.com_accounting_event_status NOT NULL DEFAULT 'DRAFT'::public.com_accounting_event_status,
  "event_type" public.com_accounting_event_type NOT NULL,
  CONSTRAINT "accounting_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "chk_accounting_event_balanced" CHECK ((total_debit = total_credit)),
  CONSTRAINT "uq_accounting_event_idempotency" UNIQUE (tenant_id, idempotency_key)


);

-- ============================================================================
-- Object:        public.accounting_event_lines
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/accounting_event_lines.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."accounting_event_lines" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           uuid                     NOT NULL,
  "accounting_event_id" uuid                     NOT NULL,
  "line_type"           text                     NOT NULL,
  "account_code"        text                     NOT NULL,
  "description"         text,
  "amount"              numeric(18,4)            NOT NULL DEFAULT 0,
  "currency"            text                     NOT NULL,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"          uuid,
  "updated_by"          uuid,
  CONSTRAINT "accounting_event_lines_line_type_check" CHECK ((line_type = ANY (ARRAY['DEBIT'::text, 'CREDIT'::text]))),
  CONSTRAINT "accounting_event_lines_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.accounting_providers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/accounting_providers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."accounting_providers" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "provider_code" text                     NOT NULL,
  "provider_name" text                     NOT NULL,
  "config"        jsonb                    DEFAULT '{}'::jsonb,
  "is_active"     boolean                  NOT NULL DEFAULT true,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"    uuid,
  "updated_by"    uuid,
  CONSTRAINT "accounting_providers_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_accounting_provider_code" UNIQUE (tenant_id, provider_code)

);

-- ============================================================================
-- Object:        public.event_consumption_log
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/event_consumption_log.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."event_consumption_log" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "event_id"      uuid                     NOT NULL,
  "consumer_name" text                     NOT NULL,
  "consumed_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "status"        text                     NOT NULL DEFAULT 'SUCCESS'::text,
  "error_message" text,
  CONSTRAINT "event_consumption_log_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_event_consumer" UNIQUE (event_id, consumer_name)

);

-- ============================================================================
-- Object:        public.event_dead_letter
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/event_dead_letter.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."event_dead_letter" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid                     NOT NULL,
  "event_id"       uuid                     NOT NULL,
  "consumer_name"  text                     NOT NULL,
  "payload"        jsonb                    NOT NULL,
  "failure_reason" text                     NOT NULL,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "event_dead_letter_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.event_outbox
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/event_outbox.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."event_outbox" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "event_id"        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "event_name"      text                     NOT NULL,
  "event_version"   text                     NOT NULL DEFAULT '1.0.0'::text,
  "aggregate_type"  text                     NOT NULL,
  "aggregate_id"    uuid                     NOT NULL,
  "correlation_id"  uuid                     NOT NULL,
  "causation_id"    uuid,
  "producer_domain" text                     NOT NULL,
  "payload"         jsonb                    NOT NULL,
  "is_published"    boolean                  DEFAULT false,
  "published_at"    timestamp with time zone,
  "retry_count"     integer                  DEFAULT 0,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "event_outbox_event_id_key" UNIQUE (event_id),
  CONSTRAINT "event_outbox_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.fin_payments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_payments" (


  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          uuid                     NOT NULL,
  "payment_number"     text                     NOT NULL,
  "direction"          text                     NOT NULL,
  "amount"             numeric(18,4)            NOT NULL DEFAULT 0,
  "currency"           text                     NOT NULL,
  "payment_date"       date                     NOT NULL DEFAULT CURRENT_DATE,
  "value_date"         date,
  "reference"          text,
  "method"             text,
  "fx_rate"            numeric(18,6),
  "fx_currency"        text,
  "fx_timestamp"       timestamp with time zone,
  "external_reference" text,
  "source_metadata"    jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"         uuid,
  "updated_by"         uuid,
  "status" public.com_payment_status NOT NULL DEFAULT 'PENDING'::public.com_payment_status,
  CONSTRAINT "fin_payments_direction_check" CHECK ((direction = ANY (ARRAY['AR'::text, 'AP'::text]))),
  CONSTRAINT "fin_payments_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_fin_payments_number" UNIQUE (tenant_id, payment_number)


);

-- ============================================================================
-- Object:        public.fin_reconciliation_records
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_reconciliation_records" (


  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          uuid                     NOT NULL,
  "payment_id"         uuid,
  "external_reference" text,
  "external_amount"    numeric(18,4),
  "external_currency"  text,
  "external_date"      date,
  "matched_at"         timestamp with time zone,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"         uuid,
  "updated_by"         uuid,
  "status" public.com_reconciliation_status NOT NULL DEFAULT 'UNMATCHED'::public.com_reconciliation_status,
  CONSTRAINT "fin_reconciliation_records_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.md_trucking_regions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_trucking_regions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_trucking_regions" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid                     NOT NULL,
  "name"       text                     NOT NULL,
  "level"      text                     NOT NULL,
  "parent_id"  uuid,
  "is_active"  boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "md_trucking_regions_level_check" CHECK ((level = ANY (ARRAY['PROVINCE'::text, 'CITY'::text]))),
  CONSTRAINT "md_trucking_regions_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_trucking_regions_tenant_id_name_key" UNIQUE (tenant_id, name)

);

-- ============================================================================
-- Object:        public.md_vehicle_types
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_vehicle_types.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_vehicle_types" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid,
  "name"       text                     NOT NULL,
  "is_active"  boolean                  DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "md_vehicle_types_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.monitoring_checks
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/monitoring_checks.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."monitoring_checks" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "check_type" text                     NOT NULL,
  "status"     text                     NOT NULL,
  "module"     text,
  "message"    text,
  "details"    jsonb,
  "checked_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "monitoring_checks_pkey" PRIMARY KEY (id),
  CONSTRAINT "monitoring_checks_status_check" CHECK ((status = ANY (ARRAY['pass'::text, 'fail'::text, 'warning'::text])))

);

-- ============================================================================
-- Object:        public.notifications
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."notifications" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid,
  "role"       character varying(50),
  "title"      character varying(255)   NOT NULL,
  "message"    text                     NOT NULL,
  "type"       character varying(30)    DEFAULT 'info'::character varying,
  "is_read"    boolean                  DEFAULT false,
  "metadata"   jsonb                    DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.pricing_rates
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/pricing_rates.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."pricing_rates" (


  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "rate_code"        text                     NOT NULL,
  "capability_type"  text                     NOT NULL,
  "rate_description" text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"       uuid,
  "updated_by"       uuid,
  "status" public.com_pricing_rate_status NOT NULL DEFAULT 'DRAFT'::public.com_pricing_rate_status,
  CONSTRAINT "pricing_rates_capability_type_check" CHECK ((capability_type = ANY (ARRAY['FORWARDING'::text, 'CUSTOMS'::text, 'TRUCKING'::text, 'WAREHOUSE'::text]))),
  CONSTRAINT "pricing_rates_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_pricing_rate_code" UNIQUE (tenant_id, rate_code),
  CONSTRAINT "uq_pricing_rates_id_tenant" UNIQUE (id, tenant_id)


);

-- ============================================================================
-- Object:        public.pricing_rate_versions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."pricing_rate_versions" (


  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "rate_id"        uuid                     NOT NULL,
  "tenant_id"      uuid                     NOT NULL,
  "version_no"     integer                  NOT NULL,
  "effective_from" date                     NOT NULL DEFAULT CURRENT_DATE,
  "effective_to"   date,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"     uuid,
  "updated_by"     uuid,
  "status" public.com_pricing_rate_status NOT NULL DEFAULT 'DRAFT'::public.com_pricing_rate_status,
  CONSTRAINT "chk_pricing_rate_versions_effective_period" CHECK (((effective_to IS NULL) OR (effective_from <= effective_to))),
  CONSTRAINT "pricing_rate_versions_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_pricing_rate_versions_id_tenant" UNIQUE (id, tenant_id),
  CONSTRAINT "uq_pricing_rate_version" UNIQUE (tenant_id, rate_id, version_no)


);

-- ============================================================================
-- Object:        public.pricing_rate_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."pricing_rate_items" (


  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "rate_version_id"          uuid                     NOT NULL,
  "tenant_id"                uuid                     NOT NULL,
  "charge_basis"             text                     NOT NULL,
  "unit_of_measure"          text                     NOT NULL,
  "currency"                 text                     NOT NULL,
  "unit_rate"                numeric(18,4)            NOT NULL DEFAULT 0,
  "min_charge"               numeric(18,4),
  "max_charge"               numeric(18,4),
  "applicability_conditions" jsonb                    DEFAULT '{}'::jsonb,
  "created_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"               uuid,
  "updated_by"               uuid,
  "side" public.com_pricing_side NOT NULL DEFAULT 'SELL'::public.com_pricing_side,
  CONSTRAINT "pricing_rate_items_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.profiles
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."profiles" (

  "id"              uuid                     NOT NULL,
  "full_name"       text,
  "email"           text,
  "role"            text                     DEFAULT 'viewer'::text,
  "sbu_access"      text[]                   DEFAULT '{trucking}'::text[],
  "is_active"       boolean                  DEFAULT true,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "company_id"      uuid,
  "organization_id" uuid,
  "whatsapp"        character varying(20),
  "region_id"       uuid,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.recipients
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/recipients.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."recipients" (

  "id"         uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid                        NOT NULL,
  "code"       character varying(50),
  "name"       character varying(255)      NOT NULL,
  "address"    text,
  "pic_name"   character varying(255),
  "pic_phone"  character varying(20),
  "is_active"  boolean                     DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "recipients_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.roles
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/roles.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."roles" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "description" text,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "roles_name_key" UNIQUE (name),
  CONSTRAINT "roles_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.routes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/routes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."routes" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"             text                     NOT NULL,
  "origin_city"      text                     NOT NULL,
  "destination_city" text                     NOT NULL,
  "distance_km"      integer,
  "estimated_hours"  integer,
  "last_used_at"     timestamp with time zone,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "routes_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.sbu_token_rates
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/sbu_token_rates.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."sbu_token_rates" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "sbu_type"      text                     NOT NULL,
  "tokens_per_jo" integer                  NOT NULL DEFAULT 1,
  "updated_at"    timestamp with time zone DEFAULT now(),
  "updated_by"    uuid,
  CONSTRAINT "sbu_token_rates_pkey" PRIMARY KEY (id),
  CONSTRAINT "sbu_token_rates_sbu_type_check" CHECK ((sbu_type = ANY (ARRAY['TRUCKING'::text, 'WAREHOUSE'::text, 'CLEARANCE'::text, 'FORWARDING'::text]))),
  CONSTRAINT "sbu_token_rates_sbu_type_key" UNIQUE (sbu_type)

);

-- ============================================================================
-- Object:        public.shipment_status_history
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shipment_status_history.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shipment_status_history" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "shipment_id"    uuid,
  "old_status"     text,
  "new_status"     text                     NOT NULL,
  "changed_by"     uuid,
  "changed_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "correlation_id" text,
  "notes"          text,
  CONSTRAINT "shipment_status_history_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.shippers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shippers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shippers" (

  "id"         uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid                        NOT NULL,
  "code"       character varying(50),
  "name"       character varying(255)      NOT NULL,
  "is_active"  boolean                     DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "shippers_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.sla_escalations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/sla_escalations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."sla_escalations" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "wo_id"            uuid,
  "jo_id"            uuid,
  "sla_stage"        character varying(20)    NOT NULL,
  "breach_type"      character varying(20)    NOT NULL,
  "escalation_level" integer                  NOT NULL DEFAULT 1,
  "notified_role"    character varying(50),
  "notified_at"      timestamp with time zone DEFAULT now(),
  "resolved_at"      timestamp with time zone,
  "resolved_by"      uuid,
  "details"          text,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "sla_escalations_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.storage_areas
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/storage_areas.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."storage_areas" (

  "id"         uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid                        NOT NULL,
  "code"       character varying(50),
  "name"       character varying(255),
  "zone"       character varying(50),
  "rack"       character varying(50),
  "shelf"      character varying(50),
  "is_active"  boolean                     DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "storage_areas_code_key" UNIQUE (code),
  CONSTRAINT "storage_areas_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.tax_rates
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/tax_rates.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."tax_rates" (

  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "hs_code"             text                     NOT NULL,
  "country_code"        text                     NOT NULL,
  "import_duty_percent" double precision         DEFAULT 0,
  "vat_percent"         double precision         DEFAULT 0,
  "luxury_tax_percent"  double precision         DEFAULT 0,
  "other_taxes"         jsonb                    DEFAULT '[]'::jsonb,
  "fta_scheme"          text,
  "fta_duty_percent"    double precision,
  "currency"            text                     DEFAULT 'USD'::text,
  "source_id"           text,
  "effective_from"      date                     DEFAULT CURRENT_DATE,
  "effective_to"        date,
  "is_active"           boolean                  DEFAULT true,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  "hs_level"            text,
  CONSTRAINT "tax_rates_hs_level_check" CHECK ((hs_level = ANY (ARRAY['CHAPTER'::text, 'HEADING'::text, 'SUBHEADING'::text]))),
  CONSTRAINT "tax_rates_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.tenant_roles
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/tenant_roles.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."tenant_roles" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "role_code"   character varying(50)    NOT NULL,
  "role_name"   character varying(100)   NOT NULL,
  "role_level"  integer                  DEFAULT 1,
  "sbu_type"    character varying(20),
  "permissions" text[]                   DEFAULT '{}'::text[],
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "tenant_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "tenant_roles_role_code_key" UNIQUE (role_code)

);

-- ============================================================================
-- Object:        public.token_price_history
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/token_price_history.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."token_price_history" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "old_price"  integer                  NOT NULL,
  "new_price"  integer                  NOT NULL,
  "changed_by" uuid,
  "reason"     text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "token_price_history_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.token_prices
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/token_prices.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."token_prices" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "price_per_token" integer                  NOT NULL DEFAULT 1000,
  "currency"        character varying(3)     DEFAULT 'IDR'::character varying,
  "effective_from"  timestamp with time zone DEFAULT now(),
  "effective_to"    timestamp with time zone,
  "updated_by"      uuid,
  "notes"           text,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "token_prices_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.tracking_updates
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/tracking_updates.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."tracking_updates" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"  uuid,
  "location"      text,
  "status_update" text,
  "whatsapp_sent" boolean                  DEFAULT false,
  "created_at"    timestamp with time zone DEFAULT now(),
  "latitude"      numeric,
  "longitude"     numeric,
  "recorded_at"   timestamp with time zone,
  CONSTRAINT "tracking_updates_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.transporters
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/transporters.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."transporters" (

  "id"         uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid                        NOT NULL,
  "code"       character varying(50),
  "name"       character varying(255)      NOT NULL,
  "pic_name"   character varying(255),
  "pic_phone"  character varying(20),
  "is_active"  boolean                     DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  "updated_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "transporters_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.truck_types
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/truck_types.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."truck_types" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"        text                     NOT NULL,
  "description" text,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "truck_types_name_key" UNIQUE (name),
  CONSTRAINT "truck_types_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.user_roles
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/user_roles.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."user_roles" (

  "id"         uuid                     NOT NULL,
  "role"       text                     NOT NULL DEFAULT 'viewer'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "user_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_roles_role_check"
    CHECK
    ((role = ANY (ARRAY['owner_sentralogis'::text, 'tenant_admin'::text, 'tenant_superadmin'::text, 'viewer'::text, 'user'::text, 'hq_director_ops'::text, 'hq_director_fin'::text,
    'hq_director_cs'::text,
    'hq_cs'::text,
    'hq_ops'::text,
    'hq_finance'::text,
    'sbu_manager_tr'::text,
    'sbu_admin_tr'::text,
    'sbu_ops_tr'::text,
    'sbu_fin_tr'::text,
    'sbu_manager_wh'::text,
    'sbu_admin_wh'::text,
    'sbu_ops_wh'::text,
    'sbu_fin_wh'::text,
    'sbu_manager_ink'::text,
    'sbu_admin_ink'::text, 'sbu_ops_ink'::text, 'sbu_fin_ink'::text, 'sbu_manager_fwd'::text, 'sbu_admin_fwd'::text, 'sbu_ops_fwd'::text, 'sbu_fin_fwd'::text])))

);

-- ============================================================================
-- Object:        public.warehouses
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/warehouses.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."warehouses" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"           text                     NOT NULL,
  "address"        text,
  "city"           text,
  "province"       text,
  "tenant_id"      uuid,
  "warehouse_type" text                     DEFAULT 'owned'::text,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "warehouses_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.staff
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/staff.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."staff" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    uuid                     NOT NULL,
  "full_name"    text                     NOT NULL,
  "email"        text,
  "phone"        text,
  "photo_url"    text,
  "status"       text                     DEFAULT 'active'::text,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  "user_id"      uuid,
  "role_id"      uuid,
  "warehouse_id" uuid,
  "is_active"    boolean                  DEFAULT true,
  CONSTRAINT "staff_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.storage_zones
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/storage_zones.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."storage_zones" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "warehouse_id"  uuid,
  "name"          text                     NOT NULL,
  "code"          text                     NOT NULL,
  "zone_type"     text                     NOT NULL,
  "capacity_cbm"  numeric                  DEFAULT 0,
  "max_weight_kg" numeric                  DEFAULT 0,
  "length"        numeric                  DEFAULT 0,
  "width"         numeric                  DEFAULT 0,
  "height"        numeric                  DEFAULT 0,
  "temp_min"      numeric                  DEFAULT 0,
  "temp_max"      numeric                  DEFAULT 0,
  "is_active"     boolean                  DEFAULT true,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "storage_zones_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.storage_locations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/storage_locations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."storage_locations" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "zone_id"     uuid,
  "code"        text                     NOT NULL,
  "max_cbm"     numeric                  DEFAULT 0,
  "current_cbm" numeric                  DEFAULT 0,
  "status"      text                     DEFAULT 'available'::text,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "storage_locations_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.tenants
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."tenants" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "warehouse_id"      uuid                     NOT NULL,
  "name"              text                     NOT NULL,
  "email"             text,
  "phone"             text,
  "sla_tier"          text,
  "status"            text                     DEFAULT 'active'::text,
  "created_at"        timestamp with time zone DEFAULT now(),
  "user_id"           uuid,
  "tenant_code"       character varying(50),
  "subscription_tier" character varying(50)    DEFAULT 'free'::character varying,
  "token_balance"     integer                  DEFAULT 0,
  "total_tokens_used" integer                  DEFAULT 0,
  "updated_at"        timestamp with time zone DEFAULT now(),
  "initial"           character varying(10),
  "logo_url"          text,
  CONSTRAINT "tenants_pkey" PRIMARY KEY (id),
  CONSTRAINT "tenants_sla_tier_check" CHECK ((sla_tier = ANY (ARRAY['basic'::text, 'standard'::text, 'premium'::text]))),
  CONSTRAINT "tenants_tenant_code_key" UNIQUE (tenant_code)

);

-- ============================================================================
-- Object:        public.attribute_types
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/attribute_types.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."attribute_types" (

  "id"         uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid,
  "name"       text                        NOT NULL,
  "data_type"  text                        DEFAULT 'text'::text,
  "created_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "attribute_types_pkey" PRIMARY KEY (id),
  CONSTRAINT "attribute_types_tenant_id_name_key" UNIQUE (tenant_id, name)

);

-- ============================================================================
-- Object:        public.chat_groups
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."chat_groups" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   uuid                     NOT NULL,
  "name"        text                     NOT NULL,
  "group_type"  text                     NOT NULL DEFAULT 'custom'::text,
  "description" text,
  "avatar_url"  text,
  "created_by"  uuid,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "chat_groups_group_type_check" CHECK ((group_type = ANY (ARRAY['sbu'::text, 'role'::text, 'organization'::text, 'custom'::text]))),
  CONSTRAINT "chat_groups_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.chat_channels
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."chat_channels" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "channel_type" text                     NOT NULL,
  "channel_id"   text                     NOT NULL,
  "title"        text,
  "created_at"   timestamp with time zone DEFAULT now(),
  "group_id"     uuid,
  "is_archived"  boolean                  DEFAULT false,
  "archived_at"  timestamp with time zone,
  "archived_by"  uuid,
  CONSTRAINT "chat_channels_channel_type_check" CHECK ((channel_type = ANY (ARRAY['job_order'::text, 'work_order'::text, 'direct'::text, 'group'::text, 'lead'::text]))),
  CONSTRAINT "chat_channels_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.chat_group_members
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."chat_group_members" (

  "group_id"  uuid                     NOT NULL,
  "user_id"   uuid                     NOT NULL,
  "role"      text                     NOT NULL DEFAULT 'member'::text,
  "joined_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "chat_group_members_pkey" PRIMARY KEY (group_id, user_id),
  CONSTRAINT "chat_group_members_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))

);

-- ============================================================================
-- Object:        public.chat_messages
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."chat_messages" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "channel_id"        uuid                     NOT NULL,
  "sender_id"         uuid,
  "message"           text                     NOT NULL,
  "parent_id"         uuid,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  "context_type"      text,
  "context_id"        uuid,
  "is_pinned"         boolean                  DEFAULT false,
  "pinned_at"         timestamp with time zone,
  "pinned_by"         uuid,
  "guest_sender_name" text,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.chat_attachments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."chat_attachments" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "message_id" uuid                     NOT NULL,
  "file_url"   text                     NOT NULL,
  "file_name"  text                     NOT NULL,
  "file_type"  text,
  "file_size"  integer,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "chat_attachments_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.chat_participants
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."chat_participants" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "channel_id"   uuid                     NOT NULL,
  "user_id"      uuid                     NOT NULL,
  "role"         text                     NOT NULL DEFAULT 'member'::text,
  "last_read_at" timestamp with time zone,
  "joined_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "chat_participants_channel_id_user_id_key" UNIQUE (channel_id, user_id),
  CONSTRAINT "chat_participants_pkey" PRIMARY KEY (id),
  CONSTRAINT "chat_participants_role_check" CHECK ((role = ANY (ARRAY['member'::text, 'admin'::text])))

);

-- ============================================================================
-- Object:        public.customers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/customers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."customers" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "name"            text                     NOT NULL,
  "email"           text                     NOT NULL,
  "phone"           text,
  "address"         text,
  "is_active"       boolean                  DEFAULT true,
  "auth_user_id"    uuid,
  "created_by"      uuid,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "customer_code"   text,
  "pic_name"        text,
  "billing_address" text,
  "city"            text,
  "code"            character varying(50),
  "pic_phone"       character varying(20),
  "tax_id"          character varying(50),
  "billing_method"  character varying(20)    DEFAULT 'hardcopy'::character varying,
  CONSTRAINT "customers_auth_user_id_key" UNIQUE (auth_user_id),
  CONSTRAINT "customers_customer_code_key" UNIQUE (customer_code),
  CONSTRAINT "customers_email_key" UNIQUE (email),
  CONSTRAINT "customers_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.gps_provider_configs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/gps_provider_configs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."gps_provider_configs" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "provider_name" character varying(50)    NOT NULL,
  "api_token"     text                     NOT NULL,
  "api_url"       text                     NOT NULL DEFAULT 'https://vtsapi.easygo-gps.co.id'::text,
  "is_active"     boolean                  DEFAULT true,
  "config"        jsonb,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "gps_provider_configs_pkey" PRIMARY KEY (id),
  CONSTRAINT "gps_provider_configs_tenant_id_provider_name_key" UNIQUE (tenant_id, provider_name)

);

-- ============================================================================
-- Object:        public.ground_sites
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/ground_sites.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."ground_sites" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "name"              character varying(255)   NOT NULL,
  "code"              character varying(50),
  "site_type"         character varying(50)    NOT NULL DEFAULT 'depot'::character varying,
  "address"           text,
  "latitude"          numeric(10,7),
  "longitude"         numeric(10,7),
  "geofence_radius_m" integer                  NOT NULL DEFAULT 150,
  "is_active"         boolean                  DEFAULT true,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  CONSTRAINT "ground_sites_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.ground_staff_profiles
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/ground_staff_profiles.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."ground_staff_profiles" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid                     NOT NULL,
  "tenant_id"  uuid                     NOT NULL,
  "name"       character varying(255)   NOT NULL,
  "phone"      character varying(50),
  "is_active"  boolean                  DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "ground_staff_profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "ground_staff_profiles_user_id_key" UNIQUE (user_id)

);

-- ============================================================================
-- Object:        public.inbound_headers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."inbound_headers" (

  "id"                     uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"              uuid                        NOT NULL,
  "asn_number"             character varying           NOT NULL,
  "ref_number"             character varying,
  "order_date"             date                        DEFAULT CURRENT_DATE,
  "eta_date"               date,
  "eta_time"               time without time zone,
  "shipper_id"             uuid,
  "customer_id"            uuid,
  "transporter_id"         uuid,
  "recipient_id"           uuid,
  "armada_id"              uuid,
  "driver_id"              uuid,
  "arrival_date"           date                        NOT NULL DEFAULT CURRENT_DATE,
  "notes"                  text,
  "header_notes"           text,
  "status"                 character varying           DEFAULT 'draft'::character varying,
  "received_by"            uuid,
  "received_at"            timestamp without time zone,
  "created_at"             timestamp without time zone DEFAULT now(),
  "updated_at"             timestamp without time zone DEFAULT now(),
  "workflow_status"        character varying(50)       DEFAULT 'waiting_arrival'::character varying,
  "arrived_at"             timestamp without time zone,
  "unload_started_at"      timestamp without time zone,
  "unload_stopped_at"      timestamp without time zone,
  "qc_completed_at"        timestamp without time zone,
  "putaway_completed_at"   timestamp without time zone,
  "truck_photo_url"        text,
  "driver_scan_photo_url"  text,
  "berita_acara_photo_url" text,
  CONSTRAINT "inbound_headers_pkey" PRIMARY KEY (id),
  CONSTRAINT "unique_asn_per_tenant_v2" UNIQUE (tenant_id, asn_number)

);

-- ============================================================================
-- Object:        public.master_contacts
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/master_contacts.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."master_contacts" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid,
  "name"           text                     NOT NULL,
  "contact_code"   text,
  "email"          text,
  "phone"          text,
  "address"        text,
  "city"           text,
  "is_customer"    boolean                  DEFAULT false,
  "is_shipper"     boolean                  DEFAULT false,
  "is_recipient"   boolean                  DEFAULT false,
  "is_transporter" boolean                  DEFAULT false,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "master_contacts_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_contacts
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_contacts.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_contacts" (

  "id"                uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "contact_type"      character varying(20)       NOT NULL,
  "code"              character varying(50)       NOT NULL,
  "name"              character varying(255)      NOT NULL,
  "legal_name"        character varying(255),
  "tax_id"            character varying(50),
  "email"             character varying(255),
  "phone"             character varying(20),
  "mobile"            character varying(20),
  "whatsapp"          character varying(20),
  "address"           jsonb                       DEFAULT
    '{"city": "", "street": "", "country": "Indonesia", "latitude": null, "province": "", "longitude": null, "postal_code": ""}'::jsonb,
  "parent_contact_id" uuid,
  "tenant_id"         uuid,
  "is_active"         boolean                     DEFAULT true,
  "notes"             text,
  "created_by"        uuid,
  "created_at"        timestamp without time zone DEFAULT now(),
  "updated_at"        timestamp without time zone DEFAULT now(),
  CONSTRAINT "md_contacts_code_key" UNIQUE (code),
  CONSTRAINT "md_contacts_contact_type_check"
    CHECK
    (((contact_type)::text = ANY ((ARRAY['CUSTOMER'::character varying, 'VENDOR'::character varying, 'SHIPPER'::character varying, 'RECIPIENT'::character varying,
    'BROKER'::character varying, 'TENANT'::character varying])::text[]))),
  CONSTRAINT "md_contacts_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_entities
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_entities" (


  "id"                  uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "entity_code"         character varying(50)       NOT NULL,
  "name"                character varying(255)      NOT NULL,
  "legal_name"          character varying(255),
  "tax_id"              character varying(50),
  "email"               character varying(255),
  "phone"               character varying(20),
  "mobile"              character varying(20),
  "whatsapp"            character varying(20),
  "is_customer"         boolean                     DEFAULT false,
  "is_supplier"         boolean                     DEFAULT false,
  "is_vendor"           boolean                     DEFAULT false,
  "is_broker"           boolean                     DEFAULT false,
  "vendor_type"         character varying(20),
  "billing_address"     text,
  "billing_city"        character varying(100),
  "billing_province"    character varying(100),
  "billing_postal_code" character varying(20),
  "billing_latitude"    numeric(10,8),
  "billing_longitude"   numeric(11,8),
  "tenant_id"           uuid                        NOT NULL,
  "is_active"           boolean                     DEFAULT true,
  "notes"               text,
  "created_by"          uuid,
  "created_at"          timestamp without time zone DEFAULT now(),
  "updated_at"          timestamp without time zone DEFAULT now(),
  "billing_directions"  text,
  "billing_method"      character varying(50)       DEFAULT 'manual'::character varying,
  "parent_id"           uuid,
  "is_own"              boolean                     DEFAULT false,
  "payment_terms_days"  integer                     DEFAULT 30,
  "payment_terms_type"  text                        DEFAULT 'net_days'::text,
  "logo_url"            text,
  "sales_rep_id"        uuid,
  "vendor_tenant_id"    uuid,
  "crm_status" public.crm_lead_status DEFAULT 'NEW'::public.crm_lead_status,
  CONSTRAINT "md_entities_payment_terms_type_check" CHECK ((payment_terms_type = ANY (ARRAY['net_days'::text, 'cod'::text, 'advance'::text, 'custom'::text]))),
  CONSTRAINT "md_entities_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_entities_tenant_id_entity_code_key" UNIQUE (tenant_id, entity_code),
  CONSTRAINT "md_entities_vendor_type_check"
    CHECK (((vendor_type)::text = ANY ((ARRAY['TRANSPORTER'::character varying, 'PBM'::character varying, 'DEPOT'::character varying, 'OTHER'::character varying])::text[])))


);

-- ============================================================================
-- Object:        public.add_costs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/add_costs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."add_costs" (

  "id"           uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id" uuid,
  "cost_type"    character varying(30)       NOT NULL,
  "amount"       numeric(15,2)               NOT NULL,
  "description"  text,
  "is_vendor"    boolean                     DEFAULT false,
  "vendor_id"    uuid,
  "status"       character varying(20)       DEFAULT 'draft'::character varying,
  "notes"        text,
  "document_url" text,
  "created_by"   uuid,
  "approved_by"  uuid,
  "approved_at"  timestamp without time zone,
  "created_at"   timestamp without time zone DEFAULT now(),
  CONSTRAINT "add_costs_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.crm_deals
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/crm_deals.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."crm_deals" (


  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"           uuid                     NOT NULL,
  "title"               character varying(255)   NOT NULL,
  "expected_revenue"    numeric(15,2)            DEFAULT 0,
  "expected_close_date" date,
  "fee_value"           numeric(15,2),
  "sbu_target"          character varying(50),
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  "created_by"          uuid,
  "updated_by"          uuid,
  "entity_id"           uuid                     NOT NULL,
  "stage" public.crm_deal_stage DEFAULT 'PROSPECTING'::public.crm_deal_stage,
  "fee_type" public.crm_fee_type,
  CONSTRAINT "crm_deals_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.crm_activities
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/crm_activities.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."crm_activities" (


  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"         uuid                     NOT NULL,
  "deal_id"           uuid,
  "activity_date"     timestamp with time zone NOT NULL,
  "location"          text,
  "description"       text,
  "performed_by"      uuid                     NOT NULL,
  "created_at"        timestamp with time zone DEFAULT now(),
  "entity_id"         uuid,
  "status"            character varying(50)    DEFAULT 'COMPLETED'::character varying,
  "check_in_location" text,
  "check_in_time"     timestamp with time zone,
  "photo_url"         text,
  "check_in_lat"      numeric(10,7),
  "check_in_lng"      numeric(10,7),
  "is_all_day"        boolean                  DEFAULT false,
  "activity_type" public.crm_activity_type DEFAULT 'NOTE'::public.crm_activity_type,
  CONSTRAINT "crm_activities_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.crm_guest_links
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/crm_guest_links.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."crm_guest_links" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid                     NOT NULL,
  "entity_id"  uuid                     NOT NULL,
  "token"      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "channel_id" uuid,
  "is_active"  boolean                  DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  "created_by" uuid,
  CONSTRAINT "crm_guest_links_pkey" PRIMARY KEY (id),
  CONSTRAINT "crm_guest_links_token_key" UNIQUE (token)

);

-- ============================================================================
-- Object:        public.crm_quotations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/crm_quotations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."crm_quotations" (

  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"       uuid                     NOT NULL,
  "deal_id"         uuid                     NOT NULL,
  "quote_number"    character varying(100)   NOT NULL,
  "total_amount"    numeric(15,2)            DEFAULT 0,
  "target_price"    numeric(15,2),
  "status"          character varying(50)    DEFAULT 'DRAFT'::character varying,
  "valid_until"     date,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "created_by"      uuid,
  "updated_by"      uuid,
  "subtotal_amount" numeric(15,2)            DEFAULT 0,
  "tax_amount"      numeric(15,2)            DEFAULT 0,
  "notes"           text,
  "validity_days"   integer                  DEFAULT 30,
  "onetime_total"   numeric(15,2)            DEFAULT 0,
  "recurring_total" numeric(15,2)            DEFAULT 0,
  CONSTRAINT "crm_quotations_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.crm_quotation_sections
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."crm_quotation_sections" (

  "id"               uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"        uuid                     NOT NULL,
  "quotation_id"     uuid                     NOT NULL,
  "sbu_type"         character varying(50)    NOT NULL,
  "section_order"    integer                  DEFAULT 0,
  "subtotal"         numeric(15,2)            DEFAULT 0,
  "sbu_notes"        text,
  "approval_status"  character varying(50)    DEFAULT 'PENDING'::character varying,
  "approved_by"      uuid,
  "approved_at"      timestamp with time zone,
  "rejection_reason" text,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  "created_by"       uuid,
  "updated_by"       uuid,
  CONSTRAINT "crm_quotation_sections_pkey" PRIMARY KEY (id),
  CONSTRAINT "crm_quotation_sections_quotation_id_sbu_type_key" UNIQUE (quotation_id, sbu_type)

);

-- ============================================================================
-- Object:        public.crm_sbu_customer_rates
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."crm_sbu_customer_rates" (

  "id"                uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"         uuid                     NOT NULL,
  "customer_id"       uuid                     NOT NULL,
  "sbu_type"          character varying(50)    NOT NULL,
  "service_name"      character varying(255)   NOT NULL,
  "description"       text,
  "uom"               character varying(50)    NOT NULL DEFAULT 'Unit'::character varying,
  "unit_price"        numeric(15,2)            NOT NULL DEFAULT 0,
  "pricing_type"      character varying(50)    NOT NULL DEFAULT 'ONE_TIME'::character varying,
  "min_qty"           numeric(15,2)            DEFAULT 0,
  "route_origin"      character varying(255),
  "route_destination" character varying(255),
  "is_active"         boolean                  DEFAULT true,
  "notes"             text,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  "created_by"        uuid,
  "updated_by"        uuid,
  CONSTRAINT "crm_sbu_customer_rates_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.crm_quotation_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."crm_quotation_items" (

  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"    uuid                     NOT NULL,
  "quotation_id" uuid                     NOT NULL,
  "service_id"   uuid,
  "description"  text                     NOT NULL,
  "qty"          numeric(15,2)            NOT NULL DEFAULT 1,
  "uom"          character varying(50)    DEFAULT 'Unit'::character varying,
  "unit_price"   numeric(15,2)            NOT NULL DEFAULT 0,
  "subtotal"     numeric(15,2)            NOT NULL DEFAULT 0,
  "tax_percent"  numeric(5,2)             DEFAULT 0,
  "tax_amount"   numeric(15,2)            DEFAULT 0,
  "total_price"  numeric(15,2)            NOT NULL DEFAULT 0,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  "created_by"   uuid,
  "updated_by"   uuid,
  "sbu_cluster"  character varying(50)    DEFAULT 'GENERAL'::character varying,
  "section_id"   uuid,
  "pricing_type" character varying(50)    DEFAULT 'ONE_TIME'::character varying,
  "min_qty"      numeric(15,2)            DEFAULT 0,
  "rate_id"      uuid,
  "sbu_metadata" jsonb                    DEFAULT '{}'::jsonb,
  "remarks"      text,
  "nego_price"   numeric(15,2),
  CONSTRAINT "crm_quotation_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_customer_users
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_customer_users" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "customer_id"     uuid                     NOT NULL,
  "user_id"         uuid,
  "email"           text                     NOT NULL,
  "full_name"       text,
  "whatsapp"        text,
  "is_active"       boolean                  DEFAULT true,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "portal_password" text                     DEFAULT 'Password123!'::text,
  CONSTRAINT "md_customer_users_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_customer_users_tenant_id_email_key" UNIQUE (tenant_id, email)

);

-- ============================================================================
-- Object:        public.md_drivers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_drivers" (

  "id"                   uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "entity_id"            uuid,
  "driver_code"          character varying(50)       NOT NULL,
  "name"                 character varying(255)      NOT NULL,
  "phone"                character varying(20)       NOT NULL,
  "whatsapp"             character varying(20),
  "address"              text,
  "sim_number"           character varying(50),
  "sim_class"            character varying(10),
  "sim_expiry"           date                        NOT NULL,
  "status"               character varying(20)       DEFAULT 'available'::character varying,
  "is_active"            boolean                     DEFAULT true,
  "created_by"           uuid,
  "created_at"           timestamp without time zone DEFAULT now(),
  "updated_at"           timestamp without time zone DEFAULT now(),
  "tenant_id"            uuid,
  "bank_name"            character varying(100),
  "bank_account"         character varying(50),
  "bank_account_name"    character varying(200),
  "pin"                  character varying(4),
  "photo_url"            text,
  "trust_score"          integer                     DEFAULT 50,
  "total_jobs_completed" integer                     DEFAULT 0,
  "total_km_driven"      numeric(15,2)               DEFAULT 0,
  "incident_count"       integer                     DEFAULT 0,
  "last_review_date"     timestamp with time zone,
  "is_working"           boolean                     DEFAULT false,
  "last_check_in"        timestamp with time zone,
  "total_absensi"        integer                     DEFAULT 0,
  "avg_inspection_score" numeric(5,2)                DEFAULT 0,
  "total_inspections"    integer                     DEFAULT 0,
  "last_inspection_date" date,
  "avg_review_score"     numeric(3,2)                DEFAULT 0,
  "total_reviews"        integer                     DEFAULT 0,
  "total_distance_km"    numeric(15,2)               DEFAULT 0,
  "sim_photo_url"        text,
  "ktp_photo_url"        text,
  "stnk_photo_url"       text,
  "push_subscription"    jsonb,
  "device_fingerprint"   text,
  "last_device_login"    timestamp with time zone,
  "has_native_app"       boolean                     DEFAULT false,
  "last_app_version"     character varying(20),
  "last_app_open_at"     timestamp with time zone,
  CONSTRAINT "md_drivers_driver_code_key" UNIQUE (driver_code),
  CONSTRAINT "md_drivers_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.driver_kpi_history
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/driver_kpi_history.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."driver_kpi_history" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "driver_id"             uuid                     NOT NULL,
  "tenant_id"             uuid,
  "period_start"          date                     NOT NULL,
  "period_end"            date                     NOT NULL,
  "jobs_completed"        integer                  DEFAULT 0,
  "on_time_delivery_rate" numeric(5,2)             DEFAULT 0,
  "inspection_pass_rate"  numeric(5,2)             DEFAULT 0,
  "avg_score"             numeric(5,2)             DEFAULT 0,
  "km_driven"             numeric(15,2)            DEFAULT 0,
  "incident_count"        integer                  DEFAULT 0,
  "trust_score"           integer                  DEFAULT 50,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "driver_kpi_history_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.driver_performance_logs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/driver_performance_logs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."driver_performance_logs" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "driver_id"    uuid,
  "log_type"     character varying(20),
  "value"        numeric(12,2)            DEFAULT 0,
  "reference_id" uuid,
  "description"  text,
  "created_at"   timestamp with time zone DEFAULT now(),
  "type"         text                     NOT NULL DEFAULT 'KM_LOG'::text,
  "review_score" smallint,
  "review_notes" text,
  "job_order_id" uuid,
  "total_km"     numeric(12,2),
  CONSTRAINT "driver_performance_logs_log_type_check"
    CHECK
    (((log_type)::text = ANY ((ARRAY['mileage'::character varying, 'incident'::character varying, 'point_reward'::character varying, 'point_penalty'::character
    varying])::text[]))),
  CONSTRAINT "driver_performance_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "driver_performance_logs_type_check" CHECK ((type = ANY (ARRAY['KM_LOG'::text, 'SAFETY_INCIDENT'::text, 'REVIEW'::text])))

);

-- ============================================================================
-- Object:        public.driver_resolution_audit_logs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/driver_resolution_audit_logs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."driver_resolution_audit_logs" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "operator_id"           uuid                     NOT NULL,
  "timestamp"             timestamp with time zone NOT NULL DEFAULT now(),
  "tenant_id"             uuid                     NOT NULL,
  "driver_id"             uuid                     NOT NULL,
  "old_phone"             text,
  "new_phone"             text,
  "reason"                text                     NOT NULL,
  "action"                text                     NOT NULL,
  "conflicting_driver_id" uuid,
  "created_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "driver_resolution_audit_logs_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.driver_tenant_links
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."driver_tenant_links" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" uuid                     NOT NULL,
  "tenant_id"  uuid                     NOT NULL,
  "driver_id"  uuid                     NOT NULL,
  "is_active"  boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "driver_tenant_links_pkey" PRIMARY KEY (id),
  CONSTRAINT "driver_tenant_links_profile_id_tenant_id_key" UNIQUE (profile_id, tenant_id),
  CONSTRAINT "uq_driver_tenant_links_driver_id" UNIQUE (driver_id)

);

-- ============================================================================
-- Object:        public.md_entity_addresses
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_entity_addresses.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_entity_addresses" (

  "id"                 uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "entity_id"          uuid,
  "address_name"       character varying(255)      NOT NULL,
  "address_type"       character varying(20)       DEFAULT 'other'::character varying,
  "address"            text                        NOT NULL,
  "city"               character varying(100),
  "province"           character varying(100),
  "postal_code"        character varying(20),
  "latitude"           numeric(10,8),
  "longitude"          numeric(11,8),
  "contact_person"     character varying(255),
  "contact_phone"      character varying(20),
  "is_active"          boolean                     DEFAULT true,
  "created_at"         timestamp without time zone DEFAULT now(),
  "address_directions" text,
  CONSTRAINT "md_entity_addresses_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_fleet_types
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_fleet_types" (

  "id"               uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "type_code"        character varying(50)       NOT NULL,
  "type_name"        character varying(100)      NOT NULL,
  "capacity_ton"     integer                     DEFAULT 0,
  "capacity_cbm"     integer                     DEFAULT 0,
  "is_active"        boolean                     DEFAULT true,
  "created_at"       timestamp without time zone DEFAULT now(),
  "tenant_id"        uuid,
  "time_multiplier"  numeric                     DEFAULT 1.0,
  "fuel_consumption" numeric                     DEFAULT 1.0,
  "updated_at"       timestamp with time zone    DEFAULT now(),
  "icon_url"         text,
  CONSTRAINT "md_fleet_types_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_fleet_types_type_code_key" UNIQUE (type_code)

);

-- ============================================================================
-- Object:        public.md_driver_allowances
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_driver_allowances.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_driver_allowances" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "origin_city"      text                     NOT NULL,
  "destination_city" text                     NOT NULL,
  "fleet_type_id"    uuid                     NOT NULL,
  "amount"           numeric                  NOT NULL DEFAULT 0,
  "is_active"        boolean                  NOT NULL DEFAULT true,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "md_driver_allowances_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_driver_allowances_tenant_id_origin_city_destination_city_key" UNIQUE (tenant_id, origin_city, destination_city, fleet_type_id)

);

-- ============================================================================
-- Object:        public.md_fleets
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_fleets" (

  "id"                   uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "entity_id"            uuid,
  "fleet_type_id"        uuid,
  "fleet_code"           character varying(50)       NOT NULL,
  "plate_number"         character varying(20)       NOT NULL,
  "brand"                character varying(100),
  "model"                character varying(100),
  "year"                 integer,
  "stnk_number"          character varying(50),
  "stnk_expiry"          date                        NOT NULL,
  "kir_expiry"           date                        NOT NULL,
  "status"               character varying(20)       DEFAULT 'available'::character varying,
  "is_active"            boolean                     DEFAULT true,
  "created_by"           uuid,
  "created_at"           timestamp without time zone DEFAULT now(),
  "updated_at"           timestamp without time zone DEFAULT now(),
  "tenant_id"            uuid,
  "engine_number"        character varying(255),
  "chassis_number"       character varying(255),
  "color"                character varying(100),
  "last_inspection_date" date,
  "easygo_vehicle_id"    character varying(100),
  "easygo_nopol"         character varying(100),
  "vendor_tenant_id"     uuid,
  CONSTRAINT "md_fleets_fleet_code_key" UNIQUE (fleet_code),
  CONSTRAINT "md_fleets_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.driver_attendance
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/driver_attendance.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."driver_attendance" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "driver_id"       uuid,
  "fleet_id"        uuid,
  "attendance_type" character varying(20),
  "latitude"        numeric(10,8),
  "longitude"       numeric(11,8),
  "check_in"        timestamp with time zone DEFAULT now(),
  "created_at"      timestamp with time zone DEFAULT now(),
  "tenant_id"       uuid,
  "status"          text                     DEFAULT 'CHECK_IN'::text,
  "check_out"       timestamp with time zone,
  CONSTRAINT "driver_attendance_attendance_type_check" CHECK (((attendance_type)::text = ANY ((ARRAY['start_shift'::character varying, 'end_shift'::character varying])::text[]))),
  CONSTRAINT "driver_attendance_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.fleet_gps_status
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fleet_gps_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fleet_gps_status" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "fleet_id"       uuid                     NOT NULL,
  "tenant_id"      uuid                     NOT NULL,
  "latitude"       double precision,
  "longitude"      double precision,
  "speed"          double precision         DEFAULT 0,
  "heading"        double precision         DEFAULT 0,
  "address"        text,
  "gps_time"       timestamp with time zone,
  "status_vehicle" integer                  DEFAULT 0,
  "engine_on"      boolean                  DEFAULT false,
  "fuel_level"     double precision,
  "odometer"       double precision,
  "provider"       character varying(50)    DEFAULT 'easygo'::character varying,
  "raw_json"       jsonb,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "fleet_gps_status_fleet_id_key" UNIQUE (fleet_id),
  CONSTRAINT "fleet_gps_status_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.fleet_inspections
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fleet_inspections.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fleet_inspections" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "driver_id"           uuid                     NOT NULL,
  "fleet_id"            uuid                     NOT NULL,
  "odometer_photo_url"  text,
  "odometer_value"      numeric(12,2),
  "condition_photo_url" text,
  "rem_ok"              boolean                  NOT NULL DEFAULT false,
  "rem_notes"           text,
  "lampu_ok"            boolean                  NOT NULL DEFAULT false,
  "lampu_notes"         text,
  "ban_ok"              boolean                  NOT NULL DEFAULT false,
  "ban_notes"           text,
  "wiper_ok"            boolean                  NOT NULL DEFAULT false,
  "wiper_notes"         text,
  "kemudi_ok"           boolean                  NOT NULL DEFAULT false,
  "kemudi_notes"        text,
  "total_score"         numeric(3,0)             NOT NULL DEFAULT 0,
  "status"              text                     NOT NULL DEFAULT 'GROUNDED'::text,
  "notes"               text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "tenant_id"           uuid,
  "is_resolved"         boolean                  DEFAULT false,
  "resolved_at"         timestamp with time zone,
  "resolved_notes"      text,
  "resolved_by"         uuid,
  CONSTRAINT "fleet_inspections_pkey" PRIMARY KEY (id),
  CONSTRAINT "fleet_inspections_status_check" CHECK ((status = ANY (ARRAY['LAYAK JALAN'::text, 'GROUNDED'::text])))

);

-- ============================================================================
-- Object:        public.md_locations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_locations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_locations" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid,
  "location_code" character varying(50)    NOT NULL,
  "name"          character varying(255)   NOT NULL,
  "address"       text                     NOT NULL,
  "address_notes" text,
  "city"          character varying(100),
  "province"      character varying(100),
  "postal_code"   character varying(20),
  "country"       character varying(100)   DEFAULT 'Indonesia'::character varying,
  "latitude"      numeric(10,8),
  "longitude"     numeric(11,8),
  "is_active"     boolean                  DEFAULT true,
  "created_at"    timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "updated_at"    timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "md_locations_location_code_key" UNIQUE (location_code),
  CONSTRAINT "md_locations_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.commercial_service_scopes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."commercial_service_scopes" (


  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            uuid                     NOT NULL,
  "scope_code"           text                     NOT NULL,
  "scope_name"           text                     NOT NULL,
  "incoterm_named_place" text,
  "origin_scope_node_id" uuid,
  "dest_scope_node_id"   uuid,
  "included_services"    text[]                   NOT NULL DEFAULT '{}'::text[],
  "excluded_services"    text[]                   NOT NULL DEFAULT '{}'::text[],
  "billing_currency"     text                     NOT NULL DEFAULT 'IDR'::text,
  "is_active"            boolean                  NOT NULL DEFAULT true,
  "version_no"           integer                  NOT NULL DEFAULT 1,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"           uuid,
  "updated_by"           uuid,
  "incoterm" public.com_incoterm_type NOT NULL DEFAULT 'DAP'::public.com_incoterm_type,
  CONSTRAINT "commercial_service_scopes_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_com_scope_code" UNIQUE (tenant_id, scope_code)


);

-- ============================================================================
-- Object:        public.commercial_work_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."commercial_work_orders" (


  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               uuid                     NOT NULL,
  "wo_number"               text                     NOT NULL,
  "customer_id"             uuid                     NOT NULL,
  "service_scope_id"        uuid                     NOT NULL,
  "contract_reference"      text,
  "order_date"              date                     NOT NULL DEFAULT CURRENT_DATE,
  "target_fulfillment_date" date,
  "currency"                text                     NOT NULL DEFAULT 'IDR'::text,
  "total_agreed_revenue"    numeric(18,2)            NOT NULL DEFAULT 0,
  "payment_terms_days"      integer                  NOT NULL DEFAULT 30,
  "commercial_notes"        text,
  "version_no"              integer                  NOT NULL DEFAULT 1,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"              uuid,
  "updated_by"              uuid,
  "status" public.com_work_order_status NOT NULL DEFAULT 'DRAFT'::public.com_work_order_status,
  CONSTRAINT "commercial_work_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_com_wo_number" UNIQUE (tenant_id, wo_number)


);

-- ============================================================================
-- Object:        public.commercial_capability_bindings
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."commercial_capability_bindings" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "work_order_id"   uuid                     NOT NULL,
  "capability_type" text                     NOT NULL,
  "status"          text                     NOT NULL DEFAULT 'ACTIVE'::text,
  "scope"           jsonb                    DEFAULT '{}'::jsonb,
  "pricing"         jsonb                    DEFAULT '{}'::jsonb,
  "currency"        text                     NOT NULL DEFAULT 'IDR'::text,
  "activated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at"    timestamp with time zone,
  "deactivated_at"  timestamp with time zone,
  "metadata"        jsonb                    DEFAULT '{}'::jsonb,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"      uuid,
  CONSTRAINT "commercial_capability_bindings_capability_type_check"
    CHECK ((capability_type = ANY (ARRAY['CUSTOMS'::text, 'FORWARDING'::text, 'TRUCKING'::text, 'WAREHOUSE'::text]))),
  CONSTRAINT "commercial_capability_bindings_pkey" PRIMARY KEY (id),
  CONSTRAINT "commercial_capability_bindings_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'COMPLETED'::text, 'CANCELLED'::text]))),
  CONSTRAINT "uq_com_capability_binding" UNIQUE (tenant_id, work_order_id, capability_type)

);

-- ============================================================================
-- Object:        public.commercial_line_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/commercial_line_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."commercial_line_items" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           uuid                     NOT NULL,
  "work_order_id"       uuid                     NOT NULL,
  "line_sequence"       integer                  NOT NULL DEFAULT 1,
  "service_product_sku" text                     NOT NULL,
  "service_description" text                     NOT NULL,
  "quantity"            numeric(15,3)            NOT NULL DEFAULT 1,
  "unit_of_measure"     text                     NOT NULL DEFAULT 'UNIT'::text,
  "unit_sell_price"     numeric(18,2)            NOT NULL DEFAULT 0,
  "total_sell_price"    numeric(18,2)            NOT NULL DEFAULT 0,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "commercial_line_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_com_wo_line_seq" UNIQUE (work_order_id, line_sequence)

);

-- ============================================================================
-- Object:        public.md_product_categories
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_product_categories" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   uuid,
  "parent_id"   uuid,
  "name"        text                     NOT NULL,
  "code"        text,
  "description" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "md_product_categories_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_product_skus
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_product_skus" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid                     NOT NULL,
  "sku_code"              text                     NOT NULL,
  "name"                  text                     NOT NULL,
  "description"           text,
  "category"              text,
  "unit"                  text                     NOT NULL DEFAULT 'PCS'::text,
  "weight_kg"             numeric(12,4),
  "length_cm"             numeric(12,2),
  "width_cm"              numeric(12,2),
  "height_cm"             numeric(12,2),
  "volume_m3"             numeric(12,4),
  "storage_rule"          text                     DEFAULT 'FIFO'::text,
  "is_hazardous"          boolean                  NOT NULL DEFAULT false,
  "requires_cold_storage" boolean                  NOT NULL DEFAULT false,
  "min_stock_level"       numeric(12,2)            DEFAULT 0,
  "max_stock_level"       numeric(12,2),
  "is_active"             boolean                  NOT NULL DEFAULT true,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"            uuid,
  "parent_sku_id"         uuid,
  "sku_level"             text,
  "commodity_type"        text,
  "conversion_to_base"    numeric(12,4)            DEFAULT 1,
  "is_sellable"           boolean                  NOT NULL DEFAULT true,
  "is_stockable"          boolean                  NOT NULL DEFAULT true,
  "dimension_cm"          text,
  "stack_limit"           integer,
  "customer_id"           uuid,
  "upc_code"              text,
  "ean_code"              text,
  "hs_code"               text,
  "brand_name"            text,
  "manufacturer"          text,
  "image_urls"            jsonb                    DEFAULT '[]'::jsonb,
  "handling_rules"        jsonb                    DEFAULT
    '{"is_fragile": false, "requires_qc": false, "temperature_max": null, "temperature_min": null, "print_barcode_on_inbound": false}'::jsonb,
  "base_uom"              text                     DEFAULT 'PCS'::text,
  "default_inbound_uom"   text,
  "default_outbound_uom"  text,
  "uom_conversions"       jsonb                    DEFAULT '[]'::jsonb,
  "reorder_point"         numeric(12,2)            DEFAULT 0,
  "lead_time_days"        integer                  DEFAULT 0,
  "category_id"           uuid,
  "dynamic_attributes"    jsonb                    DEFAULT '{}'::jsonb,
  CONSTRAINT "md_product_skus_commodity_type_check"
    CHECK ((commodity_type = ANY (ARRAY['FROZEN'::text, 'CHILL'::text, 'DRY'::text, 'HAZMAT'::text, 'FRAGILE'::text, 'PHARMA'::text]))),
  CONSTRAINT "md_product_skus_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_product_skus_sku_level_check" CHECK ((sku_level = ANY (ARRAY['BASE_UNIT'::text, 'INNER_PACK'::text, 'MASTER_CASE'::text, 'PALLET'::text]))),
  CONSTRAINT "md_product_skus_storage_rule_check" CHECK ((storage_rule = ANY (ARRAY['FIFO'::text, 'FEFO'::text, 'LIFO'::text, 'LEFO'::text, 'NONE'::text])))

);

-- ============================================================================
-- Object:        public.md_bill_of_materials
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_bill_of_materials.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_bill_of_materials" (

  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid                     NOT NULL,
  "kit_sku_id" uuid                     NOT NULL,
  "bom_number" text                     NOT NULL,
  "name"       text,
  "notes"      text,
  "is_active"  boolean                  DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  CONSTRAINT "md_bill_of_materials_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_bom_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_bom_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_bom_items" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "bom_id"            uuid                     NOT NULL,
  "component_sku_id"  uuid                     NOT NULL,
  "quantity_required" numeric(15,2)            NOT NULL,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "md_bom_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_transporters
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_transporters.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_transporters" (

  "id"                  uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "contact_id"          uuid,
  "transporter_type"    character varying(20),
  "vendor_contract_no"  character varying(100),
  "contract_start_date" date,
  "contract_end_date"   date,
  "payment_terms"       character varying(50),
  "is_active"           boolean                     DEFAULT true,
  "created_at"          timestamp without time zone DEFAULT now(),
  "updated_at"          timestamp without time zone DEFAULT now(),
  "transporter_name"    character varying(255),
  CONSTRAINT "md_transporters_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_transporters_transporter_type_check" CHECK (((transporter_type)::text = ANY ((ARRAY['OWN'::character varying, 'VENDOR'::character varying])::text[])))

);

-- ============================================================================
-- Object:        public.md_transporter_drivers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_transporter_drivers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_transporter_drivers" (

  "id"             uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "transporter_id" uuid,
  "driver_id"      uuid,
  "assigned_at"    timestamp without time zone DEFAULT now(),
  CONSTRAINT "md_transporter_drivers_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_transporter_drivers_transporter_id_driver_id_key" UNIQUE (transporter_id, driver_id)

);

-- ============================================================================
-- Object:        public.md_transporter_fleets
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_transporter_fleets.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_transporter_fleets" (

  "id"             uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "transporter_id" uuid,
  "fleet_id"       uuid,
  "assigned_at"    timestamp without time zone DEFAULT now(),
  CONSTRAINT "md_transporter_fleets_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_transporter_fleets_transporter_id_fleet_id_key" UNIQUE (transporter_id, fleet_id)

);

-- ============================================================================
-- Object:        public.md_uoms
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_uoms.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_uoms" (

  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "tenant_id"   uuid,
  "name"        text                     NOT NULL,
  "description" text,
  "is_active"   boolean                  DEFAULT true,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "md_uoms_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.party_contacts
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."party_contacts" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    uuid                     NOT NULL,
  "party_id"     uuid                     NOT NULL,
  "contact_name" text                     NOT NULL,
  "contact_role" text,
  "department"   text,
  "title"        text,
  "email"        text,
  "phone"        text,
  "mobile"       text,
  "whatsapp"     text,
  "is_primary"   boolean                  NOT NULL DEFAULT false,
  "is_active"    boolean                  NOT NULL DEFAULT true,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid,
  CONSTRAINT "party_contacts_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_party_contact_primary" UNIQUE (tenant_id, party_id, contact_role, is_primary)

);

-- ============================================================================
-- Object:        public.party_locations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."party_locations" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "party_id"          uuid                     NOT NULL,
  "location_id"       uuid                     NOT NULL,
  "relationship_type" text                     NOT NULL,
  "is_primary"        boolean                  NOT NULL DEFAULT false,
  "effective_from"    date,
  "effective_to"      date,
  "is_active"         boolean                  NOT NULL DEFAULT true,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"        uuid,
  CONSTRAINT "party_locations_pkey" PRIMARY KEY (id),
  CONSTRAINT "party_locations_relationship_type_check" CHECK ((relationship_type = ANY (ARRAY['OWNS'::text, 'OPERATES'::text, 'MANAGES'::text, 'USES'::text, 'LOCATED_AT'::text]))),
  CONSTRAINT "uq_party_location" UNIQUE (tenant_id, party_id, location_id, relationship_type)

);

-- ============================================================================
-- Object:        public.party_relationships
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."party_relationships" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "from_party_id"     uuid                     NOT NULL,
  "to_party_id"       uuid                     NOT NULL,
  "relationship_type" text                     NOT NULL,
  "effective_from"    date,
  "effective_to"      date,
  "is_active"         boolean                  NOT NULL DEFAULT true,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"        uuid,
  CONSTRAINT "chk_party_relationship_different" CHECK ((from_party_id <> to_party_id)),
  CONSTRAINT "party_relationships_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_party_relationship" UNIQUE (tenant_id, from_party_id, to_party_id, relationship_type)

);

-- ============================================================================
-- Object:        public.party_roles
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."party_roles" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid                     NOT NULL,
  "party_id"       uuid                     NOT NULL,
  "role_type"      text                     NOT NULL,
  "context_type"   text                     NOT NULL DEFAULT 'GLOBAL'::text,
  "context_id"     uuid,
  "is_primary"     boolean                  NOT NULL DEFAULT false,
  "effective_from" date,
  "effective_to"   date,
  "is_active"      boolean                  NOT NULL DEFAULT true,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"     uuid,
  CONSTRAINT "party_roles_context_type_check" CHECK ((context_type = ANY (ARRAY['GLOBAL'::text, 'ENGAGEMENT'::text, 'ORDER'::text, 'CONTRACT'::text]))),
  CONSTRAINT "party_roles_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_party_role" UNIQUE (tenant_id, party_id, role_type, context_type, context_id)

);

-- ============================================================================
-- Object:        public.product_brands
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/product_brands.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."product_brands" (

  "id"         uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid,
  "name"       text                        NOT NULL,
  "logo_url"   text,
  "created_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "product_brands_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_brands_tenant_id_name_key" UNIQUE (tenant_id, name)

);

-- ============================================================================
-- Object:        public.product_categories
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/product_categories.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."product_categories" (

  "id"          uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"   uuid,
  "parent_id"   uuid,
  "name"        text                        NOT NULL,
  "description" text,
  "created_at"  timestamp without time zone DEFAULT now(),
  CONSTRAINT "product_categories_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_categories_tenant_id_parent_id_name_key" UNIQUE (tenant_id, parent_id, name)

);

-- ============================================================================
-- Object:        public.reset_password_requests
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/reset_password_requests.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."reset_password_requests" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    uuid,
  "tenant_code"  character varying(50),
  "tenant_name"  text,
  "admin_email"  character varying(255),
  "status"       character varying(20)    DEFAULT 'pending'::character varying,
  "requested_at" timestamp with time zone DEFAULT now(),
  "processed_by" uuid,
  "processed_at" timestamp with time zone,
  "notes"        text,
  CONSTRAINT "reset_password_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "reset_password_requests_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying])::text[])))

);

-- ============================================================================
-- Object:        public.sales_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."sales_orders" (


  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               uuid                     NOT NULL,
  "engagement_id"           uuid                     NOT NULL,
  "quote_id"                uuid,
  "so_number"               text                     NOT NULL,
  "idempotency_key"         uuid,
  "order_date"              date                     NOT NULL DEFAULT CURRENT_DATE,
  "target_fulfillment_date" date,
  "currency"                text                     NOT NULL DEFAULT 'IDR'::text,
  "total_agreed_revenue"    numeric(18,2)            NOT NULL DEFAULT 0,
  "payment_terms_days"      integer                  NOT NULL DEFAULT 30,
  "incoterm"                text,
  "commercial_notes"        text,
  "version_no"              integer                  NOT NULL DEFAULT 1,
  "confirmed_at"            timestamp with time zone,
  "cancelled_at"            timestamp with time zone,
  "cancelled_reason"        text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"              uuid,
  "updated_by"              uuid,
  "status" public.com_sales_order_status NOT NULL DEFAULT 'DRAFT'::public.com_sales_order_status,
  CONSTRAINT "sales_order_payment_terms_nonneg" CHECK ((payment_terms_days >= 0)),
  CONSTRAINT "sales_order_revenue_nonneg" CHECK ((total_agreed_revenue >= (0)::numeric)),
  CONSTRAINT "sales_order_version_positive" CHECK ((version_no >= 1)),
  CONSTRAINT "sales_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_sales_order_idempotency" UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT "uq_sales_order_number" UNIQUE (tenant_id, so_number)


);

-- ============================================================================
-- Object:        public.fin_invoices
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_invoices" (


  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          uuid                     NOT NULL,
  "invoice_number"     text                     NOT NULL,
  "sales_order_id"     uuid,
  "customer_id"        uuid,
  "status"             text                     NOT NULL DEFAULT 'DRAFT'::text,
  "invoice_date"       date                     NOT NULL DEFAULT CURRENT_DATE,
  "due_date"           date,
  "currency"           text                     NOT NULL DEFAULT 'IDR'::text,
  "subtotal"           numeric(18,2)            NOT NULL DEFAULT 0,
  "tax_amount"         numeric(18,2)            NOT NULL DEFAULT 0,
  "tax_percentage"     numeric(5,2)             NOT NULL DEFAULT 0,
  "total_amount"       numeric(18,2)            NOT NULL DEFAULT 0,
  "paid_amount"        numeric(18,2)            NOT NULL DEFAULT 0,
  "external_reference" text,
  "idempotency_key"    text,
  "sent_at"            timestamp with time zone,
  "paid_at"            timestamp with time zone,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"         uuid,
  "updated_by"         uuid,
  "side" public.com_fin_ar_ap_side NOT NULL DEFAULT 'AR'::public.com_fin_ar_ap_side,
  CONSTRAINT "fin_invoices_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_fin_invoice_idempotency" UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT "uq_fin_invoice_number" UNIQUE (tenant_id, invoice_number)


);

-- ============================================================================
-- Object:        public.fin_ar_ap
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_ar_ap" (


  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          uuid                     NOT NULL,
  "invoice_id"         uuid                     NOT NULL,
  "customer_id"        uuid,
  "supplier_id"        uuid,
  "currency"           text                     NOT NULL,
  "total_amount"       numeric(18,2)            NOT NULL DEFAULT 0,
  "paid_amount"        numeric(18,2)            NOT NULL DEFAULT 0,
  "balance_amount"     numeric(18,2)            NOT NULL DEFAULT 0,
  "due_date"           date,
  "external_reference" text,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"         uuid,
  "updated_by"         uuid,
  "side" public.com_fin_ar_ap_side NOT NULL,
  "status" public.com_fin_ar_ap_status NOT NULL DEFAULT 'PENDING'::public.com_fin_ar_ap_status,
  CONSTRAINT "fin_ar_ap_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.fin_adjustments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_adjustments" (


  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid                     NOT NULL,
  "invoice_id" uuid,
  "ar_ap_id"   uuid,
  "amount"     numeric(18,2)            NOT NULL,
  "currency"   text                     NOT NULL,
  "reason"     text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  "adjustment_type" public.com_fin_adjustment_type NOT NULL,
  CONSTRAINT "fin_adjustments_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.fin_payment_allocations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_payment_allocations" (


  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    uuid                     NOT NULL,
  "payment_id"   uuid                     NOT NULL,
  "invoice_id"   uuid                     NOT NULL,
  "amount"       numeric(18,4)            NOT NULL DEFAULT 0,
  "currency"     text                     NOT NULL,
  "allocated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid,
  "updated_by"   uuid,
  "status" public.com_allocation_status NOT NULL DEFAULT 'PENDING'::public.com_allocation_status,
  CONSTRAINT "fin_payment_allocations_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_fin_payment_allocation" UNIQUE (tenant_id, payment_id, invoice_id)


);

-- ============================================================================
-- Object:        public.fin_settlements
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_settlements" (


  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "allocation_id" uuid                     NOT NULL,
  "settled_at"    timestamp with time zone,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"    uuid,
  "updated_by"    uuid,
  "status" public.com_settlement_status NOT NULL DEFAULT 'OPEN'::public.com_settlement_status,
  CONSTRAINT "fin_settlements_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.sales_order_line_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."sales_order_line_items" (


  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            uuid                     NOT NULL,
  "sales_order_id"       uuid                     NOT NULL,
  "line_sequence"        integer                  NOT NULL,
  "source_quote_item_id" uuid,
  "capability_type"      text                     NOT NULL,
  "side"                 text                     NOT NULL DEFAULT 'SELL'::text,
  "service_description"  text                     NOT NULL,
  "quantity"             numeric(18,3)            NOT NULL DEFAULT 0,
  "unit_of_measure"      text                     NOT NULL,
  "currency"             text                     NOT NULL,
  "unit_rate"            numeric(18,4)            NOT NULL DEFAULT 0,
  "line_total"           numeric(18,2)            NOT NULL DEFAULT 0,
  "price_snapshot"       jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "version_no"           integer                  NOT NULL DEFAULT 1,
  "superseded_by"        uuid,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"           uuid,
  "updated_by"           uuid,
  "status" public.com_sales_order_line_status NOT NULL DEFAULT 'DRAFT'::public.com_sales_order_line_status,
  CONSTRAINT "chk_so_line_positive_qty" CHECK ((quantity >= (0)::numeric)),
  CONSTRAINT "chk_so_line_positive_rate" CHECK ((unit_rate >= (0)::numeric)),
  CONSTRAINT "chk_so_line_positive_total" CHECK ((line_total >= (0)::numeric)),
  CONSTRAINT "sales_order_line_items_capability_type_check" CHECK ((capability_type = ANY (ARRAY['FORWARDING'::text, 'CUSTOMS'::text, 'TRUCKING'::text, 'WAREHOUSE'::text]))),
  CONSTRAINT "sales_order_line_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "sales_order_line_items_side_check" CHECK ((side = ANY (ARRAY['SELL'::text, 'BUY'::text]))),
  CONSTRAINT "uq_so_line_item_source" UNIQUE (sales_order_id, source_quote_item_id),
  CONSTRAINT "uq_so_line_sequence" UNIQUE (sales_order_id, line_sequence, version_no)


);

-- ============================================================================
-- Object:        public.fin_billable_events
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_billable_events" (


  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            uuid                     NOT NULL,
  "sales_order_id"       uuid                     NOT NULL,
  "so_line_item_id"      uuid,
  "source_quote_item_id" uuid,
  "capability_type"      text                     NOT NULL,
  "side"                 text                     NOT NULL DEFAULT 'SELL'::text,
  "event_type"           text                     NOT NULL DEFAULT 'FULFILLMENT_MILESTONE'::text,
  "description"          text                     NOT NULL,
  "quantity"             numeric(18,3)            NOT NULL DEFAULT 0,
  "unit_of_measure"      text                     NOT NULL,
  "currency"             text                     NOT NULL,
  "unit_amount"          numeric(18,4)            NOT NULL DEFAULT 0,
  "total_amount"         numeric(18,2)            NOT NULL DEFAULT 0,
  "price_snapshot_id"    uuid,
  "idempotency_key"      text,
  "event_timestamp"      timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"           uuid,
  "updated_by"           uuid,
  "status" public.com_fin_billable_event_status NOT NULL DEFAULT 'PENDING'::public.com_fin_billable_event_status,
  CONSTRAINT "fin_billable_events_capability_type_check" CHECK ((capability_type = ANY (ARRAY['FORWARDING'::text, 'CUSTOMS'::text, 'TRUCKING'::text, 'WAREHOUSE'::text]))),
  CONSTRAINT "fin_billable_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "fin_billable_events_side_check" CHECK ((side = ANY (ARRAY['SELL'::text, 'BUY'::text]))),
  CONSTRAINT "uq_billable_event_idempotency" UNIQUE (tenant_id, idempotency_key)


);

-- ============================================================================
-- Object:        public.fin_invoice_lines
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_invoice_lines" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "invoice_id"        uuid                     NOT NULL,
  "billable_event_id" uuid,
  "so_line_item_id"   uuid,
  "description"       text                     NOT NULL,
  "quantity"          numeric(18,3)            NOT NULL DEFAULT 0,
  "unit_of_measure"   text                     NOT NULL,
  "unit_amount"       numeric(18,4)            NOT NULL DEFAULT 0,
  "amount"            numeric(18,2)            NOT NULL DEFAULT 0,
  "sort_order"        integer                  NOT NULL DEFAULT 0,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"        uuid,
  "updated_by"        uuid,
  CONSTRAINT "fin_invoice_lines_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.shp_shipments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_shipments" (


  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               uuid                     NOT NULL,
  "shipment_number"         text                     NOT NULL,
  "work_order_id"           uuid                     NOT NULL,
  "service_scope_id"        uuid                     NOT NULL,
  "customer_id"             uuid                     NOT NULL,
  "shipper_id"              uuid,
  "consignee_id"            uuid,
  "notify_party_id"         uuid,
  "origin_location_id"      uuid                     NOT NULL,
  "destination_location_id" uuid                     NOT NULL,
  "tracking_token"          text                     NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text),
  "master_bl_number"        text,
  "house_bl_number"         text,
  "booking_reference"       text,
  "etd"                     timestamp with time zone,
  "eta"                     timestamp with time zone,
  "actual_departure_at"     timestamp with time zone,
  "actual_delivery_at"      timestamp with time zone,
  "version_no"              integer                  NOT NULL DEFAULT 1,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"              uuid,
  "updated_by"              uuid,
  "sales_order_id"          uuid,
  "global_status" public.shp_global_status NOT NULL DEFAULT 'DRAFT'::public.shp_global_status,
  CONSTRAINT "shp_shipments_pkey" PRIMARY KEY (id),
  CONSTRAINT "shp_shipments_tracking_token_key" UNIQUE (tracking_token),
  CONSTRAINT "uq_shp_number" UNIQUE (tenant_id, shipment_number)


);

-- ============================================================================
-- Object:        public.shp_execution_plans
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_execution_plans.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_execution_plans" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    uuid                     NOT NULL,
  "shipment_id"  uuid                     NOT NULL,
  "plan_version" integer                  NOT NULL DEFAULT 1,
  "total_legs"   integer                  NOT NULL DEFAULT 1,
  "is_active"    boolean                  NOT NULL DEFAULT true,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shp_execution_plans_pkey" PRIMARY KEY (id),
  CONSTRAINT "shp_execution_plans_shipment_id_key" UNIQUE (shipment_id)

);

-- ============================================================================
-- Object:        public.shp_execution_legs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_execution_legs" (


  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               uuid                     NOT NULL,
  "shipment_id"             uuid                     NOT NULL,
  "execution_plan_id"       uuid                     NOT NULL,
  "leg_sequence"            integer                  NOT NULL,
  "leg_code"                text                     NOT NULL,
  "origin_location_id"      uuid                     NOT NULL,
  "destination_location_id" uuid                     NOT NULL,
  "assigned_vendor_id"      uuid,
  "planned_start_at"        timestamp with time zone,
  "planned_end_at"          timestamp with time zone,
  "actual_start_at"         timestamp with time zone,
  "actual_end_at"           timestamp with time zone,
  "status"                  text                     NOT NULL DEFAULT 'PLANNED'::text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "execution_provider_type" public.shp_execution_provider_type NOT NULL DEFAULT 'INTERNAL_SBU'::public.shp_execution_provider_type,
  "transport_mode" public.shp_transport_mode NOT NULL,
  CONSTRAINT "shp_execution_legs_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_shp_leg_seq" UNIQUE (execution_plan_id, leg_sequence)


);

-- ============================================================================
-- Object:        public.shp_exceptions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_exceptions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_exceptions" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "shipment_id"      uuid                     NOT NULL,
  "execution_leg_id" uuid,
  "exception_type"   text                     NOT NULL,
  "severity"         text                     NOT NULL DEFAULT 'MEDIUM'::text,
  "description"      text                     NOT NULL,
  "is_resolved"      boolean                  DEFAULT false,
  "resolved_at"      timestamp with time zone,
  "resolved_by"      uuid,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shp_exceptions_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.shp_manifest_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_manifest_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_manifest_items" (

  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"              uuid                     NOT NULL,
  "shipment_id"            uuid                     NOT NULL,
  "item_sequence"          integer                  NOT NULL DEFAULT 1,
  "commodity_name"         text                     NOT NULL,
  "hs_code"                text,
  "package_quantity"       integer                  NOT NULL DEFAULT 1,
  "package_type"           text                     NOT NULL DEFAULT 'COLLI'::text,
  "gross_weight_kg"        numeric(15,3)            NOT NULL,
  "volume_cbm"             numeric(15,4)            NOT NULL,
  "declared_customs_value" numeric(18,2),
  "declared_currency"      text                     DEFAULT 'IDR'::text,
  "is_dangerous_goods"     boolean                  DEFAULT false,
  "dg_un_number"           text,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shp_manifest_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_shp_manifest_item_seq" UNIQUE (shipment_id, item_sequence)

);

-- ============================================================================
-- Object:        public.shp_milestones
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_milestones" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "shipment_id"      uuid                     NOT NULL,
  "execution_leg_id" uuid,
  "milestone_code"   text                     NOT NULL,
  "milestone_label"  text                     NOT NULL,
  "occurred_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "location_id"      uuid,
  "recorded_by"      uuid,
  "metadata"         jsonb                    DEFAULT '{}'::jsonb,
  CONSTRAINT "shp_milestones_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.shp_units
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_units.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_units" (


  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid                     NOT NULL,
  "shipment_id"           uuid                     NOT NULL,
  "unit_identifier"       text                     NOT NULL,
  "total_gross_weight_kg" numeric(15,3)            NOT NULL,
  "total_volume_cbm"      numeric(15,4),
  "current_location_id"   uuid,
  "status"                text                     NOT NULL DEFAULT 'PLANNED'::text,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "unit_type" public.shp_unit_type NOT NULL,
  CONSTRAINT "shp_units_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.shp_leg_units
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_leg_units.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_leg_units" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "execution_leg_id" uuid                     NOT NULL,
  "unit_id"          uuid                     NOT NULL,
  "allocated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "shp_leg_units_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_shp_leg_unit" UNIQUE (execution_leg_id, unit_id)

);

-- ============================================================================
-- Object:        public.shp_unit_bulk
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_unit_bulk.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_unit_bulk" (

  "unit_id"                uuid          NOT NULL,
  "tenant_id"              uuid          NOT NULL,
  "bulk_type"              text          NOT NULL,
  "metric_tonnage"         numeric(15,3) NOT NULL,
  "moisture_percentage"    numeric(5,2),
  "surveyor_report_number" text,
  "surveyor_entity_id"     uuid,
  CONSTRAINT "shp_unit_bulk_pkey" PRIMARY KEY (unit_id)

);

-- ============================================================================
-- Object:        public.shp_unit_containers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_unit_containers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_unit_containers" (

  "unit_id"             uuid          NOT NULL,
  "tenant_id"           uuid          NOT NULL,
  "container_number"    text          NOT NULL,
  "iso_type"            text          NOT NULL DEFAULT '20GP'::text,
  "seal_number"         text,
  "tare_weight_kg"      numeric(15,3) DEFAULT 2200,
  "max_payload_kg"      numeric(15,3) DEFAULT 28000,
  "temperature_celsius" numeric(5,2),
  "is_soc"              boolean       DEFAULT false,
  CONSTRAINT "shp_unit_containers_pkey" PRIMARY KEY (unit_id)

);

-- ============================================================================
-- Object:        public.shp_unit_packages
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_unit_packages.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_unit_packages" (

  "unit_id"                  uuid          NOT NULL,
  "tenant_id"                uuid          NOT NULL,
  "parent_container_unit_id" uuid,
  "package_type"             text          NOT NULL,
  "colli_count"              integer       NOT NULL DEFAULT 1,
  "length_cm"                numeric(10,2),
  "width_cm"                 numeric(10,2),
  "height_cm"                numeric(10,2),
  "is_stackable"             boolean       DEFAULT true,
  CONSTRAINT "shp_unit_packages_pkey" PRIMARY KEY (unit_id)

);

-- ============================================================================
-- Object:        public.shp_unit_vehicles
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/shp_unit_vehicles.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."shp_unit_vehicles" (

  "unit_id"       uuid    NOT NULL,
  "tenant_id"     uuid    NOT NULL,
  "vin_number"    text    NOT NULL,
  "engine_number" text,
  "vehicle_model" text    NOT NULL,
  "color"         text,
  "is_drivable"   boolean DEFAULT true,
  CONSTRAINT "shp_unit_vehicles_pkey" PRIMARY KEY (unit_id)

);

-- ============================================================================
-- Object:        public.sla_daily_snapshots
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/sla_daily_snapshots.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."sla_daily_snapshots" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid                     NOT NULL,
  "snapshot_date"  date                     NOT NULL DEFAULT CURRENT_DATE,
  "sla_stage"      text                     NOT NULL,
  "total_count"    integer                  DEFAULT 0,
  "pass_count"     integer                  DEFAULT 0,
  "fail_count"     integer                  DEFAULT 0,
  "compliance_pct" numeric                  DEFAULT 0,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "sla_daily_snapshots_pkey" PRIMARY KEY (id),
  CONSTRAINT "sla_daily_snapshots_tenant_id_snapshot_date_sla_stage_key" UNIQUE (tenant_id, snapshot_date, sla_stage)

);

-- ============================================================================
-- Object:        public.svc_service_requests
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."svc_service_requests" (


  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"              uuid                     NOT NULL,
  "request_number"         text                     NOT NULL,
  "correlation_id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "causation_id"           uuid,
  "idempotency_key"        text                     NOT NULL,
  "source_domain"          text                     NOT NULL DEFAULT 'FORWARDING'::text,
  "target_domain"          text                     NOT NULL,
  "shipment_id"            uuid,
  "execution_leg_id"       uuid,
  "work_order_id"          uuid,
  "service_product_sku"    text                     NOT NULL,
  "request_payload"        jsonb                    NOT NULL,
  "sla_target_time"        timestamp with time zone,
  "assigned_domain_job_id" uuid,
  "rejection_reason"       text,
  "version_no"             integer                  NOT NULL DEFAULT 1,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "status" public.svc_request_status NOT NULL DEFAULT 'ISSUED'::public.svc_request_status,
  CONSTRAINT "svc_service_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_svc_idempotency" UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT "uq_svc_request_number" UNIQUE (tenant_id, request_number)


);

-- ============================================================================
-- Object:        public.cus_declarations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_declarations" (


  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           uuid                     NOT NULL,
  "declaration_number"  text                     NOT NULL,
  "service_request_id"  uuid,
  "work_order_id"       uuid,
  "importer_id"         uuid                     NOT NULL,
  "ppjk_id"             uuid,
  "customs_office_code" text                     NOT NULL,
  "billing_code"        text,
  "total_duty_and_tax"  numeric(18,2)            DEFAULT 0,
  "ntpn_payment_ref"    text,
  "paid_at"             timestamp with time zone,
  "sppb_number"         text,
  "sppb_date"           date,
  "status"              text                     NOT NULL DEFAULT 'DRAFT'::text,
  "version_no"          integer                  NOT NULL DEFAULT 1,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "shipment_id"         uuid,
  "execution_leg_id"    uuid,
  "job_order_id"        uuid,
  "channel" public.cus_channel_type,
  "declaration_type" public.cus_declaration_type NOT NULL DEFAULT 'PIB_IMPORT'::public.cus_declaration_type,
  CONSTRAINT "cus_declarations_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_cus_dec_number" UNIQUE (tenant_id, declaration_number)


);

-- ============================================================================
-- Object:        public.cus_ceisa_preparations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_ceisa_preparations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_ceisa_preparations" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid                     NOT NULL,
  "declaration_id"        uuid                     NOT NULL,
  "version_no"            integer                  NOT NULL DEFAULT 1,
  "message_type"          character varying(50)    NOT NULL DEFAULT 'PIB_BC20'::character varying,
  "schema_version"        character varying(50)    NOT NULL DEFAULT 'CEISA-4.0-XML-v1.0'::character varying,
  "status"                character varying(30)    NOT NULL DEFAULT 'DRAFT'::character varying,
  "artifact_format"       character varying(10)    NOT NULL DEFAULT 'XML'::character varying,
  "artifact_content"      text,
  "artifact_checksum"     character varying(64),
  "artifact_size_bytes"   integer,
  "item_count"            integer                  NOT NULL DEFAULT 0,
  "blocking_errors_count" integer                  NOT NULL DEFAULT 0,
  "warnings_count"        integer                  NOT NULL DEFAULT 0,
  "metadata"              jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "created_by"            uuid,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cus_ceisa_preparations_artifact_format_check"
    CHECK (((artifact_format)::text = ANY ((ARRAY['XML'::character varying, 'EDI'::character varying, 'JSON'::character varying])::text[]))),
  CONSTRAINT "cus_ceisa_preparations_pkey" PRIMARY KEY (id),
  CONSTRAINT "cus_ceisa_preparations_status_check"
    CHECK
    (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'VALIDATING'::character varying, 'INVALID'::character varying, 'READY_FOR_REVIEW'::character varying,
    'READY_TO_TRANSMIT'::character varying, 'SUPERSEDED'::character varying])::text[])))

);

-- ============================================================================
-- Object:        public.cus_ceisa_validation_results
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_ceisa_validation_results.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_ceisa_validation_results" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "preparation_id"  uuid                     NOT NULL,
  "layer"           character varying(20)    NOT NULL,
  "rule_code"       character varying(50)    NOT NULL,
  "severity"        character varying(20)    NOT NULL,
  "field_path"      text                     NOT NULL,
  "message"         text                     NOT NULL,
  "expected_value"  text,
  "actual_value"    text,
  "resolution_hint" text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cus_ceisa_validation_results_layer_check"
    CHECK (((layer)::text = ANY ((ARRAY['DOMAIN'::character varying, 'SCHEMA'::character varying, 'BUSINESS_RULE'::character varying])::text[]))),
  CONSTRAINT "cus_ceisa_validation_results_pkey" PRIMARY KEY (id),
  CONSTRAINT "cus_ceisa_validation_results_severity_check"
    CHECK (((severity)::text = ANY ((ARRAY['BLOCKING'::character varying, 'WARNING'::character varying, 'INFO'::character varying])::text[])))

);

-- ============================================================================
-- Object:        public.cus_classification_lines
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_classification_lines.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_classification_lines" (

  "id"                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                 uuid                     NOT NULL,
  "declaration_id"            uuid                     NOT NULL,
  "item_sequence"             integer                  NOT NULL DEFAULT 1,
  "hs_code"                   text                     NOT NULL,
  "goods_description"         text                     NOT NULL,
  "cif_value_usd"             numeric(18,2)            NOT NULL,
  "bm_rate_percent"           numeric(5,2)             NOT NULL DEFAULT 0,
  "ppn_rate_percent"          numeric(5,2)             NOT NULL DEFAULT 11,
  "pph_rate_percent"          numeric(5,2)             NOT NULL DEFAULT 2.5,
  "calculated_bm_idr"         numeric(18,2)            NOT NULL DEFAULT 0,
  "calculated_ppn_idr"        numeric(18,2)            NOT NULL DEFAULT 0,
  "calculated_pph_idr"        numeric(18,2)            NOT NULL DEFAULT 0,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "sku_code"                  text,
  "brand"                     text,
  "model"                     text,
  "item_quantity"             numeric(14,4)            NOT NULL DEFAULT 1,
  "uom_code"                  character varying(10)    NOT NULL DEFAULT 'PCE'::character varying,
  "unit_price_usd"            numeric(14,4)            NOT NULL DEFAULT 0,
  "fob_value_usd"             numeric(14,2)            DEFAULT 0,
  "freight_usd"               numeric(14,2)            DEFAULT 0,
  "insurance_usd"             numeric(14,2)            DEFAULT 0,
  "currency"                  character varying(5)     NOT NULL DEFAULT 'USD'::character varying,
  "country_of_origin"         character varying(2)     NOT NULL DEFAULT 'CN'::character varying,
  "manufacturer_name"         text,
  "supplier_name"             text,
  "invoice_number"            text,
  "invoice_line_no"           integer,
  "hs_master_id"              uuid,
  "hs_code_snapshot"          character varying(12),
  "hs_description_snapshot"   text,
  "bm_rate_snapshot"          numeric(5,2),
  "ppn_rate_snapshot"         numeric(5,2),
  "pph_rate_snapshot"         numeric(5,2),
  "classification_confidence" numeric(3,2)             DEFAULT 1.00,
  "classification_source"     character varying(30)    DEFAULT 'MANUAL'::character varying,
  "classification_rationale"  text,
  "validation_status"         character varying(20)    NOT NULL DEFAULT 'VALID'::character varying,
  "validation_error_count"    integer                  NOT NULL DEFAULT 0,
  "validation_warning_count"  integer                  NOT NULL DEFAULT 0,
  "validation_errors"         jsonb                    DEFAULT '[]'::jsonb,
  "price_anomaly_flag"        boolean                  NOT NULL DEFAULT false,
  "lartas_flag"               boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "cus_classification_lines_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_cus_class_seq" UNIQUE (declaration_id, item_sequence)

);

-- ============================================================================
-- Object:        public.cus_declaration_audit_events
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_declaration_audit_events.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_declaration_audit_events" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           uuid                     NOT NULL,
  "declaration_id"      uuid                     NOT NULL,
  "sequence_no"         bigint                   NOT NULL,
  "event_type"          text                     NOT NULL,
  "event_category"      text                     NOT NULL,
  "actor_type"          text                     NOT NULL DEFAULT 'USER'::text,
  "actor_id"            uuid,
  "actor_name"          text,
  "actor_role"          text,
  "summary"             text                     NOT NULL,
  "diff"                jsonb,
  "entity_type"         text,
  "entity_id"           text,
  "evidence_references" jsonb,
  "regulatory_basis"    jsonb,
  "event_hash"          text                     NOT NULL,
  "previous_event_hash" text,
  "idempotency_key"     text,
  "metadata"            jsonb,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cus_declaration_audit_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_cus_audit_dec_seq" UNIQUE (declaration_id, sequence_no),
  CONSTRAINT "uq_cus_audit_idempotency" UNIQUE (declaration_id, idempotency_key)

);

-- ============================================================================
-- Object:        public.cus_declaration_documents
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_declaration_documents" (

  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"              uuid                     NOT NULL,
  "declaration_id"         uuid                     NOT NULL,
  "document_type"          text                     NOT NULL,
  "document_number"        text,
  "issue_date"             date,
  "file_reference"         text,
  "file_name"              text,
  "mime_type"              text,
  "file_size_bytes"        bigint,
  "extracted_items_count"  integer                  DEFAULT 0,
  "verification_status"    text                     NOT NULL DEFAULT 'PENDING_REVIEW'::text,
  "verified_by"            uuid,
  "verified_at"            timestamp with time zone,
  "notes"                  text,
  "created_by"             uuid,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "classification_line_id" uuid,
  "item_sequence"          integer,
  "expiry_date"            date,
  "issuer_name"            text,
  "status"                 character varying(20)    NOT NULL DEFAULT 'UPLOADED'::character varying,
  CONSTRAINT "cus_declaration_documents_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.cus_declaration_validation_runs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_declaration_validation_runs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_declaration_validation_runs" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid                     NOT NULL,
  "declaration_id"        uuid                     NOT NULL,
  "overall_status"        character varying(30)    NOT NULL,
  "rule_set_version"      character varying(30)    NOT NULL DEFAULT '2026.1-BTKI'::character varying,
  "engine_version"        character varying(20)    NOT NULL DEFAULT '1.0.0'::character varying,
  "trigger_type"          character varying(30)    NOT NULL DEFAULT 'MANUAL'::character varying,
  "triggered_by"          uuid,
  "total_lines"           integer                  NOT NULL DEFAULT 0,
  "error_count"           integer                  NOT NULL DEFAULT 0,
  "warning_count"         integer                  NOT NULL DEFAULT 0,
  "info_count"            integer                  NOT NULL DEFAULT 0,
  "execution_duration_ms" integer                  NOT NULL DEFAULT 0,
  "summary_json"          jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "validated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cus_declaration_validation_runs_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.cus_declaration_exceptions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_declaration_exceptions" (

  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"              uuid                     NOT NULL,
  "declaration_id"         uuid                     NOT NULL,
  "validation_run_id"      uuid,
  "classification_line_id" uuid,
  "item_sequence"          integer,
  "sku_code"               text,
  "rule_code"              character varying(40)    NOT NULL,
  "fingerprint"            text                     NOT NULL,
  "severity"               character varying(20)    NOT NULL,
  "category"               character varying(30)    NOT NULL,
  "resolution_policy"      character varying(30)    NOT NULL DEFAULT 'FIX_REQUIRED'::character varying,
  "readiness_impact"       character varying(30)    NOT NULL DEFAULT 'BLOCKS_READINESS'::character varying,
  "rule_source"            text                     DEFAULT 'RULE SOURCE REQUIRED'::text,
  "status"                 character varying(20)    NOT NULL DEFAULT 'OPEN'::character varying,
  "title"                  text                     NOT NULL,
  "description"            text                     NOT NULL,
  "current_value"          text,
  "expected_value"         text,
  "evidence"               jsonb                    DEFAULT '{}'::jsonb,
  "source"                 character varying(30)    NOT NULL DEFAULT 'DETERMINISTIC_ENGINE'::character varying,
  "detected_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "detected_by"            uuid,
  "acknowledged_at"        timestamp with time zone,
  "acknowledged_by"        uuid,
  "resolved_at"            timestamp with time zone,
  "resolved_by"            uuid,
  "resolution_type"        character varying(40),
  "resolution_note"        text,
  "reopened_at"            timestamp with time zone,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cus_declaration_exceptions_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_cus_exception_fingerprint" UNIQUE (tenant_id, declaration_id, fingerprint)

);

-- ============================================================================
-- Object:        public.cus_customs_decisions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_customs_decisions" (

  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            uuid                     NOT NULL,
  "declaration_id"       uuid                     NOT NULL,
  "decision_number"      text                     NOT NULL,
  "decision_type"        text                     NOT NULL,
  "outcome"              text                     NOT NULL,
  "actor_id"             uuid,
  "actor_name"           text                     NOT NULL,
  "actor_role"           text                     NOT NULL,
  "reason"               text                     NOT NULL,
  "justification"        text,
  "evidence"             jsonb,
  "regulatory_source"    jsonb,
  "related_item_id"      uuid,
  "related_exception_id" uuid,
  "related_document_id"  uuid,
  "related_prep_id"      uuid,
  "confidence"           text                     NOT NULL DEFAULT 'HIGH'::text,
  "status"               text                     NOT NULL DEFAULT 'ACTIVE'::text,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cus_customs_decisions_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_cus_decision_num" UNIQUE (tenant_id, decision_number)

);

-- ============================================================================
-- Object:        public.cus_item_audit_logs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_item_audit_logs" (

  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"              uuid                     NOT NULL,
  "declaration_id"         uuid                     NOT NULL,
  "classification_line_id" uuid,
  "field_name"             text                     NOT NULL,
  "old_value"              jsonb,
  "new_value"              jsonb,
  "change_reason"          text,
  "changed_by"             uuid,
  "changed_by_name"        text,
  "changed_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "source"                 text                     NOT NULL DEFAULT 'PPJK_WORKBENCH'::text,
  CONSTRAINT "cus_item_audit_logs_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.cus_sku_intelligence
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_sku_intelligence" (

  "id"                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                 uuid                     NOT NULL,
  "importer_id"               uuid                     NOT NULL,
  "customer_id"               uuid,
  "sku_code"                  text                     NOT NULL,
  "normalized_description"    text                     NOT NULL,
  "original_description"      text,
  "brand"                     text,
  "model"                     text,
  "manufacturer"              text,
  "supplier"                  text,
  "country_of_origin"         character varying(2)     NOT NULL DEFAULT 'CN'::character varying,
  "preferred_uom"             character varying(10)    NOT NULL DEFAULT 'PCE'::character varying,
  "suggested_hs_code"         character varying(12),
  "classification_confidence" numeric(3,2)             DEFAULT 1.00,
  "classification_status"     character varying(20)    NOT NULL DEFAULT 'SUGGESTED'::character varying,
  "classification_rationale"  text,
  "classification_source"     character varying(30)    NOT NULL DEFAULT 'HISTORICAL_IMPORT'::character varying,
  "last_used_declaration_id"  uuid,
  "average_unit_price_usd"    numeric(14,4),
  "total_declarations_count"  integer                  NOT NULL DEFAULT 1,
  "last_reviewed_at"          timestamp with time zone,
  "last_reviewed_by"          uuid,
  "effective_date"            date                     NOT NULL DEFAULT CURRENT_DATE,
  "is_active"                 boolean                  NOT NULL DEFAULT true,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cus_sku_intelligence_pkey" PRIMARY KEY (id),
  CONSTRAINT "uq_cus_sku_importer_code" UNIQUE (tenant_id, importer_id, sku_code)

);

-- ============================================================================
-- Object:        public.cus_sku_classification_history
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/cus_sku_classification_history.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."cus_sku_classification_history" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           uuid                     NOT NULL,
  "importer_id"         uuid                     NOT NULL,
  "sku_intelligence_id" uuid,
  "declaration_id"      uuid,
  "declaration_number"  text,
  "sku_code"            text                     NOT NULL,
  "hs_code"             character varying(12)    NOT NULL,
  "goods_description"   text,
  "unit_price_usd"      numeric(14,4),
  "currency"            character varying(5)     DEFAULT 'USD'::character varying,
  "country_of_origin"   character varying(2)     DEFAULT 'CN'::character varying,
  "customs_channel"     character varying(20),
  "recorded_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cus_sku_classification_history_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fin_financial_ledger_entries" (


  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          uuid                     NOT NULL,
  "work_order_id"      uuid,
  "shipment_id"        uuid,
  "execution_leg_id"   uuid,
  "service_request_id" uuid,
  "vendor_entity_id"   uuid,
  "account_code"       text                     NOT NULL,
  "description"        text                     NOT NULL,
  "debit_amount"       numeric(18,2)            NOT NULL DEFAULT 0,
  "credit_amount"      numeric(18,2)            NOT NULL DEFAULT 0,
  "currency"           text                     NOT NULL DEFAULT 'IDR'::text,
  "is_reconciled"      boolean                  DEFAULT false,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "transaction_type" public.fin_transaction_type NOT NULL,
  CONSTRAINT "fin_financial_ledger_entries_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.tenant_sbus
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/tenant_sbus.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."tenant_sbus" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid,
  "sbu_type"      character varying(20)    NOT NULL,
  "sbu_code"      character varying(50)    NOT NULL,
  "sbu_name"      character varying(255)   NOT NULL,
  "status"        character varying(20)    DEFAULT 'active'::character varying,
  "token_balance" integer                  DEFAULT 0,
  "config"        jsonb                    DEFAULT '{}'::jsonb,
  "created_by"    uuid,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "tenant_sbus_pkey" PRIMARY KEY (id),
  CONSTRAINT "tenant_sbus_sbu_type_check"
    CHECK (((sbu_type)::text = ANY ((ARRAY['tr'::character varying, 'wh'::character varying, 'ink'::character varying, 'fwd'::character varying])::text[]))),
  CONSTRAINT "tenant_sbus_tenant_id_sbu_code_key" UNIQUE (tenant_id, sbu_code)

);

-- ============================================================================
-- Object:        public.md_warehouses
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_warehouses.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_warehouses" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           uuid                     NOT NULL,
  "code"                text                     NOT NULL,
  "name"                text                     NOT NULL,
  "address"             text,
  "city"                text,
  "province"            text,
  "latitude"            double precision,
  "longitude"           double precision,
  "contact_person"      text,
  "contact_phone"       text,
  "is_active"           boolean                  NOT NULL DEFAULT true,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"          uuid,
  "warehouse_type"      text,
  "ownership"           text,
  "parent_warehouse_id" uuid,
  "status"              text                     NOT NULL DEFAULT 'ACTIVE'::text,
  "total_capacity_sqm"  numeric(12,2),
  "total_capacity_cbm"  numeric(12,2),
  "organization_id"     uuid,
  "sbu_id"              uuid,
  CONSTRAINT "md_warehouses_ownership_check" CHECK ((ownership = ANY (ARRAY['OWN'::text, '3PL_MANAGED'::text, 'KONSINYASI'::text]))),
  CONSTRAINT "md_warehouses_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_warehouses_status_check" CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text, 'MAINTENANCE'::text]))),
  CONSTRAINT "md_warehouses_warehouse_type_check" CHECK ((warehouse_type = ANY (ARRAY['DC'::text, 'SUB_DC'::text, 'SHOP'::text, 'DARK_STORE'::text])))

);

-- ============================================================================
-- Object:        public.fw_consolidations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fw_consolidations" (

  "id"                              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                       uuid                     NOT NULL,
  "consol_number"                   text                     NOT NULL,
  "shipping_line_id"                uuid,
  "shipping_line_name"              text,
  "vessel_name"                     text                     NOT NULL,
  "voyage_number"                   text,
  "origin_port"                     text                     NOT NULL,
  "destination_port"                text                     NOT NULL,
  "etd"                             date,
  "eta"                             date,
  "actual_etd"                      timestamp with time zone,
  "actual_eta"                      timestamp with time zone,
  "consol_warehouse_origin_id"      uuid,
  "consol_warehouse_destination_id" uuid,
  "status"                          text                     DEFAULT 'open'::text,
  "created_by"                      uuid,
  "created_at"                      timestamp with time zone DEFAULT now(),
  "updated_at"                      timestamp with time zone DEFAULT now(),
  CONSTRAINT "fw_consolidations_number_unique" UNIQUE (tenant_id, consol_number),
  CONSTRAINT "fw_consolidations_pkey" PRIMARY KEY (id),
  CONSTRAINT "fw_consolidations_status_check"
    CHECK ((status = ANY (ARRAY['open'::text, 'stuffing'::text, 'shipped'::text, 'arrived'::text, 'deconsol_done'::text, 'closed'::text])))

);

-- ============================================================================
-- Object:        public.fw_container_assignments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fw_container_assignments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fw_container_assignments" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "consolidation_id" uuid                     NOT NULL,
  "container_number" text                     NOT NULL,
  "container_type"   text                     NOT NULL,
  "seal_number"      text,
  "bl_number"        text,
  "max_volume_cbm"   numeric,
  "status"           text                     DEFAULT 'empty'::text,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "fw_container_assignments_container_type_check" CHECK ((container_type = ANY (ARRAY['20GP'::text, '40GP'::text, '40HC'::text, '20RF'::text, '45HC'::text]))),
  CONSTRAINT "fw_container_assignments_pkey" PRIMARY KEY (id),
  CONSTRAINT "fw_container_assignments_status_check"
    CHECK ((status = ANY (ARRAY['empty'::text, 'stuffed'::text, 'shipped'::text, 'arrived'::text, 'deconsoled'::text, 'returned'::text])))

);

-- ============================================================================
-- Object:        public.md_warehouse_areas
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_warehouse_areas.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_warehouse_areas" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "warehouse_id"        uuid                     NOT NULL,
  "tenant_id"           uuid                     NOT NULL,
  "area_code"           text                     NOT NULL,
  "area_name"           text                     NOT NULL,
  "area_type"           text                     NOT NULL,
  "area_category"       text                     DEFAULT 'GENERAL'::text,
  "storage_type"        text                     DEFAULT 'PALLET_STACK'::text,
  "total_capacity"      numeric(12,2),
  "uom_capacity"        text                     DEFAULT 'PALLET'::text,
  "temperature_min"     numeric(8,2),
  "temperature_max"     numeric(8,2),
  "humidity_max"        numeric(8,2),
  "is_hazmat_certified" boolean                  NOT NULL DEFAULT false,
  "is_bonded_zone"      boolean                  NOT NULL DEFAULT false,
  "is_active"           boolean                  NOT NULL DEFAULT true,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"          uuid,
  CONSTRAINT "md_warehouse_areas_area_category_check" CHECK ((area_category = ANY (ARRAY['GENERAL'::text, 'FOOD_GRADE'::text, 'DANGEROUS_GOODS'::text]))),
  CONSTRAINT "md_warehouse_areas_area_type_check"
    CHECK ((area_type = ANY (ARRAY['YARD'::text, 'INDOOR_FLOOR'::text, 'RACKING'::text, 'COLD_FREEZER'::text, 'COLD_CHILLER'::text, 'HAZMAT'::text, 'BONDED'::text]))),
  CONSTRAINT "md_warehouse_areas_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_warehouse_areas_storage_type_check"
    CHECK ((storage_type = ANY (ARRAY['BULK_FLOOR'::text, 'PALLET_STACK'::text, 'RACK_SELECTIVE'::text, 'RACK_DRIVE_IN'::text, 'CANTILEVER'::text]))),
  CONSTRAINT "md_warehouse_areas_uom_capacity_check" CHECK ((uom_capacity = ANY (ARRAY['PALLET'::text, 'CBM'::text, 'SQM'::text])))

);

-- ============================================================================
-- Object:        public.md_storage_contracts
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_storage_contracts" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "contract_number" text                     NOT NULL,
  "customer_id"     uuid,
  "warehouse_id"    uuid,
  "area_id"         uuid,
  "start_date"      date                     NOT NULL,
  "end_date"        date                     NOT NULL,
  "committed_space" numeric(12,2),
  "uom_space"       text                     DEFAULT 'PALLET'::text,
  "max_overflow"    numeric(12,2)            DEFAULT 0,
  "billing_method"  text                     NOT NULL DEFAULT 'MONTHLY_FIXED'::text,
  "status"          text                     NOT NULL DEFAULT 'DRAFT'::text,
  "notes"           text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"      uuid,
  CONSTRAINT "md_storage_contracts_billing_method_check" CHECK ((billing_method = ANY (ARRAY['MONTHLY_FIXED'::text, 'PER_TRANSACTION'::text, 'HYBRID'::text]))),
  CONSTRAINT "md_storage_contracts_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_storage_contracts_status_check" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'EXPIRED'::text, 'TERMINATED'::text]))),
  CONSTRAINT "md_storage_contracts_uom_space_check" CHECK ((uom_space = ANY (ARRAY['PALLET'::text, 'CBM'::text, 'SQM'::text])))

);

-- ============================================================================
-- Object:        public.md_billing_rates
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_billing_rates.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_billing_rates" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "contract_id"  uuid                     NOT NULL,
  "tenant_id"    uuid                     NOT NULL,
  "charge_code"  text                     NOT NULL,
  "rate_value"   numeric(15,2)            NOT NULL,
  "uom"          text                     NOT NULL,
  "valid_from"   date                     NOT NULL,
  "valid_to"     date,
  "is_active"    boolean                  NOT NULL DEFAULT true,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid,
  "warehouse_id" uuid,
  CONSTRAINT "md_billing_rates_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_contract_warehouses
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_contract_warehouses.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_contract_warehouses" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "contract_id"     uuid                     NOT NULL,
  "warehouse_id"    uuid                     NOT NULL,
  "committed_space" numeric(12,2)            DEFAULT 0,
  "uom_space"       text                     DEFAULT 'PALLET'::text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "md_contract_warehouses_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.md_warehouse_staff
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_warehouse_staff" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    uuid                     NOT NULL,
  "sbu_id"       uuid                     NOT NULL,
  "warehouse_id" uuid,
  "name"         text                     NOT NULL,
  "whatsapp"     text                     NOT NULL,
  "pin"          text                     NOT NULL,
  "role"         text                     NOT NULL,
  "is_active"    boolean                  NOT NULL DEFAULT true,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "roles"        text[]                   DEFAULT '{}'::text[],
  CONSTRAINT "md_warehouse_staff_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_warehouse_staff_role_check" CHECK ((role = ANY (ARRAY['SECURITY'::text, 'TALLY'::text, 'PUTAWAY'::text, 'ADMIN'::text, 'ADD_SERVICE'::text]))),
  CONSTRAINT "md_warehouse_staff_tenant_id_whatsapp_key" UNIQUE (tenant_id, whatsapp)

);

-- ============================================================================
-- Object:        public.md_warehouse_zones
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_warehouse_zones.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_warehouse_zones" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "area_id"     uuid                     NOT NULL,
  "tenant_id"   uuid                     NOT NULL,
  "zone_code"   text                     NOT NULL,
  "zone_name"   text                     NOT NULL,
  "zone_status" text                     NOT NULL DEFAULT 'ACTIVE'::text,
  "is_active"   boolean                  NOT NULL DEFAULT true,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"  uuid,
  CONSTRAINT "md_warehouse_zones_pkey" PRIMARY KEY (id),
  CONSTRAINT "md_warehouse_zones_zone_status_check" CHECK ((zone_status = ANY (ARRAY['ACTIVE'::text, 'FULL'::text, 'MAINTENANCE'::text])))

);

-- ============================================================================
-- Object:        public.md_warehouse_locations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."md_warehouse_locations" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "warehouse_id"   uuid                     NOT NULL,
  "tenant_id"      uuid                     NOT NULL,
  "code"           text                     NOT NULL,
  "zone"           text,
  "rack"           text,
  "shelf"          text,
  "bin"            text,
  "location_type"  text                     NOT NULL DEFAULT 'STORAGE'::text,
  "max_weight_kg"  numeric(12,2),
  "max_volume_m3"  numeric(12,2),
  "is_active"      boolean                  NOT NULL DEFAULT true,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "area_id"        uuid,
  "zone_id"        uuid,
  "bin_type"       text,
  "aisle"          text,
  "bay"            text,
  "level"          text,
  "position"       text,
  "bin_status"     text                     NOT NULL DEFAULT 'EMPTY'::text,
  "length_m"       numeric(10,2)            DEFAULT 0,
  "width_m"        numeric(10,2)            DEFAULT 0,
  "height_m"       numeric(10,2)            DEFAULT 0,
  "storage_method" text,
  CONSTRAINT "md_warehouse_locations_bin_status_check" CHECK ((bin_status = ANY (ARRAY['EMPTY'::text, 'OCCUPIED'::text, 'RESERVED'::text, 'BLOCKED'::text]))),
  CONSTRAINT "md_warehouse_locations_bin_type_check" CHECK ((bin_type = ANY (ARRAY['RACK'::text, 'FLOOR'::text, 'YARD_GRID'::text]))),
  CONSTRAINT "md_warehouse_locations_location_type_check"
    CHECK ((location_type = ANY (ARRAY['STORAGE'::text, 'PICKING'::text, 'RECEIVING'::text, 'SHIPPING'::text, 'QUARANTINE'::text, 'RETURN'::text]))),
  CONSTRAINT "md_warehouse_locations_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.sbu_token_transactions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/sbu_token_transactions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."sbu_token_transactions" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "sbu_id"           uuid,
  "tenant_id"        uuid,
  "amount"           integer                  NOT NULL,
  "transaction_type" character varying(20),
  "job_order_id"     uuid,
  "description"      text,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "sbu_token_transactions_pkey" PRIMARY KEY (id),
  CONSTRAINT "sbu_token_transactions_transaction_type_check"
    CHECK (((transaction_type)::text = ANY ((ARRAY['GRANT'::character varying, 'DEDUCT'::character varying, 'TRANSFER'::character varying])::text[])))

);

-- ============================================================================
-- Object:        public.tenant_users
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."tenant_users" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      uuid,
  "tenant_id"    uuid,
  "role_code"    character varying(50),
  "sbu_id"       uuid,
  "full_name"    character varying(255),
  "whatsapp"     character varying(20),
  "is_active"    boolean                  DEFAULT true,
  "created_by"   uuid,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  "warehouse_id" uuid,
  "division"     character varying(50),
  "region_id"    uuid,
  CONSTRAINT "tenant_users_pkey" PRIMARY KEY (id),
  CONSTRAINT "tenant_users_user_id_key" UNIQUE (user_id)

);

-- ============================================================================
-- Object:        public.token_transactions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/token_transactions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."token_transactions" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid,
  "tenant_code"      character varying(50),
  "amount"           integer,
  "transaction_type" character varying(20),
  "description"      text,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "token_transactions_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.topup_requests
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/topup_requests.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."topup_requests" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid,
  "tenant_code"      text,
  "amount"           integer                  NOT NULL,
  "total_price"      integer,
  "proof_url"        text,
  "status"           text                     DEFAULT 'pending'::text,
  "created_at"       timestamp with time zone DEFAULT now(),
  "rejection_reason" text,
  CONSTRAINT "topup_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "topup_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))

);

-- ============================================================================
-- Object:        public.tracking_sessions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/tracking_sessions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."tracking_sessions" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid,
  "reference_type" character varying(50)    NOT NULL,
  "reference_id"   uuid                     NOT NULL,
  "status"         character varying(20)    DEFAULT 'ACTIVE'::character varying,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "tracking_sessions_pkey" PRIMARY KEY (id),
  CONSTRAINT "tracking_sessions_reference_type_reference_id_status_key" UNIQUE (reference_type, reference_id, status),
  CONSTRAINT "tracking_sessions_status_check"
    CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))

);

-- ============================================================================
-- Object:        public.geofence_zones
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/geofence_zones.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."geofence_zones" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "session_id"    uuid,
  "latitude"      double precision         NOT NULL,
  "longitude"     double precision         NOT NULL,
  "radius_meters" integer                  DEFAULT 500,
  "zone_type"     character varying(50)    NOT NULL,
  "location_name" character varying(255),
  "reference_id"  uuid,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "geofence_zones_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.geofence_events
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/geofence_events.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."geofence_events" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "session_id"  uuid,
  "zone_id"     uuid,
  "event_type"  character varying(20)    NOT NULL,
  "latitude"    double precision         NOT NULL,
  "longitude"   double precision         NOT NULL,
  "recorded_at" timestamp with time zone NOT NULL,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "geofence_events_event_type_check" CHECK (((event_type)::text = ANY ((ARRAY['ENTER'::character varying, 'EXIT'::character varying])::text[]))),
  CONSTRAINT "geofence_events_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.tracking_points
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/tracking_points.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."tracking_points" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "session_id"  uuid,
  "latitude"    double precision         NOT NULL,
  "longitude"   double precision         NOT NULL,
  "accuracy"    double precision,
  "heading"     double precision,
  "speed"       double precision,
  "recorded_at" timestamp with time zone NOT NULL,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "tracking_points_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.uom_types
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/uom_types.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."uom_types" (

  "id"         uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid,
  "name"       text                        NOT NULL,
  "code"       text                        NOT NULL,
  "level"      integer                     DEFAULT 0,
  "is_base"    boolean                     DEFAULT false,
  "is_active"  boolean                     DEFAULT true,
  "created_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "uom_types_pkey" PRIMARY KEY (id),
  CONSTRAINT "uom_types_tenant_id_code_key" UNIQUE (tenant_id, code)

);

-- ============================================================================
-- Object:        public.products
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."products" (

  "id"                           uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "customer_id"                  uuid                        NOT NULL,
  "sku"                          text                        NOT NULL,
  "name"                         text                        NOT NULL,
  "category"                     text,
  "length_cm"                    numeric                     DEFAULT 0,
  "width_cm"                     numeric                     DEFAULT 0,
  "height_cm"                    numeric                     DEFAULT 0,
  "weight_kg"                    numeric                     DEFAULT 0,
  "created_at"                   timestamp with time zone    DEFAULT now(),
  "packaging_type"               text                        DEFAULT 'pcs'::text,
  "packaging_qty"                numeric                     DEFAULT 1,
  "content_qty"                  numeric                     DEFAULT 1,
  "total_weight_kg"              numeric                     DEFAULT 0,
  "total_volume_m3"              numeric                     DEFAULT 0,
  "tenant_id"                    uuid,
  "barcode"                      text,
  "description"                  text,
  "sub_category"                 text,
  "brand"                        text,
  "image_url"                    text,
  "image_urls"                   text[],
  "base_uom_id"                  uuid,
  "default_inbound_uom_id"       uuid,
  "default_outbound_uom_id"      uuid,
  "cbm_override"                 numeric(12,6),
  "cbm"                          numeric(12,6),
  "enable_serial_tracking"       boolean                     DEFAULT false,
  "enable_weight_tracking"       boolean                     DEFAULT false,
  "enable_expiry_tracking"       boolean                     DEFAULT false,
  "enable_batch_tracking"        boolean                     DEFAULT false,
  "enable_variant_tracking"      boolean                     DEFAULT false,
  "enable_custom_attributes"     boolean                     DEFAULT false,
  "default_outbound_strategy"    text                        DEFAULT 'fifo'::text,
  "is_active"                    boolean                     DEFAULT true,
  "is_hazardous"                 boolean                     DEFAULT false,
  "requires_temperature_control" boolean                     DEFAULT false,
  "min_temperature"              numeric(5,2),
  "max_temperature"              numeric(5,2),
  "created_by"                   uuid,
  "updated_at"                   timestamp without time zone DEFAULT now(),
  CONSTRAINT "products_customer_id_sku_key" UNIQUE (customer_id, sku),
  CONSTRAINT "products_pkey" PRIMARY KEY (id),
  CONSTRAINT "products_tenant_customer_sku_key" UNIQUE (tenant_id, customer_id, sku)

);

-- ============================================================================
-- Object:        public.customer_requests
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/customer_requests.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."customer_requests" (

  "id"                  uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "customer_id"         uuid                        NOT NULL,
  "warehouse_id"        uuid                        NOT NULL,
  "request_type"        text,
  "status"              text                        DEFAULT 'pending'::text,
  "product_id"          uuid,
  "quantity"            integer,
  "destination_address" text,
  "notes"               text,
  "photos"              text[],
  "response_message"    text,
  "responded_by"        uuid,
  "responded_at"        timestamp without time zone,
  "requested_at"        timestamp without time zone DEFAULT now(),
  "completed_at"        timestamp without time zone,
  "created_at"          timestamp without time zone DEFAULT now(),
  "product_name_manual" text,
  "sku_manual"          text,
  CONSTRAINT "customer_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "customer_requests_request_type_check" CHECK ((request_type = ANY (ARRAY['inbound'::text, 'outbound'::text])))

);

-- ============================================================================
-- Object:        public.inbound_details
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/inbound_details.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."inbound_details" (

  "id"                uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "inbound_id"        uuid,
  "product_id"        uuid,
  "sku"               character varying,
  "sku_name"          character varying           NOT NULL,
  "expected_quantity" numeric                     DEFAULT 0,
  "received_quantity" numeric                     DEFAULT 0,
  "rejected_quantity" numeric                     DEFAULT 0,
  "unit"              character varying,
  "notes"             text,
  "created_at"        timestamp without time zone DEFAULT now(),
  CONSTRAINT "inbound_details_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.inbound_damages
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/inbound_damages.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."inbound_damages" (

  "id"                uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "inbound_id"        uuid,
  "inbound_detail_id" uuid,
  "sku_name"          character varying(255),
  "damage_qty"        numeric,
  "damage_cause"      character varying(50),
  "damage_category"   character varying(50),
  "photo_urls"        text[],
  "notes"             text,
  "status"            character varying(50)       DEFAULT 'pending'::character varying,
  "approved_by"       uuid,
  "approved_at"       timestamp without time zone,
  "created_at"        timestamp without time zone DEFAULT now(),
  CONSTRAINT "inbound_damages_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.inbound_putaway
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/inbound_putaway.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."inbound_putaway" (

  "id"                uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "inbound_id"        uuid,
  "inbound_detail_id" uuid,
  "storage_area_id"   uuid,
  "sku_name"          character varying(255),
  "quantity"          numeric,
  "operator_id"       uuid,
  "completed_at"      timestamp without time zone,
  "created_at"        timestamp without time zone DEFAULT now(),
  CONSTRAINT "inbound_putaway_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.inventory_movements
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/inventory_movements.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."inventory_movements" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "product_id"    uuid                     NOT NULL,
  "warehouse_id"  uuid,
  "customer_id"   uuid,
  "location_from" text,
  "location_to"   text,
  "quantity"      integer                  NOT NULL,
  "movement_type" text,
  "reference_id"  uuid,
  "notes"         text,
  "created_at"    timestamp with time zone DEFAULT now(),
  "created_by"    uuid,
  CONSTRAINT "inventory_movements_movement_type_check" CHECK ((movement_type = ANY (ARRAY['inbound'::text, 'outbound'::text, 'transfer'::text, 'adjustment'::text]))),
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.product_batches
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/product_batches.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."product_batches" (

  "id"                 uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "product_id"         uuid                        NOT NULL,
  "customer_id"        uuid                        NOT NULL,
  "warehouse_id"       uuid,
  "batch_number"       text                        NOT NULL,
  "lot_number"         text,
  "manufacture_date"   date,
  "expiry_date"        date,
  "received_date"      date                        DEFAULT CURRENT_DATE,
  "initial_quantity"   numeric(14,4),
  "remaining_quantity" numeric(14,4),
  "uom_id"             uuid,
  "status"             text                        DEFAULT 'active'::text,
  "expiry_priority"    integer,
  "received_priority"  bigint,
  "alert_sent_30d"     boolean                     DEFAULT false,
  "alert_sent_7d"      boolean                     DEFAULT false,
  "alert_sent_expired" boolean                     DEFAULT false,
  "created_at"         timestamp without time zone DEFAULT now(),
  CONSTRAINT "product_batches_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_batches_product_id_batch_number_key" UNIQUE (product_id, batch_number)

);

-- ============================================================================
-- Object:        public.inventory
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/inventory.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."inventory" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "product_id"       uuid                     NOT NULL,
  "warehouse_id"     uuid                     NOT NULL,
  "customer_id"      uuid                     NOT NULL,
  "quantity"         integer                  DEFAULT 0,
  "lot_number"       text,
  "status"           text                     DEFAULT 'good'::text,
  "created_at"       timestamp with time zone DEFAULT now(),
  "updated_at"       timestamp with time zone DEFAULT now(),
  "batch_id"         uuid,
  "uom_id"           uuid,
  "location_barcode" text,
  CONSTRAINT "inventory_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.product_custom_attributes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/product_custom_attributes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."product_custom_attributes" (

  "id"              uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "product_id"      uuid                        NOT NULL,
  "attribute_name"  text                        NOT NULL,
  "attribute_value" text,
  "attribute_type"  text                        DEFAULT 'text'::text,
  "is_required"     boolean                     DEFAULT false,
  "created_at"      timestamp without time zone DEFAULT now(),
  CONSTRAINT "product_custom_attributes_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.product_uom_conversions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/product_uom_conversions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."product_uom_conversions" (

  "id"             uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "product_id"     uuid                        NOT NULL,
  "from_uom_id"    uuid                        NOT NULL,
  "to_uom_id"      uuid                        NOT NULL,
  "conversion_qty" numeric(14,6)               NOT NULL,
  "is_default"     boolean                     DEFAULT false,
  "created_at"     timestamp without time zone DEFAULT now(),
  CONSTRAINT "product_uom_conversions_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_uom_conversions_product_id_from_uom_id_to_uom_id_key" UNIQUE (product_id, from_uom_id, to_uom_id)

);

-- ============================================================================
-- Object:        public.product_variants
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/product_variants.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."product_variants" (

  "id"               uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "product_id"       uuid                        NOT NULL,
  "variant_type"     text                        NOT NULL,
  "variant_value"    text                        NOT NULL,
  "sku_suffix"       text,
  "barcode"          text,
  "additional_price" numeric(12,2)               DEFAULT 0,
  "is_active"        boolean                     DEFAULT true,
  "sort_order"       integer                     DEFAULT 0,
  "created_at"       timestamp without time zone DEFAULT now(),
  CONSTRAINT "product_variants_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_variants_product_id_variant_type_variant_value_key" UNIQUE (product_id, variant_type, variant_value)

);

-- ============================================================================
-- Object:        public.putaway_assignments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/putaway_assignments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."putaway_assignments" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid,
  "inbound_detail_id"     uuid,
  "condition"             text,
  "suggested_location_id" uuid,
  "actual_location_id"    uuid,
  "quantity"              integer                  DEFAULT 0,
  "created_at"            timestamp with time zone DEFAULT now(),
  "updated_at"            timestamp with time zone DEFAULT now(),
  CONSTRAINT "putaway_assignments_condition_check" CHECK ((condition = ANY (ARRAY['good'::text, 'damaged'::text]))),
  CONSTRAINT "putaway_assignments_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.serial_numbers
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/serial_numbers.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."serial_numbers" (

  "id"            uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "product_id"    uuid                        NOT NULL,
  "customer_id"   uuid                        NOT NULL,
  "warehouse_id"  uuid,
  "serial_number" text                        NOT NULL,
  "batch_id"      uuid,
  "status"        text                        DEFAULT 'in_stock'::text,
  "condition"     text                        DEFAULT 'good'::text,
  "received_at"   timestamp without time zone DEFAULT now(),
  "sold_at"       timestamp without time zone,
  "returned_at"   timestamp without time zone,
  "last_location" text,
  "last_moved_at" timestamp without time zone,
  "notes"         text,
  "created_at"    timestamp without time zone DEFAULT now(),
  CONSTRAINT "serial_numbers_pkey" PRIMARY KEY (id),
  CONSTRAINT "serial_numbers_product_id_serial_number_key" UNIQUE (product_id, serial_number)

);

-- ============================================================================
-- Object:        public.variant_types
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/variant_types.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."variant_types" (

  "id"         uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"  uuid,
  "name"       text                        NOT NULL,
  "created_at" timestamp without time zone DEFAULT now(),
  CONSTRAINT "variant_types_pkey" PRIMARY KEY (id),
  CONSTRAINT "variant_types_tenant_id_name_key" UNIQUE (tenant_id, name)

);

-- ============================================================================
-- Object:        public.variant_values
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/variant_values.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."variant_values" (

  "id"              uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "variant_type_id" uuid,
  "value"           text                        NOT NULL,
  "sku_suffix"      text,
  "created_at"      timestamp without time zone DEFAULT now(),
  CONSTRAINT "variant_values_pkey" PRIMARY KEY (id),
  CONSTRAINT "variant_values_variant_type_id_value_key" UNIQUE (variant_type_id, VALUE)

);

-- ============================================================================
-- Object:        public.vendor_invoices
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/vendor_invoices.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."vendor_invoices" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "vendor_id"        uuid                     NOT NULL,
  "wo_id"            uuid,
  "jo_id"            uuid,
  "invoice_number"   text,
  "invoice_url"      text,
  "invoice_amount"   numeric(15,2)            DEFAULT 0,
  "invoice_date"     date,
  "matched_at"       timestamp with time zone,
  "received_at"      timestamp with time zone,
  "paid_at"          timestamp with time zone,
  "status"           text                     NOT NULL DEFAULT 'unmatched'::text,
  "matched_by"       uuid,
  "verified_by"      uuid,
  "rejection_reason" text,
  "notes"            text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "vendor_invoices_pkey" PRIMARY KEY (id),
  CONSTRAINT "vendor_invoices_status_check" CHECK ((status = ANY (ARRAY['unmatched'::text, 'matched'::text, 'submitted'::text, 'verified'::text, 'paid'::text, 'rejected'::text])))

);

-- ============================================================================
-- Object:        public.warehouse_staff_attendance
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."warehouse_staff_attendance" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid                     NOT NULL,
  "warehouse_id"   uuid                     NOT NULL,
  "user_id"        uuid                     NOT NULL,
  "check_in_time"  timestamp with time zone NOT NULL DEFAULT now(),
  "check_out_time" timestamp with time zone,
  "status"         text                     DEFAULT 'CHECK_IN'::text,
  "latitude"       double precision,
  "longitude"      double precision,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "warehouse_staff_attendance_pkey" PRIMARY KEY (id),
  CONSTRAINT "warehouse_staff_attendance_status_check" CHECK ((status = ANY (ARRAY['CHECK_IN'::text, 'CHECK_OUT'::text])))

);

-- ============================================================================
-- Object:        public.warehouse_users
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/warehouse_users.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."warehouse_users" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "warehouse_id" uuid                     NOT NULL,
  "staff_id"     uuid                     NOT NULL,
  "role"         text                     DEFAULT 'operator'::text,
  "is_active"    boolean                  DEFAULT true,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "warehouse_users_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.weight_tracking
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/weight_tracking.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."weight_tracking" (

  "id"                uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "product_id"        uuid                        NOT NULL,
  "batch_id"          uuid,
  "warehouse_id"      uuid,
  "inbound_weight_kg" numeric(14,4),
  "current_weight_kg" numeric(14,4),
  "shrinkage_kg"      numeric(14,4),
  "shrinkage_percent" numeric(5,2),
  "tolerance_percent" numeric(5,2)                DEFAULT 5.0,
  "alert_sent"        boolean                     DEFAULT false,
  "last_weighed_at"   timestamp without time zone,
  "last_weighed_by"   uuid,
  "created_at"        timestamp without time zone DEFAULT now(),
  CONSTRAINT "weight_tracking_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_billing_invoices
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_billing_invoices.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_billing_invoices" (

  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"            uuid                     NOT NULL,
  "invoice_number"       text                     NOT NULL,
  "contract_id"          uuid                     NOT NULL,
  "customer_id"          uuid,
  "billing_period_start" date                     NOT NULL,
  "billing_period_end"   date                     NOT NULL,
  "total_amount"         numeric(18,2)            DEFAULT 0,
  "tax_amount"           numeric(18,2)            DEFAULT 0,
  "grand_total"          numeric(18,2)            DEFAULT 0,
  "status"               text                     NOT NULL DEFAULT 'DRAFT'::text,
  "due_date"             date,
  "paid_date"            date,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"           timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"           uuid,
  CONSTRAINT "wh_billing_invoices_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_billing_invoices_status_check" CHECK ((status = ANY (ARRAY['DRAFT'::text, 'SENT'::text, 'PAID'::text, 'OVERDUE'::text, 'CANCELLED'::text])))

);

-- ============================================================================
-- Object:        public.wh_billing_invoice_details
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_billing_invoice_details.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_billing_invoice_details" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    uuid                     NOT NULL,
  "invoice_id"   uuid                     NOT NULL,
  "charge_code"  text                     NOT NULL,
  "charge_name"  text,
  "rate_value"   numeric(15,2),
  "quantity"     numeric(12,4),
  "uom"          text,
  "amount"       numeric(18,2),
  "reference_id" text,
  "notes"        text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_billing_invoice_details_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_daily_stock_snapshots
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_daily_stock_snapshots" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "contract_id"   uuid                     NOT NULL,
  "snapshot_date" date                     NOT NULL,
  "warehouse_id"  uuid                     NOT NULL,
  "area_id"       uuid,
  "total_pallets" numeric(12,2)            DEFAULT 0,
  "total_cbm"     numeric(12,2)            DEFAULT 0,
  "total_sqm"     numeric(12,2)            DEFAULT 0,
  "sku_count"     integer                  DEFAULT 0,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_daily_stock_snapshots_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_internal_movements
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_internal_movements" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "warehouse_id"     uuid                     NOT NULL,
  "product_sku_id"   uuid                     NOT NULL,
  "from_location_id" uuid                     NOT NULL,
  "to_location_id"   uuid                     NOT NULL,
  "quantity"         numeric(15,2)            NOT NULL,
  "movement_date"    timestamp with time zone NOT NULL DEFAULT now(),
  "status"           text                     NOT NULL DEFAULT 'PENDING'::text,
  "notes"            text,
  "reference_type"   text,
  "reference_id"     text,
  "created_by"       uuid,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "executed_by"      uuid,
  "executed_at"      timestamp with time zone,
  "assigned_to"      uuid,
  CONSTRAINT "wh_internal_movements_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_internal_movements_quantity_check" CHECK ((quantity > (0)::numeric)),
  CONSTRAINT "wh_internal_movements_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text])))

);

-- ============================================================================
-- Object:        public.wh_inventory
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_inventory" (


  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           uuid                     NOT NULL,
  "warehouse_id"        uuid                     NOT NULL,
  "location_id"         uuid,
  "product_sku_id"      uuid                     NOT NULL,
  "quantity"            numeric(15,2)            NOT NULL DEFAULT 0,
  "reserved_quantity"   numeric(15,2)            NOT NULL DEFAULT 0,
  "batch_number"        text,
  "expiry_date"         date,
  "received_date"       date                     NOT NULL DEFAULT CURRENT_DATE,
  "unit_cost"           numeric(15,2),
  "status"              text                     NOT NULL DEFAULT 'AVAILABLE'::text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "inventory_code"      text,
  "parent_inventory_id" uuid,
  "serial_number"       text,
  "customer_id"         uuid,
  "lpn_code"            text,
  "parent_lpn_code"     text,
  "available_quantity" numeric(15,2) GENERATED ALWAYS AS ((quantity - reserved_quantity)) STORED,
  CONSTRAINT "wh_inventory_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_inventory_status_check" CHECK ((status = ANY (ARRAY['AVAILABLE'::text, 'QUARANTINE'::text, 'DAMAGED'::text, 'EXPIRED'::text, 'RESERVED'::text])))


);

-- ============================================================================
-- Object:        public.wh_inventory_movements
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_inventory_movements" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "inventory_id"     uuid                     NOT NULL,
  "movement_type"    text                     NOT NULL,
  "from_location_id" uuid,
  "to_location_id"   uuid,
  "quantity"         numeric(15,2)            NOT NULL,
  "reference_type"   text,
  "reference_id"     uuid,
  "notes"            text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"       uuid,
  CONSTRAINT "wh_inventory_movements_movement_type_check"
    CHECK
    ((movement_type = ANY (ARRAY['INBOUND'::text, 'OUTBOUND'::text, 'TRANSFER'::text, 'ADJUSTMENT_PLUS'::text, 'ADJUSTMENT_MINUS'::text, 'PICKING'::text, 'PUTAWAY'::text,
    'KITTING_CONSUME'::text, 'KITTING_OUTPUT'::text]))),
  CONSTRAINT "wh_inventory_movements_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_items" (


  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "sku"         character varying(100),
  "name"        text                     NOT NULL,
  "description" text,
  "hs_code_id"  uuid,
  "base_qty"    integer                  DEFAULT 1,
  "uom"         character varying(20)    DEFAULT 'pcs'::character varying,
  "weight_kg"   numeric                  DEFAULT 0,
  "length_cm"   numeric                  DEFAULT 0,
  "width_cm"    numeric                  DEFAULT 0,
  "height_cm"   numeric                  DEFAULT 0,
  "owner_id"    uuid,
  "status"      character varying(50)    DEFAULT 'staged'::character varying,
  "created_at"  timestamp with time zone DEFAULT now(),
  "cbm" numeric GENERATED ALWAYS AS ((((length_cm * width_cm) * height_cm) / (1000000)::numeric)) STORED,
  CONSTRAINT "wh_items_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.wh_item_packaging
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_item_packaging.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_item_packaging" (

  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "parent_type" character varying(20),
  "parent_id"   uuid                     NOT NULL,
  "item_id"     uuid,
  "quantity"    integer                  DEFAULT 1,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "wh_item_packaging_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_milestone_logs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_milestone_logs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_milestone_logs" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "reference_type"  text                     NOT NULL,
  "reference_id"    uuid                     NOT NULL,
  "milestone_event" text                     NOT NULL,
  "notes"           text,
  "performed_by"    uuid,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_milestone_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_milestone_logs_reference_type_check"
    CHECK ((reference_type = ANY (ARRAY['INBOUND_RECEIPT'::text, 'OUTBOUND_SHIPMENT'::text, 'VAS_ORDER'::text, 'LPN_CREATION'::text])))

);

-- ============================================================================
-- Object:        public.wh_packages
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_packages.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_packages" (

  "id"           uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "package_code" character varying(100),
  "name"         text,
  "weight_kg"    numeric                  DEFAULT 0,
  "cbm"          numeric                  DEFAULT 0,
  "status"       character varying(50)    DEFAULT 'active'::character varying,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "wh_packages_package_code_key" UNIQUE (package_code),
  CONSTRAINT "wh_packages_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_pallets
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_pallets.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_pallets" (

  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "pallet_code"     character varying(100),
  "status"          character varying(50)    DEFAULT 'active'::character varying,
  "total_weight_kg" numeric                  DEFAULT 0,
  "total_cbm"       numeric                  DEFAULT 0,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "wh_pallets_pallet_code_key" UNIQUE (pallet_code),
  CONSTRAINT "wh_pallets_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_picking_lists
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_picking_lists.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_picking_lists" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"       uuid                     NOT NULL,
  "picking_number"  text                     NOT NULL,
  "source_type"     text                     NOT NULL,
  "source_id"       text,
  "customer_id"     uuid,
  "warehouse_id"    uuid                     NOT NULL,
  "scheduled_date"  date,
  "status"          text                     NOT NULL DEFAULT 'PENDING'::text,
  "assigned_picker" uuid,
  "notes"           text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"      uuid,
  CONSTRAINT "wh_picking_lists_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_picking_lists_source_type_check" CHECK ((source_type = ANY (ARRAY['FORWARDING_JO'::text, 'TRANSFER_OUT'::text, 'DIRECT_CUSTOMER'::text, 'SALES_ORDER'::text]))),
  CONSTRAINT "wh_picking_lists_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text])))

);

-- ============================================================================
-- Object:        public.wh_picking_details
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_picking_details" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          uuid                     NOT NULL,
  "picking_list_id"    uuid                     NOT NULL,
  "inventory_id"       uuid                     NOT NULL,
  "product_sku_id"     uuid                     NOT NULL,
  "requested_quantity" numeric(15,2),
  "picked_quantity"    numeric(15,2),
  "from_location_id"   uuid,
  "status"             text                     NOT NULL DEFAULT 'PENDING'::text,
  "fefo_override"      boolean                  NOT NULL DEFAULT false,
  "override_reason"    text,
  "override_by"        uuid,
  "picked_at"          timestamp with time zone,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_picking_details_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_picking_details_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'PICKED'::text, 'NOT_FOUND'::text, 'DAMAGED'::text])))

);

-- ============================================================================
-- Object:        public.wh_receipt_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_receipt_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_receipt_orders" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid                     NOT NULL,
  "receipt_number" text                     NOT NULL,
  "source_type"    text                     NOT NULL,
  "source_id"      text,
  "customer_id"    uuid,
  "warehouse_id"   uuid                     NOT NULL,
  "expected_date"  date,
  "status"         text                     NOT NULL DEFAULT 'PENDING'::text,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"     uuid,
  CONSTRAINT "wh_receipt_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_receipt_orders_source_type_check" CHECK ((source_type = ANY (ARRAY['FORWARDING_JO'::text, 'TRANSFER_IN'::text, 'DIRECT_CUSTOMER'::text, 'RETURN'::text]))),
  CONSTRAINT "wh_receipt_orders_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'PARTIAL'::text, 'COMPLETED'::text, 'CANCELLED'::text])))

);

-- ============================================================================
-- Object:        public.wh_receipt_details
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_receipt_details.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_receipt_details" (

  "id"                     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"              uuid                     NOT NULL,
  "receipt_id"             uuid                     NOT NULL,
  "product_sku_id"         uuid                     NOT NULL,
  "expected_quantity"      numeric(15,2),
  "actual_quantity"        numeric(15,2),
  "uom"                    text                     DEFAULT 'PCS'::text,
  "lot_number"             text,
  "expiry_date"            date,
  "status"                 text                     NOT NULL DEFAULT 'PENDING'::text,
  "damage_notes"           text,
  "photo_url"              text,
  "generated_inventory_id" uuid,
  "created_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_receipt_details_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_receipt_details_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'RECEIVED'::text, 'DAMAGED'::text, 'SHORT'::text, 'OVER'::text])))

);

-- ============================================================================
-- Object:        public.wh_repacking_conversions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_repacking_conversions" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid,
  "customer_id"       uuid,
  "source_product_id" uuid,
  "source_qty"        numeric                  NOT NULL,
  "target_product_id" uuid,
  "target_qty"        numeric                  NOT NULL,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  "created_by"        uuid,
  CONSTRAINT "wh_repacking_conversions_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_repacking_conversions_source_qty_check" CHECK ((source_qty > (0)::numeric)),
  CONSTRAINT "wh_repacking_conversions_target_qty_check" CHECK ((target_qty > (0)::numeric)),
  CONSTRAINT "wh_repacking_conversions_tenant_id_customer_id_source_produ_key" UNIQUE (tenant_id, customer_id, source_product_id, target_product_id)

);

-- ============================================================================
-- Object:        public.wh_repacking_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_repacking_orders" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "warehouse_id"  uuid                     NOT NULL,
  "order_number"  text                     NOT NULL,
  "order_type"    text                     NOT NULL,
  "description"   text,
  "status"        text                     NOT NULL DEFAULT 'CREATED'::text,
  "priority"      text                     DEFAULT 'NORMAL'::text,
  "notes"         text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"    uuid,
  "executed_by"   uuid,
  "executed_at"   timestamp with time zone,
  "completed_at"  timestamp with time zone,
  "reference_id"  text,
  "customer_id"   uuid,
  "current_stage" integer                  DEFAULT 1,
  CONSTRAINT "wh_repacking_orders_order_type_check" CHECK ((order_type = ANY (ARRAY['REPACKING'::text, 'BUNDLING'::text, 'KITTING'::text]))),
  CONSTRAINT "wh_repacking_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_repacking_orders_priority_check" CHECK ((priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text]))),
  CONSTRAINT "wh_repacking_orders_status_check" CHECK ((status = ANY (ARRAY['CREATED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text])))

);

-- ============================================================================
-- Object:        public.wh_repacking_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_repacking_items" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "repacking_order_id" uuid                     NOT NULL,
  "tenant_id"          uuid                     NOT NULL,
  "warehouse_id"       uuid                     NOT NULL,
  "product_sku_id"     uuid                     NOT NULL,
  "item_type"          text                     NOT NULL,
  "quantity"           numeric(15,2)            NOT NULL,
  "unit_cost"          numeric(15,2),
  "source_location_id" uuid,
  "target_location_id" uuid,
  "batch_number"       text,
  "expiry_date"        date,
  "notes"              text,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_repacking_items_item_type_check" CHECK ((item_type = ANY (ARRAY['SOURCE'::text, 'RESULT'::text]))),
  CONSTRAINT "wh_repacking_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_staff_attendance
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_staff_attendance" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"      uuid                     NOT NULL,
  "staff_id"       uuid                     NOT NULL,
  "check_in_time"  timestamp with time zone NOT NULL DEFAULT now(),
  "check_out_time" timestamp with time zone,
  "status"         text                     NOT NULL DEFAULT 'CHECK_IN'::text,
  "latitude"       double precision,
  "longitude"      double precision,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_staff_attendance_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_staff_attendance_status_check" CHECK ((status = ANY (ARRAY['CHECK_IN'::text, 'CHECK_OUT'::text])))

);

-- ============================================================================
-- Object:        public.wh_tasks
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_tasks" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"    uuid                     NOT NULL,
  "wo_item_id"   uuid,
  "warehouse_id" uuid                     NOT NULL,
  "task_number"  text                     NOT NULL,
  "task_type"    text                     NOT NULL,
  "status"       text                     NOT NULL DEFAULT 'PENDING'::text,
  "assigned_to"  uuid,
  "priority"     text                     DEFAULT 'NORMAL'::text,
  "notes"        text,
  "completed_at" timestamp with time zone,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"   uuid,
  CONSTRAINT "wh_tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_tasks_priority_check" CHECK ((priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text]))),
  CONSTRAINT "wh_tasks_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'ASSIGNED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text]))),
  CONSTRAINT "wh_tasks_task_type_check"
    CHECK
    ((task_type = ANY (ARRAY['INBOUND'::text, 'OUTBOUND'::text, 'PICKING'::text, 'PACKING'::text, 'PUTAWAY'::text, 'TRANSFER'::text, 'STOCK_OPNAME'::text, 'ADJUSTMENT'::text])))

);

-- ============================================================================
-- Object:        public.wh_task_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_task_items" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "task_id"           uuid                     NOT NULL,
  "product_sku_id"    uuid                     NOT NULL,
  "from_location_id"  uuid,
  "to_location_id"    uuid,
  "expected_quantity" numeric(15,2)            NOT NULL,
  "actual_quantity"   numeric(15,2),
  "batch_number"      text,
  "expiry_date"       date,
  "unit_cost"         numeric(15,2),
  "notes"             text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_task_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_temperature_alerts
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_temperature_alerts.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_temperature_alerts" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "zone_id"          uuid,
  "tenant_id"        uuid                     NOT NULL,
  "alert_type"       text                     NOT NULL,
  "threshold_value"  numeric(8,2),
  "actual_value"     numeric(8,2),
  "duration_minutes" integer,
  "is_resolved"      boolean                  NOT NULL DEFAULT false,
  "resolved_by"      uuid,
  "resolved_at"      timestamp with time zone,
  "notes"            text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_temperature_alerts_alert_type_check" CHECK ((alert_type = ANY (ARRAY['HIGH_TEMP'::text, 'LOW_TEMP'::text, 'SENSOR_OFFLINE'::text]))),
  CONSTRAINT "wh_temperature_alerts_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_temperature_logs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_temperature_logs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_temperature_logs" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "zone_id"       uuid,
  "tenant_id"     uuid                     NOT NULL,
  "recorded_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "temperature_c" numeric(8,2)             NOT NULL,
  "humidity_pct"  numeric(8,2),
  "sensor_id"     text,
  "status"        text                     NOT NULL DEFAULT 'NORMAL'::text,
  CONSTRAINT "wh_temperature_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_temperature_logs_status_check" CHECK ((status = ANY (ARRAY['NORMAL'::text, 'HIGH_ALERT'::text, 'CRITICAL'::text])))

);

-- ============================================================================
-- Object:        public.wh_transfer_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_transfer_orders" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "transfer_number"   text                     NOT NULL,
  "from_warehouse_id" uuid                     NOT NULL,
  "to_warehouse_id"   uuid                     NOT NULL,
  "transfer_type"     text                     DEFAULT 'REPLENISHMENT'::text,
  "customer_id"       uuid,
  "status"            text                     NOT NULL DEFAULT 'CREATED'::text,
  "notes"             text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"        uuid,
  "consignee_id"      uuid,
  CONSTRAINT "wh_transfer_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_transfer_orders_status_check"
    CHECK ((status = ANY (ARRAY['CREATED'::text, 'PICKING'::text, 'SHIPPED'::text, 'IN_TRANSIT'::text, 'RECEIVED'::text, 'CANCELLED'::text]))),
  CONSTRAINT "wh_transfer_orders_transfer_type_check" CHECK ((transfer_type = ANY (ARRAY['REPLENISHMENT'::text, 'CONSIGNMENT'::text, 'RETURN'::text, 'RECALL'::text])))

);

-- ============================================================================
-- Object:        public.wh_inbound_receipts
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_inbound_receipts" (

  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               uuid                     NOT NULL,
  "warehouse_id"            uuid                     NOT NULL,
  "wo_item_id"              uuid,
  "receipt_number"          text                     NOT NULL,
  "status"                  text                     NOT NULL DEFAULT 'EXPECTED'::text,
  "expected_arrival"        timestamp with time zone,
  "actual_arrival"          timestamp with time zone,
  "transporter_id"          uuid,
  "fleet_id"                uuid,
  "driver_id"               uuid,
  "notes"                   text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"              uuid,
  "transporter_name_manual" text,
  "driver_name_manual"      text,
  "driver_phone"            text,
  "vehicle_photo_url"       text,
  "pod_document_url"        text,
  "batb_document_url"       text,
  "unloading_start_time"    timestamp with time zone,
  "unloading_end_time"      timestamp with time zone,
  "total_unloading_minutes" numeric(10,2),
  "customer_id"             uuid,
  "shipper_id"              uuid,
  "transfer_id"             uuid,
  CONSTRAINT "wh_inbound_receipts_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_inbound_receipts_status_check"
    CHECK
    ((status = ANY (ARRAY['EXPECTED'::text, 'TRUCK_ARRIVED'::text, 'UNLOADING'::text, 'CHECKING'::text, 'CHECKING_DONE'::text, 'PUTAWAY_IN_PROGRESS'::text, 'COMPLETED'::text])))

);

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_inbound_receipt_items" (

  "id"                          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "receipt_id"                  uuid                     NOT NULL,
  "product_sku_id"              uuid                     NOT NULL,
  "expected_qty"                numeric(15,2)            NOT NULL DEFAULT 0,
  "actual_good_qty"             numeric(15,2)            NOT NULL DEFAULT 0,
  "quarantine_qty"              numeric(15,2)            NOT NULL DEFAULT 0,
  "rejected_qty"                numeric(15,2)            NOT NULL DEFAULT 0,
  "damage_source"               text,
  "damage_condition"            text,
  "damage_notes"                text,
  "batch_number"                text,
  "expiry_date"                 date,
  "created_at"                  timestamp with time zone NOT NULL DEFAULT now(),
  "damage_photo_url"            text,
  "over_decision"               text                     DEFAULT 'PENDING'::text,
  "over_notes"                  text,
  "putaway_location_id"         uuid,
  "putaway_at"                  timestamp with time zone,
  "planned_putaway_location_id" uuid,
  "putaway_entries"             jsonb,
  CONSTRAINT "wh_inbound_receipt_items_damage_condition_check"
    CHECK ((damage_condition = ANY (ARRAY['DAMAGED_PACKAGE_FULL_CONTENT'::text, 'GOOD_PACKAGE_MISSING_CONTENT'::text, 'TOTAL_DAMAGE'::text]))),
  CONSTRAINT "wh_inbound_receipt_items_damage_source_check" CHECK ((damage_source = ANY (ARRAY['TRANSPORTER'::text, 'WAREHOUSE_STAFF'::text, 'SUPPLIER'::text, 'OTHER'::text]))),
  CONSTRAINT "wh_inbound_receipt_items_over_decision_check" CHECK ((over_decision = ANY (ARRAY['PENDING'::text, 'ACCEPT_GOOD'::text, 'REJECT'::text]))),
  CONSTRAINT "wh_inbound_receipt_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_inbound_damage_records
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_inbound_damage_records" (

  "id"                             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "receipt_id"                     uuid                     NOT NULL,
  "receipt_item_id"                uuid                     NOT NULL,
  "qty"                            numeric(15,2)            NOT NULL,
  "damage_source"                  text                     NOT NULL,
  "source_notes"                   text,
  "source_photo_url"               text,
  "damage_condition"               text                     NOT NULL,
  "condition_notes"                text,
  "condition_photo_url"            text,
  "decision"                       text                     NOT NULL DEFAULT 'PENDING'::text,
  "decision_by"                    uuid,
  "decision_at"                    timestamp with time zone,
  "decision_notes"                 text,
  "quarantine_location_id"         uuid,
  "reported_by"                    uuid                     NOT NULL,
  "created_at"                     timestamp with time zone NOT NULL DEFAULT now(),
  "planned_quarantine_location_id" uuid,
  CONSTRAINT "wh_inbound_damage_records_damage_condition_check" CHECK ((damage_condition = ANY (ARRAY['PACKAGE_DAMAGED_INTACT'::text, 'PACKAGE_DAMAGED_MISSING'::text]))),
  CONSTRAINT "wh_inbound_damage_records_damage_source_check" CHECK ((damage_source = ANY (ARRAY['TRANSPORTER'::text, 'WAREHOUSE_STAFF'::text]))),
  CONSTRAINT "wh_inbound_damage_records_decision_check" CHECK ((decision = ANY (ARRAY['PENDING'::text, 'ACCEPT_QUARANTINE'::text, 'REJECT_RETURN'::text]))),
  CONSTRAINT "wh_inbound_damage_records_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_transfer_details
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_transfer_details" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"        uuid                     NOT NULL,
  "transfer_id"      uuid                     NOT NULL,
  "inventory_id"     uuid                     NOT NULL,
  "product_sku_id"   uuid                     NOT NULL,
  "quantity"         numeric(15,2)            NOT NULL,
  "from_location_id" uuid,
  "to_location_id"   uuid,
  "status"           text                     NOT NULL DEFAULT 'PENDING'::text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_transfer_details_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_transfer_details_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'PICKED'::text, 'SHIPPED'::text, 'RECEIVED'::text])))

);

-- ============================================================================
-- Object:        public.wh_transformation_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_transformation_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_transformation_orders" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          uuid                     NOT NULL,
  "to_number"          text                     NOT NULL,
  "to_type"            text                     NOT NULL,
  "status"             text                     NOT NULL DEFAULT 'PLANNED'::text,
  "output_sku_id"      uuid,
  "planned_output_qty" numeric(15,2),
  "actual_output_qty"  numeric(15,2),
  "input_bom"          jsonb,
  "location_id"        uuid,
  "assigned_to"        uuid,
  "notes"              text,
  "completed_at"       timestamp with time zone,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"         uuid,
  CONSTRAINT "wh_transformation_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_transformation_orders_status_check" CHECK ((status = ANY (ARRAY['PLANNED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text]))),
  CONSTRAINT "wh_transformation_orders_to_type_check" CHECK ((to_type = ANY (ARRAY['BREAK_BULK'::text, 'KITTING'::text, 'BUNDLING'::text, 'REPACK'::text])))

);

-- ============================================================================
-- Object:        public.wh_transformation_components
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_transformation_components.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_transformation_components" (

  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               uuid                     NOT NULL,
  "transformation_order_id" uuid                     NOT NULL,
  "inventory_id"            uuid                     NOT NULL,
  "product_sku_id"          uuid                     NOT NULL,
  "planned_quantity"        numeric(15,2),
  "consumed_quantity"       numeric(15,2),
  "status"                  text                     NOT NULL DEFAULT 'RESERVED'::text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_transformation_components_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_transformation_components_status_check" CHECK ((status = ANY (ARRAY['RESERVED'::text, 'CONSUMED'::text])))

);

-- ============================================================================
-- Object:        public.wh_transformation_outputs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_transformation_outputs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_transformation_outputs" (

  "id"                      uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"               uuid                     NOT NULL,
  "transformation_order_id" uuid                     NOT NULL,
  "generated_inventory_id"  uuid                     NOT NULL,
  "product_sku_id"          uuid                     NOT NULL,
  "quantity"                numeric(15,2)            NOT NULL,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_transformation_outputs_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_unloading_sessions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_unloading_sessions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_unloading_sessions" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "receipt_id"     uuid                     NOT NULL,
  "session_number" integer                  NOT NULL,
  "start_time"     timestamp with time zone NOT NULL,
  "end_time"       timestamp with time zone,
  "pause_reason"   text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_unloading_sessions_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_vas_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_vas_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_vas_orders" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "warehouse_id"  uuid                     NOT NULL,
  "vas_number"    text                     NOT NULL,
  "vas_type"      text                     NOT NULL,
  "status"        text                     NOT NULL DEFAULT 'PENDING'::text,
  "bom_id"        uuid,
  "target_sku_id" uuid,
  "target_qty"    numeric(15,2),
  "completed_qty" numeric(15,2)            DEFAULT 0,
  "notes"         text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"    uuid,
  CONSTRAINT "wh_vas_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_vas_orders_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text]))),
  CONSTRAINT "wh_vas_orders_vas_type_check" CHECK ((vas_type = ANY (ARRAY['KITTING'::text, 'BUNDLING'::text, 'REPACKING'::text, 'QC'::text])))

);

-- ============================================================================
-- Object:        public.wh_wa_notifications
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_wa_notifications.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_wa_notifications" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "receipt_id"     uuid                     NOT NULL,
  "receipt_number" text,
  "recipient"      text                     NOT NULL,
  "recipient_name" text,
  "message_type"   text                     NOT NULL,
  "message_body"   text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'SENT'::text,
  "error_message"  text,
  "sent_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_wa_notifications_message_type_check"
    CHECK
    ((message_type = ANY (ARRAY['TRUCK_ARRIVED'::text, 'UNLOADING_START'::text, 'UNLOADING_STOP'::text, 'CHECKING_DONE'::text, 'PUTAWAY_START'::text, 'COMPLETED'::text,
    'DAMAGE_ALERT'::text, 'OTHER'::text]))),
  CONSTRAINT "wh_wa_notifications_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_wa_notifications_status_check" CHECK ((status = ANY (ARRAY['SENT'::text, 'FAILED'::text, 'PENDING'::text])))

);

-- ============================================================================
-- Object:        public.wo_audit_logs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_audit_logs" (

  "id"             bigint                   NOT NULL DEFAULT nextval('public.audit_logs_id_seq'::regclass),
  "tenant_id"      uuid,
  "correlation_id" uuid,
  "entity_type"    text                     NOT NULL,
  "entity_id"      uuid                     NOT NULL,
  "operation"      text                     NOT NULL,
  "old_data"       jsonb,
  "new_data"       jsonb,
  "changed_fields" text[],
  "performed_by"   uuid,
  "performed_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "ip_address"     text,
  "user_agent"     text,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wo_inventory_ledger
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_inventory_ledger" (

  "id"                   bigint                   NOT NULL DEFAULT nextval('public.inventory_ledger_id_seq'::regclass),
  "correlation_id"       uuid                     NOT NULL,
  "tenant_id"            uuid                     NOT NULL,
  "product_sku_id"       uuid                     NOT NULL,
  "warehouse_id"         uuid                     NOT NULL,
  "bin_id"               uuid,
  "movement_type"        text                     NOT NULL,
  "movement_reason"      text,
  "quantity_change"      numeric(15,2)            NOT NULL,
  "quantity_before"      numeric(15,2),
  "quantity_after"       numeric(15,2),
  "batch_number"         text,
  "expiry_date"          date,
  "lot_number"           text,
  "pallet_id"            text,
  "unit_cost"            numeric(15,2),
  "total_cost"           numeric(15,2),
  "source_document_type" text,
  "source_document_id"   uuid,
  "job_order_id"         uuid,
  "job_order_item_id"    uuid,
  "created_by"           uuid,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wo_monitoring_events
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_monitoring_events.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_monitoring_events" (

  "id"                   bigint                   NOT NULL DEFAULT nextval('public.monitoring_events_id_seq'::regclass),
  "tenant_id"            uuid,
  "correlation_id"       uuid,
  "event_type"           text                     NOT NULL,
  "severity"             text                     NOT NULL,
  "source"               text,
  "title"                text                     NOT NULL,
  "description"          text,
  "affected_entity_type" text,
  "affected_entity_id"   uuid,
  "metric_name"          text,
  "metric_value"         numeric(15,2),
  "threshold"            numeric(15,2),
  "payload"              jsonb,
  "is_acknowledged"      boolean                  DEFAULT false,
  "acknowledged_by"      uuid,
  "acknowledged_at"      timestamp with time zone,
  "resolved_at"          timestamp with time zone,
  "created_at"           timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "monitoring_events_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wo_organizations
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_organizations.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_organizations" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "parent_org_id" uuid,
  "code"          text                     NOT NULL,
  "name"          text                     NOT NULL,
  "org_type"      text                     NOT NULL,
  "address"       text,
  "city"          text,
  "province"      text,
  "is_active"     boolean                  NOT NULL DEFAULT true,
  "settings"      jsonb                    DEFAULT '{}'::jsonb,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "org_path"      public.ltree,
  CONSTRAINT "organizations_pkey" PRIMARY KEY (id),
  CONSTRAINT "organizations_tenant_id_code_key" UNIQUE (tenant_id, code)

);

-- ============================================================================
-- Object:        public.wo_organization_users
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_organization_users" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid                     NOT NULL,
  "organization_id"       uuid                     NOT NULL,
  "user_id"               uuid                     NOT NULL,
  "role_code"             text                     NOT NULL,
  "is_primary"            boolean                  DEFAULT false,
  "assigned_warehouse_id" uuid,
  "is_active"             boolean                  NOT NULL DEFAULT true,
  "joined_at"             timestamp with time zone NOT NULL DEFAULT now(),
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "assigned_region_id"    uuid,
  CONSTRAINT "organization_users_organization_id_user_id_role_code_key" UNIQUE (organization_id, user_id, role_code),
  CONSTRAINT "organization_users_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wo_status_history
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_status_history.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_status_history" (

  "id"                         bigint                   NOT NULL DEFAULT nextval('public.status_history_id_seq'::regclass),
  "tenant_id"                  uuid                     NOT NULL,
  "correlation_id"             uuid,
  "entity_type"                text                     NOT NULL,
  "entity_id"                  uuid                     NOT NULL,
  "previous_status"            text,
  "new_status"                 text                     NOT NULL,
  "reason"                     text,
  "performed_by"               uuid,
  "duration_in_previous_state" interval,
  "created_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "status_history_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wo_work_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_work_orders" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "correlation_id"     uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"          uuid                     NOT NULL,
  "originating_org_id" uuid                     NOT NULL,
  "assigned_org_id"    uuid,
  "wo_number"          text                     NOT NULL,
  "wo_type"            text                     NOT NULL,
  "priority"           text                     DEFAULT 'NORMAL'::text,
  "status"             text                     NOT NULL DEFAULT 'DRAFT'::text,
  "reference_type"     text,
  "reference_id"       text,
  "description"        text,
  "notes"              text,
  "requested_by"       uuid,
  "approved_by"        uuid,
  "approved_at"        timestamp with time zone,
  "target_date"        date,
  "completed_at"       timestamp with time zone,
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by"         uuid,
  CONSTRAINT "work_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "work_orders_tenant_id_wo_number_key" UNIQUE (tenant_id, wo_number)

);

-- ============================================================================
-- Object:        public.wo_job_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_job_orders" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "correlation_id"        uuid                     NOT NULL,
  "tenant_id"             uuid                     NOT NULL,
  "work_order_id"         uuid                     NOT NULL,
  "work_order_item_id"    uuid,
  "originating_org_id"    uuid                     NOT NULL,
  "executing_org_id"      uuid                     NOT NULL,
  "assigned_warehouse_id" uuid,
  "jo_number"             text                     NOT NULL,
  "jo_type"               text                     NOT NULL,
  "sequence_order"        integer                  NOT NULL DEFAULT 0,
  "depends_on_jo_id"      uuid,
  "status"                text                     NOT NULL DEFAULT 'PENDING'::text,
  "assigned_to"           uuid,
  "assigned_fleet_id"     uuid,
  "assigned_driver_id"    uuid,
  "scheduled_start"       timestamp with time zone,
  "actual_start"          timestamp with time zone,
  "actual_end"            timestamp with time zone,
  "sla_minutes"           integer,
  "requires_approval"     boolean                  DEFAULT false,
  "approved_by"           uuid,
  "approved_at"           timestamp with time zone,
  "notes"                 text,
  "result"                jsonb                    DEFAULT '{}'::jsonb,
  "metadata"              jsonb                    DEFAULT '{}'::jsonb,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "job_orders_pkey" PRIMARY KEY (id),
  CONSTRAINT "job_orders_tenant_id_jo_number_key" UNIQUE (tenant_id, jo_number)

);

-- ============================================================================
-- Object:        public.wo_job_order_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_job_order_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_job_order_items" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"       uuid                     NOT NULL,
  "tenant_id"          uuid                     NOT NULL,
  "inventory_id"       uuid,
  "product_sku_id"     uuid,
  "from_bin_id"        uuid,
  "to_bin_id"          uuid,
  "requested_quantity" numeric(15,2),
  "actual_quantity"    numeric(15,2),
  "uom"                text                     DEFAULT 'PCS'::text,
  "batch_number"       text,
  "expiry_date"        date,
  "lot_number"         text,
  "pallet_id"          text,
  "is_damaged"         boolean                  DEFAULT false,
  "damage_notes"       text,
  "result"             jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "job_order_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wo_work_order_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_work_order_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_work_order_items" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "work_order_id"      uuid                     NOT NULL,
  "tenant_id"          uuid                     NOT NULL,
  "line_number"        integer                  NOT NULL,
  "product_sku_id"     uuid,
  "item_description"   text,
  "requested_quantity" numeric(15,2),
  "fulfilled_quantity" numeric(15,2)            DEFAULT 0,
  "uom"                text                     DEFAULT 'PCS'::text,
  "from_warehouse_id"  uuid,
  "from_bin_id"        uuid,
  "to_warehouse_id"    uuid,
  "to_bin_id"          uuid,
  "batch_number"       text,
  "expiry_date"        date,
  "unit_cost"          numeric(15,2),
  "metadata"           jsonb                    DEFAULT '{}'::jsonb,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "work_order_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "work_order_items_work_order_id_line_number_key" UNIQUE (work_order_id, line_number)

);

-- ============================================================================
-- Object:        public.wo_workflow_instances
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_workflow_instances.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_workflow_instances" (

  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"           uuid                     NOT NULL,
  "correlation_id"      uuid                     NOT NULL,
  "workflow_name"       text                     NOT NULL,
  "workflow_version"    text                     NOT NULL,
  "trigger_entity_type" text,
  "trigger_entity_id"   uuid,
  "status"              text                     NOT NULL,
  "current_step"        text,
  "steps_completed"     integer                  DEFAULT 0,
  "steps_total"         integer                  DEFAULT 0,
  "context"             jsonb,
  "result"              jsonb,
  "error_message"       text,
  "started_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at"        timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "workflow_instances_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.work_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."work_orders" (

  "id"                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                 uuid                     NOT NULL,
  "wo_number"                 text                     NOT NULL,
  "customer_id"               uuid,
  "order_date"                date,
  "execution_date"            date,
  "execution_time"            text,
  "status"                    text                     NOT NULL DEFAULT 'draft'::text,
  "notes"                     text,
  "transporter_id"            uuid,
  "created_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"                uuid,
  "physical_doc_received"     boolean                  DEFAULT false,
  "physical_doc_files"        jsonb,
  "physical_doc_notes"        text,
  "physical_doc_collected_at" timestamp with time zone,
  "updated_by"                uuid,
  "submitted_at"              timestamp with time zone,
  "assigned_at"               timestamp with time zone,
  "completed_at"              timestamp with time zone,
  "ready_billing_at"          timestamp with time zone,
  "invoiced_at"               timestamp with time zone,
  "paid_at"                   timestamp with time zone,
  "assignment_documents"      jsonb                    DEFAULT '[]'::jsonb,
  "region_id"                 uuid,
  CONSTRAINT "work_orders_pkey1" PRIMARY KEY (id),
  CONSTRAINT "work_orders_tenant_id_wo_number_key1" UNIQUE (tenant_id, wo_number)

);

-- ============================================================================
-- Object:        public.extra_costs
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."extra_costs" (

  "id"              uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "jo_id"           uuid                     NOT NULL,
  "cost_type"       text                     NOT NULL,
  "amount"          numeric                  NOT NULL DEFAULT 0,
  "description"     text,
  "status"          text                     NOT NULL DEFAULT 'pending'::text,
  "is_billable"     boolean                  NOT NULL DEFAULT true,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  "paid_by"         text                     DEFAULT 'driver'::text,
  "paid_to"         text                     DEFAULT 'vendor'::text,
  "paid_by_entity"  text                     DEFAULT 'sbu_trucking'::text,
  "decided_at"      timestamp with time zone,
  "charge_type"     character varying(50)    DEFAULT 'reimbursement'::character varying,
  "rejection_meta"  jsonb,
  "paid_by_sbu"     boolean                  DEFAULT false,
  "tax_id"          uuid,
  "cost_account_id" uuid,
  "wo_id"           uuid,
  "vendor_id"       uuid,
  CONSTRAINT "extra_costs_paid_by_check" CHECK ((paid_by = ANY (ARRAY['driver'::text, 'vendor'::text, 'company'::text]))),
  CONSTRAINT "extra_costs_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.finance_journals
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/finance_journals.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."finance_journals" (

  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id" uuid,
  "journal_date" date                     NOT NULL DEFAULT CURRENT_DATE,
  "reference_no" character varying(50),
  "description"  text,
  "status"       character varying(20)    DEFAULT 'draft'::character varying,
  "created_at"   timestamp with time zone DEFAULT now(),
  "wo_id"        uuid,
  CONSTRAINT "finance_journals_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.finance_journal_entries
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/finance_journal_entries.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."finance_journal_entries" (

  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "journal_id"  uuid,
  "account_id"  uuid,
  "description" text,
  "debit"       numeric                  DEFAULT 0,
  "credit"      numeric                  DEFAULT 0,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "finance_journal_entries_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wo_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_items" (

  "id"                    uuid                        NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid                        NOT NULL,
  "wo_id"                 uuid,
  "item_code"             character varying(150)      NOT NULL,
  "sbu_type"              character varying(20)       NOT NULL,
  "item_data"             jsonb                       NOT NULL DEFAULT '{}'::jsonb,
  "status"                character varying(30)       DEFAULT 'pending'::character varying,
  "created_at"            timestamp with time zone    DEFAULT now(),
  "handover_requested"    boolean                     DEFAULT false,
  "handover_reason"       text,
  "handover_status"       character varying(30)       DEFAULT NULL::character varying,
  "handover_requested_at" timestamp without time zone,
  "max_jo_count"          integer,
  "updated_at"            timestamp with time zone    DEFAULT now(),
  "unit_price"            numeric                     DEFAULT 0,
  "total_revenue"         numeric                     DEFAULT 0,
  "sbu_metadata"          jsonb,
  CONSTRAINT "wo_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "wo_items_tenant_id_item_code_key" UNIQUE (tenant_id, item_code)

);

-- ============================================================================
-- Object:        public.fw_container_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."fw_container_items" (

  "id"                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                 uuid                     NOT NULL,
  "container_assignment_id"   uuid                     NOT NULL,
  "wo_item_id"                uuid                     NOT NULL,
  "volume_cbm"                numeric,
  "gross_weight_kg"           numeric,
  "packages"                  integer,
  "package_type"              text,
  "commodity"                 text,
  "description"               text,
  "delivery_type"             text                     NOT NULL DEFAULT 'P2P'::text,
  "delivery_address"          text,
  "delivery_contact"          text,
  "delivery_phone"            text,
  "pickup_wo_id"              uuid,
  "port_haulage_origin_wo_id" uuid,
  "port_haulage_dest_wo_id"   uuid,
  "last_mile_wo_id"           uuid,
  "price_master_id"           uuid,
  "sell_price_snapshot"       numeric,
  "cogs_pickup"               numeric                  DEFAULT 0,
  "cogs_port_haulage_origin"  numeric                  DEFAULT 0,
  "cogs_ocean_freight"        numeric                  DEFAULT 0,
  "cogs_thc_origin"           numeric                  DEFAULT 0,
  "cogs_thc_dest"             numeric                  DEFAULT 0,
  "cogs_port_haulage_dest"    numeric                  DEFAULT 0,
  "cogs_last_mile"            numeric                  DEFAULT 0,
  "cogs_documentation"        numeric                  DEFAULT 0,
  "cogs_other"                numeric                  DEFAULT 0,
  "goods_received_at"         timestamp with time zone,
  "is_deconsoled"             boolean                  DEFAULT false,
  "deconsoled_at"             timestamp with time zone,
  "created_at"                timestamp with time zone DEFAULT now(),
  "updated_at"                timestamp with time zone DEFAULT now(),
  CONSTRAINT "fw_container_items_delivery_type_check" CHECK ((delivery_type = ANY (ARRAY['D2D'::text, 'P2P'::text, 'D2P'::text, 'P2D'::text]))),
  CONSTRAINT "fw_container_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.job_orders
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."job_orders" (

  "id"                         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"                  uuid                     NOT NULL,
  "wo_item_id"                 uuid                     NOT NULL,
  "jo_number"                  text                     NOT NULL,
  "status"                     text                     DEFAULT 'pending'::text,
  "transporter_id"             uuid,
  "fleet_id"                   uuid,
  "driver_id"                  uuid,
  "is_doc_finished"            boolean                  DEFAULT false,
  "is_cost_finished"           boolean                  DEFAULT false,
  "notes"                      text,
  "created_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  "base_price"                 numeric                  DEFAULT 0,
  "driver_share_percentage"    numeric                  DEFAULT 40.0,
  "purchase_price"             numeric                  DEFAULT 0,
  "vendor_invoice_amount"      numeric                  DEFAULT 0,
  "advance_amount"             numeric                  DEFAULT 0,
  "driver_payment_amount"      numeric                  DEFAULT 0,
  "vendor_id"                  uuid,
  "total_stops"                integer                  DEFAULT 0,
  "tracking_token"             text,
  "driver_phone"               text,
  "estimated_margin"           numeric                  DEFAULT 0,
  "wa_token"                   text,
  "driver_link_token"          text,
  "advance_status"             text                     DEFAULT 'pending'::text,
  "completed_at"               timestamp with time zone,
  "pod_photo_url"              text,
  "pod_status"                 text                     DEFAULT 'pending'::text,
  "advance_receipt_url"        text,
  "driver_revenue_share"       numeric                  DEFAULT 0,
  "driver_payment_status"      text                     DEFAULT 'pending'::text,
  "driver_paid_at"             timestamp with time zone,
  "wa_link_sent_at"            timestamp with time zone,
  "driver_response"            text,
  "transfer_proof_url"         text,
  "physical_doc_files"         jsonb,
  "physical_doc_notes"         text,
  "accepted_at"                timestamp with time zone,
  "started_at"                 timestamp with time zone,
  "loaded_at"                  timestamp with time zone,
  "unloaded_at"                timestamp with time zone,
  "driver_response_at"         timestamp with time zone,
  "rejection_note"             text,
  "cost_account_id"            uuid,
  "updated_by"                 uuid,
  "sbu_type"                   text                     DEFAULT 'TRUCKING'::text,
  "sbu_metadata"               jsonb                    DEFAULT '{}'::jsonb,
  "warehouse_id"               uuid,
  "container_number"           text,
  "assignment_documents"       jsonb                    DEFAULT '[]'::jsonb,
  "assigned_warehouse_id"      uuid,
  "assigned_at"                timestamp with time zone,
  "departure_detected_at"      timestamp with time zone,
  "dispatch_ready_at"          timestamp with time zone,
  "dispatch_ready"             boolean                  DEFAULT false,
  "vendor_tenant_id"           uuid,
  "gps_status"                 character varying(50),
  "device_health"              character varying(50),
  "last_device_health_ping_at" timestamp with time zone,
  CONSTRAINT "job_orders_pkey1" PRIMARY KEY (id),
  CONSTRAINT "job_orders_tenant_id_jo_number_key1" UNIQUE (tenant_id, jo_number)

);

-- ============================================================================
-- Object:        public.ground_assignment_pics
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/ground_assignment_pics.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."ground_assignment_pics" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"  uuid                     NOT NULL,
  "pic1_staff_id" uuid,
  "pic2_staff_id" uuid,
  "assigned_by"   uuid,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "ground_assignment_pics_job_order_id_key" UNIQUE (job_order_id),
  CONSTRAINT "ground_assignment_pics_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.ground_events
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."ground_events" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"      uuid                     NOT NULL,
  "event_type"        character varying(50)    NOT NULL,
  "captured_by"       uuid,
  "captured_by_name"  character varying(255),
  "site_id"           uuid,
  "latitude"          numeric(10,7),
  "longitude"         numeric(10,7),
  "photo_url"         text,
  "ocr_json"          jsonb                    DEFAULT '{}'::jsonb,
  "ocr_confidence"    numeric(5,2),
  "match_method"      character varying(50),
  "matched_entity_id" character varying(255),
  "notes"             text,
  "source"            character varying(50)    DEFAULT 'ground_staff'::character varying,
  "created_at"        timestamp with time zone DEFAULT now(),
  "verification_type" text,
  "verified_against"  text,
  "verified_match"    boolean,
  CONSTRAINT "ground_events_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.ground_documents
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/ground_documents.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."ground_documents" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "ground_event_id" uuid                     NOT NULL,
  "document_type"   character varying(50)    NOT NULL,
  "photo_url"       text                     NOT NULL,
  "ocr_result"      jsonb                    DEFAULT '{}'::jsonb,
  "thumbnail_url"   text,
  "created_at"      timestamp with time zone DEFAULT now(),
  "job_order_id"    uuid,
  "file_url"        text,
  "notes"           text,
  CONSTRAINT "ground_documents_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.invoice_lines
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."invoice_lines" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id"    uuid                     NOT NULL,
  "tenant_id"     uuid,
  "line_type"     text                     NOT NULL DEFAULT 'ritase'::text,
  "job_order_id"  uuid,
  "extra_cost_id" uuid,
  "description"   text                     NOT NULL DEFAULT ''::text,
  "coa_id"        uuid,
  "charge_type"   text                     NOT NULL DEFAULT 'ritase'::text,
  "quantity"      numeric                  NOT NULL DEFAULT 1,
  "unit_amount"   numeric                  NOT NULL DEFAULT 0,
  "amount"        numeric                  NOT NULL DEFAULT 0,
  "sort_order"    integer                  NOT NULL DEFAULT 0,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "invoice_lines_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.job_order_payments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."job_order_payments" (

  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "job_order_id"       uuid                     NOT NULL,
  "payment_type"       text                     NOT NULL,
  "amount"             numeric                  NOT NULL,
  "paid_by"            text                     NOT NULL,
  "paid_by_user"       uuid,
  "paid_at"            timestamp with time zone DEFAULT now(),
  "transfer_proof_url" text,
  "notes"              text,
  "status"             text                     NOT NULL DEFAULT 'paid'::text,
  "verified_by"        uuid,
  "verified_at"        timestamp with time zone,
  "extra_cost_id"      uuid,
  "created_at"         timestamp with time zone DEFAULT now(),
  "updated_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "job_order_payments_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "job_order_payments_paid_by_check" CHECK ((paid_by = ANY (ARRAY['sbu'::text, 'hq'::text]))),
  CONSTRAINT "job_order_payments_payment_type_check"
    CHECK ((payment_type = ANY (ARRAY['advance_driver'::text, 'pelunasan_driver'::text, 'advance_vendor'::text, 'pelunasan_vendor'::text, 'extra_cost'::text]))),
  CONSTRAINT "job_order_payments_pkey" PRIMARY KEY (id),
  CONSTRAINT "job_order_payments_status_check" CHECK ((status = ANY (ARRAY['paid'::text, 'verified'::text])))

);

-- ============================================================================
-- Object:        public.wh_master_boxes
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_master_boxes" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "warehouse_id"      uuid                     NOT NULL,
  "job_order_id"      uuid,
  "master_box_code"   text                     NOT NULL,
  "destination_city"  text                     NOT NULL,
  "consignee_name"    text                     NOT NULL,
  "consignee_address" text,
  "total_parcels"     integer                  DEFAULT 0,
  "total_weight_kg"   numeric(12,2)            DEFAULT 0,
  "total_cbm"         numeric(12,4)            DEFAULT 0,
  "packing_material"  text                     DEFAULT 'Kardus Master L'::text,
  "status"            text                     NOT NULL DEFAULT 'SEALED'::text,
  "notes"             text,
  "created_by"        text,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  "location_id"       uuid,
  CONSTRAINT "wh_master_boxes_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_outbound_shipments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_outbound_shipments" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid                     NOT NULL,
  "warehouse_id"          uuid                     NOT NULL,
  "wo_item_id"            uuid,
  "shipment_number"       text                     NOT NULL,
  "status"                text                     NOT NULL DEFAULT 'PLANNED'::text,
  "transporter_id"        uuid,
  "fleet_id"              uuid,
  "driver_id"             uuid,
  "dispatched_at"         timestamp with time zone,
  "notes"                 text,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"            uuid,
  "surat_jalan_url"       text,
  "bast_url"              text,
  "total_loading_minutes" numeric(10,2),
  "customer_id"           uuid,
  "consignee_id"          uuid,
  "transfer_id"           uuid,
  CONSTRAINT "wh_outbound_shipments_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_outbound_shipments_status_check"
    CHECK
    ((status = ANY (ARRAY['PLANNED'::text, 'PENDING'::text, 'ASSIGNED'::text, 'PICKING'::text, 'PLANNED'::text, 'PENDING'::text, 'ASSIGNED'::text, 'PICKING'::text, 'STAGING'::text,
    'READY_FOR_CHECKING'::text,
    'CHECKING'::text, 'READY_FOR_LOADING'::text, 'TRUCK_ARRIVED'::text, 'LOADING'::text, 'READY_FOR_DOCUMENTS'::text, 'COMPLETED'::text, 'DISPATCHED'::text, 'CANCELLED'::text])))

);

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_jo_staff_assignments" (

  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"     uuid                     NOT NULL,
  "jo_id"         uuid                     NOT NULL,
  "receipt_id"    uuid,
  "shipment_id"   uuid,
  "staff_id"      uuid                     NOT NULL,
  "assigned_role" text                     NOT NULL,
  "status"        text                     NOT NULL DEFAULT 'ASSIGNED'::text,
  "assigned_by"   uuid,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_jo_staff_assignments_assigned_role_check" CHECK ((assigned_role = ANY (ARRAY['SECURITY'::text, 'TALLY'::text, 'PUTAWAY'::text]))),
  CONSTRAINT "wh_jo_staff_assignments_jo_id_staff_id_key" UNIQUE (jo_id, staff_id),
  CONSTRAINT "wh_jo_staff_assignments_pkey" PRIMARY KEY (id),
  CONSTRAINT "wh_jo_staff_assignments_status_check" CHECK ((status = ANY (ARRAY['ASSIGNED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text])))

);

-- ============================================================================
-- Object:        public.wh_loading_sessions
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_loading_sessions.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_loading_sessions" (

  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "shipment_id"    uuid                     NOT NULL,
  "session_number" integer                  NOT NULL,
  "start_time"     timestamp with time zone NOT NULL,
  "end_time"       timestamp with time zone,
  "pause_reason"   text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_loading_sessions_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_outbound_shipment_items
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_outbound_shipment_items.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_outbound_shipment_items" (

  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "shipment_id"     uuid                     NOT NULL,
  "product_sku_id"  uuid                     NOT NULL,
  "requested_qty"   numeric(15,2)            NOT NULL DEFAULT 0,
  "picked_qty"      numeric(15,2)            NOT NULL DEFAULT 0,
  "loaded_qty"      numeric(15,2)            NOT NULL DEFAULT 0,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "picking_entries" jsonb                    DEFAULT '[]'::jsonb,
  "checked_qty"     numeric(15,2)            DEFAULT 0,
  "damage_qty"      numeric(15,2)            DEFAULT 0,
  CONSTRAINT "wh_outbound_shipment_items_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_outbound_damage_records
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_outbound_damage_records.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_outbound_damage_records" (

  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "shipment_item_id" uuid                     NOT NULL,
  "damage_qty"       numeric(15,2)            NOT NULL,
  "damage_source"    text,
  "damage_condition" text,
  "damage_notes"     text,
  "photo_url"        text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wh_outbound_damage_records_damage_condition_check"
    CHECK ((damage_condition = ANY (ARRAY['DAMAGED_PACKAGE_FULL_CONTENT'::text, 'GOOD_PACKAGE_MISSING_CONTENT'::text, 'TOTAL_DAMAGE'::text]))),
  CONSTRAINT "wh_outbound_damage_records_damage_source_check" CHECK ((damage_source = ANY (ARRAY['WAREHOUSE_STAFF'::text, 'PICKING'::text, 'OTHER'::text]))),
  CONSTRAINT "wh_outbound_damage_records_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wh_parcel_inbound
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wh_parcel_inbound" (

  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"         uuid                     NOT NULL,
  "warehouse_id"      uuid                     NOT NULL,
  "customer_id"       uuid,
  "parcel_code"       text                     NOT NULL,
  "shipper_name"      text                     NOT NULL,
  "consignee_name"    text                     NOT NULL,
  "destination_city"  text                     NOT NULL,
  "consignee_address" text,
  "qty"               integer                  DEFAULT 1,
  "weight_kg"         numeric(12,2)            DEFAULT 0,
  "length_cm"         numeric(10,2)            DEFAULT 0,
  "width_cm"          numeric(10,2)            DEFAULT 0,
  "height_cm"         numeric(10,2)            DEFAULT 0,
  "cbm"               numeric(12,4)            DEFAULT 0,
  "location_id"       uuid,
  "status"            text                     NOT NULL DEFAULT 'RECEIVED'::text,
  "master_box_id"     uuid,
  "notes"             text,
  "created_at"        timestamp with time zone DEFAULT now(),
  "updated_at"        timestamp with time zone DEFAULT now(),
  "photo_url"         text,
  "items"             jsonb                    DEFAULT '[]'::jsonb,
  CONSTRAINT "wh_parcel_inbound_pkey" PRIMARY KEY (id)

);

-- ============================================================================
-- Object:        public.wo_item_manifests
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."wo_item_manifests" (


  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "wo_item_id"     uuid                     NOT NULL,
  "tenant_id"      uuid                     NOT NULL,
  "product_sku_id" uuid                     NOT NULL,
  "quantity"       numeric(15,2)            NOT NULL DEFAULT 1,
  "unit_weight_kg" numeric(12,4)            DEFAULT 0,
  "unit_volume_m3" numeric(12,4)            DEFAULT 0,
  "notes"          text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "job_order_id"   uuid,
  "custom_fields"  jsonb                    DEFAULT '{}'::jsonb,
  "total_weight_kg" numeric(15,4) GENERATED ALWAYS AS ((quantity * unit_weight_kg)) STORED,
  "total_volume_m3" numeric(15,4) GENERATED ALWAYS AS ((quantity * unit_volume_m3)) STORED,
  CONSTRAINT "wo_item_manifests_pkey" PRIMARY KEY (id)


);

-- ============================================================================
-- Object:        public.jo_warehouse_assignments
-- Layer:         003 Tables & Sequences
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  none
-- ============================================================================
CREATE TABLE "public"."jo_warehouse_assignments" (

  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id"             uuid                     NOT NULL,
  "job_order_id"          uuid                     NOT NULL,
  "warehouse_location_id" uuid                     NOT NULL,
  "allocated_cbm"         numeric(12,2)            DEFAULT 0,
  "allocated_kg"          numeric(12,2)            DEFAULT 0,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "wo_item_manifest_id"   uuid,
  "quantity"              numeric(15,2)            DEFAULT 0,
  CONSTRAINT "jo_warehouse_assignments_pkey" PRIMARY KEY (id)

);
