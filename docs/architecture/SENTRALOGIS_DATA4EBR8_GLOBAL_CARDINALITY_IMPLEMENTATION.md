# SENTRALOGIS — DATA-4E-BR8
# ADR-070 / ADR-077 RATIFICATION & IMPLEMENTATION AUTHORIZATION GATE
# GLOBAL CARDINALITY PARTIAL UNIQUE INDEX IMPLEMENTATION

**Date:** 2026-09-02
**Phase:** DATA-4E-BR8
**Type:** HUMAN RATIFICATION + IMPLEMENTATION AUTHORIZATION
**Scope:** PARTIAL UNIQUE INDEX ON `public.party_roles` ONLY

---

## 1. Authorization

| Field | Value |
|-------|-------|
| ADR-070 Amendment ratification | **RATIFIED** ("I RATIFY ADR-070 AMENDMENT AND ADR-077 FOR SENTRALOGIS DATA-4E.") |
| ADR-077 ratification | **RATIFIED** (same authorization) |
| Implementation authorization | **GRANTED** ("I AUTHORIZE DATA-4E-BR8 IMPLEMENTATION: PARTY ROLE GLOBAL CARDINALITY INDEX ONLY.") |
| Authorized scope | Partial unique index ONLY |

---

## 2. ADR Ratification Evidence

Both ADRs updated to reflect ratification:

- `docs/architecture/ADR-070-AMENDMENT-GLOBAL-ROLE-CARDINALITY.md` — status changed to RATIFIED
- `docs/architecture/ADR-077-party-role-authority-and-global-cardinality.md` — status changed to RATIFIED

---

## 3. Implementation Scope

**ONE database invariant:** create a partial unique index on `public.party_roles` enforcing:

```sql
UNIQUE (tenant_id, party_id, role_type)
WHERE context_type = 'GLOBAL'
  AND context_id IS NULL
```

**NOT in scope (explicit non-actions):**

- Dual-write implementation
- Reader migration
- Legacy boolean changes
- `is_vendor` / `is_customer` / `is_supplier` / `is_broker` consumer migration
- Special consumer changes (`cost-audit:432`, `assignment.ts:282`, `fleet-status:101`)
- Column removal
- Existing `uq_party_role` modification
- RLS policy changes
- Application code changes
- Test changes

---

## 4. Preflight Results (Gates I1–I5)

### Gate I1 — Existing duplicates

| Check | Result |
|-------|--------|
| Duplicate `(tenant, party, role)` groups where `context_type='GLOBAL' AND context_id IS NULL` | **0** |
| Status | **PASS** |

### Gate I2 — Current role inventory (BR5R baseline)

| Role | Expected | Actual | Result |
|------|----------|--------|--------|
| CUSTOMER | 43 | 43 | PASS |
| SUPPLIER | 3 | 3 | PASS |
| VENDOR | 16 | 16 | PASS |
| BROKER | 0 | 0 | PASS |
| **Total** | **62** | **62** | PASS |

### Gate I3 — Tenant isolation

| Check | Result |
|-------|--------|
| Cross-tenant roles | 0 |
| Orphan roles | 0 |
| RLS enabled on `party_roles` | YES |
| `get_my_tenant_id()` exists | YES |
| Status | **PASS** |

### Gate I4 — Existing `uq_party_role`

| Check | Result |
|-------|--------|
| `uq_party_role` exists | YES |
| Definition | `UNIQUE (tenant_id, party_id, role_type, context_type, context_id)` |
| Status | **PASS** — unchanged |

### Gate I5 — Migration identity

| Check | Result |
|-------|--------|
| Migration 035 untouched | YES (8191 bytes) |
| Migration 038 untouched | YES (2451 bytes) |
| New migration file | `supabase/migrations/20260902_050_party_role_global_cardinality_partial_unique_index.sql` |
| Status | **PASS** — new file, history preserved |

---

## 5. Execution

| Field | Value |
|-------|-------|
| `EXECUTION_STARTED` | 2026-09-02T13:03:52.685Z |
| `EXECUTION_COMPLETED` | 2026-09-02T13:03:52.932Z |
| Duration | ~247ms |
| `EXECUTION_RESULT` | **SUCCESS** |
| Error | NONE |

DDL executed:

```sql
DROP INDEX IF EXISTS public.idx_party_roles_global_unique;
CREATE UNIQUE INDEX idx_party_roles_global_unique
  ON public.party_roles (tenant_id, party_id, role_type)
  WHERE context_type = 'GLOBAL' AND context_id IS NULL;
```

---

## 6. Index Definition (Verified)

| Property | Value |
|----------|-------|
| Index name | `idx_party_roles_global_unique` |
| Table | `public.party_roles` |
| Columns (order) | `tenant_id, party_id, role_type` |
| Uniqueness | YES (UNIQUE) |
| Predicate | `WHERE ((context_type = 'GLOBAL'::text) AND (context_id IS NULL))` |
| Method | btree |

Full definition from `pg_get_indexdef`:

