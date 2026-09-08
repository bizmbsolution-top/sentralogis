# SENTRALOGIS — DATA-4E-R8
# VALUE STATE MACHINE

**Date:** 2026-09-02  
**Phase:** DATA-4E-R8  

---

## FK Value States

| State | Legacy Match? | Canonical Match? | Action |
|-------|---------------|------------------|--------|
| LEGACY ONLY | YES | NO | Transform to md_locations.id |
| CANONICAL ONLY | NO | YES | Preserve unchanged |
| BOTH + EQUIVALENT | YES | YES | Transform (same entity) |
| BOTH + CONFLICT | YES | NO | RAISE EXCEPTION |
| NEITHER | NO | NO | RAISE EXCEPTION |

## UUID Collision Rule

Even if `fw_locations.location_id = md_locations.id` for some record, the artifact handles this correctly by using tenant-scoped matching.

---

**END OF VALUE STATE MACHINE**
