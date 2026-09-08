# SENTRALOGIS — DATA-4E-R4
# FK CONVERGENCE REVIEW

**Date:** 2026-09-02  
**Phase:** DATA-4E-R4  

---

## FK Convergence

| # | Source | Old FK | Value Transform | New FK |
|---|--------|--------|-----------------|--------|
| 1 | fw_order_headers.origin_port_id | fw_locations.location_id | UUID → md_locations.id | md_locations.id |
| 2 | fw_order_headers.dest_port_id | fw_locations.location_id | UUID → md_locations.id | md_locations.id |
| 3 | fw_legs.start_location_id | fw_locations.location_id | UUID → md_locations.id | md_locations.id |
| 4 | fw_legs.end_location_id | fw_locations.location_id | UUID → md_locations.id | md_locations.id |

---

**END OF FK CONVERGENCE REVIEW**
