# SENTRALOGIS — DATA-4E-R3
# FK CONVERGENCE PLAN

**Date:** 2026-09-02  
**Phase:** DATA-4E-R3  

---

## FK Transformation

| # | Source Table | Source Column | Old Target | New Target | Mechanism |
|---|--------------|---------------|------------|------------|-----------|
| 1 | fw_order_headers | origin_port_id | fw_locations.location_id | md_locations.id | Drop old FK, add new FK |
| 2 | fw_order_headers | dest_port_id | fw_locations.location_id | md_locations.id | Drop old FK, add new FK |
| 3 | fw_legs | start_location_id | fw_locations.location_id | md_locations.id | Drop old FK, add new FK |
| 4 | fw_legs | end_location_id | fw_locations.location_id | md_locations.id | Drop old FK, add new FK |

## Convergence Mechanism

For each FK:
1. Drop old constraint (e.g., `fk_fw_order_headers_origin_port`)
2. Add new constraint referencing `md_locations(id)`

The source column values (UUID) remain unchanged — they now reference `md_locations.id` instead of `fw_locations.location_id`.

---

**END OF FK CONVERGENCE PLAN**
