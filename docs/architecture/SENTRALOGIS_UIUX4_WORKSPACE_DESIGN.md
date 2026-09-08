# SENTRALOGIS — UI/UX-4 DESIGN
# WORKSPACE DESIGN

**Date:** 2026-09-02  

---

## 1. Order Workspace

### Header

```
SO-2026-000123
Customer: BYD Indonesia
Status: CONFIRMED
Value: $17,500
```

### Tabs

```
Overview | Lines | Fulfillment | Shipments | Financial | Documents | Timeline | Activity
```

### Overview Tab

```
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

### Lines Tab

| # | Capability | Service | Qty | UOM | Unit Price | Total | Status |
|---|------------|---------|-----|-----|------------|-------|--------|
| 1 | FORWARDING | Ocean Freight | 10 | CONTAINER | $1,200 | $12,000 | FULFILLED |
| 2 | CUSTOMS | Customs Clearance | 1 | DECLARATION | $2,500 | $2,500 | IN_PROGRESS |
| 3 | TRUCKING | Trucking | 10 | TRIP | $200 | $2,000 | PENDING |
| 4 | WAREHOUSE | Warehouse Inbound | 10 | PALLET | $100 | $1,000 | PENDING |

---

## 2. Fulfillment Workspace

### Header

```
FL-2026-00001
Sales Order: SO-2026-000123
Status: ACTIVE
Revision: 1
```

### Tabs

```
Overview | Allocations | Plans | Shipments | Exceptions | Activity
```

### Overview Tab

```
┌─────────────────────────────────────────────────────────┐
│  FULFILLMENT PROGRESS                                  │
│  ████████████████████░░░░░░░░░░ 60%                     │
│                                                         │
│  ALLOCATIONS                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ FORWARDING    ████████████  FULFILLED           │   │
│  │ CUSTOMS       ████████░░░░  IN_PROGRESS         │   │
│  │ TRUCKING      ░░░░░░░░░░░░  PENDING             │   │
│  │ WAREHOUSE     ░░░░░░░░░░░░  PENDING             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ACTIONS                                                │
│  [Add Allocation] [Update Progress] [Cancel]            │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Shipment Workspace

### Header

```
SHP-2026-00125
Route: Shanghai → Subang
Status: IN_TRANSIT
ETA: 15 Sep 2026
Mode: FCL
```

### Tabs

```
Overview | Units | Legs | Services | Milestones | Documents | Exceptions | Financial | Activity
```

### Overview Tab

```
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

### Timeline Visualization

```
●─────●─────●─────●─────●─────●
|     |     |     |     |     |
Created Booked Departed Arrived Delivery
       (SHA)  (SHA)  (JKT)  (SUB)
              ↓
         CURRENT
```

---

## 4. Execution Workspace

### Work Order Detail

```
WO-CC-RAS-0826-001
Customer: BYD Indonesia
Status: IN_PROGRESS
PIC: Budi Santoso
```

### Job Order Detail

```
JO-CC-RAS-0826-001-01
Type: TRUCKING
Driver: Ahmad
Vehicle: B 1234 CD
Status: ASSIGNED
```

### Actions

```
[Assign Driver] [Update Status] [Upload POD] [Report Exception] [Complete]
```

---

**END OF WORKSPACE DESIGN**
