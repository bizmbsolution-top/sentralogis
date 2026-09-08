# SENTRALOGIS — UI/UX-3G
# COMMERCIAL WORKFLOW DESIGN

**Date:** 2026-09-01  

---

## 1. Engagement UX

### Purpose
Commercial relationship/context root.

### States
```
CREATED → ACTIVE → COMPLETED
            ↓
         CLOSED
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Customer, Status, Commercial context |
| Tabs | Overview, Quotes, Orders, Fulfillment, Financial, Documents, Activity |
| Actions | Create Quote, Create Direct Order, Create Regular Order, Close |

### Information Hierarchy
1. Customer + Status
2. Active Quotes / Orders
3. Commercial value exposure
4. Timeline

---

## 2. Quote UX

### Purpose
Optional commercial proposal.

### States
```
DRAFT → SENT → APPROVED → CONVERTED
          ↓
       REJECTED
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Quote Number, Customer, Status, Validity |
| Sections | SBU-based (FORWARDING, TRUCKING, CUSTOMS, WAREHOUSE) |
| Lines | Service, Qty, UOM, Unit Price, Tax, Total |
| Pricing | Rate selection, Calculation, Override |
| Actions | Add Section, Add Line, Send, Approve, Convert to SO |

### Pricing UX
- Rate selection from canonical rate master
- Calculated price display
- Override with reason + approval
- Price snapshot at commitment

---

## 3. Direct Order UX

### Purpose
First-class direct ordering without Quote.

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Customer, Engagement |
| Mode | Direct Order |
| Capability Selection | FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE |
| Lines | Service, Qty, UOM, Currency, Rate, Price |
| Actions | Add Line, Confirm |

### Flow
```
Select Customer → Select Engagement → Choose Capabilities → Add Lines → Price → Confirm
```

---

## 4. Sales Order UX

### Purpose
Canonical commercial commitment.

### States
```
DRAFT → CONFIRMED → IN_FULFILLMENT → PARTIALLY_FULFILLED → FULFILLED → CLOSED
          ↓              ↓
       CANCELLED      CANCELLED
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | SO Number, Customer, Status, Version |
| Tabs | Overview, Lines, Fulfillment, Shipments, Financial, Documents, Timeline, Activity |
| Lines Table | Capability, Service, Qty, UOM, Currency, BUY, SELL, Price Snapshot, Override, Status |
| Actions | Create Fulfillment, Amend, Cancel, View Pricing |

### SO Line Item Editor

| Field | Type | Source |
|-------|------|--------|
| Capability | Select | Registry |
| Service | Text | User |
| Description | Text | User |
| Quantity | Number | User |
| UOM | Select | Canonical |
| Currency | Select | Canonical |
| Unit Rate | Number | Rate selection / override |
| Calculated Price | Computed | System |
| Override Price | Number | User (with reason) |
| Tax % | Number | User |
| Line Total | Computed | System |

**Immutable after SO confirmation.**

---

## 5. Pricing UX

### Principle
UI consumes canonical pricing authority. No client-side calculations.

### Rate Selection
```
Rate Master → Rate Version (effective period) → Rate Item → Calculated Price
```

### Override UX
```
Calculated Price: $1,500
Override Price:   $1,400
Variance:         -6.7%
Threshold:        5% → APPROVAL REQUIRED
Reason:           [Required]
```

---

## 6. Fulfillment UX

### Purpose
Composition bridge between commercial and operations.

### States
```
PLANNED → ACTIVE → PARTIALLY_FULFILLED → FULFILLED
            ↓
         CANCELLED
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Fulfillment Number, SO, Status, Revision |
| Allocations | Capability, Quantity, Delivered, Status |
| Actions | Add Allocation, Update Progress |

---

**END OF COMMERCIAL WORKFLOW DESIGN**
