# SENTRALOGIS — DATA-4
# NETWORK INVENTORY

**Date:** 2026-09-02  
**Phase:** DATA-4  
**Nature:** FORENSIC DISCOVERY  

---

## Location Hierarchy (Canonical)

| Level | Type | Parent |
|-------|------|--------|
| 1 | PORT | null |
| 2 | TERMINAL | PORT |
| 3 | BERTH | TERMINAL |

| Level | Type | Parent |
|-------|------|--------|
| 1 | AIRPORT | null |
| 2 | AIR_CARGO_TERMINAL | AIRPORT |

| Level | Type | Parent |
|-------|------|--------|
| 1 | FACTORY | null |
| 2 | WAREHOUSE | FACTORY |

---

## Transport Mode

| Mode | Current Representation |
|------|----------------------|
| MARITIME | shp_execution_legs.transport_mode = 'OCEAN_VESSEL' |
| AIR | shp_execution_legs.transport_mode = 'AIR_FREIGHT' |
| ROAD | shp_execution_legs.transport_mode = 'ROAD_TRUCK' |
| RAIL | shp_execution_legs.transport_mode = 'RAIL_FREIGHT' |

---

## Route / Lane

| Concept | Current |
|---------|---------|
| Route | job_routes (trucking-specific) |
| Lane | Not modeled |
| Corridor | Not modeled |
| Trade Lane | Not modeled |

---

## Network Node vs Location

| Concept | Is Location? | Network Participation |
|---------|--------------|----------------------|
| Port | YES | Via location type + hierarchy |
| Terminal | YES | Via location type + hierarchy |
| Airport | YES | Via location type |
| Depot | YES | Via location type |
| Rail Station | YES | Via location type |

**No separate network node authority needed.**

---

## External Network Identifiers

| Identifier | Current | Recommendation |
|------------|---------|----------------|
| UN/LOCODE | md_locations.external_code | KEEP (intrinsic) |
| IATA | Not modeled | Add to external_code if needed |
|IMO | Not modeled | Add to external_references if needed |
| EasyGo Vehicle ID | Not modeled | Add to external_references |

---

**END OF NETWORK INVENTORY**
