# SENTRALOGIS — PHASE 5D-1
# FINANCIAL DOMAIN & SETTLEMENT ARCHITECTURE
# DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** GREEN — ARCHITECTURE READY  
**Phase:** 5D-1 — Discovery  

---

## 1. Executive Decision

**PHASE 5D-1: GREEN — ARCHITECTURE READY**

The SENTRALOGIS Financial Domain is architecturally coherent. Canonical financial tables from 5C-5 are properly designed. Legacy financial structures are operational-keyed and should be retained as historical. No architectural blockers found.

---

## 2. Scope

| Area | Status |
|------|--------|
| Billable Events | CANONICAL (5C-5) |
| Invoicing | CANONICAL (5C-5) |
| Accounts Receivable | CANONICAL (5C-5) |
| Accounts Payable | CANONICAL (5C-5) |
| Financial Adjustments | CANONICAL (5C-5) |
| Tax | CANONICAL (md_taxes) |
| Financial Ledger | DEAD (fin_financial_ledger_entries) |

---

## 3. Governing ADR Baseline

| ADR | Title | Relevance |
|-----|-------|-----------|
| ADR-064 | Financial Settlement Interface | PRIMARY — defines financial boundary |
| ADR-061 | Commercial Charge Model | Commercial commitment boundary |
| ADR-066 | Price Snapshot Commitment | Immutable commercial truth |

---

## 4. Current Financial Domain Map

```
Pricing (CLOSED)
    ↓
Commercial Commitment (SO Line Item + Price Snapshot)
    ↓
Billable Event (fin_billable_events) — 5C-5
    ↓
Invoice (fin_invoices + fin_invoice_lines) — 5C-5
    ↓
AR/AP (fin_ar_ap) — 5C-5
    ↓
Adjustments (fin_adjustments) — 5C-5
    ↓
Accounting Interface (ADR-064) — future phase
```

---

## 5. Billable Event Discovery

| Check | Result |
|-------|--------|
| Canonical authority | `fin_billable_events` (5C-5) |
| Source entity | SO Line Item |
| Source line | `so_line_item_id` |
| Quantity | `quantity` |
| Amount | `total_amount` |
| Currency | `currency` (explicit) |
| BUY / SELL | `side` (SELL/BUY) |
| Customer | `customer_id` |
| Idempotency | `idempotency_key` |
| Event timestamp | `event_timestamp` |

**Status:** CANONICAL — single authoritative billable event authority.

---

## 6. Invoice Boundary Discovery

| Check | Result |
|-------|--------|
| Canonical authority | `fin_invoices` (5C-5) |
| Invoice numbering | `invoice_number` (unique per tenant) |
| Invoice lifecycle | `status` (DRAFT → SENT → PAID) |
| Source | Billable events |
| SO lineage | `sales_order_id` |
| Customer lineage | `customer_id` |
| Currency | `currency` (explicit) |
| Tax | `tax_amount` + `tax_percentage` |

**Status:** CANONICAL — invoice is a financial document derived from immutable commercial obligations.

---

## 7. AR Discovery

| Check | Result |
|-------|--------|
| Canonical authority | `fin_ar_ap` (side=AR) |
| Invoice reference | `invoice_id` |
| Balance | `balance_amount` |
| Due date | `due_date` |
| Status | `status` (PENDING → PAID) |
| Payment tracking | `paid_amount` |

**Status:** CANONICAL — AR balance derived from immutable financial transactions.

---

## 8. AP Discovery

| Check | Result |
|-------|--------|
| Canonical authority | `fin_ar_ap` (side=AP) |
| Supplier reference | `supplier_id` |
| Balance | `balance_amount` |
| Due date | `due_date` |

**Status:** CANONICAL — AP integrated with BUY pricing.

---

## 9. Payment Discovery

| Check | Result |
|-------|--------|
| Legacy table | `job_order_payments` (operational) |
| Canonical payment | **NOT YET IMPLEMENTED** |

**Gap:** Canonical payment allocation not yet implemented. Future phase.

