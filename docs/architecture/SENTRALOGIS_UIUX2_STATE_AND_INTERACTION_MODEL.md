# SENTRALOGIS — UI/UX-2
# STATE AND INTERACTION MODEL

**Date:** 2026-09-01  

---

## 1. Object Lifecycles

### 1.1 Engagement

```
CREATED → ACTIVE → COMPLETED
              ↓
           CLOSED
```

| State | User Meaning | Available Actions |
|-------|-------------|------------------|
| CREATED | New engagement | Edit, Activate |
| ACTIVE | Ongoing business | Create Quote, Create Order, Close |
| COMPLETED | All orders fulfilled | View, Reopen |
| CLOSED | Manually closed | View, Reopen |

---

### 1.2 Quote

```
DRAFT → SENT → APPROVED → CONVERTED
          ↓
       REJECTED
```

| State | User Meaning | Available Actions |
|-------|-------------|------------------|
| DRAFT | Being prepared | Edit, Send, Delete |
| SENT | With customer | View, Withdraw |
| APPROVED | Customer accepted | Convert to SO |
| REJECTED | Customer declined | View, Revise |
| CONVERTED | Became SO | View SO |

---

### 1.3 Sales Order

```
DRAFT → CONFIRMED → IN_FULFILLMENT → PARTIALLY_FULFILLED → FULFILLED → CLOSED
          ↓              ↓
       CANCELLED      CANCELLED
```

| State | User Meaning | Available Actions |
|-------|-------------|------------------|
| DRAFT | Being prepared | Edit, Confirm, Delete |
| CONFIRMED | Customer committed | Create Fulfillment, Amend, Cancel |
| IN_FULFILLMENT | Being executed | View progress, Cancel |
| PARTIALLY_FULFILLED | Some lines complete | View progress |
| FULFILLED | All lines delivered | View, Close |
| CLOSED | Completed | View |
| CANCELLED | Voided | View |

---

### 1.4 Fulfillment

```
PLANNED → ACTIVE → PARTIALLY_FULFILLED → FULFILLED
            ↓
         CANCELLED
```

| State | User Meaning | Available Actions |
|-------|-------------|------------------|
| PLANNED | Being composed | Edit allocations |
| ACTIVE | Execution in progress | Update progress |
| PARTIALLY_FULFILLED | Some allocations complete | View progress |
| FULFILLED | All allocations delivered | View |
| CANCELLED | Voided | View |

---

### 1.5 Invoice

```
DRAFT → SENT → ACCEPTED → PAID
          ↓
       OVERDUE
```

| State | User Meaning | Available Actions |
|-------|-------------|------------------|
| DRAFT | Being prepared | Edit, Send |
| SENT | With customer | View, Accept, Mark Paid |
| ACCEPTED | Customer acknowledged | Mark Paid |
| PAID | Payment received | View |
| OVERDUE | Past due | Send reminder, Mark Paid |

---

### 1.6 Payment

```
PENDING → CONFIRMED → ALLOCATED → COMPLETED
            ↓
         CANCELLED / REVERSED
```

| State | User Meaning | Available Actions |
|-------|-------------|------------------|
| PENDING | Received, not confirmed | Confirm, Cancel |
| CONFIRMED | Verified | Allocate |
| ALLOCATED | Assigned to invoices | View allocations |
| COMPLETED | Fully allocated | View |
| CANCELLED | Voided | View |
| REVERSED | Reversed | View |

---

## 2. Interaction Patterns

### 2.1 List → Detail

```
List (search/filter/sort)
   ↓ click row
Detail (tabs + actions)
   ↓ back
List (preserved state)
```

### 2.2 Create Flow

```
List → Create Button → Form → Validate → Submit → Detail
                                      ↓
                                   Error → Inline validation
```

### 2.3 Command Bar

```
Context-aware actions
   ↓ click
Confirmation (if dangerous)
   ↓ confirm
Execute → Optimistic update → Success feedback
```

### 2.4 Tab Navigation

```
Workspace
   ↓ click tab
Load tab content
   ↓ interact
Preserve state across tabs
```

---

## 3. Error Handling

| Error Type | UI Response |
|------------|-------------|
| Validation | Inline field errors |
| Authorization | Disable action + tooltip |
| Not Found | 404 page |
| Server Error | Error banner + retry |
| Network | Offline indicator |

---

## 4. Loading States

| State | UI |
|-------|-----|
| Initial load | Skeleton |
| Tab switch | Spinner |
| Action | Button spinner |
| Background refresh | Silent |

---

## 5. Empty States

| Object | Message | Action |
|--------|---------|--------|
| Engagements | "No engagements yet" | Create Engagement |
| Quotes | "No quotes found" | Create Quote |
| SO Lines | "No line items" | Add Line |
| Invoices | "No invoices found" | Create Invoice |

---

**END OF STATE AND INTERACTION MODEL**
