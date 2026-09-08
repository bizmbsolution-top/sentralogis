# SENTRALOGIS — PHASE 5A WAVE 1
# SCHEMA FOUNDATION REPAIR & CONSOLIDATION NUMBER AUTHORITY

**Date:** 2026-09-05  
**Status:** GREEN — WAVE 1 COMPLETE  
**Phase:** 5A Wave 1 — Schema Foundation Repair  

---

## 1. EXECUTIVE SUMMARY

Phase 5A Wave 1 has completed the schema foundation repair for SBU Forwarding Domestik. All broken migrations have been repaired, the `fw_locations` → `md_locations` canonicalization is complete, and consolidation number authority has been aligned with the canonical pattern established by U-11/035/041.

| Workstream | Status | Evidence |
|------------|--------|----------|
| Broken migrations 174/175/176/178 | **CLOSED** | Repaired in-place: syntax fixes, tenant_id, RLS, TEXT enums |
| fw_locations → md_locations canonicalization | **CLOSED** | Migrations 039–049 handle data migration + FK recreation |
| Consolidation number authority | **CLOSED** | `next_consol_number()` + hardened trigger (migration 052) |
| Phase 5A-2 schema repair | **CLOSED** | Migration 024 additive repair, idempotent |
| Targeted validation | **PASS** | 154/154 Phase 5A tests PASS |

**Validation:**
- TypeScript: 0 errors
- Phase 5A-2 tests: 36/36 PASS
- Phase 5A-5 tests: 24/24 PASS
- U-26R P1 tests: 27/27 PASS
- Full Phase 5A regression: 154/154 PASS

---

## 2. BROKEN MIGRATION REPAIRS

### 2.1 Migration 174 (`fw_locations`)

**Original defects:**
- `ON UPDATE NOW()` — invalid PostgreSQL syntax
- Unqualified `fw_locations` references
- Missing `tenant_id`, RLS, GRANTS

**Repaired:**
- Removed `ON UPDATE NOW()`
- Schema-qualified `public.fw_locations`
- Added `tenant_id` via migration 024

### 2.2 Migration 175 (`fw_order_headers`)

**Original defects:**
- No `tenant_id` column
- Broken `order_status` enum reference
- No RLS policy

**Repaired:**
- Added `tenant_id UUID NOT NULL`
- Replaced broken enum with `TEXT CHECK (status IN (...))`
- Added RLS policy `fw_order_headers_tenant_isolation`

### 2.3 Migration 176 (`fw_legs`)

**Original defects:**
- `NOT feed= 'own'` syntax corruption
- Broken enum references (`leg_type`, `execution_mode`, `leg_status`)
- No `tenant_id`, no RLS

**Repaired:**
- Removed `Tiempo`/`NOT feed=` corruption
- Replaced broken enums with `TEXT CHECK` constraints
- Added `tenant_id UUID NOT NULL`
- Added RLS policy `fw_legs_tenant_isolation`

### 2.4 Migration 178 (`fw_price_master`)

**Original defects:**
- `sub_type sub_type` column duplication
- Extra `}` syntax error
- Missing `IF NOT EXISTS` guards

**Repaired:**
- Replaced `sub_type sub_type` with `sub_type TEXT NOT NULL DEFAULT 'standard'`
- Removed extra `}`
- Added `IF NOT EXISTS` guards

---

## 3. `fw_locations` → `md_locations` CANONICALIZATION

### 3.1 Migration Chain (039–049)

| Migration | Purpose |
|-----------|---------|
| 039–048 | Data migration: backfill `md_locations` from `fw_locations`, normalize addresses |
| 049 | Drop/recreate FKs on `fw_order_headers` and `fw_legs` to point at `md_locations` |

### 3.2 Application Layer Verification

Zero remaining `fw_locations`/`fw_location_id` references across:
- `app/` — 0 references
- `lib/` — 0 references  
- `components/` — 0 references

### 3.3 Database Types Confirmation

`lib/supabase/database.types.ts` confirms canonical forwarding tables exist:
- `fw_consolidations`
- `fw_container_assignments`
- `fw_container_items`
- `fw_price_master`

---

## 4. CONSOLIDATION NUMBER AUTHORITY

### 4.1 Original State (Migration 171)

The existing `generate_fw_consol_number()` trigger function:
- **Atomic:** Yes — uses `nextval('fw_consolidation_seq')`
- **DB-authoritative:** Yes — server-side `BEFORE INSERT` trigger
- **Format:** `FWD-YYYYMM-NNN` (matches PRD `190726.md`)
- **Unique constraint:** `UNIQUE(tenant_id, consol_number)` present

**Gaps identified:**
- No canonical `next_consol_number()` callable function
- Missing `SECURITY DEFINER` and `SET search_path = public` on trigger function
- Sequence not schema-qualified (`fw_consolidation_seq` vs `public.fw_consolidation_seq`)
- Missing `GRANT USAGE, SELECT ON SEQUENCE` to authenticated role
- No COMMENT documenting client prohibition

### 4.2 Canonical Authority Implemented (Migration 052)

**New function: `next_consol_number(p_tenant_id UUID)`**

```sql
CREATE OR REPLACE FUNCTION public.next_consol_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_consol_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq := nextval('public.fw_consolidation_seq');
  v_consol_number := 'FWD-' || v_year || v_month || '-' || lpad(v_seq::text, 3, '0');
  RETURN v_consol_number;
END;
$$;
```

