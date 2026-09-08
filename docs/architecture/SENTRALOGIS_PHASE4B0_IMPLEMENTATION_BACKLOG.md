# SENTRALOGIS — PHASE 4B-0 IMPLEMENTATION BACKLOG

> **STATUS: BACKLOG ONLY — nothing in this document is implemented.**
> Each unit is a self-contained future implementation prompt. Units are sequenced by dependency; within a wave, units may run in parallel unless noted.

## GLOBAL RULES FOR EVERY UNIT

- Regression floor at all times: 543/543 baseline tests + `tsc --noEmit` = 0 errors (grows as suites land).
- Protected systems untouched: trucking execution behavior, driver PWA, Android, GPS, customs engines/audit chain, legacy tables schema.
- All canonical writes flow: UI → /api/v1 → application service → domain service → admin client with server-resolved tenant.
- No body/header/query tenant as authorization authority.
- Halt-on-failure; no blind retries; every unit ships with tests + rollback notes.

---

## U-01 · Hardened Commercial Identity Resolver & API Helper

- **Objective:** One production-correct resolver for canonical APIs: session → `auth.getUser()` → `get_my_tenant_id()`-equivalent membership → `{tenantId, userId, role}` → role gates (`commercial:read`, `commercial:manage`).
- **Scope:** New `lib/application/identity/resolver.ts` (+ error mapper); NO changes to existing customs/shipment helpers in this unit.
- **Files likely affected:** new `lib/application/**`; (read-only references) `lib/domain/customs/api-helper.ts`.
- **Dependencies:** none (first unit of 4B-1a).
- **API impact:** none yet — consumed by later units.
- **Database impact:** none.
- **UI impact:** none.
- **Test impact:** resolver unit suite: session success, missing session 401, forged header/query rejected, NULL-membership user denied commercial access, owner-branch resolution, staff-branch resolution.
- **Migration risk:** none (additive code).
- **Rollback:** delete files.
- **Acceptance:** forged `x-tenant-id` / `?tenant_id` / body tenant cannot yield data from any handler using the resolver; roles map to gate decisions per matrix in Gate §16.

## U-02 · Role Gates for Canonical Commercial APIs

- **Objective:** Enforce `commercial:manage` on mutations, `commercial:read` on queries; SBU-scoped roles read own-slice only.
- **Scope:** gate function consuming `profiles.role` / `tenant_users.role_code` vocabulary (live roles enumerated in Stage R discovery §3); wiring into U-01 context.
- **Files:** `lib/application/identity/*`, shared gate helper.
- **Dependencies:** U-01.
- **DB/UI/API impact:** none beyond helper signatures.
- **Tests:** allow/deny matrix per live role list (sbu_ops_tr denied sell-price reads; hq_finance allowed read; tenant_superadmin manage…).
- **Rollback:** trivial.
- **Acceptance:** denial paths return 403 with stable error codes; audit log line per decision.

## U-03 · Engagement Resolve-or-Create Service (Bridge Core)

- **Objective:** Given authenticated tenant context (+optional customer/natural key), resolve an OPEN engagement or create one atomically; establish bridge reference toward legacy `work_orders` where applicable (nullable bridge column or side-table — decide via smallest-safe analysis; prefer side mapping table `legacy_wo_bridge(legacy_wo_id, engagement_id)` additive).
- **Scope:** domain service `lib/domain/commercial/engagement-service.ts`: create (idempotent by natural key), resolve, get; enforces tenant, customer association, lifecycle init DRAFT→SUBMITTED; wo_number generation; NO fake `service_scope_id` (schema already relaxed) and no fabricated ids anywhere.
- **Files:** new service + types extension; migration NOT required if side-table chosen (additive table `com_legacy_wo_bridge`) — final choice documented in-unit.
- **Dependencies:** U-01/U-02; foundation deployed.
- **API impact:** consumed by U-04.
- **Tests:** idempotent resolve-or-create; duplicate natural-key prevention; tenant isolation; bridge mapping stability; canonical ID stability across re-runs.
- **Rollback:** feature unused until routes ship.
- **Acceptance:** two consecutive calls with same natural key return identical engagement id.

## U-04 · `/api/v1/commercial/work-orders` POST/GET/List Routes

- **Objective:** Canonical entry point: create engagement, fetch engagement(s), fetch single.
- **Scope:** thin routes over U-03 using U-01/U-02; response contract mirrors v1 conventions (`success/data/meta`); idempotency via natural key header/body field.
- **Files:** `app/api/v1/commercial/work-orders/route.ts`, `[id]/route.ts`.
- **Dependencies:** U-01..U-03.
- **Tests:** auth (session-only; forged header/query/body rejected), tenant isolation A/B, duplicate-create idempotency, lifecycle initialization DRAFT, list pagination.
- **Rollback:** route removal harmless (additive surface).
- **Acceptance:** first runtime-created row appears in `commercial_work_orders` (foundation becomes writable).

