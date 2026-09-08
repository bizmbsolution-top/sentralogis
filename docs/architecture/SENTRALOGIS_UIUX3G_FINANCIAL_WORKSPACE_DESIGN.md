# SENTRALOGIS — UI/UX-3G
# FINANCIAL WORKSPACE DESIGN

**Date:** 2026-09-01  

---

## 1. Billable Events

### Purpose
Track when financial recognition occurs.

### Event Types
```
INVOICE_ISSUED, INVOICE_ADJUSTED, AR_PAYMENT_APPLIED, AP_PAYMENT_APPLIED, SETTLEMENT_COMPLETED, ADJUSTMENT, REVERSAL
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Event Type, Entity, Timestamp |
| Details | Amount, currency, source |
| Actions | View source, Explain |

---

## 2. Accounts Receivable

### Purpose
Customer receivables management.

### States
```
PENDING → INVOICED → PARTIAL_PAID → PAID
   ↓         ↓           ↓
OVERDUE   WRITTEN_OFF  DISPUTED
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Customer, Outstanding, Overdue |
| Aging | Current, 30, 60, 90+ days |
| Invoices | List with status |
| Actions | Send reminder, Apply payment, Write-off |

---

## 3. Accounts Payable

### Purpose
Supplier payables management.

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Supplier, Outstanding, Due |
| Bills | List with status |
| Actions | Approve, Pay, Reject |

---

## 4. Invoice UX

### Purpose
Customer/vendor invoicing.

### States
```
DRAFT → SENT → ACCEPTED → PAID
          ↓
       OVERDUE
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Invoice Number, Customer, Amount, Status |
| Lines | COA, Description, Qty, Rate, Amount |
| Tax | Tax type, rate, amount |
| Totals | Subtotal, Tax, Grand Total |
| Actions | Add line, Send, Accept, Mark Paid, PDF |

---

## 5. Payment UX

### Purpose
Payment recording and allocation.

### States
```
PENDING → CONFIRMED → ALLOCATED → COMPLETED
            ↓
         CANCELLED / REVERSED
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Payment Number, Amount, Date, Status |
| Allocations | Invoice, Amount, Balance |
| Actions | Add allocation, Confirm, Reverse |

### Partial Payment UX
```
Invoice: $100,000
Payment: $40,000
Allocated: $40,000
Remaining: $60,000
Status: PARTIAL_PAID
```

### Multi-Invoice Payment UX
```
Payment: $150,000
├── Invoice A: $50,000
├── Invoice B: $70,000
└── Invoice C: $30,000
Status: FULLY_ALLOCATED
```

---

## 6. Settlement UX

### Purpose
Payment-to-invoice settlement.

### States
```
OPEN → PARTIAL → SETTLED
   ↓
REVERSED
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Settlement Number, Status |
| Allocations | Payment → Invoice mapping |
| Actions | Add allocation, Reverse |

---

## 7. Reconciliation UX

### Purpose
External statement matching.

### States
```
UNMATCHED → MATCHED
   ↓
EXCEPTION
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | External reference, amount, status |
| Match | Suggested internal records |
| Actions | Confirm match, Create exception |

---

## 8. Accounting Interface

### Purpose
External accounting system integration.

### Events Exported
```
INVOICE_ISSUED, PAYMENT_RECEIVED, ADJUSTMENT, SETTLEMENT, REVERSAL
```

### Screen Specification

| Element | Description |
|---------|-------------|
| Header | Event ID, Type, Timestamp |
| Payload | Journal lines (debit/credit) |
| Status | PENDING, SENT, ACKNOWLEDGED, REJECTED |
| Actions | Retry, View details |

---

**END OF FINANCIAL WORKSPACE DESIGN**
