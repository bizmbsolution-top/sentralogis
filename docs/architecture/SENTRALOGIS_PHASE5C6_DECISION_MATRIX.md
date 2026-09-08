# SENTRALOGIS — PHASE 5C-6
# DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Classification | Evidence | Recommendation |
|----------|---------------|----------|----------------|
| Legacy rate migration | C | fw_price_master, crm_sbu_customer_rates, md_billing_rates | Backfill + Cutover |
| Historical data treatment | C | Committed prices immutable | Freeze legacy |
| Open transaction treatment | C | Quote → SO flow | Migrate to canonical |
| Quote pricing migration | C | nego_price mutable | Snapshot at SO creation |
| BUY/SELL mapping | B | All SELL-side | Derivable |
| Currency mapping | B | Explicit columns | Reuse |
| UOM mapping | B | Explicit columns | Reuse |
| Version reconstruction | C | Partial versioning | Document gap |
| Override migration | C | Browser-direct | Server-side governance |
| Financial dependencies | B | Revenue recognition | Preserve lineage |
| Cutover model | C | Risk assessment | Backfill + Cutover |
| Decommission model | C | Prerequisite-based | Deprecate after canonical operational |

**Legend:** A = Governed, B = Derivable, C = Decision required, D = Future
