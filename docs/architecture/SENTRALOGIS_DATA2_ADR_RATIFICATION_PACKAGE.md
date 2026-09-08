# SENTRALOGIS — DATA-2
# ADR RATIFICATION PACKAGE

**Date:** 2026-09-02  
**Phase:** DATA-2 → ADR Ratification  
**Nature:** GOVERNANCE / ARCHITECTURE RATIFICATION ONLY  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. EXECUTIVE SUMMARY

DATA-2 established the canonical Party & Location architecture. DATA-2R performed independent forensic reconciliation. DATA-2R-C closed all three conditions with forensic evidence.

This package presents two ADRs for human ratification:

| ADR | Title | Status |
|-----|-------|--------|
| ADR-070 | Canonical Party Role Architecture | **AMENDED** — PENDING RATIFICATION |
| ADR-071 | External Reference Architecture | PROPOSED — PENDING RATIFICATION |

### Amendment (2026-09-02)

**Finding:** SHIPPER, CONSIGNEE, NOTIFY_PARTY in party_roles would duplicate canonical authority already represented by `shp_shipments.shipper_id`, `shp_shipments.consignee_id`, `shp_shipments.notify_party_id`.

**Resolution:** Removed these 3 roles from party_roles vocabulary. Shipment context roles remain as direct FK references on shp_shipments.

**Final party_roles vocabulary (10 roles):**
- Global Party Roles (6): CUSTOMER, VENDOR, SUPPLIER, BROKER, CARRIER, AGENT
- Commercial Context Roles (4): BILL_TO, SHIP_TO, PAYER, ORDERING_PARTY

---

## 2. EVIDENCE MATRIX

| Evidence Source | Finding | Supports |
|-----------------|---------|----------|
| DATA-1 Discovery | md_entities is canonical party authority (73+ refs) | ADR-070 |
| DATA-1 Discovery | md_locations is canonical location authority | ADR-070 |
| DATA-1 Discovery | No formal external reference model exists | ADR-071 |
| DATA-2 Architecture | party_roles design is sound | ADR-070 |
| DATA-2 Architecture | external_references design is sound | ADR-071 |
| DATA-2R Reconciliation | No duplicate party/location authority | ADR-070 |
| DATA-2R Reconciliation | Tenant isolation preserved | ADR-070, ADR-071 |
| DATA-2R-C Condition A | is_vendor migration is deterministic (131 refs, 0 unmappable) | ADR-070 |
| DATA-2R-C Condition B | location_type mapping is deterministic (3 FW types, 0 unmappable) | ADR-070 |
| DATA-2R-C Condition C | Hierarchy safety proven (application-layer sufficient) | ADR-070 |

---

## 3. CONTRADICTION REVIEW

### 3.1 U-Series Compatibility

| U-Series | Compatibility | Notes |
|----------|---------------|-------|
| U-01 Identity Resolver | PASS | md_entities preserved |
| U-02 Authorization | PASS | party_roles ≠ authorization |
| U-03 Engagement | PASS | commercial_work_orders preserved |
| U-05 Capability Registry | PASS | No conflict |
| U-06 Capability Binding | PASS | No conflict |
| U-07 Execution Lineage | PASS | No conflict |
| U-08 Forwarding Writer Guard | PASS | No conflict |
| U-10 Static Architecture Gates | PASS | No conflict |
| U-11 Quote Identity Authority | PASS | No conflict |
| U-12 Commercial Lineage | PASS | No conflict |
| U-13 Sales Order | PASS | No conflict |
| U-14/U-15 Fulfillment | PASS | No conflict |

### 3.2 ADR Compatibility

| ADR Range | Domain | Compatibility |
|-----------|--------|---------------|
| ADR-018..038 | Commercial/Shipment | PASS |
| ADR-039..056 | Fulfillment/Handoff | PASS |
| ADR-057..066 | Pricing | PASS |
| ADR-067..069 | Financial | PASS |

