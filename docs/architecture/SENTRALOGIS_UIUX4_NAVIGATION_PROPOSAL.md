# SENTRALOGIS — PHASE UI/UX-4
# NAVIGATION PROPOSAL

**Date:** 2026-09-02  

---

## 1. Primary Navigation

### 1.1 Top-Level Items

| # | Item | Icon | Route | Permission |
|---|------|------|-------|------------|
| 1 | Command Center | `layout-dashboard` | `/command-center` | All |
| 2 | Work | `briefcase` | `/work` | All |
| 3 | Orders | `file-text` | `/orders` | commercial:read |
| 4 | Fulfillment | `layers` | `/fulfillment` | commercial:read |
| 5 | Shipments | `truck` | `/shipments` | shipment:read |
| 6 | Execution | `play` | `/execution` | job_order:read |
| 7 | Exceptions | `alert-triangle` | `/exceptions` | All |
| 8 | Customers | `users` | `/customers` | commercial:read |
| 9 | Finance | `dollar-sign` | `/finance` | finance:read |
| 10 | Intelligence | `bar-chart-2` | `/intelligence` | intelligence:read |
| 11 | Copilot | `sparkles` | `/copilot` | All |
| 12 | Administration | `settings` | `/admin` | tenant:manage |

### 1.2 Navigation Hierarchy

```
COMMAND CENTER
├── My Work Queue
├── Attention Items
├── Exceptions
├── Exposure Summary
└── Copilot Recommendations

WORK
├── My Tasks
├── Pending Approvals
├── Assigned to Me
└── Recent Activity

ORDERS
├── Sales Orders
│   ├── List
│   ├── Detail
│   └── Create
├── Quotes
│   ├── List
│   ├── Detail
│   └── Create
└── Engagements
    ├── List
    └── Detail

FULFILLMENT
├── Fulfillments
│   ├── List
│   ├── Detail
│   └── Create
├── Allocations
│   └── By Service
└── Plans
    └── Versioned

SHIPMENTS
├── All Shipments
│   ├── List
│   └── Detail
├── By Service
│   ├── Forwarding
│   ├── Trucking
│   ├── Customs
│   └── Warehouse
└── Tracking
    └── Public

EXECUTION
├── Work Orders
│   ├── List
│   └── Detail
├── Job Orders
│   ├── List
│   └── Detail
└── Assignments
    ├── Active
    └── History

EXCEPTIONS
├── Open
│   ├── Critical
│   ├── Warning
│   └── Info
├── By Owner
├── By SLA
└── Resolved

CUSTOMERS
├── Directory
├── 360 View
└── Orders

FINANCE
├── Invoices
│   ├── Customer
│   └── Vendor
├── Receivables
├── Payments
├── Settlements
└── Reconciliation

INTELLIGENCE
├── Visibility
│   ├── Operational
│   ├── Commercial
│   └── Financial
├── Risk
│   ├── Customer
│   ├── Vendor
│   └── Operational
├── Analytics
│   ├── Performance
│   └── Trends
└── Reports

COPILOT
├── Chat
├── Recommendations
└── Actions

ADMINISTRATION
├── Users
├── Roles
├── Tenants
├── Settings
└── Token Economics
```

---

## 2. Contextual Navigation

### 2.1 Sales Order Detail

```
Overview | Lines | Fulfillment | Shipments | Financial | Documents | Timeline | Activity
```

### 2.2 Shipment Detail

```
Overview | Units | Legs | Services | Milestones | Documents | Exceptions | Financial | Activity
```

### 2.3 Fulfillment Detail

```
Overview | Allocations | Plans | Shipments | Exceptions | Activity
```

### 2.4 Exception Detail

```
Overview | Impact | Root Cause | Recommended Action | Resolution | Audit
```

---

## 3. Mobile Navigation

### 3.1 Bottom Navigation

```
Work | Orders | Exceptions | Copilot | Account
```

### 3.2 Mobile-First Workflows

| Workflow | Screens |
|----------|---------|
| Assignment | List → Detail → Accept/Reject |
| Execution | Job List → Job Detail → Update Status → Complete |
| Exception | List → Detail → Resolve |
| Approval | List → Detail → Approve/Reject |
| POD | Job → Upload Photo → Submit |

---

## 4. Workspace Navigation

### 4.1 Sidebar Behavior

- Collapsible to icon-only mode
- Workspace-aware (shows relevant sections)
- Quick search (⌘K)
- Recent items

### 4.2 Breadcrumbs

```
Home > Orders > Sales Orders > SO-2026-000123 > Fulfillment > FL-2026-00001
```

---

## 5. Command Center Navigation

### 5.1 Dashboard Cards

| Card | Drill-Down |
|------|------------|
| My Work | Work → My Queue |
| Attention | Exceptions → Open |
| Exposure | Finance → Receivables |
| Operations | Shipments → In Transit |
| Customers | Intelligence → Customer Risk |
| Copilot | Copilot → Recommendations |

---

**END OF NAVIGATION PROPOSAL**
