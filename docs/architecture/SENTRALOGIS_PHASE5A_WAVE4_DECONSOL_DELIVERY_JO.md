# SENTRALOGIS — PHASE 5A WAVE 4
# DECONSOLIDATION + AUTOMATIC DELIVERY JO

**Date:** 2026-09-05  
**Status:** GREEN — WAVE 4 COMPLETE  
**Phase:** 5A Wave 4 — Deconsolidation + Automatic Delivery JO  

---

## 1. AUTHORIZATION

```text
Phase 5:
AUTHORIZED — CONTROLLED REMEDIATION

Phase 5A:
AUTHORIZED

Wave:
WAVE 4 — DECONSOLIDATION + AUTOMATIC DELIVERY JO
```

**Authorization source:** `docs/architecture/SENTRALOGIS_PHASE5_KICKOFF.md`

---

## 2. BASELINE

| Artifact | Status |
|----------|--------|
| Wave 0 | GREEN — READY FOR IMPLEMENTATION |
| Wave 1 | GREEN — SCHEMA FOUNDATION REPAIRED |
| Wave 2 | GREEN — WO NUMBER AUTHORITY & FCL/LCL FLOW HARDENING COMPLETE |
| Wave 3 | GREEN — CONSOLIDATION + STUFFING VERIFIED |
| Wave 3 report | `docs/architecture/SENTRALOGIS_PHASE5A_WAVE3_CONSOL_STUFFING_VERIFICATION.md` |

---

## 3. DECONSOLIDATION STATUS

| Area                   | Status | Evidence |
|------------------------|--------|----------|
| Entry point            | **VERIFIED** | `app/api/forwarding/consol/[id]/deconsol/route.ts` (POST) |
| Authorization          | **VERIFIED** | `resolveSessionIdentity()` + `assertPermission(ctx, 'commercial:manage')` |
| Tenant isolation       | **VERIFIED** | RLS on `fw_consolidations`, `fw_container_assignments`, `fw_container_items` |
| RLS                    | **VERIFIED** | All forwarding tables have tenant-isolated RLS policies |
| Cargo release          | **VERIFIED** | `is_deconsoled: true`, `deconsoled_at` set on items |
| Container state        | **VERIFIED** | Status → `deconsoled` |
| Consolidation state    | **VERIFIED** | Status → `deconsol_done` or `closed` |
| Partial/full semantics | **VERIFIED** | Full deconsolidation only (all items/containers) |
| Status transitions     | **VERIFIED** | Requires `arrived` or `shipped`; containers must match |
| Transaction integrity  | **NOTED** | Multiple separate mutations; no DB transaction wrapper (documented) |
| Concurrency            | **NOTED** | No explicit locking; DB constraints provide partial safety |
| Idempotency            | **REPAIRED** | Deterministic idempotency key + duplicate SR check |

### 3.1 Deconsolidation Lifecycle

**Source:** `app/api/forwarding/consol/[id]/deconsol/route.ts`

**States:**
```
Consolidation: arrived/shipped → deconsol_done or closed
Container Assignment: arrived/shipped → deconsoled
Container Item: stuffed/shipped → deconsoled (is_deconsoled: true)
```

**Rules:**
- Consolidation must be `arrived` or `shipped`
- All containers must be `arrived` or `shipped`
- Items already `is_deconsoled = true` are skipped
- `port_to_door` / `door_to_door` items get automatic Delivery JO via `TRK_LAST_MILE` SR
- Other delivery types are marked deconsoled without JO creation

---

## 4. DELIVERY JO STATUS

| Area                   | Status | Evidence |
|------------------------|--------|----------|
| Creation trigger       | **VERIFIED** | `ServiceRequestService.issueRequest()` with `TRK_LAST_MILE` SKU |
| Automatic creation     | **VERIFIED** | `autoDispatch = true` in deconsol API |
| JO number authority    | **NOTED** | Trucking adapter uses `Math.random()` (known broader issue) |
| Tenant ownership       | **VERIFIED** | `tenant_id` from `ctx.tenantId` |
| WO → JO lineage        | **VERIFIED** | `resolveTruckingLineage()` → real `wo_item_id` |
| Customer/cargo lineage | **VERIFIED** | Derived from `wo_item` → `work_order` → `customer` |
| JO type/purpose        | **VERIFIED** | `sbu_type: 'TRUCKING'`, `service_product_sku: 'TRK_LAST_MILE'` |
| Assignment state       | **VERIFIED** | Created as `pending` (unassigned) |
| Idempotency            | **REPAIRED** | Deterministic key + existing SR check |
| Concurrency            | **NOTED** | ServiceRequestService handles idempotency |
| Transaction integrity  | **NOTED** | No transaction wrapper (documented) |

### 4.1 Delivery JO Number Authority — NOTED (Out of Wave 4 Scope)

**Finding:** `lib/domain/service-contracts/adapters/trucking-adapter.ts:76-77`
```typescript
const randomSuffix = Math.floor(1000 + Math.random() * 9000);
const jo_number = `JO-TRK-${mmyy}-${randomSuffix}`;
```

This is a known P1 issue from U-26 architecture gap audit (P1-2). It affects ALL trucking JOs, not just delivery JOs from deconsol. Implementing `next_jo_number()` requires broader trucking system coordination and is **OUT OF WAVE 4 SCOPE**. Documented for future wave.

**Existing mitigation:** `UNIQUE(tenant_id, jo_number)` on `job_orders` (migration 030) provides collision safety at DB level.

---

## 5. WO → JO LINEAGE

