# SENTRALOGIS — PHASE 4B-5
# U-07 EXECUTION LINEAGE ADAPTER — TRUCKING ADAPTER REPAIR REPORT

**Status:** COMPLETE · **Date:** 2026-08-26
**Depends on:** U-01..U-06A all ACCEPTED
**Nature:** Forensic integrity repair. NO migration. NO schema change. NO constraint weakened.

---

## 1. Executive Summary

The trucking dispatch adapter could not produce compliant execution: it inserted
`job_orders` **without** `wo_item_id` (NOT NULL FK → `wo_items`) and ignored
`SR.work_order_id` entirely — attempting **detached execution**. U-07 inserts a
fail-closed Execution Lineage boundary between dispatch and execution:

```
resolveTruckingLineage(request)          ← lib/application/service-contracts/trucking-lineage.ts
   tenant authority → capability authority (U-05)
   → ENGAGEMENT resolution (canonical direct OR legacy_wo_bridge)
   → REAL wo_items.id resolution (existing candidate OR controlled minimal slot)
   ⇒ TruckingLineageContext { tenantId, engagementId, legacyWorkOrderId?, woItemId, … }
TruckingServiceRequestAdapter.execute()
   → resolves lineage BEFORE any write (fails closed on every unresolvable path)
   → job_orders.insert now carries lineage.woItemId (REAL id)
```

Result: **12/12 U-07 assertions · full regression 743/743 · tsc 0 · lint 0 · build PASS.**

## 2. The Exact P0 Integrity Gap

| # | Defect | Location | Effect |
|---|---|---|---|
| A | Forwarding writer passes LEGACY `work_orders.id` into `SR.work_order_id` whose FK targets `commercial_work_orders` RESTRICT | `app/api/forwarding/wo/route.ts:128,167` | FK trap — SR insert fails against migrated schema (**U-08 scope**, coordinated release) |
| B | Trucking adapter inserted `job_orders` omitting `wo_item_id` (NOT NULL FK → `wo_items(id)`, migrations 032/live types) | `lib/domain/service-contracts/adapters/trucking-adapter.ts` | Even with a valid SR, dispatch ALWAYS failed (`DomainJobCreationFailedError`) — and any "fix" by nullable/fabrication would have created detached execution |

## 3. Before-State Lineage Graph

```
SR.work_order_id ──(legacy id, FK-trap)──✗ commercial_work_orders
Adapter ──(ignored lineage)──► job_orders ──✗ wo_item_id NOT NULL
Result: no executable path existed at all.
```

## 4–5. Write-Path Map & Root Cause

| Step | Runtime file | DB object | Tenant source | Lineage |
|---|---|---|---|---|
| SR issue | service-request-service.issueRequest (+forwarding route) | svc_service_requests | caller body (U-08 target) | work_order_id (defect A) |
| Dispatch | ServiceRequestDispatcher.dispatch | svc_service_requests updates | row tenant ✅ | none added |
| **Execution** | **TruckingServiceRequestAdapter.execute** | **job_orders + job_routes** | **row tenant** | **WAS MISSING (defect B) — repaired** |

Root cause (the WHY/HOW/WHERE of §33):
- **WHY detached:** the adapter predates the canonical commercial model and assumed
  `job_orders` accepted SBU-private rows without commercial parents; after Stage R
  deployed the NOT NULL/FK reality, the producer — not the invariant — became wrong.
- **HOW repaired:** lineage is now *resolved before any write* through a dedicated
  boundary that validates every edge server-side and fails closed.
- **WHERE persisted:** in the existing column — `job_orders.wo_item_id` — which chains
  `wo_items.wo_id → (legacy_wo_bridge) → commercial_work_orders.id`. No new lineage
  fields were invented; the canonical chain already existed unused.

## 6. Canonical Lineage Model (derived, not invented)

```
svc_service_requests.work_order_id
        │  (a) = canonical engagement id            [post-U-08 writers]
        │  (b) = legacy work_orders.id ──legacy_wo_bridge──► engagement  [pre-U-08 reality]
        ▼
commercial_work_orders (engagement)
        ▼ bridged operational WOs (work_orders)
        ▼ usable wo_items (non-terminal) ──or── controlled minimal slot
        ▼ job_orders.wo_item_id  (REAL id, NOT NULL FK satisfied honestly)
```

