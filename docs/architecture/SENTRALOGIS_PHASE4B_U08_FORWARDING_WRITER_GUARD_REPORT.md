# SENTRALOGIS — PHASE 4B-6
# U-08 FORWARDING WRITER GUARD — FORENSIC REPORT

**Status:** COMPLETE · **Date:** 2026-08-26
**Depends on:** U-01..U-07 all ACCEPTED
**Nature:** Forensic writer repair. NO migration. NO schema change. U-07 untouched.

---

## 1. Executive Summary

The forwarding Service Request writer (`app/api/forwarding/wo/route.ts`) had two
defects: it trusted **body-supplied tenant identity** (D-2 violation) and wrote a
**legacy `work_orders.id`** into `SR.work_order_id`, whose FK targets
`commercial_work_orders` RESTRICT — the FK trap. The writer now:

```
resolveSessionIdentity (U-01)
  → assertPermission('commercial:manage') (U-02)
  → resolveOrCreateEngagement(customer)   (U-03 — canonical, idempotent, tenant-owned customer)
  → legacy operational WO + items         (case file preserved verbatim)
  → legacy_wo_bridge(legacy ↔ engagement) (idempotent; feeds U-07 lineage)
  → SR.work_order_id = CANONICAL commercial_work_orders.id
```

Result: **8/8 U-08 assertions · full regression 751/751 · tsc 0 · lint 0 · build PASS.**

## 2–4. Exact Defect, Before-State Path, Root Cause

Before:
```
body.tenant_id ──► every write            (forged identity accepted)
body ──► legacy work_orders row ──► wo_id ──► SR.work_order_id ──✗ FK(commercial_work_orders)
```

WHY the wrong identifier layer: the writer predates the Stage R schema split — it was
built when `work_orders` *was* the commercial object; after the split it kept writing
the operational artifact's id into a column that now means *canonical engagement*.

HOW it is fixed: the identifier layer is chosen explicitly — U-03's deterministic
resolve-or-create produces the engagement from the tenant-owned customer; the legacy WO
is demoted to what it is (operational case file) and linked via `legacy_wo_bridge`
(idempotent insert, UNIQUE-guarded), which is exactly the mapping U-07's lineage
resolver consumes.

WHERE the canonical id originates: `commercial_work_orders.id` returned by
`resolveOrCreateEngagement()` — never fabricated, never cast from the legacy id,
never the SR id.

Tenant authority HOW: body `tenant_id`/`user_id` are deliberately **ignored**
(non-authoritative; existing clients keep working). Every write carries
`ctx.tenantId`; the engagement resolver additionally proves customer ownership
(`CUSTOMER_NOT_FOUND` 404 otherwise, non-leaking).

## 5–7. Tenant / Authorization / Resolver Analysis

- Authentication always precedes resolution (`resolveSessionIdentity` first).
- Authorization: existing U-02 `commercial:manage` on the mutation (no new permissions).
- U-03 is the SINGLE engagement source; no ad-hoc queries, no second resolver.
- Idempotency: repeated requests for the same customer reuse its OPEN engagement
  (F2: one engagement after two requests). Existing weak `Date.now()` idempotency keys
  in SR issuance are pre-existing behavior — documented debt, not expanded.

## 8–11. Canonical Resolution / Legacy Forensics / Capability

Legacy classification (§10): the old `wo_id` is an **operational case file + bridge
source** (A+C); it is still created and returned in the response (`wo_id`), but NEVER
written to `SR.work_order_id` (F6/F7 behavioral + F9 static proof).

Capability (§13): no capability branching added; FORWARDING context verified through
U-05 (`isRegisteredCapability`/`resolveCapability`) in F8. Dispatch routing remains
`target_domain:'TRUCKING'` as before (U-07 governs that boundary).

## 12–15. Files & DB

**Created:** `lib/application/service-contracts/forwarding-writer.ts` (guarded writer +
narrow port + injection seams) · `__tests__/forwarding-writer.test.ts` · this report.
**Modified:** `app/api/forwarding/wo/route.ts` (now ~50 lines: session → gate → delegate;
error mapping for identity/engagement errors) · `scratch/run-tests.ts` (registration).
**Database changes:** NONE. No FK/NOT NULL/RLS touched. No migration.

## 16–18. Test Matrix & Forensic Results

