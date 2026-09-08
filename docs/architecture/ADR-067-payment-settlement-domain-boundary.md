# ADR-067 — Payment & Settlement Domain Boundary

**Status:** RATIFIED (Phase 5D-3R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Depends on:** ADR-061 (Commercial Charge), ADR-064 (Financial Settlement)  

---

## 1. Context

Phase 5D-3 discovered that no canonical Payment or Settlement entity exists. The financial foundation (5D-2) provides billable events, invoices, and AR/AP, but the boundary between invoice and payment is undefined. Without explicit payment/settlement architecture, the system cannot support partial payments, overpayments, multi-invoice settlements, or multi-currency transactions.

## 2. Problem

How should SENTRALOGIS represent the settlement of financial obligations (AR/AP) through payment events without:
1. Creating a second pricing engine
2. Mutating committed commercial prices
3. Introducing duplicate financial authority
4. Collapsing AR/AP into ambiguous balances

## 3. Decision

**Payment is a first-class financial domain aggregate. Settlement is the explicit allocation of payment to invoice.**

### 3.1 Payment Definition

A **Payment** is a financial event that represents the transfer of funds to settle an obligation.

| Attribute | Purpose |
|-----------|---------|
| `payment_id` | UUID PK (DB-generated) |
| `tenant_id` | Tenant isolation |
| `payment_number` | Business identifier (unique per tenant) |
| `direction` | AR (incoming) or AP (outgoing) |
| `amount` | Payment amount |
| `currency` | Explicit currency |
| `payment_date` | When payment occurred |
| `reference` | External reference (bank txn, etc.) |
| `method` | Payment method |
| `status` | Lifecycle status |

### 3.2 Payment Lifecycle

```
PENDING → CONFIRMED → ALLOCATED → COMPLETED
   ↓         ↓          ↓
CANCELLED  REVERSED   PARTIALLY_ALLOCATED
```

| Status | Meaning |
|--------|---------|
| `PENDING` | Received, not yet confirmed |
| `CONFIRMED` | Verified and accepted |
| `ALLOCATED` | Assigned to one or more invoices |
| `COMPLETED` | Fully allocated and settled |
| `CANCELLED` | Voided before allocation |
| `REVERSED` | Reversed after allocation |

### 3.3 Settlement Definition

**Settlement** is the explicit allocation of a Payment to one or more Invoices.

| Attribute | Purpose |
|-----------|---------|
| `allocation_id` | UUID PK |
| `payment_id` | Source payment |
| `invoice_id` | Target invoice |
| `amount` | Allocated amount |
| `currency` | Explicit currency |
| `allocated_at` | Timestamp |

### 3.4 Settlement Lifecycle

```
PENDING → ALLOCATED → SETTLED
   ↓         ↓
CANCELLED  REVERSED
```

### 3.5 AR/AP Semantics

| Side | Direction | Meaning |
|------|-----------|---------|
| AR | INCOMING | Customer pays Sentralogis |
| AP | OUTGOING | Sentralogis pays supplier |

### 3.6 Partial Payment

- Multiple payments can settle one invoice
- Each payment creates one or more allocation records
- Outstanding balance = invoice total - SUM(allocations)

### 3.7 Overpayment

| Scenario | Behavior |
|----------|----------|
| Payment > Invoice | Creates unapplied balance |
| Unapplied balance | Customer credit (AR) or refund obligation (AP) |
| Future allocation | Unapplied balance can be allocated to future invoices |

### 3.8 Multi-Invoice Payment

- One payment can allocate to multiple invoices
- Allocation is explicit (payment_id + invoice_id + amount)
- Total allocated cannot exceed payment amount

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Payment as invoice attribute | Cannot support multi-invoice settlement |
| Settlement without allocation entity | Cannot track partial allocations |
| AR/AP as separate aggregates | Duplicates invoice authority |

## 5. Consequences

1. Payment is a first-class financial aggregate
2. Settlement requires explicit allocation entity
3. Partial payment is natively supported
4. Overpayment creates unapplied balance
5. Multi-invoice settlement is supported

## 6. Security Implications

- Payment creation requires `payment:create` permission
- Payment approval requires `payment:approve` permission
- Payment reversal requires `payment:reverse` permission
- All operations use IdentityContext tenant
- RLS on all payment tables

## 7. Data Ownership

| Entity | Owner |
|--------|-------|
| Payment | Financial Domain |
| Allocation | Financial Domain |
| Unapplied Balance | Financial Domain |

## 8. Lifecycle Semantics

| Object | Immutable After |
|--------|-----------------|
| Payment | CONFIRMED |
| Allocation | SETTLED |
| Reversal | Append-only |

## 9. Cross-Domain Implications

| Domain | Relationship |
|--------|--------------|
| Pricing | Consumes pricing; does not mutate |
| Commercial | Consumes SO commitments |
| Financial | Owns payment/settlement |
| Accounting | Future integration boundary |

## 10. Explicit Non-Goals

- Accounting journal posting
- FX engine
- Reconciliation engine
- Bank integration
- Payment gateway
