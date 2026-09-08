# SENTRALOGIS — DATA-2
# PARTY & LOCATION ARCHITECTURE

**Date:** 2026-09-02  
**Phase:** DATA-2  
**Nature:** ARCHITECTURE DESIGN ONLY  
**Status:** IMPLEMENTATION NOT AUTHORIZED  

---

## 1. EXECUTIVE ARCHITECTURE

### 1.1 Design Principles

1. **EXTEND + CONSOLIDATE, NOT REBUILD** — md_entities and md_locations are sound foundations
2. **Single canonical authority** — No duplicate party or location masters
3. **Role separation** — Party identity, hierarchy, roles, and relationships are distinct concepts
4. **Contextual roles** — Commercial roles are transaction-context, not global party attributes
5. **Location independence** — Location hierarchy is independent from Party hierarchy
6. **Tenant isolation** — All structures respect IdentityContext + RLS

### 1.2 Architecture Overview

```text
PARTY (md_entities)
├── Identity (existing)
├── Hierarchy (existing: parent_id)
├── Roles (NEW: party_roles)
├── Relationships (NEW: party_relationships)
├── Contacts (NEW: party_contacts)
├── Locations (NEW: party_locations)
└── External References (NEW: external_references)

LOCATION (md_locations)
├── Identity (existing)
├── Type (NEW: location_type enum)
├── Hierarchy (NEW: parent_id)
├── Geography (existing: address, city, country, lat/lng)
├── Operational Attributes (NEW: timezone, external_code)
├── Party Association (via party_locations)
└── External References (NEW: external_references)
```

---

## 2. PARTY MODEL

### 2.1 Party Identity (md_entities — EXISTING)

**Source:** lib/supabase/database.types.ts:6352-6503

**Current Attributes:**
- id (UUID PK)
- entity_code (TEXT, UNIQUE per tenant)
- name (TEXT)
- legal_name (TEXT, nullable)
- tax_id (TEXT, nullable)
- email, phone, mobile, whatsapp (TEXT, nullable)
- is_customer, is_supplier, is_vendor, is_broker (BOOLEAN, nullable)
- vendor_type (TEXT, nullable)
- billing_address, billing_city, billing_province, billing_postal_code
- billing_latitude, billing_longitude
- tenant_id (UUID FK → tenants)
- is_active (BOOLEAN)
- notes (TEXT)
- created_by (UUID FK → users)
- billing_directions, billing_method (TEXT)
- parent_id (UUID FK → md_entities.id, nullable)
- is_own (BOOLEAN)
- payment_terms_days (INTEGER), payment_terms_type (TEXT)
- logo_url (TEXT)
- crm_status (ENUM: NEW, CONTACTED, QUALIFIED, UNQUALIFIED)
- sales_rep_id (UUID FK → profiles)
- vendor_tenant_id (UUID FK → tenants)

**Assessment:** Comprehensive party identity with hierarchy support. CRM fields (crm_status, sales_rep_id) are minor pollution but acceptable.

**Classification:** A — Reuse (extend with roles, relationships, contacts)

---

### 2.2 Party Hierarchy (md_entities.parent_id — EXISTING)

**Source:** Migration 096_add_parent_id_to_md_entities.sql

**Current Behavior:**
- parent_id references md_entities(id)
- ON DELETE SET NULL
- Index: idx_md_entities_parent

**Capabilities:**
- Parent/child relationships
- Arbitrary depth
- Tenant isolation (via tenant_id)
- Child can independently transact

**Gaps:**
- No cycle prevention at DB level
- No depth limit enforcement
- No hierarchy metadata (path, level)

**Decision:** parent_id is sufficient. Cycle prevention and depth limits enforced at application layer. No additional structural metadata needed.

**Classification:** A — Reuse

---

### 2.3 Party Roles (NEW: party_roles)

**Current State:** No formal party role model. Roles are implicit via is_customer, is_supplier, is_vendor, is_broker boolean flags on md_entities.

**Problem:** Boolean flags are global party attributes, not contextual roles. A party can be both Customer and Vendor, but cannot be Bill-To for one transaction and Ship-To for another.

**Design:**

```text
party_roles
├── id (UUID PK)
├── tenant_id (UUID FK → tenants)
├── party_id (UUID FK → md_entities)
├── role_type (TEXT)
├── context_type (TEXT: GLOBAL, ENGAGEMENT, ORDER, SHIPMENT, CONTRACT)
├── context_id (UUID, nullable)
├── is_primary (BOOLEAN)
├── effective_from (DATE)
├── effective_to (DATE, nullable)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
```

