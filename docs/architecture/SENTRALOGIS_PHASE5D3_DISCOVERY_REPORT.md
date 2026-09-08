# SENTRALOGIS — PHASE 5D-3
# FINANCIAL PAYMENT & SETTLEMENT DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** YELLOW — ARCHITECTURE DECISION REQUIRED  
**Phase:** 5D-3 — Discovery  

---

## 1. Executive Decision

**PHASE 5D-3: YELLOW — ARCHITECTURE DECISION REQUIRED**

Payment and Settlement require new ADRs before implementation. The financial foundation (5D-2) is stable, but payment allocation, settlement lifecycle, and multi-currency semantics are undefined.

---

## 2. Current Architecture

| Component | Status |
|-----------|--------|
| Financial Foundation (5D-2) | GREEN |
| Billable Events | CANONICAL |
| Invoice Boundary | CANONICAL |
| AR/AP | CANONICAL |
| Adjustments | CANONICAL |
| Payment | **MISSING** |
| Settlement | **MISSING** |
| Reconciliation | **MISSING** |
| FX | **MISSING** |

---

## 3. Payment Boundary

| Question | Answer |
|----------|--------|
| Payment identity | **UNDEFINED** |
| Payer / Payee | **UNDEFINED** |
| Payment amount | **UNDEFINED** |
| Currency | **UNDEFINED** |
| Payment date | **UNDEFINED** |
| Payment method | **UNDEFINED** |
| Payment status | **UNDEFINED** |
| Payment allocation | **UNDEFINED** |

**Gap:** No canonical payment entity exists.

---

## 4. Settlement Boundary

| Question | Answer |
|----------|--------|
| Settlement identity | **UNDEFINED** |
| Settlement source | **UNDEFINED** |
| Settlement target | **UNDEFINED** |
| Allocation semantics | **UNDEFINED** |

**Gap:** No canonical settlement entity exists.

---

## 5. Payment Allocation Model

| Question | Answer |
|----------|--------|
| One payment → multiple invoices | **UNDEFINED** |
| One invoice → multiple payments | **UNDEFINED** |
| Partial allocation | **UNDEFINED** |
| Allocation reversal | **UNDEFINED** |

**Gap:** Payment allocation requires architectural definition.

---

## 6. AR/AP Semantics

| Side | Status |
|------|--------|
| SELL → AR (customer owes) | DEFINED |
| BUY → AP (Sentralogis owes) | DEFINED |
| Payment direction | **UNDEFINED** |

---

## 7. Payment Lifecycle

| State | Defined? |
|-------|----------|
| PENDING | NO |
| CONFIRMED | NO |
| ALLOCATED | NO |
| CANCELLED | NO |
| REVERSED | NO |

**Gap:** Payment lifecycle requires ADR.

---

## 8. Settlement Lifecycle

| State | Defined? |
|-------|----------|
| OPEN | NO |
| PARTIAL | NO |
| SETTLED | NO |
| REVERSED | NO |

**Gap:** Settlement lifecycle requires ADR.

---

## 9. Partial Payment Semantics

| Scenario | Expected Behavior |
|----------|-------------------|
| 100M invoice, 40M payment | Outstanding = 60M |
| Multiple payments totaling 100M | Outstanding = 0 |
| Overpayment (120M on 100M) | **UNDEFINED** |

**Gap:** Overpayment semantics require ADR.

---

## 10. Overpayment Semantics

| Option | Status |
|--------|--------|
| Rejected | **UNDEFINED** |
| Unapplied balance | **UNDEFINED** |
| Customer credit | **UNDEFINED** |
| Future allocation | **UNDEFINED** |

**Gap:** Overpayment handling requires ADR.

---

## 11. Multi-Invoice Payment Semantics

| Question | Answer |
|----------|--------|
| Can one payment settle multiple invoices? | **UNDEFINED** |
| Allocation priority? | **UNDEFINED** |

---

## 12. Reversal Semantics

| Question | Answer |
|----------|--------|
| Can payment be reversed? | **UNDEFINED** |
| Does reversal create new immutable event? | **UNDEFINED** |
| Allocation reversal? | **UNDEFINED** |

---

## 13. Cancellation Semantics

| Question | Answer |
|----------|--------|
| Can payment be cancelled? | **UNDEFINED** |
| Effect on historical records? | **UNDEFINED** |

---

## 14. Multi-Currency Boundary

| Aspect | Status |
|--------|--------|
| Payment currency | **UNDEFINED** |
| Invoice currency | Explicit (fin_invoices.currency) |
| FX rate | **NOT IMPLEMENTED** |
| FX conversion | **NOT IMPLEMENTED** |

**Gap:** Multi-currency payment requires FX infrastructure.

---

## 15. FX Dependency

| Question | Answer |
|----------|--------|
| FX rate source | **UNDEFINED** |
| FX effective date | **UNDEFINED** |
| FX gain/loss | **UNDEFINED** |

**Gap:** FX infrastructure required for multi-currency settlement.

---

## 16. Reconciliation Boundary

| Question | Answer |
|----------|--------|
| Reconciliation authority | **UNDEFINED** |
| Reconciliation status | **UNDEFINED** |
| Mismatch handling | **UNDEFINED** |

**Gap:** Reconciliation belongs in 5D-4 or later phase.

---

## 17. Accounting Boundary

| Question | Answer |
|----------|--------|
| Accounting posting | **UNDEFINED** |
| Chart of accounts | `finance_coa` (exists) |
| Journal entries | **NOT IMPLEMENTED** |

