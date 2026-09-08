# SENTRALOGIS — SBU CUSTOMS CLEARANCE REST API CONTRACT (v1.0)
## REST API Specification for Standalone Customs Clearance
**Document Version:** 1.0.0-CUSTOMS-API-CONTRACT  
**Date:** 26 August 2026  
**Status:** FROZEN & ACTIVE  
**Base URL:** `/api/v1/customs`  

---

# 1. AUTHENTICATION & MULTI-TENANCY CONTEXT

All API routes require authentication:
- **Web App / SSR Session:** Authenticated via Supabase auth cookies $\rightarrow$ `profiles.tenant_id`.
- **API Clients / Machine Integrations:** Authenticated via `Authorization: Bearer <token>` or `x-tenant-id` header.
- **Security Rule:** Any `tenant_id` supplied in the request body is **ignored** or must match the authenticated tenant context. Cross-tenant access returns **403 Forbidden** or **404 Not Found**.

---

# 2. ENDPOINTS INVENTORY & SPECIFICATION

### 1. Create Customs Declaration
- **Route:** `POST /api/v1/customs/declarations`
- **Request Body:**
  ```json
  {
    "declaration_type": "PIB_IMPORT",
    "customs_office_code": "040300",
    "importer_id": "uuid-importer-entity",
    "ppjk_id": "uuid-ppjk-entity (optional)",
    "work_order_id": "uuid-work-order (optional)",
    "service_request_id": "uuid-service-request (optional)",
    "exchange_rate_idr": 16200,
    "classification_lines": [
      {
        "hs_code": "8507.60.00",
        "goods_description": "Lithium-ion accumulator battery cells",
        "cif_value_usd": 50000,
        "bm_rate_percent": 5.0,
        "ppn_rate_percent": 11.0,
        "pph_rate_percent": 2.5
      }
    ]
  }
  ```
- **Responses:**
  - `201 Created`: Returns canonical `CustomsAggregate`.
  - `400 Bad Request`: Missing mandatory fields (`importer_id`, `customs_office_code`).
  - `401 Unauthorized`: Missing or invalid session.

---

### 2. List Declarations
- **Route:** `GET /api/v1/customs/declarations`
- **Query Parameters:**
  - `status`: Filter by `CustomsDeclarationStatus` (`DRAFT`, `SUBMITTED`, `RELEASED`, etc.)
  - `channel`: Filter by `CustomsChannelType` (`GREEN`, `YELLOW`, `RED`)
  - `importer_id`: Filter by importer UUID
  - `limit`: Number of records (default: 50)
- **Response:** `200 OK` (Array of declarations for authenticated tenant).

---

### 3. Get Declaration Detail
- **Route:** `GET /api/v1/customs/declarations/:id`
- **Response:** `200 OK` (Full composite aggregate: `declaration`, `classification_lines`, `summary`).
- **Error:** `404 Not Found` if declaration does not exist or belongs to another tenant.

---

### 4. Transition Declaration Status
- **Route:** `PATCH /api/v1/customs/declarations/:id`
- **Request Body:** `{ "status": "SUBMITTED" }`
- **Responses:**
  - `200 OK`: Returns updated declaration aggregate.
  - `409 Conflict`: Invalid state machine transition.

---

### 5. HS Code Classification Lines
- **List Lines:** `GET /api/v1/customs/declarations/:id/classification`
- **Add Lines:** `POST /api/v1/customs/declarations/:id/classification`
  - Body: Array of `{ hs_code, goods_description, cif_value_usd, bm_rate_percent, ppn_rate_percent, pph_rate_percent }`
- **Delete Line:** `DELETE /api/v1/customs/declarations/:id/classification/:lineId`

---

### 6. Calculate Taxes & Import Duties
- **Route:** `POST /api/v1/customs/declarations/:id/calculate-tax`
- **Request Body (Optional):** `{ "exchange_rate_idr": 16250 }`
- **Response:** `200 OK` (Total CIF USD, Nilai Pabean IDR, Bea Masuk IDR, PPN IDR, PPh IDR, Total Duty & Tax).

---

### 7. Assign Customs Channel
- **Route:** `POST /api/v1/customs/declarations/:id/channel` or `PATCH`
- **Request Body:** `{ "channel": "GREEN" }`
- **Responses:** `200 OK` (Updates channel and transitions status accordingly).

---

### 8. Issue SPPB Customs Release
- **Route:** `POST /api/v1/customs/declarations/:id/sppb`
- **Request Body (Optional):** `{ "sppb_number": "SPPB-040300-20260826-009988", "sppb_date": "2026-08-26" }`
- **Responses:**
  - `200 OK`: Returns issued SPPB details and transitions status to `RELEASED`.
  - `412 Precondition Failed`: If declaration has not been approved or Red channel inspection is incomplete.

---

### 9. Unified Timeline Projection
- **Route:** `GET /api/v1/customs/declarations/:id/timeline`
- **Response:** `200 OK` (Stages: `CREATED`, `CLASSIFICATION`, `TAX_CALCULATION`, `CHANNEL_ASSIGNMENT`, `RELEASE_SPPB`).
