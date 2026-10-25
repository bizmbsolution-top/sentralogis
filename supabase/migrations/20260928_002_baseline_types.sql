-- ============================================================================
-- SENTRALOGIS MODULAR LAYERED BASELINE MIGRATION
-- Layer:         002 Types / Enums
-- Architecture:  D8-02 Option B2 / D8-30 Ratified
-- Baseline:      9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999
-- Generation:    Deterministic Static Formation (Delivery Unit 2 / D8-33)
-- Total Objects: 28
-- Description:   User-defined composite types and enums
-- ============================================================================
-- ============================================================================
-- Object:        public.com_accounting_event_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_accounting_event_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_accounting_event_status" AS ENUM (
  'DRAFT',
  'VALIDATED',
  'DISPATCHED',
  'ACKNOWLEDGED',
  'REJECTED',
  'FAILED'
);

GRANT USAGE ON TYPE "public"."com_accounting_event_status" TO "postgres";

-- ============================================================================
-- Object:        public.com_accounting_event_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_accounting_event_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_accounting_event_type" AS ENUM (
  'INVOICE_ISSUED',
  'INVOICE_ADJUSTED',
  'INVOICE_REVERSED',
  'AR_PAYMENT_APPLIED',
  'AR_PAYMENT_REVERSED',
  'AP_BILL_RECORDED',
  'AP_BILL_ADJUSTED',
  'AP_BILL_REVERSED',
  'AP_PAYMENT_APPLIED',
  'AP_PAYMENT_REVERSED',
  'SETTLEMENT_COMPLETED',
  'SETTLEMENT_REVERSED',
  'ADJUSTMENT',
  'REVERSAL'
);

GRANT USAGE ON TYPE "public"."com_accounting_event_type" TO "postgres";

-- ============================================================================
-- Object:        public.com_allocation_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_allocation_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_allocation_status" AS ENUM (
  'PENDING',
  'ALLOCATED',
  'SETTLED',
  'REVERSED'
);

GRANT USAGE ON TYPE "public"."com_allocation_status" TO "postgres";

-- ============================================================================
-- Object:        public.com_fin_adjustment_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_fin_adjustment_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_fin_adjustment_type" AS ENUM (
  'CREDIT_NOTE',
  'DEBIT_NOTE',
  'REVERSAL',
  'WRITE_OFF',
  'PRICE_CORRECTION'
);

GRANT USAGE ON TYPE "public"."com_fin_adjustment_type" TO "postgres";

-- ============================================================================
-- Object:        public.com_fin_ar_ap_side
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_fin_ar_ap_side.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_fin_ar_ap_side" AS ENUM (
  'AR',
  'AP'
);

GRANT USAGE ON TYPE "public"."com_fin_ar_ap_side" TO "postgres";

-- ============================================================================
-- Object:        public.com_fin_ar_ap_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_fin_ar_ap_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_fin_ar_ap_status" AS ENUM (
  'PENDING',
  'INVOICED',
  'PARTIAL_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'WRITTEN_OFF'
);

GRANT USAGE ON TYPE "public"."com_fin_ar_ap_status" TO "postgres";

-- ============================================================================
-- Object:        public.com_fin_billable_event_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_fin_billable_event_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_fin_billable_event_status" AS ENUM (
  'PENDING',
  'INVOICED',
  'CANCELLED'
);

GRANT USAGE ON TYPE "public"."com_fin_billable_event_status" TO "postgres";

-- ============================================================================
-- Object:        public.com_incoterm_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_incoterm_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_incoterm_type" AS ENUM (
  'EXW',
  'FCA',
  'FAS',
  'FOB',
  'CFR',
  'CIF',
  'CPT',
  'CIP',
  'DAP',
  'DPU',
  'DDP'
);

GRANT USAGE ON TYPE "public"."com_incoterm_type" TO "postgres";

-- ============================================================================
-- Object:        public.com_payment_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_payment_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_payment_status" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'ALLOCATED',
  'COMPLETED',
  'CANCELLED',
  'REVERSED'
);

GRANT USAGE ON TYPE "public"."com_payment_status" TO "postgres";

-- ============================================================================
-- Object:        public.com_pricing_rate_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_pricing_rate_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_pricing_rate_status" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'SUPERSEDED',
  'INACTIVE'
);

GRANT USAGE ON TYPE "public"."com_pricing_rate_status" TO "postgres";

COMMENT ON TYPE "public"."com_pricing_rate_status" IS '5C-1/ADR-058: Pricing rate version status. DRAFT=not yet active; ACTIVE=currently applicable; SUPERSEDED=replaced by newer version; INACTIVE=manually retired.';

-- ============================================================================
-- Object:        public.com_pricing_side
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_pricing_side.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_pricing_side" AS ENUM (
  'SELL',
  'BUY'
);

GRANT USAGE ON TYPE "public"."com_pricing_side" TO "postgres";

COMMENT ON TYPE "public"."com_pricing_side" IS '5C-1/ADR-060: Pricing side. SELL=customer-facing revenue; BUY=supplier/procurement cost.';

-- ============================================================================
-- Object:        public.com_reconciliation_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_reconciliation_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_reconciliation_status" AS ENUM (
  'UNMATCHED',
  'MATCHED',
  'PARTIAL',
  'REVERSED'
);

GRANT USAGE ON TYPE "public"."com_reconciliation_status" TO "postgres";

-- ============================================================================
-- Object:        public.com_sales_order_line_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_sales_order_line_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_sales_order_line_status" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'CANCELLED',
  'SUPERSEDED'
);

GRANT USAGE ON TYPE "public"."com_sales_order_line_status" TO "postgres";

