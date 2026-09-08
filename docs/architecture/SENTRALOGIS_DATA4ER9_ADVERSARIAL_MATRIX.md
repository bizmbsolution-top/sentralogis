# SENTRALOGIS — DATA-4E-R9
# ADVERSARIAL MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-4E-R9  

---

| Scenario | Expected |
|----------|----------|
| Fresh legacy state | migrate |
| Already canonical values + canonical FKs | NO-OP |
| Canonical values + legacy FKs | controlled convergence |
| Legacy values + canonical FKs | FAIL |
| BOTH equivalent | deterministic |
| BOTH conflict | FAIL |
| NEITHER value mapping | FAIL |
| LEGACY FK ONLY | migrate |
| CANONICAL FK ONLY | NO-OP |
| BOTH FK definitions | FAIL |
| NEITHER FK definition | FAIL |
| Duplicate legacy key | FAIL |
| Duplicate canonical mapping | FAIL |
| Cross-tenant mapping | FAIL |
| Semantic collision | FAIL |
| NULL/invalid type | FAIL |

---

**END OF ADVERSARIAL MATRIX**
