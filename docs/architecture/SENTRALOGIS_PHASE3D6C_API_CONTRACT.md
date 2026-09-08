# SENTRALOGIS — PHASE 3D-6C API CONTRACT SPECIFICATION
## Customs REST API Gateway & Bulk Controllers
**Document Version:** 1.0.0-PHASE3D6C-CONTRACT  
**Date:** 26 August 2026  
**Status:** IMPLEMENTED & VALIDATED (185/185 TESTS PASS)  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. ARCHITECTURAL TOPOLOGY & BOUNDARIES

All frontend workspaces access Customs clearance, PPJK operations, and SKU intelligence strictly through authenticated REST endpoints under `/api/v1/customs/*`. Direct browser database access (`supabase.from(...)`) is prohibited.

```
+-----------------------------------------------------------------------------------+
|                        FRONTEND PPJK WORKSPACE / CLIENT                           |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTP REST (JSON / Idempotency-Key)
                                          v
+-----------------------------------------------------------------------------------+
|                       REST API GATEWAY LAYER (`app/api/v1/customs/*`)             |
| - resolveCustomsAuthContext(req) (Strict Server-Derived Tenant Context)           |
| - handleCustomsError(err) (Standardized Error Serialization)                      |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                   APPLICATION ORCHESTRATION (`PpjkWorkbenchService.ts`)          |
| - Idempotent Request Caching                                                      |
| - Pre-fetching Batch Maps (SKU Catalog, BTKI Tariff Catalog)                      |
| - Atomic Commit & Audit Logging (`cus_item_audit_logs`)                           |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                       CANONICAL DOMAIN ENGINES (PHASE 3D-6B)                      |
| - ItemImportService (Ingestion, Aliasing, Normalization, Duplicate Detection)     |
| - SkuIntelligenceService (Product Memory Matching, Confidence Scoring)            |
| - CustomsValidationEngine (Multi-Tier Rules, Price Anomaly, Lartas)               |
| - CeisaPreparationService (CEISA 4.0 Preparation Dataset & Readiness Matrix)      |
| - CustomsTaxCalculator (Deterministic Nilai Pabean, BM, PPN, PPh 22 Math)         |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|               POSTGRESQL PERSISTENCE LAYER (Supabase Admin + RLS)                 |
| - cus_declarations                                                                |
| - cus_classification_lines                                                        |
| - cus_sku_intelligence                                                            |
| - cus_declaration_documents                                                       |
| - cus_item_audit_logs                                                             |
| - md_customs_hs_codes                                                             |
+-----------------------------------------------------------------------------------+
```

---

# 2. REST API ENDPOINTS CONTRACT

### 2.1 Bulk Item Ingestion & Preview/Commit
- **Endpoint:** `POST /api/v1/customs/declarations/[id]/items/bulk`
- **Headers:**
  - `x-tenant-id`: Authenticated tenant context (or derived from server session cookie)
  - `Idempotency-Key` (Optional for PREVIEW, strongly recommended for COMMIT)
- **Request Body:**
```json
{
  "source": "CSV",
  "mode": "PREVIEW",
  "defaultOrigin": "CN",
  "defaultCurrency": "USD",
  "exchangeRateIdr": 16000,
  "rows": [
    {
      "SKU Code": "BYD-EV-MOTOR-200KW",
      "Goods Description": "AC Traction Motor Assembly",
      "Qty": 10,
      "UOM": "PCS",
      "Unit Price": "1800.00",
      "Country of Origin": "CHINA",
      "Invoice No": "INV-2026-001"
    }
  ]
}
```
- **Response (`mode: "PREVIEW"`):**
```json
{
  "success": true,
  "data": {
    "import_id": "imp_uuid_12345",
    "mode": "PREVIEW",
    "total_rows": 1,
    "valid_rows": 1,
    "warning_rows": 0,
    "error_rows": 0,
    "duplicate_rows": 0,
    "auto_matched_sku_rows": 1,
    "auto_suggested_hs_rows": 1,
    "unresolved_rows": 0,
    "preview": { ... }
  }
}
```
- **Response (`mode: "COMMIT"`):** Returns `committed_lines_count`, updates declaration total duty and taxes, writes audit trail to `cus_item_audit_logs`, and caches response by `Idempotency-Key`.

---

### 2.2 Bulk Line Field Update
- **Endpoint:** `PATCH /api/v1/customs/declarations/[id]/items/bulk`
- **Request Body:**
```json
{
  "item_ids": ["cline_001", "cline_002"],
  "changes": {
    "country_of_origin": "JP",
    "invoice_number": "INV-2026-002"
  },
  "change_reason": "Corrected origin following invoice revision"
}
```
- **Allowlist Enforcement:** Only approved fields (`sku_code`, `goods_description`, `brand`, `model`, `item_quantity`, `uom_code`, `unit_price_usd`, `country_of_origin`, `invoice_number`, `invoice_line_no`, `hs_code`, `bm_rate_percent`, `ppn_rate_percent`, `pph_rate_percent`, `classification_rationale`) are modified. Tenant identity and system timestamps remain protected.

---

### 2.3 Pre-Submission Customs Diagnostic Validation
- **Endpoint:** `POST /api/v1/customs/declarations/[id]/validate`
- **Response:**
```json
{
  "success": true,
  "data": {
    "declaration_id": "dec_101",
    "validation_run_id": "val_uuid_999",
    "overallStatus": "READY",
    "totalLines": 12,
    "errorCount": 0,
    "warningCount": 1,
    "infoCount": 11,
    "issues": [
      {
        "code": "HS_CLASSIFICATION_CHANGED",
        "itemSequence": 3,
        "skuCode": "SKU-99",
        "message": "Classified as 8504.40.30, historical master suggests 8504.40.90",
        "severity": "WARNING"
      }
    ],
    "readinessByCategory": {
      "identity": "READY",
      "cargo": "READY",
      "classification": "WARNING",
      "valuation": "READY",
      "origin": "READY",
      "documents": "READY",
      "tax": "READY",
      "lartas": "READY"
    }
  }
}
```

---

### 2.4 CEISA 4.0 Preparation Dataset Preview
- **Endpoint:** `GET /api/v1/customs/declarations/[id]/ceisa-preview`
- **Response:**
```json
{
  "success": true,
  "data": {
    "ceisa_preparation_version": "CEISA-4.0-PREP-v1.0",
    "generated_at": "2026-08-26T10:00:00.000Z",
    "declaration_header": { ... },
    "valuation_and_taxes": {
      "total_cif_usd": 18000.0,
      "kurs_pajak_kmk_idr": 16000,
      "total_nilai_pabean_idr": 288000000,
      "total_bea_masuk_idr": 0,
      "total_ppn_idr": 31680000,
      "total_pph22_idr": 7200000,
      "total_pungutan_pabean_idr": 38880000
    },
    "items": [ ... ],
    "documents": [ ... ],
    "readiness_matrix": {
      "identity": "READY",
      "cargo": "READY",
      "classification": "READY",
      "valuation": "READY",
      "origin": "READY",
      "documents": "READY",
      "tax": "READY",
      "lartas": "READY",
      "transport": "READY",
      "parties": "READY",
      "overall": "READY"
    },
    "human_review_checklist": [ ... ]
  }
}
```

---

### 2.5 SKU Intelligence Master Search & Upsert
- **Endpoint:** `GET /api/v1/customs/sku-intelligence`
  - **Query Params:** `importer_id`, `sku_code`, `q`, `brand`, `hs_code`, `page`, `pageSize` (Max: 200).
- **Endpoint:** `POST /api/v1/customs/sku-intelligence`
  - **Payload:** Reusable SKU metadata (`importer_id`, `sku_code`, `normalized_description`, `suggested_hs_code`, `classification_confidence`, `classification_rationale`).

---

### 2.6 BTKI 8-Digit Tariff Lookup
- **Endpoint:** `GET /api/v1/customs/hs-lookup`
  - **Query Params:** `q`, `page`, `pageSize`. Searches across 8-digit HS code, Indonesian description, and English description with tariff rates and Lartas flags.

---

### 2.7 Supporting Documents API
- `GET /api/v1/customs/declarations/[id]/documents`
- `POST /api/v1/customs/declarations/[id]/documents`
- `PATCH /api/v1/customs/declarations/[id]/documents/[documentId]` (`status`: `VERIFIED` | `REJECTED`, `notes`)
- `DELETE /api/v1/customs/declarations/[id]/documents/[documentId]`

---

# 3. ERROR & SECURITY CONTRACT

- Standard Error Payload:
```json
{
  "success": false,
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```
- Status Codes:
  - `400`: `INVALID_CLASSIFICATION_DATA` / Malformed payload
  - `401`: `UNAUTHORIZED` (Missing session/tenant context)
  - `403`: `TENANT_ISOLATION_VIOLATION` (Accessing resource of another tenant)
  - `404`: `DECLARATION_NOT_FOUND`
  - `409`: `IDEMPOTENCY_CONFLICT`
  - `422`: `TAX_CALCULATION_ERROR`
  - `500`: `INTERNAL_SERVER_ERROR`

---
*Contract Specification Complete.*
