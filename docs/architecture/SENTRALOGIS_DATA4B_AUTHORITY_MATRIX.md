# SENTRALOGIS — DATA-4B
# AUTHORITY MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-4B  
**Nature:** FORENSIC DISCOVERY  

---

| Concept | Current Authority | Target Authority | Migration Required | Blocking Dependency |
|---------|-------------------|------------------|--------------------|--------------------|
| Party | md_entities | md_entities | NO | NONE |
| Party Role | party_roles | party_roles | NO | NONE |
| Location | fw_locations / md_locations | md_locations | YES (Track A) | fw_order_headers, fw_legs |
| Vendor | is_vendor | party_roles.VENDOR | YES (Track B) | 131 consumers |
| Carrier | md_entities + CARRIER | md_entities + CARRIER | NO | NONE |
| Fleet | md_fleets | md_fleets | NO | NONE |
| Driver | md_drivers | md_drivers | NO | NONE |
| Shipment Unit | shp_unit_containers | shp_unit_containers | NO | NONE |
| Network | md_locations hierarchy | md_locations hierarchy | NO | NONE |
| External Identity | external_references | external_references | NO | NONE |

---

**END OF AUTHORITY MATRIX**
