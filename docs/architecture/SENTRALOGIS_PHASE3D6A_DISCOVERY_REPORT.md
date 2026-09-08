# SENTRALOGIS — PHASE 3D-6A DISCOVERY REPORT
## Standalone Customs Control Center & PPJK Workbench Architecture
### CEISA 4.0 Preparation Engine & Reusable SKU Intelligence
**Document Version:** 1.0.0-PHASE3D6A-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — WAITING FOR 3D-6A AUTHORIZATION  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. ARCHITECTURAL BASELINE & DISCOVERY FINDINGS

### 1.1 Existing Database Schema (Phase 1 Baseline):
- **`public.cus_declarations` (`20260826_005_customs_declarations_schema.sql`):**
  - Columns: `id`, `tenant_id`, `declaration_number` (26-digit Nomor Pengajuan AJU), `service_request_id`, `work_order_id`, `importer_id`, `ppjk_id`, `declaration_type` (`PIB_IMPORT`, `PEB_EXPORT`, `BC23_TPB`, `BC16_PLB`, `PPFTZ_FTZ`), `customs_office_code`, `billing_code`, `total_duty_and_tax`, `ntpn_payment_ref`, `paid_at`, `channel` (`GREEN`, `YELLOW`, `RED`, `MITA_NON_PRIORITY`, `AEO_PRIORITY`), `sppb_number`, `sppb_date`, `status`, `version_no`, `created_at`, `updated_at`.
  - Protected with Row Level Security (RLS) via `public.get_my_tenant_id()`.
- **`public.cus_classification_lines`:**
  - Columns: `id`, `tenant_id`, `declaration_id`, `item_sequence`, `hs_code`, `goods_description`, `cif_value_usd`, `bm_rate_percent`, `ppn_rate_percent`, `pph_rate_percent`, `calculated_bm_idr`, `calculated_ppn_idr`, `calculated_pph_idr`, `created_at`.
  - Protected with RLS and cascade deletion on declaration drop.
- **`public.svc_service_requests` & `public.event_outbox`:**
  - Cross-domain handoff from Forwarding to Customs using canonical `ServiceRequest` (eliminates Ghost Work Orders).
  - Outbox pattern publishing `customs.declaration.created`, `customs.declaration.status_changed`, `customs.sppb.issued`.

### 1.2 Existing Customs Domain Layer (`lib/domain/customs/*`):
- `types.ts`: Domain models for declarations, classification lines, and tax contexts.
- `tax-calculator.ts`: Deterministic calculation of Nilai Pabean IDR ($CIF \times Kurs\ KMK$), Bea Masuk, Nilai Impor ($Nilai\ Pabean + BM$), PPN ($Nilai\ Impor \times 11\%$), and PPh Pasal 22 ($Nilai\ Impor \times 2.5\%/7.5\%$).
- `state-machine.ts`: 14-state lifecycle state machine enforcing valid customs transitions.
- `declaration-factory.ts` & `sppb-service.ts`: Factory for 26-digit AJU numbers and SPPB release validation.
- `declaration-repository.ts` & `customs-service.ts`: Repository and application service facade.

---

# 2. IDENTIFIED GAPS IN PPJK & CEISA 4.0 PREPARATION

| Domain Area | Current Baseline | Operational Bottleneck | Required Target Architecture |
| :--- | :--- | :--- | :--- |
| **Line-Item Richness** | Only stores `hs_code`, `goods_description`, and `cif_value_usd`. | Cannot support real commercial invoices with SKU codes, quantities, UOMs, unit prices, country of origin, brands, models, and invoice cross-references. | Expand `cus_classification_lines` with full item attributes (`sku_code`, `brand`, `model`, `item_quantity`, `uom_code`, `unit_price_usd`, `fob_value_usd`, `freight_usd`, `insurance_usd`, `country_of_origin`, `manufacturer_name`, `supplier_name`, `invoice_number`, `validation_status`, `validation_errors`). |
| **SKU Intelligence & Product Memory** | None. Every declaration requires re-typing descriptions and re-searching HS codes. | Extreme operator fatigue on repeating import shipments (e.g. BYD automotive parts or electronics with 500+ repeating SKUs). | Implement `cus_sku_intelligence` master product memory catalog. Automatically matches incoming SKUs, suggests historical HS classifications with confidence scores and rationale (*"Enter Once, Validate Once, Reuse Many Times"*). |
| **Tariff Master (BTKI)** | Hard-coded / ad-hoc manual entry. | Risk of typing invalid non-existent 8-digit HS codes or outdated duty rates. | Implement `md_customs_hs_codes` (BTKI 8-digit tariff reference) storing Indonesian/English descriptions, default BM/PPN/PPh rates, and Lartas flags. |
| **Bulk Item Operations** | Single line manual entry only. | Importing 100 to 1,000+ items per invoice is impossible via individual row clicks. | Build server-side `ItemImportService` supporting Excel/CSV ingestion with column auto-mapping, duplicate SKU detection, SKU master matching, and bulk validation preview. |
| **Document Ingestion** | No declaration-level document tracking. | No audit linkage between declaration lines and commercial documents (Invoice, Packing List, B/L, COO Form D/E, MSDS). | Implement `cus_declaration_documents` table tracking document metadata, verification status, and line references. |
| **Pre-Submission Validation** | Basic status checks only. | Errors detected only after submission to customs, causing costly rejections and rework. | Implement multi-tier `CustomsValidationEngine` (`ERROR`, `WARNING`, `INFO`) checking mandatory fields, price anomalies ($>100\%$ historical variance), duplicate SKUs, and Lartas permit requirements. |
| **CEISA 4.0 Preparation** | None. | Manual re-entry of data into CEISA 4.0 portal without pre-flight validation. | Implement `CeisaPreparationService` generating structured CEISA 4.0 draft datasets, readiness matrix, printable verification sheets, and official response logging. |
| **Classification Provenance** | Unrecorded. | No audit trail of who changed an HS code and why. | Implement `cus_item_audit_logs` tracking who, when, what changed, before/after values, and justification. |
| **User Interface** | Placeholder page at `/sbu/clearance`. | No dedicated PPJK workbench. | Build High-Performance Spreadsheet Item Grid (virtualized for 1,000+ rows, keyboard navigation, copy/paste, bulk actions) and Customs Control Center. |

