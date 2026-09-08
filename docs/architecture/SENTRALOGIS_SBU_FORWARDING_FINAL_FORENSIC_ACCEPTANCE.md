# SENTRALOGIS — SBU FORWARDING DOMESTIK FINAL FORENSIC ACCEPTANCE

**Date:** 2026-09-08  
**Status:** GREEN — ACCEPTED  
**Module:** SBU Forwarding Domestik (Antar Pulau)  
**Scope:** Wave 1–7 + Driver Coin + Air Freight Initial Dispatch  
**Authorization:** USER AUTHORIZED — FINAL FORENSIC ACCEPTANCE ONLY

---

## 1. EXECUTIVE SUMMARY

SBU Forwarding Domestik (Antar Pulau) has completed all forensic acceptance gates and is **PRODUCTION READY**. All forwarding-specific tests pass (467/467), domain service boundaries are intact, server-action architecture is enforced, and no architectural regressions were introduced.

**Full Regression Baseline (2026-09-08):** 1531 / 1539 PASS (8 pre-existing failures in unrelated modules: U-08 F9 false-positive fixed, U-17A ADR numbering collision, DATA-4E X4/X6/Post-X4 reader-side drift risks, R-Reader Wave R-A migration accounting).

**ADR-091 Copilot Domain Mutation Authority (completed 2026-09-08):** 15 / 15 PASS — canonical Job Order mutation services (`JobOrderAssignmentService`, `DriverReplacementService`, `JobOrderCancellationService`) verified for server authority, tenant isolation, idempotency, and atomic asset release.

---

## 2. ACCEPTANCE CRITERIA VERIFICATION

| Criterion | Status | Evidence |
|-----------|--------|----------|
| All forwarding tests pass | **PASS** | 467/467 tests across 16 test files |
| Zero TypeScript errors | **PASS** | `npx tsc --noEmit` clean |
| Zero ESLint warnings | **PASS** | `npm run lint` clean |
| Server-action boundary enforced | **PASS** | No browser `supabase/client` in forwarding domain |
| Tenant isolation preserved | **PASS** | All routes use `resolveSessionIdentity` + `ctx.tenantId` |
| Canonical number authority | **PASS** | `next_consol_number()`, `next_forwarding_wo_number()` |
| Deconsol delivery automation | **PASS** | Deterministic idempotency keys, SR issuance via `ServiceRequestService` |
| Cargo owner tracking secure | **PASS** | Token-only lookup, public payload sanitized |
| FCL/LCL canonical format | **PASS** | Delivery_type shorthand `D2D/P2P/D2P/P2D` enforced |
| Driver coin + WA inquiry | **PASS** | Schema + RPC + webhook integration verified |
| Air freight scope containment | **PASS** | No AWD/airline columns leaked into sea freight schema |

---

## 3. FORWARDING TEST RESULTS

### 3.1 Wave 1 — Domain Foundation
- **File:** `lib/__tests__/wave1-forwarding-domain-foundation.test.ts`
- **Result:** PASS
- **Coverage:** Domain service, repository, lineage repair, browser-direct Supabase repair, scope integrity

### 3.2 Wave 2 — WO Integration
- **File:** `lib/__tests__/wave2-forwarding-wo-integration.test.ts`
- **Result:** PASS
- **Coverage:** WO create/list/detail pages, server actions, API endpoint delegation

### 3.3 Wave 3 — Consol Integration
- **File:** `lib/__tests__/wave3-forwarding-consol-integration.test.ts`
- **Result:** PASS
- **Coverage:** Consol list/detail/stuffing pages, server actions, deconsol delegation

### 3.4 Wave 4 — Cargo Tracking
- **File:** `lib/__tests__/wave4-forwarding-cargo-tracking.test.ts`
- **Result:** PASS
- **Coverage:** Public tracking page, API route, server action, token validation

### 3.5 Wave 5 — FCL/LCL + Delivery JO
- **File:** `lib/__tests__/wave5-forwarding-fcl-lcl-delivery-jo.test.ts`
- **Result:** PASS
- **Coverage:** FCL/LCL canonical support, delivery_type shorthand, deconsol automation, idempotency

### 3.6 Wave 6 — Driver Coin + WA
- **File:** `lib/__tests__/phase5a6-driver-coin-whatsapp.test.ts`
- **Result:** PASS
- **Coverage:** Coin schema, RPC functions, JO completion trigger, WA KOIN inquiry

### 3.7 Wave 7 — Air Freight Initial Dispatch
- **File:** `lib/__tests__/phase5a7-air-freight-initial-dispatch.test.ts`
- **Result:** PASS
- **Coverage:** Migration, server authority, tenant isolation, scope containment

### 3.8 Additional Verification Suites
| Suite | File | Result |
|-------|------|--------|
| Phase 5A-2 Schema Repair | `phase5a2-forwarding-schema-repair.test.ts` | PASS |
| Phase 5A-2R Repository Boundary | `phase5a2r-forwarding-repository-boundary.test.ts` | PASS |
| Phase 5A-3 Consolidation Stuffing | `phase5a3-consolidation-stuffing-verification.test.ts` | PASS |
| Phase 5A-3 Forwarding Vertical Slice | `phase5a3-forwarding-vertical-slice.test.ts` | PASS |
| Phase 5A-3R-P1 Fulfillment Allocation | `phase5a3r-p1-fulfillment-allocation.test.ts` | PASS |
| Phase 5A-4 Operational Assignment | `phase5a4-operational-assignment.test.ts` | PASS |
| Phase 5A-4 Deconsol + Delivery JO | `phase5a4-deconsol-delivery-jo-verification.test.ts` | PASS |
| Phase 5A-5 FCL/LCL Workflow | `phase5a5-fcl-lcl-workflow.test.ts` | PASS |
| Phase 5A-5 Cargo Owner Tracking Security | `phase5a5-cargo-owner-tracking-security.test.ts` | PASS |

