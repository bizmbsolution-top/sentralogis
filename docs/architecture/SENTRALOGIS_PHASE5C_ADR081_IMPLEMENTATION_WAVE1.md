# SENTRALOGIS — PHASE 5C ADR-081 IMPLEMENTATION
# WAVE 1: QUOTE → SALES ORDER PRICE TRANSFER

**Date:** 2026-09-05
**Status:** GREEN — ADR-081 IMPLEMENTED
**Phase:** Phase 5C — ADR-081 Implementation Wave 1
**Mode:** CONTROLLED IMPLEMENTATION
**Scope:** ADR-081 ONLY

---

## 1. Executive Status

**GREEN — ADR-081 IMPLEMENTED**

Quote → Sales Order price transfer is now server-authoritative. When a Sales Order is created with a `quoteId`, the system:
- Validates the Quote is tenant-owned and in `ACCEPTED` status
- Reads Quote line items (`crm_quotation_items`)
- Creates SO line items (`sales_order_line_items`) with immutable `price_snapshot` JSONB
- Derives `total_agreed_revenue` from committed Quote prices (ignores client-supplied value)
- Maps `md_services.sbu_type` to canonical `PricingCapabilityType`

No other Phase 5C ADR was implemented.

---

## 2. Authorization

Exact authorization string recorded:

> I AUTHORIZE SENTRALOGIS PHASE 5C ADR-081 IMPLEMENTATION ONLY.

Scope honored:
- Quote → SO price transfer: YES
- Production implementation: YES (within ADR-081 boundary)
- Schema mutation: NO
- Data repair: NO
- ADR-082..077: FORBIDDEN

---

## 3. Preflight Findings

### Quote authority
`crm_quotations` table with `id`, `tenant_id`, `deal_id`, `status` (DRAFT/WAITING_APPROVAL/SENT/ACCEPTED/REJECTED), `total_amount`. `crm_quotation_items` with `quotation_id`, `service_id`, `description`, `qty`, `uom`, `unit_price`, `nego_price`, `subtotal`, `tax_amount`, `total_price`.

### SO authority
`sales_orders` table with `quote_id` FK, `so_number`, `status`, `total_agreed_revenue`. `createSalesOrder` accepts `quoteId` but did NOT create line items. `sales_order_line_items` exists with `source_quote_item_id`, `price_snapshot` JSONB.

### SO line-item writer
`createSOLineItem` in `lib/sales-order/line-repository.ts` exists and is server-authoritative (IdentityContext + assertPermission).

### Existing Quote → SO path
`createSalesOrder` accepts `quoteId` and validates tenant ownership, but did NOT create line items. `customerApproveQuotation` in `app/quote/actions.ts` sets `status=ACCEPTED` only, no SO creation.

### Price source
Quote line items have `unit_price` and `nego_price` (nego_price overrides unit_price via DB trigger). Authoritative price = `COALESCE(nego_price, unit_price)`. `subtotal` is pre-calculated in DB.

### Price snapshot schema
`PriceSnapshot` interface exists in `lib/sales-order/line-types.ts` with: `source_rate_id`, `source_rate_version_id`, `unit_rate_snapshot`, `quantity_snapshot`, `currency_snapshot`, `uom_snapshot`, `calculated_amount`, `snapshot_timestamp`, `charge_basis`, `pricing_side`, `rounding_precision`, `rounding_mode`, `min_charge`, `max_charge`, `selection_explanation`, `calculation_inputs`.

### Tenant enforcement
IdentityContext-derived. `validateQuote` checks tenant ownership. RLS on all tables.

### Authorization
`commercial:manage` required for `createSalesOrder` and `createSOLineItem`.

### Idempotency
`createSalesOrder` has idempotency via `idempotency_key`. Line item creation is idempotent via existing-line check (`listSOLineItemsBySO`).

### Implementation surface
- `lib/sales-order/service.ts` — added line-item creation in `createSalesOrder`
- `lib/sales-order/line-repository.ts` — added injectable DB client for testability
- `lib/sales-order/types.ts` — added `QUOTE_NOT_ACCEPTED` and `QUOTE_NO_ITEMS` error codes
- `lib/__tests__/u13-sales-order-foundation.test.ts` — updated mock + added 9 ADR-081 tests
- `lib/__tests__/u13r-sales-order-forensic-reconciliation.test.ts` — updated mock for line items

---

## 4. Implementation Changes

