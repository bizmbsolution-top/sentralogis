# SENTRALOGIS — DATA-4
# DISCOVERY REPORT

**Date:** 2026-09-02  
**Phase:** DATA-4  
**Nature:** FORENSIC DISCOVERY + ARCHITECTURE ANALYSIS  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. EXECUTIVE SUMMARY

DATA-4 forensic discovery analyzed the existing SENTRALOGIS resource and transport network architecture. The analysis reveals a **domain-specific resource model** where fleets, drivers, and transporters are well-established operational concepts, but a unified enterprise Resource abstraction does not exist. The key finding is that most resource-like concepts already have canonical authorities within their respective domains. A generic enterprise Resource master is NOT recommended at this time. Instead, the architecture should focus on **relationship clarity** (Party-Resource, Location-Network) and **capability governance** through the existing Capability Registry.

---

## 2. BASELINE

| Metric | Value |
|--------|-------|
| TypeScript errors | 0 |
| Full regression | 1273/1273 PASS |

---

## 3. REPOSITORY INVENTORY

### 3.1 Existing Resource-Like Entities

| Entity | Table | Meaning | Domain |
|--------|-------|---------|--------|
| Fleet | md_fleets | Vehicle master | Trucking |
| Fleet Type | md_fleet_types | Vehicle classification | Trucking |
| Driver | md_drivers | Driver master | Trucking |
| Driver Profile | driver_profiles | Cross-tenant driver identity | Trucking |
| Driver Tenant Link | driver_tenant_links | Cross-tenant driver-party | Trucking |
| Transporter | md_transporters | Transport provider | Trucking |
| Transporter Fleet | md_transporter_fleets | Transporter-fleet link | Trucking |
| Transporter Driver | md_transporter_drivers | Transporter-driver link | Trucking |
| Fleet GPS Status | fleet_gps_status | GPS tracking | Trucking |
| Driver Coins | driver_coins | Driver rewards | Trucking |
| Driver Allowances | md_driver_allowances | Driver cost config | Trucking |
| Driver Attendance | driver_attendance | Absensi driver | Trucking |
| Fleet Inspections | fleet_inspections | Vehicle inspection | Trucking |

### 3.2 Existing Container/Unit Entities

| Entity | Table | Meaning | Domain |
|--------|-------|---------|--------|
| Shipment Unit | shp_units | Generic shipment unit | Forwarding |
| Container Unit | shp_unit_containers | Container details | Forwarding |
| Vehicle Unit | shp_unit_vehicles | Vehicle cargo | Forwarding |
| Bulk Unit | shp_unit_bulk | Bulk cargo | Forwarding |
| Package Unit | shp_unit_packages | Package cargo | Forwarding |
| FW Container | fw_container_assignments | Legacy container | Forwarding |
| FW Container Item | fw_container_items | Legacy container item | Forwarding |
| FW Box | fw_box_assignments | Legacy box | Forwarding |
| FW Box Item | fw_box_items | Legacy box item | Forwarding |

### 3.3 Existing Location Entities

| Entity | Table | Meaning | Domain |
|--------|-------|---------|--------|
| Location | md_locations | Canonical location | Enterprise |
| FW Location | fw_locations | Legacy forwarding location | Forwarding |
| Warehouse | md_warehouse | Warehouse master | WMS |
| Warehouse Location | md_warehouse_locations | Warehouse zones | WMS |

### 3.4 Existing Transport Network Concepts

| Concept | Current Representation |
|---------|----------------------|
| Transport Mode | shp_execution_legs.transport_mode (enum) |
| Route | job_routes (trucking-specific) |
| Lane | Not modeled |
| Corridor | Not modeled |
| Vessel | Not modeled (free text in fw_order_headers) |
| Voyage | Not modeled (free text in fw_consolidations) |
| Terminal | Not modeled (location type only) |
| Berth | Not modeled (location type only) |
| Airport | Not modeled (location type only) |
| Rail Station | Not modeled (location type only) |
| GPS Device | fleet_gps_status (tracking only) |

---

## 4. PARTY/RESOURCE BOUNDARY

### 4.1 Party vs Resource Distinction

