# DATA-4E TRACK B — `is_vendor` FORENSIC REPORT

**Date:** 2026-09-02  
**Phase:** DATA-4E TRACK B  

---

## 1. Executive Verdict

### **YELLOW — MIGRATION / ADR REQUIRED**

---

## 2. `is_vendor` Schema Inventory

| Schema | Table | Column | Type | Nullable | Default |
|--------|-------|--------|------|----------|---------|
| public | md_entities | is_vendor | boolean | YES | NULL |

**Source:** migration 062 (comprehensive_master_columns)

---

## 3. Data Semantics

| Property | Value |
|----------|-------|
| Entity | Organization/Party (md_entities) |
| Meaning | Flags whether the party is a vendor (external service provider) |
| Authoritative | YES — actively used in business logic |
| Classification | Legacy boolean flag |

**Related fields:** is_customer, is_supplier, is_broker, vendor_type

---

## 4. Active Runtime Readers

| Category | Count | Files |
|----------|-------|-------|
| Assignment logic | 6 | assignment.ts, assignmentSave.ts |
| Fleet management | 10 | hq/master/fleets, tenant/master/fleets |
| Driver management | 15 | hq/master/drivers, tenant/master/drivers |
| Contact management | 20 | hq/master/contacts, tenant/master/contacts |
| Work orders | 10 | sbu/trucking/work-orders/* |
| Warehouse operations | 8 | sbu/warehouse/* |
| Reporting | 5 | reporting/operational/* |
| Portal (customer) | 4 | warehouse/portal/* |
| **Total active readers** | **78+** | |

**Finding:** `is_vendor` is actively read across ALL major domains.

---

## 5. Active Runtime Writers

| File | Operation | Caller | Purpose |
|------|-----------|--------|---------|
| hq/master/contacts/page.tsx | INSERT/UPDATE | Contact form | Create/edit vendor |
| tenant/master/contacts/page.tsx | INSERT/UPDATE | Contact form | Create/edit vendor |
| hq/master/fleets/page.tsx | INSERT/UPDATE | Fleet form | Create/edit fleet |
| hq/work-orders/components/QuickAddContactModal.tsx | INSERT | Quick add | Create vendor contact |

**Finding:** `is_vendor` is actively maintained through UI forms.

---

## 6. API / Service Dependencies

| Layer | Dependency |
|-------|------------|
| TypeScript types | md_entities.is_vendor defined in database.types.ts |
| Assignment domain | resolveIsVendor() function |
| Fleet domain | is_vendor_fleet derived from vendor_tenant_id |
| Contact domain | Vendor tab filtering, VND prefix |

**Finding:** `is_vendor` is part of the application contract.

---

## 7. Test Dependencies

| Test File | Count | Classification |
|-----------|-------|----------------|
| Various __tests__ | ~10 | Historical forensic |

**Finding:** Minimal test dependency.

---

## 8. Canonical Replacement

| Legacy Concept | Candidate Replacement | Evidence | Confidence |
|----------------|----------------------|----------|------------|
| is_vendor | party_roles.VENDOR | migration 035 (table), 038 (backfill) | **HIGH** |

**Finding:** Canonical replacement EXISTS but is not yet fully adopted by production code.

---

## 9. Tenant / Security Impact

| Impact | Details |
|--------|---------|
| Tenant filtering | Used in `.eq('tenant_id', ...)` queries |
| RLS | No direct RLS dependency |
| Cross-tenant | No cross-tenant usage |
| Security | Used for business logic (vendor vs own-fleet distinction) |

**Finding:** Business-critical for vendor vs own-fleet distinction.

---

## 10. Required Live Data Verification

| Query | Purpose |
|-------|---------|
| `SELECT COUNT(*) FROM md_entities WHERE is_vendor = true` | Count vendor records |
| `SELECT tenant_id, COUNT(*) FROM md_entities WHERE is_vendor = true GROUP BY tenant_id` | Tenant distribution |
| `SELECT COUNT(*) FROM party_roles WHERE role_type = 'VENDOR'` | Verify backfill coverage |

**LIVE DB VERIFICATION: UNAVAILABLE**

---

## 11. Recommended Disposition

### **MIGRATION DESIGN REQUIRED**

| Reason | Detail |
|--------|--------|
| Active consumers exist | 78+ readers, 4 writers |
| Canonical replacement exists | party_roles.VENDOR |
| Migration complexity | HIGH — requires careful batch migration |
| Semantic ambiguity | None — clear mapping to party_roles.VENDOR |
| Live data verification | Required before safe removal |

---

## 12. Files Inspected

| File | Purpose |
|------|---------|
| supabase/migrations/038_party_role_backfill.sql | Backfill evidence |
| lib/domain/jo/assignment.ts | Assignment logic |
| app/*/master/contacts/page.tsx | Contact management |
| app/*/master/fleets/page.tsx | Fleet management |
| app/sbu/trucking/work-orders/* | Work order logic |

---

## 13. Database Changes

**NO DATABASE CHANGES PERFORMED**

---

**END OF FORENSIC REPORT**
