# SENTRALOGIS — DATA-4E-R4
# COLLISION AND IDEMPOTENCY

**Date:** 2026-09-02  
**Phase:** DATA-4E-R4  

---

## Duplicate Detection

| Check | Query |
|-------|-------|
| Duplicate (tenant_id, location_id) | `SELECT tenant_id, location_id, COUNT(*) FROM fw_locations GROUP BY 1,2 HAVING COUNT(*) > 1` |
| Duplicate (tenant_id, external_code) | `SELECT tenant_id, external_code, COUNT(*) FROM md_locations GROUP BY 1,2 HAVING COUNT(*) > 1` |

## Canonical Collision Handling

| Scenario | Handling |
|----------|----------|
| md_locations already exists with same tenant_id + external_code | `ON CONFLICT DO NOTHING` — reuse existing |
| md_locations exists with different tenant | FAIL (should not happen with tenant-scoped insert) |

## Idempotency

| Mechanism | Implementation |
|-----------|---------------|
| Canonical creation | `ON CONFLICT (tenant_id, external_code) DO NOTHING` |
| Value transformation | UPDATE with deterministic JOIN — safe to re-run |
| Constraint replacement | `DROP CONSTRAINT IF EXISTS` + `ADD CONSTRAINT` |

---

**END OF COLLISION AND IDEMPOTENCY**
