# ADR-061 — Commercial Charge Model

**Status:** RATIFIED (Phase 5C-2R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Amendment:** SO line-item schema + boundary rules added (§2.4, §6)  
**Depends on:** ADR-059 (Rate Versioning), ADR-060 (Buy vs Sell)  

---

## 1. Context

Phase 5C discovered that `sales_orders.total_agreed_revenue` is a single manually-entered number with no lineage to Quote pricing. No canonical Sales Order line-item pricing exists.

## 2. Decision

**Commercial Charge is the authoritative committed monetary obligation attached to a commercial transaction.**

### 2.1 Sales Order Line Items

| Field | Purpose |
|-------|---------|
| `line_id` | UUID PK |
| `sales_order_id` | Parent SO (FK → sales_orders.id) |
| `line_sequence` | Ordering |
| `service_description` | What was sold |
| `capability_type` | FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE |
| `side` | SELL or BUY |
| `quantity` | Amount |
| `uom` | Unit of measure |
| `currency` | Transaction currency |
| `unit_rate` | Agreed unit price |
| `line_total` | Calculated total |
| `source_quote_item_id` | Lineage to Quote (nullable) |
| `rate_version_id` | Source rate version |
| `price_snapshot` | JSONB frozen rate snapshot |
| `created_at` | Commitment timestamp |
| `updated_at` | Last update |

### 2.2 Total Agreed Revenue

`total_agreed_revenue` becomes a **derived aggregate** of line item totals. Not a second source of truth.

### 2.3 Charge Lineage

```
Rate Version → Pricing Calculation → Quote Item → SO Line Item → Commercial Charge
```

### 2.4 SO Line-Item Rules (5C-2R)

1. Line items are created from Quote items at SO creation (price snapshot).
2. Each line has traceability to source rate version via `rate_version_id` + `price_snapshot` JSONB.
3. BUY and SELL are separate line items.
4. Line items are immutable after SO confirmation.
5. `total_agreed_revenue` = SUM of line item totals (derived, not stored independently).
6. Line items are tenant-isolated via parent SO.

## 3. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Reuse `commercial_line_items` | Parent FK points to Engagement, not SO |
| Keep `total_agreed_revenue` only | No decomposition, no lineage |
| One charge per SO | Cannot represent multi-service orders |

## 4. Consequences

- SO revenue is fully decomposed into line items.
- Each line has lineage to Quote and Rate Version.
- `total_agreed_revenue` is derived, not authoritative.

## 5. Invariants

1. Commercial charges are immutable after SO confirmation.
2. Line total = sum of line item totals.
3. Each line has traceability to source rate version.

## 6. SO Line-Item Boundary Rules (5C-2R)

1. **Creation**: Line items created at SO creation from Quote items or manual entry.
2. **Immutability**: After SO confirmation, line items cannot be modified (only cancelled).
3. **Snapshot**: `price_snapshot` JSONB captures the full rate context at commitment.
4. **BUY/SELL**: Separate line items per side, never derived from each other.
5. **Currency**: Each line preserves its original currency (no implicit conversion).
6. **Fulfillment**: Fulfillment tracks quantity progress against line items; does not mutate prices.