---

# 3. PROPOSED CANONICAL SCHEMA EXTENSIONS (PHASE 3D-6A)

### 3.1 Migration File: `supabase/migrations/20260826_008_ppjk_workbench_schema.sql`

```sql
-- ============================================================================
-- Migration: 20260826_008_ppjk_workbench_schema.sql
-- Description: PPJK Workbench, SKU Intelligence, BTKI Tariff & Document Ingestion
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 3D-6)
-- ============================================================================

-- 1. md_customs_hs_codes (Indonesian BTKI 8-Digit Tariff Master Reference)
CREATE TABLE IF NOT EXISTS public.md_customs_hs_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_code VARCHAR(12) NOT NULL UNIQUE, -- Format: 8504.40.30 or 8703.80.19
  description_id TEXT NOT NULL,
  description_en TEXT,
  chapter VARCHAR(4) NOT NULL,
  heading VARCHAR(6) NOT NULL,
  subheading VARCHAR(8) NOT NULL,
  default_bm_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  default_ppn_rate NUMERIC(5, 2) NOT NULL DEFAULT 11,
  default_pph_rate NUMERIC(5, 2) NOT NULL DEFAULT 2.5,
  is_lartas BOOLEAN NOT NULL DEFAULT false,
  lartas_permit_type TEXT, -- e.g. 'LS' (Laporan Surveyor), 'PI' (Persetujuan Impor)
  uom_primary VARCHAR(10) NOT NULL DEFAULT 'PCE',
  effective_from DATE NOT NULL DEFAULT '2026-01-01',
  effective_to DATE,
  version_tag VARCHAR(20) NOT NULL DEFAULT 'BTKI-2026',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. cus_sku_intelligence (Master Product Memory & Historical Classification Catalog)
CREATE TABLE IF NOT EXISTS public.cus_sku_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  importer_id UUID NOT NULL REFERENCES public.md_entities(id),
  sku_code TEXT NOT NULL,
  internal_code TEXT,
  product_name TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  specification TEXT,
  material TEXT,
  function_use TEXT,
  country_of_origin VARCHAR(2) NOT NULL DEFAULT 'CN',
  preferred_uom VARCHAR(10) NOT NULL DEFAULT 'PCE',
  suggested_hs_code VARCHAR(12),
  classification_confidence NUMERIC(3, 2) DEFAULT 1.00,
  classification_rationale TEXT,
  classification_source VARCHAR(30) NOT NULL DEFAULT 'HISTORICAL_IMPORT',
  last_used_declaration_id UUID REFERENCES public.cus_declarations(id) ON DELETE SET NULL,
  average_unit_price_usd NUMERIC(14, 4),
  total_declarations_count INTEGER NOT NULL DEFAULT 1,
  review_status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED', -- 'SUGGESTED', 'VERIFIED', 'REQUIRES_REVIEW'
  reviewed_by UUID,
  last_reviewed_at TIMESTAMPTZ,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cus_sku_tenant_importer UNIQUE (tenant_id, importer_id, sku_code)
);

-- 3. Expansion of cus_classification_lines (Item-Level Declaration Data)
ALTER TABLE public.cus_classification_lines
  ADD COLUMN IF NOT EXISTS sku_code TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS item_quantity NUMERIC(14, 4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS uom_code VARCHAR(10) NOT NULL DEFAULT 'PCE',
  ADD COLUMN IF NOT EXISTS unit_price_usd NUMERIC(14, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fob_value_usd NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS freight_usd NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_usd NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(2) NOT NULL DEFAULT 'CN',
  ADD COLUMN IF NOT EXISTS manufacturer_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_line_no INTEGER,
  ADD COLUMN IF NOT EXISTS classification_source VARCHAR(30) DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) NOT NULL DEFAULT 'VALID',
  ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb;

-- 4. cus_declaration_documents (Supporting Customs Document Ingestion)
CREATE TABLE IF NOT EXISTS public.cus_declaration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL, -- INVOICE, PACKING_LIST, BL_AWB, COO_FORM_D, COO_FORM_E, SPEC, MSDS, PERMIT
  document_number TEXT NOT NULL,
  document_date DATE,
  file_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  extracted_items_count INTEGER DEFAULT 0,
  parsing_confidence NUMERIC(3, 2),
  review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, VERIFIED, REJECTED
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. cus_item_audit_logs (Immutable Classification & Value Provenance)
CREATE TABLE IF NOT EXISTS public.cus_item_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  line_id UUID REFERENCES public.cus_classification_lines(id) ON DELETE SET NULL,
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Indexes & RLS Policies
CREATE INDEX IF NOT EXISTS idx_cus_sku_tenant_importer ON public.cus_sku_intelligence(tenant_id, importer_id);
CREATE INDEX IF NOT EXISTS idx_cus_sku_code ON public.cus_sku_intelligence(sku_code);
CREATE INDEX IF NOT EXISTS idx_cus_hs_code ON public.md_customs_hs_codes(hs_code);
CREATE INDEX IF NOT EXISTS idx_cus_doc_dec ON public.cus_declaration_documents(declaration_id);
CREATE INDEX IF NOT EXISTS idx_cus_audit_dec ON public.cus_item_audit_logs(declaration_id);

ALTER TABLE public.cus_sku_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_declaration_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_item_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.md_customs_hs_codes ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation RLS Policies
CREATE POLICY cus_sku_tenant_isolation ON public.cus_sku_intelligence
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY cus_docs_tenant_isolation ON public.cus_declaration_documents
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY cus_audit_tenant_isolation ON public.cus_item_audit_logs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Global Shared Tariff Reference (Read-Only to Authenticated)
CREATE POLICY md_customs_hs_codes_read_all ON public.md_customs_hs_codes
  FOR SELECT TO authenticated
  USING (true);
```

