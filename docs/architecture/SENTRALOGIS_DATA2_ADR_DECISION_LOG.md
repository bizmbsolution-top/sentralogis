# SENTRALOGIS — DATA-2
# ADR DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-2 → ADR Ratification  
**Nature:** GOVERNANCE / ARCHITECTURE RATIFICATION ONLY  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  
**Amended:** 2026-09-02 — Shipment role authority separation  

---

## 1. DECISIONS CONFIRMED

### 1.0 Shipment Role Authority Separation (AMENDMENT 2026-09-02)

**Decision:** SHIPPER, CONSIGNEE, and NOTIFY_PARTY are NOT members of the party_roles vocabulary. Their canonical authority is `shp_shipments` direct FK references.

**Evidence:**
- `shp_shipments.shipper_id UUID REFERENCES md_entities(id)` (Migration 20260826_003)
- `shp_shipments.consignee_id UUID REFERENCES md_entities(id)` (Migration 20260826_003)
- `shp_shipments.notify_party_id UUID REFERENCES md_entities(id)` (Migration 20260826_003)

**Reasoning:** ONE BUSINESS FACT → ONE CANONICAL AUTHORITY. Shipment contextual roles are owned by the Shipment aggregate. Adding them to party_roles would create duplicate authority and synchronization risk.

**Consequence:** party_roles vocabulary reduced from 13 to 10 roles. Shipment context roles remain on shp_shipments.

### 1.1 Party Identity and Role are Separate

**Decision:** Party identity (md_entities) and Party role (party_roles) are distinct canonical concepts.

**Evidence:** 73+ code references use md_entities for identity. Boolean flags are insufficient for contextual roles.

**Consequence:** New party_roles table required. Boolean flags deprecated.

---

### 1.2 Party Hierarchy ≠ Party Role

**Decision:** parent_id hierarchy does NOT determine commercial roles.

**Evidence:** No business rule enforces parent = Bill-To. Roles must be explicitly assigned.

**Consequence:** party_roles assigned independently of hierarchy.

---

### 1.3 is_vendor = Legacy VENDOR Role

**Decision:** is_vendor is legacy representation of party_roles.VENDOR (GLOBAL).

**Evidence:** DATA-2R-C identified 131 references. Semantic mapping is deterministic.

**Consequence:** Migration required. Dual-write period recommended.

---

### 1.4 is_vendor_fleet is Derived

**Decision:** is_vendor_fleet is derived from vendor_tenant_id, NOT from is_vendor.

**Evidence:** fleet-status/route.ts:101 uses `!!fleet.vendor_tenant_id && fleet.vendor_tenant_id !== tenantId`.

**Consequence:** Fleet-status API needs NO migration.

---

### 1.5 WMS Location Types are Warehouse-Internal

**Decision:** md_warehouse_locations.location_type values do NOT map to md_locations.

**Evidence:** WMS types (STORAGE, PICKING, etc.) are operational zones, not network locations.

**Consequence:** WMS types stay in md_warehouse_locations. Only warehouse-level maps to md_locations.

---

### 1.6 Single Canonical Location Master

**Decision:** md_locations is the single canonical location master. fw_locations is a duplicate.

**Evidence:** fw_locations duplicates md_locations with separate type enum.

**Consequence:** Deprecate fw_locations, migrate to md_locations.

---

### 1.7 External References are Governed

**Decision:** external_references is a governed table with controlled vocabularies.

**Evidence:** No existing formal external reference model. Integration IDs are scattered.

**Consequence:** New external_references table with CHECK constraints + UNIQUE.

---

### 1.8 Application-Layer Cycle Prevention

**Decision:** parent_id cycle prevention at application layer is sufficient for v1.

**Evidence:** md_entities.parent_id has operated without DB triggers. Pattern is established.

**Consequence:** No DB triggers needed initially.

---

### 1.9 Contact ≠ User Identity

**Decision:** party_contacts are communication endpoints, NOT authentication identities.

**Evidence:** profiles/auth.users exist separately for authentication.

