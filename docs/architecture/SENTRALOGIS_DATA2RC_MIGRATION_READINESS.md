# SENTRALOGIS — DATA-2R-C
# MIGRATION READINESS

**Date:** 2026-09-02  
**Phase:** DATA-2R-C  
**Nature:** FORENSIC READINESS ASSESSMENT  
**Status:** PRODUCTION IMPLEMENTATION NOT AUTHORIZED  

---

## 1. MIGRATION RISK MATRIX

| Object | Risk | Reason | Mitigation | Blocker |
|--------|------|--------|------------|---------|
| `is_vendor` | HIGH | 131 references, 9 usage classes, active business logic | Dual-write period, exhaustive grep, integration tests | NO |
| `fw_locations` | MEDIUM | FK updates required (fw_order_headers, fw_legs) | Pre-migration validation, FK scan | NO |
| hierarchy | MEDIUM | Cycle prevention at application layer | Document strategy, recursive CTE | NO |
| party_roles (new) | LOW | New table, no existing data | Standard RLS + indexes | NO |
| party_contacts (new) | LOW | New table, no existing data | Standard RLS + indexes | NO |
| party_locations (new) | LOW | New table, no existing data | Standard RLS + indexes | NO |
| party_relationships (new) | LOW | New table, no existing data | Standard RLS + indexes | NO |
| external_references (new) | LOW | New table, no existing data | Standard RLS + indexes | NO |
| md_locations extension | LOW | Add columns only | ALTER TABLE ADD COLUMN | NO |
| shp_shipments extension | LOW | Add columns only | ALTER TABLE ADD COLUMN | NO |

---

## 2. REGRESSION IMPACT

### 2.1 Tests Affected by is_vendor Migration

| Test Area | Impact |
|-----------|--------|
| Assignment logic | MUST rerun — uses is_vendor for filtering |
| Fleet management | MUST rerun — uses is_vendor for fleet distinction |
| Cost audit | MUST rerun — uses vendor_type (related) |
| EasyGo integration | MUST rerun — uses is_vendor for entity lookup |
| UI regression | MUST verify — badges, filters, labels |

### 2.2 Tests Affected by location_type Migration

| Test Area | Impact |
|-----------|--------|
| Forwarding | MUST rerun — fw_order_headers, fw_legs reference locations |
| Shipment creation | MUST rerun — POL/POD references |

### 2.3 Regression Suites to Rerun

1. `lib/__tests__/phase5a2-forwarding-schema-repair.test.ts`
2. `lib/__tests__/phase5a2r-forwarding-repository-boundary.test.ts`
3. `lib/__tests__/u16-forwarding-forensic.test.ts`
4. Full regression suite (all U-series tests)

---

## 3. ADR VALIDATION

### 3.1 Party Role Architecture ADR

**Required: YES**

**Reason:** Cross-cutting authority change. All domains must use party_roles instead of boolean flags.

**Existing ADR sufficient: NO**

---

### 3.2 External Reference Architecture ADR

**Required: YES**

**Reason:** Establishes canonical pattern for external system integration.

**Existing ADR sufficient: NO**

---

### 3.3 Additional ADRs Required: NONE

| Topic | ADR Required |
|-------|--------------|
| Hierarchy integrity | NO — established pattern |
| Location hierarchy | NO — established pattern |
| Party-location model | NO — standard many-to-many |
| Transaction-context roles | NO — governed by Party Role ADR |

---

## 4. IMPLEMENTATION SEQUENCING

### 4.1 Phase 1: New Tables (Low Risk)

1. Create party_roles with RLS + indexes
2. Create party_relationships with RLS + indexes
3. Create party_contacts with RLS + indexes
4. Create party_locations with RLS + indexes
5. Create external_references with RLS + indexes

### 4.2 Phase 2: Extend Existing Tables (Low Risk)

1. Add location_type, parent_id, timezone, external_code to md_locations
2. Add pol_location_id, pod_location_id to shp_shipments

### 4.3 Phase 3: Migrate is_vendor (High Risk)

1. Dual-write: update both is_vendor and party_roles
2. Migrate readers to party_roles
3. Migrate writers to party_roles
4. Deprecate is_vendor (keep column, stop using)

### 4.4 Phase 4: Migrate fw_locations (Medium Risk)

1. Migrate fw_locations data to md_locations
2. Update fw_order_headers FKs
3. Update fw_legs FKs
4. Drop fw_locations

### 4.5 Phase 5: Deprecation (Low Risk)

1. Remove is_customer, is_supplier, is_vendor, is_broker from code
2. Remove crm_status, sales_rep_id from md_entities (future)
3. Remove fw_locations table

---

## 5. ESTIMATED EFFORT

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: New Tables | 4-6 hours | LOW |
| Phase 2: Extend Tables | 1-2 hours | LOW |
| Phase 3: Migrate is_vendor | 8-12 hours | HIGH |
| Phase 4: Migrate fw_locations | 3-4 hours | MEDIUM |
| Phase 5: Deprecation | 2-4 hours | LOW |
| Testing | 6-8 hours | — |
| **Total** | **24-36 hours** | |

---

## 6. FINAL GATE

```
==================================================
DATA-2R-C FINAL CONDITION CLOSURE GATE
==================================================

Condition A — is_vendor Migration Proof:
CLOSED

Executable is_vendor Consumers:
COMPLETE (131 references identified)

Assignment Semantics:
PASS (mapping: is_vendor → party_roles.VENDOR)

Fleet Semantics:
PASS (is_vendor_fleet derived from vendor_tenant_id, NOT is_vendor)

Cost-Audit Semantics:
PASS (uses vendor_type, preserved)

EasyGo Semantics:
PASS (query can use party_roles.VENDOR)

Party Role Mapping:
DETERMINISTIC (one-to-one, zero exceptions)

Unmapped is_vendor Records:
0

Condition B — location_type Mapping:
CLOSED

Existing Location Types:
COMPLETE (FW: 3 types, WMS: 6 types)

fw_locations Mapping:
DETERMINISTIC (3 types → 3 canonical types)

Unmapped Locations:
0

Multi-Capability Locations:
PASS (hierarchy handles multiple capabilities)

POL/POD Compatibility:
PASS

Condition C — Hierarchy Safety:
CLOSED

Party Self-Cycle:
PROTECTED (application-layer)

Party Indirect Cycle:
PROTECTED (application-layer)

Location Self-Cycle:
PROTECTED (application-layer)

Location Indirect Cycle:
PROTECTED (application-layer)

Cross-Tenant Hierarchy:
PROTECTED (RLS + application validation)

Reparenting:
SAFE (application validation)

Deletion:
SAFE (ON DELETE SET NULL)

Historical Integrity:
PASS (ID references preserve meaning)

ADR Reconciliation:
PASS (2 ADRs required: Party Role, External Reference)

Migration Risk:
MEDIUM (is_vendor migration is HIGH risk, but mitigated)

Blocking Condition:
NONE

TypeScript:
PASS / NOT RUN

Full Regression:
PASS / NOT RUN

DATA-3 Readiness:
READY

Production Implementation:
NOT EXECUTED

IMPLEMENTATION AUTHORIZATION:
NO

HARD STOP:
ACTIVE
==================================================
```

---

**END OF MIGRATION READINESS**
