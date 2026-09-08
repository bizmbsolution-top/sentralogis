# SENTRALOGIS — PHASE 5C-2R
# PRICING ARCHITECTURE — FORENSIC DECISION REPORT

**Date:** 2026-09-01  
**Status:** GREEN — DECISIONS RESOLVED  
**Phase:** 5C-2R — Forensic Gap Resolution  

---

## Executive Decision

All five architecture-blocking ambiguities are **RESOLVED**. Proposed ADRs are ready for human ratification. Implementation remains **NOT AUTHORIZED**.

---

## Decision #1 — Rate Precedence

### Current Evidence
- `crm_sbu_customer_rates` uses manual UI selection (no precedence)
- `fw_price_master` uses strict lane matching (no hierarchy)
- No existing ADR owns rate precedence

### Decision

**Explicit precedence hierarchy (Model C + specificity scoring).**

| Priority | Match Level | Dimensions |
|----------|-------------|------------|
| 1 (highest) | Exact contract | rate_code + customer + route + service + container |
| 2 | Customer + route + service + container | customer + route + service + container |
| 3 | Customer + service + container | customer + service + container |
| 4 | Customer + service | customer + service |
| 5 | Route + service + container | route + service + container |
| 6 | Route + service | route + service |
| 7 (lowest) | Generic service | service only |

### Rules
1. **Candidate eligibility**: Rate version must be ACTIVE, effective period must contain the pricing date, capability must match.
2. **Precedence**: Higher priority level wins.
3. **Within same priority**: More specific dimension match wins (customer > route > container).
4. **Tie behavior**: If two candidates remain equally authoritative, return `PRICING_AMBIGUOUS` error.
5. **Never**: Use `ORDER BY created_at LIMIT 1` or arbitrary ordering.

### ADR Requirement
**New ADR-065 — Rate Precedence Contract** (no existing ADR owns this concept).

---

## Decision #2 — Effective-Period Semantics

### Current Evidence
- ADR-059 is silent on overlap, inclusivity, NULL handling
- 5C-1R added `effective_from <= effective_to` CHECK
- No exclusion constraint exists

### Decision

