# DATA-4E CONSTRAINT PREFLIGHT

**Date:** 2026-09-02  
**Migration:** `20260902_049_fw_locations_to_canonical.sql`  

---

## C1 — Existing Constraint / Index Inventory

### Constraints on `md_locations`

| Constraint | Type | Columns | Source |
|------------|------|---------|--------|
| PRIMARY KEY | PK | id | migration 030 |
| md_locations_tenant_id_fkey | FK | tenant_id → tenants.id | migration 030 |

**UNIQUE constraints: NONE**

### Indexes on `md_locations`

| Index | Type | Columns | Source |
|-------|------|---------|--------|
| idx_md_locations_type | BTREE | location_type | migration 036 |
| idx_md_locations_parent | BTREE | parent_id | migration 036 |
| idx_md_locations_tenant_type | BTREE | tenant_id, location_type | migration 036 |
| idx_md_locations_external_code | PARTIAL BTREE | external_code WHERE NOT NULL | migration 036 |

**Result: PASS** — No existing UNIQUE constraint on (tenant_id, external_code) or (tenant_id, location_code)

---

## C2 — Live Duplicate Check

**LIVE DATA VERIFICATION: UNAVAILABLE**

No database connection available.

| Check | Result |
|-------|--------|
| Duplicate (tenant_id, external_code) | UNAVAILABLE |
| Duplicate (tenant_id, location_code) | UNAVAILABLE |

**Result: UNAVAILABLE**

---

## C3 — NULL Semantics

| Column | Nullable | Impact on UNIQUE |
|--------|----------|------------------|
| tenant_id | YES | NULLs treated as distinct in PostgreSQL UNIQUE |
| external_code | YES | NULLs treated as distinct |
| location_code | NO | All values enforced |

### Analysis

**Proposed constraint: `UNIQUE (tenant_id, external_code)`**
- NULLs in either column are treated as distinct by PostgreSQL
- Multiple rows with `external_code = NULL` would be allowed
- This is acceptable because migration 049 only maps rows where `external_code = fw_locations.location_id::TEXT` (non-NULL)

**Proposed constraint: `UNIQUE (tenant_id, location_code)`**
- `location_code` is NOT NULL
- `tenant_id` is nullable but migration always sets it
- This constraint would effectively prevent collisions

**Result: PASS** — NULL semantics are acceptable for migration 049's use case

---

## C4 — ADR-075 Semantic Validity

### ADR-075 Requirements

ADR-075 states:
> fw_locations SHALL be migrated to md_locations via controlled migration.

It requires:
1. Deterministic migration
2. Zero-consumer proof before removal

### Constraint Justification

| Constraint | ADR-075 Domain Invariant? | Implementation Convenience? |
|------------|---------------------------|------------------------------|
| UNIQUE (tenant_id, external_code) | NO | YES — ensures deterministic mapping |
| UNIQUE (tenant_id, location_code) | NO | YES — prevents generated code collisions |

**Finding:** These constraints are **implementation conveniences**, not domain invariants required by ADR-075. However, they are **necessary prerequisites** for safe migration execution.

**Result: PASS** — Constraints are justified as migration prerequisites

---

## C5 — Semantic Collision Check

**LIVE DATA VERIFICATION: UNAVAILABLE**

| Check | Result |
|-------|--------|
| Multiple md_locations matching same fw_locations row | UNAVAILABLE |
| Existing location_code = 'FW-<location_id>' | UNAVAILABLE |

**Result: UNAVAILABLE**

---

## C6 — Impact of Adding Unique Constraints

| Scenario | Impact |
|----------|--------|
| No duplicates exist | Constraints added successfully |
| Duplicates exist | ALTER TABLE fails, requiring cleanup |
| Partial index conflict | Unlikely (no overlapping unique indexes) |

**Risk:** If duplicates exist, the constraint addition fails. This is a safe failure mode.

**Result: PASS** — Adding constraints is safe; failure mode is graceful

---

## C7 — Migration 049 Reassessment

| Check | Without Prerequisites | With Prerequisites |
|-------|----------------------|---------------------|
| Deterministic mapping | FAIL | PASS |
| Duplicate prevention | FAIL | PASS |
| location_code collision | FAIL | PASS |
| FK transformation | PASS | PASS |
| Repeat execution | FAIL | PASS |
| Tenant isolation | PASS | PASS |

**Result: FAIL** — Migration 049 is NOT safe to execute without prerequisite constraints

---

## Final Decision

### **YELLOW — DATA / SCHEMA DECISION REQUIRED**

### Reason

1. **Prerequisite constraints are valid** and necessary for safe migration
2. **Live data verification is unavailable** — cannot confirm whether duplicates exist
3. **Without live verification**, we cannot guarantee constraint addition will succeed

### Recommendation

1. Execute read-only duplicate checks against the live database
2. If duplicates exist, clean them up before adding constraints
3. Add prerequisite constraints
4. Then execute migration 049

---

## Migration 049 Status

**NOT EXECUTED** — Prerequisites not yet established

## Constraint Migration

**NOT CREATED** — Requires live data verification first

## Database Mutation

**NONE**

---

**END OF CONSTRAINT PREFLIGHT**
