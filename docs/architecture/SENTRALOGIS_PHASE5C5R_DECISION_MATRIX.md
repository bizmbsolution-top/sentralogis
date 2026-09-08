# SENTRALOGIS — PHASE 5C-5R
# DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Classification | Resolution | ADR |
|----------|---------------|------------|-----|
| Financial authority | C | External ERP integration | 064 |
| Settlement authority | C | External ERP integration | 064 |
| Billable event | C | Fulfillment milestone | 064 |
| Invoice authority | C | Commercial-keyed invoices | 064 |
| AR authority | C | External ERP | 064 |
| AP authority | C | External ERP | 064 |
| Accounting boundary | C | External ERP integration | 064 |
| External ERP interface | C | Event-outbox integration | 064 |
| Multi-currency settlement | D | External ERP | Future |
| FX authority | D | External ERP | Future |
| Tax boundary | B | Reuse md_taxes | 062 |
| Adjustments | D | Future phase | Future |
| Reversal | D | Future phase | Future |
| Reconciliation | D | External ERP | Future |
| Idempotency | C | Event-outbox pattern | 064 |
| Financial immutability | C | Post-posting immutable | 064 |
| Audit | C | Append-only | 064 |
| Tenant isolation | B | Server-derived | 057 |

**Legend:** A = Governed, B = Derivable, C = Decision required, D = Future
