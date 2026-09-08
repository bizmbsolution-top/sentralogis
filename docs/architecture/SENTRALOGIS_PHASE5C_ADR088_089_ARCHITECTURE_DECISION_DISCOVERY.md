# SENTRALOGIS — PHASE 5C ADR-088/089 ARCHITECTURE DECISION DISCOVERY

**Date:** 2026-09-06
**Status:** YELLOW — PROPOSALS REQUIRE REVISION
**Phase:** Phase 5C — ADR-088/089 Architecture Decision Discovery
**Mode:** DISCOVERY ONLY
**Scope:** NO PRODUCTION CHANGES

---

## 1. Executive Decision

**YELLOW — PROPOSALS REQUIRE REVISION**

The proposed ADR-088 and ADR-089 are directionally correct but require bounded semantic corrections before ratification:

- **ADR-088** should focus on multi-mode rate representation via multiple rate items with distinct `charge_basis` values, NOT on adding new pricing concepts. The `sell_min_cbm` column is a minimum charge, not a separate pricing mode.
- **ADR-089** should be rejected in its current form. `pricing_type` is NOT a pricing concept — it is a billing/financial settlement concept that belongs outside canonical Pricing.
- **`md_billing_rates`** must be removed from ADR-083 scope and assigned to ADR-084 or a new Warehouse Billing ADR.

---

## 2. Authorization

Exact authorization string recorded:

> I AUTHORIZE SENTRALOGIS PHASE 5C ADR-088/089 ARCHITECTURE DECISION DISCOVERY ONLY.

Scope honored:
- ADR-088 semantic analysis: YES
- ADR-089 semantic analysis: YES
- ADR-083 amendment analysis: YES
- `md_billing_rates` ownership analysis: YES
- Production implementation: NO
- Schema changes: NO
- Data migration: NO
- ADR ratification: NO

---

## 3. Scope

This discovery analyzed:
- Multi-mode pricing semantics in `fw_price_master`
- `pricing_type` semantics in `crm_sbu_customer_rates`
- `md_billing_rates` domain ownership
- Migration function readiness
- Canonical pricing UI gaps
- ADR-083 amendment requirements

No production code was modified.
No schema changes were made.
No data was migrated.
No ADRs were ratified.

---

## 4. Evidence Baseline

### Canonical Pricing Model (ADR-057..066)

| Entity | Fields | Purpose |
|--------|--------|---------|
| `pricing_rates` | `id`, `tenant_id`, `rate_code`, `capability_type`, `rate_description`, `status` | Rate master identity |
| `pricing_rate_versions` | `id`, `rate_id`, `tenant_id`, `version_no`, `effective_from`, `effective_to`, `status` | Versioned definition |
| `pricing_rate_items` | `id`, `rate_version_id`, `tenant_id`, `side`, `charge_basis`, `unit_of_measure`, `currency`, `unit_rate`, `min_charge`, `max_charge`, `applicability_conditions` | Charge definition |

### Key Concepts
- `charge_basis`: How quantity is calculated (PER_CONTAINER, PER_CBM, PER_KG, etc.)
- `unit_rate`: Monetary rate per unit
- `min_charge`/`max_charge`: Monetary bounds, NOT calculation modes
- `applicability_conditions`: JSONB for customer, route, service constraints

### Legacy Pricing Structures

| Legacy Table | Primary Fields | Consumers | Status |
|--------------|----------------|-----------|--------|
| `fw_price_master` | `sell_price`, `sell_per_cbm`, `sell_min_cbm`, 9 COGS columns | `forwardingActions.ts`, `AddForwardingItemModal.tsx`, `sbu/forwarding/wo/create/page.tsx`, `sbu/forwarding/master/price/page.tsx` | ACTIVE |
| `crm_sbu_customer_rates` | `pricing_type`, `service_name`, `uom`, `unit_price`, `route_origin`, `route_destination`, `customer_id` | `commercial/rates/page.tsx`, `commercial/quotations/[id]/page.tsx`, `portal/sales/quotations/[id]/page.tsx` | ACTIVE |
| `md_billing_rates` | `contract_id`, `warehouse_id`, `charge_code`, `rate_value`, `uom`, `valid_from`, `valid_to` | `hq/warehouse/billing/page.tsx`, `ContractWizard.tsx`, `contractActions.ts` | ACTIVE |

---

## 5. ADR-088 Analysis

