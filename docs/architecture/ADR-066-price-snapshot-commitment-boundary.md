# ADR-066 — Price Snapshot & Commercial Charge Commitment Boundary

**Status:** RATIFIED (Phase 5C-3R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Depends on:** ADR-059 (Rate Versioning), ADR-061 (Commercial Charge), ADR-065 (Precedence)  

---

## 1. Context

Phase 5C-3 discovered that the boundary between calculated pricing results and committed commercial truth was undefined. ADR-061 defines SO line items as the commitment boundary but does not specify the snapshot creation semantics, immutability rules, or the Quote→SO price transfer mechanism.

## 2. Decision

**Price snapshots are captured at SO creation and embedded as immutable JSONB within SO line items.**

### 2.1 Snapshot Creation

| Trigger | Action |
|---------|--------|
| SO creation from Quote | Copy quote item prices into SO lines with full snapshot |
| SO creation (manual) | Capture selected rate version + calculation result as snapshot |
| Rate master change after SO creation | No effect on committed SO lines |

### 2.2 Snapshot Immutability

| State | Mutation |
|-------|----------|
| DRAFT SO | Line items editable |
| Confirmed SO | Line items immutable (no UPDATE, no DELETE) |
| Cancelled SO line | Snapshot preserved for audit |

### 2.3 Amendment Semantics

| Amendment | Behavior |
|-----------|----------|
| Quantity change | Cancel old line + create new line version |
| Price change | Cancel old line + create new line version |
| Service change | Cancel old line + create new line version |
| Historical state | Remains reconstructable via cancelled lines |

### 2.4 Quote → SO Price Transfer

```
Quote Item (mutable)
    ↓ [SO Creation]
SO Line Item (immutable snapshot)
    ↓ [SO Confirmation]
Commercial Charge (locked)
```

1. Quote item prices are mutable until SO creation.
2. At SO creation, quote prices are snapshotted into SO line items.
3. `source_quote_item_id` preserves lineage.
4. Subsequent rate master changes do not affect committed SO lines.

### 2.5 Rate Change Behavior

| Timing | Effect on SO |
|--------|--------------|
| Rate changes before SO creation | SO uses current rate at creation |
| Rate changes after SO creation | No effect (snapshot is frozen) |
| Rate changes after SO confirmation | No effect (committed) |

### 2.6 Idempotency

| Rule | Mechanism |
|------|-----------|
| Duplicate commit prevention | UNIQUE(sales_order_id, source_quote_item_id) |
| Retry safety | Same quote item → same SO line (no duplicate) |
| Network timeout | Safe to retry |

### 2.7 Audit Lineage

The `price_snapshot` JSONB must preserve:

| Field | Purpose |
|-------|---------|
| `source_rate_id` | Which rate was used |
| `source_rate_version_id` | Which version |
| `unit_rate_snapshot` | Frozen unit price |
| `quantity_snapshot` | Frozen quantity |
| `currency_snapshot` | Frozen currency |
| `uom_snapshot` | Frozen UOM |
| `calculated_amount` | Final amount |
| `snapshot_timestamp` | When committed |
| `selection_explanation` | Why this rate was selected |
| `calculation_inputs` | Input context |

## 3. Invariants

1. A committed commercial price must never silently change.
2. Rate master changes only affect future commitments.
3. Amendment creates new truth, never mutates historical truth.
4. Snapshot captures full rate context for audit.
5. Idempotent commit prevents duplicate commercial truth.

## 4. Security Implications

1. Snapshot creation requires IdentityContext.
2. Tenant isolation via parent SO.
3. No client-supplied tenant authority.
4. No client-generated authoritative commercial identifiers.

## 5. Data Model Implications

1. `sales_order_line_items` table with `price_snapshot` JSONB.
2. UNIQUE(sales_order_id, source_quote_item_id) for idempotency.
3. Composite FK to parent SO for tenant isolation.

## 6. Runtime Implications

1. SO creation is the commitment point for pricing.
2. SO confirmation locks line items.
3. Cancellation preserves snapshot for audit.
4. Amendment = cancel + create new line.

## 7. Testing Requirements

1. Snapshot captured at SO creation.
2. Rate master change after SO creation does not affect committed prices.
3. Amendment creates new line, preserves old.
4. Idempotent commit (retry-safe).
5. Cross-tenant rate reference rejected.
