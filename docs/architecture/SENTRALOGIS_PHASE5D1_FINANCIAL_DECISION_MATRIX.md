# SENTRALOGIS — PHASE 5D-1
# FINANCIAL DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Classification | Existing ADR | Evidence | Resolution | ADR Required |
|----------|---------------|--------------|----------|------------|--------------|
| Financial domain authority | B | ADR-064 | fin_invoices, fin_ar_ap | Sufficient | NO |
| Billable event authority | A | ADR-064 | fin_billable_events | Governed | NO |
| Invoice boundary | A | ADR-064 | fin_invoices | Governed | NO |
| AR authority | A | ADR-064 | fin_ar_ap (side=AR) | Governed | NO |
| AP authority | A | ADR-064 | fin_ar_ap (side=AP) | Governed | NO |
| Payment boundary | D | — | job_order_payments (legacy) | Future phase | NO |
| Settlement boundary | D | — | Not implemented | Future phase | NO |
| FX authority | D | — | Not implemented | Future phase | NO |
| Tax authority | B | ADR-062 | md_taxes | Sufficient | NO |
| Adjustment model | A | ADR-064 | fin_adjustments | Governed | NO |
| Reversal model | A | ADR-064 | fin_adjustments (REVERSAL) | Governed | NO |
| Reconciliation authority | D | — | Not implemented | Future phase | NO |
| Accounting interface | D | ADR-064 | Boundary defined | Future phase | NO |
| Financial immutability | A | ADR-066 | Snapshot immutable | Governed | NO |
| Financial numbering | A | — | DB-generated UUIDs | Sufficient | NO |
| Financial permissions | D | — | Not defined | Future phase | NO |

**Legend:** A = Governed, B = Sufficient, C = Decision required, D = Future
