# SENTRALOGIS — DATA-4E-BR4R
# POST-035 GLOBAL ROLE CARDINALITY FORENSIC
# Party Role Foundation Invariant & Migration 038 Safety Gate

**Date:** 2026-09-02
**Phase:** DATA-4E-BR4R
**Type:** READ-ONLY FORENSIC / POST-EXECUTION INVARIANT GATE
**Target:** `public.party_roles`
**Related Migration:** `20260902_038_party_role_backfill.sql`

---

## 0. MISSION

Determine whether the currently deployed Party Role Foundation is sufficiently safe for migration 038 to be separately authorized, given the nullable `context_id` in the UNIQUE constraint and the resulting PostgreSQL NULL semantics.

This phase does NOT modify the database. No migration was executed.

---

## 1. Executive Decision

| Item | Result |
|------|--------|
| Deployed UNIQUE constraint verified | **VERIFIED** |
| `context_id` nullability | **NULLABLE** |
| PostgreSQL NULL/UNIQUE semantics | `NULL ≠ NULL` → multiple NULL rows allowed |
| ADR-070 cardinality intent | **AT-MOST-ONE GLOBAL role per (tenant_id, party_id, role_type) implied** |
| Migration 038 dedup mechanism | `NOT EXISTS` per-row guard (application-level, not DB-enforced) |
| Current VENDOR role count | 0 |
| Current is_vendor=true source | 16 |
| 038 safety for initial execution | **YELLOW** — initial execution safe; latent schema-level design gap exists |
| Overall verdict | **YELLOW — 038 initial execution technically safe; design gap documented; separate review recommended for non-initial scenarios** |

**Migration 038 was NOT executed during DATA-4E-BR4R.**

---

## 2. Current Deployed Constraint (BR4R-01)

| Object | Definition | Result |
|--------|------------|--------|
| `party_roles_pkey` | `PRIMARY KEY (id)` | PASS |
| `uq_party_role` | `UNIQUE (tenant_id, party_id, role_type, context_type, context_id)` | VERIFIED |
| `party_roles_context_type_check` | `CHECK (context_type IN ('GLOBAL','ENGAGEMENT','ORDER','CONTRACT'))` | PASS |
| `party_roles_tenant_id_fkey` | `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE` | PASS |
| `party_roles_party_id_fkey` | `FOREIGN KEY (party_id) REFERENCES md_entities(id) ON DELETE CASCADE` | PASS |
| `party_roles_created_by_fkey` | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | PASS |
| `context_id` | `is_nullable = YES` | **NULLABLE** |

`DEPLOYED_CARDINALITY_CONSTRAINT = VERIFIED`

---

## 3. PostgreSQL NULL / UNIQUE Semantics (BR4R-02)

In standard PostgreSQL, UNIQUE constraints treat `NULL` as distinct from `NULL`. Therefore the deployed constraint:

```text
UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
```

**DOES NOT** prevent multiple rows where:

```text
tenant_id = T1
party_id = P1
role_type = 'VENDOR'
context_type = 'GLOBAL'
context_id = NULL
```

`GLOBAL_NULL_UNIQUENESS_PROTECTED = NO`

---

## 4. ADR-070 Cardinality Intent (BR4R-03)

ADR-070 (Party Role Architecture) establishes a contextual role system. Within the GLOBAL context (where `context_id` is NULL), the implied canonical model is:

- Each party has at most one role per role_type within a given context scope.
- A GLOBAL VENDOR role is the single, canonical classification of a party as a vendor.

This is consistent with how 038 (the legacy boolean backfill) treats VENDOR — as a single property of the party.

`ADR_GLOBAL_CARDINALITY = AT_MOST_ONE` (implied, not explicitly constrained at DB level)

---

## 5. Migration 038 VENDOR Mapping (BR4R-04)

| Field | Value |
|-------|-------|
| source | `public.md_entities` |
| source predicate | `is_vendor = true` |
| `tenant_id` | `e.tenant_id` |
| `party_id` | `e.id` |
| `role_type` | `'VENDOR'` |
| `context_type` | `'GLOBAL'` |
| `context_id` | **NOT SPECIFIED** → defaults to NULL |
| conflict handling | `NOT EXISTS` per-row guard (application-level) |
| deduplication | **APPLICATION-LEVEL ONLY** via `NOT EXISTS` subquery |

**Key observation:** Migration 038 does NOT use `ON CONFLICT (uq_party_role) DO NOTHING`. It relies on a `NOT EXISTS` subquery. The query checks for ANY existing GLOBAL VENDOR row, not specifically for a `context_id=NULL` row.

