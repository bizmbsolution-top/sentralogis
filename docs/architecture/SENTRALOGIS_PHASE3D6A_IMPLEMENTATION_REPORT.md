# SENTRALOGIS — PHASE 3D-6A IMPLEMENTATION REPORT
## PPJK Workbench Database Schema & Migration Foundation
**Document Version:** 1.0.0-PHASE3D6A-REPORT  
**Date:** 26 August 2026  
**Status:** PHASE 3D-6A COMPLETED & VALIDATED (PASS)  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. IMPLEMENTATION SUMMARY

Phase 3D-6A of **Sentralogis Target Architecture v1.0** has been successfully implemented and validated. The objective of this phase was to construct the canonical database schema and migration foundation for the **PPJK Workbench & Customs Control Center**, enabling:
1. **Reusable SKU Intelligence & Product Memory** (`cus_sku_intelligence`),
2. **Multi-Declaration Classification Evidence Tracking** (`cus_sku_classification_history`),
3. **Indonesian BTKI 8-Digit Tariff Master Reference** (`md_customs_hs_codes`),
4. **Enriched Declaration Item Lines with Historical Snapshots** (`cus_classification_lines`),
5. **Supporting Customs Document Ingestion** (`cus_declaration_documents`),
6. **Immutable Line-Level Audit Trail** (`cus_item_audit_logs`).

---

# 2. SCHEMA IMPLEMENTATION DETAILS

### 2.1 Migration File:
`supabase/migrations/20260826_008_ppjk_workbench_schema.sql`

### 2.2 New Database Tables Created:

1. **`public.md_customs_hs_codes` (BTKI 8-Digit Tariff Catalog):**
   - **Columns:** `id` (UUID PK), `hs_code` (VARCHAR(12) UNIQUE), `description_id`, `description_en`, `chapter`, `heading`, `subheading`, `bm_rate`, `ppn_rate`, `pph_rate`, `lartas_flag`, `lartas_permit_type`, `uom_primary`, `source_reference`, `source_version`, `effective_from`, `effective_to`, `is_active`, `created_at`, `updated_at`.
   - **Purpose:** Official master tariff reference catalog supporting real-time HS Code autocomplete, tariff verification, and Lartas flags without hard-coding.
   - **Security:** RLS enabled; shared read-only access for authenticated users.

2. **`public.cus_sku_intelligence` (Master Product Memory per Importer):**
   - **Columns:** `id` (UUID PK), `tenant_id` (UUID FK), `importer_id` (UUID FK $\rightarrow$ `md_entities`), `customer_id` (UUID FK $\rightarrow$ `md_entities`), `sku_code`, `normalized_description`, `original_description`, `brand`, `model`, `manufacturer`, `supplier`, `country_of_origin`, `preferred_uom`, `suggested_hs_code`, `classification_confidence`, `classification_status`, `classification_rationale`, `classification_source`, `last_used_declaration_id`, `average_unit_price_usd`, `total_declarations_count`, `last_reviewed_at`, `last_reviewed_by`, `effective_date`, `is_active`, `created_at`, `updated_at`.
   - **Constraint:** `CONSTRAINT uq_cus_sku_importer_code UNIQUE (tenant_id, importer_id, sku_code)` (prevents SKU code collisions across different importers while guaranteeing uniqueness per importer).
   - **Security:** RLS enabled with `public.get_my_tenant_id()` isolation.

3. **`public.cus_sku_classification_history` (Evidence Log):**
   - **Columns:** `id` (UUID PK), `tenant_id` (UUID FK), `importer_id` (UUID FK), `sku_intelligence_id` (UUID FK), `declaration_id` (UUID FK), `declaration_number`, `sku_code`, `hs_code`, `goods_description`, `unit_price_usd`, `currency`, `country_of_origin`, `customs_channel`, `recorded_at`.
   - **Security:** RLS enabled with `public.get_my_tenant_id()` isolation.

4. **`public.cus_declaration_documents` (Document Metadata & Ingestion Reference):**
   - **Columns:** `id` (UUID PK), `tenant_id` (UUID FK), `declaration_id` (UUID FK), `document_type`, `document_number`, `issue_date`, `file_reference`, `file_name`, `mime_type`, `file_size_bytes`, `extracted_items_count`, `verification_status`, `verified_by`, `verified_at`, `notes`, `created_by`, `created_at`, `updated_at`.
   - **Security:** RLS enabled with `public.get_my_tenant_id()` isolation.

5. **`public.cus_item_audit_logs` (Immutable Line-Level Provenance):**
   - **Columns:** `id` (UUID PK), `tenant_id` (UUID FK), `declaration_id` (UUID FK), `classification_line_id` (UUID FK), `field_name`, `old_value` (JSONB), `new_value` (JSONB), `change_reason`, `changed_by`, `changed_by_name`, `changed_at`, `source`.
   - **Security:** RLS enabled with Append & Select Only isolation (`SELECT` and `INSERT` permitted; `UPDATE` and `DELETE` denied).