## 7–9. Files

**Created:** `lib/application/service-contracts/trucking-lineage.ts` (resolver +
read-only-write port + injection seam) · `__tests__/trucking-lineage.test.ts` · this report.
**Modified:** `lib/domain/service-contracts/adapters/trucking-adapter.ts` (lineage-first
orchestration; writes via port; jo_number/token/routes/compensation semantics byte-preserved).
**Untouched:** dispatcher, service-request-service, forwarding route (U-08), all other
JO writers, driver/GPS/fleet systems.

## 10. Database Changes

**NONE** (mandate §23 default position). No `DROP NOT NULL`, no FK changes, no RLS
changes. The constraint was correct; the producer was repaired.

## 11. wo_item_id Resolution Strategy

Deterministic order:
1. Canonical direct: `SR.work_order_id` exists in `commercial_work_orders` (same tenant).
2. Bridged legacy: exists in legacy `work_orders` AND mapped via `legacy_wo_bridge`.
3. Item candidates: non-terminal items of the engagement's operational WO(s),
   oldest-first (deterministic).
4. Controlled minimal slot: if engagement resolves and an operational WO exists but has
   no usable item → ONE PENDING `wo_items` row under THAT WO (`SLOT-SR-{request_number}`,
   zero revenue). This is the minimal-slot design the backlog delegated to this unit;
   it touches only the OPERATIONAL case file — canonical commerce is never fabricated,
   and the resulting ID is a real, FK-valid `wo_items.id`.
5. Otherwise → `TRUCKING_LINEAGE_UNRESOLVED` (409-class). Never NULL, never invented.

## 12. Adapter Design

Domain adapter orchestrates; persistence flows through an injected port
(`getTruckingLineageRepository()`); jo_number format `JO-TRK-{mmyy}-{4digit}`,
tracking-token generation, route building (pickup→intermediates→dropoff), routes-fail-
logged-not-fatal semantics, and compensation are preserved verbatim. Metadata now also
carries `engagement_id` + `wo_item_id` for observability.

## 13–14. Tenant & Capability Authority Proof

- System dispatch uses the persisted SR row's tenant (repo convention for background
  flows ✅). When an IdentityContext accompanies the call (user-initiated), mismatch →
  `LINEAGE_TENANT_MISMATCH`. Cross-tenant objects are indistinguishable from missing
  ones (L3 — no existence leak). All port queries filter tenant_id.
- Capability: `target_domain !== 'TRUCKING'` → `CAPABILITY_MISMATCH`; registry
  membership verified via U-05 (`isRegisteredCapability('TRUCKING')`, sync-safe for
  system context) → `CAPABILITY_UNREGISTERED`. No hard-coded capability list beyond the
  adapter's existing SKU matcher; no legacy `sbu_type` as authority.

## 15–16. Idempotency & Transaction Analysis

- **Idempotency (preserved, unchanged):** double-dispatch is blocked by the dispatcher's
  state machine (ISSUED/REROUTING-only) plus `uq_svc_idempotency` at creation. Adapter-
  level re-entry protection would expand scope — documented as debt #4.
- **Transactions:** supabase-js offers no multi-statement transaction; the repo-wide
  pattern (sequential writes + compensation) is reused. Worst-case partial state is an
  inert PENDING slot or a cancelled-JO compensation — never an execution record with
  invalid lineage (proven L9: JO-insert failure ⇒ zero JO/route records).

## 17–18. Fabricated-ID Forensic Result & Runtime JO Writer Inventory

Fabricated-ID scan (`wo_item_id:` assignments matching randomUUID/crypto/SR-id/request-id
across runtime sources): **0 offenders**. Adapter assigns `wo_item_id` exclusively from
resolved lineage (F2b: every assignment lineage-sourced).

Runtime `job_orders` INSERT writers — complete classification:

| Writer | Lineage source | Status |
|---|---|---|
| `app/api/wo/route.ts` | WO+items created in same flow | legitimate legacy (pre-existing) |
| `CreateWOForm.tsx` (browser-direct) | items created in-form | pre-existing browser-direct debt (4B-0 documented; out of scope) |
| `TransferDetailModal.tsx` | warehouse transfer context | warehouse domain — untouched |
| `assignmentSave.ts` | built FROM wo_items rows | lineage-complete ✅ |
| U-07 port (`trucking-lineage.ts`) | **governed: resolved lineage or fail** | **this unit** ✅ |

