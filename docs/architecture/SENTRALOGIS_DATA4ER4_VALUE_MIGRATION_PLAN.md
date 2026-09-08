# SENTRALOGIS — DATA-4E-R4
# VALUE MIGRATION PLAN

**Date:** 2026-09-02  
**Phase:** DATA-4E-R4  

---

## Four-Column Transformation

| # | Column | Old Value | New Value |
|---|--------|-----------|-----------|
| 1 | fw_order_headers.origin_port_id | fw_locations.location_id | md_locations.id |
| 2 | fw_order_headers.dest_port_id | fw_locations.location_id | md_locations.id |
| 3 | fw_legs.start_location_id | fw_locations.location_id | md_locations.id |
| 4 | fw_legs.end_location_id | fw_locations.location_id | md_locations.id |

## Transformation SQL Pattern

```sql
UPDATE fw_order_headers oh
SET origin_port_id = ml.id
FROM fw_locations fl
JOIN md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id;
```

---

**END OF VALUE MIGRATION PLAN**
