# SENTRALOGIS — DATA-2
# LOCATION ARCHITECTURE

**Date:** 2026-09-02  
**Phase:** DATA-2  
**Nature:** ARCHITECTURE DESIGN ONLY  

---

## 1. CANONICAL LOCATION

### 1.1 Location Identity (md_locations — EXISTING)

**Source:** lib/supabase/database.types.ts:6776-6837

**Current Attributes:**
- id (UUID PK)
- tenant_id (UUID FK → tenants, nullable)
- location_code (TEXT)
- name (TEXT)
- address (TEXT)
- address_notes (TEXT, nullable)
- city, province, postal_code, country (TEXT, nullable)
- latitude, longitude (NUMERIC, nullable)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)

**Assessment:** Solid foundation. Missing: location_type, parent_id (hierarchy), timezone, external_code.

**Classification:** B — Extend

---

### 1.2 Location Type (NEW: location_type column)

**Design:** Add location_type column to md_locations.

**Location Types:**
| Type | Description | Examples |
|------|-------------|----------|
| CUSTOMER_SITE | Customer premises | BYD Factory, Tesla Warehouse |
| FACTORY | Manufacturing facility | BYD Subang Factory |
| WAREHOUSE | Storage facility | Distribution center |
| DEPOT | Distribution depot | Regional depot |
| PORT | Seaport | Tanjung Priok, Surabaya |
| TERMINAL | Container terminal | JICT, Koja |
| BERTH | Berth at port | Berth 4, Berth 7 |
| AIRPORT | Airport | Soekarno-Hatta, Juanda |
| AIR_CARGO_TERMINAL | Air cargo terminal | CGK Cargo Terminal |
| RAIL_STATION | Rail station | Gambir, Pasar Senen |
| RAIL_TERMINAL | Rail terminal | Cikarang Rail Terminal |
| ICD | Inland container depot | Bogor ICD |
| CFS | Container freight station | Priok CFS |
| YARD | Storage yard | Container yard |
| OFFICE | Office location | HQ, Branch office |
| OTHER | Other location | |

**Rules:**
- Single type per location (primary classification)
- Type is mutable (location can change purpose)
- Controlled vocabulary via CHECK constraint

---

### 1.3 Location Hierarchy (NEW: parent_id on md_locations)

**Design:** Add parent_id column to md_locations.

```text
md_locations
├── ... (existing columns)
├── parent_id (UUID FK → md_locations.id, nullable)
├── location_type (TEXT)
├── timezone (TEXT, nullable)
├── external_code (TEXT, nullable)
```

**Rules:**
- parent_id references md_locations(id)
- ON DELETE SET NULL
- Location hierarchy ≠ Party hierarchy
- Cycle prevention at application layer
- Arbitrary depth (practically 3-4 levels)

**Examples:**
```
Tanjung Priok Port (parent_id: null, type: PORT)
└── JICT Terminal (parent_id: Tanjung Priok Port, type: TERMINAL)
    ├── Berth 4 (parent_id: JICT Terminal, type: BERTH)
    └── Yard A (parent_id: JICT Terminal, type: YARD)

Soekarno-Hatta Airport (parent_id: null, type: AIRPORT)
└── CGK Cargo Terminal (parent_id: Soekarno-Hatta, type: AIR_CARGO_TERMINAL)

BYD Subang Factory (parent_id: null, type: FACTORY)
└── Warehouse (parent_id: BYD Subang Factory, type: WAREHOUSE)
    └── Receiving Area (parent_id: Warehouse, type: CUSTOMER_SITE)
```

---

### 1.4 Location Geography (md_locations — EXISTING + EXTEND)

**Current Attributes:** address, city, province, postal_code, country, latitude, longitude

**Additions:**
- timezone (TEXT, nullable) — IANA timezone (e.g., "Asia/Jakarta")
- external_code (TEXT, nullable) — UN/LOCODE, IATA, etc.

**External Codes:**
| Code Type | Example | Usage | Source |
|-----------|---------|-------|--------|
| UN/LOCODE | IDJKT | Port codes | UN Economic Commission |
| IATA | CGK | Airport codes | International Air Transport Association |
| UIC | | Rail station codes | International Union of Railway |

**Rules:**
- external_code does NOT replace canonical SENTRALOGIS identity
- external_code is for reference only
- Formal external ID mapping in external_references table

---

## 2. NETWORK LOCATIONS VS PARTY LOCATIONS

### 2.1 Principle

**Location is a canonical reusable object.** Party-Location relationship is established via party_locations.

