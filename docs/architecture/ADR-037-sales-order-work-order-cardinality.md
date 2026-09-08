# ADR-037 — Sales Order → Work Order Cardinality

**Status:** RATIFIED (U-12A-R architectural ratification, 2026-08-28) **Date:** 2026-08-28

## Context
A Sales Order (customer commercial commitment) is decomposed at the Fulfillment boundary into operational Work Orders. The cardinality between SO and WO must be explicit to protect lineage, customer ownership, profitability, billing, cancellation, operational authorization, audit, and fulfillment attribution.

## Decision
**ONE Sales Order → MANY Work Orders.**

Allowed:

```
SO-001
 ├── WO-001
 ├── WO-002
 └── WO-003
```

Forbidden:

```
SO-A ─┐
      ├── WO-001
SO-B ─┘
```

Therefore:
> MANY Sales Orders → ONE Work Order is FORBIDDEN.

A Work Order has one canonical commercial ownership path. Shared WO ownership would create ambiguity in lineage, customer ownership, profitability, billing, cancellation, operational authorization, audit, and fulfillment attribution.

## Consequences
WO must remain single-order. The existing `work_orders → wo_items → job_orders` operational engine is preserved. U-13 must enforce this cardinality (1 SO → N WO; never N SO → 1 WO).

## Rejected alternatives
Many SO → one WO sharing (ambiguous ownership/debt); SO replacing WO/WO-Item/JO (collapses the operational engine).
