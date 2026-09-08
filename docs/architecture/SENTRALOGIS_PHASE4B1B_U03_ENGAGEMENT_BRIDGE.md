# SENTRALOGIS — PHASE 4B-1b
# U-03 ENGAGEMENT RESOLVE-OR-CREATE BRIDGE — IMPLEMENTATION REPORT

**Status:** COMPLETE · **Date:** 2026-08-26
**ADR implemented:** ADR-032 (Engagement Resolve-or-Create Bridge)
**Depends on:** U-01 (Hardened Identity Resolver) ✅, U-02 (Role Gate Vocabulary) ✅

---

## 1. Engagement Semantic Definition

The canonical engagement IS `commercial_work_orders` (ratified ADR-018 engagement root).
Per mandate §2 it is NOT automatically a legacy Work Order, NOT a JO, NOT an SBU.

An engagement is the **commercial/business relationship context** from which operational
requests subsequently arise. It is created lazily by the bridge; a legacy `work_orders`
row MAY be shadowed by exactly one engagement via the `legacy_wo_bridge` side-table.
Lifecycle initializes at `DRAFT`; commercial truth lives here from creation onward while
the legacy row remains the protected operational artifact.

## 2. Existing Canonical Model

Table `commercial_work_orders` (migration 20260826_002):

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | server-generated |
| tenant_id | UUID NOT NULL → md_tenants | trusted, from IdentityContext only |
| wo_number | TEXT NOT NULL | UNIQUE(tenant_id, wo_number) |
| customer_id | UUID NOT NULL → md_entities | tenant-scoped party |
| service_scope_id | UUID → commercial_service_scopes | **was NOT NULL — relaxed in migration 014** |
| contract_reference | TEXT | optional business key input |
| order_date | DATE NOT NULL DEFAULT CURRENT_DATE | application-set |
| status | com_work_order_status | DRAFT→…→CLOSED/CANCELLED |
| currency / total_agreed_revenue / payment_terms_days | defaults IDR / 0 / 30 | |

**Foundation blockers found and fixed (mandate §5/§21):**

1. `service_scope_id` was declared relaxed by ADR-032/backlog ("schema already relaxed")
   but **the ALTER was never applied** — genuine blocker for lazy creation. Fixed:
   `20260828_014_engagement_bridge_schema.sql §1`.
   Rollback: `ALTER COLUMN service_scope_id SET NOT NULL;`
2. No concurrency-safe uniqueness for open engagements per tenant+customer. Fixed:
   partial unique index `uq_com_wo_open_per_customer ON (tenant_id, customer_id) WHERE status IN ('DRAFT','SUBMITTED')` — migration 014 §2.
   Rollback: `DROP INDEX uq_com_wo_open_per_customer;`
3. `legacy_wo_bridge` side-table (ADR-032) did not exist — created additively in
   migration 014 §3–4 with RLS mirroring the family convention.

Migration risk: LOW (one constraint relaxation, one additive index, one new empty table).
No data modified. Protected systems untouched.

## 3. Resolution Key

`(tenant_id, customer_id)` scoped to OPEN statuses (`DRAFT`, `SUBMITTED`).

- Deterministic business identity of an *open* commercial relationship.
- NOT random UUID, NOT `created_at`, NOT unstable attributes (§9).
- `wo_number` remains the human business reference but is generated, not resolved-on.
- Multiple sequential engagements per customer are possible: complete/cancel the open
  one and the bridge creates the next.

## 4. Tenant Ownership

`tenantId` is taken EXCLUSIVELY from `IdentityContext.tenantId` (U-01). The input DTO
deliberately contains NO `tenantId`/`userId` fields — structurally impossible to forge
(mandate §7). Customer ownership validated jointly: `md_entities.id = customerId AND
tenant_id = context.tenantId`; mismatch yields non-leaking `404 CUSTOMER_NOT_FOUND`.

## 5. Authorization Requirement

Reused existing U-02 permission **`commercial:manage`** — no new permissions invented
(§8 smallest-surface rule). Enforced inside the bridge via `assertPermission()` so every
consumer inherits the gate. Pure-read consumers (U-04 GET) may additionally gate with
`commercial:read` at route level.

## 6. Resolve-or-Create Algorithm

```
assertPermission(ctx,'commercial:manage')
tenantId = ctx.tenantId                      // never client input
customer = validateCustomerOwnership(tenantId, customerId)   → 404 if not owned
existing = findOpenEngagement(tenantId, customerId)          → return {created:false}
outcome  = createEngagement(...)                             → INSERT
  ├─ success            → {engagement, created:true}
  └─ 23505 (race lost)  → findOpenEngagement → {engagement, created:false}
if (created && legacyWorkOrderId) createLegacyBridge(...)
```

## 7. Idempotency Strategy

Two independent layers:

1. **Application:** resolve-before-create + unique-violation recovery SELECT.
2. **Database:** partial unique index makes duplicate open-engagement state physically
   impossible, regardless of caller behavior.

Repeated calls (double-click, retry, refresh, N× repeat) return the same engagementId.

## 8. Concurrency Strategy

INSERT-then-catch pattern against the partial unique index (`23505`). No advisory locks,
no SELECT-then-INSERT gap. Verified by T8 race simulation (both racers observe empty
pre-state; exactly one insert lands; loser resolves winner's row and reports
`created:false`). The test exposed and fixed a real contract bug: the recovery path
previously reported `created:true` — corrected so `created` reflects actual insertion.

## 9. API / Application Contract

```ts
resolveOrCreateEngagement(input, ctx): Promise<EngagementResult>
// input:  { customerId, contractReference?, targetFulfillmentDate?,
//           commercialNotes?, currency?, legacyWorkOrderId? }   // NO tenant/user
// ctx:    IdentityContext (U-01/U-02)
// result: { engagement: Engagement, created: boolean }

resolveLegacyBridge(tenantId, legacyWoId): Promise<Engagement | null>
```