**Consequence:** party_contacts owned by one party, not shared.

---

### 1.10 Historical Integrity via ID References

**Decision:** Transactions reference entities by ID, not hierarchy path.

**Evidence:** shp_shipments.customer_id, origin_location_id are UUID references.

**Consequence:** Hierarchy changes do NOT affect historical transactions.

---

## 2. ASSUMPTIONS REJECTED

### 2.1 "Boolean flags are sufficient"

**Rejected:** Boolean flags cannot represent contextual roles (a party can be CUSTOMER for one order and not for another).

**Resolution:** party_roles with context_type.

---

### 2.2 "is_vendor_fleet depends on is_vendor"

**Rejected:** is_vendor_fleet is derived from vendor_tenant_id.

**Resolution:** Fleet-status API needs no migration.

---

### 2.3 "WMS location types map to md_locations"

**Rejected:** WMS types are warehouse-internal operational zones.

**Resolution:** WMS types stay in md_warehouse_locations.

---

### 2.4 "Parent = Bill-To"

**Rejected:** No business rule enforces this. Roles must be explicitly assigned.

**Resolution:** party_roles independent of hierarchy.

---

### 2.5 "External IDs can be free-text metadata"

**Rejected:** Free-text metadata has no governance, no uniqueness, no validation.

**Resolution:** external_references with controlled vocabularies + UNIQUE constraint.

---

## 3. ADR REQUIREMENTS

| ADR | Required | Rationale |
|-----|----------|-----------|
| ADR-070 Party Role Architecture | YES | Cross-cutting authority change (131 references) |
| ADR-071 External Reference Architecture | YES | Cross-cutting integration pattern |
| Hierarchy Integrity | NO | Established pattern (parent_id) |
| Location Hierarchy | NO | Established pattern (parent_id) |
| Party-Location Relationship | NO | Standard many-to-many |
| Transaction-Context Roles | NO | Governed by ADR-070 |

---

## 4. UNRESOLVED QUESTIONS

| Question | Impact | Resolution |
|----------|--------|------------|
| Cross-tenant party sharing | Medium | Defer to future phase |
| Location tenant scope | Medium | Defer to future phase |
| Contact reuse across parties | Low | Defer to future phase |
| External reference validation rules | Low | Defer to future phase |
| Party role hierarchy/inheritance | Low | Defer to future phase |

---

## 5. MIGRATION BLOCKERS

### 5.1 Resolved Blockers

| Blocker | Resolution |
|---------|------------|
| is_vendor has active business logic | Dual-write period + exhaustive consumer inventory |
| fw_locations has FK references | Pre-migration FK scan + validation |
| location_type enum conflict | FW types map to canonical, WMS types stay separate |

### 5.2 Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missed is_vendor reader | HIGH | Exhaustive grep + test coverage |
| party_roles query performance | MEDIUM | Proper indexing |
| Assignment logic regression | HIGH | Integration tests |

---

## 6. CONSEQUENCES

### 6.1 Positive Consequences

- Single canonical role authority (party_roles)
- Contextual roles possible (BILL_TO, SHIP_TO, etc.)
- Role-based access control future capability
- External identity governance (external_references)
- ERP-led/hybrid operating modes supported
- Legacy boolean flags deprecated

### 6.2 Negative Consequences

- 131 is_vendor references require migration
- fw_locations migration required (FK updates)
- Additional tables to maintain
- Performance impact from party_roles joins (mitigated by indexing)

---

## 7. RATIFICATION STATUS

| ADR | Status | Blocker |
|-----|--------|---------|
| ADR-070 Party Role Architecture | PENDING HUMAN RATIFICATION | None |
| ADR-071 External Reference Architecture | PENDING HUMAN RATIFICATION | None |

---

## 8. VERDICT

### 8.1 DATA-2 Overall Verdict

**PASS — ADR READY FOR RATIFICATION**

### 8.2 DATA-3 Readiness

**READY FOR AUTHORIZATION** — After ADR ratification.

---

**END OF ADR DECISION LOG**