COMMENT ON TYPE "public"."com_sales_order_line_status" IS '5C-3/ADR-061: SO line item lifecycle. DRAFT=editable; ACTIVE=committed; CANCELLED=voided (audit preserved); SUPERSEDED=replaced by amendment.';

-- ============================================================================
-- Object:        public.com_sales_order_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_sales_order_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_sales_order_status" AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'IN_FULFILLMENT',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'CLOSED',
  'CANCELLED'
);

GRANT USAGE ON TYPE "public"."com_sales_order_status" TO "postgres";

-- ============================================================================
-- Object:        public.com_settlement_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_settlement_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_settlement_status" AS ENUM (
  'OPEN',
  'PARTIAL',
  'SETTLED',
  'REVERSED'
);

GRANT USAGE ON TYPE "public"."com_settlement_status" TO "postgres";

-- ============================================================================
-- Object:        public.com_work_order_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/com_work_order_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."com_work_order_status" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'CONFIRMED',
  'IN_EXECUTION',
  'FULFILLED',
  'BILLED',
  'CLOSED',
  'CANCELLED'
);

GRANT USAGE ON TYPE "public"."com_work_order_status" TO "postgres";

-- ============================================================================
-- Object:        public.crm_activity_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/crm_activity_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."crm_activity_type" AS ENUM (
  'CALL',
  'MEETING',
  'WHATSAPP',
  'EMAIL',
  'NOTE'
);

GRANT USAGE ON TYPE "public"."crm_activity_type" TO "postgres";

-- ============================================================================
-- Object:        public.crm_deal_stage
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/crm_deal_stage.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."crm_deal_stage" AS ENUM (
  'PROSPECTING',
  'NEGOTIATION',
  'QUOTATION',
  'WON',
  'LOST'
);

GRANT USAGE ON TYPE "public"."crm_deal_stage" TO "postgres";

-- ============================================================================
-- Object:        public.crm_fee_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/crm_fee_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."crm_fee_type" AS ENUM (
  'NOMINAL',
  'PERCENTAGE'
);

GRANT USAGE ON TYPE "public"."crm_fee_type" TO "postgres";

-- ============================================================================
-- Object:        public.crm_lead_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/crm_lead_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."crm_lead_status" AS ENUM (
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'UNQUALIFIED'
);

GRANT USAGE ON TYPE "public"."crm_lead_status" TO "postgres";

-- ============================================================================
-- Object:        public.cus_channel_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/cus_channel_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."cus_channel_type" AS ENUM (
  'GREEN',
  'YELLOW',
  'RED',
  'PRIORITY'
);

GRANT USAGE ON TYPE "public"."cus_channel_type" TO "postgres";

-- ============================================================================
-- Object:        public.cus_declaration_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/cus_declaration_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."cus_declaration_type" AS ENUM (
  'PIB_IMPORT',
  'PEB_EXPORT',
  'TPB_BC23',
  'TRANSIT_BC12'
);

GRANT USAGE ON TYPE "public"."cus_declaration_type" TO "postgres";

-- ============================================================================
-- Object:        public.fin_transaction_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/fin_transaction_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."fin_transaction_type" AS ENUM (
  'REVENUE',
  'OPERATIONAL_COGS',
  'PASS_THROUGH_DISBURSEMENT'
);

GRANT USAGE ON TYPE "public"."fin_transaction_type" TO "postgres";

-- ============================================================================
-- Object:        public.shp_execution_provider_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/shp_execution_provider_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."shp_execution_provider_type" AS ENUM (
  'INTERNAL_SBU',
  'EXTERNAL_VENDOR'
);

GRANT USAGE ON TYPE "public"."shp_execution_provider_type" TO "postgres";

-- ============================================================================
-- Object:        public.shp_global_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/shp_global_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."shp_global_status" AS ENUM (
  'DRAFT',
  'PLANNED',
  'BOOKED',
  'IN_TRANSIT',
  'AT_INTERMEDIATE_NODE',
  'CUSTOMS_HOLD',
  'CUSTOMS_RELEASED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'EXCEPTION_HOLD',
  'CANCELLED'
);

GRANT USAGE ON TYPE "public"."shp_global_status" TO "postgres";

-- ============================================================================
-- Object:        public.shp_transport_mode
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/shp_transport_mode.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."shp_transport_mode" AS ENUM (
  'ROAD_TRUCK',
  'OCEAN_VESSEL',
  'BARGE',
  'AIR_FREIGHT',
  'RAIL_FREIGHT',
  'PORT_TERMINAL_HANDLING',
  'WAREHOUSE_STAGING',
  'CUSTOMS_CLEARANCE'
);

GRANT USAGE ON TYPE "public"."shp_transport_mode" TO "postgres";

-- ============================================================================
-- Object:        public.shp_unit_type
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/shp_unit_type.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."shp_unit_type" AS ENUM (
  'CONTAINER',
  'BULK_MT',
  'BREAKBULK',
  'PALLET',
  'BOX',
  'VEHICLE',
  'TANK'
);

GRANT USAGE ON TYPE "public"."shp_unit_type" TO "postgres";

-- ============================================================================
-- Object:        public.svc_request_status
-- Layer:         002 Types / Enums
-- Source:        supabase/schemas/public/types/svc_request_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE TYPE "public"."svc_request_status" AS ENUM (
  'ISSUED',
  'ACKNOWLEDGED',
  'ACCEPTED',
  'REJECTED',
  'EXECUTING',
  'FULFILLED',
  'REROUTING',
  'CANCELLED'
);

GRANT USAGE ON TYPE "public"."svc_request_status" TO "postgres";
