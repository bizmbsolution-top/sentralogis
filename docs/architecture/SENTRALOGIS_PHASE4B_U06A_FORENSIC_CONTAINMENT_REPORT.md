# SENTRALOGIS — PHASE 4B-4A
# U-06A PHASE-4A CAPABILITY BINDING CONTAINMENT — FORENSIC REPORT

**Status:** COMPLETE · **Date:** 2026-08-26
**Depends on:** U-01..U-06 all ACCEPTED
**Nature:** Forensic containment, not feature development. Smallest possible change.

---

## 1. Scope

Eliminate the single known runtime bypass of the governed capability-binding lifecycle
(Phase-4A REACTIVATED branch direct `.update({status:'ACTIVE'})`), verify the U-06
atomic transition function's security posture, and prove via static + behavioral tests
that every runtime lifecycle mutation now converges on
`CapabilityBindingService.transitionStatus()`.

## 2. Known Bypass Before U-06A

`app/api/v1/commercial/work-orders/[id]/capabilities/route.ts` POST → `REACTIVATED`
branch performed a direct table update (status→ACTIVE, activated_at refreshed,
deactivated_at cleared) emitting NO lifecycle event, authorized only by the broken
`resolveCustomsAuthContext` helper.

## 3. Repository-Wide Forensic Inventory (before)

| Path | Operation | Runtime | Lifecycle mutation | Classification |
|---|---|---|---|---|
| Phase-4A route GET | SELECT | yes | no | read |
| Phase-4A route POST | SELECT existing | yes | no | read |
| Phase-4A route POST CREATED | INSERT | yes | no (initial state) | creation — preserved |
| Phase-4A route POST REACTIVATED | **UPDATE status** | yes | **YES** | **BYPASS — contained** |
| U-06 repository | SELECT + RPC | yes | YES | governed |
| tests / mocks / fixtures | mutations | no (test-only) | n/a | fixture |

`resolveCustomsAuthContext`: used by 36 customs routes + the Phase-4A route. Customs
routes are OUT OF SCOPE (untouched); for the Phase-4A route it was safely replaceable
by the existing U-01 session resolver (option §9.3) — the smallest correct repair.
No raw SQL strings (`UPDATE/INSERT INTO commercial_capability_bindings`) exist anywhere.

## 4–5. Files Inspected / Modified

**Inspected:** Phase-4A route · `lib/application/capability-bindings/{service,repository,types}.ts`
· `lib/application/capabilities/*` · `lib/domain/commercial/capability-binding-service.ts`
· migration 016 · customs api-helper · ppjk-phase4a domain tests.

**Modified:**
| File | Change |
|---|---|
| `app/api/v1/commercial/work-orders/[id]/capabilities/route.ts` | auth swapped to `resolveSessionIdentity`; POST gated `commercial:manage`; REACTIVATED branch delegates to `transitionBinding()`; direct UPDATE removed |
| `supabase/migrations/20260828_016_capability_binding_transition.sql` | security hardening (§12 below; unapplied migration amended pre-deploy) |
| `scratch/run-tests.ts` | U-06A suite registration |

**Created:** `__tests__/phase4a-containment.test.ts` · this report.

## 6–7. Mutation Removed & Delegation Path

Removed: the entire direct `.update({status:'ACTIVE', …})` block.
Replaced with:

```
transitionBinding(ctx, workOrderId, binding.id, { status: 'ACTIVE' })
   → assertPermission('commercial:manage')
   → tenant-scoped load (non-leaking 404)
   → resolveCapability() registry authority
   → domain state machine
   → ATOMIC persist + capability.binding.activated outbox event
```

Response contract preserved (`{success:true, action:'REACTIVATED', data}` 200), with
the view mapped back to legacy row keys. One documented delta: `activated_at` is no
longer refreshed on reactivation (governed semantics keep original activation
timestamp; `deactivated_at` is cleared). No state-transition rules duplicated in the
route. Creation (INSERT) path intentionally preserved — creation is not a lifecycle
status mutation.

## 8. Reactivation Semantics Verification