**Role Types:**
| Role | Description |
|------|-------------|
| CUSTOMER | Buys services |
| BILL_TO | Receives invoices |
| SHIP_TO | Receives goods |
| SHIPPER | Sends goods |
| CONSIGNEE | Receives goods (shipping) |
| PAYER | Pays invoices |
| ORDERING_PARTY | Places orders |
| NOTIFY_PARTY | Receives notifications |
| SUPPLIER | Supplies goods/services |
| VENDOR | Provides services |
| CARRIER | Transports goods |
| AGENT | Acts on behalf |
| BROKER | Intermediary |

**Context Types:**
| Context | Description |
|---------|-------------|
| GLOBAL | Role applies everywhere |
| ENGAGEMENT | Role for specific engagement |
| ORDER | Role for specific sales order |
| SHIPMENT | Role for specific shipment |
| CONTRACT | Role for specific contract |

**Rules:**
- Parent ≠ Bill-To (no automatic role inheritance)
- A party can hold multiple roles in different contexts
- Roles are tenant-scoped
- UNIQUE constraint prevents duplicate role assignments

**Classification:** E — Architectural Gap (new table required)

---

### 2.4 Party Relationships (NEW: party_relationships)

**Current State:** No formal relationship model. Only hierarchy (parent_id) exists.

**Design:**

```text
party_relationships
├── id (UUID PK)
├── tenant_id (UUID FK → tenants)
├── from_party_id (UUID FK → md_entities)
├── to_party_id (UUID FK → md_entities)
├── relationship_type (TEXT)
├── effective_from (DATE)
├── effective_to (DATE, nullable)
├── created_at (TIMESTAMPTZ)
├── UNIQUE (tenant_id, from_party_id, to_party_id, relationship_type)
```

**Relationship Types:**
| Type | Description |
|------|-------------|
| PARENT_OF | Hierarchy (redundant with parent_id, but explicit) |
| SUBSIDIARY_OF | Subsidiary relationship |
| CUSTOMER_OF | Customer relationship |
| SUPPLIER_OF | Supplier relationship |
| OPERATED_BY | Operated by party |
| OWNED_BY | Owned by party |
| MANAGED_BY | Managed by party |
| AGENT_OF | Agent relationship |
| BROKER_OF | Broker relationship |

**Rules:**
- Relationships are directional (from → to)
- Separate from hierarchy (parent_id)
- Tenant-scoped
- No cross-tenant relationships

**Classification:** E — Architectural Gap (new table required)

---

### 2.5 Contacts (NEW: party_contacts)

**Current State:** No dedicated contact table. md_entity_addresses has contact_person and contact_phone.

**Design:**

```text
party_contacts
├── id (UUID PK)
├── tenant_id (UUID FK → tenants)
├── party_id (UUID FK → md_entities)
├── contact_name (TEXT)
├── contact_role (TEXT: OPERATIONS, FINANCE, MANAGEMENT, EMERGENCY)
├── department (TEXT, nullable)
├── title (TEXT, nullable)
├── email (TEXT, nullable)
├── phone (TEXT, nullable)
├── mobile (TEXT, nullable)
├── whatsapp (TEXT, nullable)
├── is_primary (BOOLEAN)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
```

**Rules:**
- A party can have multiple contacts
- One primary contact per role
- Contacts belong to one party (not shared)
- Tenant-scoped

**Classification:** E — Architectural Gap (new table required)

---

### 2.6 Party Locations (NEW: party_locations)

**Current State:** No formal party-location relationship. md_entity_addresses links entity to address (not location).

**Design:**

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

**Rules:**
- A party can be associated with multiple locations
- A location can be associated with multiple parties
- Relationship type clarifies the nature of association
- Tenant-scoped

**Classification:** E — Architectural Gap (new table required)

---

### 2.7 External References (NEW: external_references)

**Current State:** No formal external reference model.

**Design:**

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

**Rules:**
- Links canonical entities to external system identifiers
- One external ID per system per entity (per tenant)
- Supports ERP-led, SENTRALOGIS-led, and hybrid models
- Tenant-scoped

**Classification:** E — Architectural Gap (new table required)

---

## 3. LOCATION MODEL

### 3.1 Location Identity (md_locations — EXISTING)

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

### 3.2 Location Type (NEW: location_type column)

**Current State:** No location type classification.

**Design:** Add location_type column to md_locations.

**Location Types:**
| Type | Description |
|------|-------------|
| CUSTOMER_SITE | Customer premises |
| FACTORY | Manufacturing facility |
| WAREHOUSE | Storage facility |
| DEPOT | Distribution depot |
| PORT | Seaport |
| TERMINAL | Container terminal |
| BERTH | Berth at port |
| AIRPORT | Airport |
| AIR_CARGO_TERMINAL | Air cargo terminal |
| RAIL_STATION | Rail station |
| RAIL_TERMINAL | Rail terminal |
| ICD | Inland container depot |
| CFS | Container freight station |
| YARD | Storage yard |
| OFFICE | Office location |
| OTHER | Other location |

