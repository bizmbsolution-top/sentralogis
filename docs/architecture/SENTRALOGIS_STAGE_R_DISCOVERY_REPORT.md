# SENTRALOGIS — STAGE R DISCOVERY REPORT

## Foundation Deployment & Tenancy Reconciliation — Read-Only Discovery

**Date:** 2026-08-25
**Method:** 100% READ-ONLY. Zero DDL/DML executed against production. Three temporary audit scripts were used and deleted.
**Verification channels (dual):**
1. Direct PostgreSQL via `DATABASE_URL` (`information_schema`, `pg_constraint`, `pg_proc`, `pg_policies`)
2. Cross-check through the application's own PostgREST endpoint (`NEXT_PUBLIC_SUPABASE_URL` + service role)

---

## 1. TARGET POSITIVE IDENTIFICATION

| Check | Result |
|---|---|
| `DATABASE_URL` host | `aws-1-ap-south-1.pooler.supabase.com` (user `postgres`) |
| `NEXT_PUBLIC_SUPABASE_URL` project | `nsvkewvmzivu…` (same credentials used by the running application) |
| Database | `postgres`, PostgreSQL 17.6 (aarch64, Supabase-managed) |
| Cross-check agreement | ✅ Both channels return identical existence/results for every probe |

The audited database **is** the production database the application uses.

---

## 2. LIVE IDENTITY GRAPH (verified from constraints, not assumed)

```
auth.users (86 rows)
   │  id
   ├──────────────────────────────────────────────┐
   ▼                                              ▼
profiles (85)                          tenant_users (53)
  id = auth.users.id  [FK CASCADE]        user_id → auth.users [FK CASCADE]
  role text                               UNIQUE(user_id)  ← DB-ENFORCED single membership
  sbu_access text[]                       tenant_id → tenants(id) [FK CASCADE]
  company_id → companies                  role_code → tenant_roles(role_code)
  NO tenant column                        sbu_id → tenant_sbus, is_active, division…
  │                                              │
  │                                              ▼
  │                                       tenants (15)
  │                                         id UUID PK, tenant_code VARCHAR UNIQUE (global)
  │                                         user_id → auth.users  (nullable OWNER link)
  │                                         warehouse_id NOT NULL → warehouses(id) [FK CASCADE]
  │                                         status ('active'/'inactive'), subscription_tier,
  │                                         token_balance, sla_tier CHECK
  └────────── (drivers are a separate graph) ──
driver_profiles ← driver_tenant_links (UNIQUE(profile_id, tenant_id); tenant_id → tenants)
```

### The authoritative live resolver already exists

```sql
get_my_tenant_id()  -- SECURITY DEFINER, STABLE (verified definition):
SELECT COALESCE(
  (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1),  -- staff
  (SELECT id FROM tenants WHERE user_id = auth.uid() LIMIT 1)               -- owner
);
```

This function reads the LIVE tables and is used by all canonical RLS policies.
It is correct for production today. By contrast, `lib/domain/customs/api-helper.ts:30–34`
reads `profiles.tenant_id`, which **does not exist** — confirming that the v1 API helper
generation has never run against production data.

---

## 3. TENANCY DATA RECONCILIATION RESULTS

| Metric | Value | Assessment |
|---|---|---|
| Tenants total | **15** | — |
| Duplicate `tenant_code` | **0** (15 distinct; globally UNIQUE constraint) | ✅ deterministic mapping possible |
| Inactive tenants | 1 (`MBST01`) | flagged, still mapped |
| Tenant staff links (`tenant_users`) | 53 across **8** tenants | 7 tenants have zero staff |
| Orphan `tenant_users` (no profile/auth user) | **0** | ✅ clean |
| NULL tenant or NULL user in `tenant_users` | **0** | ✅ clean |
| Inactive `tenant_users` | 0 | ✅ |
| Owner-vs-staff ambiguity (owner of A, staff of B) | **0 rows** | ✅ `COALESCE` order is currently unambiguous |
| Owners not present in `tenant_users` | 12 | rely on owner branch of resolver — expected pattern |
| Tenants with no access path at all | 7 (listed below) | flagged, mapped anyway |
| Profiles without any tenant context | 20 | viewers(9)/drivers(7)/customer(1)/etc. — legitimate non-tenant roles |
| `auth.users` vs `profiles` delta | 86 vs 85 → 1 user without profile | minor, reported not fixed |

**Tenants without any staff access:** MBST01 (inactive), BARU001, SENTOSA001, DIGITAL_20260501_03:26:28.984623+00 (malformed code format), ANJAY (123456), TEST001, MANUAL001.

**Unresolved mappings: 0.** Every live tenant maps deterministically to a canonical identity by primary-key preservation.

### Live role vocabulary (relevant to future `commercial:read/manage` mapping)

`tenant_superadmin`(3), `hq_director_ops/fin/comm/bizdev/cs`, `hq_finance`, `hq_sales_manager/staff`,
`hq_cs`(9), `hq_commercial_director`, `sbu_admin_{tr,wh,fwd}`, `sbu_manager_{tr,wh}`,
`sbu_ops_tr`(11), `sbu_fin_tr/…`, `ink_staff` (clearance!), plus legacy `profiles.role`
values (`tenant_admin`(11), `viewer`(9), `driver`(7), `warehouse_customer`…).

---

## 4. CANONICAL MIGRATION DEPENDENCY GRAPH (verified per file)