---

## 6. Canonical VENDOR Semantics (BR4R-05)

| Field | Value |
|-------|-------|
| `CANONICAL_VENDOR_FORM` | **CONFIRMED** |
| Canonical key dimensions | `(tenant_id, party_id, role_type='VENDOR', context_type='GLOBAL')` |
| `context_id` | NULL (GLOBAL context) |

The canonical VENDOR role is uniquely identified by:

```text
(tenant_id, party_id, 'VENDOR', 'GLOBAL', NULL)
```

---

## 7. Current Live Cardinality (BR4R-06)

| Metric | Value |
|--------|-------|
| Total `party_roles` rows | **0** |
| Role × Context distribution | (empty) |
| GLOBAL rows | 0 |
| GLOBAL with NULL context_id | 0 |
| Duplicate GLOBAL groups | 0 |

`CURRENT_GLOBAL_DUPLICATES = 0`

**Note:** Zero current duplicates is expected — 038 has not been executed. This does NOT prove the constraint prevents duplicates; the DB is simply empty.

---

## 8. Existing VENDOR Source Population (BR4R-07)

| Metric | Value |
|--------|-------|
| `CURRENT_VENDOR_ROLE_COUNT` | 0 |
| `CURRENT_VENDOR_SOURCE_COUNT` | 16 |
| `CURRENT_VENDOR_ROLE_GAP` | 16 |

Migration 038 would insert 16 new VENDOR roles from 16 `is_vendor=true` entities.

---

## 9. Alternative Cardinality Guards (BR4R-09)

| Guard | Status |
|-------|--------|
| Partial unique index on (tenant, party, role, context) WHERE context_id IS NULL | **ABSENT** |
| Exclusion constraint | **ABSENT** |
| BEFORE INSERT trigger enforcing uniqueness | **ABSENT** |
| Function-based cardinality check | **ABSENT** |
| Migration 038's `NOT EXISTS` guard | **PRESENT** (application-level, not DB-enforced) |

`ALTERNATIVE_CARDINALITY_GUARD = ABSENT` (at the DB level)

**Note:** The partial index `idx_party_roles_active` exists but it filters on `is_active=true`, not on `context_id IS NULL`. It does not provide GLOBAL+NULL uniqueness.

---

## 10. Critical Cardinality Question (BR4R-08)

| Question | Result |
|----------|--------|
| Physical UNIQUE prevents duplicate NULL GLOBAL roles | **NO** |
| ADR requires at-most-one GLOBAL VENDOR | **YES (implied)** |
| 038 assumes at-most-one GLOBAL VENDOR | **YES** |
| Current data contains duplicate GLOBAL VENDOR | **NO** (0 rows currently) |
| Future duplicate GLOBAL VENDOR remains structurally possible | **YES** (if code bypasses NOT EXISTS) |

---

## 11. 038 Execution Safety Classification (BR4R-10)

| Scenario | Safety |
|----------|--------|
| First execution (party_roles empty) | **SAFE** — each row is the first; NOT EXISTS finds nothing; 16 rows inserted cleanly |
| Re-execution after successful first run | **SAFE** — NOT EXISTS finds existing rows; 0 new rows |
| Application code bypassing NOT EXISTS (e.g., direct INSERT) | **UNSAFE** — can create duplicate GLOBAL VENDOR with NULL context_id |
| Future migration that INSERTs into party_roles without NOT EXISTS guard | **UNSAFE** — duplicates possible |

For the **specific** migration 038 execution as designed:

`038_EXECUTION_SAFETY = YELLOW` (initial execution safe; latent design gap exists for future code paths)

---

## 12. 035 Cardinality Status (BR4R-11)

| Case | Applicable? | Status |
|------|-------------|--------|
| A: ADR allows multiple GLOBAL roles | NO | — |
| B: ADR requires at-most-one, other mechanism guarantees | **PARTIALLY** — 038's NOT EXISTS provides the guarantee for 038 only | — |
| C: ADR requires at-most-one, no mechanism guarantees at DB level | **YES** for non-038 code paths | — |
| D: ADR cardinality intent ambiguous | NO (intent is clear) | — |

`035_CARDINALITY_STATUS = VALID_WITH_OTHER_GUARD`

Migration 035 deployed the schema correctly per ADR-070. The nullable `context_id` in the UNIQUE constraint is standard PostgreSQL practice. The cardinality guarantee relies on the `NOT EXISTS` guard in migration 038 (and must be replicated in any future code that inserts GLOBAL roles).

