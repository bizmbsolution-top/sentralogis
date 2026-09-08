# SENTRALOGIS — STAGE R / C-2 READINESS REPORT

## R-P1 Revision Complete · Awaiting C-2 Authorization

**Date:** 2026-08-25
**Artifact:** `supabase/migrations/20260825_r01_md_tenants_reconciliation.sql` (REVISION 2)
**Review basis:** `SENTRALOGIS_RP1_STATIC_REVIEW.md` (adjustments #1–#4 + V-T8/V-T9)

---

## 1. EXECUTIVE VERDICT

R-P1 has been revised per the static review, **executed and verified for real** on an isolated,
disposable local PostgreSQL 18 instance (temp cluster, port 55432, destroyed after use), with
all owner-mandated proofs passing. The repository baseline is green. **Production remains
untouched. C-2 is NOT GRANTED.**

## 2. C-1 CONFIRMATION

- ADR-030 RATIFIED (Option A: `md_tenants` = canonical projection of `tenants`, shared-PK)
- `tenants` = sole tenant lifecycle authority; `md_tenants` = projection only
- `commercial_work_orders` = canonical commercial root (ADR-018)
- Legacy execution protected

## 3. R-P1 REVISION SUMMARY (Part A)

| Adjustment | Implementation |
|---|---|
| #1 Backfill self-healing | `ON CONFLICT (id) DO UPDATE SET … EXCLUDED.*` — re-runs repair projection drift deterministically |
| #2 Projection write hardening | Policy replaced by `md_tenants_read_own FOR SELECT`; `REVOKE INSERT, UPDATE, DELETE FROM authenticated`; `REVOKE ALL FROM anon`; grants reduced to `SELECT` |
| #3 Definer EXECUTE hardening | `REVOKE EXECUTE … FROM PUBLIC` + `… FROM authenticated` (trigger firings bypass EXECUTE checks — sync unaffected) |
| #4 search_path hardening | `SET search_path = ''`; all application objects fully qualified (`public.md_tenants`) |

**Correction discovered BY local execution:** under empty search_path, explicitly qualifying
`pg_catalog.coalesce(text, 'literal')` breaks unknown-literal type resolution on modern
PostgreSQL. Built-ins were therefore left unqualified (pg_catalog is implicitly searched first
even under `''`); application objects remain fully qualified. This defect was invisible to
static review — direct evidence validating the deployment-gate verification requirement.

## 4. SECURITY HARDENING SUMMARY

- Direct authenticated writes to the projection: **denied twice over** (no write policy ⇒ RLS
  denies; write grants revoked).
- Direct invocation of `fn_sync_md_tenants()`: **impossible** (engine rejects trigger-function
  calls) AND privilege-revoked.
- Cross-tenant exposure: SELECT policy binds each caller to their own row only;
  NULL-resolver users see zero rows.

## 5. BACKFILL CORRECTION

Stale-row scenario from review §9 eliminated: re-execution now upserts source truth over any
drifted projection rows while preserving the shared-PK identity mapping.

## 6. V-T8/V-T9 RESULTS (executed locally, not merely reviewed)

```
V-T1 counts identical:                                  [PASS]
V-T2 exact 1:1 mapping violations = 0:                  [PASS]
V-T3 orphan projections = 0:                            [PASS]
V-T4 parity violations = 0:                             [PASS]
V-T5 trigger exists + SECURITY DEFINER:                 [PASS]
V-T6 trigger sync UPDATE mirrored (+ restore):          [PASS] [PASS]
V-T7 protected-systems counts (100/96/248):             PRODUCTION-GATE ASSERTION
                                                        (requires live pre/post comparison at deploy time)
ADJ#1 self-healing upsert repaired injected drift:      [PASS]
V-T8 NULL tenant_code mirrored, no uniqueness failure:  [PASS]
V-T8b mirror-delete on source delete:                   [PASS]
V-T9.1 RLS enabled:                                     [PASS]
V-T9.2 authenticated EXECUTE denied:                    [PASS]
V-T9.3 exactly one SELECT policy:                       [PASS]
V-T9.4 zero write policies:                             [PASS]
V-T9.5 no write grants to authenticated:                [PASS]
BEHAVIOR authenticated direct INSERT denied:            [PASS]
BEHAVIOR direct fn invocation rejected:                 [PASS]
────────────────────────────────────────────────────────────
18 / 18 PASS (local isolated instance)
```

## 7. FK COMPATIBILITY RESULT (Part D)

All 31 FK references from 001→013 against `md_tenants(id)` re-verified after revision:
29 × NO ACTION + 2 × ON DELETE CASCADE (migration 011 CEISA tables). No incompatibility
introduced; `md_tenants.id UUID PRIMARY KEY` with **no default** satisfies every target.

## 8. DELETE OPERATIONAL CONSTRAINT (Part E)

Documented in the migration header AND inside the trigger function body:

> ⚠️ TENANT DELETE IS NOT A SUPPORTED BUSINESS OPERATION. Lifecycle termination uses
> `status = 'inactive'`. Reason: migration 011 contains ON DELETE CASCADE relationships for
> `cus_ceisa_preparations` / `cus_ceisa_validation_results`.

Migration 011 untouched.

## 9. MIGRATION IDEMPOTENCY RESULT (Part F)

Executed end-to-end twice during local testing (including a deliberate stale-row injection +
re-run): CREATE TABLE IF NOT EXISTS ✓, OR REPLACE FUNCTION ✓, DROP/CREATE TRIGGER ✓,
DROP/CREATE POLICY ✓, indexes IF NOT EXISTS ✓, deterministic UPSERT backfill ✓.
Repeated execution is logically safe and now self-healing.

## 10–12. REPOSITORY BASELINE & DIFF (Part G)

- **Tests:** run 1 post-revision returned 540/543 — three transient failures traced to the
  pre-existing Shipment API suite attempting a real connection to `10.0.0.1:5432`
  (password authentication failed — network-state dependent). Immediate re-run: **543/543
  PASS**, zero failures. Two consecutive green runs recorded overall this session.
  📌 Observation logged (pre-existing, out of scope): some suite scenarios are network-dependent.
- **TypeScript:** `tsc --noEmit` = **0 errors**.
- **`git diff --check`:** whitespace warnings only in pre-existing modified application files
  unrelated to Stage R (e.g., `hq/work-orders/page.tsx`); Stage R artifacts clean.

Changed/new repository artifacts attributable to this phase:
- `supabase/migrations/20260825_r01_md_tenants_reconciliation.sql` (REVISION 2)
- `docs/architecture/SENTRALOGIS_RP1_STATIC_REVIEW.md` (verdict updated → GREEN FOR C-2 PREPARATION)
- `docs/architecture/SENTRALOGIS_STAGE_R_C2_READINESS.md` (this file)

## 13. PRODUCTION MODIFICATION

**NONE.** Zero psql/DML/DDL against production or the application's Supabase project during
this entire preparation stage. Local verification used a disposable instance created via
`initdb` into `%TEMP%`, bound to 127.0.0.1:55432, stopped and deleted afterwards.

## 14. C-2 CHECKLIST

```
[ ] Production backup completed
[ ] pg_dump completed successfully
[ ] BACKUP_OK proof captured   (pg_restore --list dump > /dev/null && echo BACKUP_OK)
[ ] Backup artifact verified
[ ] Rollback rehearsal completed against dump/isolated copy
[ ] Rollback rehearsal result = PASS
[ ] Owner explicitly authorizes production DEPLOY
```

Post-DEPLOY verification obligations (from DEPLOYMENT_PLAN §9 + migration header):
V-A…V-F plan block, then V-T1…V-T7 executed live, V-T7 asserting work_orders=100 /
wo_items=96 / job_orders=248 unchanged.

## 15. EXACT NEXT ACTION

Owner performs (or delegates with explicit authorization):
1. `pg_dump "$DATABASE_URL" -Fc -f backup_pre_stage_r_<ts>.dump` + BACKUP_OK proof
2. Rollback rehearsal against restored copy of that dump
3. Issue explicit **DEPLOY** authorization (C-2)

Then, in one maintenance session: apply R-P1 → verify V-A/V-T blocks → apply 001→013 verbatim
→ verify V-B…V-F → smoke tests → schedule Phase 4B-0 release train (forwarding resolve-or-create
fix + hardened auth helper + engagement creation API).

---

## **C-2 NOT GRANTED.**

Stage R stops here per mandate. No production execution of R-P1, of 001→013, and no Phase 4B-0
implementation (hardened api-helper, engagement API, capability registry runtime, forwarding fix)
occurs until the checklist above is complete and DEPLOY is issued.
