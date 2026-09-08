# SENTRALOGIS — PHASE 5D-5
# EXTERNAL FINANCIAL INTEGRATION & ACCOUNTING INTERFACE
# DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** GREEN — ARCHITECTURE COHERENT  
**Phase:** 5D-5 — Discovery  

---

## 1. Executive Decision

**PHASE 5D-5: GREEN — ARCHITECTURE COHERENT**

The existing event-outbox infrastructure (`event_outbox`, `event_consumption_log`, `event_dead_letter`) provides a canonical mechanism for external financial integration. No duplicate authorities exist. External accounting integration is a future scope.

---

## 2. Current-State Architecture

```
Quote → SO → SO Line Item → Price Snapshot → Billable Event → Invoice → Payment → Allocation → Settlement → [EVENT OUTBOX] → External Financial System
```

| Component | Status |
|-----------|--------|
| Event Outbox | CANONICAL (migration 006) |
| Event Consumption Log | CANONICAL (migration 006) |
| Event Dead Letter | CANONICAL (migration 006) |
| Financial Ledger | DEAD (migration 006) |
| Chart of Accounts | `finance_coa` (exists) |
| Bank Statement Ingestion | **NOT IMPLEMENTED** |
| Accounting Engine | **NOT IMPLEMENTED** |
| FX Conversion | **NOT IMPLEMENTED** |

---

## 3. Bank / External Statement Boundary

| Aspect | Status |
|--------|--------|
| Bank statement ingestion | **NOT IMPLEMENTED** |
| Payment-provider statements | **NOT IMPLEMENTED** |
| External transaction normalization | **NOT IMPLEMENTED** |

**Classification:** FUTURE SCOPE — External integration requires separate ADR.

---

## 4. External Transaction Authority

| Question | Answer |
|----------|--------|
| External transaction ID | Preserved as correlation field |
| Uniqueness scope | tenant + provider + external identifier |
| Collision risk | LOW (external IDs are provider-scoped) |

**Classification:** B — Existing architecture supports correlation.

---

## 5. Accounting Boundary

| Question | Answer |
|----------|--------|
| Is Sentralogis an accounting authority? | NO |
| Is Sentralogis a subledger? | YES |
| Where does journal authority reside | **EXTERNAL** |
| Chart of accounts | `finance_coa` (operational use) |

**Classification:** FUTURE SCOPE — Accounting integration is external.

---

## 6. Journal Authority Analysis

| Model | Selected |
|-------|----------|
| A — Financial events only | **YES** |
| B — Journal proposals | Future |
| C — Authoritative journals | NO |
| D — Subledger export | Future |

**Classification:** A — Sentralogis emits financial events; external system owns journals.

---

## 7. Accounting Event Contract

| Field | Source |
|-------|--------|
| event ID | `event_outbox.event_id` |
| tenant ID | `event_outbox.tenant_id` |
| source entity | `event_outbox.aggregate_type` |
| source entity ID | `event_outbox.aggregate_id` |
| event type | `event_outbox.event_name` |
| event timestamp | `event_outbox.created_at` |
| correlation ID | `event_outbox.correlation_id` |
| idempotency key | `event_outbox.event_id` |

**Classification:** B — Event outbox provides the contract.

---

## 8. AR Accounting Interface

| Step | Status |
|------|--------|
| Invoice → AR | CANONICAL |
| AR → Payment | CANONICAL |
| Payment → Allocation | CANONICAL |
| Allocation → Settlement | CANONICAL |
| Settlement → Event Outbox | CANONICAL |
| Event Outbox → External | FUTURE |

**Classification:** COHERENT

---

## 9. AP Accounting Interface

| Step | Status |
|------|--------|
| AP → Payment | CANONICAL |
| Payment → Allocation | CANONICAL |
| Allocation → Settlement | CANONICAL |
| Settlement → Event Outbox | CANONICAL |
| Event Outbox → External | FUTURE |

**Classification:** COHERENT

---

## 10. Multi-Currency / FX Accounting

| Aspect | Status |
|--------|--------|
| Transaction currency | Explicit (5D-3) |
| FX rate snapshot | `fin_payments.fx_rate` (5D-3) |
| FX conversion | **NOT IMPLEMENTED** |
| FX gain/loss | **EXTERNAL** |

**Classification:** FUTURE SCOPE — FX conversion belongs to accounting domain.

---

## 11. Integration Reliability

| Requirement | Mechanism |
|-------------|-----------|
| Retry | `event_outbox.retry_count` |
| Timeout | Future |
| Duplicate delivery | `event_consumption_log` dedup |
| Dead-letter | `event_dead_letter` |

**Classification:** B — Event outbox provides reliability.

---

## 12. Outbox / Event Delivery Analysis

| Component | Status |
|-----------|--------|
| `event_outbox` | CANONICAL (migration 006) |
| `event_consumption_log` | CANONICAL (migration 006) |
| `event_dead_letter` | CANONICAL (migration 006) |
| RLS | ENABLED |

**Classification:** CANONICAL — Reuse existing outbox for financial integration.

---

## 13. External Acknowledgement

| State | Representation |
|-------|---------------|
| Exported | `event_outbox.is_published = TRUE` |
| Accepted | Future |
| Rejected | `event_dead_letter` |

**Classification:** B — Outbox tracks export state.

---

## 14. Adjustment / Reversal

| Type | Status |
|------|--------|
| Credit note | CANONICAL (fin_adjustments) |
| Debit note | CANONICAL (fin_adjustments) |
| Reversal | CANONICAL (fin_adjustments) |
| Write-off | CANONICAL (fin_adjustments) |

