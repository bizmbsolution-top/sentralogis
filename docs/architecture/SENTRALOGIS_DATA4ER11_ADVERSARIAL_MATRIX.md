# SENTRALOGIS — DATA-4E-R11
# ADVERSARIAL MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-4E-R11  

---

| Scenario | R10 Result | Expected | Status |
|----------|------------|----------|--------|
| Clean legacy-only DB | PASS | PASS | OK |
| Already canonical DB | DROP+ADD constraints | NO-OP | **FAIL** |
| Mixed legacy/canonical | Partial | Per-column | **FAIL** |
| BOTH + equivalent | Transform | Transform | OK |
| BOTH + conflict | Transform | FAIL | **FAIL** |
| Neither | No-op | FAIL | **FAIL** |
| Duplicate canonical mapping | No-op | FAIL | **FAIL** |
| Semantic conflict | No-op | FAIL | **FAIL** |
| Cross-tenant mapping | No tenant check | FAIL | **FAIL** |
| Second execution | DROP+ADD | NO-OP | **FAIL** |
| Transaction failure | ROLLBACK | ROLLBACK | OK |
| Post-commit reversal | NOT CLAIMED | NOT CLAIMED | OK |

---

**END OF ADVERSARIAL MATRIX**
