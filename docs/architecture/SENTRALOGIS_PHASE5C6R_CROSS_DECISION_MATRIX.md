# SENTRALOGIS — PHASE 5C-6R
# CROSS-DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Classification | Existing ADR | Evidence | Resolution | ADR Required |
|----------|---------------|--------------|----------|------------|--------------|
| Migration model | C | — | Risk assessment | Backfill + Cutover | NO |
| Historical data strategy | A | ADR-066 | Committed truth | Freeze legacy | NO |
| Open transaction strategy | A | ADR-061 | SO commitment | Snapshot at creation | NO |
| BUY/SELL migration | B | ADR-060 | All SELL-side | Derivable | NO |
| Currency migration | B | ADR-062 | Explicit columns | Reuse | NO |
| UOM migration | B | ADR-062 | Explicit columns | Reuse | NO |
| Version reconstruction | C | ADR-059 | Partial data | Document gap | NO |
| Quote → SO migration | A | ADR-059/066 | Price snapshot | Snapshot at creation | NO |
| Override migration | A | ADR-063 | Browser-direct | Server-side governance | NO |
| Financial dependencies | B | ADR-064 | Revenue recognition | Preserve lineage | NO |
| Cutover architecture | C | — | Risk assessment | Phased cutover | NO |
| Rollback architecture | C | — | Safety requirement | Never rewrite truth | NO |
| Decommission strategy | C | — | Prerequisite-based | Deprecate after canonical | NO |

**Legend:** A = Governed, B = Derivable, C = Decision required, D = Future