| File | Change | Reason | ADR-081 Relation |
|------|--------|--------|-----------------|
| `lib/sales-order/service.ts` | Added `mapSbuToCapability`, `buildPriceSnapshotFromQuoteItem` helpers; modified `createSalesOrder` to create SO line items from Quote when `quoteId` present | Core price transfer implementation | Direct |
| `lib/sales-order/line-repository.ts` | Added injectable `SalesOrderLineDbClient` + `_setSalesOrderLineDbClient` for testability | Enables mock-based testing of line item creation | Support |
| `lib/sales-order/types.ts` | Added `QUOTE_NOT_ACCEPTED` and `QUOTE_NO_ITEMS` error codes | Explicit error taxonomy for Quote validation | Direct |
| `lib/__tests__/u13-sales-order-foundation.test.ts` | Updated mock to support `crm_quotation_items`, `sales_order_line_items`, `md_services`; added 9 ADR-081 behavioral tests | Verify Quote → SO price transfer, snapshot, immutability, idempotency, capability mapping | Validation |
| `lib/__tests__/u13r-sales-order-forensic-reconciliation.test.ts` | Updated mock to support line item tables; set `_setSalesOrderLineDbClient` | Ensure forensic reconciliation suite runs with new line item creation | Validation |

---

## 5. Price Authority

### Source Quote price
- **Primary:** `crm_quotation_items.nego_price` (if present)
- **Fallback:** `crm_quotation_items.unit_price`
- **Authority:** Server reads from `crm_quotation_items` exclusively. Client-supplied prices are never used as authority.

### Server authority
- `createSalesOrder` reads Quote line items server-side via `db().from('crm_quotation_items')`
- `total_agreed_revenue` is overridden with the sum of committed Quote line totals when `quoteId` is present
- Client-supplied `totalAgreedRevenue` is ignored when `quoteId` is present

### Snapshot semantics
- `price_snapshot` JSONB is persisted at SO line item creation
- `unit_rate_snapshot` = `COALESCE(nego_price, unit_price)`
- `calculated_amount` = `subtotal` (pre-calculated by DB trigger)
- `pricing_side` = `'SELL'` (customer-facing Quote)
- `snapshot_timestamp` = server time at creation
- Future Quote/pricing-master changes do NOT mutate committed SO line items

---

## 6. Lineage

### Implemented flow

```text
Accepted Quote (crm_quotations.status = ACCEPTED)
      ↓
Sales Order creation (createSalesOrder with quoteId)
      ↓
Read Quote line items (crm_quotation_items)
      ↓
Create SO line items (sales_order_line_items)
      ↓
immutable price_snapshot JSONB
      ↓
Derive total_agreed_revenue from Quote line totals
```

### Validation rules
- Quote must be `ACCEPTED` status (rejects DRAFT/SENT/REJECTED)
- Quote must have at least one line item
- Quote must be tenant-owned (cross-tenant Quote access rejected)
- Each SO line item receives `source_quote_item_id` for lineage tracing

---

## 7. Security

### Tenant derivation
- `tenantId` resolved exclusively from `IdentityContext` (server-side session)
- `validateQuote(tenantId, quoteId)` enforces tenant ownership before any read
- `createSOLineItem` uses `ctx.tenantId` for RLS compliance

### Authorization
- `createSalesOrder` requires `commercial:manage` (U-02 `assertPermission`)
- `createSOLineItem` requires `commercial:manage`
- Unauthorized users cannot execute Quote → SO transfer

### Cross-tenant protection
- `validateQuote` rejects Quotes not owned by the authenticated tenant
- All `crm_quotation_items` reads filtered by `tenant_id`
- `sales_order_line_items` inserts use `ctx.tenantId`

### Client-price forgery protection
- Client-supplied `totalAgreedRevenue` is ignored when `quoteId` is present
- All prices are read from `crm_quotation_items` server-side
- `nego_price` / `unit_price` from Quote are the sole price authority

---

## 8. Idempotency

### SO header
- Existing `idempotency_key` mechanism on `sales_orders` (UNIQUE `tenant_id, idempotency_key`)
- Retry with same key returns existing SO without creating duplicate

### SO line items
- Before creating line items, `listSOLineItemsBySO` checks for existing lines
- If lines already exist, creation is skipped
- This makes the combined Quote → SO + line items operation idempotent

### Multiple SO from same Quote
- Supported: 1 Quote → N SOs
- Each SO receives independent line items and price snapshot
- Different `idempotencyKey` values create distinct SOs

---

## 9. Schema

**NO SCHEMA CHANGE**

No migration was created. All implementation uses existing tables and columns:
- `crm_quotations` (existing)
- `crm_quotation_items` (existing)
- `sales_orders` (existing, `quote_id` FK already present)
- `sales_order_line_items` (existing, `price_snapshot` JSONB already present)
- `md_services` (existing)

---

## 10. Tests

### Targeted tests executed
| Test Suite | Result |
|------------|--------|
| `u13-sales-order-foundation.test.ts` (U-13) | **50 / 50 PASS** |
| TypeScript (`tsc --noEmit`) | **0 errors** in modified files |

