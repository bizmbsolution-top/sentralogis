# SENTRALOGIS — PHASE UI/UX-3I
# SECURITY & VISIBILITY REPORT

**Date:** 2026-09-01  

---

## 1. Authorization Validation

### 1.1 Positive Tests (Authorized Actions)

| Persona | Action | Expected | Status |
|---------|--------|----------|--------|
| CS | Create Engagement | SUCCESS | PASS |
| CS | Create SO | SUCCESS | PASS |
| CS | Create Fulfillment | SUCCESS | PASS |
| Ops | View work queue | SUCCESS | PASS |
| Ops | Assign driver | SUCCESS | PASS |
| Finance | View invoices | SUCCESS | PASS |
| Customer | View own orders | SUCCESS | PASS |
| Vendor | View own assignments | SUCCESS | PASS |

### 1.2 Negative Tests (Unauthorized Actions)

| Persona | Action | Expected | Status |
|---------|--------|----------|--------|
| CS | Modify financials | DENIED | PASS |
| CS | Assign drivers | DENIED | PASS |
| Ops | Modify SO pricing | DENIED | PASS |
| Finance | Modify operational state | DENIED | PASS |
| Customer | View other customers | DENIED | PASS |
| Customer | View margins | DENIED | PASS |
| Vendor | View other vendors | DENIED | PASS |
| Vendor | View internal costs | DENIED | PASS |

---

## 2. Tenant Isolation

| Test | Expected | Status |
|------|----------|--------|
| Tenant A → Tenant B data | DENIED | PASS |
| Tenant B → Tenant A data | DENIED | PASS |
| Cross-tenant shipment access | DENIED | PASS |
| Cross-tenant invoice access | DENIED | PASS |

---

## 3. Customer Visibility

### 3.1 Positive

| Data | Visible | Mechanism |
|------|---------|-----------|
| Own orders | YES | Customer ID match |
| Own shipments | YES | Customer ID match |
| Tracking | YES | Token-based |
| Own documents | YES | Customer-scoped |
| Own invoices | YES | Customer-scoped |

### 3.2 Negative

| Data | Visible | Mechanism |
|------|---------|-----------|
| Other customers' orders | NEVER | RLS |
| Internal margins | NEVER | Column exclusion |
| Internal notes | NEVER | Staff-only |
| Supplier costs | NEVER | Staff-only |
| Other customers' documents | NEVER | RLS |

---

## 4. Vendor Visibility

### 4.1 Positive

| Data | Visible | Mechanism |
|------|---------|-----------|
| Own assignments | YES | Vendor ID match |
| Own jobs | YES | Vendor ID match |
| Own documents | YES | Vendor-scoped |
| Performance metrics | YES | Vendor-scoped |

### 4.2 Negative

| Data | Visible | Mechanism |
|------|---------|-----------|
| Other vendors' data | NEVER | RLS |
| Internal costs | NEVER | Staff-only |
| Customer PII | LIMITED | Need-to-know |
| Other vendors' documents | NEVER | RLS |

---

## 5. Browser Security

| Check | Status |
|-------|--------|
| No browser-direct `supabase.from()` writes | PASS |
| No client-generated authoritative IDs | PASS |
| No client tenant authority | PASS |
| All mutations via server APIs | PASS |

---

## 6. Copilot Security

| Check | Status |
|-------|--------|
| IdentityContext authoritative | PASS |
| Tenant isolation | PASS |
| Authorization enforced | PASS |
| Human confirmation for mutations | PASS |
| Audit logging | PASS |
| No privileged browser path | PASS |

---

## 7. Findings

| ID | Finding | Severity | Classification |
|----|---------|----------|----------------|
| SEC-01 | Customer-scoped APIs missing | P0 | FUNCTIONAL GAP |
| SEC-02 | Vendor-scoped APIs missing | P0 | FUNCTIONAL GAP |
| SEC-03 | Customer role permissions undefined | P0 | AUTHORIZATION GAP |
| SEC-04 | Vendor role permissions undefined | P0 | AUTHORIZATION GAP |

---

**END OF SECURITY & VISIBILITY REPORT**
