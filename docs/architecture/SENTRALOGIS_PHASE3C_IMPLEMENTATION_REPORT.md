# SENTRALOGIS — PHASE 3C IMPLEMENTATION REPORT
## Standalone Customs Clearance Domain & REST API Implementation
**Document Version:** 1.0.0-PHASE3C-REPORT  
**Date:** 26 August 2026  
**Status:** PHASE 3C COMPLETED & VALIDATED (PASS)  
**Classification:** Internal Technical Architecture  
**Author:** Senior Domain Architect + Principal Backend Engineer  

---

# 1. PHASE OBJECTIVE

Phase 3C of **Sentralogis Target Architecture v1.0** has been successfully implemented and validated. SBU Customs Clearance is now established as a genuine **independent Bounded Context** with its own Aggregate Root (`cus_declarations`), HS classification line items (`cus_classification_lines`), deterministic Indonesian import tax & duty calculation engine (Nilai Pabean, Bea Masuk, PPN, PPh 22), channel management (GREEN, YELLOW, RED), and SPPB release engine. Customs can execute both standalone commercial declarations and consume Service Requests from Forwarding without mutating Shipment, Trucking, or Commercial database tables directly.

---

# 2. FILES CREATED & MODIFIED

### Files Created:
1. `lib/domain/customs/types.ts` (Domain models, DTOs, calculation context, and aggregate types)
2. `lib/domain/customs/errors.ts` (Explicit domain error hierarchy)
3. `lib/domain/customs/state-machine.ts` (Canonical Customs lifecycle state machine)
4. `lib/domain/customs/tax-calculator.ts` (Deterministic Indonesian tax & duty calculation engine)
5. `lib/domain/customs/declaration-factory.ts` (Aggregate factory generating 26-digit Nomor Pengajuan `AJU-KPPBC-YYYYMMDD-XXXXXX`)
6. `lib/domain/customs/declaration-repository.ts` (Supabase/PostgreSQL repository for `cus_declarations` & `cus_classification_lines`)
7. `lib/domain/customs/classification-service.ts` (Classification line items management & batch tax re-computation)
8. `lib/domain/customs/sppb-service.ts` (SPPB release validation and issuance engine)
9. `lib/domain/customs/customs-service.ts` (Primary application service facade)
10. `lib/domain/customs/api-helper.ts` (Server-enforced auth/tenant context resolver & error mapping engine)
11. `app/api/v1/customs/declarations/route.ts` (POST - Create Declaration, GET - List Declarations)
12. `app/api/v1/customs/declarations/[id]/route.ts` (GET - Detail Aggregate, PATCH - Transition Status)
13. `app/api/v1/customs/declarations/[id]/classification/route.ts` (GET - Lines, POST - Add Lines)
14. `app/api/v1/customs/declarations/[id]/classification/[lineId]/route.ts` (DELETE - Remove Line)
15. `app/api/v1/customs/declarations/[id]/calculate-tax/route.ts` (POST - Preview / Compute Taxes)
16. `app/api/v1/customs/declarations/[id]/channel/route.ts` (GET - Channel, POST/PATCH - Assign Channel)
17. `app/api/v1/customs/declarations/[id]/sppb/route.ts` (GET - SPPB Info, POST - Issue SPPB Release)
18. `app/api/v1/customs/declarations/[id]/timeline/route.ts` (GET - Customs Lifecycle Timeline Projection)
19. `docs/architecture/SENTRALOGIS_PHASE3C_DISCOVERY_REPORT.md` (Formal Discovery Report)
20. `docs/architecture/SENTRALOGIS_PHASE3C_CUSTOMS_DOMAIN_ARCHITECTURE.md` (Domain Architecture Specification)
21. `docs/architecture/SENTRALOGIS_PHASE3C_CUSTOMS_API_CONTRACT.md` (REST API Contract Specification)
22. `lib/domain/customs/__tests__/customs-domain.test.ts` (Automated Domain & API Test Suite)
23. `docs/architecture/SENTRALOGIS_PHASE3C_IMPLEMENTATION_REPORT.md` (This formal report)

### Files Modified:
1. `scratch/run-tests.ts` (Unified acceptance test runner executing Phase 2, 3A, 3B, and 3C suites)

