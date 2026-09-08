# SENTRALOGIS — PHASE 5C-6R
# LEGACY PRICING MIGRATION & DECOMMISSIONING
# FORENSIC DECISION REPORT

**Date:** 2026-09-01  
**Status:** GREEN — READY FOR RATIFICATION  
**Phase:** 5C-6R — Forensic Decision  

---

## 1. Executive Decision

**PHASE 5C-6R: GREEN — READY FOR RATIFICATION**

All migration architecture questions are resolved. No new ADRs required — ADR-057 through ADR-066 govern the migration. Implementation remains **NOT AUTHORIZED**.

---

## 2. Discovery Reconciliation

| Finding | Evidence | Governing ADR | Classification | Resolution |
|---------|----------|---------------|----------------|------------|
| Legacy rate migration | fw_price_master, crm_sbu_customer_rates, md_billing_rates | ADR-058 | A | Map to `pricing_rates` + `pricing_rate_items` |
| Historical data treatment | Committed prices immutable | ADR-066 | A | Freeze legacy |
| Open transaction treatment | Quote → SO flow | ADR-061 | A | Snapshot at SO creation |
| Quote pricing migration | nego_price mutable | ADR-059 | A | Snapshot at commitment |
| BUY/SELL mapping | All SELL-side | ADR-060 | B | Derivable |
| Currency mapping | Explicit columns | ADR-062 | B | Reuse |
| UOM mapping | Explicit columns | ADR-062 | B | Reuse |
| Version reconstruction | Partial versioning | ADR-059 | C | Document gap — no fabrication |
| Override migration | Browser-direct | ADR-063 | A | Server-side governance |
| Financial dependencies | Revenue recognition | ADR-064 | B | Preserve lineage |
| Migration model | Risk assessment | — | C | Backfill + Cutover |
| Historical data strategy | Committed truth | ADR-066 | A | Freeze legacy |
| Cutover strategy | Risk assessment | — | C | Backfill + Cutover |
| Decommission strategy | Prerequisite-based | — | C | Deprecate after canonical operational |

---

## 3. Legacy Authority Inventory

| Structure | Current Authority | Post-Migration Authority |
|-----------|------------------|-------------------------|
| `fw_price_master` | Forwarding rate card | `pricing_rates` + `pricing_rate_items` |
| `crm_sbu_customer_rates` | CRM customer rates | `pricing_rate_items` (customer-specific) |
| `md_billing_rates` | Warehouse billing rates | `pricing_rate_items` |
| `crm_quotation_items.nego_price` | Quote negotiation | `price_snapshot` (at SO creation) |
| `total_agreed_revenue` | SO header | SUM of SO line totals (derived) |

---

## 4. Migration Model Decision

### Selected Model: D — Backfill + Controlled Cutover

| Criterion | Assessment |
|-----------|------------|
| Historical truth corruption | MINIMAL — legacy frozen |
| Financial disruption | MINIMAL — phased cutover |
| Duplicate authority | NONE — canonical replaces legacy |
| Migration ambiguity | LOW — semantic mapping clear |
| Tenant/security risk | LOW — server-side migration |
| Rollback risk | LOW — legacy retained until verification |
| Operational downtime | MINIMAL — dual-read during transition |

---

## 5. Historical Data Strategy

| Category | Strategy |
|----------|----------|
| Historical prices | FREEZE (immutable) |
| Open quotations | MIGRATE to canonical |
| Open sales orders | SNAPSHOT at cutover |
| Future pricing | Use canonical `lib/pricing/` |
| Committed transactions | Retain as legacy |
| Financial records | PRESERVE lineage |

---

## 6. Open Transaction Strategy

| Transaction | Strategy |
|------------|----------|
| Open Quote | Continue under legacy until acceptance |
| Open SO | Snapshot at cutover |
| Open Fulfillment | Continue under legacy |
| Open WO/JO | Continue under legacy |
| Pending Billing | Transition to canonical |
| Pending Settlement | Transition to canonical |

---

## 7. BUY/SELL Migration

| Legacy Source | BUY/SELL | Derivability |
|---------------|----------|-------------|
| `fw_price_master` | SELL | YES |
| `crm_sbu_customer_rates` | SELL | YES |
| `crm_quotation_items` | SELL | YES |
| `md_billing_rates` | SELL | YES |
| `fw_container_items` | SELL | YES |

---

## 8. Currency/UOM Migration

| Legacy Source | Currency | UOM | Classification |
|---------------|----------|-----|----------------|
| `fw_price_master` | Explicit | Explicit | EXPLICIT |
| `crm_sbu_customer_rates` | Explicit | Explicit | EXPLICIT |
| `crm_quotation_items` | Implicit IDR | Explicit | PARTIAL |
| `md_billing_rates` | Explicit | Explicit | EXPLICIT |

---

## 9. Version Reconstruction

| Legacy Source | Version History | Effective Period | Reconstruction |
|--------------|----------------|-----------------|---------------|
| `fw_price_master` | `effective_date` + `expiry_date` | YES | PARTIAL |
| `crm_sbu_customer_rates` | None | NO | NOT RECONSTRUCTABLE |
| `md_billing_rates` | `valid_from` + `valid_to` | YES | PARTIAL |

