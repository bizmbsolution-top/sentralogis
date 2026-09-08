# SENTRALOGIS — STAGE R FOUNDATION DEPLOYMENT PLAN

## Canonical Foundation Deployment (Prerequisite for Phase 4B-0)

**Date:** 2026-08-25 · **Status:** PLAN ONLY — NO PRODUCTION WRITE PERFORMED
**Requires:** Explicit owner authorization at Checkpoint-2 before any SQL touches production.

---

## 1. PRECONDITIONS (all must be ✅ before Checkpoint-2)

| # | Precondition | Status |
|---|--------------|--------|
| P-1 | Target positively identified (`DATABASE_URL` ↔ `NEXT_PUBLIC_SUPABASE_URL` same project) | ✅ verified (Discovery §1) |
| P-2 | Tenancy reconciliation decision ratified (ADR-030, Option A) | ⏳ awaiting owner |
| P-3 | Backup taken AND restore-tested | ⏳ owner/ops action (§2) |
| P-4 | Maintenance window agreed (estimated 30–45 min; system stays ONLINE during DDL — all migrations are additive and non-locking for legacy tables) | ⏳ owner |
| P-5 | Release-train coupling acknowledged: Phase 4B-0/R-4 code (forwarding resolve-or-create fix + hardened helper) follows immediately after foundation | ⏳ owner |
| P-6 | Repository baseline green (543/543, tsc 0) | ✅ re-verified |

## 2. BACKUP REQUIREMENT

```bash
# Custom-format dump, schema+data, verifiable:
pg_dump "$DATABASE_URL" -Fc -f backup_pre_stage_r_$(date +%Y%m%d_%H%M).dump
# Integrity proof BEFORE proceeding:
pg_restore --list backup_pre_stage_r_*.dump > /dev/null && echo BACKUP_OK
```

Rollback is impossible without this artifact. **Deployment is forbidden if `BACKUP_OK` was not produced in the operator's session.**
Supabase PITR/snapshot (if enabled on the project plan) is a secondary layer, not a substitute.

## 3. MIGRATION ORDERING (single new file + 13 ratified files)

### R-P1 — NEW prerequisite migration: `20260825_r01_md_tenants_reconciliation.sql`
(specification in TENANCY_RECONCILIATION.md §4; to be authored only after Checkpoint-2)
1. `CREATE TABLE md_tenants` (minimal canonical projection, no default on id)
2. Backfill `INSERT…SELECT…ON CONFLICT (id) DO NOTHING` from `tenants`
3. Sync triggers on `tenants` (INSERT mirror / UPDATE mirror / DELETE restrict-if-referenced)
4. RLS policy mirroring tenants read semantics
5. Verification queries (§9)

### R-P2 … R-P14 — apply VERBATIM, in numeric order
`20260826_001` → `20260826_002` → `003` → `004` → `005` → `006` → `007` → `008` → `009` → `010` → `011` → `012` → `20260827_013`

