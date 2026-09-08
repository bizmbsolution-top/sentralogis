# SENTRALOGIS — PHASE 5C-3
# COMMERCIAL CHARGE & PRICE SNAPSHOT COMMITMENT
# DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** YELLOW — ARCHITECTURE DECISION REQUIRED  
**Phase:** 5C-3 — Discovery  

---

## 1. Executive Decision

**PHASE 5C-3: YELLOW — ARCHITECTURE DECISION REQUIRED**

The calculation → commitment boundary is **NOT FULLY DEFINED**. Critical gaps exist in price snapshot persistence, SO line-item schema, and the Quote→SO conversion path.

---

## 2. Current Architecture

### Pricing Flow (Current State)

```
RATE MASTER (5 disconnected structures):
  fw_price_master ──────────────────────► sell_price_snapshot (flat NUMERIC)
  crm_sbu_customer_rates ──────► crm_quotation_items (mutable)
  md_billing_rates ────────────► warehouse billing
  crm_quotation_items ─────────► nego_price (mutable, no snapshot)
  fw_container_items ───────────► sell_price_snapshot (flat NUMERIC)

COMMERCIAL COMMITMENT:
  sales_orders.total_agreed_revenue ────► Single manual number (no decomposition)
  commercial_capability_bindings.pricing ► Empty JSONB (unused)

SETTLEMENT:
  fin_financial_ledger_entries ─────────► DEAD (zero writers)
  invoices / invoice_lines ─────────────► Operational (work_order-keyed)
```

### Canonical Target (ADR-057..065, RATIFIED, NOT IMPLEMENTED)

```
Rate Master → Rate Version → Rate Selection → Calculation → Price Snapshot → SO Line Item → Settlement
     ↑              ↑              ↑             ↑            ↑            ↑            ↑
  ADR-058       ADR-059        ADR-065       5C-2        ADR-059      ADR-061      ADR-064
```

---

## 3. Calculation → Commitment Boundary

### Current Gap

| Step | Current State | Required State |
|------|---------------|----------------|
| Rate Selection | 5C-2 implemented (in-memory) | 5C-2 implemented |
| Calculation | 5C-2 implemented (pure function) | 5C-2 implemented |
| Price Snapshot | **MISSING** | JSONB snapshot at commitment |
| SO Line Item | **MISSING** | `sales_order_line_items` table |
| Commitment | `total_agreed_revenue` (manual) | Derived from line items |

### Blocking Decision

**The `sales_order_line_items` table does not exist.** ADR-061 defines it as the commitment boundary, but it has not been implemented. Without it, there is no place to persist committed commercial charges.

---

## 4. Price Snapshot Analysis

### Current State

| Snapshot Mechanism | Status | Quality |
|-------------------|--------|---------|
| `fw_container_items.sell_price_snapshot` | Legacy (flat NUMERIC) | No rate version, no currency, no timestamp |
| `crm_quotation_items.nego_price` | Mutable | No snapshot at acceptance |
| `total_agreed_revenue` | Manual | No decomposition |

### Required by ADR-059

| Field | Required | Current State |
|-------|----------|---------------|
| `source_rate_id` | YES | **MISSING** |
| `source_rate_version_id` | YES | **MISSING** |
| `unit_rate_snapshot` | YES | **MISSING** |
| `quantity_snapshot` | YES | **MISSING** |
| `currency_snapshot` | YES | **MISSING** |
| `uom_snapshot` | YES | **MISSING** |
| `calculated_amount` | YES | **MISSING** |
| `snapshot_timestamp` | YES | **MISSING** |

---

## 5. Commercial Charge Analysis

### Current State

| Question | Answer |
|----------|--------|
| What is a Commercial Charge? | **UNDEFINED** — no canonical table |
| What is its aggregate root? | **UNDEFINED** |
| Who owns it? | **UNDEFINED** |
| What identifies it? | **UNDEFINED** |
| What is its lifecycle? | **UNDEFINED** |
| Can it be amended? | **UNDEFINED** |
| Can it be cancelled? | **UNDEFINED** |

