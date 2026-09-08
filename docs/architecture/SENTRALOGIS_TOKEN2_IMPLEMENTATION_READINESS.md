# SENTRALOGIS — PHASE TOKEN-2
# IMPLEMENTATION READINESS

**Date:** 2026-09-02  

---

## 1. Readiness Assessment

| Component | Readiness | Blocker |
|-----------|-----------|---------|
| Identity Model | READY | IdentityContext supports tenant_id |
| Authorization Model | READY | Super Admin authority exists |
| RLS Foundation | READY | Tenant isolation enforced |
| Copilot Engine | READY | Engine exists, needs context adapter |
| Token Value | GAP | Needs tenant-specific table |
| Service Rates | GAP | Needs tenant-specific table |
| Consumption Events | GAP | Needs new table + idempotency |
| Historical Truth | GAP | Needs value snapshot |
| Portal APIs | GAP | Needs customer/vendor scoped APIs |
| Mobile UX | PARTIAL | Responsive corrections needed |

---

## 2. Implementation Sequencing

### Phase TOKEN-3: Foundation
1. Create `tenant_token_prices` table
2. Create `tenant_service_rates` table
3. Create `token_consumption_events` table with idempotency
4. Extend `tenants.token_balance` with ledger derivation

### Phase TOKEN-4: Consumption Engine
1. Replace trigger-based burn with event-driven consumption
2. Implement idempotency via unique constraint
3. Add historical value snapshot
4. Integrate with domain completion events

### Phase TOKEN-5: Portal & UX
1. Customer portal token APIs
2. Vendor portal token APIs
3. Super Admin token configuration UI
4. Tenant token dashboard

### Phase TOKEN-6: Mobile & Copilot
1. Mobile optimization
2. Copilot context adapter for token queries

---

## 3. Backend Gaps to Document for Future Phase

| Gap | API | Service | Repository | Priority |
|-----|-----|---------|------------|----------|
| Tenant token value | `/api/v1/admin/token/value` | TokenAdminService | tenant-token-prices | P0 |
| Tenant service rates | `/api/v1/admin/token/rates` | TokenAdminService | tenant-service-rates | P0 |
| Token consumption | Internal event handler | TokenConsumptionService | token-consumption-events | P0 |
| Customer token view | `/api/v1/portal/customer/token` | CustomerPortalService | customer-token-view | P0 |
| Vendor token view | `/api/v1/portal/vendor/token` | VendorPortalService | vendor-token-view | P0 |
| Token ledger | `/api/v1/token/ledger` | TokenLedgerService | token-ledger | P1 |

---

## 4. Security Acceptance Criteria

| Criteria | Test |
|----------|------|
| Tenant isolation | Tenant A cannot read Tenant B balance |
| Super Admin only | Tenant admin cannot modify token value |
| Idempotent burn | Duplicate event produces single burn |
| Historical immutability | Past consumption cannot be modified |
| Pricing boundary | Token config does not affect pricing |
| Financial boundary | Token history is not accounting ledger |

---

## 5. Architecture Boundaries Preserved

| Boundary | Status |
|----------|--------|
| One pricing authority | YES (5C closed) |
| One financial authority | YES (5D green) |
| One token authority | YES (extending existing) |
| IdentityContext authoritative | YES |
| Tenant isolation | YES |
| RLS enforcement | YES |
| No browser-direct mutation | YES |

---

## 6. ADR Requirements

**New ADRs Required: NONE**

Token economy extends existing Master Token architecture governed by ADR-057 through ADR-069 without requiring new architectural decisions.

---

**END OF IMPLEMENTATION READINESS**
