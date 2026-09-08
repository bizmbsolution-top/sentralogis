# SENTRALOGIS — DATA-4E-BR5
# CONTROLLED EXECUTION — PARTY ROLE VENDOR BACKFILL

**Date:** 2026-09-02
**Phase:** DATA-4E-BR5
**Type:** CONTROLLED MIGRATION EXECUTION
**Target migration:** `supabase/migrations/20260902_038_party_role_backfill.sql`
**Human Authorization:** PRESENT — "I AUTHORIZE DATA-4E-BR5 TO EXECUTE MIGRATION 038 ONLY."

---

## 1. Authorization Evidence

| Field | Value |
|-------|-------|
| Authorization statement | **"I AUTHORIZE DATA-4E-BR5 TO EXECUTE MIGRATION 038 ONLY."** |
| `AUTHORIZATION` | **PRESENT** |
| `EXACT_AUTHORIZED_MIGRATION` | 038 |
| `SCOPE_LIMITATION` | Migration 038 ONLY |

---

## 2. Target Migration Verification (BR5-02)

| Check | Result |
|-------|--------|
| File exists | YES |
| Path | `supabase/migrations/20260902_038_party_role_backfill.sql` |
| Content unchanged since BR4R | YES |
| Targets `public.party_roles` | YES |
| Maps `md_entities.is_vendor = true` to canonical VENDOR | YES |
| `context_type='GLOBAL'` | YES |
| `context_id IS NULL` (not specified, defaults NULL) | YES |
| `NOT EXISTS` guard present | YES (4 blocks) |
| Unrelated DDL/DML | NONE |

---

## 3. Pre-Execution Preflight (BR5-03)

### `party_roles` Foundation

| Check | Result |
|-------|--------|
| Table exists | YES |
| RLS enabled | YES |
| Tenant isolation policy | `party_roles_tenant_isolation`, `cmd=ALL`, `roles={authenticated}`, `qual=tenant_id=get_my_tenant_id()` |
| `uq_party_role` constraint | present |

### Source Population Baseline

| Metric | Value |
|--------|-------|
| `md_entities` total | 69 |
| `is_vendor=true` | 16 |
| `is_vendor=false` | 53 |
| `is_vendor IS NULL` | 0 |
| Existing canonical GLOBAL VENDOR rows | 0 |
| `party_roles` total | 0 |

### Legacy Vendor by Tenant

| Tenant ID | Legacy Vendor Count |
|-----------|---------------------|
| 78846049-fb63-45a9-93da-3af3fea5b587 | 3 |
| b0b30927-cff9-4ee9-a42d-f9cd935b25ff | 4 |
| c0611a0a-6210-4d6e-8206-504e6936adea | 4 |
| d6f27bee-7ea7-4f99-88f7-bba8b19326c3 | 1 |
| ef7031de-7d9d-445c-90e4-6ba555da7e55 | 4 |
| **Total** | **16** |

---

## 4. Pre-Execution Safety Baseline (BR5-04)

| Metric | Pre-038 |
|--------|---------|
| `md_entities` total | 69 |
| `is_vendor=true` | 16 |
| `is_vendor=false` | 53 |
| `is_vendor=NULL` | 0 |
| `party_roles` total | 0 |
| GLOBAL VENDOR roles | 0 |
| Other `party_roles` | 0 |

---

## 5. Migration Execution (BR5-05)

| Field | Value |
|-------|-------|
| `EXECUTION_STARTED` | 2026-09-02T12:34:29.462Z |
| `EXECUTION_COMPLETED` | 2026-09-02T12:34:29.797Z |
| Duration | ~335ms |
| `EXECUTION_RESULT` | **SUCCESS** |
| Database target | `postgres` (live Supabase) |
| Migration filename | `20260902_038_party_role_backfill.sql` |
| Error | NONE |

The exact reviewed migration 038 was executed as-is. No SQL was edited, appended, or prepended.

---

## 6. Post-Execution Cardinality (BR5-06)

