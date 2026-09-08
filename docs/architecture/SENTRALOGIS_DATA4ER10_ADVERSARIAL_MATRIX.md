# SENTRALOGIS — DATA-4E-R10
# ADVERSARIAL MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-4E-R10  

---

| Case | Expected |
|------|----------|
| First run, all legacy | Migrate |
| Second run, all canonical | NO-OP |
| Mixed legacy/canonical | Per-column state handling |
| Legacy + canonical equivalent | Preserve/normalize |
| BOTH + conflict | FAIL |
| Neither legacy nor canonical | FAIL |
| Duplicate legacy key | FAIL |
| Multiple canonical matches | FAIL |
| Canonical semantic conflict | FAIL |
| Cross-tenant mapping | FAIL |
| NULL tenant | FAIL |
| Invalid location type | FAIL |
| NULL location type | FAIL |
| Missing old FK | State classification |
| Canonical FK already exists | NO-OP |
| Both old + canonical FK | FAIL |
| Neither FK exists | FAIL |
| ON DELETE mismatch | FAIL |
| ON UPDATE mismatch | FAIL |
| UUID collision, same entity | Safe equivalent |
| UUID collision, different entity | FAIL |

---

**END OF ADVERSARIAL MATRIX**
