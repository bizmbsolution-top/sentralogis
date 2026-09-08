# SENTRALOGIS — PHASE UI/UX-3K
# VISIBILITY & AUTHORIZATION MATRIX

**Date:** 2026-09-01  

---

## 1. Customer Visibility Matrix

| Resource | Internal Read | Internal Write | Customer Read | Customer Write | Customer Scope |
|----------|---------------|----------------|---------------|----------------|----------------|
| Engagement | YES | YES | OWN ONLY | NO | customer_id |
| Quote | YES | YES | OWN ONLY | NO | customer_id |
| Sales Order | YES | YES | OWN ONLY | NO | engagement_id → customer_id |
| SO Line | YES | YES | OWN ONLY | NO | so_id → customer_id |
| Fulfillment | YES | YES | OWN ONLY | NO | so_id → customer_id |
| Shipment | YES | YES | OWN ONLY | NO | wo_id → customer_id |
| Job Order | YES | YES | NO | NO | — |
| Assignment | YES | YES | NO | NO | — |
| Milestones | YES | YES | OWN ONLY | NO | shipment_id → customer_id |
| POD | YES | YES | NO | NO | — |
| Documents | YES | YES | OWN ONLY | NO | entity_id → customer_id |
| Invoice | YES | YES | OWN ONLY | NO | customer_id |
| Payment | YES | YES | OWN ONLY | NO | invoice_id → customer_id |
| Settlement | YES | YES | NO | NO | — |
| Accounting | YES | YES | NO | NO | — |
| Exceptions | YES | YES | OWN ONLY | NO | shipment_id → customer_id |
| Audit History | YES | YES | NO | NO | — |

---

## 2. Vendor Visibility Matrix

| Resource | Internal Read | Internal Write | Vendor Read | Vendor Write | Vendor Scope |
|----------|---------------|----------------|-------------|--------------|--------------|
| Engagement | YES | YES | NO | NO | — |
| Quote | YES | YES | NO | NO | — |
| Sales Order | YES | YES | NO | NO | — |
| SO Line | YES | YES | NO | NO | — |
| Fulfillment | YES | YES | NO | NO | — |
| Shipment | YES | YES | ASSIGNED | STATUS ONLY | vendor_id |
| Job Order | YES | YES | OWN ONLY | STATUS ONLY | vendor_id |
| Assignment | YES | YES | OWN ONLY | STATUS ONLY | vendor_id |
| Milestones | YES | YES | OWN ONLY | NO | job_id → vendor_id |
| POD | YES | YES | OWN ONLY | UPLOAD | job_id → vendor_id |
| Documents | YES | YES | OWN ONLY | UPLOAD | vendor_id |
| Invoice | YES | YES | NO | NO | — |
| Payment | YES | YES | NO | NO | — |
| Settlement | YES | YES | NO | NO | — |
| Accounting | YES | YES | NO | NO | — |
| Exceptions | YES | YES | OWN ONLY | REPORT | vendor_id |
| Audit History | YES | YES | NO | NO | — |

---

## 3. Authorization Matrix

| Action | Permission | Customer | Vendor |
|--------|------------|----------|--------|
| View own orders | `customer_visibility:read` | YES | NO |
| View own shipments | `customer_visibility:read` | YES | NO |
| View own invoices | `customer_visibility:read` | YES | NO |
| View own documents | `customer_visibility:read` | YES | NO |
| View assignments | `vendor_visibility:read` | NO | YES |
| View jobs | `vendor_visibility:read` | NO | YES |
| Update job status | `job_order:update` | NO | YES |
| Upload POD | `job_order:update` | NO | YES |
| Report exception | `job_order:update` | NO | YES |
| View internal pricing | `pricing:read` | NO | NO |
| View margin | `finance:read` | NO | NO |

---

## 4. RLS Policy Requirements

| Table | Current Policy | Needed Policy |
|-------|---------------|---------------|
| `sales_orders` | tenant_id = get_my_tenant_id() | Add: customer_id = get_my_customer_id() |
| `shp_shipments` | tenant_id = get_my_tenant_id() | Add: customer_id = get_my_customer_id() |
| `job_orders` | tenant_id = get_my_tenant_id() | Add: vendor_id = get_my_vendor_id() |
| `fin_invoices` | tenant_id = get_my_tenant_id() | Add: customer_id = get_my_customer_id() |

---

## 5. Role Definitions

| Role | Permissions | Persona |
|------|-------------|---------|
| `customer` | `customer_visibility:read` | External customer |
| `vendor` | `vendor_visibility:read`, `job_order:update` | External vendor/partner |

---

**END OF VISIBILITY & AUTHORIZATION MATRIX**
