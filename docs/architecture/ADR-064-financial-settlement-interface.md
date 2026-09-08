# ADR-064 — Financial Settlement Interface

**Status:** RATIFIED (Phase 5C-5R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Depends on:** ADR-061 (Commercial Charge Model), ADR-066 (Commitment Boundary)  

---

## 1. Context

Phase 5C-5 discovered that no canonical settlement engine exists. SENTRALOGIS is commercially authoritative but not financially authoritative. The `fin_financial_ledger_entries` table is DEAD (zero writers), signaling intent for external integration. Existing invoices are operational-keyed (work_order), not commercial-keyed (SO/price snapshot).

## 2. Problem

How should SENTRALOGIS boundary commercial pricing truth to external financial systems without building a competing accounting engine?

## 3. Decision

**Model B — SENTRALOGIS exposes a financial interface for external ERP/accounting consumption.**

```
SENTRALOGIS (commercial authority)
    ↓
Financial Interface (ADR-064)
    ↓
ERP / Accounting System (external)
```

## 4. Financial Authority

| Domain | Owner |
|--------|-------|
| Commercial pricing | SENTRALOGIS (canonical) |
| Price snapshots | SENTRALOGIS (5C-3) |
| SO commitment | SENTRALOGIS (5C-3) |
| Invoices | SENTRALOGIS (commercial-keyed) |
| AR/AP | External ERP |
| Settlement | External ERP |
| Accounting | External ERP |

## 5. Settlement Authority

| Concept | Owner |
|---------|-------|
| Commercial Commitment | SENTRALOGIS (5C-3) |
| Billing | SENTRALOGIS (invoice generation) |
| Invoice | SENTRALOGIS (commercial-keyed) |
| Receivable | External ERP |
| Payable | External ERP |
| Settlement | External ERP |
| Accounting Posting | External ERP |

## 6. Billable Event

A **Billable Event** is a fulfillment milestone that creates a SELL-side billable obligation.

| Trigger | Billable? |
|---------|-----------|
| SO confirmation | NO |
| Fulfillment creation | NO |
| Fulfillment completion | YES |
| Shipment departure | YES |
| Shipment arrival | YES |
| POD | YES |
| Milestone completion | YES |
| Manual billing approval | YES |

## 7. SELL Boundary

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

## 8. BUY Boundary

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

## 9. Invoice Boundary

| Aspect | Definition |
|--------|------------|
| Ownership | Commercial (SENTRALOGIS) |
| Numbering | Canonical authority |
| Creation | From billable events |
| Cancellation | Credit note |
| Tax | `md_taxes` (PPN 11%) |
| Currency | Explicit (transaction currency) |
| Immutability | After issuance |

## 10. AR/AP Boundary

| Aspect | Definition |
|--------|------------|
| AR ownership | External ERP |
| AP ownership | External ERP |
| SELL → AR | Integration payload |
| BUY → AP | Integration payload |
| Balance authority | External ERP |

## 11. Accounting Interface

| Aspect | Definition |
|--------|------------|
| Model | External ERP integration |
| Mechanism | Event-outbox (`event_outbox`) |
| Idempotency | `event_id` + `idempotency_key` |
| Retry | `retry_count` + `published_at` |
| Dead-letter | `event_dead_letter` |

### 11.1 Interface Contract

| Field | Purpose |
|-------|---------|
| `charge_id` | Unique charge identifier |
| `customer_id` | Who is billed |
| `amount` | Committed amount |
| `currency` | Transaction currency |
| `charge_type` | SELL, BUY, SURCHARGE, TAX |
| `source_transaction` | SO or Quote reference |
| `tax_applicability` | Whether tax applies |
| `settlement_status` | PENDING, BILLED, PAID |
| `external_reference` | External system reference |
| `idempotency_key` | Duplicate prevention |

## 12. Multi-Currency Boundary

| Aspect | Definition |
|--------|------------|
| Transaction currency | Explicit (ADR-062) |
| Functional currency | IDR (default) |
| FX authority | External ERP |
| FX conversion | External ERP |
| FX gain/loss | External ERP |

## 13. Tax Boundary

| Aspect | Definition |
|--------|------------|
| Tax master | `md_taxes` (reuse) |
| Tax calculation | Canonical service |
| Tax-inclusive/exclusive | Explicit |
| Withholding | External ERP |

## 14. Adjustment/Reversal Model

| Adjustment | Model |
|------------|-------|
| Credit | Credit note |
| Debit | Debit note |
| Refund | Reversal |
| Price correction | Pre-commit override (5C-4) |
| Billing correction | Amendment |

## 15. Reconciliation

| Key | Authoritative |
|-----|---------------|
| tenant_id | YES |
| SO ID | YES |
| SO line ID | YES |
| invoice_id | YES |
| external_reference | YES |
| idempotency_key | YES |

## 16. Idempotency

| Operation | Mechanism |
|-----------|-----------|
| Billable event | `event_id` |
| Invoice creation | `idempotency_key` |
| Settlement | `external_reference` |
| External posting | `event_id` + `event_consumption_log` |

## 17. Immutability

| Object | Immutable After |
|--------|-----------------|
| Price Snapshot | SO commitment (5C-3) |
| Invoice | Issuance |
| Financial Posting | Posting |
| Settlement | Reconciliation |

## 18. Audit

| Requirement | Model |
|-------------|-------|
| Append-only | YES |
| Tenant-scoped | YES |
| Linked to SO line | YES |
| Linked to snapshot | YES |
| Linked to user/staff | YES |
| Linked to approval | YES |

## 19. Tenant/Security Implications

| Requirement | Status |
|-------------|--------|
| IdentityContext authoritative | YES |
| Tenant isolation | YES |
| No client tenant authority | YES |
| No x-tenant-id trust | YES |

## 20. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| SENTRALOGIS owns accounting | Violates separation of concerns; builds second engine |
| Settlement reads rate master directly | Bypasses charge commitment |
| No interface contract | Ambiguous handoff |

## 21. Consequences

1. Clear handoff between Pricing and Settlement.
2. Settlement consumes committed charges, not raw rates.
3. Future Settlement implementation has clear input contract.
4. Event-outbox pattern enables reliable async integration.

## 22. Dependencies

| ADR | Status |
|-----|--------|
| ADR-059 | RATIFIED |
| ADR-061 | RATIFIED |
| ADR-062 | RATIFIED |
| ADR-063 | RATIFIED |
| ADR-065 | RATIFIED |
| ADR-066 | RATIFIED |

## 23. Migration Implications

1. `fin_financial_ledger_entries` remains DEAD until external integration.
2. `invoices` table migrated from operational-keyed to commercial-keyed.
3. Event-outbox pattern extended for financial events.
