# SENTRALOGIS — PHASE 5C
# ADR-088 REVISION, ADR-083 AMENDMENT, AND ADR-084 OWNERSHIP REVIEW

**Date:** 2026-09-06
**Status:** YELLOW — PROPOSALS REQUIRE REVISION
**Phase:** Phase 5C — Architecture Review / Ratification Preparation
**Mode:** DISCOVERY ONLY
**Scope:** NO PRODUCTION CHANGES

---

## 1. Executive Decision

**YELLOW — PROPOSALS REQUIRE REVISION**

The architecture package is directionally correct but requires bounded corrections before ratification:

- **ADR-088** is ratifiable after removing COGS scope and correcting `sell_min_cbm` mapping
- **ADR-089** is rejected — `pricing_type` is billing frequency, not a pricing concept
- **ADR-083** requires amendments before implementation can resume
- **`md_billing_rates`** does NOT belong in ADR-084; it requires a new Warehouse Billing ADR or remains operational master data

---

## 2. Authorization

Exact authorization string recorded:

> I AUTHORIZE SENTRALOGIS PHASE 5C ADR-088 REVISION, ADR-083 AMENDMENT, AND ADR-084 OWNERSHIP REVIEW ONLY.

Scope honored:
- ADR-088 revision: YES
- ADR-089 closure: YES
- ADR-083 amendment: YES
- `md_billing_rates` ownership review: YES
- Production implementation: NO
- Schema changes: NO
- Data migration: NO
- ADR ratification: NO

---

## 3. Evidence Baseline

### Canonical Pricing Model (ADR-057..066)

| Entity | Fields | Purpose |
|--------|--------|---------|
| `pricing_rates` | `id`, `tenant_id`, `rate_code`, `capability_type`, `rate_description`, `status` | Rate master identity |
| `pricing_rate_versions` | `id`, `rate_id`, `tenant_id`, `version_no`, `effective_from`, `effective_to`, `status` | Versioned definition |
| `pricing_rate_items` | `id`, `rate_version_id`, `tenant_id`, `side`, `charge_basis`, `unit_of_measure`, `currency`, `unit_rate`, `min_charge`, `max_charge`, `applicability_conditions` | Charge definition |

### Key Canonical Concepts
- `charge_basis`: Calculation method (PER_CONTAINER, PER_CBM, PER_KG, etc.)
- `unit_rate`: Monetary rate per unit
- `min_charge`/`max_charge`: Monetary bounds on calculated amount
- `applicability_conditions`: JSONB for customer, route, service constraints

### Verified Canonical Calculation Behavior

`lib/pricing/calculation.ts` lines 105-114:
```typescript
if (input.minCharge !== null && input.minCharge > 0 && workingAmount < input.minCharge) {
  minApplied = true;
  workingAmount = input.minCharge;
}
```

**Confirmed:** `min_charge` is applied as `max(calculated_amount, min_charge)`. This is exactly the behavior required for `sell_min_cbm`.

### Verified Selection Behavior

`lib/pricing/selection.ts` lines 153-164:
```typescript
function computeSpecificityScore(ctx: PricingContext, item: PricingRateItem): number {
  let score = 0;
  const conditions = item.applicabilityConditions || {};
  if (ctx.customerId && conditions.customer_id === ctx.customerId) score += 100;
  if (ctx.origin && conditions.origin === ctx.origin) score += 50;
  if (ctx.destination && conditions.destination === ctx.destination) score += 50;
  if (ctx.containerType && conditions.container_type === ctx.containerType) score += 25;
  if (ctx.serviceType && conditions.service_type === ctx.serviceType) score += 25;
  if (ctx.chargeBasis && item.chargeBasis === ctx.chargeBasis) score += 10;
  return score;
}
```

**Confirmed:** Multiple rate items with different `charge_basis` values can coexist under one rate version. When `ctx.chargeBasis` is specified, the matching item gets higher specificity (+10). When not specified, items have equal specificity and selection may be ambiguous — this is correct behavior; the caller should specify the desired charge basis.

