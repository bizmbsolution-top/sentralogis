# SENTRALOGIS — DATA-1
# PARTY & LOCATION MODEL

**Date:** 2026-09-02  
**Phase:** DATA-1  
**Nature:** CONCEPTUAL ARCHITECTURE ONLY  

---

## 1. PARTY HIERARCHY

### 1.1 Current State

**Table:** md_entities  
**Mechanism:** parent_id (UUID, FK → md_entities.id, ON DELETE SET NULL)

**Evidence:** Migration 096_add_parent_id_to_md_entities.sql

```sql
ALTER TABLE md_entities ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_md_entities_parent ON md_entities(parent_id);
```

**Capabilities:**
- Parent/child relationships supported
- Hierarchy depth: unlimited (application-enforced)
- Child can independently participate in transactions
- Tenant-scoped

**Gaps:**
- No cycle prevention at DB level
- No hierarchy depth limit
- No automatic role inheritance rules
- No formal party relationship model

---

### 1.2 Invariant Testing

| Invariant | Status | Evidence |
|-----------|--------|----------|
| A Party is not automatically a Bill-To | PASS | No role inheritance in schema |
| Parent/Child hierarchy ≠ commercial role | PASS | parent_id independent of roles |
| Child can transact independently | PASS | child has own tenant_id, entity_code |

---

## 2. COMMERCIAL ROLES

### 2.1 Current State

**No formal party role model exists.**

**Workarounds in legacy tables:**
- fw_order_headers: cargo_owner_name, consignee_name (denormalized)
- shp_shipments: shipper_id, consignee_id, notify_party_id (FK → md_entities)

**Gaps:**
- No Bill-To model
- No Ship-To model  
- No Ordering Party model
- No Payer model
- No role context (engagement vs order vs shipment)
- No effective dating on roles

---

### 2.2 Target Model

**Table:** party_roles

```text
party_roles
├── id (UUID PK)
├── tenant_id (UUID)
├── party_id (UUID FK → md_entities)
├── role_type (TEXT)
├── context_type (TEXT)
├── context_id (UUID)
├── is_primary (BOOLEAN)
├── effective_from, effective_to (DATE)
```

**Role Types:**
- CUSTOMER
- BILL_TO
- SHIP_TO
- SHIPPER
- CONSIGNEE
- ORDERING_PARTY
- PAYER
- NOTIFY_PARTY

---

## 3. CONTACTS

### 3.1 Current State

**Tables:**
- md_entity_addresses (physical addresses)
- No dedicated contact/communication table

**md_entity_addresses:**
```text
md_entity_addresses
├── id (UUID PK)
├── entity_id (UUID FK → md_entities)
├── address_name (TEXT)
├── address_type (TEXT)
├── address (TEXT)
├── city, province, postal_code
├── latitude, longitude
├── contact_person (TEXT)
├── contact_phone (TEXT)
```

**Gaps:**
- No email on addresses
- No dedicated contact table
- No contact role
- No preferred contact method
- No contact reuse across parties

---

## 4. PARTY ↔ LOCATION RELATIONSHIP

### 4.1 Current State

**No formal party-location relationship table.**

**Implicit relationships:**
- md_entity_addresses: entity → address (not location)
- shp_shipments: origin/destination → md_locations
- fw_consolidations: consol_warehouse_origin_id → md_warehouses

**Gaps:**
- No OWNS/OPERATES/MANAGES relationship types
- No party location hierarchy
- No network location vs party location distinction

---

### 4.2 Invariant Testing

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Party Location vs Network Location = context | PARTIAL | md_locations can represent both, but no relationship model |
| Location hierarchy independent from Party hierarchy | PASS | Separate tables |
| Location is canonical reusable | PARTIAL | fw_locations duplicates md_locations |

---

## 5. LOCATION HIERARCHY

### 5.1 Current State

**Table:** md_locations  
**No parent_id for hierarchy.**

**Evidence:** Migration 062_comprehensive_master_columns.sql adds country, address_notes, updated_at — but no parent_id.

**Gaps:**
- No port → terminal → berth hierarchy
- No airport → cargo terminal hierarchy
- No factory → warehouse → receiving area hierarchy
- No external identifiers (UN/LOCODE for ports)

---

### 5.2 Target Model

**Table:** md_locations (extended)

```text
md_locations
├── id (UUID PK)
├── tenant_id (UUID)
├── location_code (TEXT)
├── location_name (TEXT)
├── location_type (TEXT)
├── parent_id (UUID FK → md_locations.id)  ← NEW
├── address (TEXT)
├── city, province, country
├── latitude, longitude
├── external_code (TEXT)  ← NEW (UN/LOCODE, IATA, etc.)
├── is_active (BOOLEAN)
```

---

## 6. NETWORK LOCATIONS

### 6.1 Current State

**Table:** md_locations (can represent network locations)  
**Table:** fw_locations (forwarding-specific, duplicate)

**Examples of network locations:**
- Tanjung Priok Port
- Soekarno-Hatta Airport
- Container Terminal
- Berth

**Problem:** fw_locations duplicates md_locations for forwarding use case.

---

### 6.2 Invariant Testing

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Network locations shared across SBUs | PARTIAL | md_locations exists, but fw_locations duplicates |
| No SBU-specific location masters | FAIL | fw_locations exists |

---

## 7. POL/POD SEMANTICS

### 7.1 Current State

**Legacy (fw_order_headers):**
- origin_port_id → fw_locations
- dest_port_id → fw_locations

**Canonical (shp_shipments):**
- origin_location_id → md_locations
- destination_location_id → md_locations
- No explicit POL/POD columns (gap)

---

### 7.2 Target Model

**Add to shp_shipments:**
- pol_location_id (UUID FK → md_locations) — Port of Loading
- pod_location_id (UUID FK → md_locations) — Port of Discharge

**Principle:** POL/POD are contextual roles pointing to canonical locations, not separate location masters.

---

## 8. PARTY RELATIONSHIPS

### 8.1 Current State

**No formal party relationship model.**

**Implicit relationships:**
- parent_id → hierarchical
- No subsidiary, partnership, or other relationship types

**Gaps:**
- Subsidiary Of
- Customer Of
- Operated By
- Owned By
- Managed By
- Group Of

---

### 8.2 Target Model

**Table:** party_relationships

```text
party_relationships
├── id (UUID PK)
├── tenant_id (UUID)
├── from_party_id (UUID FK → md_entities)
├── to_party_id (UUID FK → md_entities)
├── relationship_type (TEXT)
├── effective_from, effective_to (DATE)
```

---

**END OF PARTY & LOCATION MODEL**
