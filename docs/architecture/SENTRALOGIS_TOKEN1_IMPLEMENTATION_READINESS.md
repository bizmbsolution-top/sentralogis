# SENTRALOGIS — PHASE TOKEN-1
# IMPLEMENTATION READINESS

**Date:** 2026-09-01  

---

## 1. Feasibility Assessment

| Question | Answer |
|----------|--------|
| Can existing Master Token be extended? | YES |
| Can tenant-specific token value be supported? | YES — add `tenant_id` to `token_prices` |
| Can service-level consumption be supported? | YES — extend trigger model |
| Can burn-on-completion be supported? | YES — already implemented |
| Can Forwarding composition consume additional services? | YES — with `token_consumption_events` |
| Can WMS remain bundled? | YES — with service-level completion events |
| Can Super Admin exclusively control token economics? | YES — already enforced |
| Can historical consumption remain immutable? | YES — with value snapshot |
| Can duplicate burns be prevented? | YES — with unique constraint |
| Can all of this remain outside Pricing 5C? | YES — token ≠ pricing |

---

## 2. Recommended Implementation Model

### 2.1 Token Value (Tenant-Specific)

```sql
CREATE TABLE tenant_token_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  price_per_token INTEGER NOT NULL DEFAULT 1000,
  currency VARCHAR(3) DEFAULT 'IDR',
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, effective_from)
);
```

### 2.2 Service-Level Consumption

```sql
CREATE TABLE token_consumption_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_type TEXT NOT NULL,  -- 'JO', 'WMS_INBOUND', 'FORWARDING_SERVICE'
  source_id UUID NOT NULL,
  service_type TEXT NOT NULL, -- 'TRUCKING', 'CUSTOMS', 'WMS_INBOUND', etc.
  tokens_consumed INTEGER NOT NULL DEFAULT 1,
  token_value_snapshot INTEGER NOT NULL, -- value at consumption
  consumed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, source_type, source_id, service_type) -- idempotency
);
```

### 2.3 Forwarding Composition

Forwarding JO completion burns:
- 1 token for Forwarding base
- +1 token per composed service (Customs, Trucking, WMS) at their completion

---

## 3. Prerequisites

| Prerequisite | Status |
|--------------|--------|
| `tenant_token_prices` table | NEW |
| `token_consumption_events` table | NEW |
| Idempotency unique constraints | NEW |
| Service-level completion events (WMS) | NEW |
| Forwarding composition tracking | NEW |
| Portal token APIs | NEW |
| Token test suite | NEW |

---

## 4. Architecture Boundaries Preserved

| Boundary | Status |
|----------|--------|
| One pricing authority | YES (5C closed) |
| One financial authority | YES (5D closed) |
| One token authority | YES (extending existing) |
| IdentityContext authoritative | YES |
| Tenant isolation | YES |
| RLS enforcement | YES |

---

**END OF IMPLEMENTATION READINESS**