### ADR-084 Scope (Existing)

| Entity | Authority |
|--------|-----------|
| Billable event | `fin_billable_events` |
| Invoice | `fin_invoices` |
| Invoice line | `fin_invoice_lines` |
| AR/AP | `fin_ar_ap` |
| Adjustment | `fin_adjustments` |
| Legacy | `invoices` / `invoice_lines` (to be decommissioned) |

**Note:** ADR-084 does NOT mention `md_billing_rates`. Its scope is the canonical `fin_*` chain activation.

### ADR-086 Scope (Existing)

| Concept | Authority |
|---------|-----------|
| Margin | `sales_order_line_items.price_snapshot` |
| COGS | `sales_order_line_items.price_snapshot` |
| Legacy COGS | Derived projection from canonical snapshot |

**Note:** ADR-086 explicitly states "Legacy COGS columns are phased out via ADR-083."

---

## 4. ADR-088 — Revised Decision

### Status: RATIFY-READY (with revisions)

### 4.1 Problem Statement (Revised)

`fw_price_master` contains multiple sell price columns that represent different pricing modes for the same route:
- `sell_price`: Base sell price per container/unit (FCL)
- `sell_per_cbm`: Alternative sell price per cubic meter (LCL)
- `sell_min_cbm`: Minimum charge for LCL shipments

The canonical Pricing model (`pricing_rate_items`) supports multiple rate items per rate version, each with distinct `charge_basis` values. However, the original ADR-088 proposal incorrectly suggested creating a new `MIN_CHARGE` charge basis.

### 4.2 Correct Semantic Mapping

| Legacy Column | Canonical Representation | Notes |
|---------------|--------------------------|-------|
| `sell_price` | `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CONTAINER'` | Direct mapping |
| `sell_per_cbm` | `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CBM'` | Separate rate item under same rate version |
| `sell_min_cbm` | `pricing_rate_items.min_charge` on the PER_CBM rate item | **NOT a separate charge basis** |

### 4.3 Multi-Mode Representation

A single `fw_price_master` row maps to ONE canonical rate with multiple rate items:

```text
Canonical Rate: FWD-OCEAN-JKT-LAX
├── Rate Version 1
│   ├── Rate Item A: charge_basis='PER_CONTAINER', unit_rate=1,500,000
│   └── Rate Item B: charge_basis='PER_CBM', unit_rate=500,000, min_charge=1,000,000
```

Selection behavior:
- Caller specifies `chargeBasis` in `PricingContext`
- Selection engine gives +10 specificity to matching `charge_basis`
- If caller doesn't specify, both items are equally eligible → ambiguity (correct behavior)

### 4.4 COGS Exclusion

The following `fw_price_master` columns are **EXCLUDED** from ADR-088 scope:
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

These are cost/margin concepts governed by ADR-086, not pricing concepts.

### 4.5 ADR-088 Revised Text

**Section 2 — Decision (REPLACE):**

> **Multi-mode pricing is representable via multiple canonical rate items with distinct `charge_basis` values.**
>
> A single legacy `fw_price_master` row maps to one canonical `pricing_rates` record with multiple `pricing_rate_items`, each with a different `charge_basis`:
> - `sell_price` → `unit_rate` with `charge_basis = 'PER_CONTAINER'`
> - `sell_per_cbm` → `unit_rate` with `charge_basis = 'PER_CBM'`
> - `sell_min_cbm` → `min_charge` on the PER_CBM rate item
>
> No new canonical concepts are required. The existing `min_charge` field correctly implements minimum charge semantics.

**Section 2.2 — Non-Boundary (ADD):**

> COGS and cost data are out of scope for canonical Pricing. `fw_price_master` COGS columns (`cogs_*`, `master_cost_*`) are governed by ADR-086 and must not be migrated into `pricing_rate_items`.

