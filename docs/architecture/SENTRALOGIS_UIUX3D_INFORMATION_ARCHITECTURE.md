# SENTRALOGIS — UI/UX-3D
# INFORMATION ARCHITECTURE

**Date:** 2026-09-01  

---

## 1. Global Navigation

| Element | Always Visible | Purpose |
|---------|---------------|---------|
| Command Center | YES | Search + commands |
| Workspace Switcher | YES | Persona context |
| Notifications | YES | Alerts + exceptions |
| Copilot | YES | AI assistant |
| Account | YES | Profile + settings |

---

## 2. Persona Navigation

### Commercial

```
COMMERCIAL
├── Dashboard
├── Customers
│   ├── List
│   ├── 360 View
│   └── Create
├── Engagements
├── Quotes
├── Sales Orders
└── Pricing
```

### Operations

```
OPERATIONS
├── Dashboard
├── Work Queue
├── Forwarding
├── Trucking
├── Customs
└── Warehouse
```

### Finance

```
FINANCE
├── Dashboard
├── Invoices
├── AR
├── AP
├── Payments
├── Settlements
└── Reconciliation
```

### Intelligence

```
INTELLIGENCE
├── Dashboard
├── Visibility
├── Margin
├── Profitability
└── Exceptions
```

---

## 3. Contextual Navigation

### Sales Order Context

```
SO-2026-000125
├── Overview
├── Lines
├── Fulfillment
├── Shipments
├── Operations
├── Financial
├── Documents
├── Timeline
└── Activity
```

### Shipment Context

```
SHP-2026-00125
├── Overview
├── Timeline
├── Execution
├── Documents
├── Exceptions
├── Financial
└── Activity
```

### Invoice Context

```
INV-2026-00125
├── Overview
├── Lines
├── Payments
├── Allocations
├── Adjustments
└── Audit
```

---

## 4. App Launcher

| Group | Apps |
|-------|------|
| Work | My Work, Approvals, Tasks |
| Commercial | Customers, Engagements, Quotes, SO |
| Operations | Shipments, WO, JO, SBU |
| Finance | Billing, AR, AP, Payments |
| Intelligence | Control Tower, Analytics, Copilot |

---

## 5. My Work

| Section | Content |
|---------|---------|
| Today | Pending approvals, Active assignments |
| Attention | Exceptions, Overdue items, SLA risks |
| Pending | Drafts, Awaiting approval |
| Recent | Recently viewed/edited |
| Assigned to Me | Tasks, Jobs, Approvals |

---

## 6. Command Center

| Capability | Implementation |
|------------|---------------|
| Search | Entity search (customers, orders, shipments) |
| Commands | Navigation + actions |
| Quick actions | New Quote, New SO, Record Payment |
| Recent | Recently accessed entities |
| Suggestions | Copilot-powered |

---

## 7. Entity Navigation

| Entity | Context Tabs |
|--------|-------------|
| Customer | Overview, Engagements, Orders, Financial, Activity |
| Engagement | Overview, Quotes, Orders, Fulfillment, Financial |
| Quote | Overview, Lines, Pricing, Negotiation, History |
| SO | Overview, Lines, Fulfillment, Shipments, Financial |
| Shipment | Overview, Timeline, Execution, Documents, Exceptions |
| Invoice | Overview, Lines, Payments, Allocations, Audit |
| Payment | Overview, Allocations, Settlements, History |

---

## 8. Customer/Vendor Navigation

### Customer Portal

```
CUSTOMER PORTAL
├── My Orders
├── Shipments
├── Tracking
├── Documents
├── Financial
└── Support
```

### Vendor Portal

```
VENDOR PORTAL
├── Assignments
├── Jobs
├── Documents
├── Performance
└── Messages
```

---

**END OF INFORMATION ARCHITECTURE**
