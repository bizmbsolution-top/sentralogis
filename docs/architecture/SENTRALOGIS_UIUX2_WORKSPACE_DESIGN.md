# SENTRALOGIS — UI/UX-2
# WORKSPACE DESIGN

**Date:** 2026-09-01  

---

## 1. Engagement Workspace

### 1.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  ENGAGEMENT HEADER                                      │
│  Customer: BYD Indonesia          Status: ACTIVE         │
│  Engagement: ENG-2026-001        Created: 01 Sep 2026   │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Quotes] [Orders] [Fulfillment] [Financial]│
│  [Documents] [Activity] [Intelligence]                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TAB CONTENT                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Overview Tab

```
┌─────────────────────────────────────────────────────────┐
│  COMMERCIAL SUMMARY          │  FINANCIAL EXPOSURE      │
│  Quotes: 3                   │  Total Revenue: $120,000 │
│  Orders: 5                   │  Total Cost: $90,000     │
│  Active Fulfillments: 2      │  Expected Margin: 25%    │
│  ─────────────────────────── │  ─────────────────────── │
│  OPERATIONAL STATUS          │  OUTSTANDING             │
│  In Transit: 2               │  AR: $40,000            │
│  Pending: 1                  │  AP: $20,000            │
│  Completed: 2                │  Overdue: $5,000         │
└─────────────────────────────────────────────────────────┘
```

### 1.3 Quotes Tab

| Column | Purpose |
|--------|---------|
| Quote Number | Business identifier |
| Status | DRAFT/SENT/APPROVED/REJECTED |
| Total Value | Calculated total |
| Created | Date |
| Actions | View / Edit / Convert to SO |

### 1.4 Orders Tab

| Column | Purpose |
|--------|---------|
| SO Number | Business identifier |
| Status | DRAFT/CONFIRMED/IN_FULFILLMENT... |
| Total Value | Revenue |
| Fulfillment Status | Progress |
| Actions | View / Create Fulfillment |

---

## 2. Sales Order Workspace

### 2.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  SO HEADER                                              │
│  SO-2026-000123                  Status: CONFIRMED      │
│  Customer: BYD Indonesia         Engagement: ENG-001    │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Lines] [Fulfillment] [Financial] [Activity]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TAB CONTENT                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Overview Tab

```
┌─────────────────────────────────────────────────────────┐
│  ORDER SUMMARY                                          │
│  Order Date: 01 Sep 2026                                │
│  Target Delivery: 15 Sep 2026                           │
│  Currency: USD                                          │
│  ─────────────────────────────────────────────────────  │
│  SO LINES SUMMARY                                       │
│  01 Ocean Freight       FORWARDING   $12,000  FULFILLED │
│  02 Customs Clearance   CLEARANCE    $2,500   IN_PROGRESS│
│  03 Trucking            TRUCKING     $3,000   PENDING   │
│  ─────────────────────────────────────────────────────  │
│  TOTALS                                                 │
│  SELL TOTAL: $17,500                                    │
│  BUY TOTAL:  $14,000                                    │
│  EXPECTED MARGIN: 20%                                   │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Lines Tab

| Column | Purpose |
|--------|---------|
| # | Line sequence |
| Capability | FORWARDING/CUSTOMS/TRUCKING/WAREHOUSE |
| Service | Description |
| Qty | Quantity |
| UOM | Unit of measure |
| Currency | Transaction currency |
| BUY | Cost price |
| SELL | Selling price |
| Margin | Calculated margin |
| Status | Fulfillment status |
| Actions | Edit / View Pricing |

---

## 3. Fulfillment Workspace

### 3.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  FULFILLMENT HEADER                                     │
│  FL-2026-00001                   Status: ACTIVE         │
│  Sales Order: SO-2026-000123     Revision: 1           │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Allocations] [Shipments] [Exceptions]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TAB CONTENT                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Overview Tab

```
┌─────────────────────────────────────────────────────────┐
│  ALLOCATION PROGRESS                                    │
│  ████████████████████░░░░░░░░░░ 60%                     │
│  ─────────────────────────────────────────────────────  │
│  FORWARDING    ████████████  FULFILLED                  │
│  CUSTOMS       ████████░░░░  IN_PROGRESS                │
│  TRUCKING      ████░░░░░░░░  PENDING                   │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Financial Workspace

### 4.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  FINANCIAL HEADER                                       │
│  SO-2026-000123                  Status: INVOICED       │
│  Customer: BYD Indonesia         Total: $17,500         │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Invoices] [Payments] [Settlements]         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TAB CONTENT                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Overview Tab

```
┌─────────────────────────────────────────────────────────┐
│  FINANCIAL SUMMARY                                      │
│  ─────────────────────────────────────────────────────  │
│  TOTAL REVENUE:     $17,500                              │
│  TOTAL COST:        $14,000                              │
│  GROSS MARGIN:      $3,500 (20%)                        │
│  ─────────────────────────────────────────────────────  │
│  INVOICED:          $12,000                              │
│  PAID:              $8,000                               │
│  OUTSTANDING AR:    $4,000                               │
│  OVERDUE:           $1,000                               │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Intelligence Workspace

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  INTELLIGENCE HEADER                                    │
│  Scope: [All Customers ▼]        Period: [Last 30 days] │
├─────────────────────────────────────────────────────────┤
│  [Visibility] [Margin] [Profitability] [Exceptions]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TAB CONTENT                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**END OF WORKSPACE DESIGN**
