# SENTRALOGIS — PHASE 5C-6
# LEGACY PRICING MIGRATION & DECOMMISSIONING
# DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** YELLOW — ARCHITECTURE DECISION REQUIRED  
**Phase:** 5C-6 — Discovery  

---

## 1. Executive Decision

**PHASE 5C-6: YELLOW — ARCHITECTURE DECISION REQUIRED**

Legacy pricing structures identified. Migration strategy requires architecture decision. No implementation authorized.

---

## 2. Scope

| Category | Structures |
|----------|------------|
| Forwarding pricing | `fw_price_master`, `fw_container_items`, `fw_order_headers`, `fw_legs` |
| CRM pricing | `crm_sbu_customer_rates`, `crm_quotation_items` |
| Warehouse pricing | `md_billing_rates` |
| SO pricing | `total_agreed_revenue` |
| Legacy views | `v_legacy_fw_consolidations`, `v_legacy_fw_containers` |

---

## 3. Legacy Pricing Inventory

| Structure | Domain | SBU | Purpose | Writer | Reader | Browser-direct |
|-----------|--------|-----|---------|--------|--------|---------------|
| `fw_price_master` | Forwarding | FWD | Rate card | price page | AddForwardingItemModal | YES |
| `fw_container_items` | Forwarding | FWD | Price snapshot | forwarding-writer | tracking page | NO |
| `crm_sbu_customer_rates` | CRM | ALL | Customer rates | rates page | quotation page | YES |
| `crm_quotation_items` | CRM | ALL | Quote pricing | quotation page | SO create | YES |
| `md_billing_rates` | Warehouse | WH | Billing rates | ContractWizard | billing page | YES |
| `total_agreed_revenue` | Commercial | ALL | Header revenue | SO create | SO detail | NO |

---

## 4. Writer/Reader Matrix

| Structure | Writers | Readers | Browser-direct |
|-----------|---------|---------|---------------|
| `fw_price_master` | `sbu/forwarding/master/price/page.tsx` | `AddForwardingItemModal.tsx`, `forwardingActions.ts` | YES |
| `crm_sbu_customer_rates` | `commercial/rates/page.tsx` | `quotations/[id]/page.tsx` | YES |
| `crm_quotation_items` | `quotations/[id]/page.tsx` | SO create, `forwardingActions.ts` | YES |
| `md_billing_rates` | `ContractWizard.tsx` | `billing/page.tsx` | YES |
| `total_agreed_revenue` | `sales-orders/create/page.tsx` | `sales-orders/[id]/page.tsx` | NO |

---

## 5. Data Semantic Classification

| Structure | Semantic | Canonical Replacement |
|-----------|----------|---------------------|
| `fw_price_master` | Rate definition | `pricing_rates` + `pricing_rate_items` |
| `fw_container_items.sell_price_snapshot` | Committed price | `sales_order_line_items.price_snapshot` |
| `crm_sbu_customer_rates` | Customer rate | `pricing_rate_items` (customer-specific) |
| `crm_quotation_items.nego_price` | Negotiated price | `price_snapshot` (at SO creation) |
| `md_billing_rates` | Contract rate | `pricing_rate_items` |
| `total_agreed_revenue` | Derived aggregate | SUM of SO line totals |

---

## 6. Canonical Replacement Mapping

| Legacy Field | Canonical Field | Mapping |
|--------------|----------------|---------|
| `fw_price_master.sell_price` | `pricing_rate_items.unit_rate` | DIRECT |
| `fw_price_master.origin_port` | `pricing_rate_items.applicability_conditions` | TRANSFORM |
| `crm_sbu_customer_rates.unit_price` | `pricing_rate_items.unit_rate` | DIRECT |
| `crm_quotation_items.nego_price` | `price_snapshot.unit_rate_snapshot` | DIRECT |
| `md_billing_rates.rate_value` | `pricing_rate_items.unit_rate` | DIRECT |
| `total_agreed_revenue` | SUM(`line_total`) | DERIVED |

---

## 7. BUY/SELL Analysis

| Structure | BUY/SELL | Derivability |
|-----------|----------|-------------|
| `fw_price_master` | SELL only | YES (side = SELL) |
| `crm_sbu_customer_rates` | SELL only | YES |
| `crm_quotation_items` | SELL only | YES |
| `md_billing_rates` | SELL only | YES |
| `fw_container_items` | SELL only | YES |

---

## 8. Currency/UOM Analysis

| Structure | Currency | UOM | Explicit? |
|-----------|----------|-----|-----------|
| `fw_price_master` | `currency` column | `service_type` | YES |
| `crm_sbu_customer_rates` | `currency` column | `uom` | YES |
| `crm_quotation_items` | Implicit IDR | `uom` | PARTIAL |
| `md_billing_rates` | `currency` column | `uom` | YES |

