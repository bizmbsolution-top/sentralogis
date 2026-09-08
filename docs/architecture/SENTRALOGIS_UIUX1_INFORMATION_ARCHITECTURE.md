# SENTRALOGIS — PHASE UI/UX-1
# INFORMATION ARCHITECTURE

**Date:** 2026-09-01  

---

## 1. Target Navigation

```
HOME
├── Dashboard (role-aware)
│
├── CUSTOMERS
│   ├── Customer List
│   ├── Customer Detail
│   └── Customer 360
│
├── COMMERCIAL
│   ├── New Business (entry point)
│   │   ├── New Quote
│   │   ├── Direct Order
│   │   └── Regular Order
│   ├── Engagements
│   ├── Quotes
│   ├── Sales Orders
│   └── Fulfillments
│
├── OPERATIONS
│   ├── Work Queue (cross-SBU)
│   ├── Forwarding
│   ├── Customs
│   ├── Trucking
│   └── Warehouse
│
├── FINANCIAL
│   ├── Charges
│   ├── Invoices
│   ├── AR / Receivables
│   ├── AP / Payables
│   ├── Payments
│   ├── Settlements
│   └── Reconciliation
│
├── PRICING
│   ├── Rate Masters
│   ├── Rate Versions
│   ├── Overrides
│   └── Pricing History
│
├── INTELLIGENCE
│   ├── Visibility
│   ├── Margin
│   ├── Profitability
│   └── Exceptions
│
└── ADMINISTRATION
```

---

## 2. Domain Hierarchy

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

## 3. Page Hierarchy

### Commercial

```
/commercial
   ├── /engagements
   │    ├── /[id] (Engagement Workspace)
   │    │    ├── Overview
   │    │    ├── Quotes
   │    │    ├── Orders
   │    │    ├── Fulfillment
   │    │    ├── Financial
   │    │    └── Activity
   │    └── /create
   │
   ├── /quotes
   │    ├── /[id] (Quote Builder)
   │    └── /create
   │
   ├── /sales-orders
   │    ├── /[id] (SO Workspace)
   │    │    ├── Overview
   │    │    ├── Lines
   │    │    ├── Fulfillment
   │    │    ├── Financial
   │    │    └── Activity
   │    └── /create
   │
   └── /fulfillments
        └── /[id]
```

### Operations

```
/operations
   ├── /work-queue (cross-SBU)
   │
   ├── /forwarding
   │    ├── /shipments
   │    ├── /consolidations
   │    └── /pricing
   │
   ├── /customs
   │    └── /declarations/[id]
   │
   ├── /trucking
   │    ├── /work-orders
   │    ├── /assignments
   │    └── /fleet
   │
   └── /warehouse
        ├── /inbound
        ├── /outbound
        └── /inventory
```

### Financial

```
/financial
   ├── /invoices
   │    ├── /customer
   │    └── /vendor
   │
   ├── /ar (receivables)
   ├── /ap (payables)
   ├── /payments
   ├── /settlements
   └── /reconciliation
```

---

## 4. Workspace Hierarchy

### Engagement Workspace

```
ENGAGEMENT WORKSPACE
─────────────────────────────────────────
Header: Customer | Status | Commercial Context
─────────────────────────────────────────
Tabs:
├── Overview (summary, health, actions)
├── Quotes (list, create, convert)
├── Orders (SO list, create, track)
├── Fulfillment (plans, allocations, progress)
├── Financial (charges, invoices, payments)
├── Documents (contracts, correspondence)
├── Activity (timeline, notes, tasks)
└── Intelligence (margin, exceptions)
```

### Sales Order Workspace

```
SO WORKSPACE
─────────────────────────────────────────
Header: SO Number | Customer | Status | Version
─────────────────────────────────────────
Tabs:
├── Overview (summary, customer, commercial terms)
├── Lines (SO line items with capability/price/fulfillment)
├── Fulfillment (plans, allocations, handoffs)
├── Shipments (tracking, milestones, documents)
├── Financial (charges, invoices, payments, margin)
└── Activity (timeline, amendments, notes)
```

---

## 5. Commercial Entry Modes

```
NEW BUSINESS
─────────────────────────────────────────
│
├── New Quote
│   Customer needs pricing/negotiation
│
├── Direct Order
│   Existing agreement / known pricing
│
├── Regular Order
│   Recurring / contracted business
│
└── From Existing Quote
    Convert approved commercial quote
```

---

## 6. Engagement Model

```
ENGAGEMENT = Commercial relationship/context
           ≠ Quote container

An Engagement may contain:
├── Multiple Quotes
├── Multiple Direct Orders
├── Multiple Regular Orders
├── Multiple Sales Orders
├── Commercial context (terms, rates, history)
└── Customer relationship context
```

---

## 7. SO Model

```
SALES ORDER = Canonical customer commitment

SO Header:
├── Customer
├── Engagement
├── Order Type (Quote-based / Direct / Regular)
├── Status
└── Commercial Summary

SO Lines:
├── Capability (Forwarding/Customs/Trucking/Warehouse)
├── Service description
├── Quantity + UOM
├── Currency
├── BUY / SELL
├── Price Snapshot (immutable)
├── Override status
└── Fulfillment status
```

---

## 8. Fulfillment Model

```
FULFILLMENT = Composition boundary

Fulfillment:
├── Sales Order reference
├── Revision number
├── Status
└── Allocations:
    ├── FORWARDING → Shipment
    ├── CUSTOMS → Declaration
    ├── TRUCKING → Service Request → WO → JO
    └── WAREHOUSE → Service Request → WMS
```

---

## 9. Financial Model

```
FINANCIAL = Consumer of committed commercial truth

Financial:
├── Charges (from SO lines + pricing)
├── Invoices (from billable events)
├── AR (customer receivables)
├── AP (supplier payables)
├── Payments (settlement events)
├── Settlements (payment-to-invoice allocation)
├── Reconciliation (external matching)
└── Accounting (external interface)
```

---

## 10. Intelligence Model

```
INTELLIGENCE = Read-only projection

Intelligence:
├── Visibility (customer-facing status)
├── Margin (revenue - cost per SO/line)
├── Profitability (SBU/customer/lane)
└── Exceptions (risks, delays, disputes)
```

---

**END OF INFORMATION ARCHITECTURE**
