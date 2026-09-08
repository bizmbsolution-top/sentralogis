# SENTRALOGIS — PHASE 5C-4R
# PRICE OVERRIDE & GOVERNANCE
# FORENSIC DECISION REPORT

**Date:** 2026-09-01  
**Status:** GREEN — ARCHITECTURE READY FOR RATIFICATION  
**Phase:** 5C-4R — Forensic Decision  

---

## 1. Executive Decision

**PHASE 5C-4R: GREEN — ARCHITECTURE READY FOR RATIFICATION**

All five architecture questions are resolved. ADR-063 is complete and ready for human ratification. Implementation remains **NOT AUTHORIZED**.

---

## 2. ADR Status

| ADR | Status |
|-----|--------|
| ADR-059 | RATIFIED |
| ADR-061 | RATIFIED |
| ADR-062 | RATIFIED |
| ADR-063 | PROPOSED (ready for ratification) |
| ADR-065 | RATIFIED |
| ADR-066 | RATIFIED |

---

## 3. Decision 1 — What is an Override?

### Definition

A **Price Override** is an authorized deviation from a calculated commercial price that occurs **before** SO commitment. It modifies the price that gets committed to the SO line item's `price_snapshot`.

### Distinctions

| Concept | Definition |
|---------|------------|
| Rate Master Change | Modifies reusable rate definitions (affects future calculations) |
| Rate Selection | Choosing among eligible rates (5C-2) |
| **Price Override** | **Authorized deviation from calculated price before commitment** |
| Discount | Percentage reduction from list price (a type of override) |
| Markup | Percentage increase over cost (a type of override) |
| Negotiated Price | Customer-specific rate (stored in rate master, not override) |
| Manual Adjustment | Free-text price entry (a type of override) |

### Override Scope

| Can Override | Cannot Override |
|--------------|-----------------|
| Unit price | Source rate master |
| Total amount | Quantity (use amendment) |
| Charge basis | Currency (use new line) |
| Min/max charges | UOM (use new line) |

### Lifecycle

| Timing | Override Allowed? |
|--------|-------------------|
| Before Quote | N/A (no calculation yet) |
| During Quote | YES (via nego_price) |
| After Quote, before SO | YES |
| During Quote → SO conversion | YES |
| After SO creation (DRAFT) | YES |
| After SO confirmation | NO (use amendment) |

---

## 4. Decision 2 — Override Authorization

### Permission Model

| Operation | Permission | Existing? |
|-----------|------------|-----------|
| Calculate price | `commercial:read` | YES |
| View override | `commercial:read` | YES |
| Request override | `pricing:override` | **NO** |
| Approve override | `pricing:approve` | **NO** |
| Execute override | `pricing:override` | **NO** |
| Cancel override | `pricing:override` | **NO** |

### Roles

| Role | Override Request | Approve | View |
|------|-----------------|---------|------|
| Sales | YES | NO | YES |
| Sales Manager | YES | YES (low threshold) | YES |
| Pricing Manager | YES | YES (high threshold) | YES |
| Finance | NO | YES (margin violations) | YES |

### Tenant Identity

- Server-derived from `IdentityContext`
- No client-supplied `tenant_id`
- No `x-tenant-id` trust

---

## 5. Decision 3 — Approval Workflow

### Threshold Model

| Variance | Approval Required |
|----------|-------------------|
| <= 5% or <= $500 | Auto-approve |
| > 5% or > $500 | Manager approval |
| > 20% or > $5,000 | Pricing Manager approval |
| Negative margin | Finance approval |

### Approval Flow

```
Request Override
    ↓
Check Threshold
    ↓
[Within threshold] → Auto-approve → Commit
    ↓
[Exceeds threshold] → Pending Approval
    ↓
[Approved] → Commit
    ↓
[Rejected] → Revert to calculated price
```

---

## 6. Decision 4 — Audit / Immutability

### Audit Model

