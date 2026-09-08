# SENTRALOGIS — STAGE R / C-2 BACKUP & ROLLBACK REHEARSAL REPORT

## Production Backup · Restore Rehearsal · Pre-Deployment Assertions

**Date:** 2026-08-25
**Authorization state at completion:** C-1 = RATIFIED · **C-2 = NOT GRANTED** · PRODUCTION DEPLOYMENT = **BLOCKED**

---

## 1. PRODUCTION IDENTITY VERIFICATION

| Check | Result |
|---|---|
| `DATABASE_URL` host | `aws-1-ap-south-1.pooler.supabase.com` |
| Connection user | `postgres.nsvkewvmziv` — project ref **nsvkewvmziv** matches `NEXT_PUBLIC_SUPABASE_URL` ✅ |
| Database | `postgres` (PostgreSQL 17.6 server, Supabase-managed) |
| Credentials | never printed / never logged (masked during inspection) |

Operational note recorded for the runbook: the configured URL targets the **transaction pooler**
(port 6543) with a `pgbouncer=true` URI parameter, which pg_dump rejects outright and which is
unsuitable for dump sessions. The backup was taken via the **session pooler (port 5432, same
host/project, query parameters stripped)**. This connection rewrite is now a mandatory step of
the C-2 deployment runbook.

## 2. BACKUP COMMAND / RESULT (C-2A)

```
pg_dump "<session-pooler-url>" -Fc -f backup_pre_stage_r_20260825_190143.dump
→ pg_dump exit code = 0   (a first attempt via the transaction-pooler URL failed fast with
  "invalid URI query parameter: pgbouncer"; zero-byte artifact deleted; no partial state)
```

## 3. BACKUP_OK PROOF

```
pg_restore --list backup_pre_stage_r_20260825_190143.dump  → exit code = 0

BACKUP_OK
```

## 4. BACKUP ARTIFACT METADATA