---

## 5. `sell_price` Semantics

### Finding

`sell_price` is the primary sell price per container/unit for FCL service.

### Canonical Equivalent

`pricing_rate_items.unit_rate` with `charge_basis = 'PER_CONTAINER'`

### Assessment

**FULLY SUPPORTED.** No canonical extension required.

### Migration Mapping

| Legacy | Canonical |
|--------|-----------|
| `fw_price_master.sell_price` | `pricing_rate_items.unit_rate` |
| `fw_price_master.service_type` (FCL) | `pricing_rate_items.charge_basis = 'PER_CONTAINER'` |
| `fw_price_master.container_type` | `pricing_rate_items.applicability_conditions.container_type` |
| `fw_price_master.origin_port` | `pricing_rate_items.applicability_conditions.origin` |
| `fw_price_master.destination_port` | `pricing_rate_items.applicability_conditions.destination` |

---

## 6. `sell_per_cbm` Semantics

### Finding

`sell_per_cbm` is the alternative sell price per cubic meter for LCL service.

### Canonical Equivalent

`pricing_rate_items.unit_rate` with `charge_basis = 'PER_CBM'`

### Assessment

**FULLY SUPPORTED.** No canonical extension required.

### Migration Mapping

| Legacy | Canonical |
|--------|-----------|
| `fw_price_master.sell_per_cbm` | `pricing_rate_items.unit_rate` |
| `fw_price_master.service_type` (LCL) | `pricing_rate_items.charge_basis = 'PER_CBM'` |
| Route/container conditions | Same `applicability_conditions` as PER_CONTAINER item |

### Critical Distinction

`PER_CONTAINER` and `PER_CBM` are different calculation bases, NOT different pricing modes. They can coexist under the same rate version because the caller specifies which basis to use via `PricingContext.chargeBasis`.

---

## 7. `sell_min_cbm` Semantics

### Finding

`sell_min_cbm` is a minimum charge applied to PER_CBM calculations when actual CBM is below the minimum.

### Canonical Equivalent

`pricing_rate_items.min_charge` on the PER_CBM rate item.

### Verified Canonical Behavior

`lib/pricing/calculation.ts` lines 105-114:
```typescript
if (input.minCharge !== null && input.minCharge > 0 && workingAmount < input.minCharge) {
  minApplied = true;
  workingAmount = input.minCharge;
}
```

This implements: `final_amount = max(quantity × unit_rate, min_charge)`

### Assessment

**FULLY SUPPORTED.** No canonical extension required.

### Migration Mapping

| Legacy | Canonical |
|--------|-----------|
| `fw_price_master.sell_min_cbm` | `pricing_rate_items.min_charge` |
| Applied to | PER_CBM rate item only |

### Conclusion

`sell_min_cbm` MUST NOT become `charge_basis = 'MIN_CHARGE'`. It is a bound on the calculated amount, not a calculation basis.

---

## 8. COGS Ownership Boundary

### Finding

COGS data in `fw_price_master` does NOT belong in canonical Pricing.

### Governing ADR

ADR-086 explicitly states:
> "Margin and COGS are canonicalized at the SO line item level as part of the `price_snapshot` JSONB."

And:
> "Legacy COGS columns are phased out via ADR-083."

### Boundary

| Concept | Owner | Representation |
|---------|-------|----------------|
| Sell price (`sell_price`, `sell_per_cbm`) | Canonical Pricing (`pricing_rate_items`) | `unit_rate` + `charge_basis` |
| Minimum charge (`sell_min_cbm`) | Canonical Pricing (`pricing_rate_items`) | `min_charge` |
| COGS (`cogs_*` columns) | ADR-086 → `sales_order_line_items.price_snapshot` | JSONB in SO line item |
| Profit calculation | Adapter layer | Combines canonical price + COGS |

### Adapter Pattern