---

# 4. SUB-PHASE IMPLEMENTATION SEQUENCE

1. **3D-6A: Database Schema & Migration**
   - Execute migration script `supabase/migrations/20260826_008_ppjk_workbench_schema.sql`.
   - Seed BTKI 8-digit tariff catalog with Indonesian customs references.
   - Verify RLS tenant isolation policies.
2. **3D-6B: Customs Domain Engines (`lib/domain/customs/`)**
   - `ItemImportService.ts` (Batch normalization, duplicate detection, master matching).
   - `SkuIntelligenceService.ts` (Product memory retrieval, historical suggestion, confidence scoring).
   - `CustomsValidationEngine.ts` (Pre-submission multi-tier rules: `ERROR`, `WARNING`, `INFO`).
   - `CeisaPreparationService.ts` (Readiness matrix, structured export draft, human review checklist).
3. **3D-6C: REST API Gateway (`app/api/v1/customs/*`)**
   - `/api/v1/customs/declarations/[id]/items/bulk` (`POST` / `PATCH`)
   - `/api/v1/customs/declarations/[id]/validate` (`POST`)
   - `/api/v1/customs/declarations/[id]/ceisa-preview` (`GET`)
   - `/api/v1/customs/sku-intelligence` (`GET` / `POST`)
   - `/api/v1/customs/hs-lookup` (`GET`)
   - `/api/v1/customs/declarations/[id]/documents` (`GET` / `POST`)
4. **3D-6D: Standalone Customs Control Center (`/sbu/clearance` & `/sbu/customs`)**
   - Command Strip KPIs (Active Declarations, Review Queue, Errors, CEISA Ready, Channel, SPPB).
   - Filterable Operational Work Queues.
5. **3D-6E: High-Performance PPJK Item Grid & Bulk Operations UI**
   - Virtualized spreadsheet grid supporting 1,000+ items with keyboard navigation (*Tab, Enter, Arrows*), copy/paste, and inline editing.
   - Bulk Import Wizard with column auto-mapping and validation preview.
6. **3D-6F: HS Classification Workbench & Reusable SKU Intelligence UI**
   - Real-time BTKI HS Code lookup, historical classification comparison, and override audit trail.
7. **3D-6G: CEISA 4.0 Preparation & Validation Panel**
   - Readiness checklist, pre-submission error diagnostics, and official response recording.
8. **3D-6H: Acceptance Testing & Regression Validation**
   - 30 acceptance test scenarios covering all PPJK workbench capabilities.

---

# 5. PRODUCTION SAFETY GATES VERIFICATION

- **CEISA 4.0 Compliance:** Zero scraping, zero unauthorized bot automation, 100% human-in-the-loop review.
- **Direct Database Mutation:** Strictly **0** `supabase.from` calls in browser components.
- **Frozen Execution Domains:** 100% untouched Driver PWA, Android GPS service, and mature Trucking domain (`job_orders`, `job_routes`, `job_tracking`, `data_armada`, `data_driver`).
- **Coexistence:** Legacy Forwarding UI (`/sbu/forwarding/wo/*`) remains fully functional.

---
*Discovery report finalized. Awaiting explicit authorization to begin Sub-Phase 3D-6A.*