**Network Locations:** Ports, airports, rail terminals, ICDs, CFS — shared infrastructure.
**Party Locations:** Factories, warehouses, offices — party-associated.

### 2.2 Implementation

- Both stored in md_locations
- party_locations links party to location with relationship_type
- No separate tables for network vs party locations
- location_type distinguishes the nature

### 2.3 party_locations Table

```text
party_locations
├── id (UUID PK)
├── tenant_id (UUID FK → tenants)
├── party_id (UUID FK → md_entities)
├── location_id (UUID FK → md_locations)
├── relationship_type (TEXT: OWNS, OPERATES, MANAGES, USES, LOCATED_AT, DELIVERS_TO, PICKS_UP_FROM)
├── is_primary (BOOLEAN)
├── effective_from (DATE)
├── effective_to (DATE, nullable)
├── created_at (TIMESTAMPTZ)
├── UNIQUE (tenant_id, party_id, location_id, relationship_type)
```

### 2.4 Relationship Types

| Type | Description | Example |
|------|-------------|---------|
| OWNS | Party owns the location | BYD owns factory |
| OPERATES | Party operates the location | 3PL operates warehouse |
| MANAGES | Party manages the location | Facility manager |
| USES | Party uses the location | Customer uses CFS |
| LOCATED_AT | Party is located at | Office address |
| DELIVERS_TO | Party delivers to location | Carrier delivers to port |
| PICKS_UP_FROM | Party picks up from location | Truck picks up from depot |

---

## 3. POL/POD SEMANTICS

### 3.1 Principle

**POL and POD are contextual shipment roles pointing to canonical locations.**

**No separate POL/POD masters.**

### 3.2 Implementation

Add to shp_shipments:
- pol_location_id (UUID FK → md_locations) — Port of Loading
- pod_location_id (UUID FK → md_locations) — Port of Discharge

### 3.3 Valid POL/POD Types

| POL/POD | Valid Location Types |
|---------|---------------------|
| Port of Loading | PORT, TERMINAL, BERTH |
| Port of Discharge | PORT, TERMINAL, BERTH |
| Airport of Departure | AIRPORT, AIR_CARGO_TERMINAL |
| Airport of Arrival | AIRPORT, AIR_CARGO_TERMINAL |
| Rail Origin | RAIL_STATION, RAIL_TERMINAL |
| Rail Destination | RAIL_STATION, RAIL_TERMINAL |
| Inland Origin | ICD, CFS, DEPOT, WAREHOUSE |
| Inland Destination | ICD, CFS, DEPOT, WAREHOUSE |

---

## 4. EXTERNAL REFERENCES

### 4.1 external_references Table

```text
external_references
├── id (UUID PK)
├── tenant_id (UUID FK → tenants)
├── entity_type (TEXT: PARTY, LOCATION, CARRIER, SHIPMENT, ORDER)
├── entity_id (UUID)
├── external_system (TEXT: ERP, CRM, TMS, WMS, CUSTOMS)
├── external_id (TEXT)
├── external_context (JSONB)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── UNIQUE (tenant_id, entity_type, entity_id, external_system)
```

### 4.2 External Systems

| System | Description | Example |
|--------|-------------|---------|
| ERP | Enterprise Resource Planning | SAP, Oracle |
| CRM | Customer Relationship Management | Salesforce |
| TMS | Transportation Management System | |
| WMS | Warehouse Management System | |
| CUSTOMS | Customs System | CEISA 4.0 |

### 4.3 ERP Compatibility

**Standalone:** SENTRALOGIS owns canonical master data.
**ERP-led:** ERP is source of truth for selected master data. external_references maps ERP IDs.
**Hybrid:** ERP owns some attributes while SENTRALOGIS owns operational attributes.

---

## 5. LOCATION HIERARCHY INDEPENDENCE

### 5.1 Principle

**Location hierarchy is independent from Party hierarchy.**

### 5.2 Validation

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Location hierarchy ≠ Party hierarchy | PASS | Separate tables |
| Location parent_id → md_locations | NEW | Design decision |
| Party parent_id → md_entities | PASS | Existing |
| No cross-pollution | PASS | Separate hierarchies |

### 5.3 Example

```text
Party Hierarchy:                    Location Hierarchy:
BYD Group                           Tanjung Priok Port
└── BYD Indonesia                   └── JICT Terminal
    └── BYD Subang Factory              ├── Berth 4
                                        └── Yard A

Party-Location Relationship:
BYD Subang Factory → LOCATED_AT → BYD Subang Factory (location)
BYD Indonesia → OWNS → BYD Subang Factory (location)
```

---

**END OF LOCATION ARCHITECTURE**