## U-05 · Capability Registry Foundation + De-hardcoding

- **Objective:** Registry table (additive migration): `commercial_capability_registry(id, capability_code, name, description, status, is_system, created_at, updated_at)` seeded with CUSTOMS/FORWARDING/TRUCKING/WAREHOUSE; validation in binding service reads registry; RLS mirror of family convention.
- **Scope:** registry service + seeding; refactor `CapabilityBindingFactory.validTypes` to registry lookup with cached fallback to the four codes during transition; TS union retained as type-level alias.
- **Dependencies:** U-01 (not strictly, but lands same wave).
- **Tests:** registry CRUD guards, unknown-code rejection, binding activation against registry, hypothetical capability registration test (e.g., INSURANCE) proving extensibility.
- **Rollback:** drop table + revert factory change (isolated).
- **Acceptance:** adding a 5th capability = data row + config, zero enum edits.

## U-06 · Binding Lifecycle PATCH Surface

- **Objective:** Expose `transitionStatus` (SUSPENDED/COMPLETED/CANCELLED/reactivate) via PATCH under manage-gate; emits outbox events (`CAPABILITY_*`).
- **Dependencies:** U-05; uses existing `CapabilityBindingService.transitionStatus`.
- **Tests:** legal/illegal transitions, cross-tenant deny, event emitted to outbox.
- **Acceptance:** suspension isolates sibling capabilities (Critical Test 8 semantics).

## U-07 · ExecutionLineageAdapter — Trucking Adapter Repair

- **Objective:** Fix `TruckingServiceRequestAdapter.execute()`: resolve-or-create engagement (U-03) → derive/attach compliant `wo_item_id` path per LAW (do NOT weaken NOT NULL; adapter creates its own minimal slot or lineage side-record per design decided in-unit) → set tenant/engagement linkage; dispatcher stores `assigned_domain_job_id` unchanged.
- **Scope:** adapter + its compensation path + tests replicating schema constraints faithfully (fixture includes NOT NULL wo_item_id).
- **Dependencies:** U-03; coordinates with forwarding writer guard (U-08) to close the FK trap jointly.
- **Tests:** dispatch creates lineage-complete JO; compensation cancels cleanly; FK trap regression test (legacy id can never satisfy SR.work_order_id).
- **Acceptance:** end-to-end SR→JO succeeds against migrated-schema fixture.

## U-08 · Forwarding Writer Guard (FK-trap closure)

- **Objective:** `app/api/forwarding/wo/route.ts`: before issuing ServiceRequest, resolve-or-create engagement via U-03 and pass canonical `work_order_id`; body tenant_id replaced by resolver (U-01) — completing D-2 hardening for this route.
- **Dependencies:** U-03/U-01. Coordinate release with U-07.
- **Tests:** dispatch succeeds; invalid engagement impossible; impersonation attempts rejected.
- **Acceptance:** `svc_service_requests` never receives legacy WO ids.

## U-09 · Fabricated-ID Elimination in Canonical Shipment Creator

- **Objective:** `sbu/forwarding/shipments/create/page.tsx`: remove client-generated `work_order_id`/`service_scope_id`; creator resolves real engagement via U-03 (or explicit selection UI fed by list route) and drops scope requirement per corrected semantics; shipment factory updated accordingly.
- **Tests:** creation requires authenticated session; produced shipments carry real engagement reference; negative tests for missing engagement.
- **Acceptance:** zero fabricated identifiers repo-wide (grep gate added to static architecture checks).

## U-10 · Static Architecture Gates (lint/grep assertions)

- **Objective:** Automated invariant checks appended to test runner: (a) no canonical-domain import of SBU execution modules; (b) no browser `supabase.from()` inside canonical surfaces; (c) capability vocabulary sourced only from registry module; (d) customs imports remain outbound-null; (e) no `md_users` references resurrect.
- **Acceptance:** gates wired into `scratch/run-tests.ts` summary; failures block.

## U-11 · Event Emission v0 (binding + engagement lifecycle)

- **Objective:** Emit `CAPABILITY_ACTIVATED/SUSPENDED/…` and `ENGAGEMENT_CREATED/…` to deployed `event_outbox` on transitions; consumer-less (projections later). Establishes semantic ownership precedent.
- **Acceptance:** outbox rows observable per action; dead-letter untouched.

---

### Sequencing

```
Wave 4B-1a: U-01 → U-02
Wave 4B-1b: U-03 → U-04
Wave 4B-1c: U-05 → U-06   (parallel-safe with 4B-1b after U-01)
Wave 4B-1d: U-07 + U-08 (joint release)
Wave 4B-1e: U-09
Continuous: U-10 gates from first wave; U-11 after U-06
```

Later waves (NOT in this backlog's scope, listed for traceability): activations engine (4B-2), catalog/pricing/packages (4B-3), SBU integration waves (4B-4), projections/ledger producers (4B-5).