---

## 10. Multi-Currency / FX Discovery

| Check | Result |
|-------|--------|
| Transaction currency | Explicit (fin_invoices.currency) |
| Functional currency | IDR (default) |
| FX rate | **NOT IMPLEMENTED** |
| FX conversion | **NOT IMPLEMENTED** |

**Gap:** FX infrastructure not yet implemented. Future phase.

---

## 11. Tax Discovery

| Check | Result |
|-------|--------|
| Tax master | `md_taxes` (PPN 11%) |
| Tax calculation | Invoice UI |
| Tax snapshot | `fin_invoices.tax_amount` |

**Status:** CANONICAL — tax master exists. Tax calculation in UI.

---

## 12. Adjustment Discovery

| Check | Result |
|-------|--------|
| Canonical authority | `fin_adjustments` (5C-5) |
| Types | CREDIT_NOTE, DEBIT_NOTE, REVERSAL, WRITE_OFF, PRICE_CORRECTION |
| Audit trail | `reason` + `created_by` + `created_at` |
| Parent reference | `invoice_id` + `ar_ap_id` |

**Status:** CANONICAL — append-only adjustments.

---

## 13. Reversal Discovery

| Check | Result |
|-------|--------|
| Model | Compensating transaction (fin_adjustments) |
| Audit | Append-only |

**Status:** CANONICAL — reversals are compensating transactions, not mutations.

---

## 14. Reconciliation Discovery

| Check | Result |
|-------|--------|
| Invoice ↔ Billable Event | Via `fin_invoice_lines.billable_event_id` |
| Invoice ↔ AR | Via `fin_ar_ap.invoice_id` |
| Reconciliation status | **NOT YET IMPLEMENTED** |

**Gap:** Reconciliation status tracking not yet implemented. Future phase.

---

## 15. Accounting Interface Discovery

| Check | Result |
|-------|--------|
| Ledger table | `fin_financial_ledger_entries` (DEAD) |
| COA | `finance_coa` (exists) |
| Posting interface | **NOT IMPLEMENTED** |

**Gap:** Accounting interface not yet implemented. ADR-064 defines the boundary; implementation is future phase.

---

## 16. Financial Immutability

| Check | Result |
|-------|--------|
| Price Snapshot | IMMUTABLE (ADR-066) |
| Billable Event | IMMUTABLE after creation |
| Invoice | IMMUTABLE after issuance |
| Adjustment | APPEND-ONLY |

**Status:** PASS — committed financial truth protected.

---

## 17. Financial Identity Authority

| Check | Result |
|-------|--------|
| Invoice number | DB-generated + unique constraint |
| Billable event ID | DB-generated UUID |
| AR/AP ID | DB-generated UUID |

**Status:** PASS — no client-generated authoritative financial IDs.

---

## 18. IdentityContext / Tenant Isolation

| Check | Result |
|-------|--------|
| IdentityContext | PASS |
| Tenant isolation | PASS |
| RLS | PASS (all canonical tables) |

---

## 19. Authorization

| Permission | Status |
|------------|--------|
| `commercial:manage` | Exists |
| `commercial:read` | Exists |
| Financial permissions | **NOT YET DEFINED** |

**Gap:** Dedicated financial permissions not yet defined. Future phase.

---

## 20. Browser Mutation Audit

| Check | Result |
|-------|--------|
| Browser-direct canonical financial mutation | ZERO |
| Legacy operational writes | CONTROLLED |

---

## 21. Cross-Domain Lineage

| Boundary | Status |
|----------|--------|
| Quote → SO | PASS |
| SO → SO Line | PASS |
| SO Line → Price Snapshot | PASS |
| Price Snapshot → Billable Event | PASS |
| Billable Event → Invoice | PASS |
| Invoice → AR/AP | PASS |
| AR/AP → Adjustment | PASS |

**Status:** PASS — lineage complete from commercial to financial.

---

## 22. Multi-SBU Financial Architecture

