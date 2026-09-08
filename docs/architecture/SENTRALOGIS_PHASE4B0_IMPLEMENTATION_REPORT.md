# SENTRALOGIS — PHASE 4B-0 IMPLEMENTATION REPORT

## COMMERCIAL ROOT CONSOLIDATION & ARCHITECTURE LOCK

**Status:** 🔴 **RED — STOPPED AT MANDATORY STOP CONDITION #8**
**Date:** 2026-08-25
**Production code changed:** NONE
**Migrations created:** NONE

---

## 0. EXECUTIVE VERDICT

Phase 4B-0 was authorized to make `commercial_work_orders` the canonical runtime commercial root. Per mandate §7 ("Do not rely only on the report — verify findings against the current repository") and §9 ("Do NOT guess"), a pre-implementation live-database verification was performed.

**The verification discovered that the ENTIRE canonical schema family (Phases 1–4A) has never been applied to the live production database** — including `commercial_work_orders` itself, `md_tenants`, `cus_declarations`, `shp_shipments`, `svc_service_requests`, and `commercial_capability_bindings`.

This is precisely **Stop Condition #8**: *"STOP immediately and report instead of coding if you discover: The live database differs materially from repository migrations."*

Per §27 and §29, implementation halted before writing any production code. This report documents the evidence, the completed audit work, the resolved FK investigation, and the exact remediation path required to re-open Phase 4B-0.

---

## 1. BASELINE (RECORDED BEFORE ANY CHANGE)

| Check | Command | Result |
|---|---|---|
| Test suite | `npx tsx scratch/run-tests.ts` | **543 / 543 PASS** |
| TypeScript | `npx tsc --noEmit` | **PASS (exit 0)** |
| Production diff | `git status` | No new production changes (only Phase 4B discovery doc pre-existing) |

Baseline unchanged at close of phase: re-verified after all activity — **543/543 PASS, tsc 0 errors**.

---

## 2. DECISIONS D-1 … D-5 — RATIFICATION STATUS

| Decision | Locked Direction | Ratification Status in 4B-0 |
|----------|-----------------|------------------------------|
| D-1 | `commercial_work_orders` = canonical root; ADR-018 ratified | **ACCEPTED AS ARCHITECTURAL LAW** — but cannot be made *runtime* truth yet (see §4) |
| D-2 | Harden API identity; no unauthenticated tenant fallback for canonical APIs | **DESIGN CONFIRMED** — implementation deferred with 4B-0 code freeze; additionally discovered the existing session helper reads `profiles.tenant_id` which does not exist live (§5.3) |
| D-3 | `commercial_service_scopes` ≠ Service Catalog; no destructive drop | **RATIFIED** — no migration written; dependency analysis complete (§6) |
| D-4 | Registry-driven capability vocabulary | **FOUNDATION DESIGN COMPLETE** — implementation deferred (§7); no hard-coding added |
| D-5 | Sell→Service/Commercial; Cost→Capability/SBU | **RATIFIED** — nothing to migrate in this phase; no legacy pricing touched |

No ADR documents were finalized because no implementation occurred to ratify. ADR-018 remains *ratified as design* per this phase's authorization but is now flagged **NOT DEPLOYED**. ADR-022 / ADR-023 / ADR-029 remain **PROPOSED**, awaiting the remediation path in §9.

---

## 3. ROOT AUDIT — DEPENDENCY MAPS (MANDATE §8)

### 3.1 Legacy `work_orders` lifecycle (live system)

