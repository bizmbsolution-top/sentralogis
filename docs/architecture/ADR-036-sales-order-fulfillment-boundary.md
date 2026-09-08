# ADR-036 — Sales Order Fulfillment Boundary

**Status:** RATIFIED (U-12A-R architectural ratification, 2026-08-28) **Date:** 2026-08-28

## Context
The Sales Order is the customer's commercial commitment. The repo already has composable operational pieces for turning a commitment into executable work: capability bindings (ADR-020), service requests, and shipment plans. A single, explicit boundary between commercial and operational execution must be established so that an SO does not directly become operational work.

## Decision
**Fulfillment is the explicit boundary between Commercial and Operational execution.**

Conceptual flow:

```
Sales Order
    ↓
Fulfillment
    ↓
Operational composition
```

Reuse existing canonical mechanisms where applicable:
- `commercial_capability_bindings` — multi-SBU composition
- `svc_service_requests` — cross-domain dispatch command
- Shipment — operational forwarding aggregate

Rules:
1. SO does NOT directly become operational execution.
2. Do NOT create a second competing fulfillment architecture.
3. The single commercial→operational handoff is: SO(CONFIRMED) → capability bindings + service requests + guarded WOs.

## Consequences
SO remains purely commercial. Fulfillment decomposition is the boundary. U-13 must route SO activation through the existing binding/SR/WO mechanisms, not invent a parallel path.

## Rejected alternatives
SO directly creating WOs/JOs (collapses commercial/operational; violates ADR-037 & operational protection); a brand-new fulfillment engine (duplicates ADR-020 + SR + shipment machinery).
