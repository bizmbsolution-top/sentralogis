# SENTRALOGIS — UI/UX-3G
# EXTERNAL PORTAL DESIGN

**Date:** 2026-09-01  

---

## 1. Customer Portal

### Purpose
Customer-facing order and shipment visibility.

### Entry Point
`/portal/customer`

### Primary Surfaces

| Surface | Content |
|---------|---------|
| My Orders | Active, completed, cancelled orders |
| Shipments | In-transit, delivered |
| Tracking | Real-time tracking with milestones |
| Documents | Invoices, BL, supporting docs |
| Financial | Invoices, payment status |
| Support | Messages, requests, issues |

### Visibility Matrix

| Data | Visible | Boundary |
|------|---------|----------|
| Own orders | YES | Customer ID |
| Own shipments | YES | Customer ID |
| Tracking | YES | Token |
| Documents | YES | Customer-scoped |
| Invoices | YES | Customer-scoped |
| Margins | NEVER | Internal |
| Internal notes | NEVER | Staff-only |
| Other customers | NEVER | RLS |

### Screen: Order Detail

| Element | Description |
|---------|-------------|
| Header | Order Number, Status, Date |
| Lines | Service, Qty, Price |
| Fulfillment | Progress, allocations |
| Shipments | Tracking, milestones |
| Documents | Available for download |
| Actions | Approve, Message, Download |

### Screen: Shipment Tracking

| Element | Description |
|---------|-------------|
| Header | Reference, Route, Status |
| Map | Route visualization |
| Milestones | Planned vs actual |
| Documents | BL, POD, etc. |
| Actions | Share, Download |

---

## 2. Vendor Portal

### Purpose
Vendor/partner assignment and execution visibility.

### Entry Point
`/portal/partner`

### Primary Surfaces

| Surface | Content |
|---------|---------|
| Assignments | Active, pending, completed |
| Jobs | Current job list |
| Execution | Pickup/delivery status |
| Documents | BAST, POD, receipts |
| Performance | Metrics, score |
| Messages | Communication |

### Visibility Matrix

| Data | Visible | Boundary |
|------|---------|----------|
| Own assignments | YES | Vendor ID |
| Own jobs | YES | Vendor ID |
| Execution details | YES | Vendor-scoped |
| Documents | YES | Vendor-scoped |
| Performance | YES | Vendor-scoped |
| Internal costs | NEVER | Internal |
| Other vendors | NEVER | RLS |
| Customer PII | LIMITED | Need-to-know |

### Screen: Assignment Detail

| Element | Description |
|---------|-------------|
| Header | Assignment ID, Customer, Status |
| Execution | Pickup, route, delivery |
| Documents | Required + uploaded |
| Actions | Accept, Update Status, Upload POD |

---

## 3. Mobile Experience

### Customer Mobile

| Priority | Workflow |
|----------|----------|
| HIGH | Track shipment |
| HIGH | View order status |
| MEDIUM | Approve quote |
| MEDIUM | Download document |

### Vendor Mobile

| Priority | Workflow |
|----------|----------|
| HIGH | View assignments |
| HIGH | Update job status |
| HIGH | Upload POD |
| MEDIUM | View schedule |

---

## 4. Security Boundaries

| Rule | Implementation |
|------|----------------|
| Customer isolation | Customer ID filtering |
| Vendor isolation | Vendor ID filtering |
| No cross-tenant data | RLS + server filtering |
| Token-based tracking | Public tracking without auth |
| Least privilege | Minimum data exposure |

---

**END OF EXTERNAL PORTAL DESIGN**
