# SENTRALOGIS — PHASE UI/UX-3K
# CUSTOMER & VENDOR ACCESS DISCOVERY

**Date:** 2026-09-01  
**Status:** GREEN  
**Phase:** UI/UX-3K — Discovery  

---

## 1. Executive Summary

**PHASE UI/UX-3K: GREEN**

Customer and Vendor access can be enabled by **extending the existing identity/authorization model** (Option A from the mandate). The existing `customer_visibility:read` permission, `IdentityContext` architecture, and role-based authorization matrix provide a canonical foundation. No new architecture or ADR is required.

**Key Finding:** The existing `IdentityContext` already supports a `customerId` field (from `md_entities`), and the `customer_visibility:read` permission exists in the vocabulary. The gap is the **absence of customer-scoped and vendor-scoped API endpoints** and **portal route protection** — not the authorization model itself.

---

## 2. Customer Access Forensic

### 2.1 Identity Model

| Concept | Current State | Canonical? |
|---------|---------------|------------|
| Customer identity | `md_entities` with `is_customer` flag | YES |
| Customer membership | `customer_id` on `IdentityContext` | YES |
| Customer user | `profiles` table with `customer_id` | YES |
| Customer role | `ROLE_WAREHOUSE_CUSTOMER` exists | YES |
| Customer authorization | `customer_visibility:read` permission | YES |
| Customer-to-tenant | Via `tenant_id` on `md_entities` | YES |
| Customer-to-engagement | Via `commercial_work_orders.customer_id` | YES |
| Customer-to-SO | Via `sales_orders.engagement_id` → `commercial_work_orders` | YES |
| Customer-to-shipment | Via `shp_shipments.work_order_id` → `wo_items` | YES |
| Customer-to-document | Via `cus_declaration_documents` (customs) | PARTIAL |
| Customer financial visibility | Via `fin_invoices` (future) | PARTIAL |
| Customer notification scope | Not implemented | GAP |
| Customer Copilot scope | Not implemented | GAP |

### 2.2 Missing Capabilities

| Capability | Type | Severity |
|------------|------|----------|
| Customer-scoped order API | BACKEND | P0 |
| Customer-scoped shipment API | BACKEND | P0 |
| Customer-scoped document API | BACKEND | P1 |
| Customer-scoped financial API | BACKEND | P1 |
| Customer role permissions | AUTHORIZATION | P0 |
| Customer portal route protection | BACKEND | P0 |
| Customer Copilot context | BACKEND | P2 |

---

## 3. Vendor / Partner Access Forensic

### 3.1 Identity Model

| Concept | Current State | Canonical? |
|---------|---------------|------------|
| Vendor identity | `md_entities` with `is_vendor` flag | YES |
| Vendor membership | `vendor_id` on `IdentityContext` (future) | PARTIAL |
| Vendor role | Not defined | GAP |
| Vendor authorization | Not defined | GAP |
| Vendor-to-tenant | Via `tenant_id` on `md_entities` | YES |
| Vendor-to-assignment | Via `job_orders` (future) | PARTIAL |
| Vendor-to-shipment | Via `shp_shipments` (future) | PARTIAL |
| Vendor-to-job | Via `job_orders` (future) | PARTIAL |
| Vendor-to-document | Not implemented | GAP |
| Vendor financial visibility | Not implemented | GAP |
| Vendor notification scope | Not implemented | GAP |
| Vendor Copilot scope | Not implemented | GAP |

### 3.2 Missing Capabilities

| Capability | Type | Severity |
|------------|------|----------|
| Vendor-scoped assignment API | BACKEND | P0 |
| Vendor-scoped job API | BACKEND | P0 |
| Vendor-scoped shipment API | BACKEND | P0 |
| Vendor-scoped document API | BACKEND | P1 |
| Vendor role permissions | AUTHORIZATION | P0 |
| Vendor portal route protection | BACKEND | P0 |
| Vendor Copilot context | BACKEND | P2 |

---

## 4. Visibility Model

### 4.1 Customer Visibility Matrix

| Resource | Internal | Customer | Vendor |
|----------|----------|----------|--------|
| Engagement | YES | OWN ONLY | NO |
| Quote | YES | OWN ONLY | NO |
| Sales Order | YES | OWN ONLY | NO |
| SO Line | YES | OWN ONLY | NO |
| Fulfillment | YES | OWN ONLY | NO |
| Shipment | YES | OWN ONLY | ASSIGNED |
| Job Order | YES | NO | OWN ONLY |
| Assignment | YES | NO | OWN ONLY |
| Milestones | YES | OWN ONLY | OWN ONLY |
| POD | YES | NO | OWN ONLY |
| Documents | YES | OWN ONLY | OWN ONLY |
| Invoice | YES | OWN ONLY | NO |
| Payment | YES | OWN ONLY | NO |
| Settlement | YES | NO | NO |
| Accounting | YES | NO | NO |
| Exceptions | YES | OWN ONLY | OWN ONLY |
| Audit History | YES | NO | NO |