### Required by ADR-061

| Concept | ADR-061 Definition |
|---------|-------------------|
| Canonical table | `sales_order_line_items` (new) |
| Parent | `sales_orders` |
| Price snapshot | JSONB frozen rate snapshot |
| Immutability | After SO confirmation |
| BUY/SELL | Separate line items |

---

## 6. Sales Order Boundary

### Current State

| Field | Type | Status |
|-------|------|--------|
| `total_agreed_revenue` | NUMERIC(18,2) | Manual entry, no decomposition |
| `currency` | TEXT | Explicit default 'IDR' |
| `sales_order_items` | **DOES NOT EXIST** | **BLOCKING GAP** |

### Quote → SO Conversion

| Step | Status |
|------|--------|
| Quote acceptance | Status change only (no price snapshot) |
| Quote → SO conversion | **DOES NOT EXIST** |
| Price copy to SO | **DOES NOT EXIST** |

---

## 7. Override Analysis

### Current State

| Mechanism | Status |
|-----------|--------|
| `crm_quotation_items.nego_price` | Mutable override (browser-direct) |
| `fw_price_master` edits | No audit trail |
| ADR-063 governance | **NOT IMPLEMENTED** |

### Required by ADR-063

| Requirement | Status |
|-------------|--------|
| Override reason | **MISSING** |
| Override actor | **MISSING** |
| Override timestamp | **MISSING** |
| Original calculation preserved | **MISSING** |
| Approval for large deviations | **MISSING** |

---

## 8. Amendment Analysis

### Current State

| Amendment Type | Behavior |
|----------------|----------|
| SO price amendment | Edit `total_agreed_revenue` directly (DRAFT only) |
| Quantity amendment | **UNDEFINED** |
| Rate replacement | **UNDEFINED** |
| Future rate changes | Does not affect existing calculations (5C-2 design) |

### Required Invariant

> **Future rate changes MUST NOT mutate committed commercial truth.**

This invariant is **NOT ENFORCEABLE** today because there is no committed commercial truth to protect.

---

## 9. Currency Analysis

### Current State

| Aspect | Status |
|--------|--------|
| Explicit currency | YES (5C-2 enforces) |
| Multi-currency SO | **UNDEFINED** |
| FX conversion | **NOT IMPLEMENTED** |
| BUY USD / SELL IDR | Supported by 5C-2 (separate calculations) |

### Required by ADR-062

| Requirement | Status |
|-------------|--------|
| Explicit currency | YES (5C-2) |
| No implicit IDR | YES (5C-1R removed default) |
| FX engine | **NOT REQUIRED** (future phase) |

---

## 10. UOM Analysis

### Current State

| Aspect | Status |
|--------|--------|
| Explicit UOM | YES (5C-2 enforces) |
| UOM conversion | **NOT IMPLEMENTED** |
| Caller responsibility | Must normalize quantity to rate UOM |

### Required by ADR-062

| Requirement | Status |
|-------------|--------|
| Explicit UOM | YES |
| No auto-conversion | YES |
| Incompatible UOM rejection | YES (5C-2) |

---

## 11. Rounding Analysis

### Current State

| Aspect | Status |
|--------|--------|
| Internal precision | NUMERIC(18,4) |
| Rounding mode | HALF_UP (5C-2) |
| Rounding stage | Final result only (5C-2) |
| Currency-specific | YES (5C-2) |

### Required by ADR-062

| Requirement | Status |
|-------------|--------|
| Explicit precision | YES |
| No floating-point money | YES (PostgreSQL NUMERIC) |

---

## 12. Partial Fulfillment Analysis

### Current State

| Aspect | Status |
|--------|--------|
| SO line items | **DO NOT EXIST** |
| Fulfillment quantity tracking | YES (fulfillment_allocations) |
| Price stability across fulfillment | **UNDEFINED** |

### Required Behavior