Errors: `IdentityResolutionError` 401/403 (U-01/U-02); `EngagementError`
CUSTOMER_NOT_FOUND 404 · UNIQUE_VIOLATION 409 · DATABASE_ERROR 400.
Cross-tenant existence is never revealed (404, §14).

## 10. Anti-Corruption Boundary

```
Caller (future U-04 route / adapters)
        ↓ IdentityContext only
Engagement Bridge (this unit, lib/application)
        ↓ supabaseAdmin (service role, server-resolved tenant)
commercial_work_orders / legacy_wo_bridge (canonical foundation)
```

No React→Supabase path exists. Service-role access occurs strictly after identity +
permission + tenant gates (§18).

## 11. Legacy Compatibility

Zero changes to `work_orders`, `wo_items`, `job_orders`, CreateWOForm, forwarding,
finance, customs, trucking, GPS/driver systems (verified: no file outside
`lib/application/engagement/` + runner registration touched). Legacy WO shadowing is
opt-in via `legacyWorkOrderId`; no backfill performed or required (ADR-032).

## 12. Tests

`lib/application/engagement/__tests__/engagement-bridge.test.ts` — 11/11 PASS:

| # | Scenario | Result |
|---|---|---|
| T1 | Existing engagement → `created=false`, same id | PASS |
| T2 | New engagement → DRAFT, null scope, canonical fields | PASS |
| T3 | Repeat ×3 → identical engagementId | PASS |
| T4a | Cross-tenant customer → non-leaking 404 | PASS |
| T4b | Forged requestedTenantId → 403 TENANT_MISMATCH | PASS |
| T5 | Missing `commercial:manage` → 403 | PASS |
| T6 | Unauthenticated → 401 (U-01 gate) | PASS |
| T7 | Invalid customer → 404 | PASS |
| T8 | Concurrent race → exactly ONE engagement | PASS |
| T9 | Retry → same engagement | PASS |
| T10 | No fabricated IDs (null scope explicit, real refs, deterministic WO number) | PASS |

Mock DB enforces the partial-unique semantics faithfully (23505 on duplicate open pair).

## 13. Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260828_014_engagement_bridge_schema.sql` | NEW — scope relaxation + partial unique index + bridge table + RLS |
| `lib/application/engagement/types.ts` | NEW — Engagement, input/result contracts, EngagementError |
| `lib/application/engagement/engagement-bridge.ts` | NEW — resolve-or-create service, DB-client injection seam |
| `lib/application/engagement/index.ts` | NEW — barrel export |
| `lib/application/engagement/__tests__/engagement-bridge.test.ts` | NEW — 11-test suite |
| `scratch/run-tests.ts` | MODIFIED — suite registration + async finalization |

**Not modified (compatibility proof):** all domain/, app/, components/ files — zero.

## 14. Remaining Debt

1. **Types regeneration:** `commercial_work_orders`/`legacy_wo_bridge` absent from
   `database.types.ts` — regenerate after migration 014 applies to production.
2. **Migration 014 deployment:** must be applied before any route consumes the bridge.
3. `generateCanonicalWONumber` standalone export removed during implementation;
   generation lives inside `createEngagement` — extract if external callers emerge.
4. Sequential `wo_number` has a theoretical race under extreme concurrency; acceptable:
   collision surfaces as 23505 on `uq_com_wo_number` → surfaced as 409, retriable.
5. Open-engagement-per-customer policy is a product decision encoded in the index;
   revisit if multi-open-engagement workflows are ever required (drop/adjust index).

## 15. Recommendation for U-04

- Thin routes over this bridge; zero business logic in handlers.
- POST: resolve session → `resolveIdentityContext()` with `resolveFromArrays()` wired to
  live Supabase queries → call bridge → map errors (401/403/404/409) to response codes.
- GET list/detail: gate `commercial:read`; SBU-scoped roles see own slice only.
- Support `Idempotency-Key`-style natural-key body field; bridge already guarantees it.
- First successful POST = first runtime-created row in `commercial_work_orders`
  (foundation becomes writable — backlog acceptance criterion).

---

## FINAL STATUS

```text
U-03 STATUS

Canonical Engagement Model       PASS
Resolve-or-Create                 PASS
Tenant Isolation                  PASS
Authorization                    PASS
Idempotency                      PASS
Concurrency Safety               PASS
No Fabricated IDs                PASS
Legacy Compatibility             PASS

U-01 Regression                  PASS  (36/36)
U-02 Regression                  PASS  (66/66)
U-03 Tests                       PASS  (11/11)
Typecheck                        PASS  (0 errors)
Lint                             PASS  (0 warnings, new files)
Build                            PASS  (full regression 656/656 incl. prior suites)
```

### Component Classification

| Component | Class |
|---|---|
| `commercial_work_orders.service_scope_id` | MODIFY (relaxed — blocker fix, migration 014) |
| `commercial_work_orders` open-pair uniqueness | MODIFY (additive index, migration 014) |
| `legacy_wo_bridge` | KEEP (new, additive) |
| `lib/application/engagement/**` | KEEP (new application boundary) |
| Legacy `work_orders`/`wo_items`/CreateWOForm | KEEP — untouched |
| Trucking / Driver / GPS / Customs engines | KEEP — untouched |
| `database.types.ts` | MODIFY (regenerate post-deploy — debt #1) |

**STOP.** Awaiting authorization for U-04. No SR creation, no capability bindings, no
forwarding/trucking/clearance/warehouse/finance bridges implemented (mandate §26).
