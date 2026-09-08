# SENTRALOGIS — DATA-1
# GAP MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-1  
**Nature:** FORENSIC DISCOVERY ONLY  

---

## CURRENT → TARGET GAP MATRIX

| Domain | Current Model | Target Model | Status | Severity | Evidence | Recommendation |
|--------|---------------|--------------|--------|----------|----------|----------------|
| Party | md_entities with entity_type discriminator | Canonical party with roles, hierarchy, relationships | PARTIUM | MEDIUM | parent_id exists; no roles; no relationships | Extend md_entities + add party_roles |
| Party Hierarchy | parent_id on md_entities | Hierarchical parties with independent commercial roles | PARTIUM | LOW | parent_id added in migration 096 | Add cycle prevention + depth limit |
| Party Roles | Denormalized in fw_order_headers (cargo_owner_name, consignee_name) | Formal party_roles table with context | GAP | HIGH | No role model exists | Create party_roles table |
| Contacts | md_entity_addresses (address only) | Dedicated contact/communication model | PARTIUM | MEDIUM | address has contact_person/phone | Add party_contacts table |
| Location | md_locations (canonical) + fw_locations (duplicate) | Single canonical location master | CONTRADICTION | HIGH | fw_locations duplicates md_locations | Deprecate fw_locations |
| Location Hierarchy | No parent_id on md_locations | Hierarchical locations (port → terminal → berth) | GAP | HIGH | No hierarchy support | Add parent_id to md_locations |
| Party-Location | md_entity_addresses (implicit) | Formal party_locations relationship | PARTIUM | MEDIUM | No relationship table | Create party_locations table |
| Network Locations | md_locations can represent both | Shared network locations across SBUs | PARTIUM | MEDIUM | fw_locations duplicates | Consolidate to md_locations |
| POL/POD | origin_port_id/dest_port_id in fw_order_headers (fw_locations) | Contextual roles pointing to md_locations | PARTIUM | MEDIUM | shp_shipments has origin/destination | Add pol_location_id/pod_location_id to shp_shipments |
| Resource | md_fleets, md_drivers (fragmented) | Unified Resource abstraction | GAP | HIGH | No vessel, aircraft, container resource | Create md_resources table |
| Cargo | shp_manifest_items (partial) + fw_container_items (legacy) | Full cargo model with types, DG, temperature | PARTIUM | MEDIUM | shp_manifest_items has hs_code, DG | Add cargo_type, temperature, oversized |
| Shipment Unit | shp_units (polymorphic) + fw_container_assignments (legacy) | Generic unit with container as specialization | PASS | LOW | shp_units is excellent | Deprecate fw_container_assignments |
| Carrier | md_transporters + md_entities (duplicate) | Carrier as role, separate from equipment | CONTRADICTION | HIGH | Dual carrier master | Consolidate to md_entities + capabilities |
| Maritime | fw_order_headers (vessel/voyage free text) | Structured maritime with vessel/voyage masters | PARTIUM | MEDIUM | vessel_name as text | Add md_vessels, md_voyages |
| Air | No air freight support | Air freight with flight tracking | GAP | MEDIUM | transport_mode = AIR_FREIGHT exists | Add md_aircraft, md_flights |
| Road | work_orders/wo_items/job_orders (trucking) | Road transport with truck/driver assignment | PARTIUM | LOW | md_fleets, md_drivers exist | Extend with trailer support |
| Rail | No rail support | Rail transport with wagon tracking | GAP | LOW | transport_mode = RAIL_FREIGHT exists | Add md_rail_wagons |
| Multimodal | shp_execution_legs (canonical) + fw_legs (legacy) | Multiple legs per shipment, mode changes | PASS | LOW | shp_execution_legs is excellent | Deprecate fw_legs |
| Non-Container Cargo | shp_unit_bulk, shp_unit_packages (canonical) | Breakbulk, liquid bulk, Ro-Ro, project cargo | PARTIUM | MEDIUM | Canonical supports types | Add cargo_type enumeration |
| Forwarding Shipment | shp_shipments (canonical) + fw_order_headers (legacy) | Single multimodal shipment aggregate | CONTRADICTION | HIGH | Dual shipment master | Deprecate fw_order_headers |
| ERP Identity | No external reference model | External references for ERP/CRM/TMS | GAP | MEDIUM | No external_references table | Create external_references table |
| Tenant Isolation | RLS via get_my_tenant_id() (inconsistent) | Consistent server-side tenant isolation | PARTIUM | MEDIUM | Some tables use profiles.tenant_id | Standardize on get_my_tenant_id() |
| Duplicate Authorities | fw_locations, fw_order_headers, fw_legs, fw_consolidations | Single canonical authority per concept | CONTRADICTION | HIGH | Multiple duplicate tables | Deprecate all fw_* tables |

---

## SEVERITY LEGEND

| Severity | Description |
|----------|-------------|
| CRITICAL | Blocks enterprise operating model |
| HIGH | Significant architectural contradiction |
| MEDIUM | Gap that can be worked around |
| LOW | Minor gap, easy to address |

---

## STATUS LEGEND

| Status | Description |
|--------|-------------|
| PASS | Current model satisfies target |
| PARTIAL | Current model partially satisfies target |
| GAP | Target capability does not exist |
| CONTRADICTION | Current model fundamentally conflicts |
| UNKNOWN | Insufficient evidence |

---

## SUMMARY

| Status | Count |
|--------|-------|
| PASS | 3 |
| PARTIAL | 12 |
| GAP | 6 |
| CONTRADICTION | 5 |
| UNKNOWN | 0 |

---

## CRITICAL CONTRADICTIONS

1. **fw_locations vs md_locations** — Duplicate location master
2. **fw_order_headers vs shp_shipments** — Duplicate shipment master
3. **fw_legs vs shp_execution_legs** — Duplicate leg master
4. **fw_consolidations vs shp_shipments** — Duplicate consolidation master
5. **md_transporters vs md_entities** — Duplicate carrier master

---

## CRITICAL GAPS

1. **Party Roles** — No formal role model
2. **Location Hierarchy** — No parent/child for locations
3. **Resource Abstraction** — No unified resource concept
4. **Cargo Types** — No enumeration for cargo forms
5. **ERP Identity** — No external reference model
6. **Air/Rail Masters** — No structured air/rail support

---

**END OF GAP MATRIX**
