# SENTRALOGIS — UI/UX-2
# GLOBAL NAVIGATION

**Date:** 2026-09-01  

---

## 1. Primary Navigation Structure

```
┌─────────────────────────────────────────────────────────┐
│  HOME                                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CUSTOMERS                                              │
│  ├── Customer List                                      │
│  ├── Customer 360                                       │
│  └── New Customer                                       │
│                                                         │
│  COMMERCIAL                                             │
│  ├── New Business (+)                                   │
│  ├── Engagements                                        │
│  ├── Quotes                                             │
│  ├── Sales Orders                                       │
│  └── Regular Orders                                     │
│                                                         │
│  FULFILLMENT                                            │
│  ├── Fulfillments                                       │
│  ├── Shipments                                          │
│  └── Exceptions                                         │
│                                                         │
│  OPERATIONS                                             │
│  ├── Work Queue                                         │
│  ├── Forwarding                                         │
│  ├── Customs                                            │
│  ├── Trucking                                           │
│  └── Warehouse                                          │
│                                                         │
│  PRICING                                                │
│  ├── Rate Masters                                       │
│  ├── Rate Versions                                      │
│  ├── Overrides                                          │
│  └── History                                            │
│                                                         │
│  FINANCIAL                                              │
│  ├── Overview                                           │
│  ├── Invoices                                           │
│  ├── AR / Receivables                                   │
│  ├── AP / Payables                                      │
│  ├── Payments                                           │
│  ├── Settlements                                        │
│  └── Reconciliation                                     │
│                                                         │
│  INTELLIGENCE                                           │
│  ├── Visibility                                         │
│  ├── Margin                                             │
│  ├── Profitability                                      │
│  └── Exceptions                                         │
│                                                         │
│  ADMINISTRATION                                         │
│  ├── Users                                              │
│  ├── Roles                                              │
│  ├── Tenants                                            │
│  └── Settings                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Navigation Behavior

### 2.1 Sidebar

| Behavior | Description |
|----------|-------------|
| Collapsible | Yes — icon-only mode |
| Group icons | Yes — visual distinction |
| Active state | Highlighted group + item |
| Badge counts | Work queue, exceptions |
| Role-aware | Items filtered by permission |

### 2.2 Top Bar

| Element | Purpose |
|---------|---------|
| Global search | Find orders, customers, shipments |
| Notifications | Exceptions, approvals needed |
| Tenant switcher | Multi-tenant support |
| User menu | Profile, settings, logout |

### 2.3 Breadcrumbs

```
Home > Commercial > Sales Orders > SO-2026-000123 > Fulfillment
```

---

## 3. Workspace Navigation

### 3.1 Tabs

Every workspace uses tabs for sub-views:

```
┌─────────────────────────────────────────────────────────┐
│  [Overview] [Lines] [Fulfillment] [Financial] [Activity]│
└─────────────────────────────────────────────────────────┘
```

### 3.2 Contextual Actions

Actions appear in a command bar:

```
┌─────────────────────────────────────────────────────────┐
│  [Create Fulfillment] [Amend] [Cancel] [View Pricing]  │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Quick Actions

| Action | Location | Permission |
|--------|----------|------------|
| New Business | Top of Commercial | commercial:manage |
| Create Quote | Engagement / Quotes | commercial:manage |
| Create SO | Engagement / Sales Orders | commercial:manage |
| Record Payment | Financial / Payments | financial:manage |
| Approve Override | Pricing / Overrides | pricing:approve |

---

## 5. Mobile Navigation

| Priority | Workflow |
|----------|----------|
| HIGH | Order lookup |
| HIGH | Shipment tracking |
| HIGH | Exception handling |
| MEDIUM | Approve override |
| LOW | Pricing management |

---

**END OF GLOBAL NAVIGATION**
