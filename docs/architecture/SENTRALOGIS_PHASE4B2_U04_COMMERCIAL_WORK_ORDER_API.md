# SENTRALOGIS — PHASE 4B-2
# U-04 COMMERCIAL WORK ORDER APPLICATION API — IMPLEMENTATION REPORT

**Status:** COMPLETE · **Date:** 2026-08-26
**Depends on:** U-01 ✅ · U-02 ✅ · U-03 ✅
**Boundary:** Engagement → Commercial Work Order ONLY (mandate §2). No SR / binding /
execution below this line.

---

## 1. API Architecture

```
HTTP (route.ts, thin)
  ↓ resolveSessionIdentity()      ← lib/application/identity/session-source.ts (NEW wiring)
  ↓ IdentityContext               ← U-01 core resolver (reused, zero duplication)
  ↓ assertPermission              ← U-02 gates (commercial:manage POST / commercial:read GET)
  ↓ parseCreateCommand/parseListFilters   ← pure validation (400 before any DB touch)
  ↓ createWorkOrder()/listWorkOrders()/getWorkOrder()   ← application service
  ↓ U-03 resolveOrCreateEngagement()       ← THE single write path
  ↓ WorkOrderRepository (port)             ← tenant-scoped reads only
  ↓ commercial_work_orders                 ← canonical foundation
```

Routes contain no business logic. The service cannot express unscoped queries: the
repository port takes `tenantId` on every operation.

## 2. Canonical Schema Inspection (§5)

Source of truth = deployed migrations (`20260826_002` + `20260828_014`):

- PK `id UUID`; `UNIQUE(tenant_id, wo_number)`; partial unique index
  `uq_com_wo_open_per_customer(tenant_id, customer_id) WHERE status IN ('DRAFT','SUBMITTED')`
- `tenant_id` NOT NULL → md_tenants · `customer_id` NOT NULL → md_entities (tenant-scoped)
- `service_scope_id` NULLABLE (relaxed by migration 014 — U-03 blocker fix)
- `status com_work_order_status DEFAULT 'DRAFT'` — server-controlled at creation;
  never client-writable
- Defaults: currency IDR · total_agreed_revenue 0 · payment_terms_days 30 · version_no 1

## 3. POST Contract

`POST /api/v1/commercial/work-orders`

Request DTO (validated; ALL other keys rejected):
```jsonc
{
  "customerId": "uuid (required)",
  "engagementId": "uuid (optional explicit reference, consistency-checked)",
  "contractReference": "string ≤128 (optional)",
  "targetFulfillmentDate": "YYYY-MM-DD (optional)",
  "currency": "ISO-4217 3-letter (optional, default IDR)",
  "commercialNotes": "string ≤2000 (optional)"
}
```

Responses:
- **201 Created** `{ success, data: WorkOrderView, meta: { created: true } }`
- **200 OK** resolved existing open WO → `meta.created: false` (idempotent)
- Errors: 400 VALIDATION_FAILED (+details[]) · 401 UNAUTHENTICATED ·
  403 NO_TENANT_MEMBERSHIP/TENANT_MISMATCH/FORBIDDEN_PERMISSION ·
  404 CUSTOMER_NOT_FOUND / NOT_FOUND (non-leaking) · 409 ENGAGEMENT_CUSTOMER_MISMATCH /
  ENGAGEMENT_REFERENCE_CONFLICT / CONFLICT

Protected-field rejection is explicit: presence of ANY of
`{id, tenant_id, created_by, updated_by, wo_number, status, total_agreed_revenue,
payment_terms_days, version_no, service_scope_id, order_date}` → 400 with field list.

## 4. GET Contracts

- `GET /api/v1/commercial/work-orders?customerId&status&dateFrom&dateTo&limit&offset`
  → `{ success, data: WorkOrderView[], meta: { limit, offset, total } }`.
  Filters validated (enum status multi-value, ISO dates, limit 1–100 default 20).
  Always scoped to `identityContext.tenantId`; ordered `created_at DESC`; exact count.
