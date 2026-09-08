# SENTRALOGIS — PHASE 5C-3R
# COMMERCIAL CHARGE & PRICE SNAPSHOT
# FORENSIC DECISION REPORT

**Date:** 2026-09-01  
**Status:** GREEN — ARCHITECTURE READY FOR IMPLEMENTATION  
**Phase:** 5C-3R — Forensic Decision  

---

## 1. Executive Decision

**PHASE 5C-3R: GREEN — ARCHITECTURE READY FOR IMPLEMENTATION**

All commitment-boundary decisions are resolved. One new ADR (ADR-066) is required to formalize the price snapshot + SO line-item commitment boundary.

---

## 2. 5C-3 Findings Reconciliation

| 5C-3 Finding | Resolution |
|--------------|------------|
| No `sales_order_line_items` table | **RESOLVED** — ADR-061 §2.1 defines schema; ADR-066 formalizes commitment |
| No price snapshot mechanism | **RESOLVED** — ADR-059 §2.3 + ADR-066 |
| Quote prices mutable | **RESOLVED** — Snapshot captured at SO creation (ADR-066) |
| SO confirmation creates no charges | **RESOLVED** — SO confirmation locks line items (ADR-061 §6) |
| No Quote → SO conversion | **RESOLVED** — ADR-066 defines price transfer at SO creation |
| No settlement pipeline | **OUT OF SCOPE** — ADR-064 defines interface; future phase |

---

## 3. Commitment Boundary Decision

### Selected Model: A — Price Snapshot embedded in SO Line Item

**Rationale:**
- ADR-061 §2.1 includes `price_snapshot` JSONB on SO line items
- ADR-059 §2.3 defines snapshot fields
- Embedding avoids a separate aggregate root (simpler lifecycle)
- JSONB preserves full rate context without schema rigidity

### Commitment Flow

```
Rate Selection (5C-2)
    ↓
Calculation (5C-2)
    ↓
Calculation Result (pure)
    ↓
[SO Creation / Quote Acceptance]
    ↓
Price Snapshot (JSONB, immutable)
    ↓
Sales Order Line Item (committed)
    ↓
[SO Confirmation]
    ↓
COMMERCIAL CHARGE (locked)
```

---

## 4. SO Line Item Contract

Based on ADR-061 §2.1:

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `line_id` | UUID PK | YES | Unique identifier |
| `sales_order_id` | UUID FK | YES | Parent SO |
| `line_sequence` | INTEGER | YES | Ordering |
| `service_description` | TEXT | YES | What was sold |
| `capability_type` | TEXT | YES | FORWARDING/CUSTOMS/TRUCKING/WAREHOUSE |
| `side` | TEXT | YES | SELL or BUY |
| `quantity` | NUMERIC(18,3) | YES | Amount |
| `uom` | TEXT | YES | Unit of measure |
| `currency` | TEXT | YES | Transaction currency |
| `unit_rate` | NUMERIC(18,4) | YES | Agreed unit price |
| `line_total` | NUMERIC(18,2) | YES | Calculated total |
| `source_quote_item_id` | UUID FK (nullable) | NO | Lineage to Quote |
| `rate_version_id` | UUID FK (nullable) | NO | Source rate version |
| `price_snapshot` | JSONB | YES | Frozen rate snapshot |
| `created_at` | TIMESTAMPTZ | YES | Commitment timestamp |
| `updated_at` | TIMESTAMPTZ | YES | Last update |

---

## 5. Price Snapshot Contract

Based on ADR-059 §2.3:

| Field | Required | Purpose |
|-------|----------|---------|
| `source_rate_id` | YES | Link to originating rate |
| `source_rate_version_id` | YES | Link to specific version |
| `unit_rate_snapshot` | YES | Frozen unit price |
| `quantity_snapshot` | YES | Frozen quantity |
| `currency_snapshot` | YES | Frozen currency |
| `uom_snapshot` | YES | Frozen UOM |
| `calculated_amount` | YES | Final committed amount |
| `snapshot_timestamp` | YES | When commitment occurred |
| `charge_basis` | OPTIONAL | What was priced |
| `pricing_side` | OPTIONAL | SELL or BUY |
| `rounding_precision` | OPTIONAL | Decimal places used |
| `rounding_mode` | OPTIONAL | HALF_UP |
| `min_charge` | OPTIONAL | Minimum applied |
| `max_charge` | OPTIONAL | Maximum applied |
| `selection_explanation` | OPTIONAL | Why this rate was selected |
| `calculation_inputs` | OPTIONAL | Input context |

---

## 6. Commercial Charge Contract

