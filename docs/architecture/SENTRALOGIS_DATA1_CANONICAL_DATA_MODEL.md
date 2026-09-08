# SENTRALOGIS — DATA-1
# CANONICAL DATA MODEL

**Date:** 2026-09-02  
**Phase:** DATA-1  
**Nature:** CONCEPTUAL ARCHITECTURE ONLY — NO SQL  

---

## 1. PARTY

### 1.1 Party Identity

A Party is any natural or legal person that participates in commercial or operational transactions.

**Canonical Table:** md_entities (existing, extend)

**Required Attributes:**
- id (UUID PK)
- tenant_id (UUID FK → md_tenants)
- entity_code (TEXT, UNIQUE per tenant)
- entity_name (TEXT)
- entity_type (TEXT: CUSTOMER, VENDOR, CARRIER, TRANSPORTER, PARTNER, INTERNAL)
- parent_id (UUID FK → md_entities.id, nullable, for hierarchy)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)

### 12 Party Hierarchy

**Principle:** A Party may have parent/child relationships independent of commercial roles.

**Rules:**
- parent_id references md_entities(id)
- ON DELETE SET NULL (child survives parent deletion)
- No cycle detection in DB — enforce in application layer
- Hierarchy depth: unlimited (but practically 3-4 levels)
- Child entities can independently participate in transactions

**Example:**
```
BYD Group (parent_id: null)
└── BYD Indonesia (parent_id: BYD Group)
    └── BYD Subang Factory (parent_id: BYD Indonesia)
```

### 1.3 Party Roles

**Principle:** A Party Role is a contextual assignment, not an identity.

**New Table:** party_roles

**Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- party_id (UUID FK → md_entities)
- role_type (TEXT: CUSTOMER, BILL_TO, SHIP_TO, SHIPPER, CONSIGNEE, ORDERING_PARTY, PAYER, NOTIFY_PARTY)
- context_type (TEXT: ENGAGEMENT, ORDER, SHIPMENT, CONTRACT)
- context_id (UUID, polymorphic)
- is_primary (BOOLEAN)
- effective_from, effective_to (DATE)

**Rules:**
- A party can hold multiple roles in different contexts
- Parent ≠ Bill-To (no automatic role inheritance)
- Roles are transaction-context specific

### 1.4 Contacts

**Principle:** A Contact is a communication endpoint for a Party.

**New Table:** party_contacts

**Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- party_id (UUID FK → md_entities)
- contact_name (TEXT)
- contact_role (TEXT: OPERATIONS, FINANCE, MANAGEMENT, EMERGENCY)
- email (TEXT)
- phone (TEXT)
- is_primary (BOOLEAN)
- is_active (BOOLEAN)

**Notes:**
- md_entity_addresses can remain for physical addresses
- party_contacts is for communication endpoints

---

## 2. LOCATION

### 2.1 Location Identity

A Location is a geographic point or area where logistics activities occur.

**Canonical Table:** md_locations (existing, extend)

**Required Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- location_code (TEXT)
- location_name (TEXT)
- location_type (TEXT: PORT, AIRPORT, RAIL_STATION, TERMINAL, WAREHOUSE, DEPOT, ICD, BERTH, FACTORY, OFFICE, CUSTOMER_LOCATION)
- parent_id (UUID FK → md_locations.id, nullable, for hierarchy)
- address (TEXT)
- city (TEXT)
- province (TEXT)
- country (TEXT, default 'ID')
- latitude, longitude (NUMERIC)
- is_active (BOOLEAN)
- created_at, updated_at

### 2.2 Location Hierarchy

**Principle:** Locations form independent hierarchies from Party hierarchies.

**Example:**
```
Tanjung Priok Port (parent_id: null)
└── Terminal (parent_id: Tanjung Priok Port)
    └── Berth (parent_id: Terminal)
```

**Rules:**
- parent_id references md_locations(id)
- ON DELETE SET NULL
- Location hierarchy ≠ Party hierarchy
- Network locations (ports, airports) are shared master data
- Party-associated locations (factories, warehouses) are also master data

### 2.3 Party-Location Relationship

**Principle:** Party and Location are separate entities linked by relationships.

**New Table:** party_locations

**Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- party_id (UUID FK → md_entities)
- location_id (UUID FK → md_locations)
- relationship_type (TEXT: OWNS, OPERATES, MANAGES, USES, LOCATED_AT)
- is_primary (BOOLEAN)
- effective_from, effective_to (DATE)

### 2.4 POL/POD Semantics

**Principle:** POL/POD are contextual shipment roles, not separate location masters.

**Implementation:**
- Shipment.origin_location_id → md_locations (Origin)
- Shipment.pol_location_id → md_locations (Port of Load)
- Shipment.pod_location_id → md_locations (Port of Discharge)
- Shipment.destination_location_id → md_locations (Destination)

---

## 3. RESOURCE

### 3.1 Resource Identity