### Canonical Role Distribution (post-execution)

| Role Type | Context Type | Count |
|-----------|--------------|-------|
| CUSTOMER | GLOBAL | 43 |
| SUPPLIER | GLOBAL | 3 |
| VENDOR | GLOBAL | 16 |
| BROKER | GLOBAL | 0 |
| **Total** | | **62** |

Note: Migration 038 backfills all 4 boolean flags (`is_vendor`, `is_customer`, `is_supplier`, `is_broker`), not just VENDOR.

### VENDOR-Specific Reconciliation

| Metric | Expected | Actual | Result |
|--------|----------|--------|--------|
| Canonical GLOBAL VENDOR rows | 16 | 16 | PASS |
| Missing canonical VENDOR | 0 | 0 | PASS |
| Extra canonical VENDOR | 0 | 0 | PASS |
| Duplicate full-key groups | 0 | 0 | PASS |
| Duplicate (tenant, party, role, context) with NULL context_id | 0 | 0 | PASS |

---

## 7. Tenant Isolation (BR5-07)

### Per-Tenant Reconciliation

| Tenant ID | Legacy Vendors | Canonical VENDOR | Delta |
|-----------|----------------|-------------------|-------|
| 78846049-fb63-45a9-93da-3af3fea5b587 | 3 | 3 | 0 |
| b0b30927-cff9-4ee9-a42d-f9cd935b25ff | 4 | 4 | 0 |
| c0611a0a-6210-4d6e-8206-504e6936adea | 4 | 4 | 0 |
| d6f27bee-7ea7-4f99-88f7-bba8b19326c3 | 1 | 1 | 0 |
| ef7031de-7d9d-445c-90e4-6ba555da7e55 | 4 | 4 | 0 |
| **Total** | **16** | **16** | **0** |

### Anomaly Check

| Check | Count | Result |
|-------|-------|--------|
| Cross-tenant roles | 0 | PASS |
| Orphan roles (party_id not in md_entities) | 0 | PASS |
| NULL/invalid tenant | 0 | PASS |

All 16 VENDOR roles satisfy `party_roles.tenant_id = md_entities.tenant_id`.

---

## 8. Source Data Immutability (BR5-08)

| Metric | Pre-038 | Post-038 | Result |
|--------|---------|----------|--------|
| `md_entities` total | 69 | 69 | PASS |
| `is_vendor=true` | 16 | 16 | PASS |
| `is_vendor=false` | 53 | 53 | PASS |
| `is_vendor=NULL` | 0 | 0 | PASS |

`DATA_MUTATION = NONE`
`IS_VENDOR_MUTATION = NONE`

Migration 038 did NOT modify `md_entities.is_vendor`. The legacy boolean flag is preserved unchanged.

---

## 9. Idempotency (BR5-09)

> Idempotency verified structurally from the `NOT EXISTS` guard; no second execution performed.

Migration 038 uses a `NOT EXISTS` subquery in all 4 INSERT blocks:

```sql
WHERE e.is_vendor = true
  AND NOT EXISTS (
    SELECT 1 FROM public.party_roles pr
    WHERE pr.tenant_id = e.tenant_id
      AND pr.party_id = e.id
      AND pr.role_type = 'VENDOR'
      AND pr.context_type = 'GLOBAL'
  );
```

Re-execution of the exact same migration 038 would be a no-op for VENDOR (0 new rows) because all 16 VENDOR roles already exist. No second execution was performed per the authorization scope.

---

## 10. RLS / Security Post-Check (BR5-10)

| Check | Result |
|-------|--------|
| RLS enabled on `party_roles` | YES |
| Policy name | `party_roles_tenant_isolation` |
| Command | ALL |
| Roles | `{authenticated}` |
| USING predicate | `tenant_id = get_my_tenant_id()` |
| WITH CHECK predicate | `tenant_id = get_my_tenant_id()` |

RLS and tenant isolation policy remain intact post-execution. No policy changes were made.