During transition, COGS data can be preserved via adapter:
```text
Canonical Pricing Rate (sell price)
    ↓
Adapter: join with legacy fw_price_master COGS columns
    ↓
Legacy profit calculation (forwardingActions.ts)
```

This preserves existing behavior without polluting canonical Pricing.

---

## 9. ADR-089 — Closure Decision

### Status: REJECT

### Reason

`pricing_type` (ONE_TIME, RECURRING_MONTHLY, PER_ACTIVITY) is NOT a pricing concept.

### Critical Distinction

| Concept | Definition | Example | Owner |
|---------|-----------|---------|-------|
| `charge_basis` | How quantity is calculated | PER_CONTAINER, PER_CBM, PER_TRIP | Pricing |
| `unit_of_measure` | Measurement unit | Container, CBM, KG, Trip | Pricing |
| `unit_rate` | Monetary rate per unit | 1,500,000 IDR/container | Pricing |
| `min_charge` | Minimum monetary charge | 1,000,000 IDR | Pricing |
| `pricing_type` | **When/how often to charge** | ONE_TIME, MONTHLY, PER_ACTIVITY | **Billing/Financial** |

### Runtime Evidence

Consumers of `pricing_type`:
- `commercial/rates/page.tsx` — display + filter only
- `commercial/quotations/[id]/page.tsx` — display only
- `portal/sales/quotations/[id]/page.tsx` — display only

**NO runtime calculation or billing logic uses `pricing_type`.**

The field is display metadata and future billing intent, not a pricing definition.

### Why It Does NOT Belong in Pricing

1. **Different lifecycle:** Pricing rates are defined and versioned. Billing frequency is a commercial/contractual agreement.
2. **Different authorization:** Pricing is managed by commercial team. Billing rules are managed by finance/billing team.
3. **Different consumer:** Pricing feeds quotations and operational execution. Billing frequency feeds invoicing and settlement.
4. **No calculation impact:** `pricing_type` does not affect price calculation.

### Disposition

**REJECT** the current ADR-089 proposal.

If billing frequency representation is needed in the future, it belongs in:
- ADR-084 (Financial Settlement) scope, OR
- A new Billing Frequency ADR

NOT in canonical `pricing_rate_items`.

---

## 10. Customer / Route Applicability

### Customer-Specific Pricing

**FULLY SUPPORTED in canonical Pricing.**

| Legacy Field | Canonical Equivalent | Assessment |
|--------------|----------------------|------------|
| `customer_id` | `applicability_conditions.customer_id` | FULLY SUPPORTED |
| `unit_price` | `pricing_rate_items.unit_rate` | FULLY SUPPORTED |
| `uom` | `pricing_rate_items.unit_of_measure` | FULLY SUPPORTED |
| `min_qty` | `applicability_conditions.min_qty` | SUPPORTED via JSONB |

### Route Semantics

**FULLY SUPPORTED as applicability conditions.**

| Legacy Field | Canonical Equivalent | Assessment |
|--------------|----------------------|------------|
| `route_origin` | `applicability_conditions.origin` | FULLY SUPPORTED |
| `route_destination` | `applicability_conditions.destination` | FULLY SUPPORTED |

### Conclusion

No canonical extensions required for customer-specific pricing or route constraints.

---

## 11. `md_billing_rates` Ownership Analysis

### Finding

`md_billing_rates` does NOT belong in canonical Pricing AND does NOT naturally belong in ADR-084.

### Evidence

| Dimension | Finding | Rationale |
|-----------|---------|-----------|
| **Scope** | Contract-scoped | Tied to `contract_id`, not tenant-scoped like canonical rates |
| **Scoping** | Warehouse-scoped | Tied to `warehouse_id`, not capability-scoped |
| **Consumer** | Billing/Contract | Read by billing UI, written by contract creation |
| **Lifecycle** | Contract-bound | Rates live/die with contract |
| **Semantic** | Operational tariff | Warehouse storage charges, not commercial sell prices |
| **ADR-084 fit** | POOR | ADR-084 is about `fin_*` chain activation, not warehouse rate master data |