**This is a documented design choice, not a defect.** However, any future code that inserts GLOBAL roles must replicate the `NOT EXISTS` pattern, or a DB-level partial unique index should be added in a separate decision phase.

---

## 13. Decision Matrix (BR4R-12)

| Gate | Result | Evidence |
|------|--------|----------|
| Deployed UNIQUE verified | **GREEN** | `uq_party_role` matches expected definition |
| PostgreSQL NULL semantics | **YELLOW** | Standard NULL behavior; duplicates with NULL allowed |
| ADR-070 cardinality intent | **GREEN** | At-most-one GLOBAL role implied by architecture |
| 038 VENDOR mapping | **GREEN** | Inserts context_type='GLOBAL', context_id=NULL, uses NOT EXISTS |
| Canonical VENDOR semantics | **GREEN** | (tenant_id, party_id, 'VENDOR', 'GLOBAL', NULL) |
| Current GLOBAL VENDOR data | **GREEN** | 0 current rows; no existing duplicates |
| Duplicate GLOBAL VENDOR analysis | **YELLOW** | 0 duplicates now, but structurally possible in future |
| Alternative cardinality guard | **YELLOW** | 038's NOT EXISTS is application-level; no DB-level guard |
| 038 execution safety | **YELLOW** | Initial execution safe; latent design gap for non-038 paths |
| 035 cardinality status | **YELLOW** | VALID_WITH_OTHER_GUARD; relies on 038's NOT EXISTS |

---

## 14. Final Verdict

# **YELLOW — CARDINALITY / DESIGN RESOLUTION REQUIRED**

Migration 038 is **technically safe to execute** in its current form because:

1. The `party_roles` table is currently empty (0 rows).
2. Migration 038 uses a `NOT EXISTS` guard that prevents duplicate insertion.
3. The first execution will insert 16 VENDOR roles from 16 `is_vendor=true` entities.
4. Re-execution will be a no-op (NOT EXISTS finds existing rows).

However, a **latent design gap** exists:

- The deployed UNIQUE constraint does NOT prevent duplicate `(tenant_id, party_id, 'VENDOR', 'GLOBAL', NULL)` rows at the DB level.
- Any future code path that inserts GLOBAL roles without replicating the `NOT EXISTS` pattern can create duplicates.
- This is a architectural risk, not an immediate blocker.

**Migration 038 MUST NOT be executed until a separate execution authorization is granted.**

---

## 15. Required Preconditions for Any Future 038 Execution

1. Explicit human authorization statement: **"I AUTHORIZE DATA-4E-BR5 TO EXECUTE MIGRATION 038 ONLY."**
2. Confirmation that `party_roles` is currently empty or contains only the expected VENDOR roles.
3. Post-execution verification: re-run BR4R-06F (duplicate GLOBAL groups) to confirm 0 duplicates.

**Optional (future design phase, NOT required for 038 execution):**

- Consider adding a partial unique index: `CREATE UNIQUE INDEX uq_party_role_global ON party_roles (tenant_id, party_id, role_type) WHERE context_type = 'GLOBAL' AND context_id IS NULL;`
- This would provide DB-level enforcement of at-most-one GLOBAL role per (tenant, party, role).
- This requires a separate design/ADR decision and is NOT part of this gate.

---

## 16. Authorization Boundary

- Migration 035 was already executed during DATA-4E-BR4 and was not re-executed during DATA-4E-BR4R.
- Migration 038 was **NOT** executed during DATA-4E-BR4R.
- No schema was changed during DATA-4E-BR4R.
- No data was changed during DATA-4E-BR4R.
- No application code was changed.
- No tests were changed.
- No ADR was created or amended.
- No `is_vendor` consumer was migrated.
- No dual-write was implemented.
- No `is_vendor` column was removed or deprecated.
- No `uq_party_role` was modified.
- No partial unique index was created.
- No exclusion constraint was created.
- No `party_roles` trigger was created.

---

## 17. Hard-Stop Compliance

- Migration 038 was **NOT** executed.
- No schema was modified.
- No data was modified.
- No application code was modified.
- No tests were modified.
- No ADRs were modified.
- No `AGENTS.md` was modified.
- No `database.types.ts` was modified.
- No repair migration was created.
- No partial unique index was created.
- No exclusion constraint was created.
- No trigger was created.
- No dual-write was implemented.
- No `is_vendor` consumer was migrated.
- No `is_vendor` was removed or deprecated.
- DATA-4E-BR5 was **NOT** started.

---

**END OF DATA-4E-BR4R REPORT**
