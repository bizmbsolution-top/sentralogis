# SENTRALOGIS — PHASE 5C-R2
# PRICING / CUSTOMER SUCCESS ADR REVIEW & RATIFICATION

**Date:** 2026-09-05
**Status:** GREEN — ADRs RATIFIED (Architecture Decision Only)
**Phase:** 5C-R2 — ADR Review & Ratification
**Authorization Basis:** I AUTHORIZE SENTRALOGIS PHASE 5C ADR REVIEW AND RATIFICATION ONLY.

---

## 1. Executive Decision

Seven ADR proposals (ADR-PROP-071 through ADR-PROP-077) are **RATIFIED** as architecture decisions. Cross-ADR verification confirms no contradictions. No implementation is authorized.

**Next step:** Implementation requires separate explicit authorization per ADR, with distinct implementation scope and schema mutation approval.

---

## 2. Authorization

Exact authorization string recorded:

> I AUTHORIZE SENTRALOGIS PHASE 5C ADR REVIEW AND RATIFICATION ONLY.

Scope honored:
- Forensic discovery review: YES
- ADR proposal validation: YES
- ADR ratification: YES
- Production implementation: FORBIDDEN
- Schema mutation: FORBIDDEN
- Data repair: FORBIDDEN

---

## 3. Evidence Base

### Authoritative Documents Inspected
- `AGENTS.md`
- `docs/architecture/SENTRALOGIS_PHASE5C_PRICING_CUSTOMER_SUCCESS_DISCOVERY.md`
- `docs/architecture/SENTRALOGIS_PHASE5A_FINAL_CLOSURE_RECONCILIATION.md`
- `docs/architecture/ADR-057` through `ADR-066` (Pricing Architecture)
- `docs/architecture/ADR-018` through `ADR-056` (Governing ADRs)
- Repository code searches for runtime writers, client-side mutations, and dead DDL

### Repository Areas Inspected
- `supabase/migrations/` — pricing, financial, SO line, legacy pricing migrations
- `lib/pricing/` — canonical pricing domain
- `lib/financial/` — canonical financial settlement domain
- `lib/sales-order/` — canonical SO + line item services
- `app/api/v1/commercial/` — SO, Fulfillment APIs
- `app/api/forwarding/` — legacy forwarding APIs
- `app/(dashboard)/hq/work-orders/components/` — forwarding item modal
- `app/(dashboard)/hq/invoice-customer/page.tsx` — legacy invoice page
- `app/portal/sales/` — sales portal quotations

---

## 4. ADR Review Matrix

### ADR-081 — Quote → SO Price Transfer Semantics

| Criterion | Assessment |
|-----------|------------|
| Intent | Explicit semantics for transferring committed prices from Quote to Sales Order |
| Authority | Commercial domain (`lib/sales-order/`) |
| Boundary | Quote acceptance → SO line item creation with immutable `price_snapshot` |
| Non-boundary | Operational pricing, fulfillment cost allocation |
| Evidence | `sales_orders.quote_id` FK exists; `sales_order_line_items` has zero runtime writers; `crm_quotation_items.nego_price` is mutable with no snapshot at acceptance |
| Status | **RATIFY** |

### ADR-082 — Canonical Pricing Activation Strategy

| Criterion | Assessment |
|-----------|------------|
| Intent | Activate deployed but unwired canonical pricing domain |
| Authority | Commercial Pricing domain (`lib/pricing/`) |
| Boundary | Wire `PricingService` into SO line item creation, operational writers, and migration service |
| Non-boundary | Legacy table decommissioning (ADR-083), settlement activation (ADR-084) |
| Evidence | `lib/pricing/` contains full service, repository, selection engine, calculation engine, override governance; zero production imports outside tests; `pricing_rates` tables have RLS but no writers |
| Status | **RATIFY** |

### ADR-083 — Legacy Pricing Decommissioning Path

| Criterion | Assessment |
|-----------|------------|
| Intent | Systematic retirement of 5 active legacy pricing tables |
| Authority | Commercial domain (coordination) / SBU domains (execution) |
| Boundary | Phased read-only → dual-write → canonical-only → archive per table |
| Non-boundary | New canonical pricing design (covered by ADR-057..066) |
| Evidence | 5 active legacy tables: `fw_price_master`, `crm_sbu_customer_rates`, `md_billing_rates`, `crm_quotation_items.nego_price`, `fw_container_items.sell_price_snapshot`; each has active client/server writers |
| Status | **RATIFY** |