### Why NOT ADR-084

ADR-084 scope (from existing ADR):
> "Canonical financial settlement domain (`lib/financial/`) is fully implemented with RLS, idempotency, and service layer. `fin_billable_events`, `fin_invoices`, `fin_invoice_lines`, `fin_ar_ap`, and `fin_adjustments` tables exist."

ADR-084 is about:
1. Activating the `fin_*` chain
2. Replacing legacy `invoices` table
3. Commercially-gated financial settlement

`md_billing_rates` is:
1. NOT part of the `fin_*` chain
2. A warehouse contract rate master, not a settlement table
3. Not mentioned in ADR-084 scope

### Recommended Ownership

**NEW Warehouse Billing ADR** or **operational master data retention.**

Rationale:
1. `md_billing_rates` is warehouse-specific operational tariff data
2. It belongs to the warehouse domain, not commercial pricing
3. It belongs to the warehouse domain, not financial settlement
4. No canonical equivalent exists in current architecture
5. Creating a forced fit into Pricing or Settlement would be architecturally incorrect

### Action Required

1. **Remove `md_billing_rates` from ADR-083 scope** — it is not a pricing decommissioning candidate
2. **Do NOT assign `md_billing_rates` to ADR-084** — it doesn't fit ADR-084's scope
3. **Create new Warehouse Billing ADR** OR retain as operational master data
4. **Do NOT attempt to migrate `md_billing_rates` to canonical Pricing**

---

## 12. ADR-084 Ownership Decision

### Classification: E — Further discovery required (for `md_billing_rates`)

### Current ADR-084 Scope

ADR-084 owns:
- `fin_billable_events`
- `fin_invoices`
- `fin_invoice_lines`
- `fin_ar_ap`
- `fin_adjustments`
- Legacy `invoices` / `invoice_lines` decommissioning

### `md_billing_rates` Relationship to ADR-084

| ADR-084 Concept | `md_billing_rates` Equivalent | Alignment |
|-----------------|-------------------------------|-----------|
| Billable event creation | Contract rate triggers billing | WEAK |
| Invoice generation | Rates feed invoice lines | PARTIAL |
| AR/AP posting | Contract-based charges | WEAK |
| Financial posting | Warehouse billing | WEAK |

### Recommendation

**ADR-084 should NOT own `md_billing_rates`.**

Instead:
1. Create a new Warehouse Billing ADR to own `md_billing_rates`
2. OR retain `md_billing_rates` as operational master data with no canonical replacement
3. ADR-084 remains focused on `fin_*` chain activation and legacy `invoices` replacement

---

## 13. ADR-083 Amendment Analysis

### Required Amendments

#### Amendment A — Remove `md_billing_rates` from Scope

**Classification:** REQUIRED

| Current ADR-083 Text | Recommended Change |
|---------------------|-------------------|
| Lists `md_billing_rates` as legacy pricing structure to decommission | REMOVE from list; add note: "Owned by separate Warehouse Billing architecture" |

#### Amendment B — Preserve `crm_quotation_items` under ADR-081

**Classification:** REQUIRED

| Current ADR-083 Text | Recommended Change |
|---------------------|-------------------|
| Lists `crm_quotation_items.nego_price` as legacy pricing | ADD: "Preserved per ADR-081 — not subject to decommissioning while ADR-081 depends on it" |

#### Amendment C — Preserve `fw_container_items.sell_price_snapshot` as Historical Evidence

**Classification:** REQUIRED

| Current ADR-083 Text | Recommended Change |
|---------------------|-------------------|
| Lists `fw_container_items.sell_price_snapshot` as legacy pricing | ADD: "Historical evidence — not subject to decommissioning" |

#### Amendment D — COGS Exclusion