```
CreateWOForm.tsx (HQ multi-SBU form)
    │  INSERT → work_orders            (app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx:391)
    │  INSERT → wo_items               (:436–457; unit_price/total_revenue per item,
    │                                    sbu_type ∈ TRUCKING/WAREHOUSE/FORWARDING/CLEARANCE)
    ▼
wo_items ──► job_orders (wo_item_id NOT NULL)          [PROTECTED trucking chain]
    │              ├─► job_tracking (GPS)              [PROTECTED]
    │              ├─► extra_costs                     [cost side]
    │              └─► invoices/invoice_lines          [billing derived from JO flags]
    ▼
Forwarding legacy: app/api/forwarding/wo/route.ts
    INSERT → work_orders + wo_items + fw_container_items   (:54–87, :195–204)
    then issues svc_service_requests with that legacy wo_id    (:123–134)  ← see §5
    ▼
Warehouse: flows write job_orders with sbu_type='WAREHOUSE' (+ wh_* execution)
Customs canonical: cus_declarations.work_order_id → commercial_work_orders  [NOT LIVE]
Shipment canonical: shp_shipments.work_order_id → commercial_work_orders    [NOT LIVE]
```

### 3.2 `commercial_work_orders` consumer inventory (verified against repo AND live DB)

| Consumer type | Result |
|---|---|
| Migration definitions | `20260826_002:30-50` (table), FKs from line items/shipments/service requests/declarations/bindings/outbox/ledger |
| Runtime writers | **ZERO** |
| Runtime readers | **ZERO** |
| API consumers | Only `capabilities/route.ts` reads bindings *by* work_order_id (no WO row ever needed to exist to return []) |
| UI consumers | ZERO |
| Tests | In-memory fakes only (`ppjk-phase4a-commercial-composition.test.ts`) — never touch real DB |
| Views/triggers | None beyond RLS policies |
| event_outbox references | Column exists in migration `006`; no writer |
| **Live database** | **TABLE DOES NOT EXIST** |

### 3.3 Answer to the mandated question

> *"What exactly must happen for commercial_work_orders to become the canonical runtime commercial root without breaking protected execution?"*

1. The canonical foundation migrations (20260826_001…20260827_013) must actually be **applied to the production database** — none of them are.
2. Before applying them, the **identity-layer divergence must be reconciled**: canonical migrations reference `md_tenants(id)`; the live tenant table is `tenants` (different name, different columns — see §5.2), and `profiles.tenant_id` (read by every v1 auth helper) does not exist live.
3. Only then can 4B-0's designed artifacts (registry table, engagement creation API, hardened auth) be layered on top.

---

## 4. CRITICAL FINDING — LIVE DATABASE vs REPOSITORY MIGRATIONS (STOP CONDITION #8)

### 4.1 Method (double-verified, read-only)

1. Direct Postgres connection via `DATABASE_URL` from `.env.local` (`information_schema` + `pg_constraint` queries).
2. Cross-check through the application's own PostgREST endpoint (`NEXT_PUBLIC_SUPABASE_URL` + service role) to guarantee the audited project is the same one production uses.

Both methods agree. Temporary audit scripts were used and deleted; no data was modified.

### 4.2 Evidence

**Tables present in live DB (canonical-pattern scan):**

```
companies, customer_requests, customers, tenants, tenant_roles, tenant_sbus,
tenant_users, driver_tenant_links, finance_coa/journal*/transactions,
fleet_gps_status, fw_consolidations, profiles, md_entities, work_orders(100 rows),
wo_items, job_orders, driver_profiles ...
```

