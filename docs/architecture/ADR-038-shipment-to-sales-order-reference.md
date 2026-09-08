# ADR-038 — Shipment → Sales Order Reference

**Status:** RATIFIED (U-12A-R architectural ratification, 2026-08-28) **Date:** 2026-08-28

## Context
A Sales Order is a customer commercial commitment; a Shipment is the operational forwarding aggregate (a voyage/journey) that executes the forwarding part of an SO, anchored to the Engagement. One order may be fulfilled across multiple voyages, split lots, multimodal legs, or consolidation stages.

## Decision
**A Sales Order may produce multiple Shipments.**

Cardinality:
> ONE SO → MANY Shipments

This explicitly supports partial fulfillment, split shipment, multimodal execution, forwarding consolidation, and staged delivery.

Example:

```
SO-001 (50 containers)
    │
    ├── Shipment-001
    │       20 containers
    │
    └── Shipment-002
            30 containers
```

Rules:
1. Shipment remains a logistics movement aggregate.
2. Do NOT turn Shipment into SO.
3. Do NOT make SO contain operational shipment details.

## Consequences
`shp_shipments.work_order_id → commercial_work_orders` (Engagement anchor) remains NOT UNIQUE, permitting 1..N shipments per engagement and per SO. An explicit SO reference enables per-order shipment attribution for partial/multimodal fulfillment.

## Rejected alternatives
Shipment as SO (conflates commercial commitment with voyage); SO embedding operational shipment details (violates ADR-036 commercial/operational boundary).
