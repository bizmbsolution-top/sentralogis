# SENTRALOGIS — PHASE 5C-R
# PRICING ARCHITECTURE — RATIFICATION REVIEW REPORT

**Date:** 2026-09-01  
**Status:** GREEN — ALL ADRs RATIFIABLE  
**Phase:** 5C-R — Human Ratification Gate  

---

## 1. Executive Decision

All eight ADRs (057-064) are **RATIFIABLE** without architectural modification. Cross-ADR consistency is verified. No contradictions with governing ADRs (018-056) are found. The pricing architecture is stable enough for Phase 5C-1 implementation.

**Recommendation:** RATIFY ADR-057 through ADR-064.

---

## 2. Scope

This report reviews:
- ADR-057 through ADR-064 (Pricing Architecture)
- Governing ADRs: 018, 019, 020, 021, 033-044, 039-056
- Phase 5A/5B/5C findings
- Legacy pricing structures
- Security architecture
- Scenario tests

---

## 3. ADR Review Matrix

### ADR-057 — Pricing Domain Authority

| Criterion | Assessment |
|-----------|------------|
| Intent | Establishes canonical pricing authority in Commercial domain |
| Authority | `lib/commercial/pricing/` |
| Boundary | Rates, versions, calculations, snapshots |
| Non-boundary | SO, Fulfillment, Operations, Settlement |
| Tenant Isolation | Server-derived (IdentityContext + RLS) |
| Identity Authority | Conforms to U-01/U-02 |
| Historical Integrity | Preserved via ADR-059 |
| Status | **RATIFY** |

### ADR-058 — Rate Master Model

| Criterion | Assessment |
|-----------|------------|
| Intent | Canonical rate hierarchy (Rate → Version → Item) |
| Authority | Commercial Pricing domain |
| Boundary | Rate definitions, versioning, applicability conditions |
| Non-boundary | Charge commitment, settlement |
| Tenant Isolation | `tenant_id` + RLS |
| Identity Authority | UUID PK, database-authoritative |
| Status | **RATIFY** |

### ADR-059 — Rate Versioning & Price Snapshot

| Criterion | Assessment |
|-----------|------------|
| Intent | Immutable historical pricing |
| Authority | Rate Version (reusable) vs Price Snapshot (committed) |
| Boundary | Version control, snapshot preservation |
| Non-boundary | Settlement realization |
| Critical Invariant | Future rate changes NEVER mutate committed prices |
| Status | **RATIFY** |

### ADR-060 — Buy vs Sell Price Distinction

| Criterion | Assessment |
|-----------|------------|
| Intent | Independent buy/sell economics |
| Authority | Commercial Pricing domain |
| Boundary | Sell rate, buy rate, margin calculation |
| Non-boundary | Settlement realization |
| Security | Buy cost visibility requires `pricing:view_cost` |
| Status | **RATIFY** |

### ADR-061 — Commercial Charge Model

| Criterion | Assessment |
|-----------|------------|
| Intent | Authoritative committed monetary obligation |
| Authority | Commercial Pricing domain |
| Boundary | SO line items, charge lineage, price snapshots |
| Non-boundary | Settlement, invoicing |
| Lineage | Rate Version → Calculation → Quote → SO Line → Charge |
| Status | **RATIFY** |

### ADR-062 — Currency & UOM in Pricing

| Criterion | Assessment |
|-----------|------------|
| Intent | Explicit currency and UOM |
| Authority | Commercial Pricing domain |
| Boundary | ISO currency codes, canonical UOM references |
| Non-boundary | FX accounting (Financial Settlement) |
| Status | **RATIFY** |

### ADR-063 — Price Override Governance

| Criterion | Assessment |
|-----------|------------|
| Intent | Governed manual override |
| Authority | Commercial Pricing domain |
| Boundary | Override with audit trail, approval |
| Non-boundary | Rate master mutation |
| Security | `pricing:override` permission required |
| Status | **RATIFY** |

### ADR-064 — Financial Settlement Interface

| Criterion | Assessment |
|-----------|------------|
| Intent | Explicit pricing→settlement handoff |
| Authority | Commercial Pricing (defines), Settlement (consumes) |
| Boundary | Charge interface contract |
| Non-boundary | Invoice, AR, AP, payment, journal entries |
| Status | **RATIFY** |

---

## 4. Cross-ADR Consistency

