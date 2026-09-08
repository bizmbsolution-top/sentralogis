# SENTRALOGIS — PHASE 5C-2
# RATE SELECTION & PRICING CALCULATION ENGINE
# DISCOVERY REPORT

**Date:** 2026-09-01  
**Status:** YELLOW — ARCHITECTURE DECISION REQUIRED  
**Phase:** 5C-2 — Discovery  

---

## 1. Executive Decision

**PHASE 5C-2: YELLOW — ARCHITECTURE DECISION REQUIRED**

Implementation is **NOT AUTHORIZED** at this time. Critical business semantics remain ambiguous and require ADR amendment or human architecture decision before implementation can safely proceed.

---

## 2. Discovery Findings

### Current Pricing Landscape

| Structure | Domain | Status | Pricing Model |
|-----------|--------|--------|---------------|
| `crm_quotation_items` | Quote | LIVE | `qty × COALESCE(nego_price, unit_price)` + tax |
| `crm_sbu_customer_rates` | Quote | LIVE | Per-customer rate card, manual selection |
| `sales_orders.total_agreed_revenue` | SO | LIVE | Single manual number, no calculation |
| `fw_price_master` | Forwarding | LEGACY | Lane-based rate card, browser-direct |
| `fw_container_items` | Forwarding | LEGACY | Price snapshot at WO creation |
| `job_orders` (base_price/purchase_price) | Trucking | LEGACY | Manual entry per assignment |
| `md_billing_rates` | Warehouse | LEGACY | Contract-based rates, no calculation |
| `extra_costs` | Trucking | LEGACY | Surcharge/reimbursement, manual |
| `pricing_rates/versions/items` | Canonical | NEW (5C-1) | Rate master, no calculation engine |
| `commercial_line_items` | Commercial | DORMANT | Wrong parent FK, deprecated |
| `fulfillment_allocations` | Fulfillment | LIVE | Quantity-only, no pricing |

### Runtime Pricing Flows

```
QUOTE:
  crm_sbu_customer_rates → manual selection → crm_quotation_items.unit_price
  DB trigger: subtotal = qty × COALESCE(nego_price, unit_price)
  DB trigger: rollup to quote header

FORWARDING WO:
  fw_price_master → auto-match (lane + service + delivery) → deal_price
  forwarding-writer: snapshot into fw_container_items

TRUCKING ASSIGNMENT:
  WO item_data.deal_price → AssignmentModal → job_orders.base_price
  Manual vendor purchase_price entry

SALES ORDER:
  Client-supplied total_agreed_revenue (single number, no decomposition)

WAREHOUSE:
  md_billing_rates → ContractWizard (CRUD only, no calculation)
```

---

## 3. Pricing Context Model

### Input Dimensions

| Input | Required | Authority | Used For |
|-------|----------|-----------|----------|
| tenant | YES | IdentityContext | Isolation |
| capability | YES | Fulfillment allocation | Selection |
| pricing_side | YES | Request | BUY/SELL separation |
| customer | YES | Sales Order / Quote | Selection |
| effective_date | YES | Request | Version selection |
| quantity | YES | Request | Calculation |
| uom | YES | Request | Calculation |
| currency | YES | Request | Selection/result |
| origin | Contextual | Shipment | Selection (Forwarding) |
| destination | Contextual | Shipment | Selection (Forwarding) |
| container_type | Contextual | Shipment | Selection (Forwarding) |
| service_type | Contextual | Request | Selection |
| charge_basis | Contextual | Rate definition | Calculation |

---

## 4. Critical Ambiguities (BLOCKERS)

### 4.1 Rate Precedence (BLOCKER)

**Problem:** No authoritative rules exist for which rate wins when multiple rates match the same context.

**Evidence:**
- `crm_sbu_customer_rates` uses manual UI selection (user picks rate)
- `fw_price_master` uses strict lane matching (origin + dest + service + delivery + container)
- No precedence hierarchy exists for overlapping matches

**Required Decision:** Define deterministic precedence:
1. Exact customer match > group match > default?
2. Specific route > generic lane?
3. More specific container type > generic?
4. Higher priority field?

**Classification:** C — Ambiguous, requires ADR amendment

---

### 4.2 Effective-Period Semantics (BLOCKER)

**Problem:** ADR-059 does not define overlap rules, inclusivity, or NULL handling.

**Evidence:**
- 5C-1R added `effective_from <= effective_to` CHECK constraint
- No exclusion constraint for overlapping periods
- No documentation of whether `effective_to` is inclusive or exclusive
- No rule for `effective_to = NULL` (assumed indefinitely valid)

**Required Decision:**
- Can ACTIVE versions have overlapping effective periods?
- Is `effective_to` inclusive or exclusive?
- Does `ACTIVE` status alone determine applicability, or must effective period also contain the date?

**Classification:** C — Ambiguous, requires ADR amendment

---

### 4.3 Monetary Rounding/Precision (BLOCKER)

**Problem:** No canonical precision or rounding mode is defined.

