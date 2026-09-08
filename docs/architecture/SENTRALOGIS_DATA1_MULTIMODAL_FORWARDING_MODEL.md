# SENTRALOGIS — DATA-1
# MULTIMODAL FORWARDING MODEL

**Date:** 2026-09-02  
**Phase:** DATA-1  
**Nature:** CONCEPTUAL ARCHITECTURE ONLY  

---

## 1. FORWARDING AGGREGATE

### 1.1 Current State

Forwarding operates through two parallel systems:

**Legacy (fw_* tables):**
- fw_order_headers → fw_legs
- fw_consolidations → fw_container_assignments → fw_container_items
- fw_box_assignments → fw_box_items
- fw_locations (duplicate)
- fw_price_master

**Canonical (shp_* tables):**
- shp_shipments → shp_manifest_items
- shp_units → shp_unit_containers / shp_unit_bulk / shp_unit_packages / shp_unit_vehicles
- shp_execution_plans → shp_execution_legs
- shp_milestones, shp_exceptions

---

### 1.2 Target Forwarding Aggregate

Forwarding should operate as:

```text
SHIPMENT (shp_shipments)
├── Cargo (shp_manifest_items)
├── Shipment Units (shp_units)
│   ├── Containers (shp_unit_containers)
│   ├── Bulk (shp_unit_bulk)
│   ├── Packages (shp_unit_packages)
│   └── Vehicles (shp_unit_vehicles)
├── Service Scope (commercial_service_scopes)
├── Transport Plan (shp_execution_plans)
│   └── Transport Legs (shp_execution_legs)
├── Milestones (shp_milestones)
├── Documents (external)
├── Customs (cus_declarations)
├── Trucking (svc_service_requests)
├── Warehouse (svc_service_requests)
├── Exceptions (shp_exceptions)
└── Financial Visibility (fulfillment_allocations)
```

---

## 2. SHIPMENT

### 2.1 Canonical Model

**Table:** shp_shipments

**Attributes:**
- id, tenant_id, shipment_number (UNIQUE per tenant)
- work_order_id → commercial_work_orders
- service_scope_id → commercial_service_scopes
- customer_id → md_entities
- shipper_id, consignee_id, notify_party_id → md_entities
- origin_location_id, destination_location_id → md_locations
- pol_location_id, pod_location_id → md_locations (target)
- global_status (shp_global_status enum)
- tracking_token (UNIQUE)
- master_bl_number, house_bl_number
- booking_reference
- etd, eta (TIMESTAMPTZ)
- actual_departure_at, actual_delivery_at
- version_no (INTEGER)
- created_at, updated_at, created_by, updated_by

**Status Flow:**
```
DRAFT → PLANNED → BOOKED → IN_TRANSIT → AT_INTERMEDIATE_NODE
     → CUSTOMS_HOLD → CUSTOMS_RELEASED → OUT_FOR_DELIVERY
     → DELIVERED → COMPLETED
     → EXCEPTION_HOLD → CANCELLED
```

---

## 3. CARGO

### 3.1 Canonical Model

**Table:** shp_manifest_items

**Attributes:**
- id, tenant_id, shipment_id
- item_sequence (UNIQUE per shipment)
- commodity_name
- hs_code
- cargo_type (target: CONTAINERIZED, BREAKBULK, LIQUID_BULK, DRY_BULK, RORO, GENERAL, PROJECT, VEHICLE, PALLETIZED)
- package_quantity, package_type
- gross_weight_kg, volume_cbm
- declared_customs_value, declared_currency
- is_dangerous_goods, dg_un_number, dg_class
- temperature_requirement (target: AMBIENT, REFRIGERATED, FROZEN)
- is_oversized, is_heavy_lift (target)

**Current Gaps:**
- No cargo_type enumeration
- No temperature_requirement
- No is_oversized, is_heavy_lift

---

## 4. SHIPMENT UNIT

### 4.1 Canonical Model

**Base Table:** shp_units

**Polymorphic Types:**

| Table | Type | Specialization |
|-------|------|----------------|
| shp_unit_containers | CONTAINER | container_number, iso_type, seal_number, tare/max weight |
| shp_unit_bulk | BULK_MT | bulk_type, metric_tonnage, moisture, surveyor |
| shp_unit_packages | PALLET/BOX/BREAKBULK | colli_count, dimensions, stackable |
| shp_unit_vehicles | VEHICLE | vin_number, engine_number, drivable |

**Invariant Testing:**

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Shipment is NOT a Container | PASS | shp_shipments independent of units |
| Shipment Unit is generic | PASS | shp_units base table |
| Container is a specialization | PASS | shp_unit_containers extends shp_units |

---

## 5. TRANSPORT PLAN & LEGS