---

## 9. Version/Effective-Period Analysis

| Structure | Versioning | Effective Date |
|-----------|------------|----------------|
| `fw_price_master` | `effective_date` + `expiry_date` | YES |
| `crm_sbu_customer_rates` | None | NO |
| `crm_quotation_items` | None | NO |
| `md_billing_rates` | `valid_from` + `valid_to` | YES |

---

## 10. Quote → SO Analysis

| Step | Current | Required |
|------|---------|----------|
| Quote item pricing | `nego_price` mutable | Snapshot at SO creation |
| SO creation | No price copy | Copy quote prices + snapshot |
| Price snapshot | None | `price_snapshot` JSONB |

---

## 11. Override Analysis

| Structure | Override | Governance |
|-----------|----------|------------|
| `crm_quotation_items.nego_price` | Mutable edit | NONE (browser-direct) |
| `fw_price_master` | Full CRUD | NONE (browser-direct) |

---

## 12. Financial Dependency Analysis

| Structure | Financial Dependency |
|-----------|---------------------|
| `fw_container_items.sell_price_snapshot` | Forwarding revenue recognition |
| `crm_quotation_items` | Quote → SO revenue |
| `total_agreed_revenue` | SO header display |

---

## 13. Historical Data Strategy

| Category | Strategy |
|----------|----------|
| Historical prices | FREEZE (immutable) |
| Open transactions | MIGRATE to canonical |
| Future pricing | Use canonical `lib/pricing/` |
| Committed transactions | Retain as legacy |

---

## 14. Migration Strategy Options

| Model | Description | Risk |
|-------|-------------|------|
| A — Big Bang | All at once | HIGH |
| B — Dual Read | Canonical authoritative, legacy readable | MEDIUM |
| C — Adapter Boundary | Legacy behind adapters | MEDIUM |
| D — Backfill + Cutover | Historical backfill, future canonical | LOW |

**Recommendation: D — Backfill + Cutover**

---

## 15. Cutover Strategy

| Phase | Action |
|-------|--------|
| Before cutover | Legacy behavior unchanged |
| Cutover | New transactions use canonical pricing |
| After cutover | Legacy read-only |

---

## 16. Decommission Strategy

| Structure | Classification | Prerequisite |
|-----------|---------------|-------------|
| `fw_price_master` | DEPRECATE | Canonical rates fully operational |
| `crm_sbu_customer_rates` | DEPRECATE | Canonical rates fully operational |
| `md_billing_rates` | DEPRECATE | Canonical rates fully operational |
| `crm_quotation_items.nego_price` | ADAPTER | Quote → SO snapshot flow |
| `total_agreed_revenue` | ADAPTER | Derived from line totals |

---

## 17. Security Findings

| Finding | Severity |
|---------|----------|
| Browser-direct pricing writes | HIGH |
| No server-side override authorization | HIGH |
| No audit trail for price changes | HIGH |

---

## 18. Migration Blockers

| Blocker | Resolution |
|---------|------------|
| Browser-direct writes | Migrate to server actions |
| No version history | Cannot reconstruct — document gap |
| Implicit currency | Fail explicitly or default to IDR |

---

## 19. Architecture Decisions Required

| Decision | Classification |
|----------|---------------|
| Migration model | C (Backfill + Cutover) |
| Historical data treatment | C (Freeze legacy) |
| Quote → SO flow | C (Snapshot at creation) |
| BUY/SELL mapping | B (Derivable) |
| Currency mapping | B (Explicit) |

---

## 20. Recommended Next Phase

```
5C-7: Legacy Pricing Migration Implementation (future authorization)
```

---

## PHASE 5C-6 DISCOVERY FINAL GATE

```
==================================================
PHASE 5C-6 DISCOVERY FINAL GATE
==================================================

Legacy Inventory:
PASS

Writer/Reader Forensics:
PASS

Semantic Classification:
PASS

Canonical Mapping:
PASS

BUY / SELL:
PASS

Currency / UOM:
PASS

Version / Effective Period:
PASS

Quote → SO:
PASS

Override:
PASS

Financial Dependencies:
PASS

Historical Strategy:
PASS

Migration Strategy:
PASS

Cutover Strategy:
PASS

Decommission Strategy:
PASS

Security:
PASS

Cross-ADR Consistency:
PASS

TypeScript:
PASS

Full Regression:
PASS

Architecture Status:
YELLOW

Implementation:
NOT EXECUTED

5C-7:
NOT AUTHORIZED

IMPLEMENTATION HARD STOP:
YES

Human Architecture Ratification:
PENDING
==================================================
```

---

**END OF PHASE 5C-6 DISCOVERY REPORT**
