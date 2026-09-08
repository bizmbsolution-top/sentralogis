# SENTRALOGIS — UI/UX-2
# SCREEN SPECIFICATIONS

**Date:** 2026-09-01  

---

## 1. Engagement List

| Field | Value |
|-------|-------|
| Purpose | Browse and search customer engagements |
| Primary User | CS, Sales |
| Entry Points | Sidebar → Commercial → Engagements |
| Exit Points | Engagement detail, SO detail |
| Primary Action | Create Engagement |
| Secondary Actions | Search, Filter, Sort |
| Data Source | `commercial_work_orders` |
| States | Loading, Empty, Populated, Error |
| Empty State | "No engagements yet. Create your first engagement." |
| Responsive | Table → Cards on mobile |

---

## 2. Engagement Detail

| Field | Value |
|-------|-------|
| Purpose | Full engagement workspace |
| Primary User | CS, Sales |
| Entry Points | Engagement list, Customer 360 |
| Exit Points | Quote, SO, Fulfillment |
| Primary Action | Create Quote / Create Order |
| Secondary Actions | Edit, Close, View Financials |
| Data Source | `commercial_work_orders` + related |
| States | Loading, Populated, Error |
| Authorization | `commercial:read` / `commercial:manage` |

---

## 3. Sales Order List

| Field | Value |
|-------|-------|
| Purpose | Browse and search sales orders |
| Primary User | CS, Sales, Finance |
| Entry Points | Sidebar → Commercial → Sales Orders |
| Exit Points | SO detail |
| Primary Action | Create SO |
| Secondary Actions | Search, Filter by status, Export |
| Data Source | `sales_orders` via REST API |
| States | Loading, Empty, Populated, Error |
| Empty State | "No sales orders found." |

---

## 4. Sales Order Detail

| Field | Value |
|-------|-------|
| Purpose | Full SO workspace |
| Primary User | CS, Sales, Finance |
| Entry Points | SO list, Engagement |
| Exit Points | Fulfillment, Financial, Shipment |
| Primary Action | Create Fulfillment |
| Secondary Actions | Amend, Cancel, View Pricing |
| Data Source | `sales_orders` + `fulfillments` |
| States | Loading, Populated, Error |
| Authorization | `commercial:read` / `commercial:manage` |

---

## 5. Fulfillment Detail

| Field | Value |
|-------|-------|
| Purpose | Track fulfillment composition and progress |
| Primary User | CS, Operations |
| Entry Points | SO detail, Fulfillment list |
| Exit Points | Shipment, Allocation |
| Primary Action | Update progress |
| Secondary Actions | Add allocation, View exceptions |
| Data Source | `fulfillments` + `fulfillment_allocations` |
| States | Loading, Populated, Error |

---

## 6. Invoice Detail

| Field | Value |
|-------|-------|
| Purpose | View and manage invoice |
| Primary User | Finance |
| Entry Points | Financial → Invoices, SO detail |
| Exit Points | Payment, AR/AP |
| Primary Action | Record Payment |
| Secondary Actions | Send, Accept, Mark Paid, PDF |
| Data Source | `fin_invoices` |
| States | Loading, Populated, Error |
| Authorization | `commercial:read` / `commercial:manage` |

---

## 7. Payment Detail

| Field | Value |
|-------|-------|
| Purpose | View and allocate payment |
| Primary User | Finance |
| Entry Points | Financial → Payments, Invoice |
| Exit Points | Allocation, Settlement |
| Primary Action | Allocate to Invoice |
| Secondary Actions | Reverse, View audit |
| Data Source | `fin_payments` + `fin_payment_allocations` |
| States | Loading, Populated, Error |

---

## 8. Control Tower

| Field | Value |
|-------|-------|
| Purpose | Cross-domain execution visibility |
| Primary User | CS, Operations, Management |
| Entry Points | Sidebar → Commercial → Control Tower |
| Exit Points | SO detail, Shipment detail |
| Primary Action | Search order |
| Secondary Actions | View customer projection, View internal |
| Data Source | `sales_orders` + related aggregates |
| States | Loading, Populated, Error |

---

**END OF SCREEN SPECIFICATIONS**
