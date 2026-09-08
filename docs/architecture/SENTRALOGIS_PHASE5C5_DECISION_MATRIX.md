# SENTRALOGIS — PHASE 5C-5
# CROSS-DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Current State | Classification | Proposed Resolution | ADR |
|----------|---------------|----------------|---------------------|-----|
| Financial authority | GAP | C | External ERP integration | 064 |
| Settlement authority | GAP | C | External ERP integration | 064 |
| Invoice authority | Operational | C | Commercial-keyed invoices | 064 |
| AR/AP authority | GAP | C | External ERP integration | 064 |
| SELL settlement | GAP | C | External ERP integration | 064 |
| BUY settlement | GAP | C | External ERP integration | 064 |
| Billable event | GAP | C | Fulfillment/execution milestone | 064 |
| Invoice boundary | Operational | C | Commercial-keyed | 064 |
| Payment boundary | GAP | D | External ERP | Future |
| Accounting boundary | DEAD | C | External ERP integration | 064 |
| External ERP interface | GAP | C | Event-outbox integration | 064 |
| Multi-currency settlement | GAP | D | External ERP | Future |
| FX authority | GAP | D | External ERP | Future |
| Tax authority | md_taxes | B | Reuse canonical | 062 |
| Credit/debit adjustment | GAP | D | Future phase | Future |
| Reversal | GAP | D | Future phase | Future |
| Reconciliation | GAP | D | External ERP | Future |
| Idempotency | GAP | C | Event-outbox pattern | 064 |
| Financial immutability | GAP | C | Post-posting immutable | 064 |
| Audit | GAP | C | Append-only | 064 |
| Tenant isolation | PARTIAL | B | Server-derived | 057 |

**Legend:** A = Governed, B = Derivable, C = Decision required, D = Future