| Concept | Is Party? | Is Resource? | Current Authority |
|---------|-----------|--------------|-------------------|
| PT ABC Logistics | YES | NO | md_entities |
| Truck B 1234 XYZ | NO | YES | md_fleets |
| Driver Ahmad | NO | YES | md_drivers |
| Container TRHU123 | NO | YES | shp_unit_containers |

### 4.2 Ownership Relationships

| Resource | Owner | Operator | Current Model |
|----------|-------|----------|---------------|
| Fleet | md_entities (via entity_id) | transporter | md_fleets.entity_id → md_entities |
| Driver | md_entities (via entity_id) | transporter | md_drivers.entity_id → md_entities |
| Container | Not modeled | - | shp_unit_containers |

---

## 5. LOCATION/NETWORK BOUNDARY

### 5.1 Location vs Network Node

| Concept | Is Location? | Is Network Node? | Current Authority |
|---------|--------------|------------------|-------------------|
| Tanjung Priok Port | YES | YES | md_locations (type: PORT) |
| JICT Terminal | YES | YES | md_locations (type: TERMINAL) |
| Berth 4 | YES | YES | md_locations (type: BERTH) |
| Trade Lane SIN-JKT | NO | YES | Not modeled |

### 5.2 Network Participation

Network participation can be represented through:
- Location hierarchy (Port → Terminal → Berth)
- Location type classification
- party_locations relationships

**No separate network node authority is needed.**

---

## 6. CARRIER ANALYSIS

### 6.1 Current Carrier Representation

| Aspect | Current Model |
|--------|---------------|
| Identity | md_entities (entity_type) |
| Role | party_roles.CARRIER (post-DATA-3) |
| Mode Capability | Not modeled |
| Contract | md_transporters |
| Fleet | md_fleets via md_transporter_fleets |
| Driver | md_drivers via md_transporter_drivers |

### 6.2 Carrier = Party + Role + Capability

Carrier is correctly represented by:
- **Party identity** → md_entities
- **Carrier role** → party_roles.CARRIER (GLOBAL)
- **Mode capability** → Can be derived from shp_execution_legs.transport_mode history

**No separate carrier master is needed.**

---

## 7. DRIVER ANALYSIS

### 7.1 Driver Identity

| Aspect | Current Model |
|--------|---------------|
| Identity | md_drivers |
| Cross-tenant | driver_profiles + driver_tenant_links |
| Party link | md_drivers.entity_id → md_entities |
| Authorization | NOT U-02 (driver is not app user) |

### 7.2 Driver Classification

