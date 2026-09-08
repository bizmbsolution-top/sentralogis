# SENTRALOGIS — UI/UX-4 DESIGN
# EXTERNAL EXPERIENCE DESIGN

**Date:** 2026-09-02  

---

## 1. Customer Portal

### Entry Point

`/portal/customer`

### Mental Model

```
My Orders → Fulfillment → Shipments → Milestones → Documents → Exceptions
```

### Key Screens

#### Order List

```
MY ORDERS

┌─────────────────────────────────────────────────────────┐
│ SO-2026-000123                                          │
│ BYD Indonesia | Confirmed | $17,500                     │
│ Fulfillment: 60% complete                              │
│ [View Details]                                          │
└─────────────────────────────────────────────────────────┘
```

#### Order Detail

```
SO-2026-000123

Status: CONFIRMED
Value: $17,500

FULFILLMENT PROGRESS
████████████████████░░░░░░░░░░ 60%

SHIPMENTS
├── SHP-001: Shanghai → Subance (In Transit)
└── SHP-002: Shenzhen → Jakarta (Pending)

DOCUMENTS
├── Invoice INV-001
├── Bill of Lading MBL-001
└── Customs Declaration CUS-001

EXCEPTIONS
└── None

[Download Invoice] [Track Shipment] [Contact Support]
```

#### Shipment Tracking

```
SHP-2026-00125

Route: Shanghai → Subang
Status: IN_TRANSIT
ETA: 15 Sep 2026

TIMELINE
●─────●─────●─────●─────●─────●
|     |     |     |     |     |
Created Booked Departed Arrived Delivery

MILESTONES
✓ Container loaded
✓ Vessel departed Singapore
○ Vessel arrived Jakarta
○ Customs clearance
○ Delivery to Subang

DOCUMENTS AVAILABLE
├── MBL
├── HBL
├── Invoice
└── Packing List
```

---

## 2. Partner / Vendor Portal

### Entry Point

`/portal/partner`

### Mental Model

```
My Assignments → Execute → Submit Evidence → Complete
```

### Key Screens

#### Assignment List

```
MY ASSIGNMENTS

┌─────────────────────────────────────────────────────────┐
│ JO-001 | Trucking | Pickup: Port of Tanjung Priok      │
│ Delivery: BYD Subang | Status: ASSIGNED                 │
│ [View Details] [Update Status] [Upload POD]             │
└─────────────────────────────────────────────────────────┘
```

#### Job Detail

```
JO-001

Type: TRUCKING
Status: ASSIGNED
Pickup: Port of Tanjung Priok
Delivery: BYD Subang
Scheduled: 15 Sep 2026

ACTIONS
[Accept] [Reject] [Start Execution] [Upload POD] [Report Exception]
```

#### POD Upload

```
UPLOAD PROOF OF DELIVERY

Photo: [Take Photo / Choose from Gallery]
Notes: [Optional notes]
Signature: [Capture Signature]

[Submit POD]
```

---

## 3. ERP-Integrated Experience

### Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| ERP badge | Order originated from ERP |
| Sync icon | Data synchronized with ERP |
| Locked field | Owned by ERP, not editable |

### Order Detail (ERP-Originated)

```
SO-2026-000123

[ERP] ERP Reference: ERP-SO-789456
     ERP Customer: CUST-00123

SENTRALOGIS FULFILLMENT
Status: ACTIVE
Progress: 60%

SHIPMENTS
├── SHP-001: In Transit
└── SHP-002: Pending

[View in ERP] [View SENTRALOGIS Details]
```

### Customer Detail (ERP-Originated)

```
BYD Indonesia

[ERP] ERP Customer Code: CUST-00123
     Master Data: Synced from ERP

SENTRALOGIS HISTORY
├── 5 Orders
├── 12 Shipments
└── 2 Open Exceptions

[View in ERP] [View SENTRALOGIS History]
```

---

**END OF EXTERNAL EXPERIENCE DESIGN**
