# SENTRALOGIS — PHASE 3C DISCOVERY REPORT
## Standalone Customs Clearance Domain & API Architectural Discovery
**Document Version:** 1.0.0-PHASE3C-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — READY FOR IMPLEMENTATION  
**Classification:** Internal Technical Architecture  
**Author:** Senior Domain Architect + Principal Backend Engineer  

---

# 1. EXISTING CUSTOMS CAPABILITIES & AUDIT

1. **Database Schema (Phase 1 Baseline):**
   - Table `public.cus_declarations` exists with RLS, containing `id`, `tenant_id`, `declaration_number`, `service_request_id`, `work_order_id`, `importer_id`, `ppjk_id`, `declaration_type`, `customs_office_code`, `billing_code`, `total_duty_and_tax`, `ntpn_payment_ref`, `paid_at`, `channel`, `sppb_number`, `sppb_date`, `status`, `version_no`, `created_at`, `updated_at`.
   - Table `public.cus_classification_lines` exists with RLS and cascade deletion from `cus_declarations`, containing `id`, `tenant_id`, `declaration_id`, `item_sequence`, `hs_code`, `goods_description`, `cif_value_usd`, `bm_rate_percent`, `ppn_rate_percent`, `pph_rate_percent`, `calculated_bm_idr`, `calculated_ppn_idr`, `calculated_pph_idr`.
   - Canonical enums: `cus_declaration_type` (`PIB_IMPORT`, `PEB_EXPORT`, `BC23_TPB`, `BC16_PLB`, `PPFTZ_FTZ`), `cus_channel_type` (`GREEN`, `YELLOW`, `RED`, `MITA_NON_PRIORITY`, `AEO_PRIORITY`).

2. **Cross-Domain Adapter (Phase 2 Baseline):**
   - `lib/domain/service-contracts/adapters/customs-adapter.ts` exists and implements `ServiceRequestAdapter` translating `ServiceRequest` into `cus_declarations`.

3. **Current API & UI State:**
   - No standalone Customs REST APIs exist under `app/api/v1/customs/`.
   - UI (`app/(dashboard)/sbu/clearance/page.tsx`) is currently a static placeholder card ("Clearance Module in Development").

---

# 2. MISSING DOMAIN CAPABILITIES TO BE IMPLEMENTED (PHASE 3C)

1. **Pure Customs Domain Engine (`lib/domain/customs/`):**
   - `types.ts`: Domain models, DTOs, and value objects.
   - `errors.ts`: Typed error hierarchy (`DeclarationNotFoundError`, `InvalidDeclarationStateError`, `ClassificationError`, `SppbIssuanceError`, etc.).
   - `state-machine.ts`: Explicit state transition engine (`DRAFT` $\rightarrow$ `DOCUMENTS_PENDING` $\rightarrow$ `CLASSIFIED` $\rightarrow$ `SUBMITTED` $\rightarrow$ `CHANNEL_ASSIGNED` $\rightarrow$ `APPROVED` $\rightarrow$ `SPPB_PENDING` $\rightarrow$ `RELEASED` $\rightarrow$ `COMPLETED`).
   - `tax-calculator.ts`: Deterministic calculation engine for Nilai Pabean, Bea Masuk (BM), PPN, and PPh 22 Import.
   - `declaration-factory.ts`: Canonical aggregate factory generating standard Nomor Pengajuan 26-digit format (`AJU-KPPBC-YYYYMMDD-XXXXXX`).
   - `declaration-repository.ts`: Supabase/PostgreSQL repository for `cus_declarations` and `cus_classification_lines` with RLS.
   - `customs-service.ts`: Primary application service orchestrating Standalone Declarations and Delegated Service Requests.
   - `classification-service.ts`: HS classification lines management and batch tax re-computation.
   - `sppb-service.ts`: SPPB release validation and issuance.
   - `service-request-handler.ts`: Service request consumption from Forwarding or Commercial scopes.
   - `api-helper.ts`: Server-enforced auth/tenant context and domain error mapping.

2. **RESTful Customs APIs (`app/api/v1/customs/`):**
   - `/api/v1/customs/declarations` (POST, GET)
   - `/api/v1/customs/declarations/[id]` (GET, PATCH)
   - `/api/v1/customs/declarations/[id]/classification` (GET, POST)
   - `/api/v1/customs/declarations/[id]/classification/[lineId]` (PATCH, DELETE)
   - `/api/v1/customs/declarations/[id]/calculate-tax` (POST)
   - `/api/v1/customs/declarations/[id]/channel` (GET, PATCH)
   - `/api/v1/customs/declarations/[id]/sppb` (GET, POST)
   - `/api/v1/customs/declarations/[id]/timeline` (GET)

---

# 3. RISKS & BOUNDARY GOVERNANCE

| Risk Area | Risk Description | Architectural Mitigation |
| :--- | :--- | :--- |
| **Financial Boundary** | Accidental mutation of Commercial AR/Revenue from Customs. | Customs calculates tax and generates pass-through disbursement obligations only. Zero direct ledger posting. |
| **Domain Isolation** | Customs mutating Shipment or Trucking tables. | Customs communicates strictly via `event_outbox` (`customs.declaration.released`, `customs.sppb.issued`). Zero direct writes to `shp_*` or `job_orders`. |
| **Tenant Security** | Cross-tenant declaration access or tampering. | Enforce `resolveApiAuthContext` and RLS `tenant_id = public.get_my_tenant_id()`. Untrusted client body `tenant_id` is ignored. |
| **State Corruption** | Arbitrary status mutation (e.g. issuing SPPB while in DRAFT). | `CustomsStateMachine` strictly validates all transitions server-side. |

---
*Discovery completed. Ready for Domain Model and REST API implementation.*