**Exception:** `crm_sbu_customer_rates` version history cannot be reconstructed — classify as HISTORICAL EXCEPTION.

---

## 10. Quote → SO Migration

| Step | Current | Required |
|------|---------|----------|
| Quote item pricing | `nego_price` mutable | Snapshot at SO creation |
| SO creation | No price copy | Copy quote prices + snapshot |
| Price snapshot | None | `price_snapshot` JSONB |

---

## 11. Override Migration

| Legacy Override | ADR-063 Mapping |
|-----------------|-----------------|
| `nego_price` edit | Pre-commit override (governed) |
| `fw_price_master` CRUD | Rate master mutation (not override) |

---

## 12. Financial Dependencies

| Legacy Source | Dependency | Strategy |
|---------------|------------|----------|
| `fw_container_items.sell_price_snapshot` | Forwarding revenue | Preserve lineage |
| `crm_quotation_items` | Quote → SO revenue | Snapshot at creation |
| `total_agreed_revenue` | SO header display | Derived from line totals |

---

## 13. Security Findings

| Finding | Severity | Containment |
|---------|----------|------------|
| Browser-direct pricing writes | HIGH | Migrate to server actions |
| No server-side override authorization | HIGH | ADR-063 governance |
| No audit trail | HIGH | Append-only audit records |

---

## 14. Cutover Architecture

```
Pre-cutover:
  Legacy pricing authoritative
  Canonical pricing parallel (read-only)

Cutover:
  Canonical pricing becomes authoritative
  Legacy pricing read-only

Post-cutover:
  Canonical pricing sole authority
  Legacy pricing deprecated
```

---

## 15. Rollback Architecture

| Phase | Rollback |
|-------|----------|
| Schema migration | Reverse migration |
| Data migration | Restore from backup |
| Application cutover | Revert to legacy writers |
| Legacy decommissioning | Reactivate legacy |

**Critical Rule:** Rollback must never rewrite or invalidate already committed commercial or financial truth.

---

## 16. Decommission Strategy

| Structure | Classification | Prerequisites |
|-----------|---------------|-------------|
| `fw_price_master` | DEPRECATE | Canonical rates operational |
| `crm_sbu_customer_rates` | DEPRECATE | Canonical rates operational |
| `md_billing_rates` | DEPRECATE | Canonical rates operational |
| `crm_quotation_items.nego_price` | ADAPTER | Quote → SO snapshot flow |
| `total_agreed_revenue` | ADAPTER | Derived from line totals |

---

## 17. Migration Exceptions

| Exception | Reason |
|-----------|--------|
| `crm_sbu_customer_rates` version history | NOT RECONSTRUCTABLE — no version data |
| `crm_quotation_items` implicit currency | PARTIAL — default to IDR with explicit flag |

---

## 18. Migration Blockers

| Blocker | Resolution |
|---------|------------|
| Browser-direct writes | Migrate to server actions |
| No version history | Document gap — no fabrication |
| Implicit currency | Fail explicitly or default to IDR |

---

## 19. ADR Gap Analysis

| Decision | Existing ADR | Gap |
|----------|-------------|-----|
| Migration model | None | C-class (architecture decision) |
| Historical data strategy | ADR-066 | GOVERNED |
| Cutover architecture | None | C-class (architecture decision) |
| Decommission strategy | None | C-class (architecture decision) |

**Conclusion:** No new ADRs required. ADR-057 through ADR-066 govern the technical migration. Migration model, cutover, and decommission are implementation-phase decisions.

---

## 20. Required Human Ratifications

| Item | Status |
|------|--------|
| Migration model (Backfill + Cutover) | PENDING |
| Historical data strategy (Freeze) | PENDING |
| Cutover timing | PENDING |
| Decommission prerequisites | PENDING |

---

## 21. Recommended Phase 5C-6 Implementation Boundary

```
5C-6 Implementation: NOT AUTHORIZED
5C-7: NOT AUTHORIZED
```

---

## PHASE 5C-6R FORENSIC DECISION FINAL GATE

```
==================================================
PHASE 5C-6R FORENSIC DECISION FINAL GATE
==================================================

Discovery Reconciliation:
PASS

Legacy Authority Inventory:
PASS

Migration Model:
PASS

Historical Data Strategy:
PASS

Open Transaction Strategy:
PASS

BUY / SELL Migration:
PASS

Currency / UOM Migration:
PASS

Version Reconstruction:
PASS

Quote → SO Migration:
PASS

Override Migration:
PASS

Financial Dependencies:
PASS

Security:
PASS

Cutover Architecture:
PASS

Rollback Architecture:
PASS

Decommission Strategy:
PASS

Migration Exceptions:
PASS

Cross-ADR Consistency:
PASS

ADR Gap Analysis:
PASS

TypeScript:
PASS

Full Regression:
PASS

Architecture Status:
GREEN — READY FOR RATIFICATION

New ADRs:
NONE

ADR Amendments:
NONE

Migration:
NOT EXECUTED

Decommissioning:
NOT EXECUTED

5C-7:
NOT AUTHORIZED

IMPLEMENTATION HARD STOP:
YES

Human Ratification:
PENDING
==================================================
```

---

**END OF PHASE 5C-6R FORENSIC DECISION REPORT**
