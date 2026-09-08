# ADR-040 — Shipment is NOT the Fulfillment Aggregate

**Status:** RATIFIED (U-14A architectural ratification, 2026-08-28) · **Date:** 2026-08-28 **Depends on:** ADR-036 (fulfillment boundary), ADR-038 (SO → many Shipments)

## Context
A Sales Order may be fulfilled across multiple shipments, capabilities, and non-forwarding scopes. A naive shortcut is to collapse Fulfillment into the Shipment object (treating the forwarding voyage as "the fulfillment"). U-14 §49 established that this conflates a commercial/planning role with an operational logistics object.

## Decision
**Shipment is NOT the Fulfillment aggregate. Shipment remains the canonical logistics movement aggregate (a voyage/journey).**

- Shipment covers **forwarding only**. SOs that are customs-only, warehouse-only, or trucking-only have no shipment at all, yet still need per-SO fulfillment state.
- One SO → many Shipments (ADR-038): no single shipment can be "the" fulfillment of an order; the fulfillment scope must span N shipments.
- Making Shipment the fulfillment would attach a commercial decomposition/progress responsibility onto an operational object, violating the ADR-036/ADR-040 commercial-vs-operational boundary.

## Cardinality (conceptually valid where business scenarios require it)
```
SO
 ↓
Fulfillment
 ├── Shipment A
 ├── Shipment B
 └── Shipment C
```
Fulfillment COMPOSES shipments; it does NOT become one.

## Rules
1. Shipment stays a logistics movement aggregate (origin/destination, voyage, units, legs, manifest, milestones).
2. Fulfillment may reference N shipments as child effects of a forwarding allocation.
3. Fulfillment MUST NOT inherit/duplicate shipment internals; the shipment keeps owning its own lifecycle.

## Consequences
✓ Non-forwarding SOs remain completable.
✓ Partial/split/multimodal forwarding (ADR-038 1:N) is preserved.
✓ The operational Shipment is not soiled by commercial responsibilities.

## Rejected alternatives
Shipment as the fulfillment aggregate (fails non-forwarding, breaks 1:N, soils an operational object — rejected by U-14 §49); Fulfillment duplicating shipment voyage fields.
