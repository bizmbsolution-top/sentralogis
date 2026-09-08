# SENTRALOGIS — DATA-4E-R6
# IDEMPOTENCY PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R6  

---

## State Detection Logic

For each FK value, the migration determines state by checking:
1. Does it match a legacy location? (`fw_locations.location_id` in same tenant)
2. Does it match a canonical location? (`md_locations.id` in same tenant)

| State | Legacy Match? | Canonical Match? | Action |
|-------|---------------|------------------|--------|
| A — Legacy | YES | NO | Transform |
| B — Canonical | NO | YES | Preserve |
| C — Mixed | YES | YES | Transform (same entity) |
| D — Invalid | NO | NO | FAIL |

## Rerun Safety Proof

| Execution | Legacy Values | Canonical Values |
|-----------|---------------|------------------|
| First | Transformed | Preserved |
| Second | N/A (already canonical) | Preserved |
| Mixed | Only legacy transformed | Preserved |

---

**END OF IDEMPOTENCY PROOF**