No alternate SR-driven path exists.

## 19–23. Tests & Gates (all executed)

| Suite | Result |
|---|---|
| U-07 lineage (L1,L2,L2b,L3×2,L4,L5,L6,L9,F1,F2,F2b) | **12/12 PASS** |
| U-01..U-06A regressions | 36+66+11+33+12+20+10 = **188/188 PASS** |
| Full regression | **743/743 PASS** |
| Typecheck / Lint / Build | 0 / 0 / PASS |

(The known pre-existing `shipment-api → 10.0.0.1:5432` log persists; suite passes.)

## 24. Remaining Debt

1. **Defect A lives until U-08**: forwarding writer still passes legacy WO ids into
   `SR.work_order_id` (FK trap). Coordinated release required; adapter already accepts
   both canonical-direct and bridged-legacy inputs so U-08 lands without adapter change.
2. Adapter-level re-entry idempotency (beyond dispatcher state machine) — deferred.
3. Sequential-write transactionality platform-wide — pre-existing pattern.
4. CreateWOForm browser-direct writes — 4B-0 debt, separate unit.
5. Migrations 014–016 deploy + types regeneration — carried.

## 25. Explicit Non-Goals Confirmation

NOT implemented: SR redesign/lifecycle, registry/binding changes, engagement redesign,
package/pricing/quotation/entitlement, trucking operational redesign, JO UI/GPS/driver/
fleet changes, finance/invoice/settlement/PnL, WMS/forwarding/customs/warehouse
execution, AI Copilot, Intelligence Tower. No scope conflicts encountered.

## 26. Recommendation for Next Authorized Unit

**U-08 Forwarding Writer Guard** — the natural completion of this repair: replace body
tenant with resolver identity (D-2 closure) and pass CANONICAL `work_order_id`
(U-03 resolve-or-create) when issuing SRs, eliminating defect A. The lineage adapter is
already compatible with its output. Alternatively, the customs-route auth-hardening unit
(36 broken-helper routes) remains the smaller alternative track.

```text
========================================
SENTRALOGIS — U-07 FINAL STATUS
========================================
SR→engagement→WO→WO-item→JO path understood ....... PASS
Canonical engagement lineage preserved ............. PASS
Canonical WO item resolved ......................... PASS
wo_item_id is real canonical ID .................... PASS
No fabricated lineage IDs .......................... PASS   (F1 scan: 0 offenders)
No SR-ID reuse as WO-item ID ....................... PASS
Tenant isolation preserved ......................... PASS
IdentityContext authority preserved ................ PASS
Capability registry authority preserved ............ PASS
Trucking capability boundary preserved ............. PASS
Existing JO cardinality preserved .................. PASS   (per-SR single JO, unchanged)
Existing idempotency semantics preserved ........... PASS   (dispatcher state machine)
No detached JO creation ............................ PASS   (F2: resolve precedes write)
No integrity constraint weakening .................. PASS   (no migration at all)
No cross-tenant lineage ............................ PASS
No duplicate engagement ............................ PASS
No duplicate-execution regression .................. PASS
No SR/capability-binding/execution redesign ........ PASS
U-01..U-06A regressions ............................ PASS   188/188
U-07 tests ......................................... PASS   12/12
Typecheck / Lint / Build ........................... PASS   0 / 0 / OK
Full regression .................................... PASS   743/743

FILES CREATED     3    FILES MODIFIED 2    DATABASE MIGRATIONS 0    TEST COUNT 743/743
```

Component classification:

```text
NEW       lib/application/service-contracts/trucking-lineage.ts (+tests)
MODIFY    trucking-adapter.ts (lineage-first orchestration; behavior-preserving)
KEEP      dispatcher · service-request-service · forwarding route (U-08) · all other
          JO writers · job_orders/wo_items schema · every integrity constraint
DEPRECATE (none)
```

**STOP.** Every arrow in `SR → Engagement → WO → WO Item → Trucking JO → Execution` is
now a validated, tenant-scoped, fail-closed relationship. Awaiting authorization for
U-08.
