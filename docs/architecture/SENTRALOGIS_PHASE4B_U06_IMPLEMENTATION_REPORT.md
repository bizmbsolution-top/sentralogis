# SENTRALOGIS — PHASE 4B-4
# U-06 CAPABILITY BINDING LIFECYCLE PATCH SURFACE — IMPLEMENTATION REPORT

**Status:** COMPLETE · **Date:** 2026-08-26
**Depends on:** U-01 ✅ · U-02 ✅ · U-03 ✅ · U-04 ✅ · U-05 ✅ (all ACCEPTED)
**Boundary:** Capability Binding Lifecycle ONLY — no SR, no execution, no registry admin.

---

## 1. Executive Summary

U-06 turns `commercial_capability_bindings` from a constructible record into a
**controlled lifecycle resource**:

```
PATCH /api/v1/commercial/work-orders/[id]/capabilities/[bindingId]   {"status": "..."}
   → IdentityContext (U-01) → commercial:manage (U-02) → status-only DTO guard
   → tenant-scoped load (non-leaking 404)
   → U-05 resolveCapability() REGISTRY AUTHORITY
   → same-state NO_OP (idempotent, zero events)
   → domain state machine (single source: CapabilityBindingService.transitionStatus)
   → ATOMIC persist + canonical outbox event (migration 016 definer function,
     optimistic previous-status concurrency guard)
```

Result: **20/20 U-06 assertions · full regression 721/721 · tsc 0 · lint 0 · build PASS.**

## 2. Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/20260828_016_capability_binding_transition.sql` | Atomic guarded transition + outbox emission |
| `lib/application/capability-bindings/types.ts` | PATCH DTO guards, event map, views, errors |
| `lib/application/capability-bindings/repository.ts` | Tenant-scoped port + RPC impl + injection seam |
| `lib/application/capability-bindings/service.ts` | Orchestration (gates 0–4, idempotency, atomic persist) |
| `lib/application/capability-bindings/http.ts` | Error → HTTP mapping |
| `lib/application/capability-bindings/index.ts` | Barrel |
| `lib/application/capability-bindings/__tests__/binding-lifecycle.test.ts` | 20-assertion suite |
| `app/api/v1/commercial/work-orders/[id]/capabilities/[bindingId]/route.ts` | Thin PATCH surface |
| This report |

## 3. Files Modified

| File | Change |
|---|---|
| `scratch/run-tests.ts` | Suite registration only (sequential runner) |
| `lib/domain/commercial/capability-binding-service.ts` | UNCHANGED in this unit (seam added in U-05) |

## 4. Database Changes

**One additive migration (justified per §16):** supabase-JS cannot wrap UPDATE+INSERT;
the repo's existing outbox writes are all sequential inserts (verified across
customs/shipment/forwarding services), so mutation/event atomicity was impossible
without a transactional primitive.

`fn_transition_capability_binding(p_binding_id, p_tenant_id, p_expected_status, p_new_status, p_event_name, p_actor, p_correlation_id, p_payload)`:
SECURITY DEFINER, hardened `search_path=''`, EXECUTE revoked from PUBLIC/anon.
Performs guarded UPDATE (`id + tenant_id + expected_status`) then outbox INSERT in one
transaction; returns `NOT_FOUND_OR_STALE` on guard miss. No table altered, no RLS
weakened, no grants changed. Rollback: single DROP FUNCTION.

## 5. Lifecycle State Machine (derived, not invented)

States pre-existing (migration 013 CHECK + domain types):
`ACTIVE · SUSPENDED · COMPLETED · CANCELLED`

```
ACTIVE    ──► SUSPENDED │ COMPLETED │ CANCELLED
SUSPENDED ──► ACTIVE │ CANCELLED          (reactivation = ACTIVE from CANCELLED/SUSPENDED)
COMPLETED ──► ∅                            (terminal; verified L2)
CANCELLED ──► ACTIVE                       (existing domain rule preserved)
```

Rules live ONCE in the domain (`transitionStatus` validTransitions); the application
service delegates to it — zero duplication across routes (§8). Timestamp semantics
(`completed_at`, `deactivated_at`, cleared on reactivation) enforced server-side by the
atomic function.

## 6. Authorization Decision (§7)

Sequence: authenticate (U-01 session resolver) → **`assertPermission(ctx,'commercial:manage')`**
(existing U-02 permission — no new vocabulary) → operation. Registry read authority
remains U-05's authenticated-read policy. Verified: A1 unauthenticated 401 ·
A2 read-only role 403 · A3 manager accepted · A4 cross-tenant non-leaking 404.

