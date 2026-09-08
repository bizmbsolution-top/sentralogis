# SENTRALOGIS — DATA-4E-R
# FK FORENSIC MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-4E-R  

---

| FK | Source Table | Source Column | Target | ON DELETE | Status |
|----|--------------|---------------|--------|-----------|--------|
| 1 | fw_order_headers | origin_port_id | fw_locations.location_id | RESTRICT | **BLOCKED — fw_order_headers is DEFERRED** |
| 2 | fw_order_headers | dest_port_id | fw_locations.location_id | RESTRICT | **BLOCKED — fw_order_headers is DEFERRED** |
| 3 | fw_legs | start_location_id | fw_locations.location_id | RESTRICT | OK to migrate |
| 4 | fw_legs | end_location_id | fw_locations.location_id | RESTRICT | OK to migrate |

---

**BLOCKING:** FKs #1 and #2 cannot be migrated without amending DATA-4A to allow fw_order_headers modification.

---

**END OF FK FORENSIC MATRIX**
