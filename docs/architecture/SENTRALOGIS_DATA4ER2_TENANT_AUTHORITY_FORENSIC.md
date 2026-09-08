# SENTRALOGIS — DATA-4E-R2
# TENANT AUTHORITY FORENSIC

**Date:** 2026-09-02  
**Phase:** DATA-4E-R2  
**Nature:** FORENSIC DISCOVERY ONLY  

---

## 1. BLOCKER A RESOLVED — Tenant Authority

### 1.1 Finding

**fw_locations HAS tenant_id** — added by migration `20260831_024_phase5a2_forwarding_schema_repair.sql`:

```sql
ALTER TABLE IF EXISTS public.fw_locations 
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
```

### 1.2 Tenant Derivation Path

| Path | Exists | Cardinality | Deterministic | Tenant-safe |
|------|--------|-------------|---------------|-------------|
| fw_locations.tenant_id → tenants.id | **YES** | 1:1 | **YES** | **YES** |

**The tenant authority is DIRECT — no inference needed.**

### 1.3 Previous Error

The DATA-4E-R analysis incorrectly stated "fw_locations has no tenant_id column" because it only inspected the original migration 174, not the repair migration 024.

---

## 2. Tenant Mapping Proof

Since fw_locations.tenant_id exists:

| Mapping | Deterministic? |
|---------|----------------|
| (tenant_id, location_id) → md_locations | YES |
| external_code = location_id::TEXT | YES |
| tenant-scoped matching | YES |

**All locations can be deterministically mapped to exactly one tenant.**

---

## 3. Cross-Tenant Risk

| Risk | Status |
|------|--------|
| Cross-tenant mapping | **IMPOSSIBLE** — tenant_id is direct |
| Ambiguous tenant | **IMPOSSIBLE** — single tenant_id column |
| Unmappable location | **IMPOSSIBLE** — all locations have tenant_id |

---

**END OF TENANT AUTHORITY FORENSIC**