**Classification:** REQUIRED

| Proposed Text | Rationale |
|--------------|-----------|
| "COGS and cost data are out of scope for canonical Pricing decommissioning. COGS migration is governed by ADR-086." | Prevents scope creep into cost domain |

#### Amendment E — Semantic Equivalence Requirement

**Classification:** RECOMMENDED

| Proposed Text | Rationale |
|--------------|-----------|
| "No legacy pricing structure may be decommissioned until semantic equivalence is proven via dry-run migration and test validation." | Prevents data loss |

#### Amendment F — Migration Validation Requirement

**Classification:** RECOMMENDED

| Proposed Text | Rationale |
|--------------|-----------|
| "All migration functions must execute dry-run validation against production data, with semantic comparison and rollback strategy, before any write migration is authorized." | Ensures migration completeness |

#### Amendment G — UI / Compatibility Bridge Requirement

**Classification:** RECOMMENDED

| Proposed Text | Rationale |
|--------------|-----------|
| "Legacy administration interfaces may only be decommissioned after canonical replacement UI is proven operational or a server-side compatibility bridge is implemented." | Prevents operational disruption |

---

## 14. Canonical Pricing UI Decision

### Assessment

**Canonical pricing is operationally unusable without a management UI.**

### Options

| Option | Description | Feasibility | Recommendation |
|--------|-------------|-------------|----------------|
| **A. Dedicated canonical pricing UI** | Build new admin interface for canonical rates | HIGH effort, LONG timeline | NOT REQUIRED for ADR-083 resumption |
| **B. Temporary compatibility adapter** | Legacy UIs write through canonical server actions | MEDIUM effort, SHORT timeline | RECOMMENDED interim solution |
| **C. Legacy UI writing through canonical service** | Legacy UIs call canonical server actions | MEDIUM effort, MEDIUM timeline | VIABLE alternative |
| **D. Retain legacy UIs temporarily** | Keep legacy admin interfaces without architectural conflict | LOW effort, NO timeline | ACCEPTABLE for now |

### Recommendation

**Option B — Temporary compatibility adapter**

Rationale:
1. Fastest path to eliminating browser-direct mutations
2. Preserves existing UI workflows
3. Enforces server-side authorization and tenant isolation
4. Allows incremental migration to canonical UI later

### Implementation Note

This is OUT OF SCOPE for current architecture review. It would be a separate implementation task.

---

## 15. Migration Readiness

### Current State

| Migration Function | Status | Semantic Completeness | Test Coverage | Production Ready? |
|-------------------|--------|----------------------|---------------|-------------------|
| `migrateFwPriceMaster` | Scaffolding only | 30% (loses COGS, multi-mode incomplete) | None | NO |
| `migrateCrmSbuCustomerRates` | Scaffolding only | 60% (loses pricing_type) | None | NO |
| `migrateMdBillingRates` | Scaffolding only | 40% (loses warehouse_id) | None | NO — wrong domain |

### Minimum Requirements Before Execution

| Requirement | `fw_price_master` | `crm_sbu_customer_rates` |
|-------------|-------------------|--------------------------|
| Multi-mode pricing support | YES (multiple rate items) | NO |
| Preserve COGS (adapter) | YES | NO |
| Add pricing_type mapping | NO | NO (rejected) |
| Unit tests | YES | YES |
| Dry-run validation | YES | YES |
| Rollback strategy | YES | YES |
| Production authorization | YES | YES |

### Classification

| Function | Readiness | Blocker |
|----------|-----------|---------|
| `migrateFwPriceMaster` | NOT READY | Multi-mode pricing extension, COGS adapter, tests, dry-run |
| `migrateCrmSbuCustomerRates` | NOT READY | pricing_type rejection decision, tests, dry-run |
| `migrateMdBillingRates` | ARCHITECTURALLY BLOCKED | Wrong domain — must not be in ADR-083 |

---