### Files Explicitly Untouched & Protected (100% Frozen):
* `android/app/src/main/java/com/sentralogis/driver/*` (Android Native Foreground GPS Service)
* `app/jo/[token]/page.tsx` (Driver PWA Interface)
* `app/api/jo/*` (Driver Telemetry & GPS APIs)
* `lib/hooks/useDriverGpsPing.ts` & `lib/offline/offlineSyncEngine.ts` (GPS Engine)
* `src/domains/trucking/*` (Mature Trucking Aggregates)
* Production Tables: `job_orders`, `job_routes`, `job_tracking`, `data_armada`, `data_driver`, `md_locations`, `md_entities`, `md_tenants`
* Legacy Forwarding UI & API routes

---

# 3. DOMAIN ARCHITECTURE & BOUNDARIES

1. **Customs Declaration Aggregate Root (`cus_declarations`):**
   - Independent operational aggregate owning the customs filing process.
   - Child entity: `cus_classification_lines` (cascade deleted, item-sequenced).
2. **Deterministic Indonesian Tax Calculation Engine:**
   - Evaluates: $\text{Nilai Pabean} = \text{CIF (USD)} \times \text{Kurs Pajak}$, $\text{Bea Masuk} = \text{Nilai Pabean} \times \text{BM \%}$, $\text{Nilai Impor} = \text{Nilai Pabean} + \text{Bea Masuk}$, $\text{PPN} = \text{Nilai Impor} \times 11\%$, $\text{PPh 22} = \text{Nilai Impor} \times 2.5\%$, $\text{Total Pajak} = \text{BM} + \text{PPN} + \text{PPh 22}$.
3. **Channel-Driven State Machine:**
   - `GREEN` Channel $\rightarrow$ Fast-track release to `APPROVED` $\rightarrow$ `SPPB_PENDING` $\rightarrow$ `RELEASED`.
   - `RED` Channel $\rightarrow$ Requires physical inspection (`INSPECTION_REQUIRED` $\rightarrow$ `APPROVED` $\rightarrow$ `RELEASED`).
4. **Service Contract Consumption:**
   - Consumes `svc_service_requests` (`CUS_IMPORT_PIB_STANDARD`) via `CustomsServiceRequestAdapter`.
   - Zero direct SQL writes from Forwarding into `cus_declarations`.
5. **Event Outbox Integration:**
   - Emits `customs.declaration.created`, `customs.declaration.status_changed`, `customs.channel.assigned`, `customs.sppb.issued`, `customs.declaration.released` to `event_outbox`.

---

# 4. REST API ENDPOINTS

| Endpoint | Method | Purpose | Authentication & Status |
| :--- | :---: | :--- | :--- |
| `/api/v1/customs/declarations` | `POST` | Create Customs Declaration (AJU generated) | Tenant enforced, `201 Created` |
| `/api/v1/customs/declarations` | `GET` | List declarations with filters (status, channel) | Current tenant only, `200 OK` |
| `/api/v1/customs/declarations/:id` | `GET` | Detailed composite declaration aggregate | Current tenant only, `200 OK` / `404` |
| `/api/v1/customs/declarations/:id` | `PATCH` | Transition declaration status | State machine validated, `200` / `409` |
| `/api/v1/customs/declarations/:id/classification` | `GET` | List HS Code classification lines | Current tenant only, `200 OK` |
| `/api/v1/customs/declarations/:id/classification` | `POST` | Add HS classification lines with tax compute | Current tenant only, `201 Created` |
| `/api/v1/customs/declarations/:id/classification/:lineId` | `DELETE` | Remove HS classification line | Current tenant only, `200 OK` |
| `/api/v1/customs/declarations/:id/calculate-tax` | `POST` | Preview / Recalculate import taxes & duties | Current tenant only, `200 OK` |
| `/api/v1/customs/declarations/:id/channel` | `GET` / `POST` | View / Assign Customs Channel (GREEN/YELLOW/RED) | Current tenant only, `200 OK` |
| `/api/v1/customs/declarations/:id/sppb` | `GET` / `POST` | View / Issue SPPB Customs Release | Inspection gated, `200` / `412` |
| `/api/v1/customs/declarations/:id/timeline` | `GET` | Unified chronological customs timeline | Current tenant only, `200 OK` |

---

# 5. AUTOMATED TESTS & VALIDATION RESULTS

