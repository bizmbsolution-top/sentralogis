# SENTRALOGIS — PHASE 5C ADR-083 IMPLEMENTATION
# WAVE 1: LEGACY PRICING DECOMMISSIONING

**Date:** 2026-09-05
**Status:** YELLOW — PARTIAL DECOMMISSIONING (BLOCKED ON CANONICAL REPLACEMENT)
**Phase:** Phase 5C — ADR-083 Implementation Wave 1
**Mode:** CONTROLLED IMPLEMENTATION
**Scope:** ADR-083 ONLY

---

## 1. Authorization

Exact authorization string recorded:

> I AUTHORIZE SENTRALOGIS PHASE 5C ADR-083 IMPLEMENTATION ONLY.

Scope honored:
- Legacy pricing inventory: YES
- Legacy pricing classification: YES
- Runtime consumer migration: 0 (blocked)
- Legacy writer removal: 0 (blocked)
- Schema mutation: NO
- Data repair: NO
- ADR-084..087: FORBIDDEN

---

## 2. Status

**YELLOW — PARTIAL DECOMMISSIONING (BLOCKED ON CANONICAL REPLACEMENT)**

No legacy pricing structures were decommissioned.

All legacy pricing tables and columns remain intact and active.

No production code was modified.

No schema changes were made.

The decommissioning is blocked because **no legacy pricing structure has a proven canonical replacement** that preserves all required semantics.

---

## 3. Objective

Safely reduce and eventually eliminate runtime dependency on legacy pricing structures, now that ADR-081 and ADR-082 are GREEN.

The implementation was blocked at Wave A (Inventory) because the forensic inventory revealed that every legacy pricing structure either:
- Has no proven canonical replacement due to semantic gaps, OR
- Is required by another authorized ADR (ADR-081), OR
- Contains historical evidence that must be preserved.

---

## 4. Legacy Inventory

| Legacy source | Readers | Writers | Runtime active? | Canonical replacement | Historical? | Safe to decommission? |
|---------------|---------|---------|-----------------|----------------------|-------------|----------------------|
| `fw_price_master` | `forwardingActions.ts`, `AddForwardingItemModal.tsx`, `sbu/forwarding/wo/create/page.tsx`, `sbu/forwarding/master/price/page.tsx` | `sbu/forwarding/master/price/page.tsx` | YES | `pricing_rates` + `pricing_rate_items` | NO | **NO** |
| `crm_sbu_customer_rates` | `commercial/rates/page.tsx`, `commercial/quotations/[id]/page.tsx`, `portal/sales/quotations/[id]/page.tsx` | `commercial/rates/page.tsx`, `commercial/quotations/[id]/page.tsx` | YES | `pricing_rates` + `pricing_rate_items` | YES | **NO** |
| `md_billing_rates` | `hq/warehouse/billing/page.tsx`, `hq/business/contracts/[id]/edit/page.tsx`, `ContractWizard.tsx` | `ContractWizard.tsx`, `contractActions.ts` | YES | `pricing_rates` + `pricing_rate_items` | YES | **NO** |
| `crm_quotation_items` | `lib/sales-order/service.ts` (ADR-081), `quote/actions.ts`, quotation pages | `quote/actions.ts`, quotation pages | YES | N/A (required by ADR-081) | YES | **NO** |
| `fw_container_items.sell_price_snapshot` | `sbu/forwarding/wo/[id]/page.tsx` | `forwarding-writer.ts` | YES | N/A (historical evidence) | YES | **NO** |

---

## 5. Classification Details

### 5.1 `fw_price_master` — NO proven canonical replacement

**Semantic gaps:**
- Legacy has multiple sell price columns: `sell_price`, `sell_per_cbm`, `sell_min_cbm`
- Legacy has 9 COGS columns: `cogs_pickup`, `cogs_port_haulage_origin`, `cogs_ocean_freight`, `cogs_thc_origin`, `cogs_port_haulage_dest`, `cogs_last_mile`, `cogs_documentation`, `cogs_other`
- Canonical `pricing_rate_items` has only `unit_rate`, `min_charge`, `max_charge`

**Consumers:**
- `forwardingActions.ts` — reads `sell_price` (pricing) and `master_cost_origin_amount`/`master_cost_destination_amount` (COGS)
- `AddForwardingItemModal.tsx` — reads for autocomplete
- `sbu/forwarding/wo/create/page.tsx` — reads for autocomplete
- `sbu/forwarding/master/price/page.tsx` — admin UI for managing forwarding prices

