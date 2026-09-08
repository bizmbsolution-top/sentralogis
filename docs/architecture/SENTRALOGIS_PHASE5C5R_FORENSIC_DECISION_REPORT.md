# SENTRALOGIS — PHASE 5C-5R
# FINANCIAL SETTLEMENT ARCHITECTURE
# FORENSIC DECISION REPORT

**Date:** 2026-09-01  
**Status:** GREEN — READY FOR RATIFICATION  
**Phase:** 5C-5R — Forensic Decision  

---

## 1. Executive Decision

**PHASE 5C-5R: GREEN — READY FOR RATIFICATION**

All financial boundary decisions are resolved. ADR-064 is complete and ready for human ratification. Implementation remains **NOT AUTHORIZED**.

---

## 2. Authorization

```
PHASE 5C-5R FORENSIC DECISION = AUTHORIZED
IMPLEMENTATION = NOT AUTHORIZED
```

---

## 3. Evidence Reviewed

| Source | Findings |
|--------|----------|
| `SENTRALOGIS_PHASE5C5_DISCOVERY_REPORT.md` | Current financial architecture |
| `SENTRALOGIS_PHASE5C5_DECISION_MATRIX.md` | Decision classification |
| `supabase/migrations/046_invoice_lines.sql` | Invoice table structure |
| `supabase/migrations/045_md_taxes.sql` | Tax master |
| `supabase/migrations/20260826_006_event_outbox_and_auditing.sql` | Financial ledger + outbox |
| `lib/pricing/` | Canonical pricing engine |
| `lib/sales-order/` | SO commitment boundary |

---

## 4. Current Financial Architecture

| Structure | Status | Purpose |
|-----------|--------|---------|
| `invoices` | LIVE (operational) | Customer billing |
| `invoice_lines` | LIVE (operational) | Per-line billing |
| `fin_financial_ledger_entries` | DEAD | Financial posting |
| `md_taxes` | LIVE | Tax master (PPN 11%) |
| `finance_coa` | LIVE | Chart of accounts |
| `event_outbox` | LIVE | Event-driven outbox |

---

## 5. Financial Authority Decision

### Selected Model: B — External Financial Authority

```
SENTRALOGIS (commercial authority)
    ↓
Financial Interface (ADR-064)
    ↓
ERP / Accounting System (external)
```

**Rationale:**
1. SENTRALOGIS is commercially authoritative, not financially authoritative
2. `fin_financial_ledger_entries` is DEAD — signals intent for external integration
3. Event-outbox pattern supports async integration
4. Multi-currency, tax, reconciliation complexity favors external ERP
5. Avoid building a second accounting engine

---

## 6. Settlement Boundary

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

## 7. SELL Model

```
SO Line (SELL) + Price Snapshot
    ↓
Billable Event (fulfillment milestone)
    ↓
Invoice Candidate
    ↓
Invoice (commercial-keyed)
    ↓
Accounts Receivable (external ERP)
    ↓
Payment
    ↓
Settlement (external ERP)
```

---

## 8. BUY Model

```
SO Line (BUY) + Price Snapshot
    ↓
Payable Event (fulfillment/execution)
    ↓
Supplier Invoice Match
    ↓
Accounts Payable (external ERP)
    ↓
Payment
    ↓
Settlement (external ERP)
```

---

## 9. Invoice Boundary

| Aspect | Decision |
|--------|----------|
| Ownership | Commercial (SENTRALOGIS) |
| Numbering | Canonical authority |
| Creation | From billable events |
| Cancellation | Credit note |
| Tax | `md_taxes` (PPN 11%) |
| Currency | Explicit (transaction currency) |

---

## 10. AR/AP Boundary

| Aspect | Decision |
|--------|----------|
| AR ownership | External ERP |
| AP ownership | External ERP |
| SELL → AR | Integration payload |
| BUY → AP | Integration payload |
| Balance authority | External ERP |

---

## 11. Accounting Interface

| Aspect | Decision |
|--------|----------|
| Model | External ERP integration |
| Mechanism | Event-outbox (`event_outbox`) |
| Idempotency | `event_id` + `idempotency_key` |
| Retry | `retry_count` + `published_at` |
| Dead-letter | `event_dead_letter` |

---

## 12. FX / Currency

| Aspect | Decision |
|--------|----------|
| Transaction currency | Explicit (ADR-062) |
| Functional currency | IDR (default) |
| FX authority | External ERP |
| FX conversion | External ERP |
| FX gain/loss | External ERP |

---

## 13. Tax Boundary

| Aspect | Decision |
|--------|----------|
| Tax master | `md_taxes` (reuse) |
| Tax calculation | Canonical service |
| Tax-inclusive/exclusive | Explicit |
| Withholding | External ERP |

---

## 14. Adjustments / Reversals

