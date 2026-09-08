# SENTRALOGIS — UI/UX-3C
# INFORMATION ARCHITECTURE

**Date:** 2026-09-01  

---

## 1. Top-Level Navigation

```
SENTRALOGIS
│
├── COMMAND (⌘K)
│
├── MY WORK
│   ├── Today
│   ├── Attention
│   ├── Pending
│   ├── Recent
│   └── Assigned to Me
│
├── APPS
│   ├── Commercial
│   ├── Operations
│   ├── Finance
│   ├── Intelligence
│   └── Administration
│
├── CONTEXT (current entity/workspace)
│
├── COPILOT
│   ├── Explain
│   ├── Find
│   ├── Recommend
│   └── Act
│
└── ACCOUNT
```

---

## 2. Workspace Hierarchy

### Commercial
```
Commercial
├── Dashboard
├── Customers
│   ├── List
│   ├── 360 View
│   └── Create
├── Engagements
│   ├── List
│   ├── Detail
│   └── Create
├── Quotes
│   ├── List
│   ├── Builder
│   └── Convert to SO
├── Sales Orders
│   ├── List
│   ├── Detail
│   └── Create
└── Pricing
    ├── Rate Masters
    ├── Versions
    └── Overrides
```

### Operations
```
Operations
├── Dashboard
├── Work Queue
├── Forwarding
│   ├── Shipments
│   ├── Consolidations
│   └── Pricing
├── Trucking
│   ├── Work Orders
│   ├── Assignments
│   └── Fleet
├── Customs
│   └── Declarations
└── Warehouse
    ├── Inbound
    ├── Outbound
    └── Inventory
```

### Finance
```
Finance
├── Dashboard
├── Invoices
│   ├── Customer
│   └── Vendor
├── AR / Receivables
├── AP / Payables
├── Payments
├── Settlements
└── Reconciliation
```

### Intelligence
```
Intelligence
├── Dashboard
├── Visibility
├── Margin
├── Profitability
└── Exceptions
```

---

## 3. Page Hierarchy

### Engagement Workspace
```
Engagement
├── Overview
├── Quotes
├── Orders
├── Fulfillment
├── Financial
├── Documents
├── Activity
└── Intelligence
```

### Sales Order Workspace
```
SO
├── Overview
├── Lines
├── Fulfillment
├── Shipments
├── Financial
└── Activity
```

### Shipment Workspace
```
Shipment
├── Overview
├── Timeline
├── Execution
├── Documents
├── Exceptions
├── Financial
└── Activity
```

---

## 4. Component Hierarchy

```
AppShell
├── GlobalNav
│   ├── WorkspaceSelector
│   ├── NavGroup
│   │   └── NavItem
│   └── NavBadge
├── TopBar
│   ├── GlobalSearch
│   ├── NotificationCenter
│   ├── TenantContext
│   └── AccountMenu
├── WorkspaceHeader
│   ├── Breadcrumbs
│   ├── Title + Status
│   └── CommandBar
└── WorkspaceContent
    ├── TabNav
    └── TabContent
```

---

## 5. State Model

| Object | States |
|--------|--------|
| Engagement | CREATED → ACTIVE → COMPLETED / CLOSED |
| Quote | DRAFT → SENT → APPROVED / REJECTED → CONVERTED |
| Sales Order | DRAFT → CONFIRMED → IN_FULFILLMENT → PARTIALLY_FULFILLED → FULFILLED → CLOSED / CANCELLED |
| Fulfillment | PLANNED → ACTIVE → PARTIALLY_FULFILLED → FULFILLED / CANCELLED |
| Invoice | DRAFT → SENT → ACCEPTED → PAID / OVERDUE |
| Payment | PENDING → CONFIRMED → ALLOCATED → COMPLETED / CANCELLED / REVERSED |

---

**END OF INFORMATION ARCHITECTURE**