No content changes to any ratified file (that is the point of ADR-030 Option A).
Each file is idempotent-shaped (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE`),
verified during dependency-graph inspection.

**Execution mode:** one transaction per file where possible (`psql -1 -f`), halting on first error.
If any step fails: STOP, capture error, do NOT improvise (LAW 5).

## 4. SEED & RLS ORDERING

- No seed data exists inside the canonical family (verified — all files SEEDS: no).
- RLS ships inside each migration using live-present `get_my_tenant_id()` ✓.
- Post-deploy optional hardening (deferred to 4B-0): revoke broad grants added by legacy policies is OUT OF SCOPE here.

## 5. COMPATIBILITY REQUIREMENTS

- Legacy tables receive ZERO DDL. Verified collision-free: all 34 canonical table names free.
- `get_my_tenant_id()` untouched — canonical RLS resolves against live identity immediately.
- Legacy UIs/pages unaffected (they query legacy tables only).

## 6. FORWARDING FK PROTECTION (the trap, per mandate §9)

Fact chain (evidence in Discovery §6):
1. Today, the forwarding route's `svc_service_requests` write fails with *relation does not exist*.
2. After R-P2..R-P14 it will fail with *FK violation* until fixed.
3. Therefore deployment introduces **no regression to working functionality**, but the window between foundation deploy and Phase 4B-0's resolve-or-create fix must be minimized.

**Required coupling:** Checkpoint-3 authorizes foundation deploy ONLY together with a scheduled immediate follow-up of Phase 4B-0 implementation (R-4). If 4B-0 cannot follow within the agreed window, interim mitigation option (owner's choice, documented alternative): temporarily feature-flag off the ServiceRequest issuance block in `app/api/forwarding/wo/route.ts` (code change, requires separate approval — it is NOT part of Stage R).

Forbidden forever: repointing the FK to legacy `work_orders`; making it nullable; dropping it (LAW 3).

## 7. DEPLOYMENT SEQUENCE (operational runbook skeleton)

```
[ ] C-1 Owner ratifies ADR-030 + this plan          ← CHECKPOINT 1 (planning acceptance)
[ ] C-2 Operator runs pg_dump + BACKUP_OK proof     ← CHECKPOINT 2a
[ ] C-3 Owner gives explicit "DEPLOY" authorization ← CHECKPOINT 2 (production write gate)
[ ] S-1 Apply R-P1 (md_tenants reconciliation); run §9 verification block V-A
[ ] S-2 Apply 001; verify enums exist (V-B)
[ ] S-3 Apply 002→013 sequentially, verifying after each (V-C)
[ ] S-4 Run full post-deployment verification suite (§9)
[ ] S-5 Smoke tests (§10)
[ ] S-6 Announce foundation complete; schedule Phase 4B-0 build      ← CHECKPOINT 3
```

## 8. ROLLBACK STRATEGY

- **Preferred (logical):** `DROP SCHEMA public CASCADE` is FORBIDDEN. Logical rollback =
  drop canonical objects in reverse order (013→001, then md_tenants triggers/table) using the
  generated object list captured by pre-deploy verification script. All canonical objects are
  new namespaced additions (`com_/shp_/svc_/cus_/fin_financial/event_/v_legacy_/md_tenants`);
  rollback cannot touch legacy objects because no legacy DDL is referenced by the reversal list.
- **Last resort (physical):** `pg_restore` of the C-2 dump into a fresh database + connection
  string swap (Supabase-side operation; longer MTTR).
- Rollback rehearsal: dry-run the reversal script against a restored copy of the dump BEFORE
  production deploy (ops task between C-2 and C-3).

## 9. VERIFICATION SQL (post-deployment assertions)

```sql
-- V-A tenancy
SELECT count(*) FROM md_tenants;                                  -- expect 15
SELECT count(*) FROM tenants t LEFT JOIN md_tenants m ON m.id=t.id WHERE m.id IS NULL; -- 0
SELECT tgname FROM pg_trigger WHERE tgrelid='public.tenants'::regclass AND NOT tgisinternal; -- 3 sync triggers
-- V-B enums
SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
 WHERE n.nspname='public' AND t.typname IN
 ('com_incoterm_type','com_work_order_status','shp_global_status','shp_unit_type',
  'shp_transport_mode','shp_execution_provider_type','svc_request_status',
  'cus_declaration_type','cus_channel_type','fin_transaction_type');   -- expect 10
-- V-C tables
SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN
 ('commercial_service_scopes','commercial_work_orders','commercial_line_items','shp_shipments',
  'svc_service_requests','cus_declarations','event_outbox','fin_financial_ledger_entries',
  'commercial_capability_bindings');                                     -- expect ≥9 (full set = 34)
-- V-D FK trap shape preserved
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.svc_service_requests'::regclass AND contype='f'
   AND pg_get_constraintdef(oid) LIKE '%commercial_work_orders%';        -- exactly 1 row
-- V-E RLS active
SELECT tablename FROM pg_tables WHERE schemaname='public'
 AND tablename LIKE 'commercial%' AND rowsecurity;                        -- all true
-- V-F protected systems untouched
SELECT count(*) FROM work_orders;   -- 100 (unchanged)
SELECT count(*) FROM job_orders;    -- 248 (unchanged)
SELECT count(*) FROM wo_items;      -- 96  (unchanged)
```

## 10. POST-DEPLOYMENT SMOKE TESTS

1. Driver portal loads; driver login OK; GPS ping accepted (`/api/jo/[token]`) — protected chain healthy.
2. HQ work-orders page lists the 100 legacy WOs — legacy read path healthy.
3. Create legacy WO via existing form (staging entity) — legacy write path healthy.
4. `POST /api/v1/commercial/work-orders/[id]/capabilities` against a manually-inserted canonical WO row returns success — canonical surface alive (registry-only route now has a real root to target).
5. Forwarding WO creation still functions EXCEPT its ServiceRequest step behaves as documented in §6 (known, coupled to R-4).

## 11. APPROVAL CHECKPOINTS (summary)

| Checkpoint | Gate | Decider |
|---|---|---|
| C-1 | Ratify ADR-030 + this plan | Owner |
| C-2 | Authorize production write (after backup proof + rollback rehearsal) | Owner |
| C-3 | Accept foundation; authorize Phase 4B-0 implementation train | Owner |

---

## 12. SUCCESS CONDITION MAPPING (mandate §19)

A ✅ (Discovery) · B ✅ (ADR-030 Option A) · C ✅ (PK preservation, 0 unresolved) · D ✅ (graph verified) ·
E ✅ (protected baseline captured) · F ✅ (trap sequence defined, §6) · G ⏳ (backup procedure defined;
execution+rehearsal pending C-2) · H ✅ (additive sequence exists) · I ✅ (no weakening anywhere) ·
J ✅ (checkpoints above).

Planning is COMPLETE; execution awaits C-1/C-2.