- `GET /api/v1/commercial/work-orders/[id]` → single tenant-scoped view or non-leaking 404.

View projection excludes raw internals (`SELECT *` is never returned): id, woNumber,
customerId, status, orderDate, targetFulfillmentDate, currency, contractReference, createdAt.

## 5. Authorization Decision (§19)

POST → existing `commercial:manage`; GET list/single → existing `commercial:read`.
No new permissions introduced (smallest-surface rule). SBU-scoped roles simply lack
these permissions per the U-02 matrix and are denied 403.

## 6. Tenant Isolation & Service-Role Safety (§13/§14)

Tenant originates EXCLUSIVELY from `resolveSessionIdentity()`:
session (`auth.getUser()`) → live arrays (`tenant_users` staff branch UNIQUE(user_id),
`tenants.user_id` owner branch) → `resolveFromArrays()` → U-01 resolver (requested-tenant
validation included). Client-supplied tenant fields are rejected at validation (400)
before any query. Service-role client used only after identity+permission+scope gates.

## 7. Engagement Integration (§11/§12)

Single path through U-03 — no second resolver. Explicit `engagementId` semantics:
1. tenant-scoped fetch → missing ⇒ 404 (no cross-tenant existence leak);
2. `customer_id` mismatch vs command ⇒ 409 ENGAGEMENT_CUSTOMER_MISMATCH;
3. after bridge resolution, resolved-id ≠ supplied-id ⇒ 409 REFERENCE_CONFLICT
   (e.g., caller references a CLOSED row while an OPEN one resolves).

## 8. Status Semantics (§20)

Canonical enum only. Creation always initializes `DRAFT` server-side; clients cannot
set status. No legacy WO/JO status translation exists anywhere in the module.

## 9. Idempotency & Concurrency (§25/§26)

**Idempotency-Key NOT required** — documented decision: business uniqueness IS the
idempotency mechanism. `uq_com_wo_open_per_customer` makes duplicate open WOs physically
impossible; repeated/retried/double-clicked POSTs resolve the same open engagement
(`200`, `created:false`). Once closed, the next POST legitimately creates a new WO.

**Concurrency:** INSERT + `23505` recovery inside U-03 (unchanged, reused). T19 races
two service calls through an empty pre-state window → exactly ONE canonical row,
exactly one `created:true`.

**Transactionality (§29):** engagement creation and WO creation are the SAME atomic
INSERT via U-03; there is no second write and therefore no partial-state window. No
extra transaction machinery added.

## 10. Non-Creation Guarantees (§21–§24)

The service's only write path is the U-03 bridge (inserts `commercial_work_orders`
exclusively). Tests T13–T17 assert ZERO writes to `job_orders`, `wo_items`,
`work_orders` (legacy), `svc_service_requests`, `commercial_capability_bindings`, and
`legacy_wo_bridge`. No sbu_type/driver/fleet/GPS coupling exists anywhere in the module.

## 11. Test Results

| Suite | Result |
|---|---|
| U-04 core (T1–T19) | **15/15 PASS** |
| U-04 validation + reference conflict + GET single | **18/18 PASS** |
| U-01 regression | 36/36 PASS |
| U-02 regression | 66/66 PASS |
| U-03 regression | 11/11 PASS |
| Full regression | **689/689 PASS** |
| Typecheck | 0 errors |
| Lint | 0 errors / 0 warnings (all new files) |
| Production build | PASS |

Note: one run exhibited transient benchmark FAILs (10k-row perf tests) caused by
running the three async suites in parallel starving CPU; suites now execute
sequentially and all benchmarks pass. The known pre-existing flake
(`shipment-api` → `10.0.0.1:5432`) also passed in the final run.

## 12. Files

