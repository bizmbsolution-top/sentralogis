# SENTRALOGIS — UI/UX-4 DESIGN
# INFORMATION ARCHITECTURE

**Date:** 2026-09-02  

---

## 1. Global Navigation

### 1.1 Primary Navigation

| # | Item | Icon | Route | Permission |
|---|------|------|-------|------------|
| 1 | Command Center | layout-dashboard | `/command-center` | All |
| 2 | Work | briefcase | `/work` | All |
| 3 | Orders | file-text | `/orders` | commercial:read |
| 4 | Fulfillment | layers | `/fulfillment` | commercial:read |
| 5 | Shipments | truck | `/shipments` | shipment:read |
| 6 | Execution | play | `/execution` | job_order:read |
| 7 | Exceptions | alert-triangle | `/exceptions` | All |
| 8 | Customers | users | `/customers` | commercial:read |
| 9 | Finance | dollar-sign | `/finance` | finance:read |
| 10 | Intelligence | bar-chart-2 | `/intelligence` | intelligence:read |
| 11 | Copilot | sparkles | `/copilot` | All |
| 12 | Administration | settings | `/admin` | tenant:manage |

### 1.2 Role-Aware Visibility

| Role | Visible Navigation |
|------|-------------------|
| Super Admin | All + Token Economics |
| Central Admin | All except Token Economics |
| SBU Admin | Work, Execution, Shipments, Exceptions |
| Operations | Work, Execution, Shipments, Exceptions, Copilot |
| CS | Work, Orders, Fulfillment, Customers, Exceptions |
| Finance | Work, Orders, Finance, Intelligence |
| Customer | Customer Portal only |
| Vendor | Partner Portal only |

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

### 2.5 Customer Workspace

```
Overview | Engagements | Orders | Shipments | Documents | Financial | Activity
```

---

## 3. Object Hierarchy

```
Work
├── My Tasks
├── Pending Approvals
├── Assigned to Me
└── Recent Activity

Orders
├── Sales Orders (list, detail, create)
├── Quotes (list, detail, create)
└── Engagements (list, detail)

Fulfillment
├── Fulfillments (list, detail, create)
├── Allocations (by service)
└── Plans (versioned)

Shipments
├── All Shipments (list, detail)
├── By Service (forwarding, trucking, customs, warehouse)
└── Tracking (public)

Execution
├── Work Orders (list, detail)
├── Job Orders (list, detail)
└── Assignments (active, history)

Exceptions
├── Open (critical, warning, info)
├── By Owner
├── By SLA
└── Resolved

Customers
├── Directory
└── 360 View

Finance
├── Invoices (customer, vendor)
├── Receivables (aging)
├── Payments
├── Settlements
└── Reconciliation

Intelligence
├── Visibility (operational, commercial, financial)
├── Risk (customer, vendor, operational)
├── Analytics (performance, trends)
└── Reports

Copilot
├── Chat
├── Recommendations
└── Actions

Administration
├── Users
├── Roles
├── Tenants
├── Settings
└── Token Economics
```

---

## 4. Breadcrumb Convention

```
Home > Orders > Sales Orders > SO-2026-000123 > Fulfillment > FL-2026-00001
```

---

## 5. Global Search

Search across authorized:
- Customers
- Engagements
- Sales Orders
- Quotes
- Fulfillments
- Shipments
- Work Orders
- Job Orders
- Invoices
- Exceptions

---

## 6. Command/Search Palette

Keyboard shortcut: ⌘K / Ctrl+K

Supports:
- Entity search
- Action discovery
- Navigation
- Copilot invocation

---

**END OF INFORMATION ARCHITECTURE**
