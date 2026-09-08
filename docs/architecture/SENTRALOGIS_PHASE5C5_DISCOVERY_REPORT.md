# SENTRALOGIS — PHASE 5C-5
# FINANCIAL SETTLEMENT & ACCOUNTING INTERFACE
# DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** YELLOW — ADR REQUIRED  
**Phase:** 5C-5 — Discovery  

---

## 1. Executive Decision

**PHASE 5C-5: YELLOW — ADR REQUIRED**

No canonical settlement engine exists. ADR-064 (Financial Settlement Interface) is PROPOSED but not RATIFIED. Existing financial structures are either DEAD (fin_financial_ledger_entries) or operational-keyed (invoices).

---

## 2. Current Architecture

### Commercial → Financial Boundary (Current State)

```
Pricing Engine (5C-2)
    ↓
Price Snapshot (5C-3)
    ↓
SO Line Item (5C-3)
    ↓
[GAP: No canonical settlement path]
    ↓
Invoices (operational, work_order-keyed)
    ↓
fin_financial_ledger_entries (DEAD)
```

---

## 3. Existing Financial Structures

| Structure | Status | Purpose | Writer | Reader |
|-----------|--------|---------|--------|--------|
| `invoices` | LIVE | Customer billing (operational) | Invoice UI | Finance UI |
| `invoice_lines` | LIVE | Per-line billing | Invoice UI | Finance UI |
| `fin_financial_ledger_entries` | DEAD | Financial posting | NONE | NONE |
| `md_taxes` | LIVE | Tax master (PPN 11%) | Admin | Invoices |
| `finance_coa` | LIVE | Chart of accounts | Admin | Invoices |
| `event_outbox` | LIVE | Event-driven outbox | Domains | Consumers |
| `event_consumption_log` | LIVE | Idempotent consumer | Consumers | NONE |
| `event_dead_letter` | LIVE | Dead-letter queue | Consumers | NONE |

---

## 4. ADR Status

| ADR | Status | 5C-5 Implication |
|-----|--------|-------------------|
| ADR-059 | RATIFIED | Snapshot fields defined |
| ADR-061 | RATIFIED | SO line commitment boundary |
| ADR-062 | RATIFIED | Currency/UOM explicit |
| ADR-063 | RATIFIED | Override governance |
| ADR-065 | RATIFIED | Rate precedence |
| ADR-066 | RATIFIED | Commitment boundary |
| **ADR-064** | **PROPOSED** | **Settlement interface not authoritative** |

---

## 5. Critical Boundary: Commercial vs Financial

### Commercial Truth (5C-3)

| Concept | Owner | Status |
|---------|-------|--------|
| Calculated Price | Pricing Engine | CANONICAL |
| Negotiated Price | Quote | CANONICAL |
| Approved Override | Override Service | CANONICAL |
| Committed SO Price Snapshot | SO Line Item | CANONICAL |

### Financial Truth (Current)

| Concept | Owner | Status |
|---------|-------|--------|
| Billable Charge | **UNDEFINED** | **GAP** |
| Invoice | Operational (work_order) | LEGACY |
| Accounts Receivable | **UNDEFINED** | **GAP** |
| Supplier Payable | **UNDEFINED** | **GAP** |
| Settlement | **UNDEFINED** | **GAP** |
| Accounting Journal | DEAD (fin_ledger) | **GAP** |

---

## 6. SELL-Side Analysis

### Current Path

```
SO Line (SELL)
    ↓
[NO canonical path]
    ↓
Invoice (work_order-keyed)
    ↓
[NO AR/settlement]
```

### Required Path

```
SO Line (SELL) + Price Snapshot
    ↓
Billable Event (fulfillment/execution)
    ↓
Invoice Candidate
    ↓
Invoice
    ↓
Accounts Receivable
    ↓
Payment
    ↓
Settlement
```

---

## 7. BUY-Side Analysis

### Current Path

```
SO Line (BUY)
    ↓
[NO canonical path]
    ↓
Supplier Invoice (manual)
    ↓
[NO AP/settlement]
```

### Required Path

```
SO Line (BUY) + Price Snapshot
    ↓
Payable Event
    ↓
Supplier Invoice Match
    ↓
Accounts Payable
    ↓
Payment
    ↓
Settlement
```

---

## 8. Estimate vs Commitment vs Actual

| State | Meaning | Current Support |
|-------|---------|-----------------|
| Estimated | Quote price | YES |
| Committed | SO snapshot | YES (5C-3) |
| Incurred | Actual cost | PARTIAL (extra_costs) |
| Billed | Invoice issued | YES (operational) |
| Payable | Supplier obligation | **NO** |
| Paid | Payment received | PARTIAL |
| Settled | Final reconciliation | **NO** |

