# SENTRALOGIS — PHASE 5C-4R
# CROSS-DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Current State | Classification | Proposed Resolution | ADR |
|----------|---------------|----------------|---------------------|-----|
| Override definition | UNDEFINED | C | Pre-commit deviation from calculated price | 063 |
| Override authority | UNDEFINED | C | `pricing:override` permission | 063 |
| Permission | DOES NOT EXIST | C | `pricing:override`, `pricing:approve` | 063 |
| Approval | UNDEFINED | C | Threshold-based approval workflow | 063 |
| Threshold | UNDEFINED | C | Variance-based (5%/20%) | 063 |
| Audit | UNDEFINED | C | Append-only audit record | 063 |
| Immutability | PARTIAL (5C-3) | B | Post-commit immutable, pre-commit governed | 063 |
| Quote boundary | UNDEFINED | C | Override allowed until SO creation | 063 |
| SO boundary | PARTIAL (5C-3) | B | Override in DRAFT only | 061/066 |
| Amendment | 5C-3 | A | New line version | 061/066 |
| Legacy migration | UNDEFINED | D | Future phase | Future |
| Rate master protection | UNDEFINED | B | Override ≠ rate mutation | 063 |
| BUY/SELL | 5C-2 | A | Independent override per side | 060 |
| Currency | 5C-2 | A | Explicit, no implicit | 062 |
| UOM | 5C-2 | A | Explicit, no conversion | 062 |
| Margin | UNDEFINED | D | Future phase | Future |
| Tenant isolation | 5C-3 | A | Server-derived | 057 |
| IdentityContext | 5C-3 | A | Authoritative | 057 |

**Legend:** A = Governed by ADR, B = Derivable, C = Architecture decision required, D = Future phase