| Relationship | Status | Notes |
|--------------|--------|-------|
| ADR-057 ↔ ADR-058 | CONSISTENT | Authority scope matches rate master ownership |
| ADR-058 ↔ ADR-059 | CONSISTENT | Rate model supports versioning |
| ADR-059 ↔ ADR-061 | CONSISTENT | Snapshot feeds commercial charge |
| ADR-060 ↔ ADR-061 | CONSISTENT | Buy/sell feeds charge model |
| ADR-062 ↔ ADR-061 | CONSISTENT | Currency/UOM embedded in charges |
| ADR-063 ↔ ADR-061 | CONSISTENT | Override governed within charge lifecycle |
| ADR-064 ↔ ADR-061 | CONSISTENT | Settlement interface consumes charges |
| ADR-057 ↔ ADR-064 | CONSISTENT | Pricing authority doesn't extend to settlement |

**No contradictions found.**

---

## 5. Pricing Authority Analysis

### Single Canonical Authority

ADR-057 establishes exactly ONE canonical pricing authority: `lib/commercial/pricing/`.

### No Competing Engines

| Potential Engine | Status |
|------------------|--------|
| Forwarding pricing | Legacy adapter only (`fw_price_master`) |
| Customs pricing | Legacy adapter only |
| Trucking pricing | Legacy adapter only |
| Warehouse pricing | Legacy adapter only |
| Quote pricing | Consumer of canonical pricing |

---

## 6. Rate Master Analysis

### Three-Level Hierarchy

```
Rate (what service)
   ↓
Rate Version (when applicable)
   ↓
Rate Item (how much)
```

### Capability-Aware

Single rate model supports FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE via `capability_type` — no separate engines.

---

## 7. Snapshot Analysis

### Critical Invariant Test

> **Scenario:** Rate = USD 100/container. Customer commits. Rate changes to USD 125.

| Transaction | Snapshot Mechanism | Reproducible? |
|-------------|-------------------|---------------|
| Quote | `price_snapshot` JSONB on SO line | YES |
| Sales Order | `price_snapshot` JSONB on line item | YES |
| Fulfillment | Inherits from SO line snapshot | YES |
| Work Order | `wo_items.item_data` JSONB | YES |
| Shipment | Inherits from WO/SO snapshot | YES |
| Commercial Charge | `price_snapshot` JSONB | YES |
| Settlement | Consumes committed charge | YES |

**All transactions remain reproducible after rate changes.**

---

## 8. Buy/Sell Analysis

### Scenario Test

> **BUY = USD 80, SELL = USD 120, MARGIN = USD 40**

| Requirement | Supported |
|-------------|-----------|
| Independent buy/sell | YES (ADR-060) |
| No overwrite | YES (separate columns) |
| No derived sell from buy | YES (explicit configuration) |
| Supplier economics hidden | YES (`pricing:view_cost` required) |
| Margin calculated | YES (sell - buy, not persisted) |

---

## 9. Charge Model Analysis

### Lineage

```
Rate Version → Pricing Calculation → Quote Item → SO Line Item → Commercial Charge
```

### Total Agreed Revenue

`total_agreed_revenue` becomes a **derived aggregate** of SO line item totals. Not a second source of truth.

---

## 10. Currency/UOM Analysis

### Multi-Currency Test

> **BUY = USD 80, SELL = IDR 1,950,000**

| Requirement | Supported |
|-------------|-----------|
| Explicit currency | YES (ISO 4217) |
| No forced conversion | YES |
| Exchange rate table | YES (ADR-062) |
| No implicit IDR | YES |

### UOM Compatibility

| UOM | Supported |
|-----|-----------|
| CONTAINER | YES |
| CBM | YES |
| KG | YES |
| PALLET | YES |
| DOCUMENT | YES |
| TRIP | YES |
| DECLARATION | YES |
| PERCENTAGE | YES |
| FIXED AMOUNT | YES |

---

## 11. Override Governance

| Requirement | Supported |
|-------------|-----------|
| Explicit override | YES |
| Attributable | YES (actor, timestamp) |
| Authorized | YES (`pricing:override`) |
| Auditable | YES (reason required) |
| Post-commitment immutable | YES |

---

## 12. Settlement Boundary

| Pricing Owns | Settlement Owns |
|--------------|-----------------|
| Charge definition | Invoice generation |
| Charge amount | AR/AP |
| Charge currency | Payment processing |
| Tax applicability | Journal entries |
| Buy/sell direction | Financial realization |

**Boundary is explicit.**

---

## 13. Legacy Pricing Inventory

| Existing Structure | Domain | Current Authority | Future Disposition |
|--------------------|--------|-------------------|-------------------|
| `fw_price_master` | Forwarding | None (browser-direct) | ADAPT → canonical rate model |
| `crm_sbu_customer_rates` | CRM | None (browser-direct) | ADAPT → canonical rate model |
| `md_billing_rates` | Warehouse | None (browser-direct) | ADAPT → canonical rate model |
| `crm_quotation_items` | CRM | None (browser-direct) | ADAPT → add snapshot fields |
| `total_agreed_revenue` | Commercial | IdentityContext | ADAPT → derived aggregate |
| `fw_container_items` | Forwarding | Server-side | KEEP (operational snapshot) |
| `commercial_line_items` | Commercial | Dormant | DEPRECATE |