---

## 9. Invoice Boundary

### Current State

| Aspect | Current |
|--------|---------|
| Ownership | Operational (work_order) |
| Numbering | `invoice_number` (text) |
| Immutability | Status-based (draft→sent→paid) |
| Amendment | Edit draft lines |
| Cancellation | Status change |
| Tax | `md_taxes` (PPN 11%) |
| Currency | Implicit IDR |

### Gap

Current invoices are **operational** (keyed to work_orders), not **commercial** (keyed to SO/price snapshots). A canonical invoice should derive from committed SO lines.

---

## 10. Accounting Interface

### Recommended Model: B — External Integration

```
SENTRALOGIS (commercial authority)
    ↓
Financial Interface (ADR-064)
    ↓
ERP / Accounting System (external)
```

**Rationale:**
1. SENTRALOGIS is commercially authoritative, not financially authoritative
2. `fin_financial_ledger_entries` exists but is DEAD — signals intent for external integration
3. Event-outbox pattern (`event_outbox`) supports async integration
4. Multi-currency, tax, and reconciliation complexity favors external ERP
5. Avoid building a second accounting engine

---

## 11. Settlement Definition

| Concept | Definition |
|---------|------------|
| Commercial Commitment | SO price snapshot (5C-3) |
| Billing | Invoice generation from billable event |
| Invoice | Customer-facing charge document |
| Receivable | Customer obligation |
| Payable | Supplier obligation |
| Settlement | Payment reconciliation |
| Accounting Posting | Financial journal entry |

---

## 12. Multi-Currency

| Aspect | Current | Required |
|--------|---------|----------|
| Transaction currency | Explicit (ADR-062) | Preserved |
| Functional currency | IDR (implicit) | Explicit |
| Exchange rate | **UNDEFINED** | External authority |
| FX conversion | **NOT IMPLEMENTED** | External ERP |
| FX gain/loss | **UNDEFINED** | External ERP |

---

## 13. Tax

| Aspect | Current | Required |
|--------|---------|----------|
| Tax master | `md_taxes` (PPN 11%) | Reuse |
| Tax calculation | Invoice UI | Canonical service |
| Tax-inclusive/exclusive | **UNDEFINED** | Explicit |
| Withholding | **UNDEFINED** | External ERP |
| Tax jurisdiction | **UNDEFINED** | External ERP |

---

## 14. Currency / UOM / Rounding

| Aspect | Current | Status |
|--------|---------|--------|
| Currency explicit | YES (ADR-062) | PASS |
| UOM explicit | YES (ADR-062) | PASS |
| Rounding | HALF_UP (5C-2) | PASS |
| Precision | Currency-specific | PASS |
| Snapshot amount | Frozen (5C-3) | PASS |

---

## 15. Adjustments

| Adjustment | Current Model | Required Model |
|------------|---------------|----------------|
| Credit | **UNDEFINED** | Credit note |
| Debit | **UNDEFINED** | Debit note |
| Refund | **UNDEFINED** | Reversal |
| Price correction | Override (5C-4) | Pre-commit override |
| Billing correction | **UNDEFINED** | Amendment |
| FX adjustment | **UNDEFINED** | External ERP |

---

## 16. Reconciliation

| Required Key | Current Support |
|--------------|-----------------|
| tenant | YES |
| SO | YES |
| SO line | YES |
| shipment | YES |
| fulfillment | YES |
| invoice | YES (operational) |
| supplier invoice | **NO** |
| external document | **NO** |
| settlement | **NO** |
| payment | **NO** |

---

## 17. Idempotency & External Integration

| Requirement | Current Support |
|-------------|-----------------|
| external_reference | **NO** |
| idempotency_key | **NO** |
| outbox/event | YES (event_outbox) |
| retry | YES (event_outbox) |
| dead-letter | YES (event_dead_letter) |
| delivery status | PARTIAL (is_published) |
| acknowledgement | **NO** |

---

## 18. Immutability & Audit

| Object | Immutable After |
|--------|-----------------|
| Price Snapshot | SO commitment (5C-3) |
| Invoice | Issuance |
| Financial Posting | Posting |
| Settlement | Reconciliation |

---

## 19. Tenant / Security Forensics

| Check | Status |
|-------|--------|
| IdentityContext authoritative | YES |
| RLS on financial tables | PARTIAL (md_taxes only) |
| No client tenant authority | PASS |
| Browser-direct financial mutation | NOT TESTED |

---

## 20. Legacy Financial Structures

