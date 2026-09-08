# ADR-062 — Currency and UOM in Pricing

**Status:** RATIFIED (Phase 5C-2R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Amendment:** Monetary precision contract (§6) + UOM rules (§7) added  
**Depends on:** ADR-058 (Rate Master Model)  

---

## 1. Context

Phase 5C discovered that currency is hardcoded to IDR in all UI formatters. No exchange rate table exists. UOM is free-text everywhere with no standardization.

## 2. Decision

**Explicit ISO currency codes and canonical UOM references.**

### 2.1 Currency

| Field | Standard |
|-------|----------|
| `currency` | ISO 4217 (IDR, USD, EUR) |
| `exchange_rates` | Separate table for FX conversion |

### 2.2 UOM

| Field | Standard |
|-------|----------|
| `uom_code` | Reference to `md_uoms` or canonical UOM list |
| Supported | CONTAINER, CBM, KG, TON, PALLET, DOCUMENT, TRIP, HOUR, DAY, PERCENTAGE, FIXED_AMOUNT |

### 2.3 Exchange Rates

| Field | Purpose |
|-------|---------|
| `from_currency` | Source currency |
| `to_currency` | Target currency |
| `rate` | Conversion rate |
| `effective_date` | When rate applies |
| `tenant_id` | Tenant scope |

### 2.4 UOM Contract (5C-2R)

| Concept | Rule |
|---------|------|
| Canonical vocabulary | CONTAINER, CBM, KG, TON, PALLET, DOCUMENT, TRIP, HOUR, DAY, PERCENTAGE, FIXED_AMOUNT |
| Dimensional UOM | kg↔ton (mathematically convertible) — future phase |
| Contextual UOM | container↔CBM (requires domain context) — NOT auto-converted |
| Caller responsibility | Must normalize quantity to rate's native UOM |
| Incompatible UOM | Rejected with clear error |

## 3. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Hard-code IDR | Cannot handle USD-denominated forwarding |
| Free-text UOM | Prevents conversion and validation |
| Full FX platform | Over-engineering for current needs |

## 4. Consequences

- Multi-currency support for international forwarding.
- UOM standardization enables automated conversion.
- Exchange rates are tenant-scoped and date-effective.

## 5. Invariants

1. Currency is always explicit (never assumed).
2. UOM is reference-controlled (not free-text).
3. Exchange rates are date-effective and tenant-isolated.

## 6. Monetary Precision Contract (5C-2R)

| Concept | Rule |
|---------|------|
| Internal precision | `NUMERIC(18,4)` for rates and intermediate calculations |
| Monetary precision | Currency-specific: IDR=0, USD=2, EUR=2, JPY=0 |
| Rounding mode | HALF_UP |
| Rounding stage | Final monetary result only (not intermediates) |
| Arithmetic | PostgreSQL NUMERIC (never JavaScript floating-point) |
| Min/max interaction | Apply min/max before rounding |

### 6.1 Precision Rules

1. All calculations use PostgreSQL NUMERIC types.
2. Intermediate results retain full precision.
3. Final monetary result is rounded to currency-specific precision using HALF_UP.
4. Min/max charge boundaries are applied before rounding.
5. Negative quantities are rejected.

## 7. UOM Rules (5C-2R)

1. Rate items define `unit_of_measure` and `charge_basis`.
2. Callers must provide quantity in the rate's native UOM.
3. No automatic UOM conversion in the pricing engine.
4. Capability-specific conversions (e.g., volumetric weight) belong to the calling domain.