> Price belongs to SO line items. Fulfillment tracks quantity progress. Price remains stable across partial fulfillment.

---

## 13. Multi-SBU Analysis

### Current State

| Capability | Pricing Support |
|------------|-----------------|
| FORWARDING | 5C-2 (capability_type = FORWARDING) |
| CUSTOMS | 5C-2 (capability_type = CUSTOMS) |
| TRUCKING | 5C-2 (capability_type = TRUCKING) |
| WAREHOUSE | 5C-2 (capability_type = WAREHOUSE) |

### BYD CKD Scenario Validation

| Step | Pricing | Status |
|------|---------|--------|
| Ocean Freight | 5C-2 calculation | SUPPORTED |
| Customs Clearance | 5C-2 calculation | SUPPORTED |
| Trucking | 5C-2 calculation | SUPPORTED |
| Warehouse | 5C-2 calculation | SUPPORTED |
| Commitment | **MISSING** | **GAP** |

---

## 14. Settlement Boundary

### Current State

| Component | Status |
|-----------|--------|
| `fin_financial_ledger_entries` | DEAD (zero writers) |
| ADR-064 interface | PROPOSED, not implemented |
| Settlement pipeline | **DOES NOT EXIST** |

### Required by ADR-064

| Requirement | Status |
|-------------|--------|
| Charge identifier | **MISSING** |
| Customer reference | **MISSING** |
| Amount + currency | **MISSING** |
| Charge type | **MISSING** |

---

## 15. Security

| Requirement | Status |
|-------------|--------|
| IdentityContext authoritative | YES (5C-2) |
| Authorization enforced | YES (5C-2) |
| Tenant isolation | YES (5C-1R) |
| No client tenant authority | YES |
| Commitment authorization | **UNDEFINED** |

---

## 16. Tenant Isolation