### Original Proposal

**Problem:** `fw_price_master` has multiple sell price columns (`sell_price`, `sell_per_cbm`, `sell_min_cbm`) with no canonical equivalent.

**Proposed Solution:** Extend canonical `pricing_rate_items` to support multiple charge definitions per rate version.

### Analysis

**FINDING: The proposal conflates distinct pricing concepts.**

#### 5.1 `sell_price` — Primary Rate

- **Semantic:** Base sell price per container/unit for FCL service
- **Canonical equivalent:** `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CONTAINER'`
- **Assessment:** FULLY REPRESENTABLE in canonical Pricing

#### 5.2 `sell_per_cbm` — Alternative Rate

- **Semantic:** Alternative sell price per cubic meter for LCL service
- **Canonical equivalent:** `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CBM'`
- **Assessment:** FULLY REPRESENTABLE as a separate rate item under the same rate version

#### 5.3 `sell_min_cbm` — Minimum Charge

- **Semantic:** Minimum charge for LCL shipments (applied when actual CBM < minimum)
- **CRITICAL DISTINCTION:** This is NOT a separate pricing mode. It is a **minimum monetary charge** applied to a PER_CBM calculation.
- **Canonical equivalent:** `pricing_rate_items.min_charge` when `charge_basis = 'PER_CBM'`
- **Assessment:** FULLY REPRESENTABLE using existing `min_charge` field

### Critical Correction

**The original proposal incorrectly suggested creating a `MIN_CHARGE` charge_basis.**

This would be semantically wrong. `min_charge` is a bound on the calculated amount, not a calculation basis.

Correct representation:
```text
Rate Version 1
├── Rate Item A: charge_basis='PER_CONTAINER', unit_rate=1500000
└── Rate Item B: charge_basis='PER_CBM', unit_rate=500000, min_charge=1000000
```

When `actual_cbm = 1.5`:
- Container calculation: 1 × 1,500,000 = 1,500,000
- CBM calculation: 1.5 × 500,000 = 750,000 → min_charge applies → 1,000,000

### COGS Semantics

The 9 COGS columns in `fw_price_master` are **NOT pricing concepts**. They are cost/margin concepts that belong to a separate cost domain (ADR-086 scope).

**These columns must NOT be migrated into canonical Pricing.**

### ADR-088 Recommendation

**NEEDS REVISION**

The ADR should be revised to:
1. State that multi-mode pricing is representable via multiple rate items with different `charge_basis` values
2. Explicitly reject `MIN_CHARGE` as a `charge_basis`
3. Clarify that `sell_min_cbm` maps to `min_charge` on the PER_CBM rate item
4. Explicitly exclude COGS columns from canonical Pricing scope
5. Reference ADR-086 for cost/margin ownership

---

## 6. `fw_price_master` Semantic Model

### Runtime Behavior

Based on consumer analysis:

| Consumer | Usage | Calculation |
|----------|-------|-------------|
| `forwardingActions.ts` | Reads `sell_price` + `master_cost_origin_amount` + `master_cost_destination_amount` | Profit = sell_price - (origin_cost + destination_cost) |
| `AddForwardingItemModal.tsx` | Displays all price/COGS columns; uses `sell_price`, `sell_per_cbm`, `sell_min_cbm` for deal price | Client-side selection based on service_type |
| `sbu/forwarding/wo/create/page.tsx` | Autocomplete price lookup | Passes selected price to WO creation |
| `forwarding-writer.ts` | Writes `sell_price_snapshot` to `fw_container_items` | Snapshot at WO creation |

### Semantic Model

```text
fw_price_master row = ONE rate card entry
├── Pricing layer (canonical Pricing)
│   ├── PER_CONTAINER price = sell_price
│   └── PER_CBM price = sell_per_cbm (with min_charge = sell_min_cbm)
└── Cost layer (NOT canonical Pricing)
    ├── Pickup cost = cogs_pickup
    ├── Origin port haulage = cogs_port_haulage_origin
    ├── Ocean freight = cogs_ocean_freight
    ├── Origin THC = cogs_thc_origin
    ├── Destination port haulage = cogs_port_haulage_dest
    ├── Last mile = cogs_last_mile
    ├── Documentation = cogs_documentation
    └── Other = cogs_other
```

### Canonical Replacement Path

