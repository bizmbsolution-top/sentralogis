# SENTRALOGIS — DATA-2
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-2  
**Nature:** ARCHITECTURE DESIGN ONLY  

---

## 1. DECISIONS CONFIRMED

### 1.1 Party Roles are Contextual

**Decision:** Party roles are transaction-context, not global party attributes.

**Rationale:** A party can be CUSTOMER in one context and SHIP_TO in another. Boolean flags (is_customer, is_vendor) are insufficient.

**Impact:** New party_roles table required.

**ADR Required:** YES — Party Role Architecture

---

### 1.2 parent_id is Sufficient for Hierarchy

**Decision:** parent_id on md_entities is sufficient for party hierarchy. No additional structural metadata needed.

**Rationale:** Cycle prevention and depth limits can be enforced at application layer. Adding path/level columns adds complexity without significant benefit.

**Impact:** No additional hierarchy tables.

**ADR Required:** NO — Simple extension of existing pattern.

---

### 1.3 Location Hierarchy Independent from Party Hierarchy

**Decision:** Location hierarchy (md_locations.parent_id) is independent from party hierarchy (md_entities.parent_id).

**Rationale:** Party hierarchy represents organizational structure. Location hierarchy represents geographic/operational structure. They are fundamentally different concepts.

**Impact:** Add parent_id to md_locations.

**ADR Required:** NO — Simple extension of existing pattern.

---

### 1.4 Single Canonical Location Master

**Decision:** md_locations is the single canonical location master. fw_locations is a duplicate authority.

**Rationale:** All locations (ports, airports, warehouses, factories) should be in one table. location_type distinguishes the nature.

**Impact:** Deprecate fw_locations, migrate to md_locations.

**ADR Required:** NO — Consolidation of existing duplicates.

---

### 1.5 POL/POD are Contextual References

**Decision:** POL and POD are contextual shipment roles pointing to canonical locations. No separate POL/POD masters.

**Rationale:** POL/POD are shipment-specific. Creating separate masters would duplicate location data.

**Impact:** Add pol_location_id, pod_location_id to shp_shipments.

**ADR Required:** NO — Simple extension of existing pattern.

---

### 1.6 External References are Generic

**Decision:** external_references is a generic table for all external system references (ERP, CRM, TMS, WMS, CUSTOMS).

**Rationale:** A single table with entity_type discriminator is simpler than separate tables per system.

**Impact:** New external_references table.

**ADR Required:** YES — External Reference Architecture

---

### 1.7 Party-Location Relationship Table

**Decision:** party_locations is a separate relationship table between md_entities and md_locations.

**Rationale:** Party and Location are separate entities. Their relationship requires semantic clarity (OWNS, OPERATES, USES, etc.).

**Impact:** New party_locations table.

**ADR Required:** NO — Standard many-to-many relationship pattern.

---

### 1.8 Contacts Belong to One Party

**Decision:** party_contacts are owned by one party. No contact sharing across parties.

**Rationale:** Contact sharing creates ambiguity. If a contact works for multiple parties, create separate contact records.

**Impact:** New party_contacts table.

**ADR Required:** NO — Simple ownership model.

---

## 2. ASSUMPTIONS REJECTED

### 2.1 "Every Role Must Be Globally Permanent"

**Rejected:** Roles are contextual. A party can be CUSTOMER for one order and not for another.

**Evidence:** BYD Indonesia is CUSTOMER for domestic shipping but may not be for international.

---

### 2.2 "Parent = Bill-To"

**Rejected:** Parent party is NOT automatically Bill-To.

**Evidence:** No business rule enforces this. Roles must be explicitly assigned.

---

### 2.3 "Location Ownership = Party Ownership"

**Rejected:** Party does NOT automatically own a location.

**Evidence:** A party can USE a location without owning it (e.g., public port).

---

### 2.4 "fw_locations is Canonical"

**Rejected:** fw_locations is a duplicate of md_locations.

**Evidence:** Both tables represent the same concept (locations). fw_locations was created for forwarding-specific use but duplicates canonical data.

---

### 2.5 "Contacts Can Be Shared Across Parties"

**Rejected:** Contacts belong to one party only.

**Evidence:** Sharing creates ambiguity about who the contact represents.

---

## 3. ARCHITECTURAL CONTRADICTIONS

