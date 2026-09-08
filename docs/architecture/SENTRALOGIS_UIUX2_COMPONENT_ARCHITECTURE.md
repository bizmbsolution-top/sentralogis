# SENTRALOGIS — UI/UX-2
# COMPONENT ARCHITECTURE

**Date:** 2026-09-01  

---

## 1. Component Hierarchy

```
AppShell
├── GlobalNav (sidebar)
│   ├── NavGroup (Commercial, Operations, etc.)
│   │   └── NavItem (Engagements, Quotes, etc.)
│   └── NavBadge (count indicators)
│
├── TopBar
│   ├── GlobalSearch
│   ├── NotificationCenter
│   ├── TenantSwitcher
│   └── UserMenu
│
├── WorkspaceHeader
│   ├── Breadcrumbs
│   ├── Title + Status
│   └── CommandBar
│
└── WorkspaceContent
    ├── TabNav
    └── TabContent
```

---

## 2. Reusable Components

### 2.1 Foundation

| Component | Purpose |
|-----------|---------|
| `Button` | Primary, secondary, danger, ghost |
| `Input` | Text, number, date, search |
| `Select` | Single, multi, async |
| `Badge` | Status, type, capability |
| `Card` | Container with header/content |
| `Table` | Sortable, filterable, paginated |
| `Dialog` | Modal, drawer, confirm |
| `Tabs` | Horizontal, vertical |
| `Skeleton` | Loading placeholder |
| `EmptyState` | No data + action |
| `ErrorState` | Error message + retry |

### 2.2 Domain-Specific

| Component | Domain | Purpose |
|-----------|--------|---------|
| `EngagementHeader` | Commercial | Customer + status summary |
| `SOHeader` | Commercial | SO number + status |
| `SOLineTable` | Commercial | Line items with pricing |
| `PricingSummary` | Commercial | BUY/SELL/Margin |
| `FulfillmentProgress` | Fulfillment | Allocation progress |
| `ShipmentTimeline` | Operations | Milestone journey |
| `ExecutionHealthBar` | Operations | 5-stage status |
| `InvoiceLines` | Financial | Invoice line items |
| `PaymentAllocations` | Financial | Payment-to-invoice |
| `MarginIndicator` | Intelligence | Margin % with color |

---

## 3. Component Composition

### 3.1 Commercial Workspace

```
CommercialWorkspace
├── EngagementHeader
│   ├── CustomerInfo
│   ├── StatusBadge
│   └── QuickActions
│
├── TabNav
│   └── TabContent
│       ├── OverviewTab
│       │   ├── CommercialSummary (cards)
│       │   ├── FinancialExposure (cards)
│       │   └── OperationalStatus (cards)
│       │
│       ├── QuotesTab
│       │   └── QuoteTable
│       │
│       ├── OrdersTab
│       │   └── SOTable
│       │
│       └── FulfillmentTab
│           └── FulfillmentCard
```

### 3.2 Sales Order Workspace

```
SalesOrderWorkspace
├── SOHeader
│   ├── SONumber
│   ├── CustomerLink
│   ├── StatusBadge
│   └── VersionBadge
│
├── TabNav
│   └── TabContent
│       ├── OverviewTab
│       │   ├── OrderSummary
│       │   ├── SOLineSummary
│       │   └── FinancialSummary
│       │
│       ├── LinesTab
│       │   └── SOLineTable
│       │       ├── CapabilityBadge
│       │       ├── QuantityInput
│       │       ├── UOMSelect
│       │       ├── PriceInput
│       │       └── MarginIndicator
│       │
│       └── FulfillmentTab
│           └── FulfillmentProgress
```

---

## 4. Data Flow

### 4.1 Read Path

```
UI Component
    ↓
Server Action / API Route
    ↓
Domain Service
    ↓
Repository
    ↓
Database (RLS)
```

### 4.2 Write Path

```
UI Component (form/action)
    ↓
Server Action / API Route
    ↓
IdentityContext + Authorization
    ↓
Domain Service (validation)
    ↓
Repository (transaction)
    ↓
Database (RLS)
```

---

## 5. State Management

| Layer | Responsibility |
|-------|----------------|
| Server | Authoritative state |
| API | Transport + authorization |
| Service | Domain rules |
| UI | Presentation + local UI state |

---

**END OF COMPONENT ARCHITECTURE**