## 16. Security Review

**NO NEW SECURITY ISSUES IDENTIFIED.**

### Tenant Isolation
- All legacy tables have existing RLS policies
- Canonical pricing tables have RLS policies
- No cross-tenant leakage paths identified

### Authorization
- Legacy browser-direct mutations are pre-existing risks:
  - `fw_price_master` in `AddForwardingItemModal.tsx` — MEDIUM risk
  - `crm_sbu_customer_rates` in `commercial/rates/page.tsx` — HIGH risk
  - `md_billing_rates` in `ContractWizard.tsx` — MEDIUM risk
- These are NOT introduced by ADR-083 and should be addressed separately

### Server-Side Authority
- Canonical pricing enforces server-side authority via `PricingService` + `IdentityContext`
- No client-side canonical pricing mutations exist
- Adapter patterns preserve server-side authority

---

## 17. Decision Matrix

| Question | Finding | Decision | Confidence | ADR Impact |
|----------|---------|----------|------------|-----------|
| Multi-mode pricing | Multiple `charge_basis` values represent different calculation modes | **B** — Bounded canonical extension (multiple rate items) | HIGH | ADR-088 (revised) |
| `sell_min_cbm` semantics | Minimum monetary charge on PER_CBM calculation | **A** — Canonical Pricing already supports via `min_charge` | HIGH | ADR-088 (revised) |
| COGS ownership | Cost domain, not pricing domain (governed by ADR-086) | **D** — Another domain owns (ADR-086) | HIGH | ADR-088 (revised) |
| ADR-089 (`pricing_type`) | Billing frequency, not pricing concept | **REJECT** — Not a pricing ADR | HIGH | ADR-089 closure |
| `pricing_type` ownership | Billing/financial settlement concept | **D** — Another domain owns (future billing ADR) | HIGH | Future work |
| Customer-specific rate | `customer_id` in `applicability_conditions` | **A** — Canonical Pricing already supports | HIGH | None |
| Route semantics | `origin`/`destination` in `applicability_conditions` | **A** — Canonical Pricing already supports | HIGH | None |
| `md_billing_rates` ownership | Contract-scoped warehouse billing, NOT financial settlement | **D** — Another domain owns (new Warehouse Billing ADR) | HIGH | ADR-083 amendment |
| Canonical UI | No canonical pricing management UI exists | **B** — Temporary compatibility adapter | MEDIUM | Separate task |
| Migration readiness | Functions incomplete, untested, unexecuted | NOT READY | HIGH | Separate implementation phase |

---

## 18. ADR Recommendation Matrix

| ADR / Amendment | Recommendation | Required Action |
|-----------------|---------------|-----------------|
| ADR-088 (revised) | **RATIFY-READY** | Remove COGS scope; correct `sell_min_cbm` mapping; add ADR-086 exclusion |
| ADR-089 (current) | **REJECT** | `pricing_type` is billing frequency, not pricing concept |
| ADR-083 Amendment A | **REQUIRED** | Remove `md_billing_rates` from scope |
| ADR-083 Amendment B | **REQUIRED** | Explicitly preserve `crm_quotation_items` under ADR-081 |
| ADR-083 Amendment C | **REQUIRED** | Explicitly preserve `fw_container_items.sell_price_snapshot` |
| ADR-083 Amendment D | **REQUIRED** | Explicitly exclude COGS from canonical Pricing decommissioning |
| ADR-083 Amendment E | **RECOMMENDED** | Require semantic-equivalence proof |
| ADR-083 Amendment F | **RECOMMENDED** | Require migration dry-run validation |
| ADR-083 Amendment G | **RECOMMENDED** | Require canonical UI or compatibility bridge |
| ADR-084 clarification | **NOT REQUIRED** | `md_billing_rates` does not belong in ADR-084 |
| New Warehouse Billing ADR | **REQUIRED** | For `md_billing_rates` ownership |

---

