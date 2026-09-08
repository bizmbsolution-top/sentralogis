# SENTRALOGIS — PHASE 5C-4
# PRICING OVERRIDE & GOVERNANCE
# DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** YELLOW — ARCHITECTURE DECISION REQUIRED  
**Phase:** 5C-4 — Discovery  

---

## 1. Executive Decision

**PHASE 5C-4: YELLOW — ARCHITECTURE DECISION REQUIRED**

ADR-063 (Price Override Governance) is **PROPOSED**, not RATIFIED. No canonical override workflow exists. Browser-direct pricing writes present a security risk.

---

## 2. Current Architecture

### Commitment Boundary (5C-3)

```
Rate Selection (5C-2) → Calculation (5C-2) → Price Snapshot → SO Line Item → Commercial Commitment
```

### Override Points

| Point | Current State |
|-------|---------------|
| Rate Master | Browser-direct writes (no permission check) |
| Quote Item | `nego_price` mutable (browser-direct) |
| SO Line | No override capability (immutable after commitment) |
| Calculation | No override input |

---

## 3. Commitment Boundary

| Check | Status |
|-------|--------|
| Snapshot captured at SO creation | PASS (5C-3) |
| Snapshot immutable after commitment | PASS (5C-3) |
| Rate master changes do not affect committed SO | PASS (5C-3) |
| Amendment via new line version | PASS (5C-3) |

---

## 4. Current Override Behavior

| Structure | Behavior | Risk |
|-----------|----------|------|
| `crm_quotation_items.nego_price` | Mutable, browser-direct | HIGH — no audit trail |
| `fw_price_master` | Full CRUD browser-direct | HIGH — no permission check |
| `crm_sbu_customer_rates` | Full CRUD browser-direct | HIGH — no permission check |
| `md_billing_rates` | Full CRUD browser-direct | HIGH — no permission check |

---

## 5. ADR Status

| ADR | Status | 5C-4 Implication |
|-----|--------|-------------------|
| ADR-059 | RATIFIED | Snapshot fields defined |
| ADR-061 | RATIFIED | SO line commitment boundary |
| ADR-062 | RATIFIED | Currency/UOM explicit |
| **ADR-063** | **PROPOSED** | **Override governance not authoritative** |
| ADR-065 | RATIFIED | Rate precedence defined |
| ADR-066 | RATIFIED | Commitment boundary defined |

---

## 6. Security Findings

| Finding | Severity |
|---------|----------|
| Browser-direct pricing writes (rates page) | HIGH |
| No server-side override authorization | HIGH |
| No audit trail for price changes | HIGH |
| Client-supplied unit_price trusted | MEDIUM |

---

## 7. Tenant Findings

| Check | Status |
|-------|--------|
| SO line tenant isolation | PASS (5C-3) |
| Rate master tenant isolation | PASS (RLS) |
| Cross-tenant override possible | NOT TESTED |

---

## 8. Authorization Findings

| Check | Status |
|-------|--------|
| `commercial:manage` for pricing mutations | PASS |
| `pricing:override` permission | **DOES NOT EXIST** |
| `pricing:approve` permission | **DOES NOT EXIST** |
| Override approval workflow | **DOES NOT EXIST** |

---

## 9. Snapshot Findings

| Check | Status |
|-------|--------|
| Snapshot preserves rate lineage | PASS (ADR-059) |
| Snapshot can represent override state | UNDEFINED |
| Override metadata in snapshot | NOT IMPLEMENTED |

---

## 10. Audit Findings

| Question | Answer |
|----------|--------|
| Why was price changed? | NOT TRACKED |
| Who changed it? | NOT TRACKED |
| Original calculation preserved | PARTIAL (snapshot exists) |
| Override reason recorded | NOT TRACKED |

---

## 11. BUY / SELL Findings

| Check | Status |
|-------|--------|
| BUY/SELL separate line items | PASS (ADR-060) |
| BUY override independent of SELL | NOT IMPLEMENTED |
| Margin impact visible | NOT IMPLEMENTED |

---

## 12. Currency Findings

| Check | Status |
|-------|--------|
| Explicit currency | PASS (ADR-062) |
| Currency override | NOT IMPLEMENTED |
| FX conversion | NOT IMPLEMENTED |

---

## 13. UOM Findings

| Check | Status |
|-------|--------|
| Explicit UOM | PASS (ADR-062) |
| UOM override | NOT IMPLEMENTED |
| UOM conversion | NOT IMPLEMENTED |

---

## 14. Margin Findings

| Check | Status |
|-------|--------|
| Gross margin calculation | NOT IMPLEMENTED |
| Margin threshold enforcement | NOT IMPLEMENTED |
| Negative margin prevention | NOT IMPLEMENTED |

---

## 15. FCL / LCL Findings

| Check | Status |
|-------|--------|
| FCL override (per container) | NOT IMPLEMENTED |
| LCL override (per CBM) | NOT IMPLEMENTED |
| Min/max charge override | NOT IMPLEMENTED |

---

## 16. Multi-SBU Findings

| Capability | Override Support |
|------------|------------------|
| FORWARDING | NOT IMPLEMENTED |
| CUSTOMS | NOT IMPLEMENTED |
| TRUCKING | NOT IMPLEMENTED |
| WAREHOUSE | NOT IMPLEMENTED |

