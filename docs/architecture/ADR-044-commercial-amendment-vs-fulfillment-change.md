# ADR-044 — Commercial Amendment vs Fulfillment Change

**Status:** RATIFIED (U-14A architectural ratification, 2026-08-28) · **Date:** 2026-08-28 **Depends on:** ADR-034 (SO), ADR-036 (fulfillment boundary), ADR-042 (Fulfillment revision cardinality)

## Context
Changes after an SO is placed fall into two distinct classes: changes to WHAT the customer bought (commercial) vs changes to HOW Sentralogis fulfills it (fulfillment/operational). Mixing them corrupts the commercial commitment or the operational plan and breaks the ADR-036 boundary.

## Decision
**The WHAT/HOW split is the boundary between an SO (commercial) revision and a Fulfillment (composition) revision. Never invert them.**

- **WHAT the customer bought = Sales Order.** Changing WHAT (scope/price/quantity/customer destination that changes the order) is a **commercial amendment** → a new **SO revision** (per U-12A decision-row 11 and the versioned-revision convention). The Fulfillment plan is re-derived from the amended SO, never edited in place to fabricate the commercial change.
- **HOW it will be fulfilled = Fulfillment.** Changing HOW (route/sequence/split/vessel/transporter/execution) is a **fulfillment/operational change** → a new **Fulfillment revision**. It NEVER rewrites the SO.
- Replanning (U-14 §21) is a Fulfillment revision over the SAME commercial commitment; it does not change the SO unless the change is genuinely a commercial amendment.

Examples (semantic direction, not hard-coded business policy):
- Add 20 containers / change scope / change price → **commercial amendment** (SO).
- Change vessel, change transporter, change execution sequence, change a routing split → **fulfillment/operational change** (Fulfillment).
- Change the customer destination → **potentially a commercial amendment** (a destination is part of WHAT for many orders). Whether it is commercial or fulfillment depends on the order's commercial scope; the WHAT/HOW rule adjudicates it.

## Rules
1. A Fulfillment revision MUST NOT alter the SO's commercial meaning (scope/price/quantity that represents WHAT).
2. An SO commercial revision MUST NOT rewrite executed operational history in place; downstream operational work is re-planned through a fresh Fulfillment revision.
3. Historical traceability must be preserved on BOTH axes (SO revisions and Fulfillment revisions remain immutable/versioned).

## Consequences
✓ Operational replanning never mutates the commercial Sales Order.
✓ Commercial amendments never silently rewrite operational plans.
✓ Both SO and Fulfillment histories remain auditable.
⚠ Business policy on edge cases (e.g., is a destination change commercial?) is adjudicated by the WHAT/HOW rule and product design, not hard-coded here.
