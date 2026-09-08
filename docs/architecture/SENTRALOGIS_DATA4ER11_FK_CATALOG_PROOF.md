# SENTRALOGIS — DATA-4E-R11
# FK CATALOG PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R11  

---

## Actual FK Constraint Names

Migrations 024/175/176 do NOT explicitly name FK constraints. PostgreSQL auto-generates:

| Assumed by R10 | Actual (auto-generated) |
|----------------|-------------------------|
| fk_fw_order_headers_origin_port | fw_order_headers_origin_port_id_fkey |
| fk_fw_order_headers_dest_port | fw_order_headers_dest_port_id_fkey |
| fk_fw_legs_start_location | fw_legs_start_location_id_fkey |
| fk_fw_legs_end_location | fw_legs_end_location_id_fkey |

## FK Metadata

| # | Source | Target | ON DELETE | ON UPDATE |
|---|--------|--------|-----------|-----------|
| 1 | fw_order_headers.origin_port_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 2 | fw_order_headers.dest_port_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 3 | fw_legs.start_location_id | fw_locations.location_id | RESTRICT | NO ACTION |
| 4 | fw_legs.end_location_id | fw_locations.location_id | RESTRICT | NO ACTION |

---

**END OF FK CATALOG PROOF**