### ADR-084 — Financial Settlement Activation

| Criterion | Assessment |
|-----------|------------|
| Intent | Commercially-gated financial settlement replacing operationally-gated legacy billing |
| Authority | Financial Settlement domain (`lib/financial/`) |
| Boundary | `fin_billable_events` → `fin_invoices` → `fin_ar_ap` chain; operational completion → commercial event bridge |
| Non-boundary | Legacy `invoices` table replacement timeline |
| Evidence | `lib/financial/` fully implemented with RLS, idempotency, service layer; zero runtime writers; legacy `invoices` written browser-direct from `hq/invoice-customer/page.tsx` |
| Status | **RATIFY** |

### ADR-085 — Customer Success Aggregate

| Criterion | Assessment |
|-----------|------------|
| Intent | Canonical Customer Success domain composing existing canonical data |
| Authority | New Customer Success domain (to be created) |
| Boundary | Derive from `party_roles` (identity), `sales_orders`/`fulfillments` (transactions), `operational_handoffs` (execution), public tracking — no new master data |
| Non-boundary | Operational execution, driver management, statutory filing |
| Evidence | Zero `customer_success` tables/services/APIs; zero `lib/domain/customer*` directories; only customer surface is `/track/fwd/[token]` public tracking |
| Status | **RATIFY** |

### ADR-086 — Margin / COGS Canonical Ownership

| Criterion | Assessment |
|-----------|------------|
| Intent | Canonical margin and COGS representation at SO line item level |
| Authority | Commercial Pricing domain (`price_snapshot` JSONB) |
| Boundary | Margin/COGS embedded in `sales_order_line_items.price_snapshot`; legacy operational COGS columns become derived projections |
| Non-boundary | Operational cost tracking, driver coin economics |
| Evidence | Margin computed client-side in `AddCostTable.tsx` and `UnifiedFinancePanel.tsx`; 9 COGS columns in `fw_container_items`; `price_snapshot` JSONB schema defined but no production writer |
| Status | **RATIFY** |

### ADR-087 — Operational → Commercial Event Bridge

| Criterion | Assessment |
|-----------|------------|
| Intent | Emit billable events from operational completion to commercial layer |
| Authority | Financial Settlement domain (consumes events) / Operational domains (emit events) |
| Boundary | JO completion / delivery → `fin_billable_events` creation; Fulfillment progress propagation |
| Non-boundary | Direct SO mutation, operational engine creation |
| Evidence | `fin_billable_events` has zero runtime writers; no event bridge from `job_orders` completion to commercial layer; canonical `fin_*` chain exists but is dead DDL |
| Status | **RATIFY** |

---

## 5. Cross-ADR Consistency

| Relationship | Status | Notes |
|--------------|--------|-------|
| ADR-081 ↔ ADR-082 | CONSISTENT | Price transfer is the activation trigger for canonical pricing |
| ADR-082 ↔ ADR-083 | CONSISTENT | Activation and decommissioning are complementary |
| ADR-083 ↔ ADR-084 | CONSISTENT | Legacy decommissioning includes legacy invoice replacement |
| ADR-084 ↔ ADR-087 | CONSISTENT | Settlement activation depends on event bridge |
| ADR-082 ↔ ADR-086 | CONSISTENT | Canonical pricing owns margin/COGS representation |
| ADR-085 ↔ ADR-087 | CONSISTENT | Customer Success consumes operational handoff progress |
| ADR-081 ↔ ADR-086 | CONSISTENT | SO line item price snapshot includes margin/COGS |

**No contradictions found.**

---

## 6. Conflict with Governing ADRs