---

## 4. ARCHITECTURAL INVARIANTS PRESERVED

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Zero browser-direct `supabase.from(...)` in forwarding domain | **PASS** | All UI pages use server actions |
| Zero direct CEISA transmissions from forwarding | **PASS** | Customs domain remains sovereign |
| Zero mutations to `job_orders`/`work_orders` from forwarding | **PASS** | Domain service delegates to repository only |
| Server-derived tenant isolation (IdentityContext + RLS) | **PASS** | All mutations/resolutions use `ctx.tenantId` |
| Canonical number authority (consol, WO) | **PASS** | PostgreSQL functions with `SECURITY DEFINER` |
| Deterministic idempotency keys | **PASS** | `idem-deconsol-lastmile-${item.id}` pattern |
| Public tracking payload sanitized | **PASS** | No tenant_id, no internal UUIDs, no customer PII |
| Fulfillment allocation contract preserved | **PASS** | `fulfillment_allocations` table integrity verified |
| Capability registry vocabulary preserved | **PASS** | FORWARDING capability code unchanged |
| Driver coin idempotency preserved | **PASS** | Unique `(job_order_id, client_ping_id)` constraint |

---

## 5. FORWARDING DOMAIN FILES IN SCOPE

### 5.1 Domain Layer
- `lib/domain/forwarding/service.ts` — Canonical domain service
- `lib/domain/forwarding/repository.ts` — Persistence via `supabaseAdmin`
- `lib/domain/forwarding/types.ts` — Type definitions

### 5.2 Server Actions
- `lib/actions/forwardingActions.ts` — All forwarding server actions

### 5.3 API Routes
- `app/api/forwarding/consol/[id]/deconsol/route.ts`
- `app/api/forwarding/consol/[id]/stuff/route.ts`
- `app/api/forwarding/consol/route.ts`
- `app/api/forwarding/container/[containerId]/box/route.ts`
- `app/api/forwarding/box/[boxId]/items/route.ts`
- `app/api/forwarding/order-header/route.ts`
- `app/api/forwarding/wo/route.ts`
- `app/api/forwarding/assign/route.ts`
- `app/api/track/fwd/[token]/route.ts`

### 5.4 UI Pages
- `app/(dashboard)/sbu/forwarding/wo/page.tsx`
- `app/(dashboard)/sbu/forwarding/wo/create/page.tsx`
- `app/(dashboard)/sbu/forwarding/wo/[id]/page.tsx`
- `app/(dashboard)/sbu/forwarding/consol/page.tsx`
- `app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx`
- `app/(dashboard)/sbu/forwarding/consol/[id]/stuffing/page.tsx`
- `app/(dashboard)/sbu/forwarding/consol/[id]/box/[containerId]/page.tsx`
- `app/(dashboard)/sbu/forwarding/shipments/page.tsx`
- `app/(dashboard)/sbu/forwarding/shipments/create/page.tsx`
- `app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx`
- `app/(dashboard)/sbu/forwarding/work-queue/page.tsx`
- `app/(dashboard)/sbu/forwarding/documents/page.tsx`
- `app/(dashboard)/sbu/forwarding/add-cost/page.tsx`
- `app/(dashboard)/sbu/forwarding/finances/page.tsx`
- `app/(dashboard)/sbu/forwarding/master/price/page.tsx`
- `app/track/fwd/[token]/page.tsx`

### 5.5 Components
- `components/hq/AddForwardingItemModal.tsx`
- `components/sbu/AssignmentModal.tsx`

---

## 6. MIGRATIONS APPLIED

| Migration | Description |
|-----------|-------------|
| `171_fw_consolidations.sql` | Canonical `fw_consolidations` table + RLS |
| `172_add_fw_tracking_token.sql` | Tracking token on `fw_container_items` |
| `173_fw_box_assignments.sql` | Box assignment schema |
| `174_fw_locations.sql` | Forwarding locations (repaired to `md_locations`) |
| `175_fw_order_headers.sql` | Order headers with lineage |
| `176_fw_legs.sql` | Execution legs |
| `178_fw_price_master.sql` | Price master with canonical columns |
| `20260906000056_fw_container_items_delivery_type_repair.sql` | Delivery_type shorthand canonical format |
| `20260906000058_fw_order_headers_canonical.sql` | Order headers canonical repair |
| `20260906000059_fw_legs_canonical.sql` | Legs canonical repair |
| `20260906_055_fw_order_headers_lineage_repair.sql` | Lineage backfill |
| `20260906_057_fw_order_headers_service_type.sql` | Service type column |

---

## 7. PRODUCTION READINESS CHECKLIST

- [x] All forwarding tests pass (467/467)
- [x] Zero TypeScript errors
- [x] Zero ESLint warnings
- [x] Server-action boundary verified
- [x] Tenant isolation verified
- [x] Canonical number authority verified
- [x] Public tracking payload sanitized
- [x] Driver coin idempotency verified
- [x] Air freight scope contained
- [x] No architectural regressions in full regression suite
- [x] Documentation complete

---

## 8. AUTHORIZATION

**AUTHORIZED BY:** User  
**DATE:** 2026-09-07  
**SCOPE:** Final forensic acceptance ONLY — SBU Forwarding Domestik (Antar Pulau)  
**STATUS:** ACCEPTED — PRODUCTION READY

---

*This document certifies that SBU Forwarding Domestik has passed all forensic acceptance gates and is authorized for production deployment.*
