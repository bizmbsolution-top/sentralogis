# DATA-4E PRE-EXECUTION EVIDENCE

**Date:** 2026-09-02  
**Migration:** `20260902_049_fw_locations_to_canonical.sql`  

---

## Schema Evidence

### E1 — `md_locations` Schema

| Column | Type | Nullable | Source |
|--------|------|----------|--------|
| id | UUID | NO (PK) | migration 030 |
| tenant_id | UUID | YES (FK → tenants) | migration 030 |
| location_code | TEXT | NO | migration 030 |
| name | TEXT | NO | migration 030 |
| address | TEXT | NO | migration 030 |
| address_notes | TEXT | YES | migration 062 |
| city | TEXT | YES | migration 030 |
| province | TEXT | YES | migration 030 |
| postal_code | TEXT | YES | migration 030 |
| country | TEXT | YES (default 'ID') | migration 062 |
| latitude | NUMERIC | YES | migration 030 |
| longitude | NUMERIC | YES | migration 030 |
| is_active | BOOLEAN | YES | migration 030 |
| location_type | TEXT | YES | migration 036 |
| external_code | TEXT | YES | migration 036 |
| parent_id | UUID (FK → md_locations.id) | YES | migration 036 |
| timezone | TEXT | YES | migration 036 |
| created_at | TIMESTAMPTZ | YES | migration 030 |
| updated_at | TIMESTAMPTZ | YES | migration 062 |

**Unique Constraints:** NONE on (tenant_id, external_code) or location_code

**Result: PASS** — Schema confirmed

---

### E2 — `fw_locations` Schema

| Column | Type | Nullable | Source |
|--------|------|----------|--------|
| location_id | UUID | NO (PK) | migration 174 |
| tenant_id | UUID | NO (default '00000000-...') | migration 024 |
| name | TEXT | NO | migration 174 |
| type | location_type (ENUM) | NO | migration 174 |
| created_at | TIMESTAMPTZ | NO | migration 174 |
| updated_at | TIMESTAMPTZ | NO | migration 174 |

**Result: PASS** — Schema confirmed

---

### E3 — FK Column Type Compatibility

| Column | Type | Nullable | Compatible with md_locations.id? |
|--------|------|----------|----------------------------------|
| fw_locations.location_id | UUID | NO | YES (same type) |
| fw_order_headers.origin_port_id | UUID | NO | YES (same type) |
| fw_order_headers.dest_port_id | UUID | NO | YES (same type) |
| fw_legs.start_location_id | UUID | NO | YES (same type) |
| fw_legs.end_location_id | UUID | NO | YES (same type) |
| md_locations.id | UUID | NO | YES (target) |

**Result: PASS** — All columns are UUID type

---

### E4 — Existing FK Constraints

| Table | Column | Constraint Name (auto-generated) | References | ON DELETE |
|-------|--------|----------------------------------|------------|-----------|
| fw_order_headers | origin_port_id | fw_order_headers_origin_port_id_fkey | fw_locations.location_id | RESTRICT |
| fw_order_headers | dest_port_id | fw_order_headers_dest_port_id_fkey | fw_locations.location_id | RESTRICT |
| fw_legs | start_location_id | fw_legs_start_location_id_fkey | fw_locations.location_id | RESTRICT |
| fw_legs | end_location_id | fw_legs_end_location_id_fkey | fw_locations.location_id | RESTRICT |

**Finding:** Original migrations 175/176 did NOT explicitly name constraints. PostgreSQL auto-generates names using pattern `<table>_<column>_fkey`.

**Migration 049 Phase 2 drops both naming conventions:** `fw_order_headers_origin_port_id_fkey` AND `fk_fw_order_headers_origin_port`.

**Result: PASS** — Migration 049 covers both naming conventions

---

### E5 — md_locations Mapping Uniqueness

| Check | Result |
|-------|--------|
| UNIQUE constraint on (tenant_id, external_code) | **NO** |
| UNIQUE constraint on external_code | **NO** |
| UNIQUE index on (tenant_id, external_code) | **NO** |

**Finding:** `md_locations` does NOT have a unique constraint on (tenant_id, external_code). The mapping `(tenant_id, external_code) → exactly one md_locations.id` is **NOT guaranteed** by the database.

**Risk:** Duplicate canonical mappings could exist if migration is run multiple times or if data is inconsistent.

**Result: FAIL** — Mapping uniqueness NOT guaranteed by database constraint

---

### E6 — Location Code Collision Risk

| Check | Result |
|-------|--------|
| UNIQUE constraint on (tenant_id, location_code) | **NO** |
| UNIQUE constraint on location_code | **NO** |

**Finding:** `md_locations` does NOT have a unique constraint on location_code. The generated value `'FW-' || fl.location_id::TEXT` could collide with an existing row.

**Risk:** If an existing `md_locations` row already has `location_code = 'FW-<some_uuid>'`, the INSERT would fail or create a duplicate.

**Result: FAIL** — Collision risk POSSIBLE

---

### E7 — Live Data Verification

**LIVE DATA VERIFICATION: NOT AVAILABLE**

No database connection available in this environment. Cannot verify:
1. Duplicate (tenant_id, external_code) in md_locations
2. Collision between generated FW-<location_id> and existing location_code
3. Current fw_locations references

**Result: UNAVAILABLE**

---

## Migration 049 Static Review

| Check | Result | Evidence |
|-------|--------|----------|
| Deterministic mapping | **PASS** | INSERT ... WHERE NOT EXISTS is deterministic |
| Duplicate mapping risk | **FAIL** | No UNIQUE constraint on (tenant_id, external_code); repeated execution could create duplicates |
| location_code collision | **FAIL** | No UNIQUE constraint on location_code; FW-<id> could collide |
| FK type compatibility | **PASS** | All UUID |
| Legacy FK coverage | **PASS** | Both naming conventions covered |
| New FK correctness | **PASS** | Correct target md_locations(id) |
| Conditional constraint safety | **PASS** | IF NOT EXISTS prevents errors |

---

## Final Decision

### **RED — DO NOT EXECUTE 049**

### Blockers

| # | Blocker | Severity |
|---|---------|----------|
| 1 | No UNIQUE constraint on (tenant_id, external_code) | HIGH |
| 2 | No UNIQUE constraint on location_code | HIGH |
| 3 | Live data verification unavailable | MEDIUM |

### Recommended Actions

Before executing migration 049:

1. **Add UNIQUE constraint** on `md_locations(tenant_id, external_code)` as a prerequisite migration
2. **Add UNIQUE constraint** on `md_locations(tenant_id, location_code)` to prevent collisions
3. **Verify live data** for existing collisions before execution

---

**END OF PRE-EXECUTION EVIDENCE**
