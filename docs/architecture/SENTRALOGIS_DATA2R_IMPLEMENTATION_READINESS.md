# SENTRALOGIS — DATA-2R
# IMPLEMENTATION READINESS

**Date:** 2026-09-02  
**Phase:** DATA-2R  
**Nature:** INDEPENDENT FORENSIC RECONCILIATION  
**Status:** PRODUCTION IMPLEMENTATION NOT AUTHORIZED  

---

## 1. RECONCILIATION SUMMARY

### 1.1 What DATA-2 Gets Right

| Aspect | Verdict |
|--------|---------|
| md_entities as canonical party | PASS |
| md_locations as canonical location | PASS |
| party_roles for contextual roles | PASS |
| party_relationships for business relationships | PASS |
| party_contacts for contacts | PASS |
| party_locations for party-location associations | PASS |
| external_references for external IDs | PASS |
| parent_id for hierarchy | PASS |
| Location type extension | PASS |
| Tenant isolation | PASS |

### 1.2 What DATA-2 Needs to Resolve

| Issue | Resolution |
|-------|------------|
| is_vendor deprecation | Requires migration proof for all readers/writers |
| location_type enum conflict | Document type mapping between FW and WMS |
| Hierarchy cycle prevention | Document application-layer strategy |

---

## 2. CONDITIONAL RESOLUTIONS

### 2.1 Condition 1: is_vendor Migration Proof

Before implementation, must document:
- All readers of is_vendor (assignment.ts, fleet-status, cost-audit, EasyGoSyncService)
- All writers of is_vendor (EasyGoSyncService)
- Migration plan preserving business logic

### 2.2 Condition 2: location_type Mapping

Before fw_locations migration, must document:
- FW location_type values (PORT, WAREHOUSE, DELIVERY_POINT)
- WMS location_type values (STORAGE, PICKING, RECEIVING, SHIPPING, QUARANTINE, RETURN)
- Mapping to md_locations.location_type

### 2.3 Condition 3: Hierarchy Safety

Before implementation, must document:
- Application-layer cycle prevention algorithm
- Maximum hierarchy depth
- Cross-tenant validation strategy

---

## 3. IMPLEMENTATION SEQUENCING

### 3.1 Recommended Order

1. **Phase 1: New Tables** — Create party_roles, party_relationships, party_contacts, party_locations, external_references
2. **Phase 2: Extend md_locations** — Add location_type, parent_id, timezone, external_code
3. **Phase 3: Extend shp_shipments** — Add pol_location_id, pod_location_id
4. **Phase 4: Migrate is_customer** — Low risk, single reader
5. **Phase 5: Migrate is_vendor** — High risk, multiple readers/writers
6. **Phase 6: Migrate fw_locations** — Medium risk, FK updates
7. **Phase 7: Deprecate is_supplier, is_broker** — Low risk, no usage

### 3.2 Dependencies

```
Phase 1 → Phase 2 → Phase 3
   ↓
Phase 4 (is_customer)
   ↓
Phase 5 (is_vendor) — requires Phase 1 complete
   ↓
Phase 6 (fw_locations) — requires Phase 2 complete
   ↓
Phase 7 (deprecation)
```

---

## 4. ESTIMATED EFFORT

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: New Tables | 4-6 hours | LOW |
| Phase 2: Extend md_locations | 1-2 hours | LOW |
| Phase 3: Extend shp_shipments | 1-2 hours | LOW |
| Phase 4: Migrate is_customer | 1-2 hours | LOW |
| Phase 5: Migrate is_vendor | 4-6 hours | HIGH |
| Phase 6: Migrate fw_locations | 3-4 hours | MEDIUM |
| Phase 7: Deprecation | 1-2 hours | LOW |
| **Total** | **15-24 hours** | |

---

## 5. FINAL GATE

```
==================================================
DATA-2R FINAL FORENSIC GATE
==================================================

Canonical Party: PASS
Party Hierarchy: PASS
Party Roles: PASS
Party Relationships: PASS
Contacts: PASS

Canonical Location: PASS
Location Hierarchy: PASS
Location Types: PASS
Party-Location: PASS
Network Location: PASS
POL/POD: PASS
Geography: PASS

External References: PASS

ERP Compatibility: PASS

Customer Boundary: PASS
Vendor Boundary: PASS

Tenant Isolation: PASS
Authorization: PASS

Duplicate Authority: FOUND (fw_locations — scheduled for deprecation)
Blocking Contradiction: NONE

ADR Reconciliation: PASS
  - Party Role Architecture ADR: REQUIRED
  - External Reference Architecture ADR: REQUIRED

Migration Risk: MEDIUM
  - is_vendor deprecation: HIGH risk
  - fw_locations migration: MEDIUM risk
  - Other migrations: LOW risk

Token Compatibility: PASS
UI/UX Compatibility: PASS

TypeScript: PASS / NOT RUN
Full Regression: PASS / NOT RUN

Implementation Readiness:
CONDITIONAL

IMPLEMENTATION AUTHORIZATION:
NO

HARD STOP:
ACTIVE
==================================================
```

---

**END OF IMPLEMENTATION READINESS**

---

## 6. HUMAN REPORT

### 1. DATA-2 Overall Verdict: PASS WITH CONDITIONS

DATA-2 architecture is fundamentally sound. Three conditions (is_vendor migration proof, location_type mapping, hierarchy safety documentation) must be resolved before implementation.

### 2. Canonical Party Verdict: PASS

md_entities is the confirmed canonical party authority with 73+ code references and no competing masters.

### 3. Canonical Location Verdict: PASS

md_locations is the confirmed canonical location authority. fw_locations is a known duplicate scheduled for deprecation.

### 4. Party Hierarchy Verdict: PASS

parent_id is sufficient. Application-layer cycle prevention is acceptable for v1.

### 5. Party Role Verdict: PASS

party_roles with context_type is the correct authority. Boolean flags (is_customer, is_vendor) must be migrated.

### 6. Location Hierarchy Verdict: PASS

parent_id on md_locations follows established pattern. Type compatibility is a business rule.

### 7. Party-Location Verdict: PASS

party_locations with relationship_type provides correct semantic clarity.

### 8. External Reference Verdict: PASS

external_references is correctly designed with UNIQUE constraint and governance.

### 9. Legacy Contradiction Findings

| Structure | Classification | Action |
|-----------|----------------|--------|
| fw_locations | DUPLICATE | Deprecate |
| is_vendor | DEPRECATE (conditional) | Migrate readers/writers first |
| is_customer | DEPRECATE | Single reader |
| is_supplier | DEPRECATE | No usage |
| is_broker | DEPRECATE | No usage |

### 10. ADR Verdict

Two new ADRs required:
- Party Role Architecture
- External Reference Architecture

### 11. Migration Risks

- is_vendor deprecation: HIGH risk (active business logic)
- fw_locations migration: MEDIUM risk (FK updates)
- Other migrations: LOW risk

### 12. Implementation Readiness

CONDITIONAL — Ready after:
- is_vendor migration proof
- location_type mapping documentation
- Hierarchy safety documentation

### 13. Recommended Next Phase

**DATA-3: Canonical Party & Location Implementation** — Implement the DATA-2/2R architecture after ADR ratification and condition resolution.

---

**DATA-2R FORENSIC RECONCILIATION COMPLETE — PRODUCTION IMPLEMENTATION NOT AUTHORIZED.**

**HARD STOP MUST REMAIN ACTIVE.**
