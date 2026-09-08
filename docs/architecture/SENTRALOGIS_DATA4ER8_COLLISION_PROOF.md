# SENTRALOGIS — DATA-4E-R8
# COLLISION PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R8  

---

## Canonical Record Resolution

| Case | Condition | Behavior |
|------|-----------|----------|
| A — No record | No md_locations with same tenant_id + external_code | INSERT |
| B — Identical | Exactly one match, same name + type | REUSE |
| C — Conflict | Exactly one match, different name/type | RAISE EXCEPTION |
| D — Ambiguous | Multiple matches | RAISE EXCEPTION |

## Duplicate Protection

| Check | Action |
|-------|--------|
| Duplicate (tenant_id, location_id) in fw_locations | FAIL |
| Multiple md_locations same tenant_id + external_code | FAIL |

---

**END OF COLLISION PROOF**
