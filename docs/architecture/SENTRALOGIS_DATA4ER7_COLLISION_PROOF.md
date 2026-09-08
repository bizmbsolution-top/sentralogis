# SENTRALOGIS — DATA-4E-R7
# COLLISION PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R7  

---

## Classification

| Case | Condition | Behavior |
|------|-----------|----------|
| A — No record | No md_locations with same tenant_id + external_code | INSERT |
| B — Identical | Exactly one match, same name + type | REUSE |
| C — Conflict | Exactly one match, different name/type | RAISE EXCEPTION |
| D — Ambiguous | Multiple matches | RAISE EXCEPTION |

## Semantic Equivalence Fields

- tenant_id
- external_code
- name
- location_type

---

**END OF COLLISION PROOF**
