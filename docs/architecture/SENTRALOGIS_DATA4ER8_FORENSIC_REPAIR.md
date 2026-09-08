# SENTRALOGIS — DATA-4E-R8
# FORENSIC REPAIR

**Date:** 2026-09-02  
**Phase:** DATA-4E-R8  

---

## Root Cause of Migration 044 Failure

**Defect:** Migration 044 tried to transform FK values BEFORE dropping old FK constraints.

**Why it fails:** The old FK constraint requires `origin_port_id` to exist in `fw_locations.location_id`. When we try to SET `origin_port_id = ml.id` (a UUID from md_locations), the constraint rejects the UPDATE because `ml.id` doesn't exist in `fw_locations`.

**Fix:** Drop old FK constraints BEFORE transforming values.

## Correct Order of Operations

| Phase | Operation |
|-------|-----------|
| 1 | Pre-flight validation |
| 2 | Create md_locations |
| 3 | **DROP old FK constraints** |
| 4 | **TRANSFORM FK values** |
| 5 | **ADD new FK constraints** |
| 6 | Post-transformation validation |

---

**END OF FORENSIC REPAIR**