**Blocker:** Cannot replace `fw_price_master` with canonical pricing because:
1. COGS data has no canonical equivalent (ADR-086 forbidden)
2. Multiple price columns have no canonical equivalent
3. Admin UI for price management would need complete replacement

### 5.2 `crm_sbu_customer_rates` — NO proven canonical replacement

**Semantic gaps:**
- Legacy has `pricing_type` (ONE_TIME/RECURRING_MONTHLY/PER_ACTIVITY)
- Legacy has `route_origin` / `route_destination` columns
- Legacy has `uom` values (CBM/KG/PALLET/CONTAINER/TRIP/DOCUMENT)
- Canonical `pricing_rate_items` has `charge_basis` and `unit_of_measure` but no `pricing_type` or explicit route columns

**Consumers:**
- `commercial/rates/page.tsx` — admin UI for managing customer rates
- `commercial/quotations/[id]/page.tsx` — reads customer rates for quotations
- `portal/sales/quotations/[id]/page.tsx` — reads customer rates for sales portal

**Blocker:** Cannot replace `crm_sbu_customer_rates` with canonical pricing because:
1. `pricing_type` has no canonical equivalent
2. Route columns have no direct canonical equivalent
3. Admin UI for customer rate management would need complete replacement

### 5.3 `md_billing_rates` — NO proven canonical replacement

**Semantic gaps:**
- Legacy scoped to `contract_id` and `warehouse_id`
- Legacy has `charge_code` (STR-*/HD-*)
- Canonical `pricing_rate_items` has no contract or warehouse scoping

**Consumers:**
- `hq/warehouse/billing/page.tsx` — reads billing rates
- `hq/business/contracts/[id]/edit/page.tsx` — reads contract billing rates
- `ContractWizard.tsx` — writes billing rates as part of contract creation
- `contractActions.ts` — server action that writes billing rates

**Blocker:** Cannot replace `md_billing_rates` with canonical pricing because:
1. Contract scoping has no canonical equivalent
2. Warehouse scoping has no canonical equivalent
3. This table may belong to ADR-084 (Financial Settlement) or operational tariff data

### 5.4 `crm_quotation_items` — REQUIRED BY ADR-081

**Status:** NOT a legacy pricing structure for decommissioning.

**Reason:** ADR-081 explicitly uses `crm_quotation_items` as the price authority for Quote → SO transfer:
```text
Accepted Quote (crm_quotations.status = ACCEPTED)
      ↓
createSalesOrder(quoteId)
      ↓
Read Quote line items (crm_quotation_items)
      ↓
Create SO line items (sales_order_line_items)
      ↓
price_snapshot
```

**Consumers:**
- `lib/sales-order/service.ts` — reads for ADR-081 price transfer (server-authoritative)
- `quote/actions.ts` — reads/writes as part of Quote domain
- Quotation pages — reads/writes as part of Quote management UI

**Action:** Must be preserved. ADR-081 depends on it.

### 5.5 `fw_container_items.sell_price_snapshot` — HISTORICAL EVIDENCE

**Status:** NOT a legacy pricing structure for decommissioning.

**Reason:** This is a committed price snapshot on a cargo manifest record. It is historical commercial evidence.

**Consumers:**
- `forwarding-writer.ts` — writes at WO creation
- `sbu/forwarding/wo/[id]/page.tsx` — displays committed price

**Action:** Must be preserved. It represents the committed price at the time of forwarding WO creation.

---

## 6. Migration Map

**No migrations performed.**

| Legacy source | Old path | New path | Status |
|---------------|----------|----------|--------|
| `fw_price_master` | `forwardingActions.ts` → `fw_price_master` | NOT MIGRATED | BLOCKED |
| `fw_price_master` | `AddForwardingItemModal.tsx` → `fw_price_master` | NOT MIGRATED | BLOCKED |
| `crm_sbu_customer_rates` | `commercial/rates/page.tsx` → `crm_sbu_customer_rates` | NOT MIGRATED | BLOCKED |
| `md_billing_rates` | `ContractWizard.tsx` → `md_billing_rates` | NOT MIGRATED | BLOCKED |
| `crm_quotation_items` | `lib/sales-order/service.ts` → `crm_quotation_items` | PRESERVED (ADR-081) | NOT TOUCHED |
| `fw_container_items.sell_price_snapshot` | `forwarding-writer.ts` → `fw_container_items` | PRESERVED (historical) | NOT TOUCHED |