**Canonical tables — ALL MISSING (HTTP 404 on app's own REST endpoint):**

| Table | Live status |
|---|---|
| `md_tenants` | ❌ NOT FOUND (live table is `tenants`, different column set: `warehouse_id, name, email, phone, sla_tier, status, user_id, tenant_code, subscription_tier, token_balance, ...`) |
| `cus_declarations` (+ entire `cus_*` customs stack) | ❌ NOT FOUND |
| `shp_shipments` (+ entire `shp_*` stack) | ❌ NOT FOUND |
| `svc_service_requests` | ❌ NOT FOUND |
| `commercial_work_orders` | ❌ NOT FOUND |
| `commercial_service_scopes` | ❌ NOT FOUND |
| `commercial_line_items` | ❌ NOT FOUND |
| `commercial_capability_bindings` | ❌ NOT FOUND |
| `fin_financial_ledger_entries` | ❌ NOT FOUND |
| `event_outbox` | ❌ NOT FOUND |

**Migration ledger:** Supabase CLI-tracked migrations end April 2026 (`20260429064800 unify_contacts_v2`). The entire numbered family 032…190 and the 20260826_*/20260827_* canonical series were never applied through tracked migration flow, and — decisively — their objects do not exist in the target schema.

**One positive finding:** the RLS helper `get_my_tenant_id()` DOES exist live (alongside GPS functions), so some later-era SQL was applied manually — the live DB is a *partial, divergent* application history, which is exactly why §24's rule ("Do not assume the migration filenames are the latest live schema — verify") mattered.

### 4.3 Consequences

- **Stop Condition #8 triggered verbatim.** The gap is material: an entire architectural generation (Phases 1–4A canonical domain) is absent from production.
- All Phase 3D/4A "migration applied" statements in prior reports describe repo artifacts, not deployed state. The 543 passing tests run against in-memory fakes and therefore could never detect this.
- D-1 cannot be implemented as stated *yet*: making `commercial_work_orders` runtime-canonical presupposes its existence in the live DB plus a tenancy reconciliation (`md_tenants` vs `tenants`; missing `profiles.tenant_id`).
- Deploying migrations 001–013 unmodified would fail immediately (FK to nonexistent `md_tenants`) or, if forced, create two parallel tenancy authorities — violating D-1's own "no dual authority" spirit at the identity layer.

---

## 5. CRITICAL FK INVESTIGATION — `svc_service_requests.work_order_id` (MANDATE §9)

### 5.1 Resolution (evidence-based, no guessing)

The investigation categories offered were A) migration mismatch, B) runtime bug, C) dead/unused code, D) incompatible legacy path, E) other.

**Answer: E — LATENT-BY-NONDEPLOYMENT.** The contradiction exists *exclusively inside repository migration land*:

| Layer | Fact | Evidence |
|---|---|---|
| Repository DDL | `svc_service_requests.work_order_id REFERENCES commercial_work_orders(id) ON DELETE RESTRICT` | `20260826_004:19` |
| Repository writer | Forwarding WO route inserts legacy `work_orders` row, then passes **that id** into ServiceRequest creation | `app/api/forwarding/wo/route.ts:54–69` → `:128` |
| Live DB | Neither `svc_service_requests` nor `commercial_work_orders` exists | §4.2 — FK is not enforced anywhere because neither table is deployed |
| Net effect | The violating write has **never executed against any database where the constraint exists** | Row counts: both tables 0/not-found |

So today it is neither a runtime bug nor dead code — it is a **loaded trap**: the moment migrations 002+004 are applied to a live system whose forwarding route still runs, every forwarding dispatch will begin failing with FK violations.

### 5.2 Smallest safe correction (designed, NOT implemented)

Chosen under D-1 (canonical root immutable):

1. During foundation deployment stage, apply a **bridge backfill**: when legacy forwarding WOs are mirrored into canonical engagements, `service_requests.work_order_id` receives the canonical id.
2. Short-term guard (code-only, no schema change): the forwarding writer resolves-or-creates the canonical engagement before issuing a ServiceRequest — implemented in Phase 4B-1, not now.
3. Explicitly rejected: repointing the FK to legacy `work_orders` (violates locked D-1); relaxing the FK (weakens integrity).

### 5.3 Bonus finding — identity layer also divergent

Every v1 API helper resolves tenant via `profiles.tenant_id` (`lib/domain/customs/api-helper.ts:30–34`; shipment equivalent). Live `profiles` has **`role` but NO `tenant_id` column** (verified via information_schema). Live tenancy lives in `tenants` + `tenant_users` + `driver_tenant_links`. Therefore **even the session-based branch of the existing auth helpers cannot resolve a tenant on production today** — reinforcing that the canonical API generation has never truly run against production, and that D-2 hardening must be built against the REAL live identity model (`profiles.id → tenant_users.tenant_id` or equivalent), not the assumed one.

