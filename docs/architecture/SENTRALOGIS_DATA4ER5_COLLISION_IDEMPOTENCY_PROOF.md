# SENTRALOGIS — DATA-4E-R5
# COLLISION IDEMPOTENCY PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R5  

---

## Duplicate Detection

| Check | Assertion |
|-------|-----------|
| Duplicate (tenant_id, location_id) | `GROUP BY tenant_id, location_id HAVING COUNT(*) > 1` → FAIL |
| Ambiguous canonical mapping | `COUNT(*) != 1` → FAIL |

## Canonical Collision Handling

| Scenario | Handling |
|----------|----------|
| md_locations exists with same tenant + external_code | `ON CONFLICT DO NOTHING` — reuse |
| md_locations exists with different tenant | FAIL (should not happen) |

## Idempotency

| Case | Behavior |
|------|----------|
| A — not migrated | Create canonical record |
| B — already migrated | Reuse existing (ON CONFLICT DO NOTHING) |
| C — collision | FAIL (detected by preflight) |
| D — ambiguous | FAIL (detected by preflight) |

---

**END OF COLLISION IDEMPOTENCY PROOF**
