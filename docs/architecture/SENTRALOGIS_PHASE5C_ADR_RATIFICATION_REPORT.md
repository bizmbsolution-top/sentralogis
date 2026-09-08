# SENTRALOGIS — PHASE 5C-R
# PRICING ARCHITECTURE DECISION & ADR RATIFICATION

**Date:** 2026-09-01  
**Status:** GREEN — ADRs READY FOR RATIFICATION  
**Phase:** 5C-R — Pricing Architecture Decision  

---

## Executive Decision

The eight ADRs (057-064) form a **consistent, canonical pricing architecture** for SENTRALOGIS. Cross-ADR verification confirms no contradictions. The architecture is ready for human ratification.

**Next step:** After ratification, proceed to Phase 5C-1 (Pricing Foundation Implementation).

---

## Current Pricing Problem

Phase 5C discovered:
- 5 disconnected pricing structures across domains
- No canonical pricing authority
- No Sales Order line-item pricing lineage
- No price snapshot mechanism (historical prices mutable)
- No buy/sell distinction
- No currency/UOM infrastructure
- Browser-direct pricing writes with no permission check
- Legacy operational tables (`wo_items`, `job_orders`) lack RLS

---

## Target Architecture

```
                    COMMERCIAL DOMAIN
                           │
                           ▼
                     RATE MASTER
                           │
                           ▼
                    RATE VERSION
                           │
                           ▼
                 PRICING CALCULATION
                           │
                           ▼
                  COMMERCIAL CHARGES
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
           QUOTE                    SALES ORDER
             │                           │
             └─────────────┬─────────────┘
                           ▼
                    FULFILLMENT
                           │
                           ▼
                      OPERATIONS
                           │
                           ▼
                 FINANCIAL SETTLEMENT
```

---

## ADR Summary

### ADR-057 — Pricing Domain Authority
Pricing is a canonical Commercial-domain capability. Owns rates, versions, calculations, snapshots. Does NOT own SO, Fulfillment, Operations, Settlement.

### ADR-058 — Rate Master Model
Three-level hierarchy: Rate → Rate Version → Rate Item. Capability-aware (FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE) without separate engines.

### ADR-059 — Rate Versioning & Price Snapshot
Rate Version controls applicable definition. Price Snapshot preserves committed truth. Critical invariant: future rate changes NEVER mutate committed prices.

### ADR-060 — Buy vs Sell Price Distinction
Independent sell and buy rates. Margin calculated deterministically (not persisted). Buy cost visibility requires explicit permission.

### ADR-061 — Commercial Charge Model
Authoritative committed monetary obligation. Sales Order line items with lineage to Quote and Rate Version. `total_agreed_revenue` becomes derived aggregate.

### ADR-062 — Currency & UOM
Explicit ISO currency codes. Canonical UOM references. Date-effective exchange rates.

### ADR-063 — Price Override Governance
Manual override with full audit trail (reason, actor, timestamp). Approval for large deviations. Post-commitment prices immutable.

### ADR-064 — Financial Settlement Interface
Minimal interface: charge_id, customer, amount, currency, type, source, tax, status. Settlement consumes committed charges only.

---

## Cross-ADR Consistency

| Relationship | Status | Notes |
|--------------|--------|-------|
| ADR-057 ↔ ADR-058 | CONSISTENT | Authority scope matches rate master ownership |
| ADR-058 ↔ ADR-059 | CONSISTENT | Rate model supports versioning |
| ADR-059 ↔ ADR-061 | CONSISTENT | Snapshot feeds commercial charge |
| ADR-060 ↔ ADR-061 | CONSISTENT | Buy/sell feeds charge model |
| ADR-062 ↔ ADR-061 | CONSISTENT | Currency/UOM embedded in charges |
| ADR-063 ↔ ADR-061 | CONSISTENT | Override governed within charge lifecycle |
| ADR-064 ↔ ADR-061 | CONSISTENT | Settlement interface consumes charges |
| ADR-057 ↔ ADR-064 | CONSISTENT | Pricing authority doesn't extend to settlement |

**No contradictions found.**

---

## Legacy Structure Disposition

| Structure | Classification | Future Role | Migration |
|-----------|---------------|-------------|-----------|
| `fw_price_master` | LEGACY | Adapter → canonical rate model | M2 |
| `crm_sbu_customer_rates` | LEGACY | Adapter → canonical rate model | M2 |
| `md_billing_rates` | LEGACY | Adapter → canonical rate model | M2 |
| `crm_quotation_items` | ADAPT | Add snapshot fields | M6 |
| `total_agreed_revenue` | ADAPT | Become derived aggregate | M5 |
| `fw_container_items` | KEEP | Operational snapshot (already correct) | — |
| `commercial_line_items` | DEPRECATE | Dormant, wrong parent FK | M8 |

---

## Security Findings