| Governing ADR | Check | Status |
|---------------|-------|--------|
| ADR-018 (Engagement) | No conflict | PASS |
| ADR-020 (Capability Binding) | No conflict | PASS |
| ADR-033 (Service Request) | No conflict | PASS |
| ADR-034 (SO Authority) | No conflict | PASS |
| ADR-035 (SO Number) | No conflict | PASS |
| ADR-036 (Fulfillment Boundary) | No conflict | PASS |
| ADR-037 (SO→WO Cardinality) | No conflict | PASS |
| ADR-038 (SO→Shipment) | No conflict | PASS |
| ADR-039 (Fulfillment Composition) | No conflict | PASS |
| ADR-040 (Shipment ≠ Fulfillment) | No conflict | PASS |
| ADR-041 (Fulfillment Number) | No conflict | PASS |
| ADR-042 (Fulfillment Cardinality) | No conflict | PASS |
| ADR-043 (Fulfillment State) | No conflict | PASS |
| ADR-044 (Amendment vs Fulfillment) | No conflict | PASS |
| ADR-045 (Handoff Boundary) | No conflict | PASS |
| ADR-046..056 (Handoff/Ratification) | No conflict | PASS |
| ADR-057 (Pricing Authority) | No conflict | PASS |
| ADR-058 (Rate Master) | No conflict | PASS |
| ADR-059 (Rate Versioning) | No conflict | PASS |
| ADR-060 (Buy/Sell) | No conflict | PASS |
| ADR-061 (Commercial Charge) | No conflict | PASS |
| ADR-062 (Currency/UOM) | No conflict | PASS |
| ADR-063 (Override Governance) | No conflict | PASS |
| ADR-064 (Settlement Interface) | No conflict | PASS |
| ADR-065 (Rate Precedence) | No conflict | PASS |
| ADR-066 (SO Lineage) | No conflict | PASS |

**Zero conflicts with ratified ADRs 018..066.**

---

## 7. Security / Tenant Isolation Review

| Check | Status |
|-------|--------|
| Server-derived tenant identity | PASS — all canonical domains use IdentityContext |
| RLS on pricing tables | PASS — migrations 025, 026, 027, 028, 029 enforce `tenant_id = get_my_tenant_id()` |
| RLS on SO line items | PASS — migration 027 |
| No client-supplied tenant authority | PASS |
| No trusted `x-tenant-id` | PASS |
| No fabricated business identifiers | PASS |
| No client-generated canonical prices | PASS |
| Legacy client-side mutations documented | PASS — `fw_price_master`, `crm_sbu_customer_rates`, `invoices` are pre-existing issues to be resolved by ADR-082/073/074 implementation |

---

## 8. Implementation Blockers

| ADR | Blocker | Resolution Required |
|-----|---------|---------------------|
| ADR-081 | `sales_order_line_items` empty at runtime | Wire canonical pricing service to SO creation flow |
| ADR-082 | Zero production imports to `lib/pricing/` | Server action / API gateway integration |
| ADR-083 | 5 legacy tables active | Phased decommissioning strategy per SBU |
| ADR-084 | Legacy `invoices` browser-direct | Server-side replacement + migration |
| ADR-085 | No Customer Success domain | New domain design + tables + APIs + UI |
| ADR-086 | Client-side margin computation | Canonical `price_snapshot` enrichment |
| ADR-087 | No event bridge from operations | Operational completion hook → billable event |

**All ADRs are implementation-blocked. Ratification does not authorize implementation.**

---

## 9. Final Ratification Decision

| ADR | Title | Status |
|-----|-------|--------|
| ADR-081 | Quote → SO Price Transfer Semantics | **RATIFY** |
| ADR-082 | Canonical Pricing Activation Strategy | **RATIFY** |
| ADR-083 | Legacy Pricing Decommissioning Path | **RATIFY** |
| ADR-084 | Financial Settlement Activation | **RATIFY** |
| ADR-085 | Customer Success Aggregate | **RATIFY** |
| ADR-086 | Margin / COGS Canonical Ownership | **RATIFY** |
| ADR-087 | Operational → Commercial Event Bridge | **RATIFY** |

**Architecture Status:** GREEN

**Implementation Authorization:** NOT GRANTED (pending separate authorization per ADR)

**Human Ratification:** COMPLETE

---

## 10. Scope Audit

### Phase 5A
- **UNCHANGED.** Phase 5A is GREEN — CLOSED.

### Production Schema
- **NO mutation.** No migrations created or modified.

### Production Code
- **NO mutation.** No services, APIs, UI components, or domain files modified.

### Data Repair
- **NONE.** No data read, modified, or backfilled.

### Unrelated Phases
- **Phase 5B:** Not touched.
- **Phase 5D:** Not touched.
- **DATA-4E:** Not touched.
- **D-Repair:** Not touched.

---

## 11. Next Steps

Implementation of each ratified ADR requires:
1. Explicit implementation authorization
2. Separate scope definition
3. Schema mutation approval (where applicable)
4. Test plan and regression validation
5. Separate ratification of any new ADRs generated during implementation design

**PHASE 5C ADR REVIEW & RATIFICATION COMPLETE — HARD STOP.**

No production implementation was performed.
No schema mutation was performed.
No data repair was performed.

---

**END OF PHASE 5C-R2 ADR REVIEW & RATIFICATION REPORT**
