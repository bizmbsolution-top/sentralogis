# SENTRALOGIS — UI/UX-3D
# SCREEN SPECIFICATIONS

**Date:** 2026-09-01  

---

## 1. Commercial Dashboard

| Field | Value |
|-------|-------|
| Purpose | Commercial performance + attention |
| Target Persona | CS, Sales |
| Entry Point | Sidebar → Commercial |
| Primary Info | Revenue, Active orders, Pending quotes, Margin |
| Actions | Create Quote, Create SO, View Pipeline |
| Copilot | "Which customers need follow-up?" |
| States | Loading, Empty, Populated, Error |
| Responsive | Cards → Stack on mobile |

---

## 2. Customer 360

| Field | Value |
|-------|-------|
| Purpose | Complete customer view |
| Target Persona | CS, Sales |
| Entry Point | Customer list, Search |
| Primary Info | Profile, Engagements, Orders, Financial, Activity |
| Actions | Create Engagement, Create Order, Send Message |
| Copilot | "Summarize this customer's activity" |
| States | Loading, Populated, Error |
| Responsive | Tabs → Accordion on mobile |

---

## 3. Sales Order Detail

| Field | Value |
|-------|-------|
| Purpose | Full SO workspace |
| Target Persona | CS, Sales, Finance |
| Entry Point | SO list, Search |
| Header | SO Number, Customer, Status, Value, Margin |
| Tabs | Overview, Lines, Fulfillment, Shipments, Financial, Documents, Timeline, Activity |
| Actions | Create Fulfillment, Amend, Cancel, View Pricing |
| Copilot | "Explain why margin dropped" |
| States | Loading, Populated, Error, Unauthorized |
| Responsive | Tabs → Drawer on mobile |

---

## 4. Shipment Detail

| Field | Value |
|-------|-------|
| Purpose | Shipment tracking + execution |
| Target Persona | Operations, CS |
| Entry Point | Shipment list, Search, Tracking |
| Header | Reference, Route, Status, ETA, Mode |
| Tabs | Overview, Timeline, Execution, Documents, Exceptions, Financial, Activity |
| Actions | Update status, Assign resources, View documents |
| Copilot | "Why is this shipment delayed?" |
| States | Loading, Populated, Error |
| Responsive | Timeline → Vertical on mobile |

---

## 5. Invoice Detail

| Field | Value |
|-------|-------|
| Purpose | Invoice management |
| Target Persona | Finance |
| Entry Point | Invoice list, Search |
| Header | Invoice Number, Customer, Amount, Status, Due Date |
| Tabs | Overview, Lines, Payments, Allocations, Adjustments, Audit |
| Actions | Send, Accept, Mark Paid, PDF |
| Copilot | "Which payments are unmatched?" |
| States | Loading, Populated, Error |
| Responsive | Lines → Cards on mobile |

---

## 6. Work Queue

| Field | Value |
|-------|-------|
| Purpose | Cross-SBU operational work |
| Target Persona | Operations |
| Entry Point | Sidebar → Operations → Work Queue |
| Primary Info | Work items with priority, status, assignment |
| Actions | Open, Assign, Update status, Filter |
| Copilot | "What should I handle next?" |
| States | Loading, Empty, Populated, Error |
| Responsive | Table → Cards on mobile |

---

## 7. Control Tower

| Field | Value |
|-------|-------|
| Purpose | Cross-domain visibility |
| Target Persona | Management |
| Entry Point | Sidebar → Intelligence |
| Primary Info | Operational health, Financial health, Exceptions |
| Actions | Drill down, Filter, Export |
| Copilot | "What are the top risks today?" |
| States | Loading, Populated, Error |
| Responsive | Grid → Stack on mobile |

---

## 8. Customer Portal

| Field | Value |
|-------|-------|
| Purpose | Customer-facing order visibility |
| Target Persona | Customer |
| Entry Point | `/portal/customer` |
| Primary Info | Orders, Shipments, Documents, Financial |
| Actions | View tracking, Download documents, Contact support |
| Copilot | "Where is my shipment?" |
| States | Loading, Empty, Populated, Error, Unauthorized |
| Responsive | Mobile-first |

---

## 9. Vendor Portal

| Field | Value |
|-------|-------|
| Purpose | Vendor-facing assignment visibility |
| Target Persona | Vendor/Partner |
| Entry Point | `/portal/partner` |
| Primary Info | Assignments, Jobs, Documents, Performance |
| Actions | Update status, Upload POD, View schedule |
| Copilot | "What jobs are assigned to me?" |
| States | Loading, Empty, Populated, Error, Unauthorized |
| Responsive | Mobile-first |

---

**END OF SCREEN SPECIFICATIONS**
