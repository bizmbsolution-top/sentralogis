# SENTRALOGIS — DATA-2 ADR
# FINAL DECISION

**Date:** 2026-09-02  
**Phase:** DATA-2 ADR Ratification Closure  
**Nature:** FINAL FORENSIC DECISION  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. DECISION MATRIX

| Decision | Result | Evidence | Risk |
|----------|--------|----------|------|
| Party Role Vocabulary | **CONDITIONAL** | SHIPPER/CONSIGNEE/NOTIFY_PARTY create duplicate authority with shp_shipments FKs | BLOCKING |
| Context Type Semantics | **PASS** | GLOBAL/ENGAGEMENT/ORDER/SHIPMENT have clear owners; CONTRACT needs documentation | LOW |
| is_vendor Transition | **PASS** | 131 references, 9 usage classes, deterministic mapping; is_vendor_fleet derived from vendor_tenant_id | MEDIUM |
| External Vocabulary | **PASS** | 6 categories cover current needs; governance process for additions needed | LOW |

---

## 2. CRITICAL FINDINGS

### 2.1 BLOCKING: Duplicate Authority for Shipment Roles

**Finding:** ADR-070 proposes adding SHIPPER, CONSIGNEE, NOTIFY_PARTY to party_roles. These are already direct FK references on shp_shipments:

```sql
shp_shipments:
  shipper_id UUID REFERENCES md_entities(id),
  consignee_id UUID REFERENCES md_entities(id),
  notify_party_id UUID REFERENCES md_entities(id),
```

**Impact:** Same information stored in two places. Synchronization risk. Violates single-source-of-truth.

**Resolution:** Remove SHIPPER, CONSIGNEE, NOTIFY_PARTY from party_roles vocabulary. Keep as direct FK references on shp_shipments.

### 2.2 CONDITIONAL: CONTRACT Context Owner

**Finding:** CONTRACT context_type has no owner aggregate in current schema.

**Impact:** No immediate issue (forward-looking), but should be documented.

**Resolution:** Document CONTRACT as forward-looking context_type. Map to commercial_work_orders or contracts table when implemented.

### 2.3 INFORMATIONAL: is_vendor_fleet Derived

**Finding:** is_vendor_fleet is derived from vendor_tenant_id (fleet-status/route.ts:101), NOT from is_vendor.

**Impact:** Fleet-status API needs NO migration for is_vendor deprecation.

### 2.4 INFORMATIONAL: vendor_type Preservation

**Finding:** vendor_type (TRANSPORTER, SHIPPING_LINE, OWN, INTERNAL, OTHER) provides granular classification beyond is_vendor.

**Impact:** Must be preserved. Maps to additional party_roles (CARRIER for TRANSPORTER).

---

## 3. CONTRADICTIONS

| Domain | Contradiction | Severity | Resolution |
|--------|---------------|----------|------------|
| Party Roles | SHIPPER/CONSIGNEE/NOTIFY_PARTY in party_roles duplicates shp_shipments FKs | **BLOCKING** | Remove from party_roles vocabulary |
| Context | CONTRACT has no owner aggregate | LOW | Document as forward-looking |

---

## 4. MIGRATION RISKS

| Area | Risk | Severity | Mitigation |
|------|------|----------|------------|
| is_vendor deprecation | 131 references, 9 usage classes | HIGH | Dual-write period, exhaustive consumer inventory |
| vendor_type preservation | Must map to party_roles.CARRIER | MEDIUM | Document mapping rules |
| fw_locations migration | FK updates required | MEDIUM | Pre-migration FK scan |
| party_roles query performance | Join overhead | MEDIUM | Index on (tenant_id, party_id, role_type) |

---

## 5. REQUIRED HUMAN DECISIONS

1. **Ratify ADR-070 Party Role Architecture** — with amendment to remove SHIPPER/CONSIGNEE/NOTIFY_PARTY
2. **Ratify ADR-071 External Reference Architecture**
3. **Confirm final role vocabulary** — 11 roles (remove 3 shipment roles)
4. **Confirm context-type semantics** — 5 types (CONTRACT documented as forward-looking)
5. **Confirm governed extensibility of external-system vocabulary**
6. **Approve migration governance principles**