### 2.3 Existing Table Expansion (`public.cus_classification_lines`):
Non-destructively augmented with:
- **Commercial SKU Fields:** `sku_code`, `brand`, `model`, `item_quantity`, `uom_code`, `unit_price_usd`, `fob_value_usd`, `freight_usd`, `insurance_usd`, `currency`, `country_of_origin`, `manufacturer_name`, `supplier_name`, `invoice_number`, `invoice_line_no`.
- **Historical Snapshot Principle:** `hs_master_id`, `hs_code_snapshot`, `hs_description_snapshot`, `bm_rate_snapshot`, `ppn_rate_snapshot`, `pph_rate_snapshot` (ensures declarations remain immutable even if the national tariff book changes in the future).
- **Intelligence & Pre-Validation Status:** `classification_confidence`, `classification_source`, `classification_rationale`, `validation_status`, `validation_error_count`, `validation_warning_count`, `validation_errors` (JSONB), `price_anomaly_flag`, `lartas_flag`.

---

# 3. PERFORMANCE & INDEXING STRATEGY

1. **`idx_cus_hs_code_search`:** Index on `md_customs_hs_codes(hs_code)` for sub-millisecond autocomplete while typing HS numbers.
2. **`idx_cus_sku_lookup`:** Compound index on `cus_sku_intelligence(tenant_id, importer_id, sku_code)` for instant SKU master matching during bulk file imports.
3. **`idx_cus_class_dec_seq`:** Compound index on `cus_classification_lines(declaration_id, item_sequence)` ensuring rapid sequential retrieval for 1,000+ line items in virtualized grids.
4. **`idx_cus_doc_declaration`:** Index on `cus_declaration_documents(declaration_id)` for quick document verification retrieval.
5. **`idx_cus_item_audit_dec`:** Index on `cus_item_audit_logs(declaration_id)` for declaration audit timeline generation.

---

# 4. MIGRATION SAFETY & DATA COMPATIBILITY

- **Non-destructive:** All schema alterations use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- **Safe Defaults:** All new columns on `cus_classification_lines` are either nullable or configured with safe production defaults (`item_quantity = 1`, `uom_code = 'PCE'`, `currency = 'USD'`, `validation_status = 'VALID'`).
- **Existing Declarations Intact:** All declarations created in Phase 3C remain 100% readable and valid without requiring manual data fixes.

---

# 5. VALIDATION & TEST RESULTS

```
====================================================
TOTAL SUITE SUMMARY: 99 / 99 PASSED (100% PASS RATE)
====================================================
- Phase 2 Service Contract Suite:        8 / 8 PASS
- Phase 3A Shipment Domain Suite:       10 / 10 PASS
- Phase 3B Shipment API Suite:          11 / 11 PASS
- Phase 3C Customs Domain Suite:         9 / 9 PASS
- Phase 3D-2 Directory Suite:            4 / 4 PASS
- Phase 3D-3 Creator Suite:              9 / 9 PASS
- Phase 3D-4 Execution Plan Suite:      18 / 18 PASS
- Phase 3D-5 Command Center Suite:      19 / 19 PASS
- Phase 3D-6A PPJK Schema Suite:        11 / 11 PASS
```

### Static Analysis:
- **TypeScript (`npx tsc --noEmit`):** **PASS (0 errors across whole codebase)**.
- **ESLint (`npx eslint lib/domain/customs/ app/api/v1/customs/`):** **PASS (0 errors, 0 warnings)**.
- **Architectural Violation Scan:**
  - `supabase.from` in browser components: **0 occurrences**.
  - `from('job_orders')` mutations in customs domain: **0 occurrences**.
  - `from('work_orders')` mutations in customs domain: **0 occurrences**.

---

# 6. PROTECTED SYSTEMS VERIFICATION

- **Frozen Execution Domains:** 100% untouched Driver PWA (`app/jo/[token]`), Android Native GPS Service (`GpsForegroundService.java`), and mature Trucking tables (`job_orders`, `job_routes`, `job_tracking`, `data_armada`, `data_driver`).
- **Legacy Coexistence:** Legacy Forwarding UI (`/sbu/forwarding/wo/*`) remains fully functional.

---

# 7. STATUS & RECOMMENDED NEXT SUB-PHASE

**PHASE 3D-6A IS COMPLETE AND VALIDATED.**

### Recommended Next Sub-Phase:
**PHASE 3D-6B — CUSTOMS DOMAIN ENGINES**
- Implementation of `ItemImportService.ts`, `SkuIntelligenceService.ts`, `CustomsValidationEngine.ts`, and `CeisaPreparationService.ts`.

---
*Signed by Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert — 26 August 2026*