## 19. Required Next Steps

### Before ADR-088 Ratification

1. Revise ADR-088 proposal to:
   - Remove COGS from scope
   - Correct `sell_min_cbm` mapping to existing `min_charge`
   - Focus on multi-mode rate representation via `charge_basis`
   - Add explicit ADR-086 exclusion for COGS

### Before ADR-083 Can Resume

1. Amend ADR-083 with required amendments (A, B, C, D)
2. Add recommended amendments (E, F, G)
3. Remove `md_billing_rates` from scope
4. Create new Warehouse Billing ADR for `md_billing_rates` OR retain as operational master data
5. Extend `migrateFwPriceMaster` with multi-mode pricing support
6. Add migration tests
7. Execute dry-run validation
8. Build canonical pricing UI or adapter bridge

### Sequence

```text
1. ADR-088 ratification (revised)
2. ADR-083 amendment (remove md_billing_rates, add preconditions)
3. New Warehouse Billing ADR (for md_billing_rates) OR retain as-is
4. ADR-083 implementation Wave 2 (fw_price_master pricing only, with COGS adapter)
5. ADR-083 implementation Wave 3 (crm_sbu_customer_rates pricing only)
```

### What CANNOT Proceed

- ADR-089 in current or revised form (rejected)
- `md_billing_rates` decommissioning (wrong domain)
- COGS migration into canonical Pricing (governed by ADR-086)
- Any legacy decommissioning without canonical replacement proven
- `migrateMdBillingRates` execution (architecturally blocked)

---

## 20. Out-of-Scope Confirmation

This review explicitly did NOT:
- modify production code
- modify database schema
- create migrations
- execute migrations
- migrate data
- delete legacy tables
- remove legacy writers
- remove legacy readers
- ratify any ADR
- implement ADR-088
- implement ADR-089
- amend ADR-083
- implement ADR-084
- implement ADR-086
- build canonical pricing UI
- modify `crm_quotation_items`
- modify `fw_container_items.sell_price_snapshot`
- touch Phase 5A
- touch Phase 5B
- touch Phase 5D
- touch DATA-4E
- touch D-Repair

---

## 21. Final Gate

**YELLOW — PROPOSALS REQUIRE REVISION**

### Summary

| ADR / Item | Status | Required Action |
|------------|--------|-----------------|
| ADR-088 (revised) | RATIFY-READY | Remove COGS, correct `sell_min_cbm`, add ADR-086 exclusion |
| ADR-089 | REJECTED | `pricing_type` is billing frequency, not pricing concept |
| ADR-083 amendment | REQUIRES REVISION | Remove `md_billing_rates`; preserve ADR-081/082 structures; add preconditions |
| `md_billing_rates` ownership | REQUIRES NEW ADR | New Warehouse Billing ADR, NOT ADR-084 |
| Migration functions | NOT READY | Extend `migrateFwPriceMaster`; reject `migrateMdBillingRates` from ADR-083 |

### Blockers Remaining

1. ADR-088 must be formally revised before ratification
2. ADR-089 must be formally rejected/closed
3. ADR-083 must be formally amended
4. New Warehouse Billing ADR must be created for `md_billing_rates`
5. Migration functions must be extended and tested
6. Canonical pricing UI or adapter bridge must be built

### What CAN Proceed After Ratification

- ADR-088 (revised) — Multi-mode pricing representation via `charge_basis`
- ADR-083 amendment — With `md_billing_rates` removed
- `fw_price_master` pricing migration — After ADR-088 ratification and migration extension
- `crm_sbu_customer_rates` pricing migration — After ADR-088 ratification and migration extension

---

**ARCHITECTURE REVIEW COMPLETE — RATIFICATION AND IMPLEMENTATION NOT AUTHORIZED.**

---

**END OF ADR-088 REVISION, ADR-083 AMENDMENT, AND ADR-084 OWNERSHIP REVIEW**
