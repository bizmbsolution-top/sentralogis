# SENTRALOGIS — PHASE 3D-6B DISCOVERY REPORT
## Customs Domain Engines & PPJK Operational Intelligence
**Document Version:** 1.0.0-PHASE3D6B-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — PROCEEDING TO DOMAIN ENGINES IMPLEMENTATION  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. EXECUTIVE SUMMARY

In Phase 3D-6A, the database foundation was successfully deployed (`supabase/migrations/20260826_008_ppjk_workbench_schema.sql`), introducing `cus_sku_intelligence`, `cus_sku_classification_history`, `md_customs_hs_codes`, `cus_declaration_documents`, and `cus_item_audit_logs`.

Phase 3D-6B implements the **four core domain engines** that power the PPJK operational workflow:
1. **`ItemImportService`**: High-performance streaming/batch ingestion of commercial invoice and packing list data with column alias auto-mapping, normalization, duplicate detection, and preview without premature database mutation.
2. **`SkuIntelligenceService`**: Master product memory and historical classification matcher calculating deterministic confidence scores and evidence summaries (*"Enter Once, Validate Once, Reuse Many Times"*).
3. **`CustomsValidationEngine`**: Multi-tier pre-submission validation rules (`ERROR`, `WARNING`, `INFO`) detecting missing mandatory customs fields, price anomalies against historical averages, and Lartas permit requirements.
4. **`CeisaPreparationService`**: Standardized CEISA 4.0 preparation dataset compiler and 10-category readiness matrix generator (`IDENTITY`, `CARGO`, `CLASSIFICATION`, `VALUATION`, `ORIGIN`, `DOCUMENTS`, `TAX`, `LARTAS`, `TRANSPORT`, `PARTIES`).

---

# 2. AUDIT OF EXISTING CUSTOMS CAPABILITIES

- **Tax Engine:** `CustomsTaxCalculator` in `lib/domain/customs/tax-calculator.ts` is canonical and fully reusable. All new engines will reuse it directly (zero duplicated tax math).
- **State Machine:** `CustomsStateMachine` in `lib/domain/customs/state-machine.ts` enforces the 14-state customs declaration lifecycle.
- **Factory & Repository:** `CustomsDeclarationFactory` and `CustomsDeclarationRepository` construct and persist declarations atomically.
- **Tenant Isolation:** `resolveCustomsAuthContext` and RLS policies on all customs tables enforce strict tenant partitioning.

---

# 3. DOMAIN ENGINE DESIGN SPECIFICATIONS

### 3.1 `ItemImportService`:
- Normalization rules:
  - SKU code: Trim whitespace, upper-cased.
  - Country of Origin: Normalized to 2-letter ISO 3166-1 alpha-2.
  - UOM: Normalized to standard customs units (`PCE`, `KGM`, `CBM`, `TNE`, `MTR`, `LTR`, `SET`, `UNT`, `BOX`, `PLT`).
  - Numbers: Sanitized string to float, decimal comma replaced with period.
  - Column Aliasing: Comprehensive mapping dictionary supporting Indonesian and English variants.
- Deduplication: $O(N)$ Set/Map lookup detecting duplicate SKU within imported payload.
- Preview Object: Returns full audit metrics without mutating the database until explicit commit.

### 3.2 `SkuIntelligenceService`:
- Product Fingerprint: `importer_id + normalized(sku_code) + normalized(brand) + normalized(model)`.
- Matching Hierarchy & Deterministic Confidence:
  - Exact SKU match for same importer: **1.00 (100%)**
  - Normalized SKU + Manufacturer: **0.95 (95%)**
  - Normalized SKU + Supplier: **0.90 (90%)**
  - Normalized Product Fingerprint: **0.85 (85%)**
- Human-in-the-Loop: Suggestion $\neq$ Decision. Operator must explicitly confirm or override.

### 3.3 `CustomsValidationEngine`:
- Severity Levels:
  - `ERROR`: Missing SKU, missing description, non-positive quantity, empty/malformed HS, invalid origin, negative value (blocks submission).
  - `WARNING`: Unit price variance $>50\%$ from historical average, new unclassified SKU, Lartas permit flag, missing invoice reference.
  - `INFO`: Historical classification match, known product catalog match.
- Price Anomaly: Computes historical min, max, average, and variance percentage.

### 3.4 `CeisaPreparationService`:
- CEISA Preparation DTO with versioning (`ceisa_preparation_version = 'CEISA-4.0-PREP-v1.0'`).
- Readiness Matrix across 10 categories (`READY`, `WARNING`, `BLOCKED`).
- Strict Compliance Boundary: Zero browser botting, zero scraping, 100% human-in-the-loop review.

---
*Discovery complete. Architecture is verified and ready for implementation.*
