# SENTRALOGIS — UI/UX-3C
# EXTERNAL VISIBILITY MATRIX

**Date:** 2026-09-01  

---

## 1. Customer Visibility

| Data | Visible | Boundary Mechanism |
|------|---------|-------------------|
| Own sales orders | YES | Customer ID match (RLS) |
| Own shipments | YES | Customer ID match (RLS) |
| Tracking | YES | Token-based public (`/track/[token]`) |
| Documents | YES | Customer-scoped RLS |
| Invoices | YES | Customer-scoped RLS |
| Payment status | YES | Customer-scoped RLS |
| Support tickets | FUTURE | — |
| Internal pricing (margins) | NEVER | Staff-only |
| Internal operational notes | NEVER | Staff-only |
| Staff PII | NEVER | Staff-only |
| Other customers' data | NEVER | RLS |

---

## 2. Vendor / Partner Visibility

| Data | Visible | Boundary Mechanism |
|------|---------|-------------------|
| Assignments | YES | Vendor ID match (RLS) |
| Jobs | YES | Vendor ID match (RLS) |
| Shipments | YES | Vendor ID match (RLS) |
| Documents | YES | Vendor-scoped RLS |
| POD submission | YES | Operational workflow |
| Schedules | YES | Vendor-scoped |
| Performance metrics | YES | Vendor-scoped |
| Internal costs (margins) | NEVER | Staff-only |
| Internal notes | NEVER | Staff-only |
| Other vendors' data | NEVER | RLS |

---

## 3. Driver / Field Visibility

| Data | Visible | Boundary Mechanism |
|------|---------|-------------------|
| Own jobs | YES | Driver ID match (RLS) |
| Route | YES | Driver-scoped |
| Pickup/Delivery | YES | Operational |
| POD capture | YES | Operational |
| Incident reporting | YES | Operational |
| Other drivers' jobs | NEVER | RLS |
| Internal costs | NEVER | Staff-only |

---

## 4. Public Tracking

| Data | Visible | Mechanism |
|------|---------|-----------|
| Shipment status | YES | `tracking_token` |
| Route summary | YES | Public |
| Milestones | YES | Public |
| Documents | PARTIAL | Token-scoped |
| Financial data | NEVER | Internal only |
| Internal notes | NEVER | Internal only |

---

## 5. External Visibility Anti-Patterns

| Anti-Pattern | Prevention |
|--------------|------------|
| Cross-customer data leakage | RLS + customer_id filtering |
| Margin exposure to customers | Column-level exclusion |
| Vendor access to other vendors' data | RLS + vendor_id filtering |
| Driver access to other drivers' jobs | RLS + driver_id filtering |
| Public tracking without token | Token-required routes |

---

**END OF EXTERNAL VISIBILITY MATRIX**