---

## 6. D-3 DEPENDENCY ANALYSIS — `commercial_service_scopes` (completed, no action taken)

- Repo usage: zero `.ts/.tsx` readers/writers (re-confirmed).
- Schema dependents by FK: `commercial_work_orders.service_scope_id NOT NULL` (`002:35`); `shp_shipments.service_scope_id` (`003`).
- Browser fabrication: `app/(dashboard)/sbu/forwarding/shipments/create/page.tsx:34–35` fabricates BOTH `work_order_id` AND `service_scope_id` via `crypto.randomUUID()` — moot in production today (target tables don't exist; POST `/api/v1/forwarding/shipments` would fail on insert), but the anti-pattern is confirmed and its elimination design is recorded for 4B-1: make both fields resolved server-side from authenticated context + real engagement lookup, never client-generated.
- Disposition: **no destructive change made** (per D-3). Table remains as-is wherever deployed.

---

## 7. CAPABILITY REGISTRY & HARDCODING CLASSIFICATION (MANDATE §14 — audit complete, code frozen)

All eight vocabulary locations verified and classified:

| # | Location | Class | Rationale |
|---|----------|-------|-----------|
| 1 | `lib/domain/commercial/types.ts:12` (TS union) | **C** | Becomes registry-backed in 4B-1; harmless while frozen |
| 2 | `lib/domain/commercial/capability-binding-service.ts:37` (`validTypes`) | **A (next phase)** | Canonical commercial layer — first to be registry-driven |
| 3 | SQL CHECK on `commercial_capability_bindings` (`013:18`) | **B** | Not live; will be seeded-registry + relaxed CHECK at deployment time |
| 4 | `service-contracts/types.ts:18–22` (`ServiceTargetDomain`) | **D** | Touches SBU adapter contracts; protected adjacency |
| 5 | `004:16` comment enumeration | **C** | Comment only |
| 6 | `ServiceRequirements.tsx:9–45` UI list | **C** | Legacy forwarding UI |
| 7 | `CreateWOForm.tsx:419–422,973–976,1096–1121` | **C** | Legacy HQ UI |
| 8 | Legacy DB checks using `CLEARANCE` (`109:7`, `111:10`) | **B** | Live legacy tables — vocabulary normalization deferred to avoid touching live systems |

Registry table design (ready for 4B-1, aligned with mandate §13 fields: `id, capability_code, name, description, status, is_system, created_at, updated_at`) was drafted but **no migration written** — it would reference the tenancy model that must be reconciled first.

---

## 8. WHAT WAS ACTUALLY CHANGED IN THIS PHASE

| Artifact | Count | Detail |
|---|---|---|
| Production code files changed | **0** | — |
| Migrations created/applied | **0** | — |
| APIs added/changed | **0** | — |
| Security changes shipped | **0** | Hardened-helper design recorded (§10) |
| Tests added | **0** | Baseline suite untouched; final gate = original 543/543 |
| Documentation produced | 2 | This report + ADR status note (§11) |
| Temporary scripts | Created → **all deleted** | `tmp_4b0_audit.js`, `tmp_4b0_verify*.js` removed; git clean of scratch |

This is the correct outcome under §27: the stop condition fired during pre-implementation audit, before any code existed to break the baseline.

---

## 9. REMEDIATION PATH — HOW TO RE-OPEN PHASE 4B-0

Proposed **Stage R (Foundation Deployment)** as explicit prerequisite, requiring owner authorization because it touches the production database:

1. **R-1 Tenancy reconciliation design.** Decide `md_tenants` strategy: (a) create `md_tenants` as canonical + migrate/backfill from live `tenants` (recommended; keeps canonical migrations intact), or (b) rewrite canonical migrations to target `tenants`. Additive `tenant_id` resolution path onto `profiles` (or adopt `tenant_users` join in helpers).
2. **R-2 Apply canonical foundation** 001→007 (enums/extensions, commercial, shipments, service requests, customs schema, outbox, compat views) in a maintenance window; verify RLS helper compatibility (present ✓).
3. **R-3 Apply capability bindings (013)** + seed four capabilities; deploy 4B-0's registry migration (014, already designed).
4. **R-4 Execute Phase 4B-0 implementation proper:** hardened commercial api-helper bound to the REAL identity chain (D-2), engagement creation API (`POST/GET /api/v1/commercial/work-orders`), registry-driven validation in `capability-binding-service`, elimination of fabricated `work_order_id`/`service_scope_id` from the canonical shipment creator, and the full test battery from mandate §22–§23.
5. **R-5 Guard the FK trap:** ship the forwarding-writer resolve-or-create engagement fix simultaneously with R-2/R-3 go-live so `svc_service_requests` never meets live traffic without valid canonical parents.

Estimated effort: R-1..R-3 ≈ 1 focused session with DB backups taken; R-4 ≈ the originally scoped 4B-0 build.

---

## 10. SECURITY POSTURE NOTE (for D-2, carried forward)

Design locked for the hardened helper (to be implemented in R-4):
- Session-only identity: Supabase SSR cookie → `auth.getUser()` → profile/tenant resolution via the **real** live identity tables.
- Reject `x-tenant-id`, `x-user-id`, `?tenant_id=`, and `body.tenant_id` as authorization authorities on all canonical commercial routes (401 if no session).
- Authorization hooks: map `profiles.role` / `tenant_users.role_code` to `commercial:read` / `commercial:manage`; SBU-scoped roles denied sell-price/margin visibility.
- Existing legacy helpers remain untouched for legacy route compatibility (isolation by file, clearly labeled).

---

## 11. ADR STATUS

| ADR | Status |
|-----|--------|
| ADR-018 (Commercial Root = `commercial_work_orders`) | **RATIFIED as architecture** (this phase's authorization) — deployment pending Stage R |
| ADR-022 (Canonical Service Catalog) | PROPOSED — untouched (correctly: catalog not in 4B-0 scope) |
| ADR-023 (Service vs Capability separation) | PROPOSED — principle reaffirmed, no artifact to ratify |
| ADR-029 (Registry-driven capabilities) | PROPOSED — design drafted (§7), ratification deferred to implementation |
| ADR-024…ADR-028 | NOT CREATED (per mandate §25 — no speculative ADRs) |

New implicit decision documented here and requiring formal capture in Stage R: **"Tenancy Reconciliation"** (`md_tenants` vs live `tenants`) — this is the single most important undecided architecture question uncovered by 4B-0 and should become an ADR at R-1.

---

## 12. ROLLBACK CONSIDERATIONS

Trivially safe: **nothing was changed**. No rollback required. Database untouched (read-only inspection only). Scratch scripts deleted. Working tree contains only documentation.

---

## 13. UNRESOLVED / DEFERRED ISSUES REGISTER

| ID | Issue | Severity | Owner phase |
|----|-------|----------|-------------|
| U-1 | Canonical foundation never deployed to live DB | **CRITICAL** | Stage R |
| U-2 | `md_tenants` vs live `tenants` reconciliation undecided | **CRITICAL** | Stage R-1 |
| U-3 | `profiles.tenant_id` absent live; v1 auth helpers assume it | HIGH | Stage R-1 / R-4 |
| U-4 | `svc_service_requests` FK trap (repo-land contradiction) | HIGH | R-4/R-5 |
| U-5 | Fabricated `work_order_id`/`service_scope_id` in shipment creator | MEDIUM | R-4 |
| U-6 | Trucking adapter omits NOT NULL `wo_item_id` (documented in 4B discovery; protected — remediation item only) | HIGH | Future (protected-system remediation ticket, NO schema weakening) |
| U-7 | Warehouse adapter stub persists nothing | MEDIUM | Future |
| U-8 | `CLEARANCE` vs `CUSTOMS` vocabulary drift in live legacy tables | LOW | Later normalization phase |

---

## 14. FINAL GATE — PHASE 4B-0 ACCEPTANCE CHECKLIST

| Criterion | Status |
|---|---|
| `commercial_work_orders` established as canonical runtime root | ❌ **BLOCKED — table absent from live DB (U-1)** |
| No dual-root authority introduced | ✅ (nothing introduced) |
| Legacy `work_orders` operational | ✅ untouched, live and green |
| FK contradiction resolved or isolated with proven path | ⚠️ Investigated & answered (§5); correction designed, gated on Stage R |
| No fabricated `service_scope_id` introduced | ✅ none introduced; elimination designed |
| D-2 hardening complete for new canonical APIs | ❌ deferred (design complete; no APIs shipped) |
| Capability registry foundation exists | ❌ deferred (schema design ready, gated on tenancy decision U-2) |
| CUSTOMS/FORWARDING/TRUCKING/WAREHOUSE backward compatible | ✅ |
| Customs sovereignty intact | ✅ untouched |
| Trucking/Driver/GPS untouched | ✅ |
| No browser-direct DB access introduced | ✅ |
| Tenant isolation tests pass | ✅ N/A (no new surface) — baseline green |
| Security tests pass | ✅ baseline green |
| Full regression green | ✅ **543/543** |
| `tsc --noEmit` = 0 errors | ✅ |
| Implementation report exists | ✅ this document |
| No premature Catalog/Pricing/Package work | ✅ |

---

## 15. FINAL RESPONSE FORMAT

```text
PHASE 4B-0 RESULT

Status:
RED — stopped at Stop Condition #8 (live database differs materially from
repository migrations: the entire canonical Phase 1–4A schema family,
including commercial_work_orders itself, was never applied to production).

Baseline:
543 / 543 PASS

Final:
543 / 543 PASS

TypeScript:
PASS (0 errors)

Migrations:
NONE created, NONE applied (blocked by U-1/U-2)

Production files changed:
NONE

APIs added/changed:
NONE

Security changes:
NONE shipped. D-2 hardened-helper design completed and recorded (session-only
identity; header/query/body tenant rejection; role mapping) — ready to
implement in Stage R-4 against the REAL live identity model
(profiles has NO tenant_id live; tenancy lives in tenants/tenant_users).

Capability registry:
DEFERRED (foundation design complete: table shape per mandate §13 seeded
with CUSTOMS/FORWARDING/TRUCKING/WAREHOUSE; classification of all 8
hard-coded sites done: A×1, B×2, C×4, D×1)

Commercial root:
CONFIRMED = commercial_work_orders (architecturally; deployment pending)

Legacy compatibility:
UNTOUCHED — work_orders/wo_items/job_orders fully operational (100 live WO rows)

Protected systems:
UNCHANGED

Customs sovereignty:
PASS (untouched; note: canonical cus_* stack also not deployed live —
production customs operations run on legacy surfaces)

Remaining blockers:
U-1 Deploy canonical foundation 001–013 to live DB (requires authorization +
maintenance window + backup)
U-2 Decide md_tenants vs tenants reconciliation strategy (new ADR required)
U-3 Identity-layer divergence (profiles.tenant_id absent)
U-4 svc_service_requests FK trap — correction designed (§5.2), ships with R-4/R-5
U-5 Fabricated IDs in canonical shipment creator — fix designed, ships with R-4

Next recommended phase:
STAGE R (Foundation Deployment) — prerequisite gate — THEN re-run
PHASE 4B-0 implementation proper (R-4). Do NOT proceed to Phase 4B-1.
```

**Stopped per mandate §27. Awaiting explicit authorization for Stage R (production database work) before any further implementation.**

---

*Verification artifacts: read-only `information_schema` / `pg_constraint` queries over `DATABASE_URL` + cross-check via the application's own PostgREST endpoint; all temporary scripts deleted; git working tree contains only documentation.*
