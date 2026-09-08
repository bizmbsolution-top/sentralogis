# SENTRALOGIS — PHASE 3D-6D-7 DISCOVERY & ARCHITECTURE AUDIT
## Supporting Documents + Valuation + Lartas Verification Workspace

**Document Version:** 1.0.0-PHASE3D6D7-DISCOVERY  
**Date:** 25 August 2026  
**Status:** DISCOVERY COMPLETE — APPROVED FOR IMPLEMENTATION  
**Classification:** Internal Technical Architecture & Indonesian Customs / PPJK Specification  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

## 1. EXECUTIVE SUMMARY

Phase 3D-6D-6 implemented the canonical Customs Control Plane, Multi-Tier Validation Engine, and persistent Relational Exception Registry (`cus_declaration_exceptions`), verified by Phase 3D-6D-6A Hardening Audit with **380 / 380 PASS (100% Green)**.

The objective of **Phase 3D-6D-7** is to transform the PPJK workbench from simple validation into an **Evidence-Backed Customs Declaration Control Plane** comprising three interconnected domains:
1. **Supporting Documents Vault & Completeness Engine:** Multi-document tracking (Commercial Invoice, Packing List, B/L / AWB, Certificate of Origin, Trade Permits, MSDS, Technical Specs), item-level document linkage, and clear separation of *Exists* $\neq$ *Verified* $\neq$ *Satisfies Requirement*.
2. **Commercial Valuation & Price Evidence Workspace:** Arithmetic reconciliation of Quantity, Unit Price, FOB, Freight, Insurance, and CIF across lines and header, currency conversion with Kurs Pajak KMK, historical SKU price variance justification, and evidence tagging.
3. **Lartas & Regulatory Verification Engine:** Item-level Lartas determination (SKU $\to$ HS Code $\to$ BTKI Master $\to$ INSW / Permendag Regulation $\to$ Permit Requirement $\to$ Evidence Document $\to$ Deterministic Exception).

---

## 2. EXISTING REUSABLE ENTITIES & SCHEMA

| Existing Entity | Migration File | Canonical Role in Phase 3D-6D-7 | Reusability |
|---|---|---|---|
| `cus_declarations` | `20260826_005_customs_declarations_schema.sql` | Declaration Header (AJU, Importer, Customs Office, Total CIF, Taxes) | 100% Reused |
| `cus_classification_lines` | `20260826_008_ppjk_workbench_schema.sql` | Line items with SKU, HS, Qty, Unit Price, FOB, Freight, Insurance, CIF, Taxes, Lartas Flag | 100% Reused |
| `md_customs_hs_codes` | `20260826_008_ppjk_workbench_schema.sql` | BTKI 2026 8-digit tariff catalog with `lartas_flag`, `lartas_permit_type`, `source_version`, `effective_from` | 100% Reused |
| `cus_sku_intelligence` | `20260826_008_ppjk_workbench_schema.sql` | Importer SKU master product memory and historical average pricing | 100% Reused |
| `cus_declaration_documents` | `20260826_008_ppjk_workbench_schema.sql` | Supporting customs documents with verification status, notes, and metadata | Extended (Item Linkage & Expiry) |
| `cus_declaration_exceptions` | `20260826_009_customs_exceptions_schema.sql` | Relational Exception Registry with deterministic fingerprinting and lifecycle | 100% Reused |
| `cus_declaration_validation_runs` | `20260826_009_customs_exceptions_schema.sql` | Diagnostic validation execution snapshots and execution telemetry | 100% Reused |
| `cus_item_audit_logs` | `20260826_008_ppjk_workbench_schema.sql` | Immutable audit trail for document verification, valuation fixes, and waivers | 100% Reused |

---

## 3. EXISTING DOCUMENT INFRASTRUCTURE & ENHANCEMENTS

### 3.1 Existing State (`cus_declaration_documents`)
The existing table captures:
- `id`, `tenant_id`, `declaration_id`, `document_type`, `document_number`, `issue_date`, `file_reference`, `file_name`, `mime_type`, `file_size_bytes`, `extracted_items_count`, `verification_status` (`PENDING_REVIEW`, `VERIFIED`, `REJECTED`), `verified_by`, `verified_at`, `notes`.

