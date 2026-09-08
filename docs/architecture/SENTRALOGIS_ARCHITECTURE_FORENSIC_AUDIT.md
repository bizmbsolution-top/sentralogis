# SENTRALOGIS — ARCHITECTURE FORENSIC AUDIT

## Full-Stack Enterprise Architecture Review · Post Stage-R Foundation Closure

**Date:** 2026-08-25 · **Mode:** READ-ONLY forensic review + classification
**Evidence base:** Phase 4B discovery, 4B-0 boundary audit, Stage R deployment verification, three parallel repository sweeps (107 writer sites, ~70 API routes classified, lifecycle reconstruction), read-only live-database probes.

---

## 1. EXECUTIVE SUMMARY

Sentralogis today operates **two parallel architectural generations** inside one codebase:

| Generation | Tables | Traffic | State |
|---|---|---|---|
| **Legacy operational** | `work_orders → wo_items → job_orders → fw_* / wh_*` | 100% of real business traffic (100 WO / 96 items / 248 JO) | Protected, functional, conflated commercial+execution |
| **Canonical enterprise** | `md_tenants → commercial_work_orders → line_items → capability_bindings → svc_service_requests → shp_* / cus_* → event_outbox → fin_ledger` | **0 rows, 0 runtime writers** — deployed Stage R GREEN | Structurally superior, unreachable at runtime |

The strategic finding is unchanged across every audit pass: **the canonical model is sound; the application layer has no bridge to it.** Commercial intent and operational execution remain conflated in the legacy chain; five pricing systems coexist; capability vocabulary is enumerated in eight places; several service-role APIs trust caller-supplied tenant identity.

**Verdict:** the platform does NOT need redesign. It needs its designed foundation connected through a disciplined Anti-Corruption Boundary, in strangler order, while the legacy engine keeps running.

**FINAL RECOMMENDATION: 2 — HARDEN FOUNDATION FIRST** (application-boundary hardening before further feature expansion). Detailed rationale §22–23.

---

## 2. CURRENT ARCHITECTURE (verified)

