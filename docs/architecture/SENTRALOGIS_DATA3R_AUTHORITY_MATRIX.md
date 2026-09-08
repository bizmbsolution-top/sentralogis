# SENTRALOGIS — DATA-3R
# AUTHORITY MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-3R  
**Nature:** FORENSIC AUDIT  

---

## Canonical Authority Map

| Business Fact | Canonical Authority | Legacy Authority | Status |
|-------------|---------------------|------------------|--------|
| Party Identity | md_entities | NONE | CANONICAL |
| Party Hierarchy | md_entities.parent_id | NONE | CANONICAL |
| Customer Role | party_roles.CUSTOMER (GLOBAL) | is_customer | TRANSITIONAL |
| Vendor Role | party_roles.VENDOR (GLOBAL) | is_vendor | TRANSITIONAL |
| Supplier Role | party_roles.SUPPLIER (GLOBAL) | is_supplier | TRANSITIONAL |
| Broker Role | party_roles.BROKER (GLOBAL) | is_broker | TRANSITIONAL |
| Carrier Role | party_roles.CARRIER (GLOBAL) | vendor_type='TRANSPORTER' | TRANSITIONAL |
| Agent Role | party_roles.AGENT (GLOBAL) | NONE | CANONICAL |
| Bill-To | party_roles.BILL_TO (ORDER) | NONE | CANONICAL |
| Ship-To | party_roles.SHIP_TO (ORDER) | NONE | CANONICAL |
| Payer | party_roles.PAYER (ORDER) | NONE | CANONICAL |
| Ordering Party | party_roles.ORDERING_PARTY (ORDER) | NONE | CANONICAL |
| Shipper | shp_shipments.shipper_id | NONE | CANONICAL |
| Consignee | shp_shipments.consignee_id | NONE | CANONICAL |
| Notify Party | shp_shipments.notify_party_id | NONE | CANONICAL |
| Location | md_locations | fw_locations | TRANSITIONAL |
| Location Hierarchy | md_locations.parent_id | NONE | CANONICAL |
| Location Type | md_locations.location_type | fw_locations.type | TRANSITIONAL |
| POL | shp_shipments.pol_location_id | NONE | CANONICAL |
| POD | shp_shipments.pod_location_id | NONE | CANONICAL |
| External Identity | external_references | NONE | CANONICAL |
| Party Relationship | party_relationships | NONE | CANONICAL |
| Party Contact | party_contacts | md_entity_addresses | COMPLEMENTARY |
| Party-Location | party_locations | NONE | CANONICAL |

---

## Duplicate Authority Test

| Business Fact | Single Authority? |
|-------------|-------------------|
| Party Identity | YES |
| Party Role (10 types) | YES |
| Shipment Context (3 roles) | YES |
| Location | CONDITIONAL (fw_locations) |
| External Identity | YES |

---

**END OF AUTHORITY MATRIX**
