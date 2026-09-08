# ADR-034 — Engagement → Sales Order (1:N)

**Status:** RATIFIED (U-12A-R architectural ratification, 2026-08-28) **Date:** 2026-08-28

## Context
`commercial_work_orders` is the ratified canonical long-lived customer Engagement (ADR-018), one open per (tenant, customer), and serves as the relationship/context container. U-12/U-12A established that a distinct Sales Order (SO) object is required to represent a specific customer commercial commitment.

## Decision
**`commercial_work_orders` remains the canonical long-lived customer Engagement. It is NOT the Sales Order. Introduce a NEW Sales Order as a child of the Engagement.**

Relationship and cardinality:

```
Customer
   ↓
Engagement
   ↓
Sales Orders   (ONE Engagement → MANY Sales Orders)
```

```
Engagement
 ├── SO-001
 ├── SO-002
 └── SO-003
```

Rules:
1. Do NOT merge Engagement and SO into one concept.
2. Do NOT rename Engagement to SO.
3. Do NOT constrain an Engagement to a single SO.
4. An SO MUST reference exactly one Engagement (its canonical parent).

## Consequences
Clean long-lived relationship container vs. specific transaction. N orders per relationship. U-13 may model `sales_orders` referencing `commercial_work_orders.id`.

## Rejected alternatives
Folding SO into Engagement (collapses relationship vs. transaction); renaming Engagement to SO (loses long-lived container semantics); constraining Engagement to one SO (blocks repeat business per open relationship).