### 3.3 Token Compatibility

| Token Component | Compatibility |
|-----------------|---------------|
| TOKEN-3 Foundation | PASS |
| TOKEN-4 Integration | PASS |
| Token burn authority | NOT affected |
| Token completion authority | NOT affected |

### 3.4 Forwarding Compatibility

| Forwarding Component | Compatibility |
|----------------------|---------------|
| shp_shipments | PASS |
| shp_units | PASS |
| shp_execution_legs | PASS |
| Multimodal model | PASS |

---

## 4. ADR DEPENDENCY GRAPH

```
ADR-070 (Party Role Architecture)
├── Depends on: ADR-018 (Engagement Root)
├── Depends on: ADR-031 (Anti-Corruption Boundary)
├── Depends on: ADR-034 (Engagement → Sales Order)
└── Required by: ADR-071 (External Reference)

ADR-071 (External Reference Architecture)
├── Depends on: ADR-070 (Party Role Architecture)
└── Depends on: ADR-031 (Anti-Corruption Boundary)
```

---

## 5. MIGRATION GOVERNANCE

### 5.1 Phase 1: Introduce Canonical Architecture

- Create party_roles, party_relationships, party_contacts, party_locations, external_references
- Add RLS policies and indexes
- Add location_type, parent_id, timezone, external_code to md_locations
- Add pol_location_id, pod_location_id to shp_shipments

### 5.2 Phase 2: Dual-Write / Controlled Synchronization

- Dual-write is_vendor and party_roles
- Dual-write is_customer and party_roles
- Migrate fw_locations data to md_locations

### 5.3 Phase 3: Migrate All Consumers

- Migrate 131 is_vendor references to party_roles
- Migrate is_customer references to party_roles
- Migrate EasyGo integration to party_roles
- Migrate UI badges to party_roles

### 5.4 Phase 4: Regression and Forensic Verification

- Run full regression suite
- Verify assignment logic
- Verify fleet-status logic
- Verify cost-audit logic
- Verify EasyGo integration

### 5.5 Phase 5: Remove Deprecated Legacy Fields

- Remove is_customer, is_vendor, is_supplier, is_broker from code
- Remove fw_locations table
- Remove deprecated columns from md_entities (future)

**No phase may be interpreted as automatically authorized by this ADR.**

---

## 6. IMPLEMENTATION PREREQUISITES

| Prerequisite | Status |
|--------------|--------|
| ADR-070 ratification | PENDING |
| ADR-071 ratification | PENDING |
| Migration strategy approval | PENDING |
| Stakeholder review | PENDING |
| Security review | PENDING |

---

## 7. UNRESOLVED QUESTIONS

| Question | Impact | Resolution |
|----------|--------|------------|
| Cross-tenant party sharing | Medium | Defer to future phase |
| Location tenant scope | Medium | Defer to future phase |
| Contact reuse across parties | Low | Defer to future phase |

---

## 8. CRITICAL FINDINGS

### 8.1 is_vendor is Overloaded

`is_vendor` carries multiple meanings across contexts. The migration to party_roles.VENDOR is semantically correct but requires careful consumer-by-consumer validation.

### 8.2 is_vendor_fleet is Derived

`is_vendor_fleet` is derived from `vendor_tenant_id`, NOT from `is_vendor`. Fleet-status API needs NO migration.

### 8.3 WMS Location Types are Warehouse-Internal

WMS location_type values (STORAGE, PICKING, etc.) are warehouse-internal and do NOT map to md_locations. No conflict.

---

## 9. RISK SUMMARY

| Risk | Severity | Mitigation |
|------|----------|------------|
| is_vendor migration | HIGH | Dual-write period, exhaustive consumer inventory |
| fw_locations migration | MEDIUM | Pre-migration FK scan |
| party_roles query performance | MEDIUM | Proper indexing |
| Hierarchy cycles | LOW | Application-layer validation |

---

**END OF ADR RATIFICATION PACKAGE**
