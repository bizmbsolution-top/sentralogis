# SENTRALOGIS — PHASE 3D-6C DISCOVERY REPORT
## Customs REST API Gateway & Bulk Controllers Architecture
**Document Version:** 1.0.0-PHASE3D6C-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — PROCEEDING TO IMPLEMENTATION  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. ARCHITECTURAL BASELINE & OBJECTIVES

In Phase 3D-6A and 3D-6B, the database foundation and four canonical domain engines were built and verified:
1. `ItemImportService` (Ingestion, column aliasing, normalization, batch duplicate detection, and preview)
2. `SkuIntelligenceService` (Product memory matching, confidence scoring, historical statistics)
3. `CustomsValidationEngine` (Pre-submission multi-tier compliance checking, price anomalies, Lartas)
4. `CeisaPreparationService` (CEISA 4.0 dataset compilation and 10-category readiness matrix)

The purpose of **Phase 3D-6C** is to expose these domain engines through a secure, canonical **REST API Gateway** layer without duplicating domain rules inside Next.js route handlers.

```
BROWSER WORKSPACE (Phase 3D-6D/E/F/G)
                 ↓ HTTP REST (JSON)
       REST API GATEWAY LAYER
(`app/api/v1/customs/*` Route Handlers)
                 ↓
    APPLICATION ORCHESTRATION LAYER
     (`PpjkWorkbenchService.ts`)
                 ↓
      CANONICAL DOMAIN ENGINES
  (`ItemImportService`, `SkuIntelligenceService`,
   `CustomsValidationEngine`, `CeisaPreparationService`)
                 ↓
    REPOSITORY & AUDIT PERSISTENCE
 (`CustomsDeclarationRepository`, `supabaseAdmin`)
                 ↓
   SUPABASE POSTGRESQL CANONICAL DB
```

---

# 2. REST API ENDPOINT SPECIFICATION

| Route | Method | Purpose | Key Features |
| :--- | :---: | :--- | :--- |
| `/api/v1/customs/declarations/[id]/items/bulk` | `POST` | Bulk Ingestion & Preview/Commit | Mode: `PREVIEW` (default) or `COMMIT`. Idempotency-Key support. Batch lookups. |
| `/api/v1/customs/declarations/[id]/items/bulk` | `PATCH` | Bulk Field Updates | Explicit column allowlist. Re-computes line taxes and audit logs. |
| `/api/v1/customs/declarations/[id]/validate` | `POST` | Pre-Submission Validation Run | Diagnostic execution returning errors, warnings, info, and readiness matrix. |
| `/api/v1/customs/declarations/[id]/ceisa-preview` | `GET` | CEISA 4.0 Preparation Dataset | Structured CEISA 4.0 preview DTO and operator review checklist. |
| `/api/v1/customs/sku-intelligence` | `GET` | SKU Master Catalog Search | Filterable by importer, SKU, brand, model, HS code. Paginated. |
| `/api/v1/customs/sku-intelligence` | `POST` | SKU Master Registration/Update | Upserts product memory with rationale and confidence. |
| `/api/v1/customs/hs-lookup` | `GET` | BTKI 8-Digit Tariff Lookup | Autocomplete search across HS code, Indonesian/English descriptions. Paginated. |
| `/api/v1/customs/declarations/[id]/documents` | `GET` | List Declaration Documents | Returns attached documents and verification statuses. |
| `/api/v1/customs/declarations/[id]/documents` | `POST` | Upload/Attach Document | Associates Invoice, Packing List, B/L, COO, MSDS, Permits. |
| `/api/v1/customs/declarations/[id]/documents/[docId]` | `PATCH` | Verify/Reject Document | Updates verification status with reviewer audit. |
| `/api/v1/customs/declarations/[id]/documents/[docId]` | `DELETE` | Remove Document | Unlinks document metadata from declaration. |

---

# 3. ORCHESTRATION SERVICE ARCHITECTURE (`PpjkWorkbenchService`)

To keep API routes lean and maintain complete separation of concerns, `PpjkWorkbenchService` (`lib/domain/customs/ppjk-workbench-service.ts`) will orchestrate:
1. **Batch Master Lookups:** Pre-fetches known SKU intelligence and BTKI tariff records in single batch queries using Maps, ensuring **zero $N+1$ database round-trips**.
2. **Idempotent Commit Handler:** In-memory or database-backed cache of recent `Idempotency-Key` tokens preventing duplicate bulk imports on browser/network retries.
3. **Atomic Commit Transaction:** When `mode === 'COMMIT'`, verifies that 0 critical errors exist before committing all lines to `cus_classification_lines` and updating declaration taxes.
4. **Audit Logging:** Inserts audit records into `cus_item_audit_logs` on HS overrides, price updates, and bulk imports.

---

# 4. SECURITY & COMPLIANCE BOUNDARY

- **Server-Derived Tenant Identity:** `resolveCustomsAuthContext` strictly resolves `tenantId` from authenticated server sessions or machine headers. Request body tenant parameters are untrusted and discarded.
- **Resource Ownership Verification:** All declaration and document operations verify that `declaration.tenant_id === auth.tenantId` (HTTP 403 / 404).
- **CEISA 4.0 Invariant:** No unauthorized scraping, browser automation, or direct submission to CEISA 4.0. Responses are strictly labeled as **CEISA 4.0 Preparation Datasets**.

---
*Discovery complete. Architecture is verified and ready for implementation.*