```text
┌─ PRESENTATION ─────────────────────────────────────────────────────┐
│ HQ/SBU dashboards: browser-direct supabase.from() (RLS-dependent)  │
│ Customs workbench + Forwarding workspace: internal /api/v1 calls ✅ │
│ Driver PWA/native: /api/jo/* + /api/driver/* (JWT/token-scoped)     │
│ Customer tracking: /api/track/* token APIs + browser-direct pages   │
├─ API ───────────────────────────────────────────────────────────────┤
│ LEGACY: /api/jo/* /api/driver/* /api/forwarding/* /api/wo           │
│         /api/trucking/* /api/easygo/* /api/cron/* /api/track/*      │
│ CANONICAL(v1): /api/v1/customs(≈30) /api/v1/forwarding(≈12)         │
│                /api/v1/commercial(1!) /api/v1/service-requests(5)    │
├─ DOMAIN ────────────────────────────────────────────────────────────┤
│ lib/domain/customs (sovereign engines) ✅                           │
│ lib/domain/shipment (canonical aggregate) ✅                        │
│ lib/domain/commercial (binding registry only)                       │
│ lib/domain/service-contracts (command bus + adapters) ⚠             │
│ lib/domain/forwarding (legacy pricing, drifted) ⚠                   │
│ src/application + src/infrastructure (trucking DDD partial)         │
├─ DATA (production, verified) ───────────────────────────────────────┤
│ LIVE: tenants/work_orders/wo_items/job_orders/fw_*/wh_*/finance_*   │
│ CANONICAL: md_tenants + R-P1 + 001→013 — all present, 0 rows        │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. STRENGTHS

1. **Customs sovereignty is real** — zero imports into customs domain; 18-step lifecycle, hash-chain audit, CEISA serializers; standalone proven by tests.
2. **Canonical shipment model is genuinely multimodal-ready**: polymorphic `shp_units` (containers/bulk/packages/vehicles), directed-graph `shp_execution_legs`, milestones, exceptions, command-center projection — BYD-style China→Subang chains are representable without hacks.
3. **Command-bus pattern exists and works**: `svc_service_requests` with idempotency keys, typed payloads per SBU, compensation on failure — the right seam for orchestration.
4. **Event infrastructure pre-deployed**: `event_outbox` + consumption log + dead-letter + 3-tier financial ledger — awaiting producers.
5. **Tenancy projection pattern (ADR-030)** gives one UUID valid across both worlds with trigger-enforced consistency.
6. **Driver execution chain is hardened by field use** (offline queue, geofence autostart/departure/complete, bulk GPS ingest) and is properly token/JWT-scoped server-side.
7. **Test discipline**: 543-test regression umbrella + per-phase acceptance suites + performance benchmarks culture.

## 4. ARCHITECTURAL RISKS (ranked)

| Rank | Risk | Evidence |
|---|---|---|
| R1 | No runtime path creates `commercial_work_orders`; mandatory `service_scope_id` references unseeded table | 4B-0 F-04 |
| R2 | Service-role APIs trusting body/header tenant (`/api/wo`, `/api/forwarding/*`, `/api/v1/service-requests`, ground/event, jo/health, offline-sync) | §16 |
| R3 | Trucking ServiceRequest adapter omits `wo_item_id` (NOT NULL) → adapter-created JOs have no commercial lineage | trucking-adapter.ts:73-86 |
| R4 | Browser-direct multi-table non-atomic writes (`CreateWOForm` inserts WO+items+JOs client-side) | CreateWOForm.tsx:383-699 |
| R5 | Capability vocabulary hard-coded ×8 incl. DB CHECK + CLEARANCE/CUSTOMS drift | 4B discovery §17 |
| R6 | Billing derived from operational flags (`is_doc_finished`) client-side; revenue truth triplicated | invoice-customer page |
| R7 | `exec_sql_manual` owner RPC = string-interpolated raw SQL injection surface | owner/actions.ts:133 |
| R8 | Fabricated FK values (`crypto.randomUUID()` for `work_order_id`/`service_scope_id`) in canonical shipment creator | shipments/create page:34-35 |

## 5. CRITICAL FINDINGS

- **C-1 Canonical root unreachable** (R1): until a creation path exists, every downstream canonical concept is theoretical.
- **C-2 Adapter lineage violation** (R3): dispatching a trucking ServiceRequest against the live schema would either violate the NOT NULL or silently create lineage-less jobs — blocks SR-driven dispatch entirely.
- **C-3 Identity resolution split-brain**: v1 api-helpers assume `profiles.tenant_id` (nonexistent); production resolver is `get_my_tenant_id()`. Canonical APIs must standardize on the latter.

## 6–8. MEDIUM & LOW FINDINGS (summary)

Medium: `CLEARANCE`≠`CUSTOMS` vocabulary drift; binding lifecycle states unreachable via API; warehouse adapter stub persists nothing; `EXCHANGE` target-domain dead slot; forwarding dual-generation without deprecation bridge; browser-direct reads on legacy tables depend on uneven RLS; `invoices`/`extra_costs`/`md_services` open RLS; transient network-dependent test scenarios.
Low: orphan `armada` table; malformed tenant_code format; ADR numbering collisions across doc families; free-text UOM fields; chat read-receipts written through wo_items JSONB (TopNavbar).

## 9. DOMAIN BOUNDARY ANALYSIS

| Domain | Intended ownership | Current state | Leakage verdict |
|---|---|---|---|
| Operations (execution) | SBU domains | job_orders shared by TRUCKING+WAREHOUSE via `sbu_type` string; customs/shp sovereign ✅ | PARTIAL — trucking/warehouse share one table (acceptable legacy), canonical path separates |
| Exchange (commercial) | commercial layer | Legacy wo_items carry prices; canonical line_items unwritten | LEAKED into operations |
| Capital (finance) | Finance | Revenue triplicated (wo_items.total_revenue / invoices.total_billing / dead fin ledger); billing gated on ops flags | VIOLATED (ops flags drive billing) |
| Customer Success | tracking/projections | Token-based public tracking exists; cost exposure guarded in those routes ✅; `/track/fwd` browser-direct anon queries rely on permissive RLS ⚠ | PARTIAL |
| Intelligence | projections/outbox | outbox dead; monitoring crons write own snapshot tables | NOT STARTED (infrastructure ready) |
| AI Copilot | copilot routes exist over chat context | Reads md_drivers context; no canonical grounding yet | NOT STARTED |

## 10. SBU ANALYSIS

Capability vocabulary enumerated at 8 sites (TS unions ×2, SQL CHECK, validTypes array, migration comment, UI switches ×2, legacy CHECKs with `CLEARANCE`). SBU workflows themselves are independent (customs engines, trucking JO chain, WH RPC flows, forwarding consolidation) ✅. The missing piece is a registry so *new* capabilities don't require touching 8 sites + a migration. Pricing/cost/documents/milestones/SLA per SBU already live inside each SBU's private structures ✅ — the shared-table problem is limited to legacy `job_orders`.

## 11. FORWARDING ANALYSIS

**Can BYD CKD China→Subang be modeled? YES on the canonical track.**
`shp_shipments` → `shp_execution_plans` → N ordered `shp_execution_legs` (transport_mode: OCEAN_VESSEL/ROAD_TRUCK/…) → `shp_leg_units` binding polymorphic cargo units; milestones/exceptions per leg; `svc_service_requests` dispatches CUSTOMS/TRUCKING/WAREHOUSE legs to SBUs; `cus_declarations` attach back via nullable refs. Ocean freight = an ocean leg with provider booking; clearance legs delegate to sovereign customs.
Gaps: leg-dispatch currently fabricates customs office `'040300'` + CIF fallback; creator fabricates WO/scope ids; legacy `fw_*` consolidation engine runs parallel with sell/COGS snapshots embedded — strangler target, not a blocker.

## 12. CLEARANCE ANALYSIS

Sovereign ✅. Clearance participates in forwarding via ServiceRequest (target_domain=CUSTOMS) and attaches results via nullable refs — never the reverse. Documents/valuation/lartas/exceptions/audit are first-class customs objects. No fake forwarding fields storing customs data found. Verdict: correctly modeled.

## 13. MULTIMODAL ANALYSIS

Directed-graph legs with transport modes + polymorphic units satisfy dynamic composition (no fixed leg count). Warehouse-as-leg is representable via ServiceRequest rather than a leg type — acceptable. Blockers are operational (F-04/F-05), not structural.

## 14. WO/JO ANALYSIS

- 1 WO item → many JOs: supported (`max_jo_count`, per-unit skeleton generation).
- JO lifecycle independence: partially violated — `assignmentSave` flips parent WO when all items assigned; driver completion mirrors onto wo_items; invoice flow flips JOs/items. These cascades conflate lifecycles (semantic collision catalogue in Gate report §19).
- JO belongs to SBU: yes via `sbu_type`.
- Provider/resource assignment: inline columns (transporter/vendor/fleet/driver/prices/tokens) — legacy-acceptable.

## 15. EVENT ARCHITECTURE ANALYSIS

Outbox table family deployed with correct shape (aggregate id, type, payload, correlation/causation) but **zero producers**. Operational transitions (geofence arrival, POD, completion) are currently direct CRUD side-effects. Event-driven evolution path: emit canonical events from domain services at transition points (no broker needed at current scale — outbox polling suffices). Pragmatic verdict: infrastructure ready; semantic ownership undefined → define event catalogue per domain before wiring producers.

## 16. FINANCE ARCHITECTURE ANALYSIS

3-tier ledger (REVENUE/COGS/PASS_THROUGH) deployed but unwritten. Today: revenue snapshots on wo_items; costs on job_orders/extra_costs/vendor_invoices; margin computed ad-hoc per dashboard. Clean consequence path exists (JO completed → ledger entry keyed by future activation) but requires the commercial middle first. External accounting integration (e.g., Jurnal/Mekari) should consume the ledger/outbox, never operation tables — architecture permits this once producers exist.

## 17. TENANT ISOLATION ANALYSIS

Canonical tables: strict RLS + manual filters ✅. Legacy: RLS present but browser writers depend wholly on it; service-role routes bypass with body/header/query tenant trust (list in Gate §16); financial/master tables effectively open. Production resolver `get_my_tenant_id()` is the single point to standardize.

## 18. API ANALYSIS

~70 routes inventoried and classified (LEGACY/CANONICAL/BRIDGE/UNKNOWN) in the Boundary Audit. Structural issues: inconsistent auth patterns (three regimes), response-shape variance, oversized route handlers (`/api/jo/[token]` ≈1600 lines mixing GPS ingest + lifecycle + payments), missing canonical list/create commercial routes.

## 19. TYPESCRIPT ANALYSIS

Canonical types clean per domain (`lib/domain/*/types.ts`). Debt: duplicated row types vs generated types; `any` in older UI payloads; UI models reading DB rows directly; `sbu_type` string literals instead of registry types; optional-field abuse in legacy DTOs. Minimum separation needed: Domain Model → API DTO → Workspace ViewModel (only where UI consumes canonical data).

## 20. UI/UX ARCHITECTURE ANALYSIS

Human-First/Workspace principles genuinely implemented in newest surfaces (customs workbench, forwarding command center, driver portal, attention-driven radars). Older CRUD-heavy screens persist in HQ/SBU lists (acceptable during transition). No UI owns cross-domain business logic beyond the flagged CreateWOForm client orchestration (R4).

## 21. DATA ARCHITECTURE ANALYSIS

Master (`md_*`)/transactional/event(`outbox`)/analytical(snapshots) separation exists structurally; violations are usage-level (analytical aggregates computed ad-hoc in dashboards; snapshots tables written by monitor crons — acceptable pragmatism).

## 22. RECOMMENDED TARGET ARCHITECTURE

Modular monolith, four layers, ACL at the domain seam:

```
UI / Workspaces
   ↓ Application API (/api/v1 + legacy /api retained)