| Structure | Classification | Action |
|-----------|---------------|--------|
| `invoices` | Legacy — ADAPTER | Retain temporarily |
| `invoice_lines` | Legacy — ADAPTER | Retain temporarily |
| `fin_financial_ledger_entries` | CANONICAL — DEAD | Future activation |
| `md_taxes` | CANONICAL | Reuse |
| `finance_coa` | CANONICAL | Reuse |
| `event_outbox` | CANONICAL | Reuse for integration |

---

## 21. Cross-Domain Lineage

```
Quote → SO → SO Line → Price Snapshot → Fulfillment → Billable Event → Invoice → AR/AP → Settlement → Accounting
```

| Relationship | Cardinality |
|--------------|-------------|
| SO → SO Line | 1:N |
| SO Line → Price Snapshot | 1:1 |
| SO Line → Fulfillment | 1:N |
| Fulfillment → Billable Event | 1:1 |
| Billable Event → Invoice | 1:N |
| Invoice → AR | 1:1 |
| Invoice → AP | 1:1 |
| AR → Settlement | 1:N |
| AP → Settlement | 1:N |

---

## 22. Architecture Decision Matrix

| Decision | Current State | Classification | Proposed Resolution | ADR |
|----------|---------------|----------------|---------------------|-----|
| Financial authority | **GAP** | C | External ERP integration | 064 |
| Settlement authority | **GAP** | C | External ERP integration | 064 |
| Invoice authority | Operational | C | Commercial-keyed invoices | 064 |
| AR/AP authority | **GAP** | C | External ERP integration | 064 |
| SELL settlement | **GAP** | C | External ERP integration | 064 |
| BUY settlement | **GAP** | C | External ERP integration | 064 |
| Billable event | **GAP** | C | Fulfillment/execution milestone | 064 |
| Invoice boundary | Operational | C | Commercial-keyed | 064 |
| Payment boundary | **GAP** | D | External ERP | Future |
| Accounting boundary | DEAD | C | External ERP integration | 064 |
| External ERP interface | **GAP** | C | Event-outbox integration | 064 |
| Multi-currency settlement | **GAP** | D | External ERP | Future |
| FX authority | **GAP** | D | External ERP | Future |
| Tax authority | `md_taxes` | B | Reuse canonical | 062 |
| Credit/debit adjustment | **GAP** | D | Future phase | Future |
| Reversal | **GAP** | D | Future phase | Future |
| Reconciliation | **GAP** | D | External ERP | Future |
| Idempotency | **GAP** | C | Event-outbox pattern | 064 |
| Financial immutability | **GAP** | C | Post-posting immutable | 064 |
| Audit | **GAP** | C | Append-only | 064 |
| Tenant isolation | PARTIAL | B | Server-derived | 057 |

**Legend:** A = Governed, B = Derivable, C = Decision required, D = Future

---

## 23. Required ADR Analysis

| ADR | Action | Scope |
|-----|--------|-------|
| ADR-064 | **RATIFY** | Financial Settlement Interface |
| **ADR-067** | **NEW** | Billable Event Contract |
| **ADR-068** | **NEW** | Invoice Authority |

---

## 24. Implementation Readiness

```
Implementation: NOT AUTHORIZED
```

---

## PHASE 5C-5 DISCOVERY FINAL GATE

```
==================================================
PHASE 5C-5 DISCOVERY FINAL GATE
==================================================

Phase:
5C-5 — Financial Settlement & Accounting Interface

Mode:
DISCOVERY ONLY

Implementation:
NOT EXECUTED

ADR-059:
RATIFIED

ADR-061:
RATIFIED

ADR-062:
RATIFIED

ADR-063:
RATIFIED

ADR-065:
RATIFIED

ADR-066:
RATIFIED

ADR-064:
PROPOSED

Commitment Boundary:
PASS

Override Boundary:
PASS (5C-4)

Authorization:
FINDING — no financial permissions

Auditability:
FINDING — no financial audit trail

Snapshot Integrity:
PASS

BUY / SELL:
FINDING — no settlement path

Currency:
PASS (ADR-062)

UOM:
PASS (ADR-062)

Margin:
FINDING — not calculated

Tenant Isolation:
PASS

Legacy Boundary:
FINDING — operational invoices

Concurrency:
FINDING — not handled

Idempotency:
FINDING — not implemented

Architecture Decision:
YELLOW

Implementation Authorization:
NOT AUTHORIZED

5C-6:
NOT AUTHORIZED

IMPLEMENTATION HARD STOP:
YES
==================================================
```

---

**END OF PHASE 5C-5 DISCOVERY REPORT**