## 7. Tenant Isolation Proof (§6)

Tenant originates exclusively from `IdentityContext.tenantId`. The DTO parser rejects
any body containing `tenant_id` outright (P1); the lookup filters `tenant_id AND
work_order_id AND binding_id`; a foreign binding is indistinguishable from a missing
one (404, identical error text). The atomic function re-checks tenant inside the guard.

## 8. Registry Integration (§5)

Every lifecycle operation resolves the bound capability through
`resolveCapability(ctx, binding.capability_type)` BEFORE validating the transition:
UNKNOWN_CAPABILITY → 409 (R2), INACTIVE_CAPABILITY → 409 (R3). Case normalization via
U-05 (R4: stored `'trucking'` resolves). Legacy SBU vocabulary (`'clearances'`) has NO
authority — rejected as UNKNOWN_CAPABILITY (R5). No hard-coded capability list exists
in the lifecycle path.

## 9. PATCH Contract

`PATCH …/work-orders/{id}/capabilities/{bindingId}` — accepts EXACTLY
`{"status": <ACTIVE|SUSPENDED|COMPLETED|CANCELLED>}`. Extra keys (identity, scope,
pricing, timestamps…) → 400 INVALID_BODY with field names; malformed body → 400;
unknown status → 400 INVALID_STATUS. Response: `{success, data: view, meta:{action}}`
where action ∈ `TRANSITIONED | NO_OP`.

## 10. Outbox Event Model (§12)

Follows the established canonical envelope (migration 006) and the dotted naming style
of the canonical customs family:

| new_status | event_name |
|---|---|
| ACTIVE | `capability.binding.activated` |
| SUSPENDED | `capability.binding.suspended` |
| COMPLETED | `capability.binding.completed` |
| CANCELLED | `capability.binding.cancelled` |

Envelope: `event_version '1.0.0' · aggregate_type 'CapabilityBinding' · aggregate_id
binding.id · correlation_id work_order_id · causation_id actor · producer_domain
'COMMERCIAL' · payload {binding_id, work_order_id, capability_code, previous_status,
new_status, actor}`. Reactivation is expressed by `activated` +
`previous_status=CANCELLED` — business facts, never HTTP-centric names.

## 11. Atomicity Guarantee (§13)

UPDATE and event INSERT execute inside ONE database transaction via migration 016's
definer function. "Binding updated / event lost" and "event without update" are both
impossible. Verified structurally in tests: the mock mirrors the same indivisible
semantics; O4 asserts `events recorded === successful mutations`.

## 12. Idempotency Decision (§14)

Same-state request (`X→X`) = **NO_OP**: HTTP 200, unchanged binding, ZERO events.
Rationale: transitions are business facts; re-asserting a held fact is not a new fact;
duplicate events would double-count consumers. Deliberately routed BEFORE domain
validation (which would otherwise reject same-state as invalid). Tested O3.

## 13. Error Contract (§15)

`UNAUTHENTICATED` 401 · `FORBIDDEN_PERMISSION` 403 · `BINDING_NOT_FOUND` 404
(non-leaking) · `UNKNOWN_CAPABILITY`/`INACTIVE_CAPABILITY` 409 · `INVALID_TRANSITION`
409 · `INVALID_STATUS`/`INVALID_BODY` 400 · `CONCURRENT_MODIFICATION` 409 (stale-guard).
No cross-tenant existence ever revealed.

## 14. Test Matrix — 20/20 PASS

A1–A4 authz · R1–R5 registry authority · L1 six allowed edges · L2 six forbidden edges
(state unchanged on every failure) · L3 unknown status · P1–P3 mass-assignment/body
guards · S1 persistence · S2 failure leaves state · S3 optimistic stale guard 409 +
zero events · O1 exactly-one-correct-event · O2 zero events on rejection · O3 zero
events on NO_OP · O4 events===mutations atomicity.

## 15. Regression Results (all executed this run)

| Suite | Result |
|---|---|
| U-01 identity resolver | 36/36 PASS |
| U-02 authorization gates | 66/66 PASS |
| U-03 engagement bridge | 11/11 PASS |
| U-04 core + validation | 15/15 + 18/18 PASS |
| U-05 registry | 12/12 PASS |
| U-06 lifecycle | **20/20 PASS** |
| Full regression | **721/721 PASS** |
| Typecheck / Lint / Build | 0 errors / 0 warnings / PASS |

(The known pre-existing `shipment-api → 10.0.0.1:5432` connection log line appears but
its suite passes; not a U-06 regression.)

## 16. Legacy Compatibility Verification (§18)

