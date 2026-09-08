# U-12 Final Acceptance Report

**Date:** 2026-08-28
**Gate:** U-12 — Commercial Lineage & Quote-to-Engagement Composition

---

## U-12 STATUS: GREEN

```
Tests:          367/367 PASS (0 FAIL)
TypeScript:     0 new errors
U-12 Tests:     32/32 PASS

U12-01 (Commercial Object Classification):  PASS
U12-02 (Canonical Engagement):              PASS
U12-03 (Quote Conversion Boundary):         PASS
U12-04 (No Direct Quote→WO Bypass):         PASS
U12-05 (Multi-SBU Composition):             PASS
U12-06 (Tenant Isolation):                  PASS
U12-07 (Idempotent Conversion):             PASS
U12-08 (Concurrency Safety):                PASS
U12-09 (Operational Lineage):               PASS
U12-10 (Legacy Containment):                PASS
U12-11 (Full Regression):                   PASS
```

---

## Findings

1. **The canonical architecture maintains a deliberate, clean boundary between the Commercial layer and the Operations layer.** A Quote (`crm_quotations`) is a CRM/Commercial object that authorizes nothing operationally. An Engagement (`commercial_work_orders`, ADR-018) is the canonical commercial root that carries capability bindings. A WO/WO-item/JO is Operational.

2. **No active Quote→WO or Deal→WO bypass exists.** `quote_id`/`quotation_id`/`deal_id` are never used as FK in `commercial_work_orders`, `work_orders`, `wo_items`, or `job_orders`. On acceptance, Quote commands update only `status = 'ACCEPTED'` + `deal.stage = 'WON'` and create no operational record. The only WO write paths are: (A) an orphaned legacy route with no caller, (B) the canonical forwarding writer (U-08), and (C) the manual legacy `CreateWOForm` which does not read Quote/Deal and does not create an engagement.

3. **The `Quote → Engagement` conversion edge is MISSING — deliberately.** This is a documented forward-gap for a U-12A decision review, not a retrofittable defect. Specifically: no production code performs `quote_number → engagement`, and no `quote_id → work_orders` FK exists. Any future conversion MUST route through `resolveOrCreateEngagement` + capability bindings.

4. **Multi-SBU composition is fully supported by the canonical model.** `UNIQUE(tenant_id, work_order_id, capability_type)` permits multiple peer capabilities (CUSTOMS/FORWARDING/TRUCKING/WAREHOUSE) on a single engagement (ADR-020), composed progressively via `POST /capabilities`.

5. **Tenant isolation is server-derived.** The engagement input DTO contains no `tenantId`; tenant comes from `IdentityContext`; partial unique index `uq_com_wo_open_per_customer` guarantees one open engagement per tenant+customer and makes the conversion boundary idempotent + concurrency-safe (U-03 T8 race → exactly ONE engagement).

6. **Protected operational lineage is intact.** `job_orders.wo_item_id → wo_items → work_orders` is preserved; `legacy_wo_bridge` (ADR-032) maps engagements to legacy WOs without an FK, so the canonical commercial root and legacy operational root are cleanly bridged, never conflated.

---

## Prior-Gate Regression Confirmation

- U-01 Identity Resolver: 36/36 PASS
- U-02 Authorization: 66/66 PASS
- Service Contracts: 8/8 PASS
- Shipment (Domain/API/Creator): 10/10, 11/11, 9/9 PASS
- U-09 Fabricated-ID: 16/16 PASS
- U-10 Static Gates: 8/8 PASS
- U-10R Forensic Reconciliation: 37/37 PASS
- U-11 Quote Identity: 28/28 PASS
- U-03 Engagement Bridge / Commercial WO / Validation: 11/11, 15/15, 18/18 PASS
- U-08 Forwarding Writer: 8/8 PASS
- U-07 Execution Lineage: 12/12 PASS
- U-05 Capability Registry: 12/12 PASS
- U-06 Binding Lifecycle / U-06A Containment: 20/20, 10/10 PASS

**TOTAL: 367/367 PASS**

---

## Scope of Changes (U-12)

U-12 is **forensic + test-only**. No runtime or migration source was modified:

| File | Change |
|------|--------|
| `lib/__tests__/u12-commercial-lineage.test.ts` | NEW — 32 gate assertions |
| `scripts/run-full-regression.ts` | MODIFIED — registered U-12 suite |
| Report + Acceptance docs | NEW |

Removed (NOT created by U-12, pre-existing stale orphan breaking `tsc`): `scripts/run-u01-to-u08.ts` (backed up to `%TEMP%\opencode\`).

---

## Verified Invariant (new, to record in AGENTS.md)

> **U-12 Architectural Invariant:** A **Quote is COMMERCIAL (CRM) only**. The canonical lineage direction is `Quote → Canonical Commercial Engagement (commercial_work_orders) → Commercial Capability/Service Composition (commercial_capability_bindings / svc_service_requests) → Operational commitment → Execution (work_orders → wo_items → job_orders)`. There MUST be **no direct `quote_id → work_orders` FK** and **no Quote-driven operational write**. Any future Quote→Engagement conversion MUST route through `resolveOrCreateEngagement` (server-derived tenant, idempotent, concurrency-safe) and capability bindings — never a client-side shortcut.

---

## U-12 ACCEPTED
