# SENTRALOGIS — DATA-3
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-3  
**Nature:** IMPLEMENTATION DECISION LOG  
**Status:** COMPLETE  

---

## 1. DECISIONS CONFIRMED

### 1.1 Party Role Vocabulary = 10 Roles

**Decision:** Implement exactly 10 party role types (6 global + 4 commercial context).

**Evidence:** ADR-070 as amended. SHIPPER/CONSIGNEE/NOTIFY_PARTY removed (duplicate authority).

### 1.2 Context Types = 4 Types

**Decision:** Implement exactly 4 context types (GLOBAL, ENGAGEMENT, ORDER, CONTRACT).

**Evidence:** SHIPMENT context removed (shipment roles owned by shp_shipments).

### 1.3 is_vendor Backfill Strategy

**Decision:** Backfill party_roles.VENDOR from is_vendor=true. Preserve is_vendor column.

**Evidence:** 131 consumer references require careful migration. Backfill ensures new code can use party_roles.

### 1.4 fw_locations NOT Migrated

**Decision:** Do not migrate fw_locations in DATA-3.

**Evidence:** Requires complete reader/writer/FK inventory first.

### 1.5 Shipment Roles NOT in party_roles

**Decision:** SHIPPER, CONSIGNEE, NOTIFY_PARTY remain as direct FK references on shp_shipments.

**Evidence:** INV-04 (Shipment Context Authority). ONE BUSINESS FACT → ONE CANONICAL AUTHORITY.

---

## 2. IMPLEMENTATION SUMMARY

| Component | Status |
|-----------|--------|
| party_roles table | CREATED |
| party_relationships table | CREATED |
| party_contacts table | CREATED |
| party_locations table | CREATED |
| external_references table | CREATED |
| md_locations extensions | APPLIED |
| shp_shipments extensions | APPLIED |
| is_vendor backfill | APPLIED |
| is_customer backfill | APPLIED |
| is_supplier backfill | APPLIED |
| is_broker backfill | APPLIED |
| RLS policies | APPLIED |
| Indexes | APPLIED |
| Domain services | CREATED |
| Tests | 20/20 PASS |
| Full regression | 1273/1273 PASS |
| TypeScript | 0 errors |

---

## 3. DEFERRED DECISIONS

| Decision | Reason |
|----------|--------|
| is_vendor column removal | Requires 131 consumer migrations |
| fw_locations migration | Requires reader/writer inventory |
| Consumer migration | Requires semantic analysis |
| API routes for new tables | Deferred to future phase |
| UI components for new tables | Deferred to future phase |

---

**END OF DECISION LOG**
