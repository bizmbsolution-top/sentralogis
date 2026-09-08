# SENTRALOGIS — DATA-4E-R6
# FK CONSTRAINT PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R6  

---

## Old FK Constraints

| # | Constraint | Source Table | Source Column | Target | ON DELETE |
|---|------------|--------------|---------------|--------|-----------|
| 1 | fk_fw_order_headers_origin_port | fw_order_headers | origin_port_id | fw_locations.location_id | RESTRICT |
| 2 | fk_fw_order_headers_dest_port | fw_order_headers | dest_port_id | fw_locations.location_id | RESTRICT |
| 3 | fk_fw_legs_start_location | fw_legs | start_location_id | fw_locations.location_id | RESTRICT |
| 4 | fk_fw_legs_end_location | fw_legs | end_location_id | fw_locations.location_id | RESTRICT |

## New FK Constraints

| # | Constraint | Source Table | Source Column | Target | ON DELETE |
|---|------------|--------------|---------------|--------|-----------|
| 1 | fk_fw_order_headers_origin_location | fw_order_headers | origin_port_id | md_locations.id | RESTRICT |
| 2 | fk_fw_order_headers_dest_location | fw_order_headers | dest_port_id | md_locations.id | RESTRICT |
| 3 | fk_fw_legs_start_location_md | fw_legs | start_location_id | md_locations.id | RESTRICT |
| 4 | fk_fw_legs_end_location_md | fw_legs | end_location_id | md_locations.id | RESTRICT |

## Semantic Equivalence

| FK | Old DELETE | New DELETE | Equivalent? |
|----|------------|------------|-------------|
| origin_port_id | RESTRICT | RESTRICT | YES |
| dest_port_id | RESTRICT | RESTRICT | YES |
| start_location_id | RESTRICT | RESTRICT | YES |
| end_location_id | RESTRICT | RESTRICT | YES |

---

**END OF FK CONSTRAINT PROOF**
