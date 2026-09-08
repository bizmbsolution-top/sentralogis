# SENTRALOGIS — DATA-3
# CONSUMER RECONCILIATION

**Date:** 2026-09-02  
**Phase:** DATA-3  
**Nature:** CONSUMER RECONCILIATION  
**Status:** FORENSIC INVENTORY COMPLETE  

---

## 1. HIGH-RISK CONSUMERS

### 1.1 is_vendor Consumers (131 references)

| Consumer | Legacy Authority | New Authority | Migrated? | Semantic Parity | Test |
|----------|-----------------|---------------|-----------|-----------------|------|
| assignment.ts:253 | is_vendor filter | party_roles.VENDOR | NO | YES | Deferred |
| assignment.ts:282 | is_vendor = !is_own | party_roles.VENDOR | NO | YES | Deferred |
| fleet-status:101 | vendor_tenant_id | vendor_tenant_id | N/A | N/A | N/A |
| cost-audit:432 | is_vendor | vendor_type | NO | YES | Deferred |
| EasyGoSyncService:129 | is_vendor | party_roles.VENDOR | NO | YES | Deferred |
| UI badges (EntityBadge) | is_vendor | party_roles.VENDOR | NO | YES | Deferred |
| UI badges (fleet pages) | is_vendor | party_roles.VENDOR | NO | YES | Deferred |
| UI badges (driver pages) | is_vendor | party_roles.VENDOR | NO | YES | Deferred |
| UI badges (contact pages) | is_vendor | party_roles.VENDOR | NO | YES | Deferred |
| ContactFormModal | is_vendor state | party_roles.VENDOR | NO | YES | Deferred |

### 1.2 Migration Status

**Deferred** — All is_vendor consumers require careful semantic analysis before migration. Backfill ensures party_roles.VENDOR is available for new code. Legacy is_vendor column preserved for backward compatibility.

---

## 2. SHIPMENT AUTHORITY REGRESSION

### 2.1 Verification

| Field | Status |
|-------|--------|
| shp_shipments.shipper_id | UNCHANGED |
| shp_shipments.consignee_id | UNCHANGED |
| shp_shipments.notify_party_id | UNCHANGED |

### 2.2 party_roles Verification

| Role | In party_roles? |
|------|-----------------|
| SHIPPER | **NO** |
| CONSIGNEE | **NO** |
| NOTIFY_PARTY | **NO** |

**PASS** — Shipment context roles NOT in party_roles.

---

## 3. TOKEN BOUNDARY

| Check | Result |
|-------|--------|
| New token completion authorities | 0 |
| Token burn authority | UNCHANGED |
| Token pricing authority | UNCHANGED |

**PASS** — Token boundary preserved.

---

**END OF CONSUMER RECONCILIATION**
