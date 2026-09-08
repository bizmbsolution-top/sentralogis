# SENTRALOGIS — DATA-4E-R5
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-4E-R5  

---

## 1. Decisions Confirmed

| Decision | Rationale |
|----------|-----------|
| Use fw_locations.tenant_id directly | Proven by DATA-4E-R2 |
| In-place value transformation | All 4 FK columns are UUID, matching md_locations.id |
| ON CONFLICT DO NOTHING for canonical creation | Safe with preflight collision detection |
| Explicit value transformation before FK convergence | Fixes migration 040/041 defect |
| No DROP fw_locations | Separate retirement gate |
| Tenant-scoped FK updates | Prevents cross-tenant mapping |
| NULL type validation | Rejects both NULL and unexpected values |

## 2. Rejected Alternatives

| Alternative | Rejected Because |
|-------------|------------------|
| Parallel FK columns | Creates dual authority |
| Prefix-based rollback | Cannot distinguish pre-existing records |
| Silent NULL for unknown types | Data integrity risk |
| WHERE clause filtering invalid records | Silently excludes data |

## 3. Verdict

**GREEN — Final artifact ready for human review.**

---

**END OF DECISION LOG**
