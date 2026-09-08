# SENTRALOGIS — DATA-1 DISCOVERY REPORT

**Date:** 2026-09-02  
**Phase:** DATA-1  
**Nature:** FORENSIC DISCOVERY ONLY  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. EXECUTIVE SUMMARY

DATA-1 performed a forensic architecture discovery of the SENTRALOGIS master-data model and Forwarding data model. The audit reveals a **dual-architecture problem**: a modern canonical model (shp_*, commercial_*) coexists with legacy SBU-specific forwarding tables (fw_*, work_orders, wo_items). While the canonical model is well-designed and multimodal-ready, the legacy forwarding tables introduce duplicate authorities, inconsistent tenant isolation, and container-centric assumptions that contradict the target enterprise architecture.

**Overall Assessment: YELLOW**

The canonical model (shp_shipments, md_entities, md_locations, commercial_work_orders, fulfillment, operational_handoff) is architecturally sound and supports the target experience. However, the legacy forwarding schema (fw_order_headers, fw_legs, fw_locations, fw_consolidations, fw_container_assignments) creates duplicate authorities that must be reconciled before SENTRALOGIS can operate as a unified Enterprise Fulfillment & Logistics Operating System.

---

## 2. SCOPE

### 2.1 Evidence Sources

| Source | Files |
|--------|-------|
| Migrations | 100+ SQL files in supabase/migrations/ |
| Domain Types | lib/domain/forwarding/types.ts, lib/domain/shipment/types.ts, lib/domain/commercial/types.ts |
| Domain Services | lib/domain/forwarding/, lib/domain/shipment/, lib/domain/commercial/ |
| API Routes | app/api/v1/ |

### 2.2 Master-Data Objects Audited

- Party (md_entities, customers, contacts)
- Location (md_locations, fw_locations)
- Resource (md_fleets, md_drivers, containers)
- Cargo (fw_container_items, fw_box_items)
- Shipment Unit (shp_units, fw_container_assignments)
- Shipment (shp_shipments, fw_order_headers, fw_consolidations)
- Carrier (md_transporters, md_entities)
- Transport Leg (shp_execution_legs, fw_legs)
- Execution (shp_execution_plans)

---

## 3. FORENSIC FINDINGS

### 3.1 Party Model

**Finding:** md_entities serves as the canonical party table with entity_type discriminator. It supports customers, vendors, transporters, and shipping lines in a single table.

**Strengths:**
- UUID primary keys with tenant_id isolation
- parent_id for hierarchy (added in migration 096)
- entity_type discriminator
- RLS policies via get_my_tenant_id()
- UNIQUE(tenant_id, entity_code)

**Gaps:**
- No formal party role model (Customer, Bill-To, Ship-To, Shipper, Consignee)
- CRM fields added directly to md_entities (sales_rep_id, industry, etc.) — pollutes canonical party
- No contact ownership model beyond md_entity_addresses
- No party relationship model (Subsidiary Of, Customer Of, etc.)

**Classification:** B — Extend

---

### 3.2 Location Model

**Finding:** Two location masters exist — md_locations (canonical) and fw_locations (forwarding-specific).

**md_locations:**
- Canonical location master
- Referenced by shp_shipments, shp_execution_legs
- Has tenant_id, country, address_notes
- RLS via get_my_tenant_id()

**fw_locations:**
- Forwarding-specific location master
- Separate table with location_id PK
- Referenced by fw_order_headers, fw_legs
- Duplicate authority

**Classification:** F — Architectural Contradiction (duplicate location authority)

---

### 3.3 Resource Model

**Finding:** No unified Resource abstraction. Resources are fragmented:
- md_fleets for vehicles
- md_drivers for drivers
- md_fleet_types for vehicle types
- No container resource master (containers only exist as fw_container_assignments)

**Gaps:**
- No reusable Resource concept
- No equipment tracking (trailers, vessels, aircraft)
- Containers are forwarding-specific, not canonical resources

**Classification:** E — Architectural Gap

---

### 3.4 Cargo Model

**Finding:** Cargo representation is split across forwarding-specific tables and canonical manifest items.

**Legacy (forwarding):**
- fw_container_items: volume_cbm, gross_weight_kg, packages, commodity, delivery_type
- fw_box_items: quantity, description, commodity, volume_cbm, gross_weight_kg
- Implicitly container-centric (items belong to containers)