### Test Suite Execution Output:
```
====================================================
RUNNING PHASE 2 SERVICE CONTRACT VALIDATION SUITE
====================================================
[PASS] TEST 1: Create Trucking ServiceRequest with valid payload
[PASS] TEST 2: Idempotency key enforcement & validation
[PASS] TEST 4: Adapter registry correctly routes to Trucking adapter without direct DB bleed
[PASS] TEST 6: Tenant A cannot access or mutate Tenant B Service Request
[PASS] TEST 7: Invalid state transition rejected by dispatcher
[PASS] TEST 8: Invalid trucking payload without route_specification rejected
[PASS] TEST 9: Customs adapter recognizes CUS SKUs and validates declaration parameters
[PASS] TEST 11: Correlation ID preserved across service request lifecycle
====================================================
RUNNING PHASE 3A SHIPMENT DOMAIN VALIDATION SUITE
====================================================
[PASS] TEST 1: Create valid canonical Shipment aggregate via factory
[PASS] TEST 2: Reject shipment creation when missing mandatory attributes
[PASS] TEST 3: State machine rejects invalid transitions (e.g. DRAFT -> COMPLETED)
[PASS] TEST 4: Factory creates polymorphic CONTAINER unit with ISO type and tare weight
[PASS] TEST 5: Factory creates polymorphic BULK unit with metric tonnage and moisture %
[PASS] TEST 6: Factory creates polymorphic VEHICLE unit with VIN and drivable flag
[PASS] TEST 7: Build multimodal execution plan (Ocean -> Port Handling -> Customs -> Road)
[PASS] TEST 8: Leg sequencing validator identifies premature road dispatch before customs release
[PASS] TEST 14: Verify Shipment aggregate model contains NO private trucking columns
[PASS] TEST 15: Tenant boundary check correctly enforces tenant isolation
====================================================
RUNNING PHASE 3B SHIPMENT API & INTEGRATION SUITE
====================================================
[PASS] TEST 01: POST valid shipment payload generates canonical aggregate
[PASS] TEST 05: Invalid status transition maps to HTTP 409 Conflict
[PASS] TEST 06: Create CONTAINER unit with ISO type and seal verification
[PASS] TEST 07: Create BULK unit with metric tonnage
[PASS] TEST 08: Create PACKAGE unit (PALLET / BOX)
[PASS] TEST 09: Create VEHICLE unit with VIN and drivable flag
[PASS] TEST 11 & 12: Multimodal leg sequencing validation and error mapping to HTTP 422
[PASS] TEST 14: Reject unit assignment when unit does not belong to shipment
[PASS] TEST 18: Tenant boundary violation maps to HTTP 403 Forbidden
[PASS] TEST 22 & 23: Verify Shipment API layer contains NO direct job_orders or cus_declarations insertions
[PASS] TEST 24 & 25: Sanitize unexpected internal database errors into clean HTTP 500 without leaking stack traces
====================================================
RUNNING PHASE 3C CUSTOMS DOMAIN & API SUITE
====================================================
[PASS] TEST 01: Create valid PIB Import declaration with Nomor Pengajuan AJU
[PASS] TEST 02: Create valid PEB Export declaration
[PASS] TEST 03 & 04: Tenant boundary check rejects cross-tenant declaration access (HTTP 403)
[PASS] TEST 05: State machine rejects invalid transition (e.g. DRAFT -> RELEASED)
[PASS] TEST 06 & 07: Construct classification lines with pre-computed taxes
[PASS] TEST 08 & 09: Deterministic tax computation: CIF $10,000 @ Rp 16,000, BM 5%, PPN 11%, PPh 2.5%
[PASS] TEST 10, 11 & 12: Red Channel requires physical inspection approval before SPPB release
[PASS] TEST 13 & 14: SPPB rejection on DRAFT status and format verification
[PASS] TEST 19 & 20: Customs domain contains zero direct job_orders or work_orders mutations
====================================================
TOTAL SUITE SUMMARY: 38 / 38 PASSED (100% PASS RATE)
====================================================
```

### Static Analysis & Verification:
- **TypeScript (`npx tsc --noEmit`):** **PASS (Code 0 across entire repository)**.
- **ESLint (`npx eslint lib/domain/customs/ app/api/v1/customs/`):** **PASS (Code 0 on all new files)**.
- **Architectural Grep Audit:** **0 direct insertions** into `job_orders`, `work_orders`, or foreign tables from the Customs domain.

---

# 6. PRODUCTION TRUCKING & BACKWARD COMPATIBILITY IMPACT
- **Production Trucking Domain:** **100% FROZEN & UNTOUCHED**.
- **Driver Applications & Telemetry:** **ZERO IMPACT**.
- **Forwarding Domain:** **100% PRESERVED & INTEGRATED VIA CONTRACTS**.

---

# 7. PHASE 3C STATUS & CONCLUSION

**PHASE 3C COMPLETE (100% Selesai & Tervalidasi)**

---
*Signed by Senior Domain Architect + Principal Backend Engineer — 26 August 2026*