```text
CREATE UNIQUE INDEX idx_party_roles_global_unique
  ON public.party_roles USING btree (tenant_id, party_id, role_type)
  WHERE ((context_type = 'GLOBAL'::text) AND (context_id IS NULL))
```

---

## 7. Postflight Results (V1–V10)

| Check | Result | Evidence |
|-------|--------|----------|
| **V1** Index exists | **PASS** | `pg_indexes` returns 1 row |
| **V2** Index is UNIQUE | **PASS** | Definition includes "UNIQUE INDEX" |
| **V3** Predicate exact (`GLOBAL` + `IS NULL`) | **PASS** | Verified in full definition |
| **V4** Index columns (tenant_id, party_id, role_type) | **PASS** | Exact match |
| **V5** `uq_party_role` intact | **PASS** | UNIQUE (tenant_id, party_id, role_type, context_type, context_id) unchanged |
| **V6** RLS intact | **PASS** | RLS enabled; `party_roles_tenant_isolation` policy present |
| **V7** Row counts unchanged | **PASS** | CUSTOMER=43, SUPPLIER=3, VENDOR=16, BROKER=0 |
| **V8** No data mutation | **PASS** | `party_roles` total = 62 (unchanged) |
| **V9** No application code changed | **PASS** | Scope was DDL only |
| **V10** No consumer migration | **PASS** | Scope was DDL only |

---

## 8. Functional Duplicate Rejection Test

A true duplicate insertion was attempted:

```sql
INSERT INTO public.party_roles (tenant_id, party_id, role_type, context_type, context_id)
VALUES ('78846049-...', 'f730cd13-...', 'VENDOR', 'GLOBAL', NULL);
```

**Result:** `error: duplicate key value violates unique constraint "idx_party_roles_global_unique"` (PostgreSQL error code 23505).

**Status: PASS** — the index correctly rejects duplicate GLOBAL roles at the database level.

---

## 9. Existing Constraint Verification

| Constraint | Status |
|------------|--------|
| `party_roles_pkey` | INTACT (PRIMARY KEY) |
| `uq_party_role` | INTACT (UNIQUE on 5 columns, including nullable context_id) |
| `party_roles_context_type_check` | INTACT (CHECK on context_type values) |
| `party_roles_party_id_fkey` | INTACT (FK to md_entities) |
| `party_roles_tenant_id_fkey` | INTACT (FK to tenants) |
| `party_roles_created_by_fkey` | INTACT (FK to auth.users) |

The new partial unique index is purely ADDITIVE. No existing constraint, RLS policy, FK, or trigger was modified.

---

## 10. Data Integrity Verification

| Metric | Pre-Implementation | Post-Implementation | Result |
|--------|--------------------|---------------------|--------|
| `party_roles` total | 62 | 62 | PASS |
| `md_entities.is_vendor=true` | 16 | 16 | PASS |
| `md_entities.is_vendor=false` | 53 | 53 | PASS |
| `md_entities.is_vendor=NULL` | 0 | 0 | PASS |
| Cross-tenant roles | 0 | 0 | PASS |
| Orphan roles | 0 | 0 | PASS |
| `is_vendor` mutated | — | NO | PASS |

No data was modified. The implementation was purely schema (index creation).

---

## 11. Non-Actions (Confirmed)

The following were explicitly NOT performed:

- ❌ Dual-write implementation
- ❌ Reader migration (any of P0–P5)
- ❌ Legacy boolean deprecation/removal
- ❌ `is_vendor` / `is_customer` / `is_supplier` / `is_broker` consumer changes
- ❌ Special consumer changes (`cost-audit:432`, `assignment.ts:282`, `fleet-status:101`)
- ❌ Existing `uq_party_role` modification
- ❌ RLS policy changes
- ❌ Trigger / function changes
- ❌ Application code changes
- ❌ Test changes
- ❌ Column removal
- ❌ Database view creation
- ❌ Drift reconciliation
- ❌ `md_entities` modifications

---

## 12. Final Verdict

# **GREEN**

Implementation is complete and verified:

- Partial unique index `idx_party_roles_global_unique` created.
- Index correctly enforces at-most-one `(tenant, party, role)` for GLOBAL context.
- Existing `uq_party_role` preserved.
- RLS intact.
- Data unchanged (62 rows).
- Functional test confirms duplicate rejection at DB level.

The GLOBAL cardinality invariant from ADR-070 amendment is now database-enforced. The transition (dual-write, reader migration, legacy deprecation) remains in a separate future phase per ADR-077.

---

## 13. Hard-Stop Compliance

- No migration other than 050 was executed.
- Migration 035 untouched.
- Migration 038 untouched.
- `party_roles` schema extended additively (one index).
- No data modified.
- No application code modified.
- No tests modified.
- No dual-write implemented.
- No reader migration performed.
- No legacy columns removed/deprecated.
- No special consumer changes.
- No RLS changes.
- No subsequent phase started.

**Hard stop: COMPLIED.**

---

**END OF DATA-4E-BR8 IMPLEMENTATION REPORT**