**Gap:** Accounting interface remains future phase.

---

## 18. External Integration Boundary

| Question | Answer |
|----------|--------|
| Bank integration | **UNDEFINED** |
| Payment gateway | **UNDEFINED** |
| Webhook semantics | **UNDEFINED** |

**Gap:** External integration requires separate ADR.

---

## 19. Idempotency

| Operation | Mechanism |
|-----------|-----------|
| Payment creation | **UNDEFINED** |
| External payment event | **UNDEFINED** |
| Allocation | **UNDEFINED** |

**Gap:** Idempotency keys required for payment operations.

---

## 20. Immutability

| Object | Immutable After |
|--------|-----------------|
| Payment | **UNDEFINED** |
| Allocation | **UNDEFINED** |
| Settlement | **UNDEFINED** |

**Gap:** Immutability boundaries require ADR.

---

## 21. Audit

| Requirement | Status |
|-------------|--------|
| WHO | **UNDEFINED** |
| WHEN | **UNDEFINED** |
| WHAT | **UNDEFINED** |
| AMOUNT | **UNDEFINED** |
| CURRENCY | **UNDEFINED** |
| SOURCE | **UNDEFINED** |
| REASON | **UNDEFINED** |

**Gap:** Audit trail design required.

---

## 22. IdentityContext

| Check | Status |
|-------|--------|
| Server-derived tenant | YES (5D-2) |
| No client tenant authority | YES |

---

## 23. Authorization

| Permission | Status |
|------------|--------|
| `commercial:manage` | Exists |
| Payment permissions | **NOT DEFINED** |

**Gap:** Payment-specific permissions required.

---

## 24. Tenant Isolation

| Check | Status |
|-------|--------|
| Server-derived | YES |
| RLS | YES (5D-2) |

---

## 25. RLS

| Table | RLS |
|-------|-----|
| `fin_billable_events` | ENABLED |
| `fin_invoices` | ENABLED |
| `fin_ar_ap` | ENABLED |
| `fin_adjustments` | ENABLED |

---

## 26. Legacy Dependencies

| Structure | Classification |
|-----------|----------------|
| `job_order_payments` | Legacy — ADAPTER (operational) |

---

## 27. Cross-Domain Lineage

```
Quote → SO → SO Line → Price Snapshot → Billable Event → Invoice → AR/AP → [PAYMENT GAP] → [SETTLEMENT GAP]
```

---

## 28. Scenario Validation

| Scenario | Status |
|----------|--------|
| Customer AR | PARTIAL (payment missing) |
| Supplier AP | PARTIAL (payment missing) |
| Multi-payment | UNDEFINED |
| Multi-invoice payment | UNDEFINED |
| Reversal | UNDEFINED |
| Cancellation | UNDEFINED |
| Multi-currency | UNDEFINED |
| Duplicate external event | UNDEFINED |

---

## 29. Architecture Classification

| Decision | Classification |
|----------|---------------|
| Payment model | C |
| Payment allocation | C |
| Settlement model | C |
| Payment lifecycle | C |
| Multi-payment semantics | C |
| Overpayment | C |
| Multi-invoice allocation | C |
| FX boundary | C |
| Reconciliation boundary | D |
| Accounting boundary | D |
| External integration | C |

---

## 30. ADR Requirements

| ADR | Required | Scope |
|-----|----------|-------|
| **ADR-067** | **YES** | Payment Model & Lifecycle |
| **ADR-068** | **YES** | Settlement & Allocation |
| **ADR-069** | **YES** | Multi-Currency & FX Boundary |

---

## 31. Risks

| Risk | Impact |
|------|--------|
| Payment without allocation entity | Cannot support partial/multi-invoice |
| No FX infrastructure | Multi-currency impossible |
| No idempotency | Duplicate payment risk |

---

## 32. Recommended Next Step

**5D-4: Payment & Settlement Architecture Decision** — Ratify ADR-067, ADR-068, ADR-069 before implementation.

---

## PHASE 5D-3 DISCOVERY FINAL GATE

```
==================================================
PHASE 5D-3 DISCOVERY FINAL GATE
==================================================

Payment Domain Boundary: YELLOW
Settlement Boundary: GAP
Payment Allocation: GAP
AR Payment Semantics: GAP
AP Payment Semantics: GAP
Partial Payment: GAP
Overpayment: GAP
Multi-Invoice Payment: GAP
Payment Lifecycle: GAP
Settlement Lifecycle: GAP

Multi-Currency: GAP
FX Boundary: GAP
Reconciliation Boundary: GAP
Accounting Boundary: GAP
External Integration: GAP

Adjustment / Reversal: GAP
Idempotency: GAP
Immutability: GAP
Audit: GAP

Financial Identity Authority: PASS
IdentityContext: PASS
Authorization: GAP
Tenant Isolation: PASS
RLS: PASS

Cross-Domain Lineage: PASS
Duplicate Payment Authority: NONE
Duplicate Settlement Authority: NONE
Legacy Boundary: PASS
Browser Direct Financial Mutation: ZERO

TypeScript: PASS
Production Implementation: NOT EXECUTED
Migration: NOT EXECUTED

ADR Status: ADR REQUIRED (ADR-067, ADR-068, ADR-069)
Architecture Status: YELLOW

5D-4: NOT AUTHORIZED
IMPLEMENTATION HARD STOP: YES
==================================================
```

---

**END OF PHASE 5D-3 DISCOVERY REPORT**