---

## 14. Security Review

| Check | Status |
|-------|--------|
| IdentityContext for mutations | YES |
| Tenant from authenticated identity | YES |
| RLS on pricing tables | YES |
| No client-supplied tenant authority | YES |
| No trusted `x-tenant-id` | YES |
| No fabricated pricing identifiers | YES |
| No client-generated authoritative prices | YES |
| No client-side rate version selection | YES |

---

## 15. Concurrency Review

| Identifier | Authority | Concurrency-Safe |
|------------|-----------|------------------|
| Rate ID | Database UUID | YES |
| Rate Version | Database UUID + version_no | YES |
| Rate Item | Database UUID | YES |
| SO Line Item | Database UUID | YES |
| Commercial Charge | Database UUID | YES |

---

## 16. Scenario Tests

### FCL Test

> **4 × 40HC containers, Shanghai → Jakarta, USD 1,500/container**

| Step | Result |
|------|--------|
| Rate lookup | Rate Item matched by lane + container |
| Calculation | 4 × 1,500 = 6,000 |
| Snapshot | Frozen at SO creation |
| Charge | USD 6,000 committed |

### LCL Test

> **15 CBM, Shenzhen → Jakarta, USD 45/CBM, min 10 CBM**

| Step | Result |
|------|--------|
| Rate lookup | Rate Item matched by lane + service |
| Calculation | 15 × 45 = 675 (above minimum) |
| Snapshot | Frozen at SO creation |
| Charge | USD 675 committed |

### Multi-SBU Test

> **SO with Forwarding + Customs + Trucking + Warehouse**

| Capability | Pricing |
|------------|---------|
| Forwarding | Rate model (capability_type = FORWARDING) |
| Customs | Rate model (capability_type = CUSTOMS) |
| Trucking | Rate model (capability_type = TRUCKING) |
| Warehouse | Rate model (capability_type = WAREHOUSE) |

**Single pricing authority, multiple capability-specific rate structures.**

---

## 17. Implementation Readiness

| Requirement | Status |
|-------------|--------|
| Pricing authority explicit | YES |
| Rate Master explicit | YES |
| Rate Version explicit | YES |
| Price Snapshot explicit | YES |
| Buy/Sell explicit | YES |
| Commercial Charge explicit | YES |
| SO line-item relationship explicit | YES |
| Quote relationship explicit | YES |
| Currency explicit | YES |
| UOM explicit | YES |
| Override governance explicit | YES |
| Settlement interface explicit | YES |
| Tenant model explicit | YES |
| Authorization explicit | YES |
| Legacy disposition explicit | YES |
| Migration strategy explicit | YES |

---

## 18. Open Decisions

| Decision | Recommended Resolution |
|----------|----------------------|
| Override approval threshold | Business-defined (e.g., >10% requires approval) |
| Exchange rate source | External API or manual entry |
| Rate validity overlap policy | At most one active version per context per timestamp |
| Quote→SO conversion pricing | Snapshot Quote items into SO line items |

---

## 19. Final Ratification Recommendation

| ADR | Status | Reason |
|-----|--------|--------|
| ADR-057 | **RATIFY** | Clean authority definition |
| ADR-058 | **RATIFY** | Sufficient rate model |
| ADR-059 | **RATIFY** | Strong snapshot invariant |
| ADR-060 | **RATIFY** | Clear buy/sell separation |
| ADR-061 | **RATIFY** | Complete charge lineage |
| ADR-062 | **RATIFY** | Explicit currency/UOM |
| ADR-063 | **RATIFY** | Enforceable override governance |
| ADR-064 | **RATIFY** | Explicit settlement boundary |

---

## 20. Explicit Phase 5C-1 Authorization Gate

---

## PHASE 5C-R FINAL GATE

| ADR | Status |
|-----|--------|
| ADR-057 | **RATIFY** |
| ADR-058 | **RATIFY** |
| ADR-059 | **RATIFY** |
| ADR-060 | **RATIFY** |
| ADR-061 | **RATIFY** |
| ADR-062 | **RATIFY** |
| ADR-063 | **RATIFY** |
| ADR-064 | **RATIFY** |

**Architecture Status:** GREEN

**Phase 5C-1 Authorization:** NOT AUTHORIZED (pending human ratification)

**Human Ratification:** PENDING

---

**END OF PHASE 5C-R RATIFICATION REPORT**