Driver is an **operational resource / execution actor**, NOT:
- Party (driver is a person, not an organization)
- Application User (driver doesn't log in via U-01/U-02)
- Staff (driver is external to SENTRALOGIS org)

**Recommendation:** Driver remains domain-specific (trucking). No enterprise Resource abstraction needed.

---

## 8. FLEET ANALYSIS

### 8.1 Fleet Identity

| Aspect | Current Model |
|--------|---------------|
| Identity | md_fleets |
| Type | md_fleet_types |
| Ownership | md_fleets.entity_id → md_entities |
| GPS | fleet_gps_status |
| EasyGo | External integration |

### 8.2 is_vendor_fleet

`is_vendor_fleet` is **derived from `vendor_tenant_id`** (NOT from is_vendor). This is a critical invariant:
- `is_vendor_fleet` = fleet owned by different tenant
- NOT equivalent to party_roles.VENDOR

**Recommendation:** Fleet remains domain-specific. No enterprise Resource abstraction needed.

---

## 9. CONTAINER BOUNDARY

### 9.1 Container Contexts

| Context | Authority |
|---------|-----------|
| Shipment Unit | shp_unit_containers (canonical) |
| Legacy Forwarding | fw_container_assignments (legacy) |

### 9.2 Recommendation

Container as a **shipment unit** is already canonical (shp_unit_containers).
Container as a **master resource** is NOT needed — containers are shipment-specific.

---

## 10. MULTIMODAL BOUNDARY

### 10.1 Canonical Shipment Architecture

| Concept | Authority |
|---------|-----------|
| Shipment | shp_shipments |
| Cargo | shp_manifest_items |
| Shipment Unit | shp_units + subtypes |
| Transport Plan | shp_execution_plans |
| Execution Leg | shp_execution_legs |
| Transport Mode | shp_execution_legs.transport_mode |

### 10.2 Resource vs Execution

| Concept | Is Resource? | Is Execution? |
|---------|--------------|---------------|
| Truck B 1234 | YES | NO |
| Container TRHU123 | NO (shipment-specific) | YES |
| Road Leg | NO | YES |
| Driver Ahmad | YES | NO |

---

## 11. LEGACY ANALYSIS

### 11.1 fw_locations

| Aspect | Finding |
|--------|---------|
| Status | Legacy duplicate authority |
| Readers | fw_order_headers, fw_legs |
| Writers | None found |
| Migration complexity | MEDIUM |

### 11.2 is_vendor

| Aspect | Finding |
|--------|---------|
| Status | Transitional (backfill done) |
| Consumer count | ~131 references |
| Migration complexity | HIGH |

---

## 12. EXTERNAL REFERENCE ANALYSIS

### 12.1 Current External IDs

| Resource | External ID | Belongs in external_references? |
|----------|-------------|-------------------------------|
| Vehicle | EasyGo vehicle ID | YES |
| Vehicle | GPS device ID | YES |
| Fleet | fleet_code | NO (intrinsic attribute) |
| Location | UN/LOCODE | YES (via md_locations.external_code) |
| Party | ERP Customer ID | YES |

### 12.2 Recommendation

External references should be used for **cross-system identity mapping** only. Intrinsic identifiers (fleet_code, plate_number) should remain as table attributes.

---

## 13. ARCHITECTURAL OPTIONS

### 13.1 Resource Model Options

| Model | Description | Score |
|-------|-------------|-------|
| A — No Enterprise Resource | Domain-specific resources remain canonical | **HIGH** |
| B — Generic Enterprise Resource | Single resource identity with extensions | LOW |
| C — Resource Registry + Specialized Tables | resources + vehicle_details etc. | MEDIUM |
| D — Capability-Oriented Network | Resource + capabilities + relationships | MEDIUM |

**Recommendation: Model A** — No enterprise Resource abstraction. Domain-specific resources (md_fleets, md_drivers) are already well-governed.

### 13.2 Transport Network Options

| Model | Description | Score |
|-------|-------------|-------|
| A — Location Hierarchy Only | Port → Terminal → Berth | **HIGH** |
| B — Location + Network Participation | Location + network roles | MEDIUM |
| C — Location + Nodes + Routes | Full network model | LOW |

**Recommendation: Model A** — Location hierarchy is sufficient. Network participation can be derived from party_locations + location type.

---

## 14. RECOMMENDATION

### 14.1 No Enterprise Resource Abstraction

**Do NOT create a generic Resource master.** Domain-specific resources (md_fleets, md_drivers) are already well-governed and serve their operational purposes.

### 14.2 Focus on Relationship Clarity

The architectural priority should be:
1. **Party-Resource relationships** (owner, operator, manager)
2. **Location-Network participation** (via location hierarchy + type)
3. **Carrier mode capability** (via Capability Registry or derived from execution history)
4. **External reference mapping** (via external_references)

### 14.3 Legacy Migration

- **fw_locations** → Migrate to md_locations in dedicated phase
- **is_vendor consumers** → Migrate incrementally

---

## 15. RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| fw_locations duplicate authority | MEDIUM | Dedicated migration phase |
| is_vendor consumer migration | HIGH | Incremental migration with semantic analysis |
| Carrier mode capability not modeled | LOW | Derive from execution history |
| Driver identity cross-tenant | LOW | driver_profiles already handles this |

---

## 16. REQUIRED ADRs

| Topic | Required | Rationale |
|-------|----------|-----------|
| Enterprise Resource Authority | **NO** | No new Resource abstraction needed |
| Resource Capability Architecture | **NO** | Use existing Capability Registry |
| Carrier Mode Capability | **MAYBE** | If mode capability needs explicit modeling |
| Transport Network Architecture | **NO** | Location hierarchy sufficient |
| fw_locations Migration | **YES** | When migration is authorized |
| is_vendor Consumer Migration | **YES** | When migration is authorized |

---

## 17. FINAL GATE

### GREEN — DATA-4 DISCOVERY COMPLETE

- Current architecture is sufficiently understood
- Canonical boundaries are identifiable
- Recommended architecture is defensible (Model A for both Resource and Network)
- No blocking unknowns remain
- ADR package can be prepared for legacy migration

---

**END OF DISCOVERY REPORT**
