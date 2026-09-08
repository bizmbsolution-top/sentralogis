# SENTRALOGIS — DATA-4
# AUTHORITY MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-4  
**Nature:** FORENSIC DISCOVERY  

---

| Concept | Existing Authority | Proposed Canonical Authority | Duplicate | Decision |
|---------|-------------------|------------------------------|-----------|----------|
| Party | md_entities | md_entities | NO | KEEP |
| Location | md_locations | md_locations | NO | KEEP |
| Vehicle | md_fleets | md_fleets | NO | KEEP |
| Driver | md_drivers | md_drivers | NO | KEEP |
| Carrier | md_entities + party_roles.CARRIER | md_entities + party_roles.CARRIER | NO | KEEP |
| Transporter | md_transporters | md_transporters | NO | KEEP |
| Facility | md_warehouse | md_warehouse | NO | KEEP |
| Terminal | md_locations (type) | md_locations (type) | NO | KEEP |
| Container (shipment) | shp_unit_containers | shp_unit_containers | NO | KEEP |
| Container (legacy) | fw_container_assignments | — | YES | DEPRECATE |
| Shipment Unit | shp_units | shp_units | NO | KEEP |
| Execution Leg | shp_execution_legs | shp_execution_legs | NO | KEEP |
| Transport Mode | shp_execution_legs.transport_mode | shp_execution_legs.transport_mode | NO | KEEP |
| Route | job_routes | job_routes | NO | KEEP |
| FW Location | fw_locations | — | YES | DEPRECATE |
| FW Order | fw_order_headers | — | YES | DEPRECATE |
| External Identity | external_references | external_references | NO | KEEP |

---

**END OF AUTHORITY MATRIX**