**Canonical:**
- shp_manifest_items: hs_code, package_quantity, package_type, gross_weight_kg, volume_cbm, is_dangerous_goods, dg_un_number
- Supports DG, HS codes, multiple package types

**Gaps:**
- No cargo type enumeration (Containerized, Breakbulk, Liquid Bulk, Dry Bulk, Ro-Ro, etc.)
- No packaging master
- No handling requirements
- No temperature control requirements (except reefer container types)
- No oversized/heavy lift tracking

**Classification:** B — Extend (canonical model is good, needs cargo type extension)

---

### 3.5 Shipment Unit Model

**Finding:** Canonical model has excellent polymorphic unit support:
- shp_units: base table with unit_type discriminator
- shp_unit_containers: container-specific (container_number, iso_type, seal_number, tare/max weight, temperature)
- shp_unit_bulk: bulk cargo (bulk_type, metric_tonnage, moisture, surveyor)
- shp_unit_packages: pallets/crates (colli_count, dimensions, stackable)
- shp_unit_vehicles: vehicles (VIN, engine_number, drivable)

**Legacy (forwarding):**
- fw_container_assignments: container_number, container_type, seal_number, max_volume_cbm
- fw_box_assignments: box_code, volume_cbm, colli, weight_kg

**Gaps:**
- Legacy forwarding is container-centric
- No canonical resource for containers (only shipment units)

**Classification:** A — Reuse (canonical model is excellent), D — Deprecate (legacy forwarding units)

---

### 3.6 Shipment Model

**Finding:** Two shipment models exist — one canonical, one legacy.

**Canonical (shp_shipments):**
- Multimodal-ready with execution plans and legs
- Supports shipper, consignee, notify_party (all md_entities references)
- Tracks MBL/HBL, booking_reference, ETD/ETA
- Versioned (version_no)
- Status: DRAFT → PLANNED → BOOKED → IN_TRANSIT → ... → COMPLETED
- Tenant-isolated with RLS

**Legacy (fw_order_headers):**
- References work_orders(wo_id) — trucking work orders
- References customers(customer_id) — legacy customer table
- Has cargo_owner_name/email/phone, consignee_name/email/phone (denormalized)
- Status: pending → need_assignment → assigned → in_transit → delivered → completed
- No versioning

**Legacy (fw_consolidations):**
- Vessel/voyage-centric
- References md_entities for shipping_line
- Status: open → stuffing → shipped → arrived → deconsol_done → closed

**Classification:** F — Architectural Contradiction (duplicate shipment authority)

---

### 3.7 Carrier Model

**Finding:** Carrier identity is split across md_entities and md_transporters.

**md_transporters:**
- Dedicated transporter table
- transporter_code, transporter_name, transporter_type (OWN_FLEET, etc.)
- Contract management (contract_number, dates, payment_terms)
- Linked to fleets via md_transporter_fleets
- Linked to drivers via md_transporter_drivers

**md_entities:**
- Also serves as carrier (shipping_line_id in fw_consolidations references md_entities)
- entity_type discriminator

**Gaps:**
- No carrier transport mode capability tracking
- No carrier equipment relationship
- Duplicate carrier identity

**Classification:** F — Architectural Contradiction

---

### 3.8 Transport Leg Model

**Finding:** Canonical model supports multimodal transport via shp_execution_legs.

**Canonical (shp_execution_legs):**
- transport_mode: ROAD_TRUCK, OCEAN_VESSEL, BARGE, AIR_FREIGHT, RAIL_FREIGHT, etc.
- execution_provider_type: INTERNAL_SBU, EXTERNAL_VENDOR
- origin/destination location references
- planned/actual timestamps
- assigned_vendor_id

**Legacy (fw_legs):**
- leg_type: SEA, LAND, AIR, CONSOLIDATION
- References fw_locations (not md_locations)
- execution_mode: OWN, VENDOR

**Classification:** A — Reuse (canonical model is excellent), D — Deprecate (legacy fw_legs)

---

### 3.9 Tenant Isolation

**Finding:** Tenant isolation is implemented via RLS policies using get_my_tenant_id() function.

**Strengths:**
- Consistent use of tenant_id across all tables
- RLS policies on shp_*, fw_*, md_*, commercial_* tables
- get_my_tenant_id() function for server-side resolution

