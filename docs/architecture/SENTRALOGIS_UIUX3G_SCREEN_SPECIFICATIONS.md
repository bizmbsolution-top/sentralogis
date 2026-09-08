# SENTRALOGIS — UI/UX-3G
# SCREEN SPECIFICATIONS

**Date:** 2026-09-01  

---

## 1. Commercial Dashboard

| Element | Specification |
|---------|---------------|
| Purpose | Commercial performance + attention |
| Persona | CS, Sales |
| Entry | Sidebar → Commercial |
| Primary Info | Revenue, Active orders, Pending quotes, Margin |
| Actions | Create Quote, Create SO, View Pipeline |
| Data | Aggregates from `sales_orders`, `crm_quotations` |
| Authorization | `commercial:read` / `commercial:manage` |
| States | Loading, Empty, Populated, Error |
| Mobile | Cards → Stack |
| Copilot | "Which customers need follow-up?" |

---

## 2. Engagement Workspace

| Element | Specification |
|---------|---------------|
| Purpose | Commercial relationship context |
| Persona | CS, Sales |
| Entry | Engagement list, Customer 360 |
| Header | Customer, Status, Commercial context |
| Tabs | Overview, Quotes, Orders, Fulfillment, Financial, Documents, Activity |
| Actions | Create Quote, Create Direct Order, Close |
| Data | `commercial_work_orders` + related |
| Authorization | `commercial:read` / `commercial:manage` |
| States | Loading, Populated, Error |
| Mobile | Tabs → Accordion |
| Copilot | "Summarize this engagement" |

---

## 3. Sales Order Detail

| Element | Specification |
|---------|---------------|
| Purpose | Canonical commercial commitment |
| Persona | CS, Sales, Finance |
| Entry | SO list, Search |
| Header | SO Number, Customer, Status, Version |
| Tabs | Overview, Lines, Fulfillment, Shipments, Financial, Documents, Timeline, Activity |
| Actions | Create Fulfillment, Amend, Cancel, View Pricing |
| Data | `sales_orders` + `fulfillments` + `fin_invoices` |
| Authorization | `commercial:read` / `commercial:manage` |
| States | Loading, Populated, Error, Unauthorized |
| Mobile | Tabs → Drawer |
| Copilot | "Explain this order's margin" |

---

## 4. Shipment Detail

| Element | Specification |
|---------|---------------|
| Purpose | Shipment tracking + execution |
| Persona | Operations, CS |
| Entry | Shipment list, Search, Tracking |
| Header | Reference, Route, Status, ETA |
| Tabs | Overview, Timeline, Execution, Documents, Exceptions, Financial, Activity |
| Actions | Update status, Assign, View documents |
| Data | `shp_shipments` + `shp_units` + `shp_execution_legs` |
| Authorization | `job_order:read` / `job_order:manage` |
| States | Loading, Populated, Error |
| Mobile | Timeline → Vertical |
| Copilot | "Why is this shipment delayed?" |

---

## 5. Invoice Detail

| Element | Specification |
|---------|---------------|
| Purpose | Invoice management |
| Persona | Finance |
| Entry | Invoice list, Search |
| Header | Invoice Number, Customer, Amount, Status |
| Tabs | Overview, Lines, Payments, Allocations, Adjustments, Audit |
| Actions | Send, Accept, Mark Paid, PDF |
| Data | `fin_invoices` + `fin_payments` |
| Authorization | `commercial:read` / `commercial:manage` |
| States | Loading, Populated, Error |
| Mobile | Lines → Cards |
| Copilot | "Which payments are unmatched?" |

---

## 6. Work Queue

| Element | Specification |
|---------|---------------|
| Purpose | Cross-SBU operational work |
| Persona | Operations |
| Entry | Sidebar → Operations |
| Primary Info | Work items with priority, status, assignment |
| Actions | Open, Assign, Update status, Filter |
| Data | `shp_shipments` + `job_orders` |
| Authorization | `job_order:read` / `job_order:manage` |
| States | Loading, Empty, Populated, Error |
| Mobile | Table → Cards |
| Copilot | "What should I handle next?" |

---

## 7. Control Tower

| Element | Specification |
|---------|---------------|
| Purpose | Cross-domain visibility |
| Persona | Management |
| Entry | Sidebar → Intelligence |
| Primary Info | Operational health, Financial health, Exceptions |
| Actions | Drill down, Filter, Export |
| Data | Aggregates from all domains |
| Authorization | `commercial:read` |
| States | Loading, Populated, Error |
| Mobile | Grid → Stack |
| Copilot | "What are the top risks today?" |

---

## 8. Customer Portal

| Element | Specification |
|---------|---------------|
| Purpose | Customer-facing order visibility |
| Persona | Customer |
| Entry | `/portal/customer` |
| Primary Info | Orders, Shipments, Documents, Financial |
| Actions | View tracking, Download, Contact support |
| Data | Customer-scoped queries |
| Authorization | Customer relationship |
| States | Loading, Empty, Populated, Error, Unauthorized |
| Mobile | Mobile-first |
| Copilot | "Where is my shipment?" |

---

## 9. Vendor Portal

| Element | Specification |
|---------|---------------|
| Purpose | Vendor-facing assignment visibility |
| Persona | Vendor/Partner |
| Entry | `/portal/partner` |
| Primary Info | Assignments, Jobs, Documents, Performance |
| Actions | Update status, Upload POD, View schedule |
| Data | Vendor-scoped queries |
| Authorization | Vendor relationship |
| States | Loading, Empty, Populated, Error, Unauthorized |
| Mobile | Mobile-first |
| Copilot | "What jobs are assigned to me?" |

---

**END OF SCREEN SPECIFICATIONS**
