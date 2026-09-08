# SENTRALOGIS — DATA-4E-R8
# CONSTRAINT STATE MACHINE

**Date:** 2026-09-02  
**Phase:** DATA-4E-R8  

---

## FK Constraint States

| State | Detection | Action |
|-------|-----------|--------|
| LEGACY FK ONLY | Old constraint exists, new doesn't | Transform values, drop old, add new |
| CANONICAL FK ONLY | New constraint exists, old doesn't | NO-OP (already converged) |
| BOTH | Both constraints exist | FAIL (inconsistent state) |
| NEITHER | Neither exists | FAIL (unless intentionally absent) |

## Old FK Constraints

| # | Constraint | Source | Target | ON DELETE |
|---|------------|--------|--------|-----------|
| 1 | fk_fw_order_headers_origin_port | origin_port_id | fw_locations.location_id | RESTRICT |
| 2 | fk_fw_order_headers_dest_port | dest_port_id | fw_locations.location_id | RESTRICT |
| 3 | fk_fw_legs_start_location | start_location_id | fw_locations.location_id | RESTRICT |
| 4 | fk_fw_legs_end_location | end_location_id | fw_locations.location_id | RESTRICT |

## New FK Constraints

| # | Constraint | Source | Target | ON DELETE |
|---|------------|--------|--------|-----------|
| 1 | fk_fw_order_headers_origin_location | origin_port_id | md_locations.id | RESTRICT |
| 2 | fk_fw_order_headers_dest_location | dest_port_id | md_locations.id | RESTRICT |
| 3 | fk_fw_legs_start_location_md | start_location_id | md_locations.id | RESTRICT |
| 4 | fk_fw_legs_end_location_md | end_location_id | md_locations.id | RESTRICT |

---

**END OF CONSTRAINT STATE MACHINE**