| Finding | Severity | Resolution |
|---------|----------|------------|
| `fw_price_master` written browser-direct | HIGH | Migrate to server actions (Phase 5C-1) |
| `crm_sbu_customer_rates` written browser-direct | HIGH | Migrate to server actions (Phase 5C-1) |
| `wo_items` lacks RLS | HIGH | Separate remediation (not pricing blocker) |
| `job_orders` lacks RLS | HIGH | Separate remediation (not pricing blocker) |
| `fetchMasterSellingPrice` always returns null | HIGH | Fix CHECK constraint mismatch (Phase 5C-1) |
| `cogs_thc_dest` silently dropped to 0 | HIGH | Fix forwarding-writer (Phase 5C-1) |

---

## Browser Mutation Findings

| File | Table | Issue | Resolution |
|------|-------|-------|------------|
| `price/page.tsx` | `fw_price_master` | Full CRUD browser-direct | Server actions |
| `commercial/rates/page.tsx` | `crm_sbu_customer_rates` | Full CRUD browser-direct | Server actions |
| `ContractWizard.tsx` | `md_billing_rates` | Full CRUD browser-direct | Server actions |
| `commercial/quotations/[id]/page.tsx` | `crm_quotation_items` | Price updates browser-direct | Server actions |

---

## Tenant Model

- All pricing master data is tenant-scoped (`tenant_id`).
- Server-derived tenant identity (IdentityContext).
- RLS as independent enforcement layer.
- Cross-tenant rate access impossible.

---

## Migration Strategy

| Step | Description |
|------|-------------|
| M1 | Create canonical rate model tables |
| M2 | Migrate `fw_price_master`, `crm_sbu_customer_rates`, `md_billing_rates` to canonical model |
| M3 | Create pricing calculation service |
| M4 | Create `sales_order_items` table |
| M5 | Link SO line items to `total_agreed_revenue` (derived) |
| M6 | Add snapshot fields to Quote items |
| M7 | Create legacy adapters |
| M8 | Deprecate `commercial_line_items` |

---

## Implementation Phase Plan

| Phase | Description |
|-------|-------------|
| 5C-1 | Pricing Foundation (rate model, server actions, fix bugs) |
| 5C-2 | Rate Master + Versioning |
| 5C-3 | Pricing Calculation |
| 5C-4 | Commercial Charge / SO Lineage |
| 5C-5 | Quote Integration |
| 5C-6 | Legacy Migration / Adapter |
| 5C-7 | Forensic Acceptance |

---

## GAP

| ID | Description | Status |
|----|-------------|--------|
| GAP-01 | No canonical pricing engine | RESOLVED by ADR-057 |
| GAP-02 | No SO line items | RESOLVED by ADR-061 |
| GAP-03 | No Quote→SO continuity | RESOLVED by ADR-061 |
| GAP-04 | No price snapshot | RESOLVED by ADR-059 |
| GAP-05 | No buy/sell distinction | RESOLVED by ADR-060 |
| GAP-06 | No currency infrastructure | RESOLVED by ADR-062 |
| GAP-07 | No UOM standardization | RESOLVED by ADR-062 |

---

## RISK

| ID | Description | Status |
|----|-------------|--------|
| RISK-01 | Browser-direct pricing writes | MITIGATED by server action migration |
| RISK-02 | `fetchMasterSellingPrice` null | MITIGATED by bug fix |
| RISK-03 | `cogs_thc_dest` data loss | MITIGATED by bug fix |
| RISK-04 | Mutable historical prices | MITIGATED by ADR-059 |
| RISK-05 | Legacy tables lack RLS | DOCUMENTED (separate remediation) |

---

## DEBT

| ID | Description |
|----|-------------|
| DEBT-01 | `commercial_line_items` dormant |
| DEBT-02 | `service_pricing` planned but not built |
| DEBT-03 | `vendor_*_cost_breakdown` unused |

---

## Acceptance Gates

- [x] Pricing authority explicit (ADR-057)
- [x] Rate Master explicit (ADR-058)
- [x] Rate Version explicit (ADR-059)
- [x] Price Snapshot explicit (ADR-059)
- [x] Buy/Sell explicit (ADR-060)
- [x] Commercial Charge explicit (ADR-061)
- [x] SO line-item relationship explicit (ADR-061)
- [x] Quote relationship explicit (ADR-061)
- [x] Currency explicit (ADR-062)
- [x] UOM explicit (ADR-062)
- [x] Override governance explicit (ADR-063)
- [x] Settlement interface explicit (ADR-064)
- [x] Tenant model explicit (ADR-057, ADR-058)
- [x] Authorization explicit (ADR-057, ADR-060, ADR-063)
- [x] Legacy disposition explicit (Report)
- [x] Migration strategy explicit (Report)
- [x] Cross-ADR consistency verified (Report)
- [x] No competing pricing authority undefined

---

## Final Decision

**GREEN — ADRs READY FOR RATIFICATION**

All architectural questions are resolved. The eight ADRs form a consistent canonical pricing architecture. No implementation yet — await human ratification before proceeding to Phase 5C-1.

---

**END OF PHASE 5C-R REPORT**