---

## 6. AMENDMENTS REQUIRED

### 6.1 ADR-070 Amendment

**Remove from party_roles vocabulary:**
- SHIPPER (remains shp_shipments.shipper_id)
- CONSIGNEE (remains shp_shipments.consignee_id)
- NOTIFY_PARTY (remains shp_shipments.notify_party_id)

**Final party_roles vocabulary (11 roles):**

| Category | Roles |
|----------|-------|
| Global Party Roles | CUSTOMER, VENDOR, SUPPLIER, BROKER, CARRIER, AGENT |
| Commercial Context Roles | BILL_TO, SHIP_TO, PAYER, ORDERING_PARTY |

### 6.2 ADR-070 Context Types

| Context | Status |
|---------|--------|
| GLOBAL | Current |
| ENGAGEMENT | Current |
| ORDER | Current |
| SHIPMENT | Current |
| CONTRACT | Forward-looking (no current owner) |

---

## 7. VERDICT

### Overall Verdict: **YELLOW — RATIFICATION REQUIRES AMENDMENT**

### ADR-A: Party Role Architecture
**Status:** CONDITIONAL — Remove SHIPPER/CONSIGNEE/NOTIFY_PARTY

### ADR-B: External Reference Architecture
**Status:** READY

---

## 8. POST-AMENDMENT RATIFICATION

After applying the required amendment (removing SHIPPER/CONSIGNEE/NOTIFY_PARTY from party_roles), both ADRs are ready for human ratification.

### Ratification Checklist

- [x] Party role vocabulary validated (11 roles after amendment)
- [x] Context type semantics validated (5 types)
- [x] is_vendor transition proven deterministic
- [x] External system vocabulary validated (6 categories)
- [x] Cross-architecture contradictions resolved
- [x] Token boundary preserved
- [x] Forwarding compatibility preserved
- [x] Tenant isolation preserved
- [x] DATA-3 boundary defined

---

## 9. FINAL GATE

### Executive Decision

**YELLOW — RATIFICATION REQUIRES AMENDMENT**

### ADR-A

**Party Role Architecture:** CONDITIONAL

### ADR-B

**External Reference Architecture:** READY

### Critical Findings

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | SHIPPER/CONSIGNEE/NOTIFY_PARTY in party_roles duplicates shp_shipments FKs | BLOCKING | Remove from vocabulary |
| 2 | CONTRACT context_type has no owner | LOW | Document as forward-looking |

### Contradictions

| Domain | Contradiction | Severity | Resolution |
|--------|---------------|----------|------------|
| Party Roles | Duplicate authority for shipment roles | BLOCKING | Remove 3 roles from party_roles |

### Migration Risks

| Area | Risk | Severity | Mitigation |
|------|------|----------|------------|
| is_vendor | 131 references | HIGH | Dual-write + exhaustive inventory |
| fw_locations | FK updates | MEDIUM | Pre-migration scan |
| Performance | party_roles joins | MEDIUM | Proper indexing |

### Required Human Decisions

1. Ratify ADR-070 (amended) — Party Role Architecture
2. Ratify ADR-071 — External Reference Architecture
3. Confirm 11-role vocabulary
4. Confirm 5 context types
5. Confirm external system governance
6. Approve migration governance

### DATA-3 Readiness

**READY FOR AUTHORIZATION** — After ADR ratification and amendment application.

---

**ADR RATIFICATION STATUS: PENDING HUMAN APPROVAL (WITH AMENDMENT)**

**IMPLEMENTATION AUTHORIZATION: NOT GRANTED**

**PRODUCTION CHANGE AUTHORIZATION: NOT GRANTED**

---

**DATA-2 ADR FORENSIC RATIFICATION CLOSURE COMPLETE — PRODUCTION IMPLEMENTATION NOT AUTHORIZED.**

**HARD STOP MUST REMAIN ACTIVE.**

---

**END OF FINAL DECISION**
