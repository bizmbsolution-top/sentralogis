# ADR-060 — Buy vs Sell Price Distinction

**Status:** PROPOSED (Phase 5C-R, 2026-09-01)  
**Date:** 2026-09-01  
**Depends on:** ADR-058 (Rate Master Model)  

---

## 1. Context

Phase 5C discovered that `fw_price_master` has only sell price columns and COGS budget columns. No canonical buy price exists. Buying cost is not a negative selling price — it requires independent representation.

## 2. Decision

**Independent SELL and BUY rate concepts with deterministic margin calculation.**

### 2.1 Sell Rate
What the customer is charged. Always visible to commercial roles.

### 2.2 Buy Rate
What the forwarder pays vendors/carriers. Restricted visibility.

### 2.3 Gross Margin
Calculated deterministically: `margin = sell_amount - buy_amount`. Not persisted (derived).

### 2.4 Authorization

| Data | Required Permission |
|------|---------------------|
| Sell price | `pricing:read` |
| Buy cost | `pricing:view_cost` |
| Margin | `pricing:view_margin` |

## 3. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Single price with margin % | Loses buy-side lifecycle independence |
| Negative buy price | Confuses accounting, error-prone |
| Persist margin | Violates DRY (derivable from sell - buy) |

## 4. Consequences

- Buy and sell rates can have independent validity periods.
- Margin visibility is permission-controlled.
- Vendor cost exposure is restricted to authorized roles.

## 5. Invariants

1. Buy rate and sell rate are independently versioned.
2. Margin is always calculated, never persisted.
3. Buy cost visibility requires explicit permission.