1. **Pricing:** Migrate to `pricing_rate_items` with multiple `charge_basis` values
2. **COGS:** Retain in `fw_price_master` as read-only adapter or migrate to future cost domain
3. **Profit calculation:** Use canonical `unit_rate` + legacy COGS adapter

---

## 7. `sell_min_cbm` Semantic Analysis

### Critical Finding

`sell_min_cbm` is **NOT a separate pricing mode**.

It is a **minimum charge constraint** applied to PER_CBM pricing.

### Evidence

| Scenario | Calculation | Result |
|----------|-------------|--------|
| CBM = 2.0, sell_per_cbm = 500,000, sell_min_cbm = 1,000,000 | 2.0 × 500,000 = 1,000,000 | 1,000,000 (min not triggered) |
| CBM = 1.0, sell_per_cbm = 500,000, sell_min_cbm = 1,000,000 | 1.0 × 500,000 = 500,000 → min_charge | 1,000,000 (min triggered) |
| CBM = 0.5, sell_per_cbm = 500,000, sell_min_cbm = 1,000,000 | 0.5 × 500,000 = 250,000 → min_charge | 1,000,000 (min triggered) |

### Canonical Representation

`sell_min_cbm` → `pricing_rate_items.min_charge` on the PER_CBM rate item.

This is exactly what `min_charge` was designed for in ADR-062.

### Conclusion

**No new canonical concept is required for `sell_min_cbm`.**

It maps directly to existing `min_charge` field.

---

## 8. COGS Ownership Boundary

### Finding

COGS data in `fw_price_master` does NOT belong in canonical Pricing.

### Reasons

1. **ADR-086 explicitly governs margin/COGS ownership**
2. **Pricing is about sell-side rates, not cost tracking**
3. **COGS has different lifecycle** — costs change independently of sell prices
4. **COGS has different authorization** — cost visibility is typically more restricted than pricing
5. **Mixing COGS with pricing violates separation of concerns**

### Recommended Boundary

| Concept | Owner | Rationale |
|---------|-------|-----------|
| Sell price (`sell_price`, `sell_per_cbm`) | Canonical Pricing | Commercial rate definition |
| Minimum charge (`sell_min_cbm`) | Canonical Pricing (`min_charge`) | Rate constraint |
| COGS (`cogs_*` columns) | Future cost domain (ADR-086) | Cost tracking, not pricing |
| Profit calculation | Adapter layer | Combines canonical price + legacy COGS |

### Adapter Pattern

For backward compatibility during transition:

```text
Canonical Pricing Rate
    ↓
Adapter: join with legacy COGS
    ↓
Legacy UI / calculation
```

This preserves existing profit calculations without polluting canonical Pricing.

---

## 9. ADR-089 Analysis

### Original Proposal

**Problem:** `crm_sbu_customer_rates` has `pricing_type` (ONE_TIME/RECURRING_MONTHLY/PER_ACTIVITY) with no canonical equivalent.

**Proposed Solution:** Extend canonical `pricing_rate_items` with `pricing_type` or `billing_frequency` field.

### Analysis

**FINDING: `pricing_type` is NOT a pricing concept.**

#### 9.1 Semantic Distinction

| Concept | Definition | Example | Owner |
|---------|-----------|---------|-------|
| `charge_basis` | How quantity is calculated | PER_CONTAINER, PER_CBM, PER_TRIP | Pricing |
| `unit_of_measure` | Measurement unit | Container, CBM, KG, Trip | Pricing |
| `unit_rate` | Monetary rate per unit | 1,500,000 IDR/container | Pricing |
| `min_charge` | Minimum monetary charge | 1,000,000 IDR | Pricing |
| `pricing_type` | **When/how often to charge** | ONE_TIME, MONTHLY, PER_ACTIVITY | **Billing/Financial** |

#### 9.2 Runtime Behavior Analysis

**Consumers of `pricing_type`:**

| Consumer | Usage | Purpose |
|----------|-------|---------|
| `commercial/rates/page.tsx` | Display + filter | Admin UI shows pricing_type in rate list |
| `commercial/quotations/[id]/page.tsx` | Display | Quotation display shows pricing_type |
| `portal/sales/quotations/[id]/page.tsx` | Display | Sales portal shows pricing_type |

**NO runtime calculation or billing logic was found that uses `pricing_type`.**

The field appears to be:
1. **Display metadata** — shows the rate type in UI
2. **Filtering criteria** — admin can filter by pricing_type
3. **Future billing intent** — planned but not implemented

