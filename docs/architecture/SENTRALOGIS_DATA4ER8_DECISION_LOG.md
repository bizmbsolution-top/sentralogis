# SENTRALOGIS — DATA-4E-R8
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-4E-R8  

---

## 1. Decisions Confirmed

| Decision | Rationale |
|----------|-----------|
| Use fw_locations.tenant_id directly | Proven by DATA-4E-R2 |
| In-place value transformation | All 4 FK columns are UUID |
| Explicit collision classification | No ON CONFLICT DO NOTHING |
| Legacy/canonical state detection | Rerun-safe idempotency |
| No DROP fw_locations | Separate retirement gate |
| Tenant-scoped FK updates | Prevents cross-tenant mapping |
| NULL type validation | Rejects NULL + unexpected |
| Preserve ON DELETE RESTRICT | Semantic equivalence |
| Semantic equivalence check | Compare name + location_type |
| Drop old constraints BEFORE value transform | Fixes migration 044 defect |
| Idempotent constraint addition | Drop if exists before add |

## 2. Rejected Alternatives

| Alternative | Rejected Because |
|-------------|------------------|
| ON CONFLICT DO NOTHING | No unique constraint on (tenant_id, external_code) |
| Parallel FK columns | Creates dual authority |
| Prefix-based rollback | Cannot distinguish records |
| Silent NULL for unknown types | Data integrity risk |
| Transform values before dropping constraints | FK constraint violation |

## 3. Verdict

**GREEN — Final artifact ready for human review.**

---

**END OF DECISION LOG**
