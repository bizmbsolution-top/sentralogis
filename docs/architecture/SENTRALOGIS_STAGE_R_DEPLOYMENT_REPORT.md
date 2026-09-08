# SENTRALOGIS — STAGE R DEPLOYMENT REPORT

## Foundation Deployment Execution · C-2 GRANTED & EXECUTED

**Date:** 2026-08-25
**Authorization:** C-2 DEPLOY GRANTED by owner (scope: fresh backup → R-P1 → verifications → 001→013 verbatim → V-B…V-F → smoke tests)
**Final state:** 🟢 **DEPLOYED THROUGH MIGRATION 011** · 012 HALTED at owner-mandated stop condition · 013 pending

---

## 1. STEP 1 — FRESH PRODUCTION BACKUP ✅

| Field | Value |
|---|---|
| Artifact | `%TEMP%\stage_r_backup\backup_pre_stage_r_deploy_20260825_191111.dump` |
| Size | 11,618,846 bytes (~11.6 MB), custom `-Fc` format |
| Connection | session pooler :5432 (transaction-pooler URL rejected by pg_dump — known runbook step) |
| pg_dump exit | **0** |
| `pg_restore --list` exit | **0** |

## 2. STEP 2 — R-P1 REVISION 2 APPLIED ✅

```
psql --single-transaction --set=ON_ERROR_STOP=1 -f 20260825_r01_md_tenants_reconciliation.sql
→ CREATE TRIGGER / INSERT 0 15 / NOTIFY / COMMIT — exit 0
```

## 3. STEP 3 — V-A + V-T VERIFICATION PROOFS (live production)

```
V-A1 counts identical (tenants=15 / md_tenants=15):      PASS
V-A2 exactly-one mapping violations=0:                   PASS
V-A3 orphan projections=0:                               PASS
V-A4 field parity violations=0:                          PASS
V-T5 trigger present + SECURITY DEFINER:                 PASS
V-T6 live sync probe mirrored (+ rollback clean):        PASS + PASS
V-T9.1 RLS enabled on md_tenants:                        PASS
V-T9.2 authenticated EXECUTE denied:                     PASS
V-T9.3 exactly one SELECT policy:                        PASS
V-T9.4 zero write policies:                              PASS
─────────────────────────────────────────────────────────
11 / 11 PASS
```

## 4. STEP 4 — CANONICAL FOUNDATIONS 001→013

| Migration | Result |
|---|---|
| 001 enums/extensions | ✅ applied |
| 002 commercial scopes/WOs/line items | ✅ applied |
| 003 shipments/units/plans | ✅ applied |
| 004 service requests | ✅ applied |
| 005 customs declarations | ✅ applied |
| 006 event outbox + fin ledger | ✅ applied |
| 007 legacy compatibility views | ✅ applied |
| 008 PPJK workbench schema | ✅ applied |
| 009 customs exceptions | ✅ applied |
| 010 documents/valuation/lartas ALTERs | ✅ applied |
| 011 CEISA preparations | ✅ applied |
| **012 audit/decisions** | 🛑 **HALTED — FAILED** (`relation "public.md_users" does not exist`, line 79–86; single transaction rolled back cleanly) |
| **013 capability bindings** | ⏸ NOT ATTEMPTED (halt rule) |

### ROOT CAUSE (verified, not guessed)

Migration **012 is the ONLY canonical migration referencing `public.md_users`**
(lines 79/80/85/86 — the RLS policies for `cus_declaration_audit_events` and
`cus_customs_decisions`). `md_users`:
- is created by NO migration in the repository,
- does not exist in the live database,
- contradicts the tenancy convention of every sibling migration, which correctly uses
  `public.get_my_tenant_id()` (live resolver over `tenant_users`/`tenants`).

Classification per Stage R §8 decision matrix: **prerequisite-migration-or-controlled-rewrite
decision required from owner.** Per mandate #9 ("if any mandatory verification fails, STOP
immediately"), execution halted before 012's COMMIT and before 013.

## 5. STEP 5 — VERIFICATIONS FOR THE DEPLOYED STATE (V-B…V-F, scoped)

```
V-B  canonical enums 10/10:                              PASS
V-C  canonical tables through 011 (31/31):               PASS
     BLOCKED objects absent (audit_events/decisions/
     capability_bindings):                               PASS
V-D  svc_service_requests→commercial_work_orders FK:     PASS
V-E  RLS enabled on all existing commercial tables
     (service_scopes/work_orders/line_items = true):     PASS
V-F  protected counts unchanged (100/96/248):            PASS
TENANCY tenants=md_tenants=15, parity=0:                 PASS
```

## 6. STEP 6 — SMOKE TESTS

| Endpoint | Result |
|---|---|
| `/api/cron/health` | HTTP 200 ✅ |
| `/api/driver/health` | HTTP 200 ✅ |
| `/api/check` | HTTP 200 ✅ |
| `/api/jo/health` | HTTP 405 (route present, method-restricted) ✅ |

Legacy read paths verified at DB level (100/96/248 unchanged); no application behavior change
was expected or observed.

## 7. PRODUCTION STATE AFTER DEPLOYMENT

- **Deployed:** R-P1 (md_tenants projection + sync triggers) and migrations 001→011 verbatim.
- **Absent (by halt):** 012 objects (`cus_declaration_audit_events`, `cus_customs_decisions`
  + related), 013 object (`commercial_capability_bindings`) and its nullable attachment columns.
- **Runtime impact today: NONE.** No deployed application code writes the absent tables;
  Phase 3D/4A suites run against in-memory fakes; legacy execution untouched (100/96/248).
- **FK trap status:** `svc_service_requests.work_order_id → commercial_work_orders` now EXISTS
  in production with correct shape (V-D PASS). The forwarding writer fix remains mandatory
  before any forwarding ServiceRequest traffic — unchanged coupling from the plan.

## 8. REMEDIATION DECISION REQUIRED (owner) — RESOLVE-THEN-RESUME 012/013

| Option | Description | Assessment |
|---|---|---|
| R-A | Prerequisite micro-migration creating `md_users` as a projection of `profiles`+`tenant_users` (mirroring ADR-030 pattern), then apply 012/013 verbatim | Heavier; introduces a second identity projection |
| **R-B (recommended)** | Controlled rewrite of ONLY the four policy predicates in 012 from `md_users` lookup to `public.get_my_tenant_id()` — identical to every sibling migration; documented as erratum; then apply 012→013 verbatim-after-fix | Minimal, consistent, uses proven live resolver |
| R-C | Defer 012/013 to next release train entirely | Leaves customs audit/decision tables absent until then |

## 9. ARTIFACTS

- Backup: `%TEMP%\stage_r_backup\backup_pre_stage_r_deploy_20260825_191111.dump` (11.6 MB, verified)
- This report; prior reports unchanged.

## FINAL GATE

```text
BACKUP_OK                = YES (fresh, pre-deploy)
R-P1                     = APPLIED + VERIFIED (11/11)
001→011                  = APPLIED VERBATIM + VERIFIED
012                      = HALTED (md_users phantom reference — owner decision required)
013                      = PENDING (after 012 resolution)
PROTECTED SYSTEMS        = UNCHANGED (100/96/248; smoke tests green)
PRODUCTION DATA          = NO business data modified
PHASE 4B-0               = NOT STARTED (per C-2 scope)
STAGE R STATUS           = YELLOW — foundation deployed through 011; 012/013 pending
                           owner decision R-A / R-B / R-C
```

**STOPPED per authorization clause #9. Awaiting owner decision to resolve 012 and resume.**
