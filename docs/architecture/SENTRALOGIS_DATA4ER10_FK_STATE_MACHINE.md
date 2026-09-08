# SENTRALOGIS — DATA-4E-R10
# FK STATE MACHINE

**Date:** 2026-09-02  
**Phase:** DATA-4E-R10  

---

## FK Constraint States

| State | Detection | Action |
|-------|-----------|--------|
| LEGACY FK ONLY | Old constraint exists | Migrate |
| CANONICAL FK ONLY | New constraint exists | NO-OP |
| BOTH | Both exist | FAIL |
| NEITHER | Neither exists | FAIL |

## Old FK Constraints

| # | Constraint | Source | Target | ON DELETE | ON UPDATE |
|---|------------|--------|--------|-----------|-----------|
| 1 | fk_fw_order_headers_origin_port | origin_port_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 2 | fk_fw_order_headers_dest_port | dest_port_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 3 | fk_fw_legs_start_location | start_location_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 4 | fk_fw_legs_end_location | end_location_id | fw_locations.location_id | RESTRICT | NO ACTION |

---

**END OF FK STATE MACHINE**