---

## 11. 035 Foundation Integrity (BR5-11)

| Object | Status |
|--------|--------|
| Table structure | UNCHANGED |
| `party_roles_pkey` | UNCHANGED |
| `uq_party_role` | UNCHANGED |
| FK definitions | UNCHANGED (3 FKs intact) |
| CHECK constraints | UNCHANGED |
| Indexes | UNCHANGED |
| RLS policies | UNCHANGED |
| Triggers | UNCHANGED (`trg_party_roles_updated_at` intact) |
| Functions | UNCHANGED |

Migration 038 did not alter the 035 foundation. Only new rows were inserted into the existing `party_roles` table.

---

## 12. BR4R Cardinality Design Gap Preservation (BR5-12)

The BR4R finding is explicitly preserved:

- The current UNIQUE constraint `(tenant_id, party_id, role_type, context_type, context_id)` does NOT provide database-level uniqueness for rows where `context_id IS NULL`.
- 038's `NOT EXISTS` guard protected this backfill; the current data has 0 duplicates.
- The foundation still has a latent DB-level cardinality enforcement gap.
- No partial unique index was created in BR5.
- This issue remains a separate architecture decision.

The current post-backfill data is correct (16/16 match, 0 duplicates), but the DB-level invariant is not enforced. Any future code that inserts GLOBAL roles must replicate the `NOT EXISTS` pattern or a separate decision must add a partial unique index.

---

## 13. Final Reconciliation Matrix (BR5-13)

| Invariant | Expected | Actual | Result |
|-----------|----------|--------|--------|
| `md_entities` total | 69 | 69 | PASS |
| Legacy vendors | 16 | 16 | PASS |
| Canonical VENDOR | 16 | 16 | PASS |
| Missing canonical | 0 | 0 | PASS |
| Extra canonical | 0 | 0 | PASS |
| Duplicate GLOBAL VENDOR | 0 | 0 | PASS |
| Cross-tenant roles | 0 | 0 | PASS |
| Orphan roles | 0 | 0 | PASS |
| `is_vendor` mutation | 0 | 0 | PASS |
| RLS integrity | PASS | PASS | PASS |
| 035 foundation integrity | PASS | PASS | PASS |
| 038 execution | SUCCESS | SUCCESS | PASS |

---

## 14. Final Verdict

# **GREEN — EXECUTED AND VERIFIED**

All 16 legacy vendor entities have been correctly mapped to canonical `party_roles` rows with:

- `role_type = 'VENDOR'`
- `context_type = 'GLOBAL'`
- `context_id = NULL`
- Correct `tenant_id` correlation
- 0 duplicates, 0 cross-tenant, 0 orphans
- `is_vendor` unchanged
- 035 foundation intact
- RLS intact

The latent BR4R cardinality design gap is preserved as a separate architecture decision and does not invalidate this execution.

**Migration 038 was the ONLY migration executed during DATA-4E-BR5.**

---

## 15. Authorization Boundary Confirmation

- Migration 038 was the **ONLY** migration executed during DATA-4E-BR5.
- Migration 035 was **NOT** re-executed.
- No other migration was executed.
- No application code was changed.
- No tests were changed.
- No ADR was created or amended.
- No `is_vendor` consumer was migrated.
- No dual-write was implemented.
- No `is_vendor` column was removed or deprecated.
- No partial unique index was created.
- No `party_roles` constraint was altered.
- No repair migration was created.

---

## 16. Hard-Stop Compliance

- Migration 038 was executed as the exact reviewed artifact.
- No follow-on consumer migration was performed.
- No `is_vendor` readers/writers were migrated.
- No dual-write was introduced.
- No `is_vendor` was removed or deprecated.
- No partial unique index was created.
- No `party_roles` was repaired.
- No ADR was created or modified.
- No code was modified.
- No tests were modified.
- DATA-4E-BR6 was **NOT** started.

---

**END OF DATA-4E-BR5 REPORT**
