# SENTRALOGIS — UI/UX-4 DESIGN
# SCREEN SPECIFICATION

**Date:** 2026-09-02  

---

## 1. Command Center

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  COMMAND CENTER                                         │
├─────────────────────────────────────────────────────────┤
│  CRITICAL (Red)                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🚨 Shipment SHP-001 delayed 26h                 │   │
│  │    Customer: BYD | Owner: Ops | [View] [Act]   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  NEEDS ACTION (Amber)                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚡ 7 assignments pending                         │   │
│  │    3 approvals | 2 documents | 2 exceptions     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  AT RISK (Blue)                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️ 4 SLA risks | 3 customer-impacting          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  OPERATIONAL PULSE (Slate)                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ Active    │ │ Today's   │ │ Execution │            │
│  │ Shipments │ │ Completions│ │ Load      │            │
│  │ 24        │ │ 8         │ │ 67%       │            │
│  └───────────┘ └───────────┘ └───────────┘            │
│                                                         │
│  COPILOT RECOMMENDATIONS                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🤖 "3 shipments at risk. View recommended       │   │
│  │    actions."                                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Interactions

| Action | Result |
|--------|--------|
| Click attention item | Navigate to detail |
| Click metric | Navigate to filtered list |
| Click recommendation | Execute Copilot action |
| Dismiss item | Temporarily hide (session) |

---

## 2. Order List

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ORDERS                                    [+ New Order]│
├─────────────────────────────────────────────────────────┤
│  [Search...] [Status ▼] [Customer ▼] [Date ▼]         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ SO-2026-000123                                  │   │
│  │ BYD Indonesia | Confirmed | $17,500             │   │
│  │ Fulfillment: 60% complete                      │   │
│  │ [View]                                          │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ SO-2026-000124                                  │   │
│  │ Tesla Shanghai | Confirmed | $25,000            │   │
│  │ Fulfillment: 100% complete                     │   │
│  │ [View]                                          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Filters

- Status (DRAFT, CONFIRMED, FULFILLED, CANCELLED)
- Customer
- Date Range
- Value Range
- Owner

---

## 3. Order Detail

### Layout

```
SO-2026-000123
Customer: BYD Indonesia
Status: CONFIRMED
Value: $17,500

[Overview] [Lines] [Fulfillment] [Shipments] [Financial] [Documents] [Timeline] [Activity]

OVERVIEW
┌─────────────────────────────────────────────────────────┐
│  ORDER SUMMARY                                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ Customer  │ │ Status    │ │ Value     │            │
│  │ BYD       │ │ CONFIRMED │ │ $17,500   │            │
│  └───────────┘ └───────────┘ └───────────┘            │
│                                                         │
│  COMMERCIAL STATUS          │  FULFILLMENT STATUS       │
│  Order Date: 01 Sep         │  Progress: 60%           │
│  Target: 15 Sep             │  2/4 services complete   │
│  Payment: 30 days           │  1 in progress           │
│                             │  1 pending               │
│                             │                          │
│  ACTIONS                    │  [View Fulfillment]      │
│  [Create Fulfillment]       │  [View Shipments]        │
│  [Amend] [Cancel]           │                          │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Shipment Detail

### Layout

```
SHP-2026-00125
Route: Shanghai → Subang
Status: IN_TRANSIT
ETA: 15 Sep 2026

[Overview] [Units] [Legs] [Services] [Milestones] [Documents] [Exceptions] [Financial] [Activity]

OVERVIEW
┌─────────────────────────────────────────────────────────┐
│  SHIPMENT SUMMARY                                       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ Route     │ │ Status    │ │ ETA       │            │
│  │ SHA→SUB   │ │ IN_TRANSIT│ │ 15 Sep    │            │
│  └───────────┘ └───────────┘ └───────────┘            │
│                                                         │
│  EXECUTION LEGS          │  SERVICES                    │
│  ┌────────────────────┐ │  ┌────────────────────┐     │
│  │ SEA: SHA→SIN  ✓   │ │  │ Forwarding   ✓     │     │
│  │ SEA: SIN→JKT  ▶   │ │  │ Customs      ▶     │     │
│  │ LAND: JKT→SUB  ○   │ │  │ Trucking     ○     │     │
│  └────────────────────┘ │  │ Warehouse    ○     │     │
│                          │  └────────────────────┘     │
│  ACTIONS                 │                              │
│  [Update Status] [Add Leg] [View Documents] [Assign]    │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Exception Center

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  EXCEPTIONS                                             │
├─────────────────────────────────────────────────────────┤
│  [All] [Critical] [Warning] [Info]                      │
│  [Search...] [Type ▼] [Owner ▼] [SLA ▼]               │
│                                                         │
│  CRITICAL                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🚨 Shipment SHP-001 delayed 26h                 │   │
│  │    Customer: BYD | Owner: Ops | SLA: 24h       │   │
│  │    [View] [Assign] [Resolve]                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  WARNING                                                │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚠️ Document missing for SO-002                  │   │
│  │    Customer: Tesla | Owner: CS | SLA: 48h      │   │
│  │    [View] [Request] [Resolve]                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Customer Workspace

### Layout

```
BYD Indonesia

[Overview] [Engagements] [Orders] [Shipments] [Documents] [Financial] [Activity]

OVERVIEW
┌─────────────────────────────────────────────────────────┐
│  CUSTOMER SUMMARY                                       │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ Orders    │ │ Shipments │ │ Open      │            │
│  │ 12        │ │ 24        │ │ Exceptions│            │
│  │           │ │           │ │ 2         │            │
│  └───────────┘ └───────────┘ └───────────┘            │
│                                                         │
│  RECENT ACTIVITY                                        │
│  • SO-001 confirmed (01 Sep)                            │
│  • SHP-001 in transit (02 Sep)                          │
│  • Exception resolved (01 Sep)                          │
│                                                         │
│  ACTIONS                                                │
│  [Create Order] [View Shipments] [View Exceptions]      │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Financial Workspace

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  FINANCE                                                │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Invoices] [Receivables] [Payments] [Settlements]│
│                                                         │
│  OVERVIEW                                               │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐            │
│  │ Invoiced  │ │ Received  │ │ Overdue   │            │
│  │ $125,000  │ │ $98,000   │ │ $27,000   │            │
│  └───────────┘ └───────────┘ └───────────┘            │
│                                                         │
│  RECEIVABLES AGING                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Current: $15,000                                 │   │
│  │ 30 days: $8,000                                  │   │
│  │ 60 days: $3,000                                  │   │
│  │ 90+ days: $1,000                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ACTIONS                                                │
│  [Create Invoice] [Record Payment] [View Aging]         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Administration

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ADMINISTRATION                                         │
├─────────────────────────────────────────────────────────┤
│  [Users] [Roles] [Tenants] [Settings] [Token Economics]│
│                                                         │
│  USERS                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Name | Email | Role | Tenant | Status           │   │
│  │ Budi Santoso | budi@sentralogis.com | Super Admin│   │
│  │ Ahmad | ahmad@sentralogis.com | Ops | ACTIVE    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [+ Add User] [Edit] [Deactivate]                       │
└─────────────────────────────────────────────────────────┘
```

---

**END OF SCREEN SPECIFICATION**
