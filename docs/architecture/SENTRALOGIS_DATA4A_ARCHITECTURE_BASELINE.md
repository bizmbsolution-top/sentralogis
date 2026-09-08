# SENTRALOGIS — DATA-4A
# ARCHITECTURE BASELINE LOCK

**Date:** 2026-09-02  
**Phase:** DATA-4A  
**Nature:** RATIFIED ARCHITECTURAL BASELINE  
**Status:** LOCKED  

---

## 1. Canonical Baseline

| Concept | Canonical Authority |
|---------|---------------------|
| Party | md_entities |
| Party Role | party_roles |
| Party Hierarchy | md_entities.parent_id |
| Party Relationship | party_relationships |
| Party Contact | party_contacts |
| Location | md_locations |
| Location Hierarchy | md_locations.parent_id |
| Location Type | md_locations.location_type |
| Party ↔ Location | party_locations |
| Carrier | md_entities + party_roles.CARRIER |
| Vendor | md_entities + party_roles.VENDOR |
| External Identity | external_references |
| Shipment | shp_shipments |
| Shipment Unit | shp_units |
| Container | shp_unit_containers |
| Execution Leg | shp_execution_legs |
| Transport Mode | shp_execution_legs.transport_mode |

---

## 2. Explicitly NOT Modeled

| Concept | Decision |
|---------|----------|
| Generic Enterprise Resource | NOT modeled — domain-specific resources remain canonical |
| Separate Carrier Master | NOT modeled — Carrier = Party + Role |
| Separate Network Node Master | NOT modeled — Location hierarchy sufficient |
| Master Container | NOT modeled — Container = Shipment Unit |
| Party Role duplication of Shipment roles | NOT allowed |

---

## 3. Shipment Contextual Roles (NOT in party_roles)

| Role | Canonical Authority |
|------|---------------------|
| SHIPPER | shp_shipments.shipper_id |
| CONSIGNEE | shp_shipments.consignee_id |
| NOTIFY_PARTY | shp_shipments.notify_party_id |

---

## 4. Architectural Invariants

| # | Invariant |
|---|-----------|
| INV-1 | One business fact → one canonical authority |
| INV-2 | Party ≠ Party Role ≠ Shipment Contextual Role |
| INV-3 | Party hierarchy ≠ Party role |
| INV-4 | Location hierarchy ≠ Execution Leg |
| INV-5 | Domain Resource ≠ Enterprise Resource Master |
| INV-6 | Container as Shipment Unit ≠ Enterprise Asset Master |
| INV-7 | Carrier is a Party with CARRIER role |
| INV-8 | Vendor is a Party Role, not a duplicate Party master |
| INV-9 | Legacy migration requires zero-consumer proof before removal |
| INV-10 | Human ratification of an ADR does not authorize implementation |

---

## 5. Transitional / Legacy Structures

| Structure | Status | Migration |
|-----------|--------|-----------|
| fw_locations | Legacy duplicate | ADR-075 strategy ratified |
| is_vendor | Legacy compatibility | ADR-076 strategy ratified |
| fw_order_headers | Deferred | Further forensic required |

---

## 6. ADR Cross-Reference

| ADR | Status | Document |
|-----|--------|----------|
| ADR-072 | RATIFIED | SENTRALOGIS_ADR_ENTERPRISE_RESOURCE_AUTHORITY.md |
| ADR-073 | RATIFIED | SENTRALOGIS_ADR_CARRIER_AUTHORITY.md |
| ADR-074 | RATIFIED | SENTRALOGIS_ADR_TRANSPORT_NETWORK_AUTHORITY.md |
| ADR-075 | RATIFIED — STRATEGY ONLY | SENTRALOGIS_ADR_FW_LOCATIONS_MIGRATION.md |
| ADR-076 | RATIFIED — STRATEGY ONLY | SENTRALOGIS_ADR_IS_VENDOR_MIGRATION.md |

---

## 7. Forensic Consistency Check

| Check | Result |
|-------|--------|
| ADR-072 vs ADR-073 | PASS — No Resource/Carrier contradiction |
| ADR-073 vs ADR-070 | PASS — Carrier role within Party Role vocabulary |
| ADR-074 vs Shipment Architecture | PASS — Location hierarchy ≠ Execution Legs |
| ADR-075 vs Forwarding | PASS — fw_locations migration does not redefine Forwarding authority |
| ADR-076 vs ADR-070 | PASS — Vendor remains canonical Party Role |
| ADR-075 vs DATA-3R | PASS — No contradiction with fw_locations findings |
| ADR-076 vs DATA-3R | PASS — No contradiction with is_vendor inventory |
| All ADRs vs Tenant Isolation | PASS — No client-controlled tenant authority |

---

**END OF ARCHITECTURE BASELINE LOCK**