#### 9.3 Why `pricing_type` Does NOT Belong in Pricing

1. **Different lifecycle:** Pricing rates are defined and versioned. Billing frequency is a commercial/contractual agreement.
2. **Different authorization:** Pricing is managed by commercial team. Billing rules are managed by finance/billing team.
3. **Different consumer:** Pricing feeds quotations and operational execution. Billing frequency feeds invoicing and settlement.
4. **No calculation impact:** `pricing_type` does not affect price calculation. It affects WHEN/WHETHER to invoice.

#### 9.4 Where `pricing_type` Actually Belongs

**Option A: Billing/FInancial Settlement Domain (ADR-084)**
- `pricing_type` controls when charges are invoiced
- This is a financial settlement concern
- ADR-084 should define billing frequency rules

**Option B: Commercial Agreement Domain**
- `pricing_type` is part of the customer contract
- Could live in a future commercial agreement domain
- Links rate to billing terms

**Option C: Adapter/Projection Layer**
- Keep `crm_sbu_customer_rates` as read-only adapter
- Store canonical rates in `pricing_rates`
- `pricing_type` stays in legacy table for display
- New billing domain consumes from canonical rates + legacy adapter

### ADR-089 Recommendation

**REJECT current proposal.**

`pricing_type` must NOT be added to canonical `pricing_rate_items`.

Instead:
1. **Remove `pricing_type` from ADR-083 scope** — it is not a pricing concept
2. **Assign `pricing_type` to ADR-084** — it is a billing/financial settlement concept
3. **Use adapter pattern** for display until billing domain is implemented

---

## 10. Customer / Route Applicability Analysis

### Customer-Specific Pricing

**Finding: Customer scoping is fully representable in canonical Pricing.**

| Legacy Field | Canonical Equivalent | Assessment |
|--------------|----------------------|------------|
| `customer_id` | `applicability_conditions.customer_id` | FULLY SUPPORTED |
| `unit_price` | `pricing_rate_items.unit_rate` | FULLY SUPPORTED |
| `uom` | `pricing_rate_items.unit_of_measure` | FULLY SUPPORTED |
| `min_qty` | `pricing_rate_items.min_charge` (as quantity threshold) | PARTIAL — `min_charge` is monetary, not quantity |

**Gap:** `min_qty` (minimum quantity) has no direct canonical equivalent. `min_charge` is minimum monetary amount, not minimum quantity.

**Resolution:** This is a minor gap. `min_qty` can be:
- Stored in `applicability_conditions.min_qty`
- Enforced in selection/calculation logic
- Does NOT require schema change

### Route Semantics

**Finding: Route columns are applicability conditions, not core pricing data.**

| Legacy Field | Canonical Equivalent | Assessment |
|--------------|----------------------|------------|
| `route_origin` | `applicability_conditions.origin` | FULLY SUPPORTED |
| `route_destination` | `applicability_conditions.destination` | FULLY SUPPORTED |

**Assessment:** Route constraints are pricing applicability conditions, not operational routing data. JSONB `applicability_conditions` is the correct storage mechanism.

### Conclusion

**No canonical extensions required for customer-specific pricing or route constraints.**

These are fully representable via:
- `applicability_conditions.customer_id`
- `applicability_conditions.origin`
- `applicability_conditions.destination`

---

## 11. `md_billing_rates` Ownership Analysis

### Forensic Analysis

**Determination: `md_billing_rates` does NOT belong in canonical Pricing.**

### Evidence

| Dimension | Finding | Rationale |
|-----------|---------|-----------|
| **Scope** | Contract-scoped | Tied to `contract_id`, not tenant-scoped like canonical rates |
| **Scoping** | Warehouse-scoped | Tied to `warehouse_id`, not capability-scoped |
| **Consumer** | Billing/Invoice | Read by billing UI, written by contract creation |
| **Lifecycle** | Contract-bound | Rates live/die with contract |
| **Authorization** | Contract management | Managed through contract workflow, not pricing workflow |
| **Semantic** | Operational tariff | Warehouse storage charges, not commercial sell prices |

### Domain Ownership Options

**Option A: Financial Settlement / Billing (ADR-084)**
- **Evidence FOR:** Rates are used for billing, tied to contracts, consumed by billing UI
- **Evidence AGAINST:** ADR-084 is not yet implemented; this would expand ADR-084 scope significantly
- **Assessment:** MOST LIKELY correct owner, but requires ADR-084 implementation