Zero modifications to CreateWOForm, legacy WO/JO engines, trucking/forwarding/
clearance/warehouse execution, GPS/driver systems, U-04 API behavior, U-05 registry
module, or the legacy SBU adapter. Phase-4A capabilities POST route untouched.

## 17. Forensic Bypass Search Findings (§21)

Repository-wide search over `commercial_capability_bindings`,
`CapabilityBindingService.transitionStatus`, direct `.insert/.update` sites:

1. **Runtime writers found:** (a) Phase-4A create route `[id]/capabilities/route.ts`
   — SELECT + INSERT (create) + one DIRECT `.update({status:'ACTIVE'})` in its
   REACTIVATED branch; (b) U-06 repository (read + atomic RPC only).
2. **Classification:** the Phase-4A REACTIVATED update is a **legacy path requiring
   containment** — it mutates status outside `transitionStatus()` and emits NO outbox
   event. It is *not* deleted or modified here (§18 forbids touching that route);
   it is creation-path reactivation, not a competing lifecycle endpoint.
3. **Recommendation:** contain it in a follow-up unit together with its broken
   `resolveCustomsAuthContext` dependency (documented debt since U-04): route its
   reactivation through the U-06 service so all status mutations flow through one
   governed seam with events.
4. No other alternate lifecycle paths exist. `transitionStatus` now has exactly one
   runtime caller: `lib/application/capability-bindings/service.ts`.

## 18. Non-Goals Confirmation (§22)

NOT implemented: Service Request (creation/lifecycle), commercial package, pricing,
quotation, entitlements, capability creation, registry admin, engagement
creation/mutation, WO/JO creation, execution orchestration, GPS/driver/fleet, finance/
PnL/invoice/settlement, customer-facing workflows. No boundary conflicts encountered;
no STOP conditions triggered.

## 19. Remaining Debt

1. Migration 016 must be applied before PATCH hits production (carried with 014/015).
2. `database.types.ts` regeneration still pending (now includes migrations 014–016).
3. Phase-4A route containment (see §17.3) — recommended next hardening target.
4. `event_outbox` publisher/consumer machinery remains future infrastructure (outbox
   rows accumulate until a relay exists — existing platform-wide situation).

## 20. U-07 Recommendation (§25)

Based on what U-06 actually establishes: the next highest-value unit is **U-07
ExecutionLineageAdapter — Trucking Adapter Repair** (backlog order), because the
dispatch path (`svc_service_requests` → trucking JO) still lacks compliant
engagement lineage (`wo_item_id` NOT NULL trap) — the last P0-class integrity gap on
the write boundary. It can now depend on stable foundations (identity, authz,
engagement bridge, registry authority, governed binding lifecycle). Alternative
smaller unit first: the Phase-4A route containment above (~half-day, closes the last
unauthorized status-mutation path). Recommend owner choose based on release priorities;
both require explicit authorization.

```text
========================================
SENTRALOGIS — U-06 FINAL STATUS
========================================
transitionStatus service .................. PASS
PATCH lifecycle surface ................... PASS
Manage authorization ...................... PASS
IdentityContext-only tenant authority ..... PASS
Cross-tenant rejection .................... PASS
Registry-authoritative validation ......... PASS
No raw capability vocabulary authority .... PASS
Deterministic transition graph ............ PASS
Invalid transition rejection .............. PASS
Mass-assignment protection ................ PASS
Outbox business events .................... PASS
Mutation/event atomicity .................. PASS
Idempotency semantics ..................... PASS   (same-state NO_OP, zero events)
No capability creation .................... PASS
No SR creation ............................ PASS
No execution creation ..................... PASS
Legacy compatibility ...................... PASS
U-01/U-02/U-03/U-04/U-05 regressions ...... PASS   36+66+11+33+12 = 158
U-06 tests ................................ PASS   20/20
Typecheck / Lint / Build .................. PASS   0 / 0 / OK
Full regression ........................... PASS   721/721

FILES CREATED       9   (migration ×1, module ×5 incl. tests, route ×1, report ×1)
FILES MODIFIED      1   (scratch/run-tests.ts — registration)
DATABASE MIGRATIONS 1   (20260828_016 — atomic definer function; justification §4)
TEST COUNT        721/721
```

Component classification:

```text
NEW       lib/application/capability-bindings/** · [bindingId] PATCH route · migration 016
KEEP      everything else — bindings table schema, RLS, Phase-4A route (containment debt),
          registry module, engagement/WO modules, all legacy execution systems
MODIFY    scratch/run-tests.ts (runner registration only)
DEPRECATE (none)
```

**STOP.** Awaiting authorization. No U-07 work performed (mandate §25).
