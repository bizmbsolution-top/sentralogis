# ADR-030 — Canonical Tenant Identity Reconciliation

**Status:** RATIFIED — Owner Authorization C-1 (2026-08-25). Execution of migration R-P1 awaits C-2.
**Date:** 2026-08-25
**Context:** Stage R Foundation Deployment · Evidence: SENTRALOGIS_STAGE_R_DISCOVERY_REPORT.md

## Context

The canonical Phase 1–4A schema family references `md_tenants(id)`, which does not exist
in the live production database. The live tenancy system is `tenants` (+ `tenant_users`
with DB-enforced single membership per user, + `tenant_roles`, + owner link `tenants.user_id`),
resolved in production by the existing `get_my_tenant_id()` SECURITY DEFINER function.
Live data is pristine: 15 tenants, 0 duplicate codes, 0 orphans, 0 ambiguous memberships.
The canonical naming family is already partially live (`md_entities`, `md_locations`).

## Decision

**OPTION A — Create `md_tenants` as a canonical identity projection of `tenants`, with
primary-key preservation and trigger-enforced synchronization.**

1. `md_tenants` is created with **identical primary keys** to `tenants`; backfill is a
   deterministic `INSERT … SELECT … ON CONFLICT DO NOTHING`.
2. `tenants` remains the single source of truth for tenant lifecycle; `md_tenants` rows are
   written **only by triggers** (insert/update mirror; delete restricted when canonical
   references exist). Direct application writes to `md_tenants` are prohibited.
3. No translation/mapping table is required: the shared UUID *is* the durable mapping.
   `get_my_tenant_id()` output is simultaneously valid for legacy and canonical surfaces.
4. Canonical migrations 20260826_001 → 20260827_013 are then applied **verbatim, unmodified**
   in numeric order.

## Rejected alternative

**OPTION B — rewrite canonical migrations to reference live `tenants`.**
Rejected: forks 13 ratified migration files from the repository-of-record; permanently
splits the `md_*` master-data naming convention (md_entities/md_locations already live);
higher long-term maintainability cost for zero integrity gain.

## Consequences

- ✅ One prerequisite migration unlocks the entire canonical dependency chain.
- ✅ Zero risk to protected execution (`work_orders`/`wo_items`/`job_orders` untouched).
- ✅ RLS continues working via the existing `get_my_tenant_id()` unchanged.
- ⚠️ Introduces a trigger-maintained projection — divergence is prevented mechanically,
  but monitoring should alert if a sync trigger is ever dropped.
- ⚠️ Malformed cosmetic data (one `tenant_code` format anomaly) carries forward unresolved,
  by explicit no-silent-fixes policy.

## Compliance with locked laws

LAW 1 ✅ (enables commercial_work_orders deployment verbatim) · LAW 2 ✅ (projection design
prevents dual authority) · LAW 3 ✅ (no FK weakening) · LAW 4 ✅ (uses verified live identity
chain) · LAW 5 ✅ (every claim evidence-cited).