**Created**
```
lib/application/identity/session-source.ts                      (production identity wiring)
lib/application/commercial-work-orders/types.ts
lib/application/commercial-work-orders/validation.ts
lib/application/commercial-work-orders/repository.ts            (port + supabase impl)
lib/application/commercial-work-orders/service.ts
lib/application/commercial-work-orders/http.ts                  (error mapping)
lib/application/commercial-work-orders/index.ts
lib/application/commercial-work-orders/__tests__/mock-db.ts
lib/application/commercial-work-orders/__tests__/commercial-work-orders.test.ts
lib/application/commercial-work-orders/__tests__/validation.test.ts
app/api/v1/commercial/work-orders/route.ts                      (POST + GET list)
app/api/v1/commercial/work-orders/[id]/route.ts                 (GET single)
docs/architecture/SENTRALOGIS_PHASE4B2_U04_COMMERCIAL_WORK_ORDER_API.md
```

**Modified**
```
scratch/run-tests.ts   (suite registration + sequential async finalization only)
```

**Database migrations:** NONE required (foundation complete after U-03's migration 014).

## 13. Legacy Compatibility (§32)

Zero modifications to CreateWOForm, `/api/wo`, `/api/forwarding/*`, JO engine,
driver/GPS systems, customs engines. Existing Phase-4A capabilities route untouched
(its broken `resolveCustomsAuthContext` remains debt for U-08-class units).

## 14. Remaining Debt

1. `database.types.ts` regeneration still pending (carried from U-03) — after migration
   014 deploys.
2. Migration 014 must be applied to production before first real POST.
3. Existing `[id]/capabilities` route still uses broken customs auth helper — hardening
   belongs to its own authorized unit.
4. Sequential async test suites share module injection seams — acceptable now;
   refactor to per-suite dependency containers if suite count grows.
5. `wo_number` sequence race surfaces as retriable 409 under extreme concurrency
   (documented in U-03 report §14.4).

## 15. U-05 Recommendation

Proceed to **U-05 Capability Registry Foundation** (backlog): additive registry table +
seed of CUSTOMS/FORWARDING/TRUCKING/WAREHOUSE + registry-driven validation in
`CapabilityBindingFactory` with cached fallback. Independent of U-04 runtime paths but
lands in the same wave; requires its own migration + owner authorization. After U-05/U-06
the binding lifecycle PATCH can safely consume U-04's engagement surface.

---

```text
========================================
SENTRALOGIS — U-04 FINAL STATUS
========================================

POST API                          PASS
GET API                           PASS
IdentityContext                   PASS
Authorization                     PASS
Tenant Isolation                  PASS
Engagement Integration            PASS
Validation                        PASS
Idempotency                       PASS  (business uniqueness; documented)
Concurrency                       PASS
No JO Creation                    PASS
No WO Item Creation               PASS
No Service Request Creation       PASS
No Capability Binding             PASS
No SBU Execution Creation         PASS
Legacy Compatibility              PASS
U-01 Regression                   PASS  (36/36)
U-02 Regression                   PASS  (66/66)
U-03 Regression                   PASS  (11/11)
U-04 Tests                        PASS  (33/33)
Typecheck                         PASS
Lint                              PASS
Build                             PASS
Full Regression                   PASS  (689/689)

FILES CREATED          13  (module ×8, tests ×3 incl. mock, routes ×2, this report)
FILES MODIFIED          1  (scratch/run-tests.ts — runner registration only)
DATABASE MIGRATIONS     0  (none required)
TEST COUNT            689/689 full regression · 33 new U-04 assertions
```

Component classification:

```text
NEW       lib/application/commercial-work-orders/** · session-source.ts ·
          /api/v1/commercial/work-orders routes
KEEP      legacy WO/JO chains · CreateWOForm · trucking/driver/GPS · customs engines ·
          Phase-4A capabilities route (debt noted)
MODIFY    scratch/run-tests.ts (runner only)
DEPRECATE (none)
```

**STOP.** Awaiting authorization for U-05. No service requests, capability bindings, or
SBU bridges were implemented (mandate §37).