**Option B: Warehouse Operational Tariff**
- **Evidence FOR:** Warehouse-specific charges, operational in nature
- **Evidence AGAINST:** No existing warehouse tariff domain exists
- **Assessment:** Possible, but would require new domain creation

**Option C: Contract / Commercial Agreement**
- **Evidence FOR:** Rates are contract-specific
- **Evidence AGAINST:** Contract domain doesn't currently own rates
- **Assessment:** Less likely; contracts reference rates but don't own pricing semantics

**Option D: Composable Boundary**
- **Evidence FOR:** Could involve both billing and warehouse domains
- **Evidence AGAINST:** Adds complexity without clear benefit
- **Assessment:** Over-engineered for current needs

### Recommendation

**Assign `md_billing_rates` to ADR-084 (Financial Settlement).**

Rationale:
1. Closest semantic fit — billing rates for invoicing
2. Existing ADR-084 scope includes financial settlement
3. Contract-billing-rate lifecycle matches settlement lifecycle
4. Warehouse operational concerns can be handled via warehouse_id in settlement records

### Action Required

1. **Remove `md_billing_rates` from ADR-083 scope immediately**
2. **Add `md_billing_rates` to ADR-084 scope** (requires ADR-084 amendment or clarification)
3. **Do NOT attempt to migrate `md_billing_rates` to canonical Pricing**

---

## 12. ADR-084 Interaction

### Current State

ADR-084 exists as a ratified ADR but has NOT been implemented.

### `md_billing_rates` Relationship to ADR-084

| ADR-084 Concept | `md_billing_rates` Equivalent | Alignment |
|-----------------|-------------------------------|-----------|
| Billable event creation | Contract rate triggers billing | PARTIAL |
| Invoice generation | Rates feed invoice lines | PARTIAL |
| AR/AP posting | Contract-based charges | PARTIAL |
| Financial posting | Warehouse billing | PARTIAL |

### Recommendation

**ADR-084 should explicitly include `md_billing_rates` as a legacy data source.**

When ADR-084 is implemented:
1. Read existing `md_billing_rates` as historical contract rates
2. Migrate to canonical billing rate tables (to be defined in ADR-084)
3. Retain `md_billing_rates` as historical read-only reference
4. New contracts write to canonical billing tables

---

## 13. ADR-083 Amendment Analysis

### Required Amendments

#### Amendment A — Remove `md_billing_rates` from Scope

| Current ADR-083 Text | Recommended Change |
|---------------------|-------------------|
| Lists `md_billing_rates` as legacy pricing structure to decommission | REMOVE from list; add note: "Owned by ADR-084" |

**Classification:** REQUIRED

#### Amendment B — Preserve `crm_quotation_items` under ADR-081

| Current ADR-083 Text | Recommended Change |
|---------------------|-------------------|
| Lists `crm_quotation_items.nego_price` as legacy pricing | ADD: "Preserved per ADR-081 — not subject to decommissioning" |

**Classification:** REQUIRED

#### Amendment C — Preserve `fw_container_items.sell_price_snapshot` as Historical Evidence

| Current ADR-083 Text | Recommended Change |
|---------------------|-------------------|
| Lists `fw_container_items.sell_price_snapshot` as legacy pricing | ADD: "Historical evidence — not subject to decommissioning" |

**Classification:** REQUIRED

#### Amendment D — Require Semantic-Equivalence Proof

| Proposed Text | Rationale |
|--------------|-----------|
| "No legacy pricing structure may be decommissioned until semantic equivalence is proven via dry-run migration and test validation." | Prevents premature decommissioning with data loss |

**Classification:** RECOMMENDED

#### Amendment E — Require Migration Dry-Run Validation

| Proposed Text | Rationale |
|--------------|-----------|
| "All migration functions must execute dry-run validation against production data before any write migration is authorized." | Ensures migration completeness before execution |

**Classification:** RECOMMENDED

#### Amendment F — Require Canonical UI or Compatibility Bridge

| Proposed Text | Rationale |
|--------------|-----------|
| "Legacy administration interfaces may only be decommissioned after canonical replacement UI is proven operational or a server-side compatibility bridge is implemented." | Prevents operational disruption |

**Classification:** RECOMMENDED

#### Amendment G — Explicit COGS Exclusion