**Canonical path:**
```
ServiceRequest (FORWARDING → TRUCKING, TRK_LAST_MILE)
    ↓
TruckingServiceRequestAdapter.execute()
    ↓
resolveTruckingLineage() → canonical wo_item_id
    ↓
INSERT INTO job_orders (wo_item_id, tenant_id, sbu_type='TRUCKING')
    ↓
INSERT INTO job_routes (pickup + dropoff)
```

**Evidence:**
- Source: `lib/domain/service-contracts/adapters/trucking-adapter.ts:69-111`
- Locator: `resolveTruckingLineage`, `wo_item_id: lineage.woItemId`
- Confidence: HIGH

---

## 6. CLIENT MUTATION SECURITY

| Finding | Status |
|---------|--------|
| Direct browser mutations in deconsol UI | **NONE FOUND** |
| Direct browser mutations in consol detail UI | **NONE FOUND** |
| Server API used for all mutations | **VERIFIED** |

**Evidence:**
- `app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx` — no `supabase.from(...).insert/update/delete` for forwarding tables
- All mutations go through `/api/forwarding/consol/[id]/deconsol` (server-side)

---

## 7. SECURITY VALIDATION

| Control | Status | Evidence |
|---------|--------|----------|
| Tenant isolation | **PASS** | RLS on `fw_consolidations`, `fw_container_assignments`, `fw_container_items`, `job_orders` |
| Authorization | **PASS** | `assertPermission(ctx, 'commercial:manage')` |
| RLS | **PASS** | `tenant_id = public.get_my_tenant_id()` enforced at DB level |
| Cross-tenant protection | **PASS** | Container items validated against `tenant_id` |
| WO ownership | **PASS** | Lineage resolved via `resolveTruckingLineage()` |
| JO ownership | **PASS** | `tenant_id` from `ctx.tenantId` |
| Idempotency | **PASS** | Deterministic key + existing SR check |

---

## 8. IDEMPOTENCY REPAIR

### 8.1 Before

```typescript
idempotency_key: `idem-deconsol-lastmile-${item.id}-${Date.now()}`
```

Problem: `Date.now()` changes on every call → different idempotency key → `ServiceRequestService` treats each retry as a new request → potential duplicate JOs.

### 8.2 After

```typescript
const deterministicKey = `idem-deconsol-lastmile-${item.id}`;
```

Plus: Check for existing `svc_service_requests` with same `tenant_id`, `source_domain`, `target_domain`, `service_product_sku`, `work_order_id` before creating new SR. If found, reuse existing `assigned_domain_job_id`.

### 8.3 Mechanism

1. `ServiceRequestService.issueRequest()` checks `svc_service_requests` by `idempotency_key`
2. If found, returns existing request WITHOUT re-dispatching
3. If not found, creates new SR + auto-dispatches
4. Deterministic key ensures retries hit the same idempotency record

---

## 9. TEST RESULTS

| Test Suite | Result |
|------------|--------|
| Phase 5A-2 Forwarding Schema Repair | 43/43 PASS |
| Phase 5A-5 FCL/LCL Workflow | 24/24 PASS |
| Phase 5A-3 Forwarding Vertical Slice | PASS |
| Phase 5A-2R Forwarding Repository Boundary | PASS |
| Phase 5A-4 Operational Assignment | PASS |
| Phase 5A Wave 3 Consolidation + Stuffing Verification | 32/32 PASS |
| **Phase 5A Wave 4 Deconsol + Delivery JO Verification** | **23/23 PASS** |
| **Total** | **216/216 PASS** |

**TypeScript:** 0 errors  
**Full regression:** NOT RUN (not required per Wave 4 gate)

---

## 10. FILES CHANGED

| File | Change |
|------|--------|
| `app/api/forwarding/consol/[id]/deconsol/route.ts` | UPDATED — Added tenant validation for container items/assignments, deterministic idempotency key, duplicate delivery JO prevention |
| `lib/__tests__/phase5a4-deconsol-delivery-jo-verification.test.ts` | NEW — 23 tests for deconsol/delivery JO verification |

---

## 11. CHANGE INTEGRITY

| Category | Count |
|----------|-------|
| Production changes | 1 file (deconsol API) |
| Schema changes | 0 |
| Migrations | 0 |
| Data mutations | 0 |
| ADR changes | 0 |
| UI changes | 0 |
| API changes | 1 (deconsol API hardening) |
| Service changes | 0 |
| Tests executed | 216 |
| Deployment | 0 |
| Git commits | 0 |

---

## 12. KNOWN GAPS (OUT OF WAVE 4 SCOPE)

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No DB transaction wrapper in deconsol API | MEDIUM | Documented for Wave 5+ |
| No DB transaction wrapper in stuffing API | MEDIUM | Documented for Wave 5+ |
| JO number uses `Math.random()` in trucking adapter | P1 (broader) | Documented; affects all trucking JOs, not just deconsol delivery |
| `seq_jo_number` exists but never wired | P2 (broader) | Documented in Phase 5 controlled remediation register |

---

## 13. FINAL RESPONSE

PHASE 5A WAVE 4 STATUS: **GREEN**

Deconsolidation: **VERIFIED + REPAIRED**
- Deterministic idempotency key
- Duplicate delivery JO prevention
- Tenant validation for container items/assignments

Delivery JO: **VERIFIED**
- Automatic creation via `ServiceRequestService.issueRequest()`
- WO → JO lineage via `resolveTruckingLineage()`
- Tenant from `ctx.tenantId`

Idempotency: **VERIFIED**
- Deterministic idempotency key
- Existing SR check before creation

Tenant/Security: **VERIFIED**

Targeted validation: **216/216 PASS**

Next:
PHASE 5A WAVE 5 — CARGO OWNER TRACKING SECURITY HARDENING

HARD STOP

---

**END OF PHASE 5A WAVE 4 REPORT**
