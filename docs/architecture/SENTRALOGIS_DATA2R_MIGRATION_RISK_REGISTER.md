# SENTRALOGIS — DATA-2R
# MIGRATION RISK REGISTER

**Date:** 2026-09-02  
**Phase:** DATA-2R  
**Nature:** INDEPENDENT FORENSIC RECONCILIATION  

---

## 1. BOOLEAN FLAG MIGRATION RISKS

### 1.1 is_vendor Migration

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Missed reader causes runtime error | HIGH | MEDIUM | Exhaustive grep + test coverage |
| Writer creates party_roles incorrectly | HIGH | LOW | Dual-write period |
| Assignment logic breaks | HIGH | MEDIUM | Integration tests |
| Fleet status detection fails | MEDIUM | LOW | Regression tests |

**Migration Steps:**
1. Create party_roles table
2. Dual-write: update both is_vendor and party_roles
3. Migrate readers to party_roles
4. Migrate writers to party_roles
5. Deprecate is_vendor

**Risk Level: HIGH**

---

### 1.2 is_customer Migration

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Assignment filter breaks | MEDIUM | LOW | Single reader, easy to verify |

**Migration Steps:**
1. Create party_roles table
2. Insert party_roles for existing is_customer=true
3. Update assignment.ts reader
4. Deprecate is_customer

**Risk Level: LOW**

---

### 1.3 is_supplier Migration

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| None — no active usage | LOW | LOW | Direct deprecation |

**Risk Level: LOW**

---

### 1.4 is_broker Migration

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| None — no active usage | LOW | LOW | Direct deprecation |

**Risk Level: LOW**

---

## 2. FW_LOCATIONS MIGRATION RISKS

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Data loss during migration | HIGH | LOW | Backup + validation |
| FK update misses a reference | HIGH | MEDIUM | Exhaustive FK scan |
| location_type enum conflict | MEDIUM | MEDIUM | Type mapping table |
| Orphaned fw_order_headers records | MEDIUM | LOW | Pre-migration validation |

**Migration Steps:**
1. Backup fw_locations
2. Insert into md_locations with mapped types
3. Update fw_order_headers.origin_port_id/dest_port_id
4. Update fw_legs.start_location_id/end_location_id
5. Validate all references
6. Drop fw_locations

**Risk Level: MEDIUM**

---

## 3. NEW TABLE CREATION RISKS

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| RLS policy missing | HIGH | LOW | Checklist validation |
| Index missing | MEDIUM | LOW | Performance test |
| Naming conflict | LOW | LOW | Pre-creation check |

**Risk Level: LOW**

---

## 4. LOCATION HIERARCHY RISKS

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Cycle created | MEDIUM | LOW | Application validation |
| Cross-tenant reference | HIGH | LOW | RLS + application check |
| Type incompatibility | LOW | MEDIUM | Business rule documentation |

**Risk Level: LOW**

---

## 5. EXTERNAL REFERENCES RISKS

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Duplicate external IDs | MEDIUM | LOW | UNIQUE constraint |
| Orphaned references | LOW | LOW | Cascade rules |

**Risk Level: LOW**

---

## 6. SUMMARY

| Migration | Risk Level | Blocking? |
|-----------|------------|-----------|
| is_vendor deprecation | HIGH | CONDITIONAL |
| is_customer deprecation | LOW | NO |
| is_supplier deprecation | LOW | NO |
| is_broker deprecation | LOW | NO |
| fw_locations migration | MEDIUM | NO |
| New table creation | LOW | NO |
| Location hierarchy | LOW | NO |
| External references | LOW | NO |

---

**END OF MIGRATION RISK REGISTER**