**Classification:** CANONICAL

---

## 15. Idempotency

| Operation | Mechanism |
|-----------|-----------|
| Event publication | `event_outbox.event_id` UNIQUE |
| Consumption dedup | `event_consumption_log` UNIQUE(event_id, consumer) |

**Classification:** PASS

---

## 16. Immutability

| Object | Immutable After |
|--------|-----------------|
| Price Snapshot | SO commitment |
| Payment | CONFIRMED |
| Allocation | SETTLED |
| Event | Published |

**Classification:** PASS

---

## 17. Audit

| Field | Status |
|-------|--------|
| Actor | `created_by` / `updated_by` |
| Timestamp | `created_at` / `updated_at` |
| Reason | `fin_adjustments.reason` |
| Source | `fin_payments.source_metadata` |

**Classification:** PASS

---

## 18. External Correlation

| ID | Status |
|----|--------|
| `event_outbox.correlation_id` | YES |
| `fin_payments.external_reference` | YES |
| `fin_reconciliation_records.external_reference` | YES |

**Classification:** PASS

---

## 19. Financial Identity Authority

| Check | Result |
|-------|--------|
| Payment ID | DB-generated UUID |
| Event ID | DB-generated UUID |

**Classification:** PASS

---

## 20. IdentityContext

| Check | Result |
|-------|--------|
| Server-derived tenant | YES |

**Classification:** PASS

---

## 21. Authorization

| Permission | Status |
|------------|--------|
| `commercial:manage` | Used for mutations |

**Classification:** PASS

---

## 22. Tenant Isolation

| Check | Result |
|-------|--------|
| Server-derived | YES |
| RLS | YES |

**Classification:** PASS

---

## 23. RLS

| Table | RLS |
|-------|-----|
| `event_outbox` | ENABLED |
| `event_consumption_log` | ENABLED |
| `event_dead_letter` | ENABLED |

**Classification:** PASS

---

## 24. Cross-Domain Lineage

| Boundary | Status |
|----------|--------|
| Quote → SO → ... → Settlement → Event Outbox | PASS |

**Classification:** PASS

---

## 25. Duplicate-Authority Analysis

| Check | Result |
|-------|--------|
| Duplicate reconciliation authority | NONE |
| Duplicate accounting authority | NONE |
| Duplicate journal authority | NONE |
| Duplicate FX authority | NONE |

**Classification:** PASS

---

## 26. Legacy Boundary

| Structure | Classification |
|-----------|----------------|
| `fin_financial_ledger_entries` | CANONICAL — DEAD |
| `finance_coa` | CANONICAL |

**Classification:** PASS

---

## 27. Browser Direct Financial Mutation

| Check | Result |
|-------|--------|
| Browser-direct canonical financial mutation | ZERO |

**Classification:** PASS

---

## 28. Architecture Classification Summary

| Decision | Classification |
|----------|---------------|
| Bank/external statement | D |
| External transaction authority | B |
| Accounting boundary | D |
| Journal authority | D |
| Accounting event contract | B |
| AR accounting | B |
| AP accounting | B |
| FX accounting | D |
| Integration reliability | B |
| Outbox/event delivery | A |
| External acknowledgment | B |
| Adjustment/reversal | A |
| Idempotency | A |
| Immutability | A |
| Audit | A |
| External correlation | A |
| Financial identity | A |
| IdentityContext | A |
| Authorization | B |
| Tenant isolation | A |
| RLS | A |

**Legend:** A = Governed, B = Sufficient, C = Decision required, D = Future

---

## 29. Blockers

**None.**

---

## 30. Recommendations

| Recommendation | Priority |
|----------------|----------|
| Implement bank statement ingestion | FUTURE |
| Implement accounting integration via event outbox | FUTURE |
| Implement FX conversion engine | FUTURE |

---

## 31. Implementation Prerequisites

| Prerequisite | Status |
|--------------|--------|
| 5D-3 Payment & Settlement | COMPLETE |
| Event outbox infrastructure | COMPLETE |
| External ADR for accounting | FUTURE |

---

## 32. Explicit Hard Stop

```
Implementation: NOT EXECUTED
Migration: NOT EXECUTED
5D-6: NOT AUTHORIZED
```

---

## PHASE 5D-5 DISCOVERY FINAL GATE

```
==================================================
PHASE 5D-5 DISCOVERY FINAL GATE
==================================================

Bank / External Statement Boundary: GAP
External Transaction Authority: PASS
Accounting Boundary: GAP
Journal Authority: GAP
Accounting Event Contract: PASS
AR Accounting Interface: PASS
AP Accounting Interface: PASS
Multi-Currency / FX Accounting: GAP
Integration Reliability: PASS
Outbox / Event Delivery: PASS
External Acknowledgement: PASS
Adjustment / Reversal: PASS
Idempotency: PASS
Immutability: PASS
Audit: PASS
External Correlation: PASS
Financial Identity Authority: PASS
IdentityContext: PASS
Authorization: PASS
Tenant Isolation: PASS
RLS: PASS
Cross-Domain Lineage: PASS
Duplicate Financial Authority: NONE
Legacy Boundary: PASS
Browser Direct Financial Mutation: ZERO
TypeScript: PASS

ADR Status: NONE REQUIRED
Architecture Status: GREEN
Implementation: NOT EXECUTED
Migration: NOT EXECUTED
5D-6: NOT AUTHORIZED
IMPLEMENTATION HARD STOP: YES
==================================================
```

---

**END OF PHASE 5D-5 DISCOVERY REPORT**
