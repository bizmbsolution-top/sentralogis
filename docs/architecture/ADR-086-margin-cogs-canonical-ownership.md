# ADR-086 — Margin / COGS Canonical Ownership

**Status:** RATIFIED (Phase 5C-R2 Human Ratification, 2026-09-05)  
**Date:** 2026-09-05  
**Depends on:** ADR-081 (Quote → SO Price Transfer Semantics), ADR-086 (legacy numbering — Margin / COGS Canonical Ownership)

---

## 1. Context

Margin is computed client-side in `AddCostTable.tsx` and `UnifiedFinancePanel.tsx` from `deal_price - purchase_price`. No canonical margin aggregate exists. COGS is stored as flat columns (`cogs_pickup`, `cogs_port_haulage_origin`, etc.) in legacy tables. `price_snapshot` JSONB schema is defined but has no production writer for margin/COGS.

## 2. Decision

**Margin and COGS are canonicalized at the SO line item level as part of the `price_snapshot` JSONB.**

### 2.1 Representation

- Margin/COGS embedded in `sales_order_line_items.price_snapshot`
- Legacy operational COGS columns become derived projections
- No separate margin/COGS tables are created

### 2.2 Non-Boundary

Operational cost tracking and driver coin economics remain in their sovereign domains.

## 3. Forces / Constraints

- `price_snapshot` JSONB is already defined in ADR-059/066
- Client-side margin computation is error-prone and non-authoritative
- Legacy COGS columns are scattered across forwarding tables
- Canonical pricing must own margin representation

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Client-side margin only | Non-authoritative; no audit trail |
| Separate margin table | Creates parallel aggregate |
| Legacy COGS as authority | Scattered; no unified view |

## 5. Canonical Authority

| Concept | Authority |
|---------|-----------|
| Margin | `sales_order_line_items.price_snapshot` |
| COGS | `sales_order_line_items.price_snapshot` |
| Legacy COGS | Derived projection from canonical snapshot |

## 6. Invariants

1. Margin/COGS are embedded in `price_snapshot` JSONB.
2. Legacy operational COGS columns are derived projections.
3. No separate margin/COGS tables are created.
4. Client-side margin computation is replaced by canonical authority.

## 7. Tenant / Security Model

- `price_snapshot` inherits tenant isolation from SO line item
- No additional RLS required beyond existing SO line item policies
- Margin data is commercial-sensitive; access controlled by `commercial:read`

## 8. Consequences

- Canonical margin/COGS becomes the single source of truth
- Client-side margin computation is deprecated
- Legacy COGS columns are phased out via ADR-083

## 9. Future Revisit Conditions

Revisit if:
- Margin decomposition requires additional dimensions
- Multi-entity COGS allocation becomes required
- Driver coin economics require margin linkage

---

**END OF ADR-086**
