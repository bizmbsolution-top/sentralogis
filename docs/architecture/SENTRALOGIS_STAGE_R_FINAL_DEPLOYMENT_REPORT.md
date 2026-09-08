# SENTRALOGIS — STAGE R FINAL DEPLOYMENT REPORT

## Foundation Closure · R-P1 + 001→013 FULLY DEPLOYED

**Date:** 2026-08-25
**Authorization chain:** C-1 RATIFIED → C-2 GRANTED (deploy authorized) → 012 halt → R-B forensic PASS → R-B revision rehearsed 23/23 → **RESUME GRANTED & EXECUTED**

---

## PHASE 0–1 — PRE-FLIGHT + FRESH BACKUP ✅

| Item | Result |
|---|---|
| Production identity | session pooler `aws-1-ap-south-1.pooler.supabase.com:5432`, project `nsvkewvmzivudkcczhnk` ✅ |
| File integrity vs rehearsal snapshot | 242-file SHA-256 sweep: **only corrected-012 differs**; R-P1/001→011/013 byte-identical ✅ |
| Fresh backup | `backup_pre_012_resume_20260825_194221.dump` · 11,806,880 bytes |
| pg_dump exit / `pg_restore --list` exit | 0 / 0 → **BACKUP_OK** |

## PHASE 2 — PRE-012 STATE ✅

tenants=15 · md_tenants=15 · parity=0 · legacy=100/96/248 · all three target objects confirmed absent.

## PHASE 3–4 — CORRECTED 012 DEPLOYED + VERIFIED ✅

```
psql --single-transaction --set=ON_ERROR_STOP=1 -f 20260826_012_customs_audit_decision_schema.sql
→ ALTER TABLE ×2, CREATE POLICY ×2, COMMIT — exit 0
```

Static verification (9/9): tenant_id columns ✓ · declaration FKs ✓ · RLS enabled both ✓ · exactly 2 ALL policies (`cus_decisions_tenant_isolation`, `cus_audit_events_tenant_isolation`) ✓ · USING/WITH CHECK via `get_my_tenant_id()` ✓ · zero md_users in policies ✓ · no unexpected triggers ✓ · grants intact ✓.

Behavioral RLS on production (real identities via Supabase JWT-claims impersonation, entire probe inside rolled-back transaction):

| Test | Result | Evidence |
|---|---|---|
| D1 staff-A own-tenant write + scoped visibility | ✅ PASS | rows visible = 1 |
| D2 cross-tenant INSERT rejected by WITH CHECK | ✅ PASS | *"new row violates row-level security policy"* |
| D3 NULL resolver sees zero rows | ✅ PASS | rows = 0 |
| D4 cross-tenant decisions invisible | ✅ PASS | rows = 0 |
| Probe residue after ROLLBACK (declarations/events/decisions) | ✅ PASS | 0 / 0 / 0 |

## PHASE 5–6 — MIGRATION 013 DEPLOYED + VERIFIED ✅

Verbatim apply, exit 0. Verified: key columns ✓ · FK → md_tenants ✓ · UNIQUE(tenant_id, work_order_id, capability_type) ✓ · RLS enabled ✓ · policy via get_my_tenant_id ✓ · zero md_users dependency ✓.

## STEP 7 — CLOSING VERIFICATION V-B…V-F ✅

```
V-B canonical enums .................. 10/10        PASS
V-C canonical tables ................. 34/34        PASS
V-D svc_service_requests.work_order_id
    → commercial_work_orders FK ...... present      PASS
V-E RLS on all 4 commercial tables ... all true     PASS
V-F legacy counts .................... 100/96/248   PASS
TENANCY tenants=md_tenants=15 ........              PASS
TENANCY parity/orphans ............... 0 / 0        PASS
NO md_users object created ........... confirmed    PASS
```

## STEP 8 — POST-DEPLOY DATA SAFETY ✅

Tenant identity hash (id‖code‖status): `cbfd498ceaa44314a4e25a876045192f` — **identical to pre-deployment snapshot** → tenant IDs, codes, statuses unchanged. No business-data migration performed.

## STEP 9 — SMOKE TESTS ✅

```
/api/cron/health     HTTP 200
/api/driver/health   HTTP 200
/api/check           HTTP 200
/api/jo/health       HTTP 405 (method-restricted route alive — established non-failure)
```

## STEP 10 — PRODUCTION MODIFICATION SUMMARY

Additive-only deployment, zero destructive operations:
1. `md_tenants` projection table + sync triggers (R-P1)
2. 10 enum types, 34 canonical tables, compatibility views/functions (001→013 verbatim except the four ratified R-B predicate errata in 012)
3. Nullable cross-domain attachment columns on cus_declarations (from 013)

Legacy execution untouched throughout; every count verified at every gate.

---

# FINAL STAGE R STATUS

```text
BACKUP               = backup_pre_012_resume_20260825_194221.dump (BACKUP_OK)
R-P1                 = DEPLOYED + VERIFIED
001–011              = DEPLOYED VERBATIM + VERIFIED
012 corrected        = DEPLOYED + VERIFIED (9 static + 4 behavioral PASS)
013                  = DEPLOYED VERBATIM + VERIFIED (6/6)
V-B / V-C / V-D / V-E / V-F = PASS / PASS / PASS / PASS / PASS
TENANCY PARITY       = PASS (15/15, parity 0, orphans 0)
TENANT IDENTITY HASH = UNCHANGED
LEGACY COUNTS        = 100 / 96 / 248
SMOKE TESTS          = PASS
md_users dependency  = ZERO
PRODUCTION STATE     = HEALTHY
REPOSITORY           = tsc 0 errors · 543/543 tests PASS

FINAL STAGE R STATUS = 🟢 GREEN
```

Stage R Foundation Deployment is COMPLETE. The canonical architecture is now live:
`tenants → md_tenants (projection) → commercial_work_orders → capability bindings → svc_service_requests → SBU execution`.

Per authorization scope, Phase 4B-0 implementation has NOT started. Awaiting explicit owner instruction.