**Evidence:**
- Database uses `NUMERIC(18,4)` for rates
- Quote calculation uses `NUMERIC(15,2)` for prices
- No documented rounding mode (half-up, banker's, etc.)
- JavaScript floating-point arithmetic is unsuitable for money

**Required Decision:**
- What is the canonical internal precision?
- What is the rounding mode?
- Where does rounding occur (per line, per total)?

**Classification:** C/B — Partially inferable, needs explicit definition

---

### 4.4 UOM Conversion (BLOCKER)

**Problem:** No UOM conversion infrastructure exists.

**Evidence:**
- `md_uoms` exists but is warehouse-inventory scoped
- No conversion factors between CBM, KG, chargeable_weight
- Forwarding uses `sell_per_cbm` as separate rate, not conversion

**Required Decision:**
- Does 5C-2 need UOM conversion?
- Or does the caller provide quantity in the rate's native UOM?

**Classification:** C/D — May belong to future phase

---

### 4.5 Calculation Boundary (BLOCKER)

**Problem:** ADR-061 says SO line items are the commitment boundary, but no SO line items table exists.

**Evidence:**
- `sales_order_items` explicitly deferred per U-13
- `commercial_line_items` is dormant with wrong parent FK
- `total_agreed_revenue` is a single manual number

**Required Decision:**
- Should 5C-2 create `sales_order_items`?
- Or should calculation produce a result without committing it?

**Classification:** C — Requires ADR-061 amendment or human decision

---

## 5. Architecture Decision Matrix

| Decision | Classification | Authority |
|----------|---------------|-----------|
| Pricing authority | A | ADR-057 |
| Rate master | A | ADR-058 |
| Snapshot | A | ADR-059 |
| Effective period semantics | **C** | ADR-059 gap |
| Calculation precision | **C/B** | Undefined |
| UOM conversion | **C/D** | Undefined |
| Rate precedence | **C** | Undefined |
| FX conversion | D | ADR-064/future |
| Override | D | ADR-063 |
| SO line items | **C** | ADR-061 gap |
| BUY/SELL | A | ADR-060 |
| Currency explicitness | A | ADR-062 |

**Legend:** A = Defined by ADR, B = Safely inferred, C = Ambiguous/requires decision, D = future phase

---

## 6. Legacy Reconciliation

| Legacy Structure | Canonical Equivalent | Selection Semantics | Calculation Semantics |
|------------------|---------------------|---------------------|----------------------|
| `fw_price_master` | `pricing_rate_items` | Lane + service + delivery | `unit_rate × quantity` |
| `crm_sbu_customer_rates` | `pricing_rate_items` | Customer + SBU + route | `unit_rate × quantity` |
| `md_billing_rates` | `pricing_rate_items` | Contract + charge_code | `unit_rate × quantity` |
| `crm_quotation_items` | Future SO line items | Manual rate selection | `qty × unit_price + tax` |
| `job_orders.base_price` | Future SO line items | Manual entry | Direct amount |

---

## 7. Security

| Check | Status |
|-------|--------|
| IdentityContext for mutations | Required |
| Tenant from authenticated identity | Required |
| RLS on all tables | Required |
| No client-supplied tenant authority | Required |
| No trusted x-tenant-id | Required |
| No fabricated pricing identifiers | Required |

---

## 8. Scenario Tests (Validation Fixtures)

### Scenario A — BYD CKD Import
- Ocean freight: 1 × 40HC, USD 1,500/container
- Customs clearance: 1 declaration, IDR 2,500,000
- Trucking: 2 trips, IDR 3,500,000/trip
- Warehouse: 100 pallet-days, IDR 50,000/pallet-day

### Scenario B — FCL
- 1 × 40HC, USD 1,500/container

### Scenario C — LCL
- 5 CBM, USD 100/CBM

### Scenario D — Customs Only
- 1 declaration, IDR 2,500,000

### Scenario E — Multi-SBU
- Single SO with Forwarding + Customs + Trucking + Warehouse

---

## 9. Test Results

N/A — Implementation not authorized.

---

## 10. Regression

**1255/1255 PASS, 0 FAIL** (baseline maintained)

---

## 11. Static Architecture Gates

N/A — Implementation not authorized.

---

## 12. Files Changed

None — discovery only.

---

## 13. Out-of-Scope

```
Rate selection engine — NOT IMPLEMENTED
Calculation engine — NOT IMPLEMENTED
Quote pricing workflow — NOT IMPLEMENTED
SO pricing workflow — NOT IMPLEMENTED
Fulfillment pricing — NOT IMPLEMENTED
Price override workflow — NOT IMPLEMENTED
Settlement — NOT IMPLEMENTED
Legacy migration — NOT IMPLEMENTED
Legacy deletion — NOT IMPLEMENTED
Pricing UI — NOT IMPLEMENTED
```

---

## 14. Remaining Risks

| Risk | Impact |
|------|--------|
| Rate precedence undefined | Cannot deterministically select rates |
| Effective-period semantics undefined | Cannot determine version applicability |
| Rounding/precision undefined | Monetary calculation inaccuracy |
| UOM conversion undefined | Cannot convert between units |
| SO line items missing | Cannot commit calculated prices |

---

## 15. ADR Impact

| ADR | Impact |
|-----|--------|
| ADR-059 | Requires amendment for effective-period semantics |
| ADR-061 | Requires amendment for SO line-item boundary |
| ADR-058 | May require amendment for rate precedence rules |

---

## PHASE 5C-2 FINAL GATE

```
==================================================
PHASE 5C-2 FINAL GATE
==================================================

Status:
YELLOW — ARCHITECTURE DECISION REQUIRED

Implementation:
NOT AUTHORIZED

5C-3:
NOT AUTHORIZED

HARD STOP:
YES
==================================================
```

---

**END OF PHASE 5C-2 DISCOVERY REPORT**
