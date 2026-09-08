# SENTRALOGIS — STAGE R / R-B REVISION & ISOLATED REHEARSAL REPORT

**Date:** 2026-08-25
**Authorization:** Owner decision R-B (controlled 012 erratum) · C-2 deployment authorization remains scoped to the halted sequence; production NOT contacted in this task.

---

## R-B REVISION

| Check | Result |
|---|---|
| Exactly 4 predicate replacements | ✅ PASS (4 functional `md_users` lookups → `public.get_my_tenant_id()`; the only remaining "md_users" string is inside the erratum comment itself, line 7) |
| Migration 012 diff isolated | ✅ PASS — SHA-256 sweep across all 242 migration files: **zero unexpected changes** (only 012 differs from pre-revision snapshot) |
| Migrations 001–011 unchanged | ✅ PASS (hashes identical) |
| Migration 013 unchanged | ✅ PASS (hash identical) |
| R-P1 unchanged | ✅ PASS (hash identical) |
| Application code unchanged | ✅ PASS (`git status`: no application file touched by this phase) |
| Erratum comment present | ✅ PASS |

## LOCAL REHEARSAL (isolated disposable instance — restored from `backup_pre_stage_r_deploy_20260825_191111.dump`)

Environment notes: local pgcrypto lives in schema `extensions` → moved to `public` for the
rehearsal instance only (production Supabase resolves it via its own search-path configuration);
`auth.users` rows came from the restored dump so behavioral tests exercise real identity chains.

| Step | Result |
|---|---|
| Restore production dump | PASS (100/96/248 + tenants=15 exact) |
| R-P1 Revision 2 | PASS |
| 001→011 (as already deployed) | PASS |
| **Corrected 012** | **PASS** (`CREATE POLICY` emitted — erratum proven against real parser) |
| 013 verbatim | PASS |

## TENANCY VERIFICATION

| Check | Result |
|---|---|
| tenants=15 & md_tenants=15 parity | ✅ PASS |
| Parity violations / orphan projections = 0 / 0 | ✅ PASS |
| RLS isolation behavioral (as role `authenticated`, real auth.users identities): | |
| — D1 staff A sees ONLY own audit row (count=1) | ✅ PASS |
| — D2 staff A cross-tenant INSERT into tenant B blocked by WITH CHECK | ✅ PASS |
| — D3 NULL resolver sees zero rows | ✅ PASS |
| — E-extra decisions table cross-tenant invisible | ✅ PASS |

## STATIC VERIFICATION (corrected 012 + 013)

```
D.audit_events.tenant_id exists ................. PASS
D.decisions.tenant_id exists .................... PASS
D.declaration FK relationships (×2) ............. PASS
D.RLS enabled on both tables .................... PASS
D.exactly 2 ALL policies ........................ PASS
D.USING uses get_my_tenant_id ................... PASS
D.WITH CHECK uses get_my_tenant_id .............. PASS
D.zero md_users references in policies .......... PASS
D.no unexpected triggers introduced ............. PASS
E.bindings exists + tenant_id ................... PASS
E.FK to md_tenants .............................. PASS
E.isolation policy via get_my_tenant_id ......... PASS
E.zero md_users dependency ...................... PASS
─────────────────────────────────────────────────────
19/19 static + 4/4 behavioral = 23/23 PASS
```

## LEGACY PROTECTION

| System | Before rehearsal | After full chain | Verdict |
|---|---|---|---|
| work_orders | 100 | 100 | ✅ PASS |
| wo_items | 96 | 96 | ✅ PASS |
| job_orders | 248 | 248 | ✅ PASS |
| tenants | 15 | 15 | ✅ PASS |

## PRODUCTION MODIFIED: NO

Rehearsal instance destroyed after verification. Production untouched throughout this task.
Repository baseline: `tsc --noEmit` = 0 errors · test suite = 543/543 PASS.

---

# FINAL

```text
R-B REVISION
--------------
exactly 4 predicate replacements: PASS
migration 012 diff isolated:      PASS
001–011 unchanged:                PASS
013 unchanged:                    PASS
R-P1 unchanged:                   PASS
application code unchanged:       PASS

LOCAL REHEARSAL
---------------
R-P1:          PASS
001→011:       PASS
012 corrected: PASS
013:           PASS

TENANCY
-------
tenants/md_tenants parity: PASS
RLS isolation:             PASS
md_users references:       PASS (zero functional references remain)

LEGACY PROTECTION
-----------------
work_orders 100: PASS
wo_items 96:     PASS
job_orders 248:  PASS

PRODUCTION MODIFIED: NO

FINAL:
READY FOR PRODUCTION RESUME
```

## HARD STOP HONORED

No psql/DML/DDL touched production. Migration 012 (corrected) and 013 are rehearsed and
READY. Awaiting explicit owner authorization to **resume production deployment of corrected
012 → 013** and execute the closing V-block + smoke tests to bring Stage R fully GREEN.