A Resource is a physical asset used in logistics operations.

**New Table:** md_resources

**Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- resource_code (TEXT)
- resource_name (TEXT)
- resource_type (TEXT: VEHICLE, CONTAINER, VESSEL, AIRCRAFT, RAIL_WAGON, TRAILER, EQUIPMENT)
- owner_party_id (UUID FK → md_entities)
- operator_party_id (UUID FK → md_entities)
- is_active (BOOLEAN)
- created_at, updated_at

### 3.2 Resource Type Specializations

**Vehicle (md_fleets, existing):**
- fleet_type, plate_number, capacity

**Container (new md_containers):**
- container_number, iso_type, tare_weight, max_payload, temperature_range

**Vessel (new md_vessels):**
- vessel_name, imo_number, flag, capacity_teu

**Aircraft (new md_aircraft):**
- aircraft_registration, aircraft_type, capacity_kg

**Rail Wagon (new md_rail_wagons):**
- wagon_number, wagon_type, capacity_kg

### 3.3 Resource Capabilities

**New Table:** resource_capabilities

**Attributes:**
- resource_id (UUID FK → md_resources)
- capability_type (TEXT: TEMPERATURE_CONTROLLED, HAZMAT, OVERSIZED, HEAVY_LIFT, REFRIGERATED)
- capability_value (TEXT)

---

## 4. CARGO

### 4.1 Cargo Identity

Cargo is the goods being transported.

**Canonical Table:** shp_manifest_items (existing, extend)

**Required Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- shipment_id (UUID FK → shp_shipments)
- item_sequence (INTEGER)
- commodity_name (TEXT)
- hs_code (TEXT)
- cargo_type (TEXT: CONTAINERIZED, BREAKBULK, LIQUID_BULK, DRY_BULK, RORO, GENERAL, PROJECT, VEHICLE, PALLETIZED)
- package_quantity (INTEGER)
- package_type (TEXT: PALLET, CRATE, DRUM, BAG, BOX, ROLL, COIL, OTHER)
- gross_weight_kg (NUMERIC)
- volume_cbm (NUMERIC)
- declared_customs_value (NUMERIC)
- declared_currency (TEXT, default 'IDR')
- is_dangerous_goods (BOOLEAN)
- dg_un_number (TEXT)
- dg_class (TEXT)
- temperature_requirement (TEXT: AMBIENT, REFRIGERATED, FROZEN)
- is_oversized (BOOLEAN)
- is_heavy_lift (BOOLEAN)
- created_at

### 4.2 Cargo Type Enumeration

| Type | Description |
|------|-------------|
| CONTAINERIZED | Standard container cargo |
| BREAKBULK | Non-containerized bulk items |
| LIQUID_BULK | Liquid tank cargo |
| DRY_BULK | Dry bulk (grain, coal, etc.) |
| RORO | Roll-on/roll-off vehicles |
| GENERAL | General cargo |
| PROJECT | Project cargo (oversized) |
| VEHICLE | Vehicles (CBU, CKD) |
| PALLETIZED | Palletized cargo |

---

## 5. SHIPMENT UNIT

### 5.1 Shipment Unit Identity

A Shipment Unit is a physical handling unit within a Shipment.

**Canonical Table:** shp_units (existing)

**Required Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- shipment_id (UUID FK → shp_shipments)
- unit_type (TEXT: CONTAINER, BULK_MT, BREAKBULK, PALLET, BOX, VEHICLE, TANK)
- unit_identifier (TEXT)
- total_gross_weight_kg (NUMERIC)
- total_volume_cbm (NUMERIC)
- current_location_id (UUID FK → md_locations)
- status (TEXT)
- created_at, updated_at

### 5.2 Container Unit

**Canonical Table:** shp_unit_containers (existing)

**Attributes:**
- unit_id (UUID PK FK → shp_units)
- container_number (TEXT)
- iso_type (TEXT)
- seal_number (TEXT)
- tare_weight_kg (NUMERIC)
- max_payload_kg (NUMERIC)
- temperature_celsius (NUMERIC)
- is_soc (BOOLEAN)

### 5.3 Bulk Unit

**Canonical Table:** shp_unit_bulk (existing)

**Attributes:**
- unit_id (UUID PK FK → shp_units)
- bulk_type (TEXT: DRY_BULK, LIQUID_BULK)
- metric_tonnage (NUMERIC)
- moisture_percentage (NUMERIC)
- surveyor_report_number (TEXT)
- surveyor_entity_id (UUID FK → md_entities)

### 5.4 Package Unit

**Canonical Table:** shp_unit_packages (existing)

**Attributes:**
- unit_id (UUID PK FK → shp_units)
- parent_container_unit_id (UUID FK → shp_units)
- package_type (TEXT)
- colli_count (INTEGER)
- length_cm, width_cm, height_cm (NUMERIC)
- is_stackable (BOOLEAN)