| Field | Purpose |
|-------|---------|
| `override_actor` | Who requested |
| `override_timestamp` | When |
| `original_calculated_price` | Before override |
| `override_price` | After override |
| `override_reason` | Why |
| `approval_actor` | Who approved |
| `approval_timestamp` | When approved |
| `approval_status` | PENDING/APPROVED/REJECTED |

### Immutability

| State | Mutation |
|-------|----------|
| DRAFT SO | Override editable |
| Confirmed SO | Override immutable |
| Cancelled SO line | Override preserved for audit |

### Post-Commitment Price Change

| Operation | Model |
|-----------|-------|
| Cancel old line | YES |
| Create new line version | YES |
| New snapshot | YES |
| Preserve lineage | YES |

---

## 7. Decision 5 — Quote → SO → Override Boundary

### Lifecycle

```
Rate Master (reusable)
    ↓
Rate Selection (5C-2)
    ↓
Calculation (5C-2)
    ↓
[Override allowed here]
    ↓
Quote Item (mutable until SO creation)
    ↓
[Override allowed here]
    ↓
SO Creation → Snapshot captured
    ↓
[Override allowed only in DRAFT]
    ↓
SO Confirmation → Locked
    ↓
[NO override — amendment only]
    ↓
Fulfillment (operational, no pricing)
```

### Key Invariant

> A committed commercial price cannot be silently changed by a later rate or calculation change.

---

## 8. Legacy Pricing Forensics

| Structure | Readers | Writers | Browser-direct? | Authority? | Migration Target | Phase |
|---------|---------|--------|---------------|-----------|----------------|-------|
| `fw_price_master` | AddForwardingItemModal, wo/create | master/price page | YES | None | `pricing_rate_items` | Future |
| `crm_sbu_customer_rates` | quotation page | rates page, quotation page | YES | None | `pricing_rate_items` | Future |
| `md_billing_rates` | billing page, contracts | ContractWizard | YES | None | `pricing_rate_items` | Future |
| `crm_quotation_items.nego_price` | quotation page | quotation page | YES | None | `price_snapshot` | Future |
| `total_agreed_revenue` | SO detail | SO create | No (server) | IdentityContext | Derived from lines | 5C-3 |

---

## 9. Security Forensics

| Finding | Severity | Status |
|---------|----------|--------|
| Browser-direct pricing writes (rates page) | HIGH | RECORDED |
| No server-side override authorization | HIGH | RECORDED |
| No audit trail for price changes | HIGH | RECORDED |
| Client-supplied unit_price trusted | MEDIUM | RECORDED |
| Cross-tenant override possible | UNKNOWN | RECORDED |

---

## 10. Cross-ADR Consistency

| Check | Status |
|-------|--------|
| No contradiction | PASS |
| No duplicate authority | PASS |
| No competing pricing engine | PASS |
| No competing commitment boundary | PASS |
| No conflicting snapshot semantics | PASS |
| No conflicting amendment semantics | PASS |
| No conflicting tenant model | PASS |
| No conflicting authorization model | PASS |

---

## PHASE 5C-4R FINAL FORENSIC GATE

```
==================================================
PHASE 5C-4R FINAL FORENSIC GATE
==================================================

ADR-063:
PROPOSED

Override Definition:
PASS

Authorization:
PASS

Approval:
PASS

Audit:
PASS

Immutability:
PASS

Quote → SO Boundary:
PASS

Amendment:
PASS

Cancellation:
PASS

BUY / SELL:
PASS

Currency / UOM:
PASS

IdentityContext:
PASS

Tenant Isolation:
PASS

Legacy Boundary:
PASS

Cross-ADR Consistency:
PASS

Architecture Status:
GREEN — READY FOR RATIFICATION

5C-4 Implementation:
NOT EXECUTED

5C-5:
NOT AUTHORIZED

IMPLEMENTATION HARD STOP:
YES

Human Ratification:
PENDING
==================================================
```

---

**END OF PHASE 5C-4R FORENSIC DECISION REPORT**