---

## 7. Decommissioned Writers

**None.**

No legacy writers were removed because:
1. No canonical replacement is proven for any legacy pricing structure
2. Removing writers would break production functionality
3. ADR-081 requires `crm_quotation_items` writers
4. Historical evidence writers must be preserved

---

## 8. Remaining Legacy Structures

All legacy pricing structures remain active.

| Structure | Why retained | Current consumers | Dependency preventing removal |
|-----------|-------------|-------------------|-------------------------------|
| `fw_price_master` | No proven canonical replacement (COGS + multi-price semantic gap) | `forwardingActions.ts`, `AddForwardingItemModal.tsx`, `sbu/forwarding/wo/create/page.tsx`, `sbu/forwarding/master/price/page.tsx` | COGS columns have no canonical equivalent; multiple price columns have no canonical equivalent; admin UI unreplaced |
| `crm_sbu_customer_rates` | No proven canonical replacement (pricing_type + route semantic gap) | `commercial/rates/page.tsx`, `commercial/quotations/[id]/page.tsx`, `portal/sales/quotations/[id]/page.tsx` | `pricing_type` has no canonical equivalent; route columns have no direct canonical equivalent; admin UI unreplaced |
| `md_billing_rates` | No proven canonical replacement (contract + warehouse scoping gap); possibly ADR-084 domain | `hq/warehouse/billing/page.tsx`, `hq/business/contracts/[id]/edit/page.tsx`, `ContractWizard.tsx`, `contractActions.ts` | Contract scoping has no canonical equivalent; warehouse scoping has no canonical equivalent; may belong to ADR-084 |
| `crm_quotation_items` | Required by ADR-081 | `lib/sales-order/service.ts`, `quote/actions.ts`, quotation pages | ADR-081 price authority |
| `fw_container_items.sell_price_snapshot` | Historical commercial evidence | `forwarding-writer.ts`, `sbu/forwarding/wo/[id]/page.tsx` | Committed price snapshot; cargo manifest record |

---

## 9. ADR-081 Compatibility

**PRESERVED — NO CHANGES MADE.**

ADR-081 depends on `crm_quotation_items` for Quote → SO price transfer.

No modifications were made to:
- `lib/sales-order/service.ts` ADR-081 path
- `crm_quotation_items` table or its writers
- `price_snapshot` semantics on `sales_order_line_items`
- `source_quote_item_id` lineage

`crm_quotation_items` was classified as "Required by ADR-081" and left completely untouched.

---

## 10. ADR-082 Compatibility

**PRESERVED — NO CHANGES MADE.**

ADR-082 activated `lib/pricing/` as the canonical pricing runtime.

No modifications were made to:
- `lib/pricing/service.ts` (`PricingService`)
- `lib/pricing/repository.ts`
- `lib/pricing/selection.ts`
- `lib/pricing/calculation.ts`
- `lib/pricing/override-service.ts`
- `resolveCanonicalPricing` server action
- `/api/v1/commercial/pricing/resolve` API route

Canonical pricing remains active and reachable from runtime paths, but no legacy consumers were migrated to it.

---

## 11. Historical Data Safety

**PRESERVED — NO DATA MUTATIONS.**

No historical data was modified or deleted:
- `fw_price_master` — intact
- `crm_sbu_customer_rates` — intact
- `md_billing_rates` — intact
- `crm_quotation_items` — intact
- `fw_container_items.sell_price_snapshot` — intact
- `sales_order_line_items.price_snapshot` — intact

No schema changes were made.

No data migrations were executed.

---

## 12. Security

**NO CHANGES — NO REGRESSION.**

No tenant isolation mechanisms were modified.

No authorization mechanisms were modified.

No new security vulnerabilities were introduced.

All legacy tables retain their existing RLS policies.

---

## 13. Database

**Migration: NONE**

No schema changes were made.

No destructive operations were performed.

All legacy tables remain fully functional.

---

## 14. Tests

**Targeted tests: N/A — no production code changes**

**Regression: NOT RUN**

No regression was run because:
1. No production code was modified
2. No schema changes were made
3. No runtime behavior was changed

Running full regression would not validate any ADR-083 implementation because no implementation occurred.