| Boundary | Status |
|----------|--------|
| Rate → Version → Item | YES (composite FK, 5C-1R) |
| SO → Line Item | **MISSING** (table doesn't exist) |
| Snapshot → Rate Version | **MISSING** |

---

## 17. Idempotency

| Operation | Required | Current |
|-----------|----------|---------|
| Commit price | Idempotent (retry-safe) | **UNDEFINED** |
| Rate version creation | Idempotent (5C-1R function) | YES |

---

## 18. Audit Lineage

| Question | Answer |
|----------|--------|
| Why this rate? | 5C-2 selection trace |
| Which version? | 5C-2 selected version |
| Which calculation? | 5C-2 calculation steps |
| Who committed? | **MISSING** |
| When? | **MISSING** |
| Was it overridden? | **MISSING** |

---

## 19. Legacy Analysis

| Structure | Classification | Status |
|-----------|---------------|--------|
| `fw_price_master` | Legacy adapter | Browser-direct writes (security risk) |
| `crm_sbu_customer_rates` | Legacy adapter | Browser-direct writes (security risk) |
| `md_billing_rates` | Legacy adapter | Operational |
| `crm_quotation_items` | Legacy adapter | Mutable (no snapshot) |
| `total_agreed_revenue` | Legacy field | Manual entry |
| `commercial_line_items` | DORMANT | Wrong parent FK |

---

## 20. Anti-Pattern Inventory

| Anti-Pattern | Status |
|--------------|--------|
| Calculation result treated as committed price | **RISK** — no snapshot table |
| Mutable committed prices | **RISK** — quote prices mutable |
| Rate version mutation after activation | **SAFE** — 5C-1R partial unique index |
| BUY derived from SELL | **SAFE** — 5C-2 enforces independence |
| Implicit FX | **SAFE** — 5C-2 preserves currency |
| Client-generated commercial identifiers | **SAFE** — 5C-2 uses DB UUIDs |
| Client-supplied tenant authority | **SAFE** — 5C-1R composite FK |
| Direct browser commercial mutation | **RISK** — legacy pricing browser-direct |

---

## 21. Architecture Decision Matrix

| Question | Current State | ADR Authority | Decision | Status |
|----------|---------------|---------------|----------|--------|
| Snapshot identity | **MISSING** | ADR-059 | UUID PK + source lineage | **GAP** |
| Snapshot immutability | **MISSING** | ADR-059 | Immutable after SO confirmation | **GAP** |
| Commercial charge identity | **MISSING** | ADR-061 | `sales_order_line_items` table | **GAP** |
| SO line boundary | **MISSING** | ADR-061 | New table with price snapshot JSONB | **GAP** |
| Override | **MISSING** | ADR-063 | Reason + actor + timestamp | **GAP** |
| Amendment | **MISSING** | ADR-061/063 | New snapshot, not mutation | **GAP** |
| Currency | 5C-2 implemented | ADR-062 | Explicit, no implicit | **DONE** |
| UOM | 5C-2 implemented | ADR-062 | Explicit, no auto-conversion | **DONE** |
| Rounding | 5C-2 implemented | ADR-062 | HALF_UP, final only | **DONE** |
| Settlement interface | **MISSING** | ADR-064 | Charge → Settlement adapter | **GAP** |
| Idempotency | **UNDEFINED** | — | Idempotent commit command | **GAP** |
| Audit lineage | **UNDEFINED** | — | Selection + calculation + actor + timestamp | **GAP** |
| Authorization | 5C-2 implemented | ADR-057 | `commercial:manage` for mutations | **DONE** |

---

## 22. Required ADR Amendments / New ADRs

| ADR | Action | Scope |
|-----|--------|-------|
| ADR-059 | Amend | Add snapshot identity + immutability rules |
| ADR-061 | Amend | Add `sales_order_line_items` schema + lifecycle |
| ADR-063 | Amend | Add override governance for commercial charges |
| **ADR-066** | **New** | Price Snapshot + Commercial Charge Commitment |

---

## 23. Recommended 5C-3 Implementation Scope

| Component | Priority |
|-----------|----------|
| `sales_order_line_items` table | **BLOCKING** |
| Price snapshot JSONB schema | **BLOCKING** |
| Quote → SO price snapshot conversion | **HIGH** |
| SO confirmation → charge commitment | **HIGH** |
| Override governance (ADR-063) | **MEDIUM** |
| Amendment handling | **MEDIUM** |
| Idempotency for commit | **MEDIUM** |
| Audit lineage | **LOW** |

---

## 24. Explicit Implementation Authorization State

```
5C-3 Implementation: NOT AUTHORIZED
5C-4: NOT AUTHORIZED
```

---

## PHASE 5C-3 DISCOVERY FINAL GATE

```
==================================================
PHASE 5C-3 DISCOVERY FINAL GATE
==================================================

Discovery:
COMPLETE

Calculation → Commitment Boundary:
NOT DEFINED — sales_order_line_items table missing

Price Snapshot:
NOT DEFINED — no snapshot persistence

Commercial Charge:
NOT DEFINED — no canonical table

SO Boundary:
NOT DEFINED — no line-item table

Override:
NOT DEFINED — ADR-063 not implemented

Amendment:
NOT DEFINED — no commitment to amend

Currency:
DEFINED — ADR-062 + 5C-2

UOM:
DEFINED — ADR-062 + 5C-2

Rounding:
DEFINED — ADR-062 + 5C-2

Settlement Boundary:
NOT DEFINED — ADR-064 not implemented

Idempotency:
NOT DEFINED

Audit Lineage:
PARTIALLY DEFINED — 5C-2 selection trace

Security:
PARTIALLY DEFINED — calculation secure, commitment undefined

Tenant Isolation:
PARTIALLY DEFINED — rates secure, SO lines missing

Legacy Boundary:
PRESERVED — no migration

Architecture:
YELLOW — ARCHITECTURE DECISION REQUIRED

Implementation:
NOT AUTHORIZED

5C-4:
NOT AUTHORIZED

HARD STOP:
YES
==================================================
```

---

**END OF PHASE 5C-3 DISCOVERY REPORT**
