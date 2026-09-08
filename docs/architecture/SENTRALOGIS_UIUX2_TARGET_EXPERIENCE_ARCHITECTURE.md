# SENTRALOGIS — UI/UX-2
# TARGET EXPERIENCE ARCHITECTURE

**Date:** 2026-09-01  

---

## 1. Design Philosophy

### Core Principle

> The application is **Customer / Commercial** first, **Execution** second, **Financial** third.

SBU/capability is a dimension of execution, not the organizational root.

### Anti-Patterns to Avoid

| Anti-Pattern | Why Wrong |
|-------------|-----------|
| SBU-first navigation | Violates commercial-first principle |
| Quote-centric workflow | Quote is optional |
| WO-centric workflow | WO is execution, not commercial |
| JO customer-facing | JO is operational, not commercial |

---

## 2. Experience Layers

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

## 3. Primary User Journeys

### Journey A — Quote-Based Order

```
Customer
  → Engagement
  → New Quote
  → Add SBU sections + line items
  → Price (rate selection + calculation)
  → Negotiate (nego_price)
  → Approve
  → Convert to SO
  → Create Fulfillment
  → Track execution
  → Invoice
  → Payment
```

### Journey B — Direct Order

```
Customer
  → Engagement
  → Direct Order
  → Select capabilities
  → Add SO lines
  → Price (rate selection)
  → Confirm SO
  → Create Fulfillment
  → Track execution
  → Invoice
  → Payment
```

### Journey C — Regular Order

```
Customer
  → Engagement
  → Regular Order
  → Select contract/template
  → Confirm services
  → Resolve pricing
  → Create SO
  → Fulfillment
```

### Journey D — Multi-Capability Order

```
Customer
  → Engagement
  → Sales Order
  → Add multiple SO lines:
      ├── Ocean Freight (FORWARDING)
      ├── Customs Clearance (CLEARANCE)
      ├── Port Handling (FORWARDING)
      ├── Trucking (TRUCKING)
      └── Delivery (TRUCKING)
  → Fulfillment
  → Track all capabilities
```

---

## 4. Canonical Object Model

```
CUSTOMER (md_entities)
   │
   ▼
ENGAGEMENT (commercial_work_orders)
   │
   ├── QUOTE (crm_quotations) [OPTIONAL]
   │
   └── SALES ORDER (sales_orders)
           │
           ├── SO LINE ITEMS (sales_order_items) [FUTURE]
           │       │
           │       ├── FORWARDING
           │       ├── CUSTOMS
           │       ├── TRUCKING
           │       └── WAREHOUSE
           │
           └── FULFILLMENT (fulfillments)
                   │
                   ├── ALLOCATION (fulfillment_allocations)
                   │
                   └── SHIPMENT (shp_shipments)
                           │
                           ├── PAYMENT (fin_payments)
                           │       │
                           │       ├── ALLOCATION (fin_payment_allocations)
                           │       │
                           │       └── SETTLEMENT (fin_settlements)
                           │
                           └── INVOICE (fin_invoices)
                                   │
                                   ├── AR (fin_ar_ap, side=AR)
                                   │
                                   └── AP (fin_ar_ap, side=AP)
```

---

## 5. Information Density by Role

| Role | Primary Need | Secondary Need |
|------|-------------|----------------|
| CS | Customer, Order, Status | Pricing, Margin |
| Sales | Pipeline, Quotes, SO | Commission, Margin |
| SBU Operator | Work queue, Execution | Status, Exceptions |
| Finance | Invoices, AR/AP, Payments | Margin, Reconciliation |
| Management | Revenue, Margin, Exceptions | All domains |
| Customer | Order status, Tracking | Documents |

---

## 6. Key UX Metrics

| Metric | Target |
|--------|--------|
| Create SO | < 5 minutes |
| Find order | < 30 seconds |
| Track shipment | < 10 seconds |
| Create invoice | < 3 minutes |
| Approve override | < 1 minute |

---

**END OF TARGET EXPERIENCE ARCHITECTURE**
