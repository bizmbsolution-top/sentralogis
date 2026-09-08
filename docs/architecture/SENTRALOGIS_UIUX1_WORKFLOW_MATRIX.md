# SENTRALOGIS — PHASE UI/UX-1
# WORKFLOW MATRIX

**Date:** 2026-09-01  

---

## 1. Quote Flow

| Step | Current UI | Target UI | Status |
|------|-----------|-----------|--------|
| Create quote | Pipeline → DealDrawer | Engagement → New Quote | NEEDS REDESIGN |
| Add lines | SBU sections + line items | Same (reusable) | OK |
| Price | Manual + rate import | Same (reusable) | OK |
| Negotiate | nego_price inline | Same (reusable) | OK |
| Approve | handleMarkAsWon | Same (reusable) | OK |
| Convert to SO | MISSING | Quote → SO conversion | GAP |

---

## 2. Direct Order Flow

| Step | Current UI | Target UI | Status |
|------|-----------|-----------|--------|
| Create SO | `/commercial/sales-orders/create` | Same (reusable) | OK |
| Add lines | MISSING | SO line items | GAP |
| Select capability | MISSING | Capability selection | GAP |
| Price | MISSING | Rate selection + calculation | GAP |
| Confirm | MISSING | SO confirmation | GAP |

---

## 3. Regular Order Flow

| Step | Current UI | Target UI | Status |
|------|-----------|-----------|--------|
| Create regular order | MISSING | Regular order wizard | GAP |
| Select contract | MISSING | Contract/rate context | GAP |
| Duplicate order | MISSING | One-click duplicate | GAP |

---

## 4. Multi-SBU Flow

| Step | Current UI | Target UI | Status |
|------|-----------|-----------|--------|
| Create SO | `/commercial/sales-orders/create` | Same | OK |
| Select capabilities | Fulfillment create page | Same (reusable) | OK |
| Compose services | Fulfillment allocations | Same (reusable) | OK |
| Track execution | Control Tower | Same (reusable) | OK |

---

## 5. Fulfillment Flow

| Step | Current UI | Target UI | Status |
|------|-----------|-----------|--------|
| Create fulfillment | `/commercial/sales-orders/[id]/fulfillment` | Same (reusable) | OK |
| Add allocations | Capability selection | Same (reusable) | OK |
| Track progress | Control Tower | Same (reusable) | OK |

---

## 6. Financial Flow

| Step | Current UI | Target UI | Status |
|------|-----------|-----------|--------|
| Create invoice | `/hq/invoice-customer` | `/financial/invoices/customer` | MOVE |
| Record payment | Mark Paid modal | Payment workspace | ENHANCE |
| Settlement | Cost Audit finalize | Settlement workspace | ENHANCE |
| Reconciliation | MISSING | Reconciliation workspace | GAP |

---

## 7. Payment Flow

| Step | Current UI | Target UI | Status |
|------|-----------|-----------|--------|
| Record payment | Mark Paid modal | Payment creation | ENHANCE |
| Allocate to invoice | MISSING | Allocation workspace | GAP |
| Settlement | MISSING | Settlement workspace | GAP |

---

## 8. Operational Flow

| Step | Current UI | Target UI | Status |
|------|-----------|-----------|--------|
| Receive work | SBU work queue | Same (reusable) | OK |
| Assign resources | AssignmentModal | Same (reusable) | OK |
| Execute | JO detail | Same (reusable) | OK |
| Complete | Status update | Same (reusable) | OK |

---

**END OF WORKFLOW MATRIX**