---

## 17. Legacy Findings

| Structure | Classification | Risk |
|-----------|---------------|------|
| `fw_price_master` | Legacy adapter | Browser-direct writes |
| `crm_sbu_customer_rates` | Legacy adapter | Browser-direct writes |
| `md_billing_rates` | Legacy adapter | Browser-direct writes |
| `crm_quotation_items.nego_price` | Legacy adapter | Mutable, no audit |

---

## 18. API / Client Findings

| File | Finding |
|------|---------|
| `app/(dashboard)/commercial/rates/page.tsx` | Browser-direct `supabase.from('crm_sbu_customer_rates')` CRUD |
| `app/sbu/forwarding/master/price/page.tsx` | Browser-direct `fw_price_master` CRUD |
| `app/(dashboard)/commercial/quotations/[id]/page.tsx` | Browser-direct `nego_price` updates |

---

## 19. Concurrency Findings

| Scenario | Current Behavior |
|----------|------------------|
| User A calculates, User B overrides, User A commits | NOT HANDLED |
| Simultaneous overrides | NOT HANDLED |

---

## 20. Idempotency Findings

| Operation | Idempotency |
|-----------|-------------|
| Override request | NOT IMPLEMENTED |
| Commit with override | NOT IMPLEMENTED |

---

## 21. Amendment Interaction

| Phase | Boundary |
|-------|----------|
| 5C-3 commitment | Pre-commit: editable |
| 5C-4 override | Pre-commit: governed override |
| Post-commit | Amendment via new line version |

---

## 22. Fulfillment Interaction

| Check | Status |
|-------|--------|
| Fulfillment does not mutate SO price | PASS (5C-3) |

---

## 23. Settlement Boundary

| Check | Status |
|-------|--------|
| Settlement NOT implemented | PASS (deferred) |

---

## 24. Architecture Options

### Model A — Snapshot Embedded Governance
Override metadata lives inside `price_snapshot JSONB`.

| Criterion | Rating |
|-----------|--------|
| Immutability | GOOD |
| Auditability | GOOD |
| Queryability | POOR (JSONB) |
| Complexity | LOW |

### Model B — Separate Override Entity
Separate `price_overrides` table linked to SO line.

| Criterion | Rating |
|-----------|--------|
| Immutability | GOOD |
| Auditability | EXCELLENT |
| Queryability | GOOD |
| Complexity | MEDIUM |

### Model C — Amendment-Only Override
No independent override; every price change = new line version.

| Criterion | Rating |
|-----------|--------|
| Immutability | EXCELLENT |
| Auditability | GOOD |
| Queryability | GOOD |
| Complexity | LOW |

---

## 25. Recommendation

**Model A (Snapshot Embedded)** is recommended for 5C-4 because:
1. ADR-066 already defines `price_snapshot` JSONB on SO line items
2. Minimal schema changes required
3. Override metadata co-located with committed price
4. Consistent with existing 5C-3 architecture

---

## 26. Blocking Decisions

| Decision | Status |
|----------|--------|
| ADR-063 ratification | REQUIRED |
| Override permission model | REQUIRED |
| Approval thresholds | REQUIRED |
| Override scope (what can be overridden) | REQUIRED |

---

## 27. Required ADR Changes

| ADR | Action |
|-----|--------|
| ADR-063 | **RATIFY** — Price Override Governance |
| ADR-066 | Amend — Add override metadata to snapshot contract |

---

## 28. Implementation Scope Proposal

| Component | Priority |
|-----------|----------|
| Override fields in `price_snapshot` JSONB | HIGH |
| Server-side override service | HIGH |
| Override authorization (`pricing:override`) | HIGH |
| Override reason + audit fields | HIGH |
| Approval workflow for large deviations | MEDIUM |

---

## 29. Explicit Out-of-Scope

```
Settlement/accounting — NOT IMPLEMENTED
Legacy pricing migration — NOT IMPLEMENTED
FX conversion — NOT IMPLEMENTED
UOM conversion — NOT IMPLEMENTED
Dynamic pricing — NOT IMPLEMENTED
```

---

## 30. Final Gate

```
==================================================
PHASE 5C-4 DISCOVERY FINAL GATE
==================================================

Phase:
5C-4 — Pricing Override & Governance

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
PROPOSED

ADR-065:
RATIFIED

ADR-066:
RATIFIED

Commitment Boundary:
PASS

Override Boundary:
DECISION REQUIRED

Authorization:
DECISION REQUIRED

Auditability:
DECISION REQUIRED

Snapshot Integrity:
PASS

BUY / SELL:
DECISION REQUIRED

Currency:
DECISION REQUIRED

UOM:
DECISION REQUIRED

Margin:
DECISION REQUIRED

Tenant Isolation:
PASS

Legacy Boundary:
FINDING — browser-direct writes

Concurrency:
DECISION REQUIRED

Idempotency:
DECISION REQUIRED

Architecture Decision:
YELLOW

Implementation Authorization:
NOT AUTHORIZED

5C-5:
NOT AUTHORIZED

IMPLEMENTATION HARD STOP:
YES
==================================================
```

---

**END OF PHASE 5C-4 DISCOVERY REPORT**
