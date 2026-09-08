# ADR-043 — Fulfillment State & Events

**Status:** RATIFIED (U-14A architectural ratification, 2026-08-28) · **Date:** 2026-08-28 **Depends on:** ADR-036 (single handoff), ADR-033 (SR as command), ADR-037 (SO → WO), event-outbox/SEA convention

## Context
Sales Order state is mutated only by the SO command service, and operational state only by its SBU service. Fulfillment adds a new per-SO progress/state plane that must NOT introduce a second writer or a direct cross-object state authority. The composition's progress must be Sourced from existing operational events, not written directly by JOs/shipments/declarations.

## Decision
**Fulfillment state is owned and mutated ONLY by the Fulfillment service, and is sourced (SEA) from existing operational events. No cross-object state authority.**

Proposed Fulfillment lifecycle:
```
PLANNED → ACTIVE → PARTIALLY_FULFILLED → FULFILLED
               └──────────────┴───────────────┘
                         (→ VOID / CANCELLED when pre-conditions permit)
```

- **Fulfillment service** is the ONLY writer of Fulfillment state.
- **SO service** is the ONLY writer of SO state.
- **Operational SBU services** are the ONLY writers of shipment/WO/JO/declaration state.
- The Fulfillment service *consumes* operational events (shipment delivered, WO completed, declaration released, JO completed) to recompute per-allocation and global progress. It does NOT command operations (prefix: service requests do, ADR-033).

Proposed new Fulfillment events (for the future implementation recommendation, following SEA + `event_outbox`):
- `fulfillment.plan_created` (SO → composition)
- `fulfillment.plan_activated` (ADR-036 handoff begins)
- `fulfillment.allocation.updated` (per-capability progress)
- `fulfillment.partially_fulfilled`
- `fulfillment.fulfilled`
- `fulfillment.plan_cancelled` / `revision_created`

These are PROPOSED event names for the Fulfillment Foundation phase; they are recorded here as the ratified semantic contract, not implemented now.

## Rules
1. No JOs/shipments/declarations/WOs mutate Fulfillment state directly.
2. Fulfillment does NOT mutate SO state; it emits progress facts that the SO service may consume.
3. No single Fulfillment transition may bypass the ADR-036 single commercial→operational handoff.

## Consequences
✓ Single-authority per object (SO / Fulfillment / Ops) is preserved.
✓ Replanning and partial-fulfillment progress are representable without polluting SO or operational state.
✓ Control Tower can consume SO + Fulfillment + operational events without coupling to CRM internals (U-14 §24).
⚠ The implementation phase must wire the event subscription; this ADR fixes the ownership/sourcing rule now.
