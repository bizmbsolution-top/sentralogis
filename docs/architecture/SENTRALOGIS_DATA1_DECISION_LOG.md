# SENTRALOGIS — DATA-1
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-1  
**Nature:** FORENSIC DISCOVERY ONLY  

---

## 1. DECISIONS CONFIRMED

### 1.1 Canonical Shipment Model is Authoritative

**Decision:** shp_shipments is the canonical shipment aggregate root. fw_order_headers and fw_consolidations are legacy duplicates.

**Evidence:** shp_shipments has proper tenant isolation, versioning, multimodal support, and references canonical md_entities and md_locations.

**Implication:** All new forwarding functionality MUST use shp_shipments. fw_order_headers should be deprecated.

---

### 1.2 md_entities is the Canonical Party Table

**Decision:** md_entities is the single source of truth for all parties (customers, vendors, carriers, transporters).

**Evidence:** md_entities has entity_type discriminator, parent_id for hierarchy, RLS, and is referenced by shp_shipments, commercial_work_orders, and fulfillment.

**Implication:** No new party tables should be created. Carrier/transporter specialization should use md_entities with entity_type.

---

### 1.3 md_locations is the Canonical Location Master

**Decision:** md_locations is the single source of truth for all locations.

**Evidence:** md_locations is referenced by shp_shipments, shp_execution_legs, and commercial_service_scopes.

**Implication:** fw_locations should be deprecated. All locations should be consolidated into md_locations.

---

### 1.4 Polymorphic Shipment Units are Correct

**Decision:** shp_units with table-per-type specialization is the correct approach.

**Evidence:** shp_units supports CONTAINER, BULK_MT, BREAKBULK, PALLET, BOX, VEHICLE, TANK types with specialized subtype tables.

**Implication:** fw_container_assignments should be deprecated. All shipment units should use shp_units.

---

### 1.5 Multimodal Transport via Execution Legs

**Decision:** shp_execution_legs is the canonical way to represent multimodal transport.

**Evidence:** shp_execution_legs supports multiple transport modes, multiple legs per shipment, different carriers per leg, and leg-level milestones.

**Implication:** fw_legs should be deprecated. All transport legs should use shp_execution_legs.

---

## 2. ASSUMPTIONS REJECTED

### 2.1 "Parent = Bill-To"

**Rejected:** Parent party is NOT automatically a Bill-To.

**Evidence:** No business rule enforces parent = Bill-To. Party hierarchy is independent of commercial roles.

---

### 2.2 "Location Ownership = Party Ownership"

**Rejected:** Party does NOT automatically own a location.

**Evidence:** No ownership relationship exists in current schema. Party-location relationships should be explicit.

---

### 2.3 "Container = Shipment"

**Rejected:** Shipment is NOT a container.

**Evidence:** shp_shipments is independent of shp_units. Containers are specialized shipment units.

---

### 2.4 "Carrier = Shipping Line"

**Rejected:** Carrier is NOT only a shipping line.

**Evidence:** md_entities supports all carrier types (maritime, air, road, rail). md_transporters supports transporter specialization.

---

### 2.5 "fw_* Tables are Canonical"

**Rejected:** fw_* tables are NOT canonical.

**Evidence:** fw_* tables duplicate canonical shp_* tables with less functionality and inconsistent tenant isolation.

---

## 3. ARCHITECTURAL CONTRADICTIONS

### 3.1 Dual Location Masters

**Contradiction:** fw_locations and md_locations both claim authority over locations.

**Impact:** Data inconsistency, duplicate entries, conflicting references.

**Resolution:** Deprecate fw_locations, migrate to md_locations.

---

### 3.2 Dual Shipment Masters

**Contradiction:** fw_order_headers and shp_shipments both claim authority over shipments.

**Impact:** Duplicate shipment records, inconsistent status tracking.

**Resolution:** Deprecate fw_order_headers, migrate to shp_shipments.

---

### 3.3 Dual Leg Masters

**Contradiction:** fw_legs and shp_execution_legs both claim authority over transport legs.

**Impact:** Duplicate leg records, inconsistent milestone tracking.

**Resolution:** Deprecate fw_legs, migrate to shp_execution_legs.

---

### 3.4 Dual Carrier Masters

**Contradiction:** md_transporters and md_entities both claim authority over carriers.

**Impact:** Duplicate carrier records, inconsistent vendor assignment.

**Resolution:** Consolidate to md_entities with entity_type = CARRIER.

---

### 3.5 Dual Consolidation Masters

**Contradiction:** fw_consolidations and shp_shipments both claim authority over consolidations.

**Impact:** Duplicate consolidation records, inconsistent vessel/voyage tracking.

**Resolution:** Deprecate fw_consolidations, use shp_shipments with vessel/voyage extension.

---

## 4. REUSE RECOMMENDATIONS