**Rules:**
- Single type per location (primary classification)
- Type is mutable (location can change purpose)
- Controlled vocabulary via CHECK constraint

**Classification:** B — Extend

---

### 3.3 Location Hierarchy (NEW: parent_id on md_locations)

**Current State:** No location hierarchy support.

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
```

**Classification:** B — Extend

---

### 3.4 Location Geography (md_locations — EXISTING)

**Current Attributes:** address, city, province, postal_code, country, latitude, longitude

**Assessment:** Sufficient for most use cases. Missing: timezone, external codes (UN/LOCODE, IATA).

**Design:** Add timezone and external_code columns.

**External Codes:**
| Code Type | Example | Usage |
|-----------|---------|-------|
| UN/LOCODE | IDJKT | Port codes |
| IATA | CGK | Airport codes |
| UIC | | Rail station codes |

**Rules:**
- external_code does NOT replace canonical SENTRALOGIS identity
- external_code is for reference only
- Stored in external_references for formal mapping

**Classification:** B — Extend

---

### 3.5 Network Location vs Party Location

**Principle:** Location is a canonical reusable object. Party-Location relationship is established via party_locations.

**Network Locations:** Ports, airports, rail terminals, ICDs, CFS — shared infrastructure.
**Party Locations:** Factories, warehouses, offices — party-associated.

**Implementation:**
- Both stored in md_locations
- party_locations links party to location with relationship_type
- No separate tables for network vs party locations

**Classification:** A — Reuse (single md_locations table)

---

### 3.6 POL/POD Semantics

**Principle:** POL and POD are contextual shipment roles pointing to canonical locations.

**Implementation:**
- Shipment.pol_location_id → md_locations
- Shipment.pod_location_id → md_locations
- No separate POL/POD masters

**Classification:** B — Extend (add columns to shp_shipments)

---

## 4. TENANT BOUNDARIES

### 4.1 IdentityContext

All Party and Location operations MUST use:
- IdentityContext.tenant_id (server-derived)
- IdentityContext.userId (for audit)
- IdentityContext.permissions (for authorization)

### 4.2 RLS Policies

All new tables MUST have RLS policies:
```sql
CREATE POLICY "table_tenant_isolation" ON table_name
FOR ALL TO authenticated
USING (tenant_id = get_my_tenant_id())
WITH CHECK (tenant_id = get_my_tenant_id());
```

### 4.3 Cross-Tenant Prevention

- All tables have tenant_id
- All RLS policies use get_my_tenant_id()
- No cross-tenant relationships allowed
- Browser cannot establish tenant identity

---

## 5. CANONICAL AUTHORITY

### 5.1 Party Authority

| Object | Authority | Status |
|--------|-----------|--------|
| Party Identity | md_entities | CANONICAL |
| Party Hierarchy | md_entities.parent_id | CANONICAL |
| Party Roles | party_roles (NEW) | CANONICAL |
| Party Relationships | party_relationships (NEW) | CANONICAL |
| Contacts | party_contacts (NEW) | CANONICAL |
| Party Locations | party_locations (NEW) | CANONICAL |
| External References | external_references (NEW) | CANONICAL |

### 5.2 Location Authority

| Object | Authority | Status |
|--------|-----------|--------|
| Location Identity | md_locations | CANONICAL |
| Location Type | md_locations.location_type | CANONICAL |
| Location Hierarchy | md_locations.parent_id | CANONICAL |
| Location Geography | md_locations (existing) | CANONICAL |
| Party-Location | party_locations (NEW) | CANONICAL |
| External References | external_references (NEW) | CANONICAL |

---

## 6. LEGACY RECONCILIATION

| Legacy Structure | Classification | Reason |
|------------------|----------------|--------|
| md_entities | CANONICAL | Sound foundation, extend only |
| md_locations | CANONICAL | Sound foundation, extend only |
| md_entity_addresses | ADAPTER | Physical addresses, keep for compatibility |
| fw_locations | DUPLICATE AUTHORITY | Duplicate of md_locations, deprecate |
| customers | DUPLICATE AUTHORITY | Duplicate of md_entities, deprecate |
| crm_leads, crm_deals | ADAPTER | CRM-specific, keep separate |
| crm_quotations | ADAPTER | CRM-specific, keep separate |

---

**END OF PARTY & LOCATION ARCHITECTURE**
