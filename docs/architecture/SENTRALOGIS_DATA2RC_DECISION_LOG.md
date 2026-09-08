# SENTRALOGIS — DATA-2R-C
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-2R-C  
**Nature:** FORENSIC DECISION LOG  
**Status:** PRODUCTION IMPLEMENTATION NOT AUTHORIZED  

---

## 1. DECISIONS CONFIRMED

### 1.1 is_vendor Semantics

**Decision:** `is_vendor` means "external counterparty" (not strictly "Vendor role").

**Evidence:** assignment.ts:282 sets `is_vendor: !isActuallyOwn`.

**Implication:** Mapping to party_roles.VENDOR is semantically correct, but the migration must also preserve the "external vs own-fleet" distinction via vendor_type and vendor_tenant_id.

---

### 1.2 is_vendor_fleet is Derived

**Decision:** `is_vendor_fleet` is derived from `vendor_tenant_id !== tenantId`, NOT from `is_vendor`.

**Evidence:** fleet-status/route.ts:101

**Implication:** Fleet-status API does NOT need migration. It already uses the correct canonical field.

---

### 1.3 Cost-Audit Uses vendor_type

**Decision:** Cost-audit logic uses `vendor_type` (OWN/INTERNAL/TRANSPORTER), not `is_vendor` directly.

**Evidence:** cost-audit/hooks/useCostAuditData.ts:432-436

**Implication:** Cost-audit migration is LOW risk. vendor_type is preserved.

---

### 1.4 EasyGo Uses is_vendor as Integration Filter

**Decision:** EasyGo sync uses `is_vendor` to identify integration partner entities.

**Evidence:** EasyGoSyncService.ts:129,146

**Implication:** EasyGo must migrate to party_roles.VENDOR. Entity name filter (%ATM%) remains valid.

---

### 1.5 WMS Location Types are Warehouse-Internal

**Decision:** md_warehouse_locations.location_type values (STORAGE, PICKING, etc.) are warehouse-internal and do NOT map to md_locations.

**Evidence:** WMS migrations 027, 028 vs FW migration 174.

**Implication:** No conflict between WMS and FW location types. WMS types stay in md_warehouse_locations.

---

### 1.6 Hierarchy Cycle Prevention at Application Layer

**Decision:** Application-layer cycle prevention is sufficient for v1.

**Evidence:** md_entities.parent_id has operated without DB-level cycle prevention. Pattern is established.

**Implication:** No DB triggers needed initially. Can be added later if required.

---

### 1.7 Historical Integrity via ID References

**Decision:** Historical transactions reference parties/locations by ID, not by hierarchy path.

**Evidence:** shp_shipments.customer_id, origin_location_id, etc.

**Implication:** Hierarchy changes do NOT affect historical transaction meaning. No snapshots needed.

---

## 2. ASSUMPTIONS REJECTED

### 2.1 "is_vendor = Vendor Role"

**Rejected:** `is_vendor` is overloaded. It means "external counterparty" in assignment context, "payable entity" in finance context, "integration partner" in EasyGo context.

**Resolution:** Map to party_roles.VENDOR for classification. Preserve vendor_type for operational distinctions.

---

### 2.2 "is_vendor_fleet depends on is_vendor"

**Rejected:** `is_vendor_fleet` is derived from `vendor_tenant_id`, not from `is_vendor`.

**Resolution:** Fleet-status API needs NO migration.

---

### 2.3 "WMS location types map to md_locations"

**Rejected:** WMS location types are warehouse-internal operational zones, not network locations.

**Resolution:** WMS types stay in md_warehouse_locations. Only warehouse-level (md_warehouses) maps to md_locations.

---

## 3. MIGRATION BLOCKERS

### 3.1 Resolved Blockers

| Blocker | Resolution |
|---------|------------|
| is_vendor has active business logic | Dual-write period + exhaustive consumer migration |
| fw_locations has FK references | Pre-migration FK scan + validation |
| location_type enum conflict | FW types map to canonical, WMS types stay separate |

### 3.2 Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missed is_vendor reader | HIGH | Exhaustive grep + test coverage |
| party_roles query performance | MEDIUM | Proper indexing |
| Assignment logic regression | HIGH | Integration tests |

---

## 4. ADR REQUIREMENTS

### 4.1 Party Role Architecture ADR

**Required: YES**

**Content:**
- Role type vocabulary (14 roles)
- Context type semantics (GLOBAL, ENGAGEMENT, ORDER, SHIPMENT, CONTRACT)
- Effective dating rules
- Migration from boolean flags
- Authorization implications

---

### 4.2 External Reference Architecture ADR

**Required: YES**

**Content:**
- Entity type vocabulary (PARTY, LOCATION, CARRIER, SHIPMENT, ORDER)
- External system vocabulary (ERP, CRM, TMS, WMS, CUSTOMS)
- Uniqueness constraints
- Governance rules (prevent uncontrolled dump)

---

## 5. UNRESOLVED QUESTIONS

### 5.1 Cross-Tenant Party Sharing

**Question:** Can a party be shared across tenants (e.g., a carrier serving multiple tenants)?

**Current State:** vendor_tenant_id on md_entities suggests cross-tenant references exist.

**Recommendation:** Defer to future phase. For now, parties are tenant-scoped.

---

### 5.2 Location Tenant Scope

**Question:** Should network locations (ports, airports) be tenant-scoped or global?

**Current State:** md_locations.tenant_id is nullable.

**Recommendation:** Network locations should be tenant-scoped but shared via tenant_id = NULL or a "system" tenant.

---

## 6. VERDICT

### 6.1 DATA-2R-C Overall Verdict

**PASS — ALL CONDITIONS CLOSED**

### 6.2 DATA-3 Readiness

**READY** — Implementation can proceed after:
1. ADR ratification (Party Role + External Reference)
2. Migration strategy approval
3. Stakeholder review

---

**END OF DECISION LOG**