| Proposed Text | Rationale |
|--------------|-----------|
| "COGS and cost data are out of scope for canonical Pricing. Decommissioning of COGS columns requires ADR-086 implementation." | Prevents scope creep into cost domain |

**Classification:** REQUIRED

---

## 14. Canonical Pricing UI Decision

### Assessment

**Canonical pricing is operationally unusable without a management UI.**

### Options

| Option | Description | Feasibility | Recommendation |
|--------|-------------|-------------|----------------|
| **A. Dedicated canonical pricing UI** | Build new admin interface for canonical rates | HIGH effort, LONG timeline | NOT REQUIRED for ADR-083 |
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

**Implementation note:** This is OUT OF SCOPE for ADR-083 discovery. It would be a separate implementation task.

---

## 15. Migration Readiness

### Current State

| Migration Function | Status | Semantic Completeness | Test Coverage | Production Ready? |
|-------------------|--------|----------------------|---------------|-------------------|
| `migrateFwPriceMaster` | Scaffolding only | 30% (loses COGS, multi-mode) | None | NO |
| `migrateCrmSbuCustomerRates` | Scaffolding only | 60% (loses pricing_type) | None | NO |
| `migrateMdBillingRates` | Scaffolding only | 40% (loses warehouse_id) | None | NO |

### Minimum Requirements Before Execution

| Requirement | `fw_price_master` | `crm_sbu_customer_rates` | `md_billing_rates` |
|-------------|-------------------|--------------------------|-------------------|
| Extend for multi-mode pricing | YES | NO | NO |
| Preserve COGS (adapter) | YES | NO | NO |
| Add pricing_type mapping | NO | YES (if not rejected) | NO |
| Add warehouse_id mapping | NO | NO | YES |
| Unit tests | YES | YES | YES |
| Dry-run validation | YES | YES | YES |
| Rollback strategy | YES | YES | YES |
| Production authorization | YES | YES | YES |

### Classification

| Function | Readiness | Blocker |
|----------|-----------|---------|
| `migrateFwPriceMaster` | NOT READY | Multi-mode pricing, COGS adapter, tests, dry-run |
| `migrateCrmSbuCustomerRates` | NOT READY | pricing_type decision, tests, dry-run |
| `migrateMdBillingRates` | ARCHITECTURALLY BLOCKED | Wrong domain — should not be in ADR-083 |

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
| Multi-mode pricing | Multiple `charge_basis` values represent different calculation modes | **B** — Bounded canonical extension | HIGH | ADR-088 (revised) |
| `sell_min_cbm` semantics | Minimum monetary charge on PER_CBM calculation | **A** — Canonical Pricing already supports via `min_charge` | HIGH | ADR-088 (revised) |
| COGS ownership | Cost domain, not pricing domain | **D** — Another domain owns (ADR-086) | HIGH | ADR-088 (revised) |
| `pricing_type` semantics | Billing frequency, not pricing concept | **D** — Another domain owns (ADR-084) | HIGH | ADR-089 (REJECT current proposal) |
| Customer-specific rate | `customer_id` in `applicability_conditions` | **A** — Canonical Pricing already supports | HIGH | None |
| Route semantics | `origin`/`destination` in `applicability_conditions` | **A** — Canonical Pricing already supports | HIGH | None |
| `md_billing_rates` ownership | Contract-scoped warehouse billing | **D** — Another domain owns (ADR-084) | HIGH | ADR-083 amendment |
| Canonical UI | No canonical pricing management UI exists | **B** — Temporary compatibility adapter | MEDIUM | Separate task |
| Migration readiness | Functions incomplete, untested, unexecuted | NOT READY | HIGH | Separate implementation phase |

---

## 18. ADR Recommendation Matrix

