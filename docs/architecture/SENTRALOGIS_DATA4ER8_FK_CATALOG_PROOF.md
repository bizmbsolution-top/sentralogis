# SENTRALOGIS — DATA-4E-R8
# FK CATALOG PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R8  

---

## Old FK Constraints (from migrations 175, 176)

| # | Constraint | Source | Target | ON DELETE | ON UPDATE |
|---|------------|--------|--------|-----------|-----------|
| 1 | fk_fw_order_headers_origin_port | origin_port_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 2 | fk_fw_order_headers_dest_port | dest_port_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 3 | fk_fw_legs_start_location | start_location_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 4 | fk_fw_legs_end_location | end_location_id | fw_locations.location_id | RESTRICT | NO ACTION |

## New FK Constraints

| # | Constraint | Source | Target | ON DELETE | ON UPDATE |
|---|------------|--------|--------|-----------|-----------|
| 1 | fk_fw_order_headers_origin_location | origin_port_id | md_locations.id | RESTRICT | NO ACTION |
| 2 | fk_fw_order_headers_dest_location | dest_port_id | md_locations.id | RESTRICT | NO ACTION |
| 3 | fk_fw_legs_start_location_md | start_location_id | md_locations.id | RESTRICT | NO ACTION |
| 4 | fk_fw_legs_end_location_md | end_location_id | md_locations.id | RESTRICT | NO ACTION |

---

**END OF FK CATALOG PROOF**
