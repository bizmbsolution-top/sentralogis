# SENTRALOGIS — PHASE UI/UX-3K
# IMPLEMENTATION READINESS

**Date:** 2026-09-01  

---

## 1. Readiness Assessment

| Component | Readiness | Blocker |
|-----------|-----------|---------|
| Identity Model | READY | IdentityContext supports customer_id |
| Authorization Model | READY | customer_visibility:read permission exists |
| RLS Foundation | READY | Tenant isolation enforced |
| Portal UI Shell | READY | Pages exist (static data) |
| Copilot Engine | READY | Engine exists, needs context adapter |
| Customer API | GAP | Needs implementation |
| Vendor API | GAP | Needs implementation |
| Customer Role | GAP | Needs definition |
| Vendor Role | GAP | Needs definition |
| Mobile UX | PARTIAL | Responsive corrections needed |

---

## 2. Prerequisites for Implementation

| Prerequisite | Status | Action |
|--------------|--------|--------|
| Customer role definition | GAP | Define `customer` role in roles.ts |
| Vendor role definition | GAP | Define `vendor` role in roles.ts |
| Customer-scoped order API | GAP | Create `/api/v1/portal/customer/orders` |
| Customer-scoped shipment API | GAP | Create `/api/v1/portal/customer/shipments` |
| Vendor-scoped assignment API | GAP | Create `/api/v1/portal/vendor/assignments` |
| Vendor-scoped job API | GAP | Create `/api/v1/portal/vendor/jobs` |
| RLS customer policy | GAP | Add customer_id policy to tables |
| RLS vendor policy | GAP | Add vendor_id policy to tables |
| Copilot context adapter | GAP | Add customer/vendor context to Copilot |

---

## 3. Implementation Sequencing

### Phase 3K-1: Foundation
1. Define `customer` and `vendor` roles in `roles.ts`
2. Add permissions to `authorization.ts`
3. Add RLS policies for customer_id and vendor_id

### Phase 3K-2: Backend APIs
1. Customer order API
2. Customer shipment API
3. Vendor assignment API
4. Vendor job API

### Phase 3K-3: Portal UI Integration
1. Replace static data with API calls
2. Add loading/error/empty states
3. Add Copilot context

### Phase 3K-4: Mobile + Accessibility
1. Responsive corrections
2. Touch target sizing
3. Bottom nav for portals

---

## 4. Backend Gaps to Document for Future Phase

| Gap | API | Service | Repository | Priority |
|-----|-----|---------|------------|----------|
| Customer orders | `/api/v1/portal/customer/orders` | CustomerPortalService | customer-portal-repository | P0 |
| Customer shipments | `/api/v1/portal/customer/shipments` | CustomerPortalService | customer-portal-repository | P0 |
| Vendor assignments | `/api/v1/portal/vendor/assignments` | VendorPortalService | vendor-portal-repository | P0 |
| Vendor jobs | `/api/v1/portal/vendor/jobs` | VendorPortalService | vendor-portal-repository | P0 |
| Customer documents | `/api/v1/portal/customer/documents` | CustomerPortalService | customer-portal-repository | P1 |
| Customer invoices | `/api/v1/portal/customer/invoices` | CustomerPortalService | customer-portal-repository | P1 |
| Vendor documents | `/api/v1/portal/vendor/documents` | VendorPortalService | vendor-portal-repository | P1 |
| POD upload | `/api/v1/portal/vendor/pod` | VendorPortalService | vendor-portal-repository | P1 |

---

## 5. Security Acceptance Criteria

| Criteria | Test |
|----------|------|
| Customer cannot see other customers | API filters by customer_id |
| Vendor cannot see other vendors | API filters by vendor_id |
| No client tenant authority | IdentityContext tenant only |
| RLS enforces scope | Policies on all tables |
| Audit logged | All mutations logged |

---

**END OF IMPLEMENTATION READINESS**