**Gaps:**
- Some legacy tables use profiles.tenant_id subquery instead of get_my_tenant_id()
- Inconsistent policy naming conventions
- Some tables have multiple conflicting policies from iterative fixes

**Classification:** B — Extend (standardize on get_my_tenant_id())

---

### 3.10 ERP Identity

**Finding:** No formal external reference model exists.

**Gaps:**
- No ERP customer ID mapping
- No external CRM ID mapping
- No synchronization semantics
- No source system identification

**Classification:** E — Architectural Gap

---

## 4. ARCHITECTURE ALIGNMENT

### 4.1 Canonical Model Alignment

The canonical model (shp_*, commercial_*, fulfillment, operational_handoff) is well-aligned with the target architecture:

| Target Requirement | Canonical Support |
|-------------------|-------------------|
| Hierarchical Parties | parent_id on md_entities |
| Party Roles | shipper_id, consignee_id, notify_party_id on shp_shipments |
| Hierarchical Locations | Not supported (gap) |
| Network Locations | md_locations (partial) |
| Multimodal Transport | shp_execution_legs with transport_mode |
| Containerized Cargo | shp_unit_containers |
| Non-Container Cargo | shp_unit_bulk, shp_unit_packages, shp_unit_vehicles |
| Multiple Carrier Types | md_entities + md_transporters |
| Reusable Resources | Not unified (gap) |
| Shipment + Units + Legs | Full canonical support |
| Cross-SBU Reuse | Canonical model is shared |
| ERP-led/Hybrid | Not supported (gap) |
| Tenant Isolation | RLS + get_my_tenant_id() |

### 4.2 Legacy Model Contradictions

The legacy forwarding model contradicts the target architecture:

| Contradiction | Impact |
|---------------|--------|
| fw_locations vs md_locations | Duplicate location authority |
| fw_order_headers vs shp_shipments | Duplicate shipment authority |
| fw_legs vs shp_execution_legs | Duplicate leg authority |
| fw_consolidations vs shp_shipments | Duplicate consolidation authority |
| fw_container_assignments vs shp_unit_containers | Duplicate container authority |
| customers table vs md_entities | Duplicate customer authority |
| Denormalized cargo_owner/consignee in fw_order_headers | Bypasses canonical party model |

---

## 5. CONTRADICTIONS

### 5.1 Critical Contradictions

1. **Dual Location Masters**: fw_locations and md_locations both claim authority over locations. fw_order_headers and fw_legs reference fw_locations, while shp_shipments and shp_execution_legs reference md_locations.

2. **Dual Shipment Masters**: fw_order_headers and shp_shipments both claim authority over shipments. fw_order_headers is vessel/voyage-centric; shp_shipments is multimodal.

3. **Dual Leg Masters**: fw_legs and shp_execution_legs both claim authority over transport legs.

4. **Dual Carrier Masters**: md_transporters and md_entities both claim authority over carriers.

5. **Container-Centric Legacy**: fw_container_assignments and fw_container_items assume all cargo is containerized. shp_units supports polymorphic units.

### 5.2 Minor Contradictions

6. **Customer Table**: fw_order_headers references customers(customer_id), but md_entities is the canonical party table.

7. **Work Order References**: fw_order_headers references work_orders(wo_id) — the trucking work orders, not commercial_work_orders.

---

## 6. GAPS

### 6.1 Critical Gaps

1. **Party Roles**: No formal model for Customer, Bill-To, Ship-To, Shipper, Consignee, Ordering Party, Payer, Notify Party.

2. **Location Hierarchy**: No parent/child support for locations (port → terminal → berth).

3. **Resource Abstraction**: No unified Resource concept for vehicles, containers, vessels, aircraft.

4. **Cargo Types**: No enumeration for Containerized, Breakbulk, Liquid Bulk, Dry Bulk, Ro-Ro, etc.

5. **ERP Identity**: No external reference model for ERP/CRM/TMS IDs.

### 6.2 Minor Gaps

6. **Party Relationships**: No model for Subsidiary Of, Customer Of, etc.

7. **Contact Model**: md_entity_addresses exists but no dedicated contact/communication model.

8. **Packaging Master**: No standard packaging type enumeration.

9. **Handling Requirements**: No tracking for hazardous, temperature-controlled, oversized cargo.

---

## 7. RISKS