**Half-open interval [from, with NULL = open-ended.**

| Concept | Definition |
|---------|------------|
| Interval | Half-open: `[effective_from, effective_to)` |
| NULL effective_to | Open-ended (indefinitely valid) |
| Overlap | No overlapping applicability windows for ACTIVE versions |
| ACTIVE meaning | Currently applicable (must also satisfy effective period) |
| Future version | ACTIVE + future effective_from = legal but not yet applicable |

### Rules
1. A rate version is **applicable** when: `status = 'ACTIVE'` AND `effective_from <= pricing_date` AND (`effective_to IS NULL` OR `pricing_date < effective_to`).
2. At most one ACTIVE version per rate per tenant at any timestamp (enforced by partial unique index from 5C-1R).
3. No overlapping effective periods for ACTIVE versions (enforced by application validation).
4. Half-open intervals allow sequential versioning without gaps or overlaps.

### ADR Requirement
**Amend ADR-059** to add explicit effective-period semantics.

---

## Decision #3 — Monetary Precision & Rounding

### Current Evidence
- Database uses `NUMERIC(18,4)` for rates
- Quote uses `NUMERIC(15,2)` for prices
- No documented rounding mode
- JavaScript floating-point is unsuitable for money

### Decision

**High-precision internal calculation, currency-specific final rounding.**

| Concept | Rule |
|---------|------|
| Internal precision | `NUMERIC(18,4)` for rates and intermediate calculations |
| Monetary precision | Currency-specific: IDR=0, USD=2, EUR=2, JPY=0 |
| Rounding mode | HALF_UP |
| Rounding stage | Final monetary result only (not intermediates) |
| Arithmetic | PostgreSQL NUMERIC (never JavaScript floating-point) |
| Min/max interaction | Apply min/max before rounding |

### Rules
1. All calculations use PostgreSQL NUMERIC types.
2. Intermediate results retain full precision.
3. Final monetary result is rounded to currency-specific precision using HALF_UP.
4. Min/max charge boundaries are applied before rounding.
5. Negative quantities are rejected.

### ADR Requirement
**Amend ADR-062** to add monetary precision contract.

---

## Decision #4 — UOM Conversion

### Current Evidence
- `md_uoms` exists but is warehouse-inventory scoped
- No conversion factors between CBM, KG, chargeable_weight
- Forwarding uses `sell_per_cbm` as separate rate, not conversion

### Decision

**Pricing requires quantity in rate's native UOM. No generic conversion engine.**

| Concept | Rule |
|---------|------|
| Canonical UOM vocabulary | CONTAINER, CBM, KG, TON, PALLET, DOCUMENT, TRIP, HOUR, DAY, PERCENTAGE, FIXED_AMOUNT |
| Dimensional UOM | kg↔ton (mathematically convertible) — future phase |
| Contextual UOM | container↔CBM (requires domain context) — NOT auto-converted |
| Caller responsibility | Must normalize quantity to rate's native UOM |
| Incompatible UOM | Rejected with clear error |

### Rules
1. Rate items define `unit_of_measure` and `charge_basis`.
2. Callers must provide quantity in the rate's native UOM.
3. No automatic UOM conversion in the pricing engine.
4. Capability-specific conversions (e.g., volumetric weight) belong to the calling domain.

### ADR Requirement
**Amend ADR-062** to add UOM contract.

---

## Decision #5 — SO Line-Item / Commercial Charge Boundary

### Current Evidence
- ADR-061 defines SO line items as commitment boundary
- `sales_order_items` table does not exist
- `commercial_line_items` is dormant with wrong parent FK
- `total_agreed_revenue` is a single manual number

### Decision

**New `sales_order_line_items` table with price snapshot JSONB.**

| Concept | Rule |
|---------|------|
| Canonical table | `sales_order_line_items` (new) |
| Parent | `sales_orders` (NOT commercial_work_items) |
| Price snapshot | JSONB frozen rate snapshot (source_rate_id, unit_rate, currency, uom) |
| Total revenue | Derived aggregate of line item totals |
| Immutability | Immutable after SO confirmation |
| BUY/SELL | Separate line items per side |

### Rules
1. Each SO line item represents one committed commercial charge.
2. Line items are created from Quote items at SO creation (snapshot pricing).
3. `total_agreed_revenue` = SUM of line item totals (derived, not stored independently).
4. Line items are immutable after SO confirmation.
5. BUY and SELL are separate line items.

### ADR Requirement
**Amend ADR-061** to add explicit SO line-item schema and boundary rules.

---

## Cross-ADR Consistency

| ADR | Amendment Required | Scope |
|-----|-------------------|-------|
| ADR-058 | No | Rate master model unchanged |
| ADR-059 | **Yes** | Effective-period semantics |
| ADR-060 | No | Buy/sell distinction unchanged |
| ADR-061 | **Yes** | SO line-item schema + boundary |
| ADR-062 | **Yes** | Monetary precision + UOM contract |
| ADR-063 | No | Override governance unchanged |
| ADR-064 | No | Settlement interface unchanged |
| **ADR-065** | **New** | Rate precedence contract |

---

## Legacy Semantic Reconciliation

| Legacy Structure | Canonical Equivalent | Rule Preserved |
|------------------|---------------------|----------------|
| `fw_price_master` | `pricing_rate_items` | Lane-based matching → precedence priority 5-7 |
| `crm_sbu_customer_rates` | `pricing_rate_items` | Customer-specific rates → precedence priority 2-4 |
| `md_billing_rates` | `pricing_rate_items` | Contract rates → precedence priority 1 |
| `crm_quotation_items` | Future SO line items | Price snapshot at commitment |
| `total_agreed_revenue` | Derived aggregate | Becomes SUM of line items |

---

## Security

| Requirement | Status |
|-------------|--------|
| IdentityContext authoritative | Yes |
| No client tenant authority | Yes |
| No fabricated pricing IDs | Yes |
| No client-generated authoritative prices | Yes |
| RLS on all tables | Yes |
| Authorization: `commercial:manage` for mutations | Yes |
| Authorization: `commercial:read` for reads | Yes |

---

## PHASE 5C-2R FINAL GATE

```
==================================================
PHASE 5C-2R FINAL GATE
==================================================

Rate Precedence:
RESOLVED

Effective Period:
RESOLVED

Monetary Precision:
RESOLVED

UOM:
RESOLVED

SO Commercial Line Boundary:
RESOLVED

Cross-ADR Consistency:
PASS

Legacy Semantic Reconciliation:
PASS

Security Architecture:
PASS

Implementation:
NOT EXECUTED

ADR Status:
PROPOSED — HUMAN RATIFICATION REQUIRED

5C-2 Implementation:
NOT AUTHORIZED

5C-3:
NOT AUTHORIZED

HARD STOP:
YES
==================================================
```

---

**END OF PHASE 5C-2R FORENSIC DECISION REPORT**
