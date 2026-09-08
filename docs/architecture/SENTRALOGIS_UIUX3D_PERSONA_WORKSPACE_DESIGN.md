# SENTRALOGIS — UI/UX-3D
# PERSONA WORKSPACE DESIGN

**Date:** 2026-09-01  

---

## 1. UX Architecture

### Core Principle

> **PERSONA → WORK → CONTEXT → INTELLIGENCE → ACTION**

The application is an **operating environment**, not a collection of CRUD modules.

### Experience Layers

```
LAYER 1: INTELLIGENCE
   Cross-domain visibility, exceptions, margin

LAYER 2: COMMERCIAL
   Customer → Engagement → Order → Commitment

LAYER 3: FULFILLMENT
   Composition → Allocation → Handoff

LAYER 4: EXECUTION
   Operations → Shipment → Delivery

LAYER 5: FINANCIAL
   Charges → Invoice → Payment → Settlement
```

---

## 2. Persona Model

| Persona | Primary Concern | Workspace |
|---------|----------------|-----------|
| Commercial / Sales | Customers, Quotes, Orders, Margin | Commercial |
| Customer Success | Customer health, Orders, Exceptions | Customer Success |
| Operations | Work queue, Execution, Shipments | Operations |
| Finance | Invoices, AR/AP, Payments | Finance |
| Control Tower | Cross-domain visibility, Exceptions | Intelligence |
| Customer | Order tracking, Documents | Customer Portal |
| Vendor / Partner | Assignments, Jobs, POD | Partner Portal |
| Driver / Field | Tasks, Route, POD | Driver Portal |
| Admin | Users, Roles, Configuration | Administration |

---

## 3. Workspace Model

### Commercial Workspace

```
COMMERCIAL
├── My Work
│   ├── Pending approvals
│   ├── Active quotes
│   ├── Recent orders
│   └── Price overrides
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

### Customer Success Workspace

```
CUSTOMER SUCCESS
├── My Work
│   ├── Customer exceptions
│   ├── SLA risks
│   └── Pending communications
├── Customer Portfolio
│   ├── Active customers
│   ├── Health scores
│   └── Engagement status
├── Orders
│   ├── Active orders
│   ├── Fulfillment status
│   └── Delivery tracking
├── Exceptions
│   ├── Operational
│   ├── Financial
│   └── SLA
└── Communications
    ├── Messages
    ├── Notifications
    └── Documents
```

### Operations Workspace

```
OPERATIONS
├── My Work
│   ├── Assigned jobs
│   ├── Pending tasks
│   └── Exceptions
├── Work Queue
│   ├── Cross-SBU
│   ├── Filterable
│   └── Prioritized
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

### Finance Workspace

```
FINANCE
├── My Work
│   ├── Pending approvals
│   ├── Overdue invoices
│   └── Reconciliation exceptions
├── Invoices
│   ├── Customer
│   └── Vendor
├── AR / Receivables
│   ├── Aging
│   ├── Outstanding
│   └── Collections
├── AP / Payables
│   ├── Cost audit
│   ├── Approved
│   └── Paid
├── Payments
│   ├── Record
│   ├── Allocate
│   └── Reconcile
├── Settlements
│   ├── Allocation
│   └── Status
└── Reconciliation
    ├── Matching
    ├── Exceptions
    └── History
```

### Control Tower

```
CONTROL TOWER
├── Operational Health
│   ├── Shipments in transit
│   ├── Delays
│   └── SLA compliance
├── Financial Health
│   ├── Revenue
│   ├── Margin
│   └── Exposure
├── Exceptions
│   ├── Critical
│   ├── Warning
│   └── Info
└── Intelligence
    ├── Customer risk
    ├── Vendor performance
    └── Operational trends
```

### Customer Portal

```
CUSTOMER PORTAL
├── My Orders
│   ├── Active
│   ├── Completed
│   └── Cancelled
├── Shipments
│   ├── Tracking
│   ├── Timeline
│   └── Documents
├── Financial
│   ├── Invoices
│   ├── Payments
│   └── Statements
└── Support
    ├── Messages
    ├── Documents
    └── Requests
```

### Vendor Portal

