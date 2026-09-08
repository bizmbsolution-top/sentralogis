# SENTRALOGIS — PHASE UI/UX-4
# EXPERIENCE ARCHITECTURE

**Date:** 2026-09-02  

---

## 1. Information Architecture

### 1.1 Top-Level Navigation

```
COMMAND CENTER
WORK
ORDERS
FULFILLMENT
SHIPMENTS
EXECUTION
EXCEPTIONS
CUSTOMERS
FINANCE
INTELLIGENCE
COPILOT
ADMINISTRATION
```

### 1.2 Object Hierarchy

```
Work
├── My Work Queue
├── Pending Approvals
├── Assigned to Me
└── Recent Activity

Orders
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

Fulfillment
├── Fulfillments
│   ├── List
│   ├── Detail
│   └── Create
├── Allocations
│   └── By Service
└── Plans
    └── Versioned

Shipments
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

Execution
├── Work Orders
│   ├── List
│   └── Detail
├── Job Orders
│   ├── List
│   └── Detail
└── Assignments
    ├── Active
    └── History

Exceptions
├── Open
│   ├── Critical
│   ├── Warning
│   └── Info
├── By Owner
├── By SLA
└── Resolved

Customers
├── Directory
├── 360 View
└── Orders

Financial
├── Invoices
│   ├── Customer
│   └── Vendor
├── Receivables
├── Payments
├── Settlements
└── Reconciliation

Intelligence
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

## 2. Navigation Architecture

### 2.1 Primary Navigation

| Item | Icon | Route | Permission |
|------|------|-------|------------|
| Command Center | grid | `/command-center` | All |
| Work | briefcase | `/work` | All |
| Orders | file-text | `/orders` | commercial:read |
| Fulfillment | layers | `/fulfillment` | commercial:read |
| Shipments | truck | `/shipments` | shipment:read |
| Execution | play | `/execution` | job_order:read |
| Exceptions | alert-triangle | `/exceptions` | All |
| Customers | users | `/customers` | commercial:read |
| Finance | dollar-sign | `/finance` | finance:read |
| Intelligence | bar-chart | `/intelligence` | intelligence:read |
| Copilot | sparkles | `/copilot` | All |
| Administration | settings | `/admin` | tenant:manage |

### 2.2 Contextual Navigation

Within each business object, tabs provide contextual navigation:

**Sales Order Detail:**
```
Overview | Lines | Fulfillment | Shipments | Financial | Documents | Timeline | Activity
```

**Shipment Detail:**
```
Overview | Units | Legs | Services | Milestones | Documents | Exceptions | Financial | Activity
```

**Fulfillment Detail:**
```
Overview | Allocations | Plans | Shipments | Exceptions | Activity
```

---

## 3. Object Architecture

### 3.1 Sales Order

```
SO-2026-000123

Header:
├── Customer: BYD Indonesia
├── Engagement: ENG-2026-001
├── Status: CONFIRMED
├── Order Date: 01 Sep 2026
├── Target Delivery: 15 Sep 2026
├── Currency: USD
├── Total Value: $17,500
└── Payment Terms: 30 days

Lines:
├── 01 Ocean Freight       FORWARDING   $12,000  FULFILLED
├── 02 Customs Clearance   CLEARANCE    $2,500   IN_PROGRESS
├── 03 Trucking            TRUCKING     $2,000   PENDING
└── 04 Warehouse           WAREHOUSE    $1,000   PENDING

Actions:
├── Create Fulfillment
├── Amend
├── Cancel
└── View Financial Impact
```

### 3.2 Shipment

```
SHP-2026-00125

Header:
├── Route: Shanghai → Subang
├── Status: IN_TRANSIT
├── ETA: 15 Sep 2026
├── Mode: FCL
└── Customer: BYD

Units:
├── MSCU1234567  40HC  Seal: ABC123
└── MSCU7654321  40HC  Seal: DEF456

Legs:
├── SEA: Shanghai → Singapore    (completed)
├── SEA: Singapore → Jakarta     (in_progress)
└── LAND: Jakarta → Subang       (pending)

Services:
├── Forwarding  COMPLETE
├── Customs     IN_PROGRESS
├── Trucking    PENDING
└── Warehouse   PENDING