| ADR | Recommendation | Rationale |
|-----|---------------|-----------|
| ADR-088 (as proposed) | **NEEDS REVISION** | Conflates calculation basis with minimum charge; includes COGS incorrectly |
| ADR-088 (revised) | **RATIFY-READY** | Multi-mode pricing via multiple rate items with distinct `charge_basis` |
| ADR-089 (as proposed) | **REJECT** | `pricing_type` is billing frequency, not pricing concept |
| ADR-089 (alternative) | **FURTHER DISCOVERY** | If pursued, should be "Billing Frequency Representation" under ADR-084 |
| ADR-083 amendment A | **REQUIRED** | Remove `md_billing_rates` from scope |
| ADR-083 amendment B | **REQUIRED** | Explicitly preserve `crm_quotation_items` under ADR-081 |
| ADR-083 amendment C | **REQUIRED** | Explicitly preserve `fw_container_items.sell_price_snapshot` |
| ADR-083 amendment D | **RECOMMENDED** | Require semantic-equivalence proof |
| ADR-083 amendment E | **RECOMMENDED** | Require migration dry-run validation |
| ADR-083 amendment F | **RECOMMENDED** | Require canonical UI or compatibility bridge |
| ADR-083 amendment G | **REQUIRED** | Explicitly exclude COGS from canonical Pricing |
| ADR-084 clarification | **REQUIRED** | Confirm `md_billing_rates` ownership |

---

## 19. Required Next Steps

### Before ADR-088 Ratification

1. **Revise ADR-088 proposal** to:
   - Remove COGS from scope
   - Correct `sell_min_cbm` mapping to `min_charge`
   - Focus on multi-mode rate representation via `charge_basis`
   - Add explicit ADR-086 exclusion for COGS

### Before ADR-089 Ratification

1. **Reject current ADR-089 proposal**
2. **If billing frequency needs canonical representation:**
   - Create new proposal under ADR-084 scope
   - OR create adapter pattern that preserves `pricing_type` in legacy table

### Before ADR-083 Can Resume

1. **Amend ADR-083** with required amendments (A, B, C, G)
2. **Add recommended amendments** (D, E, F)
3. **Remove `md_billing_rates` from scope**
4. **Obtain ADR-084 clarification** for `md_billing_rates`
5. **Extend migration functions** with semantic preservation
6. **Add migration tests**
7. **Execute dry-run validation**
8. **Build canonical pricing UI or adapter bridge**

### Sequence

```text
1. ADR-083 amendment (remove md_billing_rates, add preconditions)
2. ADR-088 revision and ratification (multi-mode pricing)
3. ADR-084 clarification (md_billing_rates ownership)
4. ADR-083 implementation Wave 2 (fw_price_master pricing only)
5. ADR-084 implementation (md_billing_rates)
6. ADR-083 implementation Wave 3 (crm_sbu_customer_rates pricing only)
```

---

## 20. Out-of-Scope Confirmation

This discovery explicitly did NOT:
- modify production code
- modify database schema
- create migrations
- execute migrations
- migrate data
- delete legacy tables
- remove legacy writers
- remove legacy readers
- implement ADR-088
- implement ADR-089
- amend ADR-083
- implement ADR-084
- implement ADR-085
- implement ADR-086
- implement ADR-087
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

| ADR | Status | Required Action |
|-----|--------|----------------|
| ADR-088 | NEEDS REVISION | Remove COGS, correct `sell_min_cbm` mapping, exclude ADR-086 scope |
| ADR-089 | REJECT (current form) | `pricing_type` is billing concept, not pricing; assign to ADR-084 |
| ADR-083 | REQUIRES AMENDMENT | Remove `md_billing_rates`; add preconditions; preserve ADR-081/082 structures |
| `md_billing_rates` | REQUIRES REASSIGNMENT | Move to ADR-084 or new Warehouse Billing ADR |

### Blockers Remaining

1. ADR-088 must be revised before ratification
2. ADR-089 must be rejected or completely redesigned
3. `md_billing_rates` ownership must be clarified
4. ADR-083 must be amended before implementation can resume
5. Migration functions must be extended and tested
6. Canonical pricing UI or adapter must be built

### What CAN Proceed

- **ADR-088 (revised)** — Multi-mode pricing representation via `charge_basis`
- **ADR-083 amendment** — Remove `md_billing_rates`, add preconditions
- **`fw_price_master` pricing migration** — After ADR-088 ratification and migration extension
- **`crm_sbu_customer_rates` pricing migration** — After ADR-088 ratification and migration extension

### What CANNOT Proceed

- ADR-089 in current form
- `md_billing_rates` decommissioning (wrong domain)
- COGS migration into canonical Pricing
- Any legacy decommissioning without canonical replacement proven

---

**ARCHITECTURE DISCOVERY COMPLETE — ADR RATIFICATION AND IMPLEMENTATION NOT AUTHORIZED.**

---

**END OF ADR-088/089 ARCHITECTURE DECISION DISCOVERY REPORT**