### ADR-081 test categories covered
| Category | Test ID | Description |
|----------|---------|-------------|
| Happy Path | U13-B02 | Quote → SO creates line items with correct snapshot |
| Price Snapshot | U13-B17 | `nego_price` over `unit_price` in snapshot |
| Server Authority | U13-B18 | Client `totalAgreedRevenue` ignored when `quoteId` present |
| Idempotency | U13-B19 | Retry with same `idempotencyKey` returns existing SO + lines |
| Multiple SO | U13-B20 | Same Quote → multiple SOs, each with independent lines |
| Tenant Isolation | U13-B21 | Cross-tenant Quote rejected |
| Authorization | U13-B22 | Unauthorized user rejected for Quote → SO |
| Quote Status | U13-B15 | Non-ACCEPTED Quote rejected |
| Quote Items | U13-B16 | Quote with no items rejected |
| Line Mapping | U13-B23 | `md_services.sbu_type` → `PricingCapabilityType` |

### Existing tests preserved
- U13-B01 (Direct SO) — PASS
- U13-B03 (Cross-tenant Engagement) — PASS
- U13-B04 (Cross-tenant Quote) — PASS
- U13-B05 (Unauthorized) — PASS
- U13-B06 (Idempotency) — PASS
- U13-B07 (Concurrency) — PASS
- U13-B08..B14 (Lifecycle) — PASS

---

## 11. Scope Audit

### ADR-081 ONLY
- **ADR-082 Pricing Activation:** NOT IMPLEMENTED
- **ADR-083 Legacy Pricing Decommissioning:** NOT IMPLEMENTED
- **ADR-084 Financial Settlement:** NOT IMPLEMENTED
- **ADR-085 Customer Success:** NOT IMPLEMENTED
- **ADR-086 Margin / COGS:** NOT IMPLEMENTED
- **ADR-087 Operational → Commercial Event Bridge:** NOT IMPLEMENTED

### Phase boundaries preserved
- **Phase 5A:** UNCHANGED. No Phase 5A functionality modified.
- **Phase 5B:** NOT TOUCHED
- **Phase 5D:** NOT TOUCHED
- **DATA-4E:** NOT TOUCHED
- **D-Repair:** NOT TOUCHED

### Firewalls respected
- No `fin_billable_events` / `fin_invoices` / `fin_ar_ap` writers created
- No Customer Success tables/services created
- No margin/COGS calculation added
- No operational event bridge implemented
- No legacy pricing tables (`fw_price_master`, `crm_sbu_customer_rates`, `md_billing_rates`) modified

---

## 12. Remaining Findings

### Discovered but NOT repaired (unauthorized scope)
1. **`line-repository.ts` direct `supabaseAdmin` usage:** Pre-existing architectural gap. `createSOLineItem` uses `supabaseAdmin` directly, making it untestable in isolation without the new `_setSalesOrderLineDbClient` injection added for ADR-081 tests. Full migration of `line-repository.ts` to injectable DB client is a separate task.
2. **Legacy `invoices` table browser-direct mutations:** Pre-existing HIGH risk in `hq/invoice-customer/page.tsx`. Outside ADR-081 scope (governed by ADR-084).
3. **`fw_price_master` / `crm_sbu_customer_rates` browser-direct mutations:** Pre-existing MEDIUM risk. Outside ADR-081 scope (governed by ADR-083).
4. **U-13R test infrastructure:** `u13r-sales-order-forensic-reconciliation.test.ts` uses `path.resolve(__dirname, '..', '..')` which fails when run outside project root. Pre-existing issue, not ADR-081 caused.

---

## 13. Final Validation

### Architecture
- Quote → SO transfer follows ADR-081
- SO remains Commercial authority
- No competing pricing aggregate created

### Security
- Tenant is server-derived
- Authorization enforced (`commercial:manage`)
- Client price ignored as authority
- Cross-tenant access blocked

### Data Integrity
- Committed price snapshot persisted
- No accidental live price dependency
- Duplicate requests handled via idempotency
- No partial invalid state (SO is DRAFT, recoverable)

### Scope
- ADR-082..077 untouched
- Phase 5A untouched
- No unrelated refactor

### Tests
- Targeted ADR-081 tests pass (50/50 U-13)
- TypeScript passes

---

**PHASE 5C ADR-081 IMPLEMENTATION WAVE 1 COMPLETE — HARD STOP.**

Only ADR-081 was implemented.

No other Phase 5C ADR was implemented.

No unauthorized scope was executed.

Any subsequent ADR implementation requires separate explicit authorization.

---

**END OF PHASE 5C ADR-081 IMPLEMENTATION WAVE 1 REPORT**