### 5.5 Vehicle Unit

**Canonical Table:** shp_unit_vehicles (existing)

**Attributes:**
- unit_id (UUID PK FK → shp_units)
- vin_number (TEXT)
- engine_number (TEXT)
- vehicle_model (TEXT)
- color (TEXT)
- is_drivable (BOOLEAN)

---

## 6. CARRIER

### 6.1 Carrier Identity

A Carrier is a Party that provides transportation services.

**Principle:** Carrier is a role, not a separate entity.

**Implementation:**
- Use md_entities with entity_type = 'CARRIER' or 'TRANSPORTER'
- md_transporters remains for transporter-specific attributes
- No duplicate carrier master

**Required Attributes (md_entities):**
- entity_type: CARRIER or TRANSPORTER
- entity_code, entity_name

**Extended Attributes (md_transporters):**
- transporter_type (TEXT: OWN_FLEET, THIRD_PARTY, NVOCC, MULTIMODAL)
- contract_number, contract dates
- payment_terms

### 6.2 Carrier Capabilities

**New Table:** carrier_capabilities

**Attributes:**
- carrier_id (UUID FK → md_entities)
- transport_mode (TEXT: MARITIME, AIR, ROAD, RAIL)
- is_active (BOOLEAN)

### 6.3 Carrier Equipment

**New Table:** carrier_equipment

**Attributes:**
- carrier_id (UUID FK → md_entities)
- resource_id (UUID FK → md_resources)
- assignment_type (TEXT: OWNED, LEASED, CONTRACTED)
- effective_from, effective_to (DATE)

---

## 7. TRANSPORT MODE

### 7.1 Mode Enumeration

| Mode | Description |
|------|-------------|
| MARITIME | Ocean freight |
| AIR | Air freight |
| ROAD | Road transport |
| RAIL | Rail transport |
| MULTIMODAL | Combined modes |
| INLAND_WATERWAY | River/barge transport |

### 7.2 Mode-Specific Attributes

**Maritime:**
- vessel_name, voyage_number
- port_of_loading, port_of_discharge
- MBL, HBL

**Air:**
- airline, flight_number
- airport_of_departure, airport_of_arrival
- MAWB, HAWB

**Road:**
- truck, trailer
- driver
- route

**Rail:**
- rail_operator, train_number
- station_of_origin, station_of_destination
- wagon_number

---

## 8. TRANSPORT LEG

### 8.1 Leg Identity

A Transport Leg is a single-mode segment of a multimodal journey.

**Canonical Table:** shp_execution_legs (existing)

**Required Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- shipment_id (UUID FK → shp_shipments)
- execution_plan_id (UUID FK → shp_execution_plans)
- leg_sequence (INTEGER)
- leg_code (TEXT)
- transport_mode (TEXT: ROAD_TRUCK, OCEAN_VESSEL, BARGE, AIR_FREIGHT, RAIL_FREIGHT)
- execution_provider_type (TEXT: INTERNAL_SBU, EXTERNAL_VENDOR)
- origin_location_id (UUID FK → md_locations)
- destination_location_id (UUID FK → md_locations)
- assigned_vendor_id (UUID FK → md_entities)
- planned_start_at, planned_end_at (TIMESTAMPTZ)
- actual_start_at, actual_end_at (TIMESTAMPTZ)
- status (TEXT)
- created_at, updated_at

### 8.2 Multimodal Principle

**Rule:** Multimodal transport is represented by multiple legs within one shipment.

**Example:**
```
Shipment SHP-001
├── Leg 1: ROAD (Factory → Port)
├── Leg 2: MARITIME (Port A → Port B)
├── Leg 3: RAIL (Port → Terminal)
└── Leg 4: ROAD (Terminal → Warehouse)
```

---

## 9. EXTERNAL REFERENCE

### 9.1 External Reference Identity

An External Reference links a SENTRALOGIS entity to an external system identifier.

**New Table:** external_references

**Attributes:**
- id (UUID PK)
- tenant_id (UUID)
- entity_type (TEXT: PARTY, LOCATION, CARRIER, SHIPMENT, ORDER)
- entity_id (UUID)
- external_system (TEXT: ERP, CRM, TMS, WMS, CUSTOMS)
- external_id (TEXT)
- external_context (JSONB)
- created_at, updated_at

**Unique Constraint:** (tenant_id, entity_type, entity_id, external_system)

---

## 10. TENANT ISOLATION

### 10.1 Principles

1. Every master-data table has tenant_id
2. RLS policies use get_my_tenant_id()
3. No client-provided tenant_id
4. Server-derived tenant via IdentityContext
5. Cross-tenant relationships prevented

### 10.2 IdentityContext

```
IdentityContext
├── userId (UUID)
├── tenantId (UUID)
├── roles (TEXT[])
├── permissions (TEXT[])
└── customerId (UUID, nullable)
```

---

**END OF CANONICAL DATA MODEL**
