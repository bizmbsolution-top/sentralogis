# SENTRALOGIS — DATA-4E-R2
# fw_order_headers FORENSIC

**Date:** 2026-09-02  
**Phase:** DATA-4E-R2  
**Nature:** FORENSIC DISCOVERY ONLY  

---

## 1. Schema

```sql
CREATE TABLE IF NOT EXISTS public.fw_order_headers (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  wo_id UUID NOT NULL REFERENCES work_orders(wo_id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(customer_id) ON DELETE RESTRICT,
  vessel_name TEXT,
  voyage_no TEXT,
  etd DATE,
  eta DATE,
  origin_port_id UUID NOT NULL REFERENCES fw_locations(location_id) ON DELETE RESTRICT,
  dest_port_id UUID NOT NULL REFERENCES fw_locations(location_id) ON DELETE RESTRICT,
  cargo_owner_name TEXT,
  cargo_owner_email TEXT,
  cargo_owner_phone TEXT,
  consignee_name TEXT,
  consignee_email TEXT,
  consignee_phone TEXT,
  tracking_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Source:** Migration 20260831_024_phase5a2_forwarding_schema_repair.sql

---

## 2. Architectural Status

| Aspect | Finding |
|--------|---------|
| In database.types.ts | **NO** — not typed |
| Direct production queries | **0** — no `.from('fw_order_headers')` in lib/ or app/ |
| API routes | **0** — no routes reference it |
| Services | **0** — no services reference it |
| UI components | **0** — no UI references it |
| Tests | Schema verification only |

### 2.1 Classification

**D — Historical-only structure**

fw_order_headers is:
- Created by migration 024
- Not typed in TypeScript
- Not queried in production code
- Not referenced in API/UI/services
- Only referenced in test files for schema verification

---

## 3. FK Dependencies

| FK | Source Column | Target | Runtime Use |
|----|---------------|--------|-------------|
| 1 | origin_port_id | fw_locations.location_id | **NO** — table not actively used |
| 2 | dest_port_id | fw_locations.location_id | **NO** — table not actively used |

---

## 4. Business Meaning

| FK | Meaning |
|----|---------|
| origin_port_id | Origin port of forwarding order |
| dest_port_id | Destination port of forwarding order |

---

## 4. Migration Dependency

Since fw_order_headers is **not actively used in production**, its FKs to fw_locations are **not runtime blockers**. However, they are still schema dependencies that must be resolved before fw_locations can be dropped.

---

**END OF fw_order_headers FORENSIC**