### 4.2 Visibility Rule

```
TENANT BOUNDARY
    +
EXTERNAL PRINCIPAL (customer/vendor)
    +
RESOURCE RELATIONSHIP (ownership/assignment)
    +
AUTHORIZATION (customer_visibility:read / vendor_visibility:read)
    +
VISIBILITY PROJECTION (filtered DTO)
```

---

## 5. API Forensic

### 5.1 Existing APIs to Reuse

| API | Current Scope | Extension Needed |
|-----|---------------|------------------|
| `/api/v1/commercial/sales-orders` | Tenant-wide | Add `?customerId=` filter |
| `/api/v1/forwarding/shipments` | Tenant-wide | Add `?customerId=` filter |
| `/api/v1/commercial/fulfillments` | Tenant-wide | Add `?customerId=` filter |
| `/api/v1/customs/declarations` | Tenant-wide | Add `?customerId=` filter |
| `/api/copilot` | Tenant-wide | Add customer context |

### 5.2 New APIs Required

| API | Scope | Priority |
|-----|-------|----------|
| `GET /api/v1/portal/customer/orders` | Customer-scoped | P0 |
| `GET /api/v1/portal/customer/shipments` | Customer-scoped | P0 |
| `GET /api/v1/portal/customer/documents` | Customer-scoped | P1 |
| `GET /api/v1/portal/customer/invoices` | Customer-scoped | P1 |
| `GET /api/v1/portal/vendor/assignments` | Vendor-scoped | P0 |
| `GET /api/v1/portal/vendor/jobs` | Vendor-scoped | P0 |
| `GET /api/v1/portal/vendor/shipments` | Vendor-scoped | P0 |
| `GET /api/v1/portal/vendor/documents` | Vendor-scoped | P1 |

---

## 6. Authorization Forensic

### 6.1 Identity → Authentication → External Principal → Tenant → Resource → Action

| Step | Customer | Vendor |
|------|----------|--------|
| Identity | `md_entities.is_customer` | `md_entities.is_vendor` |
| Authentication | Supabase Auth | Supabase Auth |
| External Principal | `customer_id` on session | `vendor_id` on session |
| Tenant | `tenant_id` from membership | `tenant_id` from membership |
| Resource | Customer-scoped queries | Vendor-scoped queries |
| Action | `customer_visibility:read` | `vendor_visibility:read` |

### 6.2 RLS Enforcement

| Table | Current RLS | Needed |
|-------|-------------|--------|
| `sales_orders` | Tenant-only | Add customer_id policy |
| `shp_shipments` | Tenant-only | Add customer_id policy |
| `job_orders` | Tenant-only | Add vendor_id policy |
| `fin_invoices` | Tenant-only | Add customer_id policy |

---

## 7. Copilot Boundary

### 7.1 Customer Copilot

| Capability | Status |
|------------|--------|
| Ask about own orders | SUPPORTED (context) |
| Ask about own shipments | SUPPORTED (context) |
| Ask about pricing | SUPPORTED (context) |
| Request action | NEEDS CONFIRMATION |
| View internal data | PROHIBITED |

### 7.2 Vendor Copilot

| Capability | Status |
|------------|--------|
| Ask about own assignments | SUPPORTED (context) |
| Ask about own jobs | SUPPORTED (context) |
| Ask about execution | SUPPORTED (context) |
| Request action | NEEDS CONFIRMATION |
| View internal data | PROHIBITED |

---

## 8. Mobile Impact

| Workflow | Desktop | Mobile |
|----------|---------|--------|
| Customer order view | YES | PARTIAL |
| Customer tracking | YES | PARTIAL |
| Vendor assignment | YES | PARTIAL |
| Vendor POD upload | NO | PARTIAL |
| Copilot | YES | PARTIAL |

---

## 9. Security / Threat Review

| Threat | Risk | Mitigation |
|--------|------|------------|
| IDOR | LOW | Server-side customer_id filtering |
| Tenant escape | LOW | IdentityContext enforcement |
| Customer escape | LOW | Customer-scoped queries |
| Vendor escape | LOW | Vendor-scoped queries |
| Document leakage | LOW | Relationship-scoped queries |
| Financial leakage | LOW | Permission-gated APIs |

---

## 10. Decision

**Option A: Extending existing identity/authorization**

The existing `IdentityContext` + `customer_visibility:read` permission + role-based authorization matrix can be extended to support Customer and Vendor access safely.

**No new ADR required.**

---

**END OF CUSTOMER/VENDOR ACCESS DISCOVERY**