| Concept | Definition |
|---------|------------|
| What | Authoritative committed monetary obligation |
| Aggregate root | Sales Order Line Item |
| Owner | Commercial domain (Pricing subdomain) |
| Identity | `line_id` (UUID PK) |
| Lifecycle | Created → Committed → [Cancelled] |
| Amendable | No (after commitment) — new line version instead |
| Deletable | No — cancel only |
| Recalculable | No — snapshot is frozen |
| Traceability | `rate_version_id` + `price_snapshot` JSONB |

---

## 7. Quote → SO Pricing Transfer

| Step | Rule |
|------|------|
| Quote item pricing | Mutable until SO creation |
| SO creation | Copies quote item prices into SO line items |
| Price snapshot | Captured at SO creation time |
| Rate master changes after SO creation | Do NOT affect committed SO lines |
| Source lineage | `source_quote_item_id` preserved |

---

## 8. Override Governance

Based on ADR-063:

| Rule | Behavior |
|------|----------|
| When | Before SO confirmation only |
| Who | `pricing:override` permission |
| Reason | Required |
| Original calculation | Preserved in `price_snapshot` |
| Approval | Required for large deviations |
| After commitment | Override impossible — amendment only |

---

## 9. Amendment Governance

| Amendment Type | Behavior |
|----------------|----------|
| Quantity | New line version (old line cancelled) |
| Unit price | New line version |
| Currency | New line version |
| Service | New line version |
| Historical state | Remains reconstructable |

**Invariant:** A committed historical price must never silently change.

---

## 10. Cancellation

| Rule | Behavior |
|------|----------|
| Can delete committed line | NO |
| Can cancel committed line | YES |
| Snapshot after cancellation | Preserved (auditable) |
| Settlement observation | Sees cancellation |

---

## 11. BUY / SELL

| Rule | Behavior |
|------|----------|
| Separate lines | YES — one per side |
| Independence | BUY never derived from SELL |
| Currency | Each line preserves own currency |
| Settlement | Each line independently traceable |

---

## 12. Currency / UOM / Rounding

| Aspect | Rule |
|--------|------|
| Explicit currency | YES — no implicit IDR |
| Explicit UOM | YES — no auto-conversion |
| Rounding | HALF_UP, final result only |
| Currency-specific precision | YES (IDR=0, USD=2) |
| FX conversion | **NOT IMPLEMENTED** — future phase |

---

## 13. Partial Fulfillment

| Rule | Behavior |
|------|----------|
| SO line commitment | Price belongs to SO line |
| Fulfillment tracking | Quantity progress only |
| Price stability | Unchanged across partial fulfillment |
| Multiple shipments | Same SO line, same price |

---

## 14. Idempotency

| Rule | Behavior |
|------|----------|
| Commit retry | Same `source_quote_item_id` → same SO line |
| Duplicate prevention | UNIQUE(sales_order_id, source_quote_item_id) |
| Network timeout | Safe to retry |

---

## 15. Audit Lineage

| Question | Source |
|----------|--------|
| Why this rate? | `price_snapshot.selection_explanation` |
| Which rate? | `rate_version_id` |
| Which version? | `source_rate_version_id` |
| Which calculation? | `price_snapshot.calculation_inputs` |
| Who committed? | `created_by` |
| When? | `created_at` |
| Was it overridden? | Override fields in snapshot |
| Source quote? | `source_quote_item_id` |

---

## 16. Security

| Requirement | Status |
|-------------|--------|
| IdentityContext authoritative | YES |
| Authorization enforced | YES |
| Tenant isolation | YES |
| No client tenant authority | YES |
| No fabricated commercial IDs | YES |

---

## 17. Tenant Isolation

| Boundary | Status |
|----------|--------|
| SO → Line Item | Parent FK (tenant-scoped) |
| Line Item → Rate Version | Cross-tenant impossible (RLS) |
| Snapshot → Rate | Preserved for audit |

---

## 18. Legacy Boundary

| Structure | Classification | Action |
|-----------|---------------|--------|
| `fw_price_master` | Legacy adapter | No migration |
| `crm_sbu_customer_rates` | Legacy adapter | No migration |
| `md_billing_rates` | Legacy adapter | No migration |
| `crm_quotation_items` | Legacy adapter | No migration |
| `total_agreed_revenue` | Legacy field | Becomes derived |

---

## 19. Anti-Pattern Inventory