| Risk | Severity | Likelihood |
|------|----------|------------|
| Data inconsistency between fw_* and shp_* tables | HIGH | HIGH |
| Cross-tenant data leakage from inconsistent RLS | MEDIUM | LOW |
| Inability to support non-container cargo in legacy forwarding | HIGH | HIGH |
| Inability to support multimodal transport in legacy forwarding | HIGH | HIGH |
| Duplicate business logic for shipments | MEDIUM | HIGH |
| User confusion from dual data entry points | MEDIUM | HIGH |

---

## 8. RECOMMENDATIONS

### 8.1 Immediate (Pre-Implementation)

1. **Deprecate fw_locations** — migrate to md_locations
2. **Deprecate fw_order_headers** — migrate to shp_shipments
3. **Deprecate fw_legs** — migrate to shp_execution_legs
4. **Deprecate fw_consolidations** — migrate to shp_shipments
5. **Deprecate fw_container_assignments** — migrate to shp_units + shp_unit_containers
6. **Deprecate customers table** — use md_entities

### 8.2 Short-Term (Foundation Phase)

7. **Add party role model** — party_roles table with context
8. **Add location hierarchy** — parent_id on md_locations
9. **Add cargo type enumeration** — extend shp_manifest_items
10. **Add ERP identity model** — external_references table
11. **Unify carrier model** — consolidate md_transporters and md_entities carrier usage

### 8.3 Medium-Term (Enterprise Phase)

12. **Add resource abstraction** — canonical resource table
13. **Add party relationship model** — party_relationships table
14. **Add packaging master** — md_packaging_types
15. **Add handling requirements** — extend cargo model

---

## 9. FINAL GATE

```
DATA-1 FINAL GATE

Overall Status: YELLOW

Party Model: PARTIAL
Party Hierarchy: PARTIAL
Party Roles: GAP
Contacts: PARTIAL

Location Model: PARTIAL
Location Hierarchy: GAP
Party-Location: PARTIAL
Network Locations: PARTIAL
POL/POD Semantics: PARTIAL

Resource Model: GAP
Cargo Model: PARTIAL
Shipment Unit: PASS

Carrier Model: PARTIAL
Maritime: PARTIAL
Air: PARTIAL
Road: PARTIAL
Rail: PARTIAL
Multimodal: PASS

Non-Container Cargo: PARTIAL
Forwarding Shipment: PARTIAL

Cross-SBU Reuse: PARTIAL
ERP Identity: GAP
Tenant Isolation: PARTIAL
Duplicate Authorities: FOUND

Canonical Architecture Contradiction: YES
New ADR Required: YES

Database Changes: 0
Production Code Changes: 0
Production UI Changes: 0

TypeScript: NOT RUN
Full Regression: NOT RUN

IMPLEMENTATION AUTHORIZATION: NO

HARD STOP: ACTIVE
```

---

## 10. EVIDENCE DETAIL

### 10.1 Migration Evidence

| Migration | Finding |
|-----------|---------|
| 030_enterprise_schema.sql | Created organizations with parent_org_id hierarchy |
| 032_rename_enterprise_tables.sql | Renamed to wo_ prefix, restored trucking work_orders |
| 062_comprehensive_master_columns.sql | Added md_entity_addresses, md_transporters |
| 063_rls_master_entities_fleets_locations.sql | RLS on md_entities, md_fleets, md_locations |
| 096_add_parent_id_to_md_entities.sql | Added parent_id to md_entities |
| 171_fw_consolidations.sql | Created fw_consolidations, fw_container_assignments |
| 174_fw_locations.sql | Created fw_locations (duplicate) |
| 175_fw_order_headers.sql | Created fw_order_headers (duplicate) |
| 176_fw_legs.sql | Created fw_legs (duplicate) |
| 20260826_003_canonical_shipments_and_units.sql | Created shp_shipments, shp_units, shp_execution_legs |
| 20260831_024_phase5a2_forwarding_schema_repair.sql | Repaired fw_order_headers, fw_legs |

### 10.2 Domain Type Evidence

| Type File | Finding |
|-----------|---------|
| lib/domain/forwarding/types.ts | ForwardingOrder, Container, Leg types |
| lib/domain/shipment/types.ts | Shipment, ShipmentUnit, ExecutionLeg types |
| lib/domain/commercial/types.ts | CommercialWorkOrder, CapabilityBinding types |

---

**END OF DATA-1 DISCOVERY REPORT**
