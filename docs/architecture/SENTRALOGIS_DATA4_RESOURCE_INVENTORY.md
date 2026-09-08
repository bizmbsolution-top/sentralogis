# SENTRALOGIS — DATA-4
# RESOURCE INVENTORY

**Date:** 2026-09-02  
**Phase:** DATA-4  
**Nature:** FORENSIC DISCOVERY  

---

## Vehicle / Fleet

| Attribute | Current |
|-----------|---------|
| Table | md_fleets |
| Identity | id, plate_number |
| Type | md_fleet_types |
| Owner | entity_id → md_entities |
| Operator | md_transporter_fleets |
| GPS | fleet_gps_status |
| EasyGo | External integration |
| Tenant | Via md_entities.tenant_id |

---

## Driver

| Attribute | Current |
|-----------|---------|
| Table | md_drivers |
| Identity | id, name, phone |
| Cross-tenant | driver_profiles + driver_tenant_links |
| Party link | entity_id → md_entities |
| Employer | md_transporter_drivers |
| Authorization | NOT U-02 |

---

## Transporter / Carrier

| Attribute | Current |
|-----------|---------|
| Table | md_transporters |
| Identity | transporter_code, transporter_name |
| Type | transporter_type (OWN_FLEET, etc.) |
| Contract | contract_number, dates |
| Fleet | md_transporter_fleets |
| Driver | md_transporter_drivers |
| Party role | party_roles.CARRIER (post-DATA-3) |

---

## Container (Shipment Unit)

| Attribute | Current |
|-----------|---------|
| Table | shp_unit_containers |
| Identity | container_number |
| ISO Type | iso_type |
| Seal | seal_number |
| Weight | tare_weight_kg, max_payload_kg |
| Temperature | temperature_celsius |

---

## Container (Legacy)

| Attribute | Current |
|-----------|---------|
| Table | fw_container_assignments |
| Status | Legacy, duplicate |
| Migration | Deferred |

---

## GPS Device

| Attribute | Current |
|-----------|---------|
| Table | fleet_gps_status |
| Identity | fleet_id reference |
| External ID | EasyGo vehicle ID |
| Recommendation | Map via external_references |

---

**END OF RESOURCE INVENTORY**
