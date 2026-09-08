# ADR-081 — Quote → SO Price Transfer Semantics

**Status:** RATIFIED (Phase 5C-R2 Human Ratification, 2026-09-05)  
**Date:** 2026-09-05  
**Depends on:** ADR-034 (Engagement → Sales Order), ADR-061 (Commercial Charge Model), ADR-066 (Price Snapshot & Commitment Boundary)

---

## 1. Context

The `sales_orders` table has a `quote_id` FK, but no automatic or server-side price transfer exists. Quote line items (`crm_quotation_items`) are mutable with no snapshot at acceptance. The canonical `sales_order_line_items.price_snapshot` JSONB schema is defined but has no production writer wiring from Quote.

## 2. Decision

**Quote acceptance → Sales Order creation includes an immutable price transfer.**

### 2.1 Transfer Semantics

```text
Accepted Quote (crm_quotations.status = ACCEPTED)
      ↓
Sales Order creation with quoteId
      ↓
Read Quote line items (crm_quotation_items)
      ↓
Create SO line items (sales_order_line_items)
      ↓
immutable price_snapshot JSONB
      ↓
Derive total_agreed_revenue from committed Quote line totals
```

### 2.2 Price Authority

- **Primary:** `crm_quotation_items.nego_price` (if present)
- **Fallback:** `crm_quotation_items.unit_price`
- **Authority:** Server reads from `crm_quotation_items` exclusively. Client-supplied prices are never used as authority.

### 2.3 Snapshot Semantics

- `unit_rate_snapshot` = `COALESCE(nego_price, unit_price)`
- `calculated_amount` = `subtotal` (pre-calculated by DB trigger)
- `pricing_side` = `'SELL'` (customer-facing Quote)
- `snapshot_timestamp` = server time at creation
- Future Quote/pricing-master changes do NOT mutate committed SO line items

### 2.4 Validation Rules

- Quote must be `ACCEPTED` status (rejects DRAFT/SENT/REJECTED)
- Quote must have at least one line item
- Quote must be tenant-owned (cross-tenant Quote access rejected)
- Each SO line item receives `source_quote_item_id` for lineage tracing

## 3. Forces / Constraints

- `sales_orders.quote_id` FK already exists
- `sales_order_line_items` table exists with `price_snapshot` JSONB
- `crm_quotation_items` has `nego_price` and `unit_price`
- Client-supplied `totalAgreedRevenue` must be ignored when `quoteId` is present
- SO line items must be immutable after confirmation

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Client-side price transfer | Violates server-authoritative pricing |
| Direct Quote → SO without snapshot | Loses price commitment immutability |
| Reuse legacy `fw_price_master` | Breaks canonical commercial lineage |

## 5. Canonical Authority

| Entity | Authority |
|--------|-----------|
| Quote line item price | `crm_quotation_items.nego_price` / `unit_price` |
| SO line item price | `sales_order_line_items.price_snapshot` |
| SO header revenue | `sales_orders.total_agreed_revenue` (derived from Quote) |
| Capability type | `md_services.sbu_type` → `PricingCapabilityType` |

## 6. Invariants

1. Quote → SO price transfer is server-authoritative.
2. `price_snapshot` JSONB is immutable after SO line item creation.
3. Client-supplied prices are never used as authority when `quoteId` is present.
4. Cross-tenant Quote access is rejected.
5. One Quote → N SOs is supported (each with independent line items).

## 7. Tenant / Security Model

- `tenantId` resolved exclusively from `IdentityContext`
- `validateQuote(tenantId, quoteId)` enforces tenant ownership before any read
- `createSOLineItem` uses `ctx.tenantId` for RLS compliance
- `createSalesOrder` requires `commercial:manage` (U-02 `assertPermission`)

## 8. Idempotency

- SO header: existing `idempotency_key` mechanism on `sales_orders`
- SO line items: before creation, `listSOLineItemsBySO` checks for existing lines
- Combined Quote → SO + line items operation is idempotent

## 9. Consequences

- Committed commercial prices are captured at SO creation
- No competing pricing aggregate created
- SO remains the canonical commercial authority
- Quote prices remain mutable until SO confirmation

## 10. Future Revisit Conditions

Revisit if:
- Quote revisioning requires re-transfer to existing SO
- Multi-currency pricing requires additional snapshot fields
- Override governance requires post-creation mutation (unlikely per ADR-063)

---

**END OF ADR-081**
