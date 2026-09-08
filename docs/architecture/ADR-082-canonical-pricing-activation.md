# ADR-082 — Canonical Pricing Activation Strategy

**Status:** RATIFIED (Phase 5C-R2 Human Ratification, 2026-09-05)  
**Date:** 2026-09-05  
**Depends on:** ADR-057 (Pricing Domain Authority), ADR-058 (Rate Master Model), ADR-059 (Rate Versioning and Price Snapshot), ADR-060 (Buy vs Sell Price), ADR-061 (Commercial Charge Model), ADR-062 (Currency and UOM in Pricing), ADR-063 (Price Override Governance), ADR-064 (Financial Settlement Interface), ADR-065 (Rate Precedence Contract), ADR-066 (Price Snapshot & Commitment Boundary)

---

## 1. Context

Canonical pricing domain (`lib/pricing/`) is fully implemented with service, repository, selection engine, calculation engine, override governance, and migration service. `pricing_rates` tables have RLS. Zero production imports exist outside tests. Five legacy pricing tables remain runtime-active and fragmented.

## 2. Decision

**Activate deployed but unwired canonical pricing domain.**

### 2.1 Activation Strategy

Wire `PricingService` into:
1. SO line item creation flow
2. Operational writers
3. Migration service execution

### 2.2 Non-Boundary

Legacy table decommissioning is covered by ADR-083. Settlement activation is covered by ADR-084.

### 2.3 Evidence

- `lib/pricing/` contains full service, repository, selection engine, calculation engine, override governance
- `pricing_rates` tables have RLS but no writers
- Zero production imports outside tests

## 3. Forces / Constraints

- Canonical pricing design is structurally sound (ADR-057..066)
- Legacy pricing tables are runtime-active and written by different clients/server actions
- No runtime path connects legacy pricing to canonical pricing
- Activation must not break existing operational paths during transition

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Keep canonical pricing dormant | Wastes deployed architecture; leaves fragmentation |
| Immediate legacy replacement | Disrupts operational SBUs; requires coordinated migration |
| Dual-write without canonical authority | Creates competing models |

## 5. Canonical Authority

| Resource | Authority |
|----------|-----------|
| Rate master | `pricing_rates` |
| Rate version | `pricing_rate_versions` |
| Rate item | `pricing_rate_items` |
| Price override | `pricing_price_overrides` |
| Legacy tables | Active until decommissioned per ADR-083 |

## 6. Invariants

1. Canonical pricing domain is the authoritative pricing model.
2. Legacy pricing tables remain readable during transition.
3. No competing pricing models are introduced.
4. Activation is incremental per SBU.

## 7. Tenant / Security Model

- `pricing_rates` tables enforce `tenant_id = get_my_tenant_id()` via RLS
- IdentityContext governs all pricing access
- No client-side canonical pricing mutation

## 8. Consequences

- Canonical pricing becomes reachable from runtime paths
- Legacy pricing remains active during transition period
- Requires coordination with ADR-083 (decommissioning) and ADR-081 (price transfer)

## 9. Future Revisit Conditions

Revisit if:
- New SBUs require pricing activation
- Rate model requires extension beyond ADR-057..066
- Dual-write period exceeds acceptable duration

---

**END OF ADR-082**