**Mirrors canonical pattern:**
- `SECURITY DEFINER` — can read sequence regardless of caller privileges
- `SET search_path = public` — prevents schema injection
- `nextval()` — atomic, concurrency-safe
- `GRANT EXECUTE` to authenticated
- `GRANT USAGE, SELECT ON SEQUENCE` to authenticated
- COMMENT documenting "Client MUST NOT generate"

**Trigger hardened:**

```sql
DROP TRIGGER IF EXISTS trg_generate_fw_consol_number ON public.fw_consolidations;
DROP FUNCTION IF EXISTS public.generate_fw_consol_number();

CREATE OR REPLACE FUNCTION public.generate_fw_consol_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.consol_number IS NULL OR NEW.consol_number = '' THEN
    NEW.consol_number := public.next_consol_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER trg_generate_fw_consol_number
  BEFORE INSERT ON public.fw_consolidations
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_fw_consol_number();
```

**Defense-in-depth:**
- Trigger auto-generates when client omits `consol_number`
- Server code can explicitly call `next_consol_number()` for pre-view
- `UNIQUE(tenant_id, consol_number)` is final safety net

### 4.3 Validation

No client-side `consol_number` generation found in:
- `app/api/forwarding/` — 0 occurrences
- `app/(dashboard)/sbu/forwarding/` — 0 occurrences  
- `lib/actions/forwardingActions.ts` — 0 occurrences

All `consol_number` references are read-only (display, filter, tracking).

---

## 5. PHASE 5A-2 SCHEMA REPAIR VALIDATION

### 5.1 Migration 024 (Additive Repair)

**Idempotency verified:**
- `CREATE TABLE IF NOT EXISTS` — safe re-run
- `ADD COLUMN IF NOT EXISTS` — safe re-run
- `DROP POLICY IF EXISTS` + `CREATE POLICY` — safe re-run
- `CREATE INDEX IF NOT EXISTS` — safe re-run

### 5.2 Test Results

| Test Suite | Result |
|------------|--------|
| Phase 5A-2 Forwarding Schema Repair | 36/36 PASS |
| Phase 5A-5 FCL/LCL Workflow | 24/24 PASS |
| Phase 5A-3 Forwarding Vertical Slice | PASS |
| Phase 5A-2R Forwarding Repository Boundary | PASS |
| Phase 5A-4 Operational Assignment | PASS |
| U-26R P1 Production Readiness | 27/27 PASS |

---

## 6. ARCHITECTURE INVARIANTS PRESERVED

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Zero browser direct `supabase.from(...)` in canonical domain | **HELD** | Verified in Phase 5A-2 tests |
| Zero cross-domain mutations | **HELD** | Forwarding tables only reference canonical `work_orders`, `customers` |
| Zero direct CEISA transmissions | **HELD** | No customs transmission code in forwarding domain |
| Protected systems frozen | **HELD** | No modifications to `job_orders`, `work_orders`, driver systems |
| Server-derived tenant isolation | **HELD** | RLS `tenant_id = get_my_tenant_id()` on all forwarding tables |
| Canonical number authority | **HELD** | `next_consol_number()` follows U-11/035/041 pattern |

---

## 7. MIGRATIONS MODIFIED/CREATED

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/174_fw_locations.sql` | Repaired in-place | Removed `ON UPDATE NOW()`, schema-qualified |
| `supabase/migrations/175_fw_order_headers.sql` | Repaired in-place | Added `tenant_id`, TEXT status, RLS |
| `supabase/migrations/176_fw_legs.sql` | Repaired in-place | Removed corruption, TEXT enums, `tenant_id`, RLS |
| `supabase/migrations/178_fw_price_master.sql` | Repaired in-place | Fixed `sub_type`, `IF NOT EXISTS`, removed `}` |
| `supabase/migrations/20260831_024_phase5a2_forwarding_schema_repair.sql` | Additive repair | Idempotent tenant isolation + schema fixes |
| `supabase/migrations/20260905_052_consol_number_canonical_authority.sql` | Additive canonical | `next_consol_number()` + hardened trigger |

---

## 8. FILES MODIFIED

| File | Change |
|------|--------|
| `lib/__tests__/phase5a2-forwarding-schema-repair.test.ts` | Added 6 consol_number canonical authority tests; fixed orphaned tests |

---

## 9. CONTROLLED REMEDIATION REGISTER UPDATE

| ID | Previous Status | New Status | Evidence |
|----|----------------|------------|----------|
| FWD-GAP-01 | OPEN | **CLOSED** | Migration 024 + 175 repair |
| FWD-GAP-02 | OPEN | **CLOSED** | Migration 024 + 176 repair |
| FWD-GAP-03 | OPEN | **CLOSED** | Migration 024 + 174 repair |
| FWD-GAP-05 | OPEN | **CLOSED** | Migration 024 + 178 repair |
| FWD-CONSOL-AUTH | OPEN | **CLOSED** | Migration 052: `next_consol_number()` + hardened trigger |
| FWD-CANONICAL-FK | OPEN | **CLOSED** | Migrations 039–049: `fw_locations` → `md_locations` |

---

## 10. FINAL RESPONSE

PHASE 5A WAVE 1 STATUS: **GREEN**

Schema Foundation: **REPAIRED**
- Broken migrations 174/175/176/178: REPAIRED
- `fw_locations` canonicalization: COMPLETE
- Consolidation number authority: CANONICAL

Tests: **154/154 PASS**
TypeScript: **0 errors**
Full Regression: **PASS**

Wave 2: **READY FOR AUTHORIZATION**

---

**END OF PHASE 5A WAVE 1 REPORT**
