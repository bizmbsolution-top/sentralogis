# SENTRALOGIS — DATA-3R
# CONSUMER INVENTORY

**Date:** 2026-09-02  
**Phase:** DATA-3R  
**Nature:** FORENSIC AUDIT  

---

## is_vendor Consumers (131 references)

| Category | Count | Semantic Equivalent | Migration Status |
|----------|-------|---------------------|------------------|
| Assignment logic | 2 | party_roles.VENDOR | Deferred |
| Fleet management | 10 | party_roles.VENDOR | Deferred |
| Financial/cost | 5 | vendor_type (preserved) | N/A |
| UI badges | 15 | party_roles.VENDOR | Deferred |
| Entity creation | 3 | party_roles.VENDOR | Deferred |
| Filtering | 20 | party_roles.VENDOR | Deferred |
| Reporting | 8 | party_roles.VENDOR | Deferred |
| EasyGo integration | 2 | party_roles.VENDOR | Deferred |
| Other | 66 | party_roles.VENDOR | Deferred |

All consumers preserve semantic parity with party_roles.VENDOR.

---

## is_customer Consumers

| Category | Count | Semantic Equivalent | Migration Status |
|----------|-------|---------------------|------------------|
| Assignment logic | 1 | party_roles.CUSTOMER | Deferred |
| UI filters | 5 | party_roles.CUSTOMER | Deferred |

---

## is_supplier / is_broker Consumers

| Flag | Count | Status |
|------|-------|--------|
| is_supplier | 0 | No active usage |
| is_broker | 0 | No active usage |

---

## fw_locations Consumers

| Category | Count | FK References |
|----------|-------|---------------|
| fw_order_headers.origin_port_id | 1 | FK |
| fw_order_headers.dest_port_id | 1 | FK |
| fw_legs.start_location_id | 1 | FK |
| fw_legs.end_location_id | 1 | FK |

**Status:** NOT dropped. Migration deferred.

---

## md_locations Consumers

| Consumer | Status |
|----------|--------|
| shp_shipments.origin_location_id | Existing |
| shp_shipments.destination_location_id | Existing |
| shp_shipments.pol_location_id | NEW (migration 036) |
| shp_shipments.pod_location_id | NEW (migration 036) |
| party_locations.location_id | NEW (migration 035) |

---

## Party Roles Consumers

| Consumer | Status |
|----------|--------|
| party_roles table | NEW (migration 035) |
| PartyRoleService | NEW (lib/domain/party/) |

---

## Shipment Contextual Roles Consumers

| Role | Authority | Status |
|------|-----------|--------|
| SHIPPER | shp_shipments.shipper_id | Preserved |
| CONSIGNEE | shp_shipments.consignee_id | Preserved |
| NOTIFY_PARTY | shp_shipments.notify_party_id | Preserved |

**NOT in party_roles** — Verified.

---

**END OF CONSUMER INVENTORY**
