# ADR-057 — Pricing Domain Authority

**Status:** PROPOSED (Phase 5C-R, 2026-09-01)  
**Date:** 2026-09-01  
**Depends on:** ADR-034 (Engagement to Sales Order), ADR-039 (Fulfillment is Composition)  

---

## 1. Context

Phase 5C discovery established that SENTRALOGIS currently has five disconnected pricing structures (`fw_price_master`, `crm_sbu_customer_rates`, `md_billing_rates`, `crm_quotation_items`, `fw_container_items`) with no canonical pricing authority. Sales Order revenue (`total_agreed_revenue`) is a single manually-entered number with no lineage to Quote pricing. Quote prices are mutable with no snapshot mechanism.

## 2. Decision

**Pricing is a canonical Commercial-domain capability.**

### 2.1 Pricing Owns
1. Rate definitions (per capability, per lane, per customer).
2. Rate versions (validity periods, snapshots).
3. Pricing rules (minimum charge, surcharges, tax treatment).
4. Pricing calculations (deterministic charge computation).
5. Commercial charge calculation (what should be charged).
6. Price snapshots (what was actually committed).

### 2.2 Pricing Does NOT Own
1. Sales Order lifecycle.
2. Fulfillment composition.
3. Shipment movement.
4. Forwarding execution.
5. Customs execution.
6. Trucking execution.
7. Warehouse execution.
8. Invoice lifecycle, payment, settlement.

### 2.3 Canonical Namespace
`lib/commercial/pricing/` is the canonical pricing module location.

## 3. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Each SBU owns its own pricing | Creates 5+ competing engines, no canonical truth |
| Forwarding owns all pricing | Violates domain boundaries (Customs, Trucking, Warehouse are peers) |
| Financial Settlement owns pricing | Violates separation of concerns (settlement consumes, doesn't define) |

## 4. Consequences

- All pricing master data migrates behind server-side authority.
- Browser-direct pricing writes are eliminated.
- A single source of truth for commercial pricing exists across all capabilities.

## 5. Invariants

1. Pricing definitions are Commercial-domain authority.
2. Pricing does not mutate operational state.
3. Operational domains consume pricing, never define it.
4. Pricing calculations are deterministic and reproducible.

## 6. Security Implications

- Pricing mutations require `pricing:manage` permission.
- Pricing reads require `pricing:read` permission.
- Buying cost/margin visibility requires `pricing:view_cost` / `pricing:view_margin`.
- Tenant isolation is server-derived (IdentityContext + RLS).

## 7. Migration Implications

- `fw_price_master` becomes a legacy adapter.
- `crm_sbu_customer_rates` becomes a legacy adapter.
- New canonical rate model is created.
- Existing pricing data is migrated to canonical model.
