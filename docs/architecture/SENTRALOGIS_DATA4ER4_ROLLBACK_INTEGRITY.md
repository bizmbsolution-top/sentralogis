# SENTRALOGIS — DATA-4E-R4
# ROLLBACK INTEGRITY

**Date:** 2026-09-02  
**Phase:** DATA-4E-R4  

---

## Rollback Design

| Operation | Reversible? | Method |
|-----------|-------------|--------|
| Create md_locations | YES | DELETE WHERE external_code IN (SELECT location_id::TEXT FROM fw_locations) |
| Transform FK values | YES | Reverse JOIN: md_locations.id → fw_locations.location_id |
| Drop old FK constraints | YES | Re-add constraint referencing fw_locations |
| Add new FK constraints | YES | Drop constraint referencing md_locations |

## Rollback SQL Concept

```sql
-- Step 1: Reverse value transformation
UPDATE fw_order_headers oh
SET origin_port_id = fl.location_id
FROM md_locations ml
JOIN fw_locations fl ON fl.location_id::TEXT = ml.external_code AND fl.tenant_id = ml.tenant_id
WHERE oh.origin_port_id = ml.id;

-- Step 2: Drop new constraints, re-add old constraints
ALTER TABLE fw_order_headers DROP CONSTRAINT fk_fw_order_headers_origin_location;
ALTER TABLE fw_order_headers ADD CONSTRAINT fk_fw_order_headers_origin_port
  FOREIGN KEY (origin_port_id) REFERENCES fw_locations(location_id) ON DELETE RESTRICT;

-- Step 3: Remove canonical records
DELETE FROM md_locations WHERE external_code IN (SELECT location_id::TEXT FROM fw_locations);
```

## Point of No Return

| Operation | Reversible? |
|-----------|-------------|
| DROP fw_locations | NO |

---

**END OF ROLLBACK INTEGRITY**