### 5.1 Canonical Model

**Execution Plan:** shp_execution_plans
- One active plan per shipment
- Versioned (plan_version)
- total_legs counter

**Execution Legs:** shp_execution_legs
- transport_mode (shp_transport_mode enum)
- execution_provider_type (shp_execution_provider_type enum)
- origin/destination locations
- assigned_vendor_id
- planned/actual timestamps
- status

**Transport Modes:**
| Mode | Description |
|------|-------------|
| ROAD_TRUCK | Road transport |
| OCEAN_VESSEL | Maritime freight |
| BARGE | Inland waterway |
| AIR_FREIGHT | Air cargo |
| RAIL_FREIGHT | Rail transport |
| PORT_TERMINAL_HANDLING | Terminal ops |
| WAREHOUSE_STAGING | Warehouse ops |
| CUSTOMS_CLEARANCE | Customs process |

**Invariant Testing:**

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Multimodal = multiple legs | PASS | shp_execution_legs supports N legs |
| Forwarding is mode-agnostic | PASS | transport_mode per leg |
| Forwarding is cargo-form agnostic | PASS | polymorphic units |
| Mode changes supported | PASS | different transport_mode per leg |
| Different carriers per leg | PASS | assigned_vendor_id per leg |
| Different equipment per leg | PASS | leg-unit allocations |
| Leg-level milestones | PASS | shp_milestones.execution_leg_id |
| Leg-level documents | PARTIAL | No leg-level document table |

---

## 6. CARRIER

### 6.1 Current State

**Dual carrier model:**
- md_transporters: dedicated transporter table
- md_entities: also serves as carrier (entity_type)

**Carrier identity not separated from equipment.**

---

### 6.2 Target Model

**Principle:** Carrier is a role (md_entities.entity_type = CARRIER).

**Capabilities Table:** carrier_capabilities
- Links carrier to transport modes
- One carrier can have multiple modes

**Equipment Table:** carrier_equipment
- Links carrier to resources
- Separates carrier identity from physical equipment

**Invariant Testing:**

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Carrier ≠ shipping line only | PARTIAL | md_entities supports all types |
| Carrier identity ≠ equipment | FAIL | No separation currently |

---

## 7. MARITIME

### 7.1 Current State

**Legacy (fw_order_headers):**
- vessel_name, voyage_no
- origin_port_id, dest_port_id → fw_locations
- cargo_owner_name, consignee_name (denormalized)

**Canonical (shp_shipments):**
- master_bl_number, house_bl_number
- etd, eta
- No vessel/voyage tracking at shipment level

**Gaps:**
- No vessel master
- No voyage master
- No port call tracking
- No berth assignment

---

## 8. AIR

### 8.1 Current State

**No air freight support in legacy.**

**Canonical (shp_execution_legs):**
- transport_mode = AIR_FREIGHT supported
- No MAWB/HAWB tracking
- No flight tracking

---

## 9. ROAD

### 9.1 Current State

**Legacy (trucking):**
- work_orders → wo_items → job_orders
- md_fleets, md_drivers
- No container/trailer separation

**Canonical (shp_execution_legs):**
- transport_mode = ROAD_TRUCK supported
- assigned_vendor_id for external carriers

---

## 10. RAIL

### 10.1 Current State

**No rail support in legacy.**

**Canonical (shp_execution_legs):**
- transport_mode = RAIL_FREIGHT supported
- No rail-specific masters (wagon, train, station)

---

## 11. NON-CONTAINER CARGO

### 11.1 Current State

**Legacy (fw_* tables):**
- Container-centric: fw_container_items, fw_box_items
- All cargo assumed to be in containers

**Canonical (shp_units):**
- shp_unit_bulk: dry/liquid bulk
- shp_unit_packages: pallets, crates, cartons
- shp_unit_vehicles: CBU vehicles
- shp_manifest_items: commodity-level detail

**Invariant Testing:**

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Non-container cargo supported | PASS (canonical) | shp_unit_bulk, shp_unit_packages |
| Container-centric legacy | FAIL (legacy) | fw_container_items assumes containers |

---

## 12. EQUIPMENT

### 12.1 Current State

**Vehicles (md_fleets):**
- fleet_type, plate_number, capacity
- Linked to transporters via md_transporter_fleets

**Containers:**
- No container resource master
- Containers only as shipment units (fw_container_assignments, shp_unit_containers)

**Vessels:**
- No vessel master
- vessel_name as free text in fw_order_headers, fw_consolidations

**Gaps:**
- No unified Resource abstraction
- No vessel, aircraft, rail wagon masters
- No container resource tracking across shipments

---

**END OF MULTIMODAL FORWARDING MODEL**
