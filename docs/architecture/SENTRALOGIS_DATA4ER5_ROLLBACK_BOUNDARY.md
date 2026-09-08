# SENTRALOGIS — DATA-4E-R5
# ROLLBACK BOUNDARY

**Date:** 2026-09-02  
**Phase:** DATA-4E-R5  

---

## Rollback Mechanisms

| Mechanism | Description |
|-----------|-------------|
| A. Automatic transactional rollback | If migration fails before COMMIT, all mutations rollback |
| B. Post-commit rollback | Requires explicit reverse mapping (md_locations.id → fw_locations.location_id) |

## Irreversibility Boundary

| Operation | Reversible? |
|-----------|-------------|
| Create md_locations | YES (with exact reverse mapping) |
| Transform FK values | YES (with exact reverse mapping) |
| Drop old FK constraints | YES (re-add) |
| Add new FK constraints | YES (drop) |
| COMMIT | **IRREVERSIBLE** — requires explicit reversal migration |

## Rollback SQL Concept

```sql
-- Reverse value transformation
UPDATE fw_order_headers oh
SET origin_port_id = fl.location_id
FROM md_locations ml
JOIN fw_locations fl ON fl.location_id::TEXT = ml.external_code AND fl.tenant_id = ml.tenant_id
WHERE oh.origin_port_id = ml.id AND oh.tenant_id = ml.tenant_id;

-- Remove canonical records (exact, not prefix-based)
DELETE FROM md_locations WHERE id IN (
  SELECT ml.id FROM md_locations ml
  JOIN fw_locations fl ON fl.location_id::TEXT = ml.external_code AND fl.tenant_id = ml.tenant_id
);
```

---

**END OF ROLLBACK BOUNDARY**