**TypeScript: N/A — no production code changes**

---

## 15. Scope Audit

### ADR-083 ONLY
- **ADR-081:** PRESERVED (no changes)
- **ADR-082:** PRESERVED (no changes)
- **ADR-084 Financial Settlement Activation:** NOT IMPLEMENTED
- **ADR-085 Customer Success Aggregate:** NOT IMPLEMENTED
- **ADR-086 Margin / COGS Canonical Ownership:** NOT IMPLEMENTED
- **ADR-087 Operational → Commercial Event Bridge:** NOT IMPLEMENTED

### Phase boundaries preserved
- **Phase 5A:** UNCHANGED
- **Phase 5B:** UNCHANGED
- **Phase 5D:** UNCHANGED
- **DATA-4E:** UNCHANGED
- **D-Repair:** UNCHANGED

### Firewalls respected
- No `fin_billable_events` / `fin_invoices` / `fin_ar_ap` writers created
- No Customer Success tables/services created
- No margin/COGS calculation added
- No operational event bridge implemented
- No legacy pricing tables modified

---

## 16. Residual Debt / Findings

### Genuine blockers for ADR-083 decommissioning

1. **`fw_price_master` semantic gap:** Legacy table has COGS columns and multiple price columns (`sell_price`, `sell_per_cbm`, `sell_min_cbm`) with no canonical equivalent. Canonical `pricing_rate_items` only supports single `unit_rate` + `min_charge`/`max_charge`. **Resolution required:** ADR design extension or separate COGS domain.

2. **`crm_sbu_customer_rates` semantic gap:** Legacy table has `pricing_type` (ONE_TIME/RECURRING_MONTHLY/PER_ACTIVITY) and explicit `route_origin`/`route_destination` columns with no canonical equivalent. **Resolution required:** Canonical pricing model extension or adapter pattern.

3. **`md_billing_rates` semantic gap:** Legacy table is scoped to `contract_id` + `warehouse_id` with no canonical equivalent. May belong to ADR-084 (Financial Settlement) or operational tariff domain. **Resolution required:** Architectural decision on whether this is pricing, billing, or operational data.

4. **Canonical pricing data migration status unknown:** `lib/pricing/migration-repository.ts` contains migration functions (`migrateFwPriceMaster`, `migrateCrmSbuCustomerRates`, `migrateMdBillingRates`), but there is no evidence these have been executed against production data. **Resolution required:** Verify migration execution or run migration if authorized.

5. **No canonical pricing UI exists:** Legacy pricing admin pages (`sbu/forwarding/master/price/page.tsx`, `commercial/rates/page.tsx`) have no canonical replacement. **Resolution required:** Build canonical pricing management UI or retain legacy admin interfaces.

---

## 17. Final Gate

**YELLOW — PARTIAL DECOMMISSIONING**

No legacy pricing structures were decommissioned.

The decommissioning is blocked because **no legacy pricing structure has a proven canonical replacement** that preserves all required semantics.

### What was accomplished:
- Complete forensic inventory of all legacy pricing structures
- Classification of each structure (historical, required by other ADR, no replacement)
- Documentation of semantic gaps preventing decommissioning
- Preservation of all historical data and ADR-081/082 functionality

### What remains blocked:
- `fw_price_master` decommissioning — blocked on COGS/multi-price semantic gap
- `crm_sbu_customer_rates` decommissioning — blocked on pricing_type/route semantic gap
- `md_billing_rates` decommissioning — blocked on contract/warehouse scoping gap
- `crm_quotation_items` — preserved per ADR-081
- `fw_container_items.sell_price_snapshot` — preserved as historical evidence

### Next steps required to unblock:
1. Design canonical equivalents for COGS and multi-price columns (`fw_price_master`)
2. Design canonical equivalents for `pricing_type` and route columns (`crm_sbu_customer_rates`)
3. Determine whether `md_billing_rates` belongs to ADR-084 or requires canonical design
4. Execute canonical pricing data migration if not already run
5. Build canonical pricing management UI to replace legacy admin pages

---

**PHASE 5C ADR-083 IMPLEMENTATION WAVE 1 COMPLETE — HARD STOP.**

No legacy pricing structures were decommissioned.

No production code was modified.

No schema changes were made.

The next ADR requires a new explicit authorization.

---

**END OF PHASE 5C ADR-083 IMPLEMENTATION WAVE 1 REPORT**
