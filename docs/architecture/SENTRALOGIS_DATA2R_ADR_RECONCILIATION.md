# SENTRALOGIS — DATA-2R
# ADR RECONCILIATION

**Date:** 2026-09-02  
**Phase:** DATA-2R  
**Nature:** INDEPENDENT FORENSIC RECONCILIATION  

---

## 1. PARTY ROLE ARCHITECTURE ADR

### 1.1 ADR REQUIRED: YES

**Reason:** Materially changes how parties are classified and accessed across all domains. All code referencing is_customer/is_vendor must migrate to party_roles.

### 1.2 Existing ADR Sufficient: NO

**Reason:** No existing ADR governs party role modeling. ADR-018..056 cover commercial lineage, fulfillment, and operational handoff — not master-data role semantics.

### 1.3 Architectural Consequences

| Consequence | Impact |
|-------------|--------|
| All domains use party_roles instead of boolean flags | Cross-cutting change |
| Transaction-context roles (BILL_TO, SHIPPER) require context_type | New pattern |
| Role-based access control can use party_roles | Future capability |

### 1.4 ADR Content Requirements

| Topic | Required |
|-------|----------|
| Role type vocabulary | YES |
| Context type semantics | YES |
| Effective dating rules | YES |
| Migration from boolean flags | YES |
| Authorization implications | YES |

---

## 2. EXTERNAL REFERENCE ARCHITECTURE ADR

### 2.1 ADR REQUIRED: YES

**Reason:** Establishes canonical pattern for external system integration. All ERP/CRM/TMS/WMS/CUSTOMS ID mappings use external_references.

### 2.2 Existing ADR Sufficient: NO

**Reason:** No existing ADR governs external identity mapping.

### 2.3 Architectural Consequences

| Consequence | Impact |
|-------------|--------|
| Single table for all external IDs | Cross-cutting |
| ERP-led/hybrid modes supported | Future capability |
| External ID uniqueness governed | Data integrity |

### 2.4 ADR Content Requirements

| Topic | Required |
|-------|----------|
| Entity type vocabulary | YES |
| External system vocabulary | YES |
| Uniqueness constraints | YES |
| Synchronization ownership | DEFERRED |

---

## 3. HIERARCHY INTEGRITY ADR

### 3.1 ADR REQUIRED: NO

**Reason:** parent_id pattern is already established on md_entities. Extension to md_locations follows the same pattern. Application-layer cycle prevention is sufficient for v1.

### 3.2 Existing ADR Sufficient: N/A

---

## 4. LOCATION HIERARCHY ADR

### 4.1 ADR REQUIRED: NO

**Reason:** Same as above. parent_id pattern is established. Type compatibility is a business rule, not architectural.

### 4.2 Existing ADR Sufficient: N/A

---

## 5. PARTY-LOCATION RELATIONSHIP ADR

### 5.1 ADR REQUIRED: NO

**Reason:** Standard many-to-many relationship pattern. No architectural authority change.

### 5.2 Existing ADR Sufficient: N/A

---

## 6. TRANSACTION-CONTEXT ROLES ADR

### 6.1 ADR REQUIRED: NO

**Reason:** Governed by Party Role Architecture ADR (context_type semantics).

---

## 7. ADR SUMMARY

| Proposed ADR | Required | Rationale |
|--------------|----------|-----------|
| Party Role Architecture | YES | Cross-cutting authority change |
| External Reference Architecture | YES | Cross-cutting integration pattern |
| Hierarchy Integrity | NO | Established pattern |
| Location Hierarchy | NO | Established pattern |
| Party-Location Relationship | NO | Standard pattern |
| Transaction-Context Roles | NO | Governed by Party Role ADR |

---

**END OF ADR RECONCILIATION**
