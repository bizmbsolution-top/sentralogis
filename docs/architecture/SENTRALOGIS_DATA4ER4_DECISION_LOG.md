# SENTRALOGIS — DATA-4E-R4
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-4E-R4  

---

## 1. Decisions Confirmed

| Decision | Rationale |
|----------|-----------|
| Use fw_locations.tenant_id directly | Proven by DATA-4E-R2 |
| In-place value transformation | All 4 FK columns are UUID, matching md_locations.id |
| ON CONFLICT DO NOTHING for canonical creation | Safe with preflight collision detection |
| Explicit value transformation before FK convergence | Fixes migration 040 defect |
| No DROP fw_locations | Separate retirement gate |

## 2. Rejected Alternatives

| Alternative | Rejected Because |
|-------------|------------------|
| Parallel FK columns | Creates dual authority |
| Prefix-based rollback | Cannot distinguish pre-existing records |
| Silent NULL for unknown types | Data integrity risk |

## 3. Verdict

**GREEN — Artifact ready for human review.**

---

**END OF DECISION LOG**
