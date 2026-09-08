# ADR-088 — Multi-Mode Pricing Representation via Existing Canonical Model

**Status:** RATIFIED (Phase 5C Formal Ratification, 2026-09-06)  
**Date:** 2026-09-06  
**Depends on:** ADR-082 (Canonical Pricing Activation Strategy), ADR-086 (Margin / COGS Canonical Ownership)

---

## 1. Context

Legacy `fw_price_master` contains multiple sell price columns representing different pricing modes for the same route:
- `sell_price`: Base sell price per container/unit (FCL)
- `sell_per_cbm`: Alternative sell price per cubic meter (LCL)
- `sell_min_cbm`: Minimum charge for LCL shipments

The canonical `pricing_rate_items` model already supports multiple rate items per rate version with distinct `charge_basis` values.

## 2. Decision

**Legacy `fw_price_master` multi-mode sell prices map to existing canonical `pricing_rate_items` without schema extension.**

### 2.1 Semantic Mapping

| Legacy Column | Canonical Representation | Notes |
|---------------|--------------------------|-------|
| `sell_price` | `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CONTAINER'` | Direct mapping |
| `sell_per_cbm` | `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CBM'` | Separate rate item under same rate version |
| `sell_min_cbm` | `pricing_rate_items.min_charge` on the PER_CBM rate item | NOT a separate charge basis |

### 2.2 Representation

One `fw_price_master` row maps to one canonical `pricing_rates` record with multiple `pricing_rate_items` under one rate version:

```text
Canonical Rate: FWD-OCEAN-JKT-LAX
├── Rate Version 1
│   ├── Rate Item A: charge_basis='PER_CONTAINER', unit_rate=1,500,000
│   └── Rate Item B: charge_basis='PER_CBM', unit_rate=500,000, min_charge=1,000,000
```

### 2.3 COGS Exclusion

COGS and cost fields are explicitly outside ADR-088 scope:
- `cogs_pickup`
- `cogs_port_haulage_origin`
- `cogs_ocean_freight`
- `cogs_thc_origin`
- `cogs_port_haulage_dest`
- `cogs_last_mile`
- `cogs_documentation`
- `cogs_other`
- `master_cost_origin_amount`
- `master_cost_destination_amount`

COGS ownership remains governed by ADR-086.

### 2.4 Non-Boundary

No new canonical pricing schema is introduced. This is a semantic mapping decision using existing canonical capabilities.

## 3. Forces / Constraints

- Canonical `pricing_rate_items` supports multiple items per rate version
- `charge_basis` distinguishes PER_CONTAINER from PER_CBM
- `min_charge` implements minimum charge semantics exactly as required for `sell_min_cbm`
- `applicability_conditions` JSONB supports customer, route, and service constraints
- Selection engine gives +10 specificity to matching `charge_basis`
- Callers must explicitly specify `PricingContext.chargeBasis` when multiple applicable bases exist

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Create new `MIN_CHARGE` charge basis | Semantically incorrect; `min_charge` is a bound, not a calculation basis |
| Extend canonical schema with new columns | Unnecessary; existing model supports the semantics |
| Migrate COGS into canonical Pricing | Violates ADR-086 boundary; COGS is cost domain, not pricing |
| Adapter-only approach | Adapter can preserve semantics but canonical mapping is cleaner |

## 5. Canonical Authority

| Legacy Concept | Canonical Authority |
|----------------|---------------------|
| Sell price (FCL) | `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CONTAINER'` |
| Sell price (LCL) | `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CBM'` |
| Minimum charge (LCL) | `pricing_rate_items.min_charge` on PER_CBM item |
| COGS | ADR-086 (`sales_order_line_items.price_snapshot`) |

## 6. Invariants

1. ADR-088 does not introduce new canonical pricing schema.
2. Multiple rate items with different `charge_basis` values can coexist under one rate version.
3. `sell_min_cbm` maps to `min_charge`, NOT to a new charge basis.
4. COGS remains outside canonical Pricing scope.
5. Callers must explicitly specify `PricingContext.chargeBasis` when multiple applicable bases exist.

## 7. Tenant / Security Model

- Tenant isolation preserved via existing `pricing_rates` RLS policies
- Server-side pricing authority via `PricingService` + `IdentityContext`
- No client-side canonical pricing mutations introduced

## 8. Consequences

- `fw_price_master` pricing semantics can be migrated to canonical Pricing without schema changes
- COGS data remains in legacy/adapter layer
- Multi-mode pricing is represented via multiple rate items, not multiple tables
- Selection ambiguity is resolved by caller-specified `chargeBasis`

## 9. Future Revisit Conditions

Revisit if:
- New pricing modes emerge that cannot be represented via `charge_basis`
- `min_charge` semantics change
- ADR-086 introduces canonical COGS domain requiring integration

---

**END OF ADR-088**