### 3.2 Required Enhancements for Phase 3D-6D-7
To support item-level evidence linkage and statutory permit tracking:
1. **Item Linkage:** Add `classification_line_id UUID REFERENCES cus_classification_lines(id)` (nullable for declaration-level documents like Invoice/BL, populated for item-specific permits or MSDS).
2. **Expiry & Issuer:** Add `expiry_date DATE` and `issuer_name TEXT` (e.g. Kementerian Perdagangan, Sucofindo, Karantina Pertanian).
3. **Document Status Lifecycle:** Standardize statuses to `DRAFT`, `UPLOADED`, `VERIFIED`, `REJECTED`, `EXPIRED`, `SUPERSEDED`.

---

## 4. EXISTING VALUATION INFRASTRUCTURE

### 4.1 Field Breakdown in `cus_classification_lines`
- `item_quantity`, `uom_code`, `unit_price_usd`
- `fob_value_usd`, `freight_usd`, `insurance_usd`, `cif_value_usd`
- `currency`, `country_of_origin`
- `bm_rate_percent`, `ppn_rate_percent`, `pph_rate_percent`
- `calculated_bm_idr`, `calculated_ppn_idr`, `calculated_pph_idr`

### 4.2 Mathematical Formulas & Safe Precision
$$\text{Line CIF USD} = \text{FOB USD} + \text{Freight USD} + \text{Insurance USD} = \text{Quantity} \times \text{Unit Price USD}$$
$$\text{Nilai Pabean IDR} = \text{CIF USD} \times \text{Kurs Pajak KMK}$$
$$\text{Bea Masuk IDR} = \text{Nilai Pabean IDR} \times \frac{\text{BM } \%}{100}$$
$$\text{Nilai Impor IDR} = \text{Nilai Pabean IDR} + \text{Bea Masuk IDR}$$
$$\text{PPN IDR} = \text{Nilai Impor IDR} \times \frac{\text{PPN } \%}{100}$$
$$\text{PPh 22 IDR} = \text{Nilai Impor IDR} \times \frac{\text{PPh } \%}{100}$$

Tolerance of $\$0.05$ is enforced on floating-point sum comparisons.

---

## 5. EXISTING CUSTOMS REGULATORY INFRASTRUCTURE (LARTAS)

### 5.1 Lartas Determination Chain
```
Declaration Item (SKU, HS Code)
             │
             ▼
BTKI Master (md_customs_hs_codes)
   - lartas_flag: true / false
   - lartas_permit_type: 'PI', 'LS', 'BPOM', 'SNI', 'KEMENDAG'
   - source_reference: 'BTKI-INSW'
   - source_version: '2026.1'
   - effective_from: '2026-01-01'
             │
             ▼
Document Vault (cus_declaration_documents)
   - Search for document_type IN ('PERMIT', 'COO_FORM_D', 'COO_FORM_E', 'COO_FORM_AK')
   - verification_status === 'VERIFIED'
             │
             ▼
Regulatory Status Projection
   - REQUIRED (Lartas active, permit attached & verified) -> PASS
   - NOT_REQUIRED (Lartas false) -> PASS
   - UNATTACHED_PERMIT (Lartas true, permit missing) -> BLOCKING Exception (REG-001 / REG-006)
   - RULE_SOURCE_REQUIRED (Source unverified or missing regulatory metadata) -> WARNING Exception (REG-007)
```

### 5.2 Mandatory Regulatory Source Rule
If regulatory metadata is absent in `md_customs_hs_codes` for an HS code, the engine **MUST NOT** claim `NOT_LARTAS`. It must explicitly project `RULE_SOURCE_REQUIRED`.

---

## 6. EXCEPTION REGISTRY INTEGRATION

All document, valuation, and regulatory issues feed directly into the existing `public.cus_declaration_exceptions` table:

| Rule Code | Category | Name | Default Severity | Resolution Policy | Legal / Authority Source |
|---|---|---|---|---|---|
| `DOC-001` | `DOCUMENTS` | Mandatory Commercial Invoice Missing | `WARNING` | `AUTHORIZED_OVERRIDE` | UU Kepabeanan No. 17/2006 Pasal 10B |
| `DOC-002` | `DOCUMENTS` | Mandatory Packing List Missing | `WARNING` | `AUTHORIZED_OVERRIDE` | UU Kepabeanan No. 17/2006 Pasal 10B |
| `DOC-003` | `DOCUMENTS` | Bill of Lading / Air Waybill Missing | `WARNING` | `AUTHORIZED_OVERRIDE` | UU Kepabeanan No. 17/2006 Pasal 10B |
| `DOC-004` | `DOCUMENTS` | Certificate of Origin (COO) Required for Preferential Tariff | `BLOCKING` | `FIX_REQUIRED` | PMK Tarif Preferensi Internasional |
| `VAL-001` | `VALUATION` | Historical Unit Price Variance (>50%) | `WARNING` | `AUTHORIZED_OVERRIDE` | Internal Valuation Benchmark |
| `VAL-002` | `VALUATION` | Commercial Item Zero Unit Price | `BLOCKING` | `FIX_REQUIRED` | PMK No. 144/PMK.04/2022 |
| `VAL-003` | `VALUATION` | Quantity × Unit Price Arithmetic Mismatch | `BLOCKING` | `FIX_REQUIRED` | PMK No. 144/PMK.04/2022 |
| `REG-001` | `LARTAS` | Lartas Import Restriction Permit Required | `BLOCKING` | `FIX_REQUIRED` | INSW / Permendag No. 36/2023 |
| `REG-006` | `LARTAS` | Unverified Supporting Permit Document | `WARNING` | `AUTHORIZED_OVERRIDE` | Permendag No. 36/2023 |
| `REG-007` | `LARTAS` | Regulatory Source / BTKI Classification Unresolved | `INFORMATIONAL` | `SYSTEM_ONLY` | RULE SOURCE REQUIRED |

---

## 7. SEGREGATION OF DUTIES (ADDRESSING M01)

To prepare for future role hierarchy (`PPJK_OPERATOR`, `PPJK_SUPERVISOR`, `PPJK_AUTHORITY`) without an premature full RBAC overhaul:
1. Document verification stamps `verified_by_role` (derived from auth session profile).
2. Valuation override justification captures `approved_by_role`.
3. Rules marked `resolution_policy: 'APPROVAL_REQUIRED'` will require supervisor role context.

---

## 8. REQUIRED NEW ARTIFACTS & WORKSPACE TABS

1. **Database Migration:** `supabase/migrations/20260826_010_customs_documents_valuation_lartas_schema.sql` (Adds `classification_line_id`, `expiry_date`, `issuer_name` to `cus_declaration_documents`).
2. **Domain Types:** Update `lib/domain/customs/types.ts` with document completeness, valuation reconciliation models, and Lartas verification types.
3. **Application Service:** Add valuation reconciliation and Lartas determination methods to `lib/domain/customs/ppjk-workbench-service.ts`.
4. **Validation Rules:** Integrate `DOC-001`–`DOC-004`, `VAL-001`–`VAL-003`, `REG-001`, `REG-006`–`REG-007` in `lib/domain/customs/customs-validation-engine.ts`.
5. **REST APIs:**
   - `/api/v1/customs/declarations/[id]/documents`
   - `/api/v1/customs/declarations/[id]/valuation`
   - `/api/v1/customs/declarations/[id]/lartas`
6. **UI Workspaces (`components/workspaces/customs/`):**
   - `DocumentsWorkspace.tsx`: Document Vault & Completeness Control.
   - `ValuationWorkspace.tsx`: Commercial Valuation & Tax Reconciliation Table with progressive disclosure.
   - `LartasWorkspace.tsx`: Item-Level Regulatory & Permit Verification Matrix.
7. **Workbench Shell Tabs:** Integrate `documents`, `valuation`, and `lartas` into `app/(dashboard)/sbu/clearance/declarations/[id]/page.tsx` and `WorkbenchTabNav.tsx`.

---

## 9. RECOMMENDED IMPLEMENTATION SEQUENCE

1. **Step 1:** Types expansion in `lib/domain/customs/types.ts`.
2. **Step 2:** Database migration `20260826_010_customs_documents_valuation_lartas_schema.sql`.
3. **Step 3:** Validation engine expansion in `lib/domain/customs/customs-validation-engine.ts`.
4. **Step 4:** Service methods in `lib/domain/customs/ppjk-workbench-service.ts`.
5. **Step 5:** REST APIs in `app/api/v1/customs/declarations/[id]/`.
6. **Step 6:** UI components in `components/workspaces/customs/`.
7. **Step 7:** Workbench page & tab integration.
8. **Step 8:** Comprehensive test suite in `lib/domain/customs/__tests__/ppjk-documents-valuation-lartas.test.ts`.
9. **Step 9:** Build verification (`tsc`, `eslint`, test runner).
10. **Step 10:** Implementation Report (`SENTRALOGIS_PHASE3D6D7_IMPLEMENTATION_REPORT.md`).

---

**Conclusion:** Discovery confirms zero architectural blockers. We proceed immediately with implementation.
