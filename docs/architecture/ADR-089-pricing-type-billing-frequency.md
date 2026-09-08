# ADR-089 — Pricing Type / Billing Frequency

**Status:** CLOSED / REJECTED (Phase 5C Formal Ratification, 2026-09-06)  
**Date:** 2026-09-06  
**Depends on:** ADR-082 (Canonical Pricing Activation Strategy)

---

## 1. Context

`crm_sbu_customer_rates` contains a `pricing_type` field with values:
- `ONE_TIME`
- `RECURRING_MONTHLY`
- `PER_ACTIVITY`

A proposal was made to add `pricing_type` or `billing_frequency` to canonical `pricing_rate_items`.

## 2. Decision

**REJECTED — `pricing_type` is not a canonical Pricing concept.**

### 2.1 Reason

`pricing_type` represents **billing frequency / charge occurrence policy**, not pricing calculation semantics.

### 2.2 Critical Distinctions

| Concept | Definition | Example | Owner |
|---------|-----------|---------|-------|
| `charge_basis` | How quantity is calculated | PER_CONTAINER, PER_CBM, PER_TRIP | Pricing |
| `unit_of_measure` | Measurement unit | Container, CBM, KG, Trip | Pricing |
| `unit_rate` | Monetary rate per unit | 1,500,000 IDR/container | Pricing |
| `min_charge` | Minimum monetary charge | 1,000,000 IDR | Pricing |
| `pricing_type` | **When/how often to charge** | ONE_TIME, MONTHLY, PER_ACTIVITY | **Billing/Financial** |

### 2.3 Runtime Evidence

Consumers of `pricing_type`:
- `commercial/rates/page.tsx` — display + filter only
- `commercial/quotations/[id]/page.tsx` — display only
- `portal/sales/quotations/[id]/page.tsx` — display only

**NO runtime calculation, rate selection, or invoice generation uses `pricing_type`.**

The field is display metadata and future billing intent, not a pricing definition.

## 3. Why It Does NOT Belong in Pricing

1. **Different lifecycle:** Pricing rates are defined and versioned. Billing frequency is a commercial/contractual agreement.
2. **Different authorization:** Pricing is managed by commercial team. Billing rules are managed by finance/billing team.
3. **Different consumer:** Pricing feeds quotations and operational execution. Billing frequency feeds invoicing and settlement.
4. **No calculation impact:** `pricing_type` does not affect price calculation.

## 4. Disposition

**CLOSED / REJECTED as a Pricing ADR.**

If billing frequency representation is needed in the future, it belongs in:
- ADR-084 (Financial Settlement) scope, OR
- A separately authorized Billing/Financial architecture decision

NOT in canonical `pricing_rate_items`.

## 5. Consequences

- No changes to canonical Pricing schema
- No changes to `pricing_rate_items`
- `crm_sbu_customer_rates.pricing_type` remains in legacy table
- Future billing architecture must address billing frequency separately

---

**END OF ADR-089**