| Capability | Financial Authority |
|------------|-------------------|
| FORWARDING | Centralized (fin_invoices) |
| CUSTOMS | Centralized (fin_invoices) |
| TRUCKING | Centralized (fin_invoices) |
| WAREHOUSE | Centralized (fin_invoices) |

**Status:** PASS — no SBU-specific financial engines.

---

## 23. Legacy Financial Structures

| Structure | Classification | Status |
|-----------|---------------|--------|
| `invoices` | Legacy — ADAPTER | Operational-keyed |
| `invoice_lines` | Legacy — ADAPTER | Operational-keyed |
| `job_order_payments` | Legacy — ADAPTER | Operational |
| `fin_financial_ledger_entries` | CANONICAL — DEAD | Zero writers |
| `md_taxes` | CANONICAL | Active |
| `finance_coa` | CANONICAL | Active |

---

## 24. ADR Gap Analysis

| Decision | Existing ADR | Gap |
|----------|-------------|-----|
| Financial domain authority | ADR-064 | GOVERNED |
| Billable event authority | ADR-064 | GOVERNED |
| Invoice boundary | ADR-064 | GOVERNED |
| AR/AP boundary | ADR-064 | GOVERNED |
| Adjustment model | ADR-064 | GOVERNED |
| Payment boundary | — | FUTURE PHASE |
| FX authority | — | FUTURE PHASE |
| Tax authority | ADR-062 | GOVERNED |
| Reconciliation | — | FUTURE PHASE |
| Accounting interface | ADR-064 | GOVERNED (boundary only) |

**Conclusion:** No new ADRs required. ADR-064 governs the financial boundary. Payment, FX, reconciliation, and accounting interface are future implementation phases.

---

## 25. Architecture Decision Summary

| Decision | Classification |
|----------|---------------|
| Financial domain authority | B |
| Billable event authority | A |
| Invoice boundary | A |
| AR authority | A |
| AP authority | A |
| Payment boundary | D |
| Settlement boundary | D |
| FX authority | D |
| Tax authority | B |
| Adjustment model | A |
| Reversal model | A |
| Reconciliation authority | D |
| Accounting interface | D |
| Financial immutability | A |
| Financial numbering | A |
| Financial permissions | D |

**Legend:** A = Governed, B = Sufficient, C = Decision required, D = Future

---

## 26. Implementation Blockers

**None.** The financial architecture is coherent and ready for future implementation phases.

---

## 27. Recommended Next Phase

**OPTION D: CROSS-DOMAIN INTEGRATION DISCOVERY REQUIRED**

The financial domain is stable. Future implementation phases (payment, FX, reconciliation, accounting interface) require separate authorization.

---

## 28. Final Discovery Gate

```
==================================================
PHASE 5D-1 DISCOVERY FINAL GATE
==================================================

Financial Domain Authority:
GREEN

Billable Event Authority:
PASS

Invoice Boundary:
PASS

AR Boundary:
PASS

AP Boundary:
PASS

Payment Boundary:
GAP (future phase)

Settlement Boundary:
GAP (future phase)

Multi-Currency / FX:
GAP (future phase)

Tax Boundary:
PASS

Adjustment Model:
PASS

Reversal Model:
PASS

Reconciliation:
GAP (future phase)

Accounting Interface:
GAP (future phase)

Financial Immutability:
PASS

Financial Identity Authority:
PASS

IdentityContext:
PASS

Authorization:
GAP (future permissions)

Tenant Isolation:
PASS

RLS:
PASS

Browser Direct Financial Mutation:
ZERO

Duplicate Financial Authority:
NONE

Cross-Domain Lineage:
PASS

Legacy Financial Authority:
CLOSED / CONTROLLED

TypeScript:
PASS

Architecture Status:
GREEN

ADR Ratification:
NOT REQUIRED

Implementation:
NOT EXECUTED

5D-2:
NOT AUTHORIZED

IMPLEMENTATION HARD STOP:
YES
==================================================
```

---

**END OF PHASE 5D-1 FINANCIAL DISCOVERY REPORT**