Prerequisite truth discovered: `md_entities` (65 rows) and `md_locations` (22 rows)
**already exist live with `tenant_id` columns** — the canonical naming family is partially
present. The ONLY missing referenced master is `md_tenants`.

| Migration | Creates | References (external in **bold** = missing live) | Order-safe after P1? |
|---|---|---|---|
| 001 | 10 ENUM types (`com_incoterm_type`, `com_work_order_status`, `shp_*`, `svc_request_status`, `cus_*`, `fin_transaction_type`) | none | ✅ |
| 002 | `commercial_service_scopes`, `commercial_work_orders`, `commercial_line_items`; RLS via `get_my_tenant_id()` (exists ✓) | **md_tenants**, md_entities ✓, md_locations ✓, scopes/WOs internal | ✅ |
| 003 | 12 × `shp_*` tables | **md_tenants** + 002 objects + md masters ✓ | ✅ |
| 004 | `svc_service_requests` | **md_tenants**, shp_*, commercial_work_orders | ⚠️ FK-trap table (§6) |
| 005 | `cus_declarations`, `cus_classification_lines` | **md_tenants**, commercial_work_orders, svc_service_requests, md_entities ✓ | ✅ |
| 006 | `event_outbox`, `event_consumption_log`, `event_dead_letter`, `fin_financial_ledger_entries` | **md_tenants** + prior canonical | ✅ |
| 007 | compat views `v_legacy_fw_*`, fn `fn_get_sanitized_customer_tracking` | legacy fw_* (live ✓) | ✅ |
| 008 | HS codes, SKU intelligence, documents, item audit logs | **md_tenants** + cus_* | ✅ |
| 009 | validation runs, exceptions | **md_tenants** + cus_* | ✅ |
| 010 | ALTERs on cus_* (lartas linkage) | cus_* | ✅ |
| 011 | CEISA preparations + results | **md_tenants** + cus_* | ✅ |
| 012 | audit events, decisions | **md_tenants** + cus_* | ✅ |
| 013 | `commercial_capability_bindings` (+ nullable attach cols on `cus_declarations`) | **md_tenants**, commercial_work_orders, shp_* | ✅ |

**Graph conclusion: ONE prerequisite object (`md_tenants`) unlocks the entire chain 001→013 in numeric order.**
All 34 target table names verified free of collisions. No canonical enums exist yet (no partial enum state).

---

## 5. PROTECTED SYSTEM BASELINE (captured pre-deployment for rollback comparison)

| Object | Live state |
|---|---|
| `work_orders` | 100 rows; `tenant_id NOT NULL` but **no FK to tenants** (observation only — do not touch); SLA timestamps present; RLS policy `tr_wo_isolation` ALL |
| `wo_items` | 96 rows; `wo_id → work_orders CASCADE` |
| `job_orders` | 248 rows; `wo_item_id → wo_items CASCADE` (NOT NULL contract intact); vendor_tenant_id → tenants ✓ |
| GPS/driver | `fleet_gps_status`, `driver_profiles`, `driver_tenant_links` healthy — untouched |
| Finance | `finance_coa/journals/transactions` live — untouched |

---

## 6. THE FK TRAP — DEPLOYMENT REALITY CHECK

`app/api/forwarding/wo/route.ts` inserts legacy `work_orders` then writes `svc_service_requests`
with that id (`:54–69 → :128`). Verified live: `svc_service_requests` does not exist, therefore
**that write path is ALREADY failing in production today** ("relation does not exist").

Deployment consequence:
- Applying migration 004 does NOT break anything that currently works.
- It changes the failure mode from *table-missing* to *FK-violation* until Phase 4B-0/R-4 ships
  the resolve-or-create-engagement fix.
- Required ordering guard: the R-4 runtime fix must be deployed **in the same release train**
  as (or immediately after) the canonical foundation — documented as a hard coupling in the
  Deployment Plan §7.

No schema weakening is required or permitted (LAW 3).

---

## 7. FINDINGS SUMMARY FOR PLANNING

| # | Finding | Consequence |
|---|---|---|
| D-1 | Only `md_tenants` is missing to unlock migrations 001→013 | Single prerequisite migration (R-P1) suffices |
| D-2 | Tenant data is pristine: 0 duplicates, 0 orphans, 0 ambiguous memberships | Option-A backfill is deterministic; ID preservation trivial |
| D-3 | `tenant_users.user_id UNIQUE` = DB-guaranteed single tenancy per user | Identity resolution can be single-query, no disambiguation logic needed |
| D-4 | `get_my_tenant_id()` exists live and reads real tables | Canonical RLS will work immediately post-deploy; hardened API helper should reuse this exact chain |
| D-5 | v1 api-helpers assume nonexistent `profiles.tenant_id` | Confirms helpers never ran against prod; D-2 hardening must resolve via `tenant_users`/owner branch |
| D-6 | Forwarding ServiceRequest write path already broken live | Deployment introduces no new breakage; fix coupling documented |
| D-7 | 20 profile rows legitimately lack tenant context (viewer/driver/customer roles) | Hardened helper must treat "no tenant context" as authorization denial for commercial APIs, not an error condition |
| D-8 | Malformed tenant_code exists (`DIGITAL_20260501_03:26:28…`) | Cosmetic; does not block mapping; reported not fixed (no silent fixes) |

---

*End of Discovery Report. Companion documents: TENANCY_RECONCILIATION.md, DEPLOYMENT_PLAN.md, ADR-030.*
