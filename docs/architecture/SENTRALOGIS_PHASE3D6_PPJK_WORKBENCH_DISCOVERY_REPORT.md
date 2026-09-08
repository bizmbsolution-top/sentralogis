# SENTRALOGIS — PHASE 3D-6 DISCOVERY REPORT
## Standalone Customs Control Center & PPJK Workbench Architecture
### CEISA 4.0 Preparation Engine & Reusable SKU Intelligence
**Document Version:** 1.0.0-PHASE3D6-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — WAITING FOR AUTHORIZATION  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. EXECUTIVE SUMMARY & BUSINESS CONTEXT

In Indonesian freight forwarding and logistics, **PPJK (Pengusaha Pengurusan Jasa Kepabeanan)** operations represent the primary operational and compliance bottleneck. A single import declaration (PIB / BC 2.0 / BC 2.3 / BC 1.6) or export declaration (PEB / BC 3.0) frequently contains **dozens, hundreds, or even thousands of commercial invoice lines (SKUs)**, each requiring:
- Precise 8-digit **HS Code classification** under the Indonesian Customs Tariff Book (BTKI - Buku Tarif Kepabeanan Indonesia),
- Verification of **Lartas (Larangan dan Pembatasan)** and trade permits via INSW (Indonesia National Single Window),
- Item-level **CIF valuation** and multi-component tax computation (Bea Masuk, PPN, PPh Pasal 22 Import, Bea Masuk Anti Dumping/Safeguard where applicable),
- Alignment with supporting commercial documents (Commercial Invoice, Packing List, Bill of Lading / AWB, Certificate of Origin / Form D/E/AK, etc.),
- Preparation of strict, error-free declaration data for **CEISA 4.0 (Customs-Excise Information System and Automation 4.0)**.

The objective of **Phase 3D-6** is NOT to create a simple CRUD customs module, but to build a **high-throughput, spreadsheet-efficient PPJK Operator Workbench and Customs Control Center** founded on the core design principle:

> **"ENTER ONCE, REUSE MANY TIMES."**  
> Commercial Invoice / Packing List $\rightarrow$ Ingestion & Normalization $\rightarrow$ SKU Master Matching $\rightarrow$ Reusable HS Classification $\rightarrow$ PPJK Human-in-the-Loop Review $\rightarrow$ Pre-Submission Customs Validation $\rightarrow$ CEISA 4.0 Preparation $\rightarrow$ Channel & SPPB Release Monitoring.

---

# 2. CURRENT REPOSITORY AUDIT & CAPABILITIES INVENTORY

