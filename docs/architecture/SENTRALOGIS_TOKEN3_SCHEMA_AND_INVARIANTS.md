# SENTRALOGIS — PHASE TOKEN-3
# SCHEMA AND INVARIANTS

**Date:** 2026-09-02  

---

## 1. Schema

### 1.1 tenant_token_prices

```sql
CREATE TABLE public.tenant_token_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  price_per_token INTEGER NOT NULL DEFAULT 1000,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, effective_from)
);
```

### 1.2 tenant_service_rates

```sql
CREATE TABLE public.tenant_service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('TRUCKING', 'CUSTOMS', 'WMS_INBOUND', 'WMS_OUTBOUND', 'WMS_TRANSFER', 'FORWARDING')),
  tokens_per_completion NUMERIC(8,2) NOT NULL DEFAULT 1,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, service_type, effective_from)
);
```

### 1.3 token_consumption_events

```sql
CREATE TABLE public.token_consumption_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('JO', 'SHP', 'CUS_DECLARATION', 'WH_INBOUND', 'WH_OUTBOUND', 'WH_TRANSFER')),
  source_id UUID NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('TRUCKING', 'CUSTOMS', 'WMS_INBOUND', 'WMS_OUTBOUND', 'WMS_TRANSFER', 'FORWARDING')),
  tokens_consumed NUMERIC(8,2) NOT NULL,
  token_value_snapshot INTEGER NOT NULL,
  monetary_equivalent NUMERIC(18,2) NOT NULL,
  rule_version INTEGER NOT NULL DEFAULT 1,
  idempotency_key TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_type, source_id, service_type)
);
```

---

## 2. Invariants

### 2.1 Idempotency Invariant

> **A repeated completion event MUST NOT create multiple token burns.**

**Enforcement:** `UNIQUE(tenant_id, source_type, source_id, service_type)` constraint on `token_consumption_events`.

### 2.2 Historical Truth Invariant

> **Historical consumption MUST NOT be recalculated using a later token value.**

**Enforcement:** `token_value_snapshot` and `monetary_equivalent` fields preserve economics at consumption time. Table is append-only.

### 2.3 Tenant Isolation Invariant

> **Tenant A can NEVER access Tenant B's token state.**

**Enforcement:** RLS policies on all tables filter by `tenant_id = get_my_tenant_id()`.

### 2.4 Super Admin Authority Invariant

> **Only SENTRALOGIS Super Admin may configure token economics.**

**Enforcement:** RLS policies restrict INSERT/UPDATE to `owner`/`superadmin` roles.

### 2.5 Pricing Boundary Invariant

> **Token is NOT Pricing.**

**Enforcement:** Token tables are separate from `lib/pricing/`. No automatic token → invoice coupling.

### 2.6 Financial Boundary Invariant

> **Token is NOT Financial.**

**Enforcement:** Token tables are separate from `lib/financial/`. Token history is not an accounting ledger.

### 2.7 Completion Authority Invariant

> **Token subsystem consumes completion events. It does NOT own operational completion.**

**Enforcement:** Token burn is triggered by domain completion events (e.g., `job_orders.status`).

### 2.8 No Reservation Invariant

> **V1 has NO token reservation.**

**Enforcement:** Tokens burn ONLY at service completion, not at selection.

### 2.9 Balance Semantics Invariant

> **Master Token = prepaid wallet, balance is non-negative.**

**Enforcement:** `GREATEST(balance - rate, 0)` prevents negative balance.

### 2.10 WMS Bundling Invariant

> **WMS activities are operational details. They do NOT independently consume tokens.**

**Enforcement:** Token burn occurs at canonical WMS completion events (inbound/outbound/transfer).

### 2.11 Forwarding Composition Invariant

> **Forwarding composition determines selected services. It does NOT itself cause token burn.**

**Enforcement:** Each composed service burns independently at its own completion.

---

## 3. RLS Policies

| Table | SELECT | INSERT | UPDATE |
|-------|--------|--------|--------|
| `tenant_token_prices` | Tenant-scoped | Super Admin only | Super Admin only |
| `tenant_service_rates` | Tenant-scoped | Super Admin only | Super Admin only |
| `token_consumption_events` | Tenant-scoped | System only | Denied |

---

## 4. Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `tenant_token_prices` | `idx_tenant_token_prices_tenant` | Tenant lookup |
| `tenant_token_prices` | `idx_tenant_token_prices_effective` | Effective period lookup |
| `tenant_service_rates` | `idx_tenant_service_rates_tenant` | Tenant lookup |
| `tenant_service_rates` | `idx_tenant_service_rates_service` | Service lookup |
| `token_consumption_events` | `idx_token_consumption_tenant` | Tenant lookup |
| `token_consumption_events` | `idx_token_consumption_source` | Source lookup |
| `token_consumption_events` | `idx_token_consumption_service` | Service lookup |
| `token_consumption_events` | `idx_token_consumption_consumed_at` | Time-series lookup |
| `token_consumption_events` | `uq_token_consumption_idempotency` | Idempotency enforcement |

---

**END OF SCHEMA AND INVARIANTS**
