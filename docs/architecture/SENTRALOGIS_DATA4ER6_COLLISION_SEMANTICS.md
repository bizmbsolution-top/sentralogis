# SENTRALOGIS — DATA-4E-R6
# COLLISION SEMANTICS

**Date:** 2026-09-02  
**Phase:** DATA-4E-R6  

---

## Classification

| Case | Condition | Behavior |
|------|-----------|----------|
| 1 — No record | No md_locations with same tenant_id + external_code | INSERT |
| 2 — Identical | Exactly one match, same name + type | REUSE |
| 3 — Conflict | Exactly one match, different name/type | RAISE EXCEPTION |
| 4 — Ambiguous | Multiple matches | RAISE EXCEPTION |

## Semantic Equivalence Check

Fields compared for equivalence:
- tenant_id
- external_code
- name
- location_type

---

**END OF COLLISION SEMANTICS**
