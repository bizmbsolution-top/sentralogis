# SENTRALOGIS — DATA-2R
# CONTRADICTION REGISTER

**Date:** 2026-09-02  
**Phase:** DATA-2R  
**Nature:** INDEPENDENT FORENSIC RECONCILIATION  

---

## 1. DUPLICATE AUTHORITY CONTRADICTIONS

| # | Contradiction | Classification | Severity | Status |
|---|---------------|----------------|----------|--------|
| 1 | fw_locations vs md_locations | Duplicate Location Authority | HIGH | KNOWN — Scheduled for deprecation |
| 2 | is_customer/is_vendor vs boolean flags | Migration dependency | MEDIUM | KNOWN — Requires migration proof |
| 3 | FW location_type vs WMS location_type | Enum scope conflict | LOW | KNOWN — Different scopes |

---

## 2. BOOLEAN DEPRECATION CONTRADICTIONS

| # | Boolean | Contradiction | Severity | Resolution |
|---|---------|---------------|----------|------------|
| 1 | is_vendor | Active business logic in assignment.ts:253, fleet-status:148, EasyGoSyncService:129 | **HIGH** | Must migrate all readers/writers before deprecation |
| 2 | is_customer | Single reader in assignment.ts:253 | LOW | Update reader |
| 3 | is_supplier | No active usage | LOW | Safe to deprecate |
| 4 | is_broker | No active usage | LOW | Safe to deprecate |

---

## 3. LOCATION TYPE CONTRADICTIONS

| # | Conflict | Evidence | Resolution |
|---|----------|----------|------------|
| 1 | FW location_type (PORT, WAREHOUSE, DELIVERY_POINT) vs WMS location_type (STORAGE, PICKING, RECEIVING, SHIPPING, QUARANTINE, RETURN) | Migration 174 vs Migration 027 | Different scopes — FW is logistics-network, WMS is warehouse-internal |
| 2 | fw_locations.type uses location_type enum | Migration 174_fw_locations.sql | Migrate to md_locations with broader type enum |

---

## 4. HIERARCHY CONTRADICTIONS

| # | Issue | Evidence | Resolution |
|---|-------|----------|------------|
| 1 | No cycle prevention at DB level | md_entities.parent_id has no trigger | Application-layer cycle prevention acceptable for v1 |
| 2 | No depth limit at DB level | No schema constraint | Application-layer limit (e.g., 10) acceptable |
| 3 | Cross-tenant parent possible | RLS doesn't validate parent tenant | Application must validate parent_id tenant |

---

## 5. PARTY ROLE CONTRADICTIONS

| # | Issue | Evidence | Resolution |
|---|-------|----------|------------|
| 1 | Boolean flags conflict with role model | is_customer, is_vendor are global flags | Migrate to party_roles with context_type=GLOBAL |
| 2 | Party can be CUSTOMER and VENDOR simultaneously | Business reality | Allowed — different role_type values |
| 3 | Role context complexity | context_type + context_id + effective dates | Acceptable — no simpler alternative |

---

## 6. CONTACT CONTRADICTIONS

| # | Issue | Evidence | Resolution |
|---|-------|----------|------------|
| 1 | md_entity_addresses has contact_person/phone | Migration 062 | Keep for addresses; party_contacts for communication |
| 2 | Contact ≠ User Identity | profiles/auth.users exist separately | Confirmed separation |

---

## 7. EXTERNAL REFERENCE CONTRADICTIONS

| # | Issue | Evidence | Resolution |
|---|-------|----------|------------|
| 1 | No existing external_references table | Confirmed via grep | New table required |
| 2 | Risk of uncontrolled dump | JSONB external_context | UNIQUE constraint + governance |

---

## 8. ERP CONTRADICTIONS

| # | Issue | Evidence | Resolution |
|---|-------|----------|------------|
| 1 | No ERP integration point | No existing ERP tables | external_references provides mapping |
| 2 | Hybrid mode ownership | Not yet implemented | Architecture supports via external_references |

---

## 9. TOKEN CONTRADICTIONS

| # | Issue | Evidence | Resolution |
|---|-------|----------|------------|
| 1 | None | DATA-2 has no token impact | PASS |

---

## 10. SUMMARY

| Category | Count |
|----------|-------|
| BLOCKING | 0 |
| HIGH | 1 (is_vendor migration) |
| MEDIUM | 1 (boolean migration) |
| LOW | 2 (location_type scope, hierarchy safety) |

**Blocking Contradiction: NONE**

---

**END OF CONTRADICTION REGISTER**