Application Services (use cases, authorization, tenant context)
   ↓ Domain Services (commercial | shipment | customs | trucking | warehouse | finance)
Anti-Corruption Adapters (legacy WO/JO ⇄ canonical concepts) ← THE NEW PIECE
   ↓
Canonical Foundation (Postgres/Supabase, RLS, outbox)
```

No microservices/brokers/K8s unless scale demands (it does not today).

## 23. MIGRATION STRATEGY & IMPLEMENTATION PRIORITIES

Strangler sequence (detail in Implementation Plan):
**P0** bridge core (engagement resolve-or-create, hardened resolver, adapter lineage fix, fabricated-ID elimination) → **P1** registry + binding lifecycle + role gates → **P2** activations/events/ledger producers + pricing consolidation → **P3** cleanup (vocabulary, armada, exec_sql_manual, compat views retirement).

---

# ARCHITECTURE READINESS SCORECARD

| Area | Score | Basis |
|---|---|---|
| Domain Architecture | 🟡 NEEDS HARDENING | boundaries defined; exchange/finance leaked into ops |
| Multi-SBU | 🟡 NEEDS HARDENING | workflows independent ✅; vocabulary hard-coded ×8 |
| Forwarding | 🟢 READY (model) / 🟡 (runtime seams) | shp model complete; dispatch fabrication bugs |
| Clearance | 🟢 READY | sovereign, tested, integrated |
| Multimodal | 🟢 READY | dynamic graph legs + polymorphic units |
| WO/JO | 🟡 NEEDS HARDENING | cascade conflation; no canonical lineage |
| Event Architecture | 🟡 NEEDS HARDENING | outbox ready, zero producers |
| Finance | 🔴 ARCHITECTURAL RISK | revenue truth triplicated; ops-gated billing; ledger dead |
| Tenant Isolation | 🟡 NEEDS HARDENING | canonical ✅; legacy/service-role debt |
| API | 🟡 NEEDS HARDENING | 3 auth regimes; giant handlers; missing canonical entry points |
| Data | 🟢 READY | master/txn/event/analytical separated structurally |
| UI/UX | 🟢 READY | workspace principles implemented in new surfaces |
| Customer Visibility | 🟢 READY | token projections; Layer-2 sanitization principle established |
| Intelligence | 🟡 NEEDS HARDENING | projections planned, outbox idle |
| AI Readiness | 🟡 NEEDS HARDENING | copilot shell exists; needs canonical event grounding |

# FINAL RECOMMENDATION

# 2 — HARDEN FOUNDATION FIRST

The database foundation is deployed and correct; the application boundary is not yet built to consume it safely, and several legacy-era security/conflation debts would contaminate any feature expansion made now. Harden the application boundary (P0 set: engagement bridge, resolver hardening, adapter lineage, fabricated-ID elimination), then continue implementation per `SENTRALOGIS_ARCHITECTURE_IMPLEMENTATION_PLAN.md`.

Companion documents: `SENTRALOGIS_PHASE4B0_ARCHITECTURE_GATE.md` · `SENTRALOGIS_PHASE4B0_APPLICATION_MAPPING.md` · `SENTRALOGIS_PHASE4B0_IMPLEMENTATION_BACKLOG.md` · `SENTRALOGIS_ARCHITECTURE_IMPLEMENTATION_PLAN.md` · ADR-031/032/033.
