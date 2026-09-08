# ADR-068 — Payment Allocation, AR/AP & Lifecycle Semantics

**Status:** RATIFIED (Phase 5D-3R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Depends on:** ADR-067 (Payment & Settlement Boundary)  

---

## 1. Context

ADR-067 establishes Payment and Settlement as first-class aggregates. ADR-068 defines the allocation semantics, AR/AP lifecycle, and the canonical behavior for partial payments, overpayments, and multi-invoice settlements.

## 2. Problem

How should payment allocation work without:
1. Allowing silent mutation of allocated amounts
2. Creating ambiguous unapplied balances
3. Collapsing AR/AP into a single balance model

## 3. Decision

**Allocation is an immutable, append-only record. AR/AP balances are derived from documents + allocations, not stored as mutable state.**

### 3.1 Allocation Model

| Attribute | Purpose |
|-----------|---------|
| `allocation_id` | UUID PK |
| `payment_id` | Source payment |
| `invoice_id` | Target invoice |
| `amount` | Allocated amount |
| `currency` | Explicit currency |
| `allocated_at` | Timestamp |

### 3.2 Allocation Rules

1. **Total allocation ≤ payment amount**
2. **Allocation cannot be mutated after SETTLED**
3. **Reversal creates new negative allocation**
4. **Partial allocation is allowed**

### 3.3 AR/AP Lifecycle

#### AR (Customer Receivable)

```
INVOICED → PARTIAL_PAID → PAID
   ↓          ↓           ↓
OVERDUE   WRITTEN_OFF  DISPUTED
```

#### AP (Supplier Payable)

```
INVOICED → PARTIAL_PAID → PAID
   ↓          ↓           ↓
OVERDUE   WRITTEN_OFF  DISPUTED
```

### 3.4 Balance Derivation

```
AR Balance = SUM(invoice totals) - SUM(allocations) - SUM(credit notes)
AP Balance = SUM(invoice totals) - SUM(allocations) - SUM(debit notes)
```

**Balances are calculated, not stored.**

### 3.5 Partial Payment Example

| Step | Invoice | Payment | Allocation | Outstanding |
|------|---------|---------|------------|-------------|
| 1 | 100,000 | 40,000 | 40,000 | 60,000 |
| 2 | 100,000 | 30,000 | 30,000 | 30,000 |
| 3 | 100,000 | 30,000 | 30,000 | 0 |

### 3.6 Overpayment Example

| Step | Invoice | Payment | Allocation | Unapplied |
|------|---------|---------|------------|-----------|
| 1 | 100,000 | 120,000 | 100,000 | 20,000 |

**Unapplied balance** can be:
1. Customer credit (allocated to future invoices)
2. Refund obligation (AP)

### 3.7 Multi-Invoice Payment Example

| Payment | Invoice | Allocation |
|---------|---------|------------|
| 150,000 | A (50,000) | 50,000 |
| 150,000 | B (70,000) | 70,000 |
| 150,000 | C (30,000) | 30,000 |

**Total allocated = 150,000 = payment amount**

### 3.8 Reversal Semantics

| Action | Behavior |
|--------|----------|
| Payment reversal | Creates negative payment |
| Allocation reversal | Creates negative allocation |
| Historical record | Preserved (append-only) |

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Mutable allocation | Cannot preserve historical truth |
| Stored balance | Derivable from documents; risk of inconsistency |
| Single AR/AP entity | Loses directional semantics |

## 5. Consequences

1. Allocation is immutable after settlement
2. Balances are derived, not stored
3. Reversal is append-only
4. Historical truth preserved

## 6. Security Implications

- Allocation requires `payment:allocate` permission
- Reversal requires `payment:reverse` permission
- All operations use IdentityContext tenant

## 7. Explicit Non-Goals

- FX conversion
- Reconciliation automation
- Bank integration