Milestones:
├── Created       01 Sep
├── Booked        02 Sep
├── Departed      05 Sep
├── Arrived SJ    10 Sep
├── Customs Release  12 Sep (est)
└── Delivery      15 Sep (est)
```

---

## 4. Lifecycle Architecture

### 4.1 Commercial Lifecycle

```
Engagement → Quote → Sales Order → Fulfillment → (Financial)
                ↓           ↓            ↓
           (optional)   CONFIRMED    ALLOCATED
                            ↓            ↓
                       IN_FULFILLMENT  ACTIVE
                            ↓            ↓
                       PARTIALLY_FULFILLED  PARTIALLY_FULFILLED
                            ↓            ↓
                       FULFILLED      FULFILLED
                            ↓            ↓
                       CLOSED         CLOSED
```

### 4.2 Operational Lifecycle

```
Shipment → Execution → Completion
    ↓          ↓          ↓
  DRAFT    ASSIGNED    COMPLETED
    ↓          ↓
  PLANNED  IN_PROGRESS
    ↓          ↓
  BOOKED   EXCEPTION
    ↓          ↓
  IN_TRANSIT  RESOLVED
    ↓
  DELIVERED
```

---

## 5. Persona Architecture

### 5.1 Executive

| Need | Screen |
|------|--------|
| Business health | Command Center → Overview |
| Operational risk | Command Center → Exceptions |
| Financial exposure | Command Center → Financial |
| Customer risk | Intelligence → Customer Risk |
| Strategic decisions | Intelligence → Analytics |

### 5.2 Central Operations

| Need | Screen |
|------|--------|
| Work requiring action | Work → My Queue |
| Approvals | Work → Pending Approvals |
| Cross-SBU orchestration | Operations → Dashboard |
| Exceptions | Exceptions → Open |
| SLA risk | Exceptions → By SLA |

### 5.3 SBU Operator

| Need | Screen |
|------|--------|
| Assigned work | Work → Assigned to Me |
| Execution queue | Execution → My Jobs |
| Completion | Execution → Complete |
| Evidence | Execution → Upload |
| Exceptions | Exceptions → My Exceptions |

### 5.4 Customer

| Need | Screen |
|------|--------|
| My orders | Portal → Orders |
| Order status | Portal → Order Detail |
| Shipment tracking | Portal → Tracking |
| Documents | Portal → Documents |
| Invoices | Portal → Financial |
| Support | Portal → Messages |

### 5.5 Vendor/Partner

| Need | Screen |
|------|--------|
| My assignments | Portal → Assignments |
| Execute | Portal → Job Detail |
| Upload POD | Portal → Upload |
| Exceptions | Portal → Exceptions |
| Performance | Portal → Performance |

---

## 6. Permission-Aware UX

| Action | Commercial | Operations | Finance | Customer | Vendor |
|--------|------------|------------|---------|----------|--------|
| Create Order | YES | NO | NO | NO | NO |
| View Order | YES | YES | YES | OWN ONLY | NO |
| Modify Order | YES | NO | NO | NO | NO |
| Cancel Order | YES | NO | NO | NO | NO |
| Assign Work | NO | YES | NO | NO | NO |
| Execute Work | NO | YES | NO | NO | YES |
| View Financial | YES | YES | YES | LIMITED | NO |
| Configure Token | SUPERADMIN | NO | NO | NO | NO |

---

## 7. Command Center Architecture

### 7.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  COMMAND CENTER                                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ MY WORK     │  │ ATTENTION   │  │ EXPOSURE    │     │
│  │ 12 tasks    │  │ 3 critical  │  │ $45K AR     │     │
│  │ 5 approvals │  │ 7 warnings  │  │ $28K AP     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ OPERATIONS  │  │ CUSTOMERS   │  │ EXCEPTIONS  │     │
│  │ 24 active   │  │ 3 at risk   │  │ 8 open      │     │
│  │ 12 delayed  │  │ 1 new      │  │ 2 critical  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ AI COPILOT RECOMMENDATIONS                       │   │
│  │ "3 shipments at risk. View recommended actions." │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Token UX Boundary

| Persona | Token Visibility |
|---------|-----------------|
| Super Admin | Full configuration (value, rates, rules) |
| Tenant Admin | View balance, consumption, history |
| Operations | Service consumption context |
| Management | Usage analytics |
| Customer | NOT exposed (future commercial feature) |
| Vendor | NOT exposed |

---

## 9. ERP Integration UX

| Scenario | UX Treatment |
|----------|--------------|
| ERP-originated order | Show ERP reference + SENTRALOGIS execution |
| Standalone order | Standard SENTRALOGIS workflow |
| Master data sync | ERP badge on customer/vendor |
| Financial posting | ERP reference on invoice |

---

**END OF EXPERIENCE ARCHITECTURE**