| Existing Model | Reuse For | Classification |
|----------------|-----------|----------------|
| md_entities | All party types (customers, vendors, carriers) | A — Reuse |
| md_locations | All locations (ports, airports, warehouses) | A — Reuse |
| shp_shipments | All shipment types (FCL, LCL, breakbulk, etc.) | A — Reuse |
| shp_units | All shipment units (containers, bulk, packages) | A — Reuse |
| shp_execution_legs | All transport legs (sea, air, road, rail) | A — Reuse |
| shp_manifest_items | All cargo items | A — Reuse |
| commercial_work_orders | All commercial engagements | A — Reuse |
| fulfillment | All fulfillment compositions | A — Reuse |
| operational_handoff | All operational handoffs | A — Reuse |

---

## 5. EXTENSION RECOMMENDATIONS

| Existing Model | Extension | Classification |
|----------------|-----------|----------------|
| md_entities | Add party_roles table | B — Extend |
| md_entities | Add party_relationships table | B — Extend |
| md_locations | Add parent_id for hierarchy | B — Extend |
| md_locations | Add external_code (UN/LOCODE) | B — Extend |
| shp_shipments | Add pol_location_id, pod_location_id | B — Extend |
| shp_manifest_items | Add cargo_type, temperature, oversized | B — Extend |
| md_transporters | Add carrier_capabilities table | B — Extend |
| md_transporters | Add carrier_equipment table | B — Extend |

---

## 6. DEPRECATION CANDIDATES

| Table | Reason | Classification |
|-------|--------|----------------|
| fw_locations | Duplicate of md_locations | D — Deprecate |
| fw_order_headers | Duplicate of shp_shipments | D — Deprecate |
| fw_legs | Duplicate of shp_execution_legs | D — Deprecate |
| fw_consolidations | Duplicate of shp_shipments | D — Deprecate |
| fw_container_assignments | Duplicate of shp_units | D — Deprecate |
| fw_container_items | Duplicate of shp_manifest_items | D — Deprecate |
| fw_box_assignments | Duplicate of shp_units | D — Deprecate |
| fw_box_items | Duplicate of shp_manifest_items | D — Deprecate |
| customers | Duplicate of md_entities | D — Deprecate |

---

## 7. ADR RECOMMENDATIONS

### 7.1 ADR Required: Canonical Party & Location Model

**Topic:** Party hierarchy, party roles, party-location relationships, location hierarchy.

**Reason:** Current schema lacks formal models for these concepts. Adding them materially changes architectural authority and domain boundaries.

**Scope:**
- party_roles table
- party_relationships table
- party_locations table
- md_locations parent_id
- external_references table

---

### 7.2 ADR Required: Resource Abstraction

**Topic:** Unified Resource concept for vehicles, containers, vessels, aircraft.

**Reason:** Current schema has fragmented resource models. Unifying them changes domain boundaries.

**Scope:**
- md_resources table
- md_containers table
- md_vessels table
- md_aircraft table
- md_rail_wagons table

---

### 7.3 ADR Required: Forwarding Schema Deprecation

**Topic:** Deprecation of fw_* tables in favor of shp_* tables.

**Reason:** Dual authorities create data inconsistency. Deprecating fw_* tables requires migration strategy.

**Scope:**
- fw_locations → md_locations
- fw_order_headers → shp_shipments
- fw_legs → shp_execution_legs
- fw_consolidations → shp_shipments
- fw_container_assignments → shp_units
- fw_container_items → shp_manifest_items

---

## 8. INVARIANT COMPLIANCE

| Invariant | Status | Notes |
|-----------|--------|-------|
| 1. Party ≠ Bill-To | PASS | No automatic role inheritance |
| 2. Hierarchy ≠ Role | PASS | parent_id independent of roles |
| 3. Location is canonical | PARTIAL | fw_locations duplicates |
| 4. Party Location vs Network Location = context | PARTIAL | No relationship model |
| 5. Location hierarchy ≠ Party hierarchy | PASS | Separate tables |
| 6. POL/POD = contextual roles | PARTIAL | No explicit POL/POD columns |
| 7. Shipment ≠ Container | PASS | shp_shipments independent |
| 8. Shipment Unit is generic | PASS | shp_units polymorphic |
| 9. Forwarding is mode-agnostic | PASS | shp_execution_legs supports all modes |
| 10. Forwarding is cargo-form agnostic | PARTIAL | Legacy is container-centric |
| 11. Multimodal = multiple legs | PASS | shp_execution_legs supports N legs |
| 12. Carrier ≠ equipment | FAIL | No separation currently |
| 13. Master data shared across SBUs | PARTIAL | fw_* duplicates |
| 14. Domain semantics in context | PASS | Domain tables have specific columns |
| 15. ERP identity = external reference | FAIL | No external reference model |
| 16. Tenant isolation authoritative | PARTIAL | Inconsistent RLS |

---

**END OF DECISION LOG**