```
VENDOR PORTAL
├── Assignments
│   ├── Active
│   ├── Pending
│   └── Completed
├── Jobs
│   ├── Current
│   ├── History
│   └── POD
├── Documents
│   ├── Upload
│   ├── Verify
│   └── History
└── Performance
    ├── Metrics
    ├── Score
    └── Feedback
```

---

## 4. Navigation Model

### Global Navigation (always available)

| Element | Purpose |
|---------|---------|
| Command Center | Search + commands |
| Workspace Switcher | Switch persona context |
| Notifications | Alerts + exceptions |
| Copilot | AI assistant |
| Account | Profile + settings |

### Work Navigation (dynamic)

| Element | Purpose |
|---------|---------|
| My Work | Personalized work aggregation |
| Approvals | Pending approvals |
| Exceptions | Items needing attention |
| Tasks | Assigned tasks |

### Context Navigation (entity-specific)

| Element | Purpose |
|---------|---------|
| Overview | Summary |
| Timeline | Chronological events |
| Documents | Related files |
| Financial | Charges, invoices, payments |
| Activity | Audit trail |

---

## 5. Entity Context Model

When a user opens a business entity, they enter a **Context Workspace**.

### Sales Order Context

```
SO-2026-000125

Header:
├── Customer: BYD Indonesia
├── Status: CONFIRMED
├── Value: $17,500
├── Margin: 20%
└── Fulfillment: IN_PROGRESS

Tabs:
├── Overview
├── Lines (SO line items)
├── Fulfillment (plans, allocations)
├── Shipments (tracking, milestones)
├── Operations (execution status)
├── Financial (charges, invoices, payments)
├── Documents (contracts, BL, etc.)
├── Timeline (events, amendments)
└── Activity (audit trail)
```

### Shipment Context

```
SHP-2026-00125

Header:
├── Route: Shanghai → Subang
├── Status: IN_TRANSIT
├── ETA: 15 Sep 2026
└── Mode: FCL

Tabs:
├── Overview
├── Timeline (milestones)
├── Execution (legs, resources)
├── Documents (MBL, HBL, etc.)
├── Exceptions (delays, issues)
├── Financial (charges, margin)
└── Activity (audit trail)
```

---

## 6. Customer Workspace

### Visibility Rules

| Data | Visible | Boundary |
|------|---------|----------|
| Own orders | YES | Customer ID |
| Own shipments | YES | Customer ID |
| Tracking | YES | Token |
| Documents | YES | Customer-scoped |
| Invoices | YES | Customer-scoped |
| Margins | NEVER | Internal |
| Internal notes | NEVER | Staff-only |

### Entry Points

| Point | Route |
|-------|-------|
| Order list | `/portal/orders` |
| Tracking | `/track/[token]` |
| Documents | `/portal/documents` |
| Support | `/portal/support` |

---

## 7. Vendor Workspace

### Visibility Rules

| Data | Visible | Boundary |
|------|---------|----------|
| Assignments | YES | Vendor ID |
| Jobs | YES | Vendor ID |
| Shipments | YES | Vendor ID |
| Documents | YES | Vendor-scoped |
| POD | YES | Operational |
| Performance | YES | Vendor-scoped |
| Internal costs | NEVER | Internal |
| Other vendors | NEVER | RLS |

---

## 8. Mobile Model

### Mobile-First Workflows

| Priority | Workflow |
|----------|----------|
| HIGH | Command + Search |
| HIGH | My Work |
| HIGH | Shipment tracking |
| HIGH | Exception handling |
| HIGH | Approve override |
| MEDIUM | Order creation |
| MEDIUM | Invoice review |
| LOW | Pricing management |

### Mobile Navigation

```
┌─────────────────────────┐
│  ⌘ Search    🔔  👤     │
├─────────────────────────┤
│                         │
│  CONTENT                │
│                         │
├─────────────────────────┤
│  🏠  📦  ⚠️  💬  👤    │
│ Work Queue Notif Chat Me │
└─────────────────────────┘
```

---

## 9. Accessibility

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | Tab order, shortcuts |
| Screen readers | ARIA labels, semantic HTML |
| Focus states | Visible focus ring |
| Contrast | WCAG AA minimum |
| Reduced motion | `prefers-reduced-motion` |
| Touch targets | Min 44x44px |

---

**END OF PERSONA WORKSPACE DESIGN**
