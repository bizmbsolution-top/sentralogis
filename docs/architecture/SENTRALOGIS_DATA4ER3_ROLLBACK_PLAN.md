# SENTRALOGIS — DATA-4E-R3
# ROLLBACK PLAN

**Date:** 2026-09-02  
**Phase:** DATA-4E-R3  

---

## Rollback Operations

| Operation | Reversible? | Method |
|-----------|-------------|--------|
| Create md_locations | YES | DELETE FROM md_locations WHERE location_code LIKE 'FW-%' |
| Drop old FK constraints | YES | Re-add constraint referencing fw_locations |
| Add new FK constraints | YES | Drop constraint referencing md_locations |
| DROP fw_locations | NO | Point of no return (NOT in this migration) |

## Point of No Return

| Operation | Reversible? |
|-----------|-------------|
| DROP fw_locations | NO |

## Rollback Script Concept

```sql
-- Step 1: Drop new FK constraints
ALTER TABLE fw_order_headers DROP CONSTRAINT fk_fw_order_headers_origin_location;
ALTER TABLE fw_order_headers DROP CONSTRAINT fk_fw_order_headers_dest_location;
ALTER TABLE fw_legs DROP CONSTRAINT fk_fw_legs_start_location_md;
ALTER TABLE fw_legs DROP CONSTRAINT fk_fw_legs_end_location_md;

-- Step 2: Re-add old FK constraints
ALTER TABLE fw_order_headers ADD CONSTRAINT fk_fw_order_headers_origin_port
  FOREIGN KEY (origin_port_id) REFERENCES fw_locations(location_id) ON DELETE RESTRICT;
ALTER TABLE fw_order_headers ADD CONSTRAINT fk_fw_order_headers_dest_port
  FOREIGN KEY (dest_port_id) REFERENCES fw_locations(location_id) ON DELETE RESTRICT;
ALTER TABLE fw_legs ADD CONSTRAINT fk_fw_legs_start_location
  FOREIGN KEY (start_location_id) REFERENCES fw_locations(location_id) ON DELETE RESTRICT;
ALTER TABLE fw_legs ADD CONSTRAINT fk_fw_legs_end_location
  FOREIGN KEY (end_location_id) REFERENCES fw_locations(location_id) ON DELETE RESTRICT;

-- Step 3: Remove canonical records
DELETE FROM md_locations WHERE location_code LIKE 'FW-%';
```

---

**END OF ROLLBACK PLAN**