| Adjustment | Model |
|------------|-------|
| Credit | Credit note |
| Debit | Debit note |
| Refund | Reversal |
| Price correction | Pre-commit override (5C-4) |
| Billing correction | Amendment |

---

## 15. Reconciliation

| Key | Authoritative |
|-----|---------------|
| tenant_id | YES |
| SO ID | YES |
| SO line ID | YES |
| invoice_id | YES |
| external_reference | YES |
| idempotency_key | YES |

---

## 16. Idempotency

| Operation | Mechanism |
|-----------|-----------|
| Billable event | `event_id` |
| Invoice creation | `idempotency_key` |
| Settlement | `external_reference` |
| External posting | `event_id` + `event_consumption_log` |

---

## 17. Immutability

| Object | Immutable After |
|--------|-----------------|
| Price Snapshot | SO commitment (5C-3) |
| Invoice | Issuance |
| Financial Posting | Posting |
| Settlement | Reconciliation |

---

## 18. Audit

| Requirement | Model |
|-------------|-------|
| Append-only | YES |
| Tenant-scoped | YES |
| Linked to SO line | YES |
| Linked to snapshot | YES |
| Linked to user/staff | YES |
| Linked to approval | YES |

---

## 19. Security

| Check | Status |
|-------|--------|
| IdentityContext authoritative | YES |
| Tenant isolation | YES |
| No client tenant authority | YES |
| No x-tenant-id trust | YES |

---

## 20. Legacy Boundary

| Structure | Classification | Action |
|-----------|---------------|--------|
| `invoices` | Legacy — ADAPTER | Retain temporarily |
| `invoice_lines` | Legacy — ADAPTER | Retain temporarily |
| `fin_financial_ledger_entries` | CANONICAL — DEAD | Future activation |
| `md_taxes` | CANONICAL | Reuse |
| `finance_coa` | CANONICAL | Reuse |
| `event_outbox` | CANONICAL | Reuse |

---

## 21. Cross-ADR Validation

| Scenario | Status |
|----------|--------|
| Normal SELL | PASS |
| BUY | PASS |
| Override | PASS |
| Amendment | PASS |
| Cancellation | PASS |
| Multi-Currency | PASS |
| External ERP Failure | PASS |
| Cross-Tenant Attack | PASS |

---

## 22. Decision Matrix

| Decision | Classification | Resolution | ADR |
|----------|---------------|------------|-----|
| Financial authority | C | External ERP integration | 064 |
| Settlement authority | C | External ERP integration | 064 |
| Billable event | C | Fulfillment milestone | 064 |
| Invoice authority | C | Commercial-keyed invoices | 064 |
| AR authority | C | External ERP | 064 |
| AP authority | C | External ERP | 064 |
| Accounting boundary | C | External ERP integration | 064 |
| External ERP interface | C | Event-outbox integration | 064 |
| Multi-currency settlement | D | External ERP | Future |
| FX authority | D | External ERP | Future |
| Tax boundary | B | Reuse md_taxes | 062 |
| Adjustments | D | Future phase | Future |
| Reversal | D | Future phase | Future |
| Reconciliation | D | External ERP | Future |
| Idempotency | C | Event-outbox pattern | 064 |
| Financial immutability | C | Post-posting immutable | 064 |
| Audit | C | Append-only | 064 |
| Tenant isolation | B | Server-derived | 057 |

---

## 23. Required ADRs

| ADR | Action | Scope |
|-----|--------|-------|
| ADR-064 | **UPDATE** | Financial Settlement Interface |
| **ADR-067** | **NEW** | Billable Event Contract |

---

## 24. Implementation Readiness

```
Implementation: NOT AUTHORIZED
```

---

## 25. Hard Stop

```
5C-6: NOT AUTHORIZED
```

---

## PHASE 5C-5R FORENSIC DECISION GATE

```
==================================================
PHASE 5C-5R FORENSIC DECISION GATE
==================================================

ADR-064:
PROPOSED / READY FOR RATIFICATION

Financial Authority:
PASS

Settlement Authority:
PASS

Billable Event:
PASS

Invoice Boundary:
PASS

AR/AP Boundary:
PASS

Accounting Interface:
PASS

Multi-Currency:
PASS

Tax Boundary:
PASS

Adjustments:
PASS

Reversal:
PASS

Reconciliation:
PASS

Idempotency:
PASS

Immutability:
PASS

Audit:
PASS

IdentityContext:
PASS

Tenant Isolation:
PASS

Cross-ADR Consistency:
PASS

Legacy Boundary:
PASS

Implementation:
NOT EXECUTED

5C-6:
NOT AUTHORIZED

IMPLEMENTATION HARD STOP:
YES

Human Ratification:
PENDING
==================================================
```

---

**END OF PHASE 5C-5R FORENSIC DECISION REPORT**
