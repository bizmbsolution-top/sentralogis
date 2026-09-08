# SENTRALOGIS — DATA-4A
# AUTHORITY MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-4A  
**Nature:** FORENSIC ADR RATIFICATION  

---

| Business Fact | Canonical Authority | Legacy Authority | Consumers | Risk |
|-------------|---------------------|------------------|-----------|------|
| Party | md_entities | NONE | 73+ refs | NONE |
| Party Role | party_roles | is_vendor/is_customer | 131+ refs | MEDIUM |
| Carrier | md_entities + party_roles.CARRIER | NONE | NEW | NONE |
| Vendor | party_roles.VENDOR | is_vendor | 131 refs | MEDIUM |
| Location | md_locations | fw_locations | ~10 refs | MEDIUM |
| Location Hierarchy | md_locations.parent_id | NONE | NEW | NONE |
| Network Node | md_locations (type + hierarchy) | NONE | NEW | NONE |
| Vehicle | md_fleets | NONE | 20+ refs | NONE |
| Driver | md_drivers | NONE | 15+ refs | NONE |
| Fleet | md_fleets | NONE | 20+ refs | NONE |
| Container | shp_unit_containers | fw_container_assignments | 5 refs | LOW |
| Shipment Unit | shp_units | NONE | 10+ refs | NONE |
| Transport Mode | shp_execution_legs.transport_mode | NONE | 5 refs | NONE |
| Route | job_routes | NONE | 5 refs | NONE |
| Execution Leg | shp_execution_legs | NONE | 10+ refs | NONE |
| External Identity | external_references | NONE | NEW | NONE |

---

## Duplicate Authority Test

| Business Fact | Single Authority? |
|-------------|-------------------|
| Party | YES |
| Party Role | CONDITIONAL (legacy flags) |
| Location | CONDITIONAL (fw_locations) |
| Resource | YES (domain-specific) |
| Carrier | YES |

---

**END OF AUTHORITY MATRIX**