| Field | Value |
|---|---|
| Filename | `backup_pre_stage_r_20260825_190143.dump` |
| Location | `%TEMP%\stage_r_backup\` (outside repository — verified NOT staged as source) |
| Size | 11,615,456 bytes (~11.6 MB), custom format `-Fc` |
| Created | 2026-08-25 19:01:43 local (+07:00) |
| pg_dump exit | 0 |
| pg_restore --list exit | 0 |
| Retention | Retained until C-2 deployment completes + post-deploy verification passes; then owner decides archival |

## 5. RESTORE REHEARSAL (C-2B)

Disposable isolated instance: fresh `initdb` cluster (local PG 18.3 binaries), port 55433,
trust-auth, bound to 127.0.0.1 only, destroyed after rehearsal. **Production never contacted
for restore.**

Restore command: `pg_restore --no-owner --no-privileges` into empty database `rp1_restore`.

Non-material restore errors classified (all Supabase-platform-specific, none affecting
business data or this rehearsal's scope):

| Error class | Objects | Materiality |
|---|---|---|
| Extension unavailable locally | `supabase_vault`, `vector` | None — platform extensions |
| Dependent relations skipped | `vault.secrets`, `public.hs_embeddings` | None — vault/AI-embedding internals |
| Role missing mid-restore | `authenticated`, `anon`, `service_role` → one COPY failure for `realtime.subscription` (Supabase realtime internal bookkeeping, not business data); roles created afterwards | None |

**Restored protected-system state (exact match to production):**

| Table | Rows restored |
|---|---|
| work_orders | **100** |
| wo_items | **96** |
| job_orders | **248** |
| tenants | **15** (0 duplicate codes) |

## 6. ROLLBACK REHEARSAL (the mandated sequence)

Restored copy confirmed to represent **pre-R-P1 production**: `md_tenants` absent ✅,
canonical 001→013 tables count = **0** ✅.

Tenant identity checksum captured before rehearsal:
`md5(tenants.id||tenant_code||name) = fd9f79834a175bb0fd4b78439df124d6`

| Step | Result |
|---|---|
| Apply R-P1 Revision 2 onto restored copy | COMMIT clean; mirror_count=15; parity_violations=0; trigger present; RLS enabled |
| Execute documented pre-canonical rollback (drop trigger → function → policy → table) | COMMIT clean |
| md_tenants removed | ✅ true |
| Trigger removed | ✅ true |
| Function removed | ✅ true |
| `tenants` intact | ✅ 15 rows |
| Tenant identity hash after rollback | ✅ **identical** (`fd9f7983…`) — mappings unchanged byte-for-byte |
| Legacy tables after rollback | ✅ 100 / 96 / 248 unchanged |
| Re-apply R-P1 (cycle idempotency) | ✅ COMMIT clean; mirror_count=15; parity_violations=0 |

No silent data loss at any step. Rollback cannot destroy canonical data post-001→013 because
31 dependent FKs make `DROP TABLE md_tenants` fail loudly by design.

## 7–8. PRODUCTION READ-ONLY BASELINE (C-2C — captured WITHOUT modification)

```text
tenants      = 15          (expected 15)         ✅ MATCH
work_orders  = 100         (expected 100)        ✅ MATCH
wo_items     = 96          (expected 96)         ✅ MATCH
job_orders   = 248         (expected 248)        ✅ MATCH
md_tenants_exists    = false   (expected: legitimate pre-R-P1 state) ✅
canonical tables present = 0 of 6 probed            ✅ expected pre-foundation
```

Tenant codes captured (15, incl. known anomalies carried forward without silent fixes):
ADS, MBST001, DIGITAL_20260501_03:26:28.984623+00, TEST001, HALU-001, SENTOSA001, MBST01,
12345678, BARU001, 123456, ATM, MANUAL001, JALU-1, MAJUJAYA001, MBS.
Tenant-ID/status snapshot hash: `cbfd498ceaa44314a4e25a876045192f`
(re-computable at deployment time to prove zero drift between now and DEPLOY).

## 9. MIGRATION-STATE VERIFICATION

- Production remains **pre-R-P1, pre-001→013** (verified live, §7).
- Supabase CLI-tracked history still ends April 2026; numbered migrations remain an
  out-of-band series — unchanged finding from Stage R discovery.

## 10. REPOSITORY SAFETY VERIFICATION (C-2D)

| Check | Result |
|---|---|
| R-P1 is REVISION 2 | ✅ header marker line 4 + all adjustment implementations present (`md_tenants_read_own`, `search_path = ''`, UPSERT backfill, EXECUTE revokes) |
| Migrations 001→013 unmodified | ✅ file mtimes pre-date the R-P1 revision session; content untouched |
| No legacy application code modified by this phase | ✅ `git status` modified files are the pre-existing set documented since Phase 4B discovery; Stage R added/changed none |
| `tsc --noEmit` | ✅ 0 errors |
| Test suite | ✅ **543 / 543 PASS** (one transient run of 540/543 was traced to the pre-existing Shipment-API suite attempting a live connection to `10.0.0.1:5432`; consecutive re-run green — observation logged, unrelated to Stage R artifacts) |
| Dump/temp files staged as source? | ❌ NONE — artifact lives in `%TEMP%\stage_r_backup\`; temp scripts deleted; failed zero-byte first dump purged |

## 11. ANOMALIES

| # | Anomaly | Disposition |
|---|---------|-------------|
| A-1 | Transaction-pooler URL rejected by pg_dump | Resolved via session-pooler port 5432; encoded into runbook as mandatory step |
| A-2 | Local restore requires creating `authenticated`/`anon`/`service_role` roles + tolerating Supabase-extension errors | Documented; non-material |
| A-3 | Transient test-suite network flake (10.0.0.1:5432 auth failure in Shipment API scenarios) | Pre-existing; logged for future hardening, does not block C-2 |

## 12. EXPLICIT AUTHORIZATION STATE

```text
C-1                     = RATIFIED
C-2                     = NOT GRANTED
PRODUCTION DEPLOYMENT   = BLOCKED
PRODUCTION MODIFIED     = NO (backup is read-only; baseline assertions read-only)
```

Successful backup and rehearsal do NOT constitute deployment authorization.

## FINAL GATE OUTPUT

```text
BACKUP_OK           = YES
ROLLBACK_REHEARSAL  = PASS
PRODUCTION_MODIFIED = NO
C-2                 = NOT GRANTED
DEPLOY              = BLOCKED
```

**STOP.** Awaiting explicit owner issuance of **C-2 (DEPLOY)**. Upon grant, execution follows
`SENTRALOGIS_STAGE_R_DEPLOYMENT_PLAN.md`: backup refresh (fresh dump at deploy time) → R-P1 →
verify V-A/V-T blocks → 001→013 verbatim → verify V-B…V-F → smoke tests → Phase 4B-0 release train.