| Anti-Pattern | Status |
|--------------|--------|
| Calculation result treated as committed price | **PREVENTED** — separate snapshot step |
| SO line recalculated from current rate | **PREVENTED** — snapshot is immutable |
| Mutable committed price | **PREVENTED** — ADR-061 §6 |
| Snapshot missing rate-version lineage | **PREVENTED** — ADR-059 §2.3 |
| Override erases original calculation | **PREVENTED** — ADR-063 §2.1 |
| BUY inferred from SELL | **PREVENTED** — ADR-060 |
| Implicit FX | **PREVENTED** — ADR-062 |
| Committed line deleted | **PREVENTED** — cancel only |
| Duplicate commitment on retry | **PREVENTED** — idempotency key |
| Client-generated commercial ID | **PREVENTED** — DB UUID |
| Client-supplied tenant authority | **PREVENTED** — IdentityContext |
| Commercial Charge confused with Invoice | **PREVENTED** — ADR-064 boundary |

---

## 20. Cross-ADR Consistency

| Concern | ADR-059 | ADR-061 | ADR-062 | ADR-063 | ADR-064 | ADR-065 | Final |
|---------|---------|---------|---------|---------|---------|---------|-------|
| Snapshot | Owner | Embedded | — | — | — | — | ADR-059 + ADR-066 |
| Commitment | Immutable | Owner | — | — | — | — | ADR-061 + ADR-066 |
| SO Line | — | Owner | — | — | — | — | ADR-061 |
| Override | — | — | — | Owner | — | — | ADR-063 |
| Amendment | — | Owner | — | — | — | — | ADR-061 + ADR-066 |
| Currency | — | — | Owner | — | — | — | ADR-062 |
| UOM | — | — | Owner | — | — | — | ADR-062 |
| Rounding | — | — | Owner | — | — | — | ADR-062 |
| Settlement | — | — | — | — | Owner | — | ADR-064 |
| Rate lineage | Owner | Preserved | — | — | — | — | ADR-059 |
| Precedence | — | — | — | — | — | Owner | ADR-065 |

---

## 21. ADR Amendments

| ADR | Action | Scope |
|-----|--------|-------|
| ADR-059 | No further amendment | Effective-period semantics already added |
| ADR-061 | No further amendment | SO line-item schema already added |
| ADR-063 | No further amendment | Override governance complete |
| ADR-066 | **NEW** | Price Snapshot + Commercial Charge Commitment |

---

## 22. New ADR: ADR-066

**Title:** Price Snapshot & Commercial Charge Commitment Boundary

**Scope:**
1. Price snapshot creation at SO creation
2. Snapshot immutability after commitment
3. Quote → SO price transfer semantics
4. Rate change behavior (before/after commitment)
5. Amendment via new line version (not mutation)
6. Idempotency for commit operations
7. Audit lineage requirements

---

## 23. Exact 5C-3 Implementation Scope

| Component | Priority |
|-----------|----------|
| `sales_order_line_items` table | **BLOCKING** |
| `price_snapshot` JSONB schema | **BLOCKING** |
| Quote → SO price transfer | **HIGH** |
| SO confirmation → line lock | **HIGH** |
| Amendment (new line version) | **MEDIUM** |
| Cancellation | **MEDIUM** |
| Idempotency constraint | **MEDIUM** |
| Audit lineage fields | **LOW** |

---

## 24. Explicit Authorization State

```
5C-3 Implementation: NOT AUTHORIZED BY THIS PROMPT
5C-4: NOT AUTHORIZED
```

---

## PHASE 5C-3R FINAL GATE

```
==================================================
PHASE 5C-3R FINAL GATE
==================================================

Discovery Reconciliation:
PASS

Commitment Boundary:
DEFINED — Model A (Snapshot in SO Line Item)

SO Line Item:
DEFINED — ADR-061 §2.1

Price Snapshot:
DEFINED — ADR-059 §2.3 + ADR-066

Commercial Charge:
DEFINED — ADR-061

Quote → SO:
DEFINED — Snapshot at SO creation

Override:
DEFINED — ADR-063

Amendment:
DEFINED — New line version

Cancellation:
DEFINED — Cancel only (no delete)

BUY / SELL:
DEFINED — ADR-060

Currency / UOM:
DEFINED — ADR-062

Idempotency:
DEFINED — UNIQUE(sales_order_id, source_quote_item_id)

Audit Lineage:
DEFINED — price_snapshot JSONB

Security:
PASS

Tenant Isolation:
PASS

Legacy Boundary:
PRESERVED

Cross-ADR Consistency:
PASS

Architecture:
GREEN — READY FOR IMPLEMENTATION

5C-3 IMPLEMENTATION:
NOT AUTHORIZED BY THIS PROMPT

HARD STOP:
YES
==================================================
```

---

**END OF PHASE 5C-3R FORENSIC DECISION REPORT**