| # | Assertion | Result |
|---|---|---|
| F1/F6/F7 | Both SRs carry canonical engagement id; legacy id never appears | PASS |
| F10 | Response contract (`wo_id`,`wo_number`) preserved; operational rows created; bridge established | PASS |
| F2 | Two requests → ONE engagement (U-03 idempotency) | PASS |
| F3 | Forged body `tenant_id:TENANT_B`/`user_id` ignored — all writes carry IdentityContext tenant | PASS |
| F4 | Cross-tenant customer → `CUSTOMER_NOT_FOUND`, ZERO writes | PASS |
| F8 | FORWARDING resolves via registry authority | PASS |
| F9 | Static scans: route writes no SRs directly; writer uses U-03 + `work_order_id: engagementId`; no random UUIDs; bridge present | PASS |

Post-implementation repository search (§23): forwarding/runtime SR writers =
`forwarding-writer.ts` ONLY (both issuance sites `work_order_id: engagementId`);
execution-plan-service / command-center / deconsol / v1-SR-route contain NO SR INSERT
with work_order_id. Fabricated-id scan: 0 offenders.

## 19–21. Regression (executed)

U-01 36 · U-02 66 · U-03 11 · U-04 33 · U-05 12 · U-06 20 · U-06A 10 · U-07 12 ·
U-08 **8/8** ⇒ full regression **751/751 PASS** · tsc 0 · lint 0 · build PASS.
(Pre-existing shipment-api connection log unchanged; suite passes.)

## 22. Remaining Debt

1. Weak `Date.now()` SR idempotency keys at this writer (pre-existing; documented).
2. Migrations 014–016 deploy + types regeneration (carried).
3. Customs routes still on broken auth helper (36 routes — separate unit).
4. CreateWOForm browser-direct writes (4B-0 debt).
5. Outbox relay infrastructure (platform-wide).

## 23–24. Non-Goals & Next Recommendation

NOT implemented/touched: SR schema/lifecycle redesign, engagement model changes,
registry/binding, trucking adapter (U-07 verified untouched by regression), customs/
warehouse execution, pricing/package/quotation/finance, GPS/driver/fleet, AI/intelligence.

Next unit recommendation: **U-09 Fabricated-ID Elimination in the canonical shipment
creator** (`sbu/forwarding/shipments/create/page.tsx`) — the last known client-side
fabrication site per backlog; it can now consume U-04/U-03 surfaces exactly like this
unit did. Alternative: customs-route auth hardening (36 routes).

```text
========================================
SENTRALOGIS — U-08 FINAL STATUS
========================================
Forwarding writer forensic path understood ....... PASS
IdentityContext tenant authority ................. PASS   (body tenant ignored)
Authorization preserved/strengthened ............. PASS   (commercial:manage)
Canonical engagement resolution .................. PASS
U-03 resolve-or-create used ...................... PASS   (single source)
SR.work_order_id = commercial_work_orders.id ..... PASS
Legacy work_orders.id eliminated from SR writer .. PASS
No fabricated ID ................................ PASS
Cross-tenant protection .......................... PASS
Customer relationship validated .................. PASS
Capability authority via U-05 .................... PASS
Existing SR contract preserved ................... PASS
Existing forwarding behavior preserved ........... PASS   (+additive engagement_id)
No schema weakening / No migration ............... PASS
No duplicate engagement .......................... PASS
No U-07 modification ............................. PASS
No unrelated runtime modification ................ PASS
U-01→U-07 regressions ............................ PASS   188/188
U-08 tests ....................................... PASS   8/8
Typecheck / Lint / Build ......................... PASS   0 / 0 / OK
Full regression .................................. PASS   751/751

FILES CREATED 3 · FILES MODIFIED 2 · DATABASE CHANGES NONE · TEST COUNT 751/751
```

Component classification:

```text
NEW       lib/application/service-contracts/forwarding-writer.ts (+tests)
MODIFY    app/api/forwarding/wo/route.ts (thin guarded caller)
KEEP      svc_service_requests schema · legacy work_orders/items flow · U-03/U-07
          modules · dispatcher · all other domains
DEPRECATE body-tenant authority at THIS writer (D-2 closure)
```

**STOP.** `svc_service_requests.work_order_id` now provably receives only REAL,
same-tenant `commercial_work_orders.id`s. Awaiting authorization for U-09.
