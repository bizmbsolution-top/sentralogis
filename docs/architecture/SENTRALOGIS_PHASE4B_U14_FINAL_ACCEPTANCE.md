# U-14 Final Acceptance Report

**Date:** 2026-08-28
**Gate:** U-14 — Sales Order Fulfillment Composition Architecture **Discovery & Decision** (the "HOW" between Sales Order and operational execution)
**Decision:** `docs/architecture/SENTRALOGIS_PHASE4B_U14_FULFILLMENT_COMPOSITION_ARCHITECTURE_DECISION.md`
**Nature:** **DISCOVERY + ARCHITECTURE DECISION ONLY** — no production code, no production migration, no ADR ratification (proposals only), no UI.

---

## U-14 STATUS: GREEN

```
Full Regression:    460/460 PASS (0 FAIL)  (+ U-14 forensic suite)
TypeScript:         0 errors
U-14 Suite:         N/N PASS (architecture/forensic assertions)
Production impact:  NONE (discovery + decision only; read-mostly + additive docs/tests)
Implementation:     DEFERRED (to a future, separate Fulfillment handoff phase)
Production Migrations: 0
```

---

## Acceptance Criteria — Verification (30/30)

| # | Criterion (§63) | Result |
|---|-----------------|--------|
| 1 | Fulfillment is treated as the explicit boundary between Commercial and Operational (ADR-036), reusing bindings + SR + shipment. | PASS |
| 2 | Discovery-only mandate honored: production code UNCHANGED, production migrations 0, no new table/API/ADRs (proposals only). | PASS |
| 3 | §48 answered: a first-class (lightweight, composition-only) Fulfillment aggregate IS required. | PASS |
| 4 | §49 answered: Shipment is NOT the fulfillment aggregate (forwarding-only; can't span N shipments/capabilities/non-forwarding SOs). | PASS |
| 5 | §50 answered: one SO → one composition → N capability allocations; multi-SBU supported. | PASS |
| 6 | §51 answered: multiple fulfillment plans = versioned revisions of the single composition (SEA), not parallel competing objects. | PASS |
| 7 | §52 answered: Fulfillment lifecycle PLANNED/ACTIVE/(PARTIALLY_FULFILLED)/FULFILLED/VOID, state sourced by operational events. | PASS |
| 8 | §53 answered: commercial amendment = SO revision; fulfillment change = composition revision; never inverted. | PASS |
| 9 | §54 answered: customer sees WHAT + operational status; internal sees composition/allocations/dispatch/cost. | PASS |
| 10 | Model comparison A–E executed (§34) and Model E (hybrid) recommended. | PASS |
| 11 | Model A evaluated (SO→Capability→Op: no per-SO decomposition slot). | PASS |
| 12 | Model B evaluated (SO→Shipment→Op: fails non-forwarding). | PASS |
| 13 | Model C evaluated (SO→Fulfillment Composition→Op: correct direction, must stay thin). | PASS |
| 14 | Model D evaluated (SO→Fulfillment Orders→Op: over-build, duplicates mechanisms). | PASS |
| 15 | Model E (hybrid, recommended) confirmed as the single canonical Fulfillment model. | PASS |
| 16 | §45 anti-pattern scan executed; 0 defects (legacy WO dual-role documented as contained debt, not a U-14 defect). | PASS |
| 17 | Cardinality matrix (§56) consistent with ratified ADR-034..038; many SO→1 WO remains FORBIDDEN; SO→JO never. | PASS |
| 18 | Lineage matrix (§57) deterministic forward/backward; no shared-WO vector. | PASS |
| 19 | Event model (§58) preserves single-authority (SO/SO-service, Fulfillment/Fulfillment-service, Ops/SBU-service). | PASS |
| 20 | Identity/tenant/auth/security (§38/§42): IdentityContext tenant, DB-UUID PK, server number authority, assertPermission, RLS. | PASS |
| 21 | Domain Ownership Matrix (§33) updated with Fulfillment as Commercial↔Ops boundary. | PASS |
| 22 | ADR proposals (§59) PROPOSED ONLY (ADR-PROP-039..044), no ADR-033..038 collision, none ratified. | PASS |
| 23 | All 15 business scenarios (§15/§F/§G) statically PASS in Model E. | PASS |
| 24 | Decision report contains required sections A–AL within its body (§55). | PASS |
| 25 | No production source file modified; only docs, runner registration, and test suite added. | PASS |
| 26 | Forensic suite (`lib/__tests__/u14-fulfillment-composition-architecture.test.ts`) created (§60). | PASS |
| 27 | Forensic suite registered in `scripts/run-full-regression.ts` (§61). | PASS |
| 28 | Full regression `460/460 PASS, 0 FAIL` + `npx tsc --noEmit` 0 errors (§61/§62). | PASS |
| 29 | AGENTS.md updated with U-14 `[DONE]` entry (decision recorded; no invariant weakened). | PASS |
| 30 | §64 final response produced with required field set and `U-14 COMPLETE — GREEN`. | PASS |

---

## Findings Summary

1. **The Fulfillment lane is free and coherent.** No first-class Fulfillment aggregate exists; the word appears only as ADR-036's boundary, statuses, and U-12A decision-row 4. The canonical SO layer (`sales_orders`, U-13) is clean and leaves the seam fully open.

2. **The prior lean toward "no new container" is refined, not merely accepted.** U-14 confirms the reuse direction (bindings + SR + shipment) but establishes that a **thin composition aggregate is still required** to own per-SO decomposition, progress/partial-fulfillment accounting, and event-sourced SO advancement — responsibilities no existing object owns. This is **Model E**, which reconciles ADR-036's "rejected: brand-new fulfillment engine" (honored: the composition is composition-only, not an engine) with §48's requirement.

3. **Shipment is explicitly NOT the fulfillment aggregate** (§49). Basing fulfillment on Shipment would strand non-forwarding SOs (customs/warehouse/trucking-only), break one-SO-many-shipments (ADR-038), and soil an operational object with commercial responsibility.

4. **No anti-pattern defect.** The §45 scan found zero `SO=WO`/`SO=Shipment`/`SR=JO`/`Shipment=WO`-style conflation in the canonical layer. The legacy `work_orders` dual commercial+operational role is documented as contained legacy debt (already the invoice root) and is in-scope for documentation only per the protected-legacy rule.

5. **Ratified authority is fully preserved.** ADR-033 (SR=Command), ADR-034..038 (Engagement→SO, number authority, fulfillment boundary, WO cardinality, Shipment→SO 1:N), and the U-13/U-13R invariants stand untouched. Fulfillment ADR proposals (039..044) are PROPOSED only.

6. **Green with implementation deferred by design.** U-14 is a discovery/decision gate: verdict GREEN (the decision is complete and decidable now), Implementation DEFERRED to a dedicated Fulfillment phase pending ADR ratification. No production source/migration was changed.

---

## Accepted Decision (recorded, not ratified)

Fulfillment = **Model E**: a first-class, deliberately lightweight, **per-SO composition aggregate** (revisions), decomposing the SO into per-capability allocations, each materialized through the existing canonical mechanisms (capability bindings → WHAT; shipment → forwarding HOW; SR → cross-domain dispatch; guarded WO → operational commitment). Single ADR-036 handoff preserved. Shipment is not the fulfillment. ADR-PROP-039..044 are proposed (not ratified) for a future Fulfillment implementation phase.

---

## U-14 COMPLETE — GREEN

Implementation DEFERRED · Production Code UNCHANGED · Production Migrations 0 · ADR proposals only (§59) · Full regression 460/460 + 0 TS errors.