Pre-edit analysis confirmed compatibility before any change: REACTIVATED fires when an
existing same-(tenant,WO,type) binding sits in CANCELLED or SUSPENDED — both valid U-06
edges toward ACTIVE. No semantic conflict ⇒ no STOP condition triggered.

## 9–11. Authorization / Tenant / Registry / Outbox Proof

- **Authorization:** POST now requires `commercial:manage` (U-02). Previously weak
  customs-auth (no permission gate) → strictly strengthened, never weakened. B5: 403.
- **Tenant:** exclusively `IdentityContext.tenantId`; body `tenant_id` rejected by the
  DTO guard upstream; RPC re-checks tenant inside its WHERE guard. B6: non-leaking 404.
- **Registry:** delegation flows through U-05 `resolveCapability()`; no capability
  branching added to the route; legacy vocabulary has no authority (B7).
- **Outbox:** exactly ONE `capability.binding.activated`
  `{previous_status:CANCELLED, new_status:ACTIVE}` per successful reactivation (B4);
  NO_OP emits none (B9); no duplicate insertion anywhere in the route (§14).

## 12. SECURITY DEFINER Forensic Result (§15)

Review found **three real defects**, fixed pre-deploy (migration unapplied):

| # | Defect found | Fix applied |
|---|---|---|
| A | search_path already hardened ✓ | verified `SET search_path = ''` |
| B | EXECUTE still reachable by `authenticated` via PUBLIC default grant | REVOKE ALL from PUBLIC/anon/**authenticated**; GRANT EXECUTE to **service_role only** |
| E | Caller-supplied `p_event_name` trusted → unrelated-event manufacturing | function derives expected name from `p_new_status`; mismatch raises `INVALID_EVENT_NAME`; invalid statuses raise `INVALID_STATUS` (whitelist) |
| F | `canonical ‖ p_payload` let callers OVERRIDE canonical identity keys | reversed to `p_payload ‖ canonical` — canonical identity always wins |
| C/D/G | tenant param, guard columns, ownership | tenant enforced inside WHERE; guard = id+tenant+expected_status; ownership unchanged (migration role), no grants beyond service_role EXECUTE |

All six sub-verifications (A–G) asserted statically in B10.

## 13. RPC Authorization Result (§16)

After hardening, interactive roles cannot invoke the RPC at all:
`authenticated` has zero EXECUTE privilege — the database itself proves the RPC cannot
bypass `commercial:manage`. Only the application boundary's service-role client (used
strictly after identity+permission+tenant gates) may execute it. Business invariants
remain in application/domain layers; the DB layer adds status-whitelist + event-name
constraints as defense-in-depth (§17 satisfied without redesign).

## 14. Remaining Direct-Mutation Search Result (§22)

Post-implementation repository-wide scan (comment-stripped source, `app/` + `lib/`,
excluding tests/mocks/migrations): files containing `commercial_capability_bindings`
AND a runtime `.update(` call → **0 offenders**. Verified twice (suite B1 + standalone
node scan). Note: an intermediate manual grep flagged the route, but that match was the
*header comment documenting the old bypass* — comments are stripped in both scans;
the invariant targets code, and no suppression/renaming/hiding was used (§20).

Runtime lifecycle writers after U-06A — exhaustive list:

```
CapabilityBindingService.transitionStatus()      ← rules (single source)
lib/application/capability-bindings/service.ts   ← orchestration (only caller)
lib/application/capability-bindings/repository.ts ← atomic RPC
fn_transition_capability_binding                 ← atomic persist + event
```

No new bypass discovered. No STOP conditions triggered.

## 15–18. Tests & Regression (all executed)

| Suite | Result |
|---|---|
| U-06A forensic containment | **10/10 PASS** (B1,B2,B3,B4,B5,B6,B7×2,B8,B9,B10) |
| U-01 identity | 36/36 PASS |
| U-02 authorization | 66/66 PASS |
| U-03 engagement | 11/11 PASS |
| U-04 core+validation | 15/15 + 18/18 PASS |
| U-05 registry | 12/12 PASS |
| U-06 lifecycle | 20/20 PASS |
| Typecheck / Lint / Build | 0 errors / 0 warnings / PASS |
| Full regression | **731/731 PASS** |

(The known pre-existing `shipment-api → 10.0.0.1:5432` log line appears; that suite
passes — unchanged pre-existing condition.)

Test-engineering note (transparency): during development, B1/B2 briefly flagged the
route because the *commentary describing the old bypass* matched the pattern; the scan
now strips comments before matching — a precision fix, not test manipulation (a real
code-level `.update(` remains flagged, as proven by the mock fixtures themselves).

## 19. Remaining Debt

1. Migrations 014–016 must be applied to production together before PATCH/reactivation
   go-live (016 was hardened in-place pre-deploy).
2. `database.types.ts` regeneration still pending (carried).
3. `resolveCustomsAuthContext` remains in use by 36 customs routes — pre-existing,
   out-of-scope here; recommend its own hardening unit (customs domain).
4. Outbox publisher/consumer relay remains platform-wide future infrastructure.

## 20. Explicit Non-Goals Confirmation

NOT implemented/touched: SR (any aspect), ExecutionLineageAdapter/U-07, WO/JO creation,
package/pricing/quotation/entitlement, finance/PnL/invoice/settlement, GPS/driver/fleet,
warehouse/forwarding/customs execution, registry behavior/admin, binding creation logic
(preserved as-is), binding schema redesign, service_scopes migration, engagement
lifecycle, new permissions, new capability codes, new lifecycle states, new event
families, general refactoring.

## 21. Recommendation for Next Authorized Unit

With the write boundary now fully governed (identity → authz → registry → state machine
→ atomic events, zero bypasses), the recommended next unit remains **U-07 Trucking
Adapter Lineage Repair** (closes the last P0-class integrity gap: SR dispatch lacking
compliant engagement lineage). Alternatively, the smaller customs-route auth-hardening
unit (item §19.3) could precede it if release priorities favor closing the remaining
broken identity helper surface first. Both require explicit authorization.

```text
========================================
SENTRALOGIS — U-06A FINAL STATUS
========================================
Known Phase-4A direct status mutation removed     PASS
Phase-4A reactivation delegates to U-06           PASS
No duplicate lifecycle event                      PASS
Registry authority preserved                      PASS
IdentityContext tenant authority preserved        PASS
commercial:manage preserved                       PASS   (strengthened)
Cross-tenant reactivation rejected                PASS
Atomic UPDATE + outbox preserved                  PASS
SECURITY DEFINER reviewed                         PASS   (3 defects found & fixed)
RPC cannot bypass authorization                   PASS   (application-only EXECUTE)
No new permission vocabulary                      PASS
No new capability vocabulary                      PASS
No lifecycle-state expansion                      PASS
No SR implementation                              PASS
No execution implementation                       PASS
No U-07 implementation                            PASS
U-01 regression                                   PASS   36/36
U-02 regression                                   PASS   66/66
U-03 regression                                   PASS   11/11
U-04 regression                                   PASS   33/33
U-05 regression                                   PASS   12/12
U-06 regression                                   PASS   20/20
U-06A tests                                       PASS   10/10
Typecheck                                         PASS
Lint                                              PASS
Build                                             PASS
Full regression                                   PASS   731/731

FILES CREATED       2   (containment test suite, this report)
FILES MODIFIED      3   (Phase-4A route, migration 016 hardening, runner registration)
DATABASE MIGRATIONS 0 NEW — migration 016 amended pre-deploy (security fixes)
TEST COUNT        731/731
```

Component classification:

```text
KEEP     creation INSERT path (Phase-4A contract) · customs routes (separate unit)
MODIFY   Phase-4A capabilities route (auth swap + delegation) · migration 016 (hardening)
NEW      phase4a-containment.test.ts (forensic suite)
DEPRECATE resolveCustomsAuthContext usage IN THIS ROUTE ONLY (helper retained for
         customs routes — their replacement requires separate authorization)
```

**STOP.** All runtime capability-binding lifecycle mutations converge on
`CapabilityBindingService.transitionStatus()` — proven. Awaiting authorization.