### 3.1 fw_locations vs md_locations

**Contradiction:** Two location masters exist.

**Resolution:** Deprecate fw_locations, migrate to md_locations.

---

### 3.2 is_customer vs party_roles

**Contradiction:** Boolean flags conflict with contextual role model.

**Resolution:** Deprecate boolean flags, migrate to party_roles.

---

### 3.3 CRM Fields on md_entities

**Contradiction:** crm_status and sales_rep_id pollute canonical party table.

**Resolution:** Move CRM fields to CRM domain over time.

---

## 4. REUSE RECOMMENDATIONS

| Existing Model | Reuse For | Classification |
|----------------|-----------|----------------|
| md_entities | All party types | A — Reuse |
| md_entities.parent_id | Party hierarchy | A — Reuse |
| md_locations | All locations | A — Reuse |
| md_entity_addresses | Physical addresses | A — Reuse |
| md_transporters | Transporter attributes | A — Reuse |
| shp_shipments | All shipments | A — Reuse |
| commercial_work_orders | All engagements | A — Reuse |

---

## 5. EXTENSION RECOMMENDATIONS

| Existing Model | Extension | Classification |
|----------------|-----------|----------------|
| md_entities | Add party_roles table | B — Extend |
| md_entities | Add party_relationships table | B — Extend |
| md_entities | Add party_contacts table | B — Extend |
| md_locations | Add parent_id for hierarchy | B — Extend |
| md_locations | Add location_type column | B — Extend |
| md_locations | Add timezone, external_code | B — Extend |
| shp_shipments | Add pol_location_id, pod_location_id | B — Extend |

---

## 6. DEPRECATION CANDIDATES

| Table/Column | Reason | Classification |
|--------------|--------|----------------|
| fw_locations | Duplicate of md_locations | D — Deprecate |
| is_customer (md_entities) | Replaced by party_roles | D — Deprecate |
| is_supplier (md_entities) | Replaced by party_roles | D — Deprecate |
| is_vendor (md_entities) | Replaced by party_roles | D — Deprecate |
| is_broker (md_entities) | Replaced by party_roles | D — Deprecate |
| crm_status (md_entities) | CRM pollution | D — Deprecate |
| sales_rep_id (md_entities) | CRM pollution | D — Deprecate |

---

## 7. ADR REQUIREMENTS

### 7.1 ADR Required: Party Role Architecture

**Topic:** Party role model (global vs contextual, role types, context types).

**Reason:** Materially changes how parties are classified and accessed across domains.

**Architectural Impact:** All domains must use party_roles instead of boolean flags.

**ADR Number:** TBD

---

### 7.2 ADR Required: External Reference Architecture

**Topic:** Generic external reference model for ERP/CRM/TMS/WMS/CUSTOMS.

**Reason:** Establishes canonical pattern for external system integration.

**Architectural Impact:** All external ID mappings use external_references table.

**ADR Number:** TBD

---

### 7.3 No ADR Required: Location Hierarchy

**Topic:** parent_id on md_locations.

**Reason:** Simple extension of existing pattern (same as md_entities.parent_id).

**Architectural Impact:** None — follows established pattern.

---

### 7.4 No ADR Required: Party-Location Relationship

**Topic:** party_locations table.

**Reason:** Standard many-to-many relationship pattern.

**Architectural Impact:** None — follows established pattern.

---

## 8. UNRESOLVED QUESTIONS

### 8.1 Cross-Tenant Party Sharing

**Question:** Can a party be shared across tenants (e.g., a carrier that serves multiple tenants)?

**Current State:** vendor_tenant_id on md_entities suggests cross-tenant references exist.

**Recommendation:** Defer to future phase. For now, parties are tenant-scoped.

---

### 8.2 Location Tenant Scope

**Question:** Should network locations (ports, airports) be tenant-scoped or global?

**Current State:** md_locations has tenant_id (nullable).

**Recommendation:** Network locations should be tenant-scoped but shared via tenant_id = NULL or a "system" tenant.

---

### 8.3 Contact Reuse Across Parties

**Question:** Can a contact person work for multiple parties?

**Current State:** party_contacts owns contact to one party.

**Recommendation:** If yes, create a separate contact_shares table. For now, one contact = one party.

---

**END OF DECISION LOG**