### 2.1 Existing Customs Domain Layer (`lib/domain/customs/*`):
- `types.ts`: Defines `CustomsDeclaration` and basic `CustomsClassificationLine`.
- `tax-calculator.ts`: Implements canonical Indonesian import tax calculations (Nilai Pabean IDR = CIF USD $\times$ Kurs KMK; Bea Masuk = Nilai Pabean $\times$ BM%; Nilai Impor = Nilai Pabean + Bea Masuk; PPN = Nilai Impor $\times$ 11%; PPh 22 = Nilai Impor $\times$ 2.5%/7.5%).
- `state-machine.ts`: Implements strict 14-state declaration lifecycle transitions (`DRAFT` $\rightarrow$ `DOCUMENTS_PENDING` $\rightarrow$ `READY_FOR_CLASSIFICATION` $\rightarrow$ `CLASSIFIED` $\rightarrow$ `READY_FOR_SUBMISSION` $\rightarrow$ `SUBMITTED` $\rightarrow$ `ACCEPTED` $\rightarrow$ `CHANNEL_ASSIGNED` $\rightarrow$ `INSPECTION_REQUIRED` / `DOCUMENT_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `SPPB_PENDING` $\rightarrow$ `RELEASED` $\rightarrow$ `COMPLETED`).
- `declaration-factory.ts` & `sppb-service.ts`: Generates 26-digit Nomor Pengajuan (`AJU-XXXXXX-YYYYMMDD-XXXXXX`) and validates SPPB release prerequisites.
- `declaration-repository.ts` & `customs-service.ts`: Aggregate repository and application service facade.

### 2.2 Existing Database Schema (Phase 1 Baseline):
- `public.cus_declarations`: Primary table for declaration header, tenant isolation, billing codes, NTPN payment references, channel, and SPPB.
- `public.cus_classification_lines`: Basic line-item table storing `hs_code`, `goods_description`, `cif_value_usd`, `bm_rate_percent`, `ppn_rate_percent`, `pph_rate_percent`, and calculated taxes in IDR.
- `public.svc_service_requests`: Cross-domain service contract table connecting Forwarding shipments to Customs clearance without ghost work orders.

### 2.3 Existing REST APIs (`app/api/v1/customs/declarations/*`):
- `GET / POST /api/v1/customs/declarations`
- `GET / PATCH / DELETE /api/v1/customs/declarations/[id]`
- `POST /api/v1/customs/declarations/[id]/classification`
- `PATCH / DELETE /api/v1/customs/declarations/[id]/classification/[lineId]`
- `POST /api/v1/customs/declarations/[id]/calculate-tax`
- `POST /api/v1/customs/declarations/[id]/channel`
- `POST /api/v1/customs/declarations/[id]/sppb`
- `GET /api/v1/customs/declarations/[id]/timeline`

---

# 3. GAP ANALYSIS: MISSING PPJK WORKBENCH CAPABILITIES

To transform this baseline into a production-grade PPJK Workbench, the following structural gaps must be resolved:

| Area | Current Baseline | Required Target for Phase 3D-6 PPJK Workbench |
| :--- | :--- | :--- |
| **Line Item Details** | Only stores `hs_code`, `goods_description`, `cif_value_usd`, tax rates. | **Full SKU Attributes:** `sku_code`, `brand`, `model`, `quantity`, `uom_code` (PCE, KGM, CBM, etc.), `unit_price_usd`, `country_of_origin`, `manufacturer`, `supplier`, `invoice_no`, `validation_status`, `historical_hs_code`, `classification_source`. |
| **Reusable SKU Intelligence** | Non-existent. Each declaration requires retyping descriptions and HS codes. | **`cus_sku_intelligence` Catalog:** Master product repository per tenant/importer. Reuses historical classifications, rationales, and BTKI tariff mappings across declarations. |
| **BTKI HS Master Tariff** | Hard-coded / manual entry. | **`md_customs_hs_codes` (BTKI 8-digit catalog):** Official 8-digit tariff reference with Indonesian/English descriptions, default BM/PPN/PPh rates, and Lartas flags. |
| **Bulk Item Operations** | One-by-one manual line insertion. | **Bulk Import Engine (Excel / CSV / JSON):** Column mapping, normalization, duplicate SKU detection, automatic master matching, and bulk preview before commit. |
| **Document Evidence** | No declaration-level document tracking. | **`cus_declaration_documents`:** Ingestion of Invoice, Packing List, B/L, COO, Specs, and MSDS linked directly to line items. |
| **Customs Pre-Validation** | Basic state check only. | **Multi-tier Validation Engine (`ERROR`, `WARNING`, `INFO`):** Blocks missing HS/Qty/Origin, detects duplicate SKUs, flags Lartas requirements, and highlights price variances. |
| **CEISA 4.0 Preparation** | None. | **CEISA 4.0 Preparation Engine:** Structured export payload preview, printable review sheets, readiness checklists, and status tracking. |
| **UI Workspaces** | Placeholder page at `/sbu/clearance`. | **High-Performance Item Grid & Control Center:** Virtualized/paginated spreadsheet grid with inline editing, keyboard navigation, queue filters, and KPI dashboard. |

---

# 4. CRITICAL SAFETY & COMPLIANCE BOUNDARY (CEISA 4.0)

> [!CAUTION]
> **STRICT COMPLIANCE DIRECTIVE:**
> - Sentralogis MUST NOT attempt to bypass, scrape, reverse engineer, or execute unauthorized automated bot submissions to CEISA 4.0.
> - Sentralogis acts as the **PPJK's Operational Intelligence & Preparation Layer**, preparing 100% clean, validated, and structured declaration datasets.
> - Official CEISA integration occurs exclusively through authorized, officially supported channels, structured file exports (EDI/XML), or human-in-the-loop review.

---

# 5. RECOMMENDED DATA MODEL EXPANSION

### 5.1 New Canonical Schema Objects (Non-destructive Migration):

1. **`cus_sku_intelligence` (Master Product Knowledge Base):**
   ```sql
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
     country_of_origin VARCHAR(2) NOT NULL, -- ISO 2-letter e.g. CN, JP, DE
     default_uom VARCHAR(10) NOT NULL DEFAULT 'PCE',
     suggested_hs_code VARCHAR(12),
     classification_confidence NUMERIC(3, 2) DEFAULT 1.00,
     classification_rationale TEXT,
     classification_source VARCHAR(30) DEFAULT 'HISTORICAL_IMPORT',
     last_used_declaration_id UUID,
     effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     CONSTRAINT uq_cus_sku_importer UNIQUE (tenant_id, importer_id, sku_code)
   );
   ```

2. **Expanded `cus_classification_lines` (Item-Level Declaration Data):**
   ```sql
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
   ```

3. **`cus_declaration_documents` (Supporting Document Ingestion & Verification):**
   ```sql
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
   ```

4. **`md_customs_hs_codes` (BTKI Indonesian Tariff Master):**
   ```sql
   CREATE TABLE IF NOT EXISTS public.md_customs_hs_codes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     hs_code VARCHAR(12) NOT NULL UNIQUE, -- e.g. 8703.80.19 (Electric Vehicles CBU)
     description_id TEXT NOT NULL,
     description_en TEXT,
     default_bm_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
     default_ppn_rate NUMERIC(5, 2) NOT NULL DEFAULT 11,
     default_pph_rate NUMERIC(5, 2) NOT NULL DEFAULT 2.5,
     is_lartas BOOLEAN NOT NULL DEFAULT false,
     lartas_permit_type TEXT, -- e.g. LS (Laporan Surveyor), Persetujuan Impor (PI), etc.
     uom_primary VARCHAR(10) NOT NULL DEFAULT 'PCE',
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```

---

# 6. PROPOSED PPJK WORKBENCH USER EXPERIENCE & WORKFLOW

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 01. INGESTION & NORMALIZATION                                                          │
│ - Upload Commercial Invoice & Packing List (Excel / CSV / Document)                     │
│ - Column Auto-Mapping & Missing-Field Detection (Qty, Unit Price, UOM, Country Origin) │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 02. REUSABLE SKU & HS CLASSIFICATION INTELLIGENCE                                      │
│ - Instant match with `cus_sku_intelligence` master catalog                             │
│ - Suggested HS candidate with confidence score & historical rationale                  │
│ - Professional PPJK Override & One-Click "Save to SKU Master"                          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 03. HIGH-PERFORMANCE SPREADSHEET ITEM GRID                                             │
│ - Virtualized table supporting 1,000+ items with zero browser lag                      │
│ - Keyboard shortcuts (Tab, Arrows, Enter), inline editing, and bulk batch actions     │
│ - Real-time line-by-line tax calculation (BM + PPN + PPh 22)                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 04. PRE-SUBMISSION CUSTOMS VALIDATION ENGINE                                           │
│ - Multi-tier compliance check: Missing HS, Zero Value, Missing Origin, Lartas Permits  │
│ - Status: READY (Green) | REVIEW REQUIRED (Amber) | BLOCKED (Red)                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 05. CEISA 4.0 PREPARATION WORKSPACE                                                    │
│ - Structured CEISA 4.0 data preview & export checklist                                 │
│ - Printable PPJK Verification Sheets & Official Reference Logging                      │
│ - Channel Status Tracking (Green/Yellow/Red) $\rightarrow$ SPPB Release Confirmation  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 7. PROPOSED REST API EXTENSIONS

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/v1/customs/declarations/[id]/items/bulk` | `POST` | Atomically import/insert 100–1,000+ line items with validation |
| `/api/v1/customs/declarations/[id]/items/bulk` | `PATCH` | Bulk update line items (e.g. apply uniform HS code, Origin, or Supplier) |
| `/api/v1/customs/declarations/[id]/validate` | `POST` | Execute pre-submission customs rules engine (returns errors, warnings, info) |
| `/api/v1/customs/declarations/[id]/ceisa-preview` | `GET` | Generate CEISA 4.0 standardized payload and readiness matrix |
| `/api/v1/customs/sku-intelligence` | `GET / POST` | Search and manage reusable SKU master catalog by importer |
| `/api/v1/customs/hs-lookup` | `GET` | Real-time search in BTKI 8-digit tariff repository |
| `/api/v1/customs/declarations/[id]/documents` | `GET / POST` | Upload, link, and review supporting commercial documents |

---

# 8. SUB-PHASE IMPLEMENTATION SEQUENCE RECOMMENDATION

- **Phase 3D-6A**: Database DDL Migration (`cus_sku_intelligence`, `cus_declaration_documents`, `md_customs_hs_codes`, expanded `cus_classification_lines`).
- **Phase 3D-6B**: Domain Engines (`ItemImportService`, `SkuIntelligenceService`, `CustomsValidationEngine`, `CeisaPreparationService`).
- **Phase 3D-6C**: REST API Endpoints under `/api/v1/customs/*`.
- **Phase 3D-6D**: Standalone Customs Control Center Dashboard (`/sbu/clearance` & `/sbu/customs`).
- **Phase 3D-6E**: High-Performance PPJK Item Grid & Bulk Operations UI.
- **Phase 3D-6F**: HS Classification Workbench & Reusable SKU Intelligence UI.
- **Phase 3D-6G**: CEISA 4.0 Preparation & Validation Panel.
- **Phase 3D-6H**: Acceptance Test Suite ($\ge 18$ scenarios), TypeScript, and ESLint validation.

---

# 9. PRODUCTION SAFETY ASSESSMENT

- **Browser Database Direct Access**: Strictly **0** (`supabase.from` prohibited in UI).
- **Trucking Domain & Driver Execution**: **100% Frozen & Untouched** (`job_orders`, `job_routes`, `job_tracking`, `data_armada`, `data_driver`, Android Native Service, Driver PWA).
- **Service Request Invariant**: Customs operations triggered via Forwarding continue using canonical `ServiceRequest` contracts without Ghost Work Orders.
- **Tenant Isolation**: Strict RLS policies and server-enforced authentication on all new tables and routes.

---
*Discovery report finalized. Awaiting explicit user authorization to begin implementation.*
