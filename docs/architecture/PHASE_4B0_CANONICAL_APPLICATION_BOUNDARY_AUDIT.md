# PHASE 4B-0 — CANONICAL FOUNDATION → APPLICATION BOUNDARY FORENSIC AUDIT

**Date:** 2026-08-25 · **Mode:** READ-ONLY forensic discovery · Zero production writes, zero code changes
**Method:** 3 parallel forensic sweeps (writers / readers+APIs / lifecycle+semantics) + live-database object verification (read-only) + repository-wide greps with line-level evidence

---

## 1. EXECUTIVE SUMMARY

The application maps onto the newly deployed canonical foundation through **two fully parallel, currently disconnected tracks**:

1. **LIVE TRACK (100% of real traffic):** legacy chain `work_orders → wo_items → job_orders → SBU execution`, written by ~107 distinct writer call-sites across 40+ files, dominated by browser-direct Supabase calls from dashboards and one giant client component (`CreateWOForm.tsx`) that creates WO + items + JOs in a single browser session.
2. **CANONICAL TRACK (deployed, EMPTY, zero writers):** `commercial_work_orders → commercial_line_items → commercial_capability_bindings → svc_service_requests → shp_* / cus_*`. All 34 objects exist in production with **0 rows**, guarded by correct RLS, and served by ~55 `/api/v1` routes whose only UI consumers are the customs workbench and forwarding shipment workspace.

**Headline findings:**

| # | Finding | Consequence |
|---|---------|-------------|
| F-01 | `jo_trucking_details` does NOT exist — not in repo, not in production (verified live). Trucking semantics are inline columns on `job_orders`. The premise table is phantom | Mapping matrix records it as ABSENT |
| F-02 | `ServiceRequest ≠ JobOrder`. Architecturally an independent cross-domain command message; at runtime the trucking adapter behaves as a synchronous 1:1 creator-wrapper that INSERTS into `job_orders` and stores the result in loose pointer `assigned_domain_job_id` (no FK) | §11 |
| F-03 | The trucking adapter's `job_orders` insert omits required `wo_item_id` (NOT NULL since migration 032) and therefore has **no commercial lineage** — confirmed adapter defect, previously flagged, still unfixed | Blocks any ServiceRequest-driven trucking dispatch |
| F-04 | Canonical commercial root is unreachable at runtime: no route creates `commercial_work_orders`; its mandatory `service_scope_id` FK references an unseeded table | P0 blocker for 4B-0 implementation |
| F-05 | 55 writer sites rely on browser-direct RLS-only access; several service-role APIs trust body/header tenant (`/api/wo`, `/api/forwarding/*`, `/api/v1/service-requests`, ground/event, jo/health) | Security boundary debt catalogued |
| F-06 | `armada` is an orphaned out-of-band table (0 rows, zero code references); real fleet master is `md_fleets` (114 rows) | Cleanup candidate |

---

## 2. CURRENT PRODUCTION FOUNDATION (verified live, read-only)

```text
tenants=15 (identity hash cbfd498c…)   md_tenants=15 parity=0 orphans=0
work_orders=100  wo_items=96  job_orders=248          ← LIVE LEGACY (protected)
commercial_work_orders=0   commercial_line_items=0    ← CANONICAL (empty)
commercial_capability_bindings=0                       ← CANONICAL (empty)
svc_service_requests=0  cus_declarations=0  shp_shipments=0   ← CANONICAL (empty)
jo_trucking_details = ABSENT      armada = EXISTS, 0 rows, orphaned
md_fleets=114  job_routes=632  tracking_updates=5313  ← live operational telemetry
```

## 3. LEGACY OBJECT INVENTORY

| Object | Rows | Role | Key structure facts |
|---|---|---|---|
| `tenants` | 15 | Tenant lifecycle authority | `tenant_code` UNIQUE global; owner link `user_id→auth.users`; subscription/token fields |
| `work_orders` | 100 | De-facto commercial root + ops container | `tenant_id NOT NULL` (**no FK to tenants** — observation); SLA timestamps; status free-text |
| `wo_items` | 96 | Purchase lines + JO slots | `wo_id CASCADE`; `unit_price/total_revenue`; `max_jo_count` controls JO count; `sbu_type`; item_data JSONB |
| `job_orders` | 248 | Universal SBU execution object (trucking+warehouse+…) | `wo_item_id NOT NULL CASCADE`; assignment columns inline (driver/fleet/prices/tokens); `is_doc_finished/is_cost_finished`; GPS columns; `sbu_type` |
| `job_routes` | 632 | JO stop-level routing | geofence columns |
| `tracking_updates` | 5,313 | GPS telemetry | bulk-ingested by `/api/jo/[token]` |
| `fw_consolidations/items/…` | live | Forwarding consolidation engine | COGS/sell snapshots embedded |
| `armada` | **0** | ORPHANED out-of-band table; zero code references | cleanup candidate |

## 4. CANONICAL OBJECT INVENTORY

All deployed via R-P1 + 001→013 (+R-B erratum), all **0 rows**, RLS-enabled:

`md_tenants`(15 mirror rows) · `commercial_service_scopes`(unseeded!) · `commercial_work_orders` · `commercial_line_items` · `commercial_capability_bindings` · `svc_service_requests` · `shp_shipments`(+units/plans/legs/milestones/exceptions) · `cus_declarations`(+classification/documents/validation/exceptions/CEISA/audit/decisions/SKU intelligence) · `event_outbox` family · `fin_financial_ledger_entries`.

## 5. LEGACY ↔ CANONICAL MAPPING MATRIX

| Legacy | Canonical counterpart | Semantic relationship (evidence-based) | Readers | Writers | FK link | Lifecycle owner | Migration strategy | Conf. | Open question |
|---|---|---|---|---|---|---|---|---|---|
| `tenants` | `md_tenants` | **Identity projection** (ADR-030): tenants authoritative; trigger-synced mirror | get_my_tenant_id()-based RLS everywhere | 5 writer sites on tenants; md_tenants written ONLY by triggers | Shared PK | tenants (sole) | None — projection permanent | HIGH | Should app-level md_tenants grants be revoked? |
| `work_orders` | `commercial_work_orders` | **Conflation split**: legacy WO mixes commitment(price/customer)+execution(container). Canonical splits commitment (WO) from orchestration | HQ workbench (browser-direct) | CreateWOForm(browser), /api/wo, forwarding API, RPCs ×2 families | NONE between tables | Legacy: implicit; Canonical: ADR-018 | Strangler bridge column/backfill (Phase 4B-1 decision) | HIGH | Bridge direction & backfill predicate for 100 historical rows |
| `wo_items` | `commercial_line_items` | Purchase lines ≈ sell lines; wo_items additionally carry execution slot config (`max_jo_count`, sbu_type) which canonical has NO equivalent for | HQ/invoice pages | CreateWOForm, /api/wo, forwarding, completed-page flips | none | Legacy | Split: revenue lines → line_items; slot config stays legacy | MED | Where do max_jo_count/unit semantics live canonically? |
| `job_orders` | *(no single counterpart)* | Execution object per SBU. Canonical equivalents differ per domain: trucking JO ↔ future trk_job_orders?; customs ↔ `cus_declarations`; warehouse ↔ wh_* | Driver feed, SBU boards, dashboards | 55 sites (see §6) | none | SBU sovereign | Adapters via svc_service_requests (pattern exists) | MED | Does canonical layer need a unified execution registry? |
| `jo_trucking_details` | — | **ABSENT** (repo + live verified) | none | none | none | n/a | Drop from planning vocabulary | HIGH | Remove from owner docs to prevent ghost requirements |
| `svc_service_requests` | itself | Cross-domain command bus (see §11) | forwarding command-center | dispatcher/adapters | `assigned_domain_job_id` loose pointer | Commercial/orchestration | Keep as-is; harden adapters | HIGH | Who may issue requests post-hardening? |
| `crm_sbu_customer_rates`,`fw_price_master`,`md_billing_rates`,`crm_quotation_items` | *(none yet — future service_pricing)* | Sell-side pricing fragmented across 5 structures | sales portal, forwarding price page | CRM flows | none | CRM/commercial | Future Phase 4B pricing consolidation | LOW | Which becomes source of truth? |
| `invoices/invoice_lines` | `fin_financial_ledger_entries` (dead) | Billing truth today derived from JO flags client-side | invoice-customer page | invoice page browser insert | `invoices.wo_id → work_orders` | Finance (de-facto ops-gated) | Rewire to activations later | LOW | When does finance rewire? |
| `cus_declarations` | itself | Customs execution object (sovereign) | customs workbench via v1 API | customs adapter, v1 routes | `work_order_id→commercial_WO` nullable | SBU Customs | None needed | HIGH | — |
| `shp_shipments` | itself | Forwarding execution aggregate | forwarding workspace via v1 API | v1 routes | `work_order_id→commercial_WO` NOT NULL | SBU Forwarding | Fix fabricated scope/WO ids in creator | HIGH | Creation path must resolve real engagement |
| `wh_*` objects | themselves | Warehouse execution | WH portals | portals/RPCs | via job_orders/legacy WO | SBU Warehouse | None needed | HIGH | — |
| `documents` (assignment_documents JSONB, POD urls) | *(none)* | Evidence artifacts attached inline on JOs | SBU documents page | modals | inline | SBU | Defer | LOW | Canonical document vault? |

## 6. COMPLETE WRITER INVENTORY

Full site-level table produced by forensic sweep (condensed here; complete rows retained in sweep evidence):

### Counts per table
| Table | Code writer sites | Files | SQL-RPC writers |
|---|---|---|---|
| `tenants` | 6 | 4 | grant_tokens_to_tenant RPC + wildcard exec_sql_manual ⚠️ |
| `work_orders` | 18 | 10 | repacking RPC(157), auto-gen RPC(105) |
| `wo_items` | 28 | 16 | RPCs 157/105/106 |
| `job_orders` | 55 | 33 | RPCs 105/106/157 + vendor_job_confirmation(197) |
| `jo_trucking_details` | **0** | 0 | — (table absent) |

### Highest-signal writers (full detail examples)
| FILE | TABLE | OP | PURPOSE | AUTH/TENANT | CLASS | RISK |
|---|---|---|---|---|---|---|
| `hq/work-orders/components/CreateWOForm.tsx:383-699` | work_orders+wo_items+job_orders | ins/upd/del | Creates entire commercial+execution bundle **client-side** | browser + profile.tenant_id | LEGACY-shape | Medium: RLS-dependent, multi-table non-atomic |
| `app/api/forwarding/wo/route.ts:54-91` | work_orders+wo_items (+SR bridge) | insert | Forwarding WO creation | **service-role, body tenant_id, NO auth** | BRIDGE | HIGH (impersonation) |
| `app/api/wo/route.ts:200-330` | work_orders+wo_items+job_orders | ins/upd/del | Headless WO API incl. auto-JO generation | **service-role, body tenant_id** | LEGACY | HIGH |
| `lib/services/assignmentSave.ts:148-472` | job_orders+wo_items+work_orders | upsert/del/upd | Assignment engine (records driver/fleet/prices inline) | session server-action, payload tenant | BRIDGE | Low-Med |
| `app/api/jo/[token]/route.ts` (12+ sites) | job_orders(+job_tracking, wo_items mirror) | update | Driver lifecycle + GPS ingest + autostart/departure/complete | driver JWT/GPS token over service-role | CANONICAL-flow | Med (token-scoped) |
| `components/sbu/AssignmentModal.tsx:293` | job_orders | insert | Assign → new JO with **NO tenant_id column** | browser RLS | LEGACY | HIGH (relies on RLS WITH CHECK default) |
| `app/driver/response/page.tsx:86` | job_orders | update | Public-token accept/reject | unauthenticated page | LEGACY | HIGH |
| `owner/actions.ts:133` | *any* via `exec_sql_manual` | raw SQL | Owner ledger utility | service-role, string-interpolated | DANGEROUS | HIGH (injection surface) |
| warehouse RPCs (105/106/157) | work_orders+wo_items+job_orders | ins/upd | WH movement/transfer/repacking automation | SECURITY DEFINER RPC | CANONICAL(WH) | Low |
| `app/api/cron/jo-autostart|jo-autocomplete` | job_orders | update | Timed lifecycle advancement | cron (service-role) | CANONICAL(cron) | Low |
| `app/(dashboard)/sbu/trucking/components/*` (J19-J34 cluster: JobDetailModal, JODetailDrawer, AddCostModal, SBUFinanceHybridModal, POD modals, VerifyPODModal) | job_orders/wo_items | update | Ops/finance field edits | browser RLS | LEGACY | Med |

## 7. COMPLETE READER INVENTORY (principal consumers)

| Consumer | Reads | Pattern |
|---|---|---|
| `hq/ops-dashboard`, `hq/business`, `hq/work-orders`, `hq/job-orders` | work_orders+wo_items+job_orders+invoices+md_entities | browser-direct |
| `sbu/trucking/work-orders(/id)`, `assignments`, `completed`, `documents` | wo_items+job_orders+extra_costs+vendor_invoices | browser-direct |
| Driver portal `/driver/portal` | `/api/driver/feed` (multi-tenant JO feed) | internal API (JWT) |
| Driver JO page `/jo/[token]` | `/api/jo/[token]` GET | public-by-token |
| FleetTrackingConsole (`hq/tracking`, sbu tracking) | job_routes/tracking_updates + Realtime | browser-direct + realtime |
| Customer tracking `/track/[token]`, `/track/wo/[token]`, `/track/warehouse/[token]` | WO/items/JO/routes/tracking | server-admin / public token API |
| Cargo-owner forwarding `/track/fwd/[token]` | fw_container_items→wo_items→work_orders | **browser-direct anon (no backing API)** ⚠️ |
| Customs workbench `sbu/clearance/declarations(/id)` | cus_declarations stack | internal `/api/v1/customs/*` ✅ |
| Forwarding workspace `sbu/forwarding/shipments(/id,/create)` | shp_* via command-center projection | internal `/api/v1/forwarding/*` ✅ |
| Invoice-customer page | work_orders+wo_items+job_orders readiness flags | browser-direct (also WRITES invoices) |
| Reporting hub (`reporting/operational/*`, finance reports) | wo_items/job_orders/invoices flattened | browser-direct |

Canonical-side readers of bindings/service-requests: only domain services behind v1 routes; **no dashboard consumes them yet**.

## 8. API INVENTORY (classification summary)

| Group | Routes | Class | Auth pattern |
|---|---|---|---|
| `/api/jo/*` (5) + `/api/jo/[token]/gps-session`,`tracking` | driver JO lifecycle + GPS | **LEGACY** (token/JWT-scoped) |
| `/api/driver/*` (5) | feed/login/link-profile/push/health | LEGACY/BRIDGE (login+link-profile = identity BRIDGE) |
| `/api/forwarding/*` (9) | fw_ consolidation engine | **LEGACY** — service-role, no auth, body tenant_id |
| `/api/v1/customs/*` (~30) | declarations + subresources | **CANONICAL** (session-first helper w/ fallback debt) |
| `/api/v1/forwarding/*` (~12) | shipments aggregate | **CANONICAL** |
| `/api/v1/commercial/*` (1) | capabilities GET/POST only | **CANONICAL** (no list/create route exists) |
| `/api/v1/service-requests*` (5) | command bus API | CANONICAL-weakest (body tenant accepted) |
| `/api/trucking/*` (3+) | ops assignment actions | LEGACY (session) |
| `/api/warehouse/offline-sync` | offline replay | LEGACY (no auth) |
| `/api/easygo/*` (5), `/api/fleet-status`, GPS infra | GPS providers/fleet | LEGACY (cron-secret where noted) |
| `/api/webhooks/whatsapp`, `/api/whatsapp/*`, `/api/wa-notify`, `/api/push/send` | messaging | LEGACY |
| `/api/cron/*` (8) | autostart/autocomplete/SLA/cleanup/health/checks | CRON (mostly secret-less except sla-snapshot) |
| `/api/governance/*`, `/api/observability/*`, `/api/copilot/*`, `/api/help/*` | tooling/intelligence | UNKNOWN/tooling |
| `/api/admin/*`, `/api/portal/*`, `/api/ground/*`, `/api/md/*`, `/api/tenant/master/drivers*` | admin/master-data | LEGACY |
| `/api/track/*` | public customer tracking | LEGACY (token) |

Driver PWA/native actually call: `/api/driver/login|feed|health|register-push|link-profile`, `/api/jo/{id}` PATCH, `/api/jo/{token}/gps-session|tracking`, `/api/jo/accept`; Android native POSTs `{API_URL}/api/jo/{jobId}` directly.
WhatsApp webhooks invoke internal Copilot engine only — no cross-route triggers; "KOIN" keyword handling absent from webhook code.

## 9. CURRENT BUSINESS LIFECYCLE (reconstructed from code)

```
HQ CreateWOForm (BROWSER, one session):
  insert work_orders ──► sync wo_items ──► insert job_order skeletons per unit
        │                                    (TRUCKING w/ tokens; WAREHOUSE 'menunggu_wh_eksekusi'
        │                                     + auto wh_transfer_orders/outbound_shipments)
        ▼
SBU AssignmentModal → saveAssignmentsAction → assignmentSave.ts:
  upsert JO skeleton → set transporter/vendor/fleet/driver/prices/tokens inline on job_orders
  → flip wo_items 'assigned' → flip parent work_orders 'assigned' when all items assigned
        ▼
DRIVER: /jo/[token] GET manifest → geofence arrival/departure (PATCH) → MENUNGGU SELESAI
  → cron jo-autocomplete (30 min) → PEKERJAAN SELESAI (+ JoAutoComplete cascade + coin RPC)
  (+ cron jo-autostart 30-min auto-confirm/start; ops handover/reject/reassign paths)
        ▼
BILLING: is_doc_finished && is_cost_finished → 'ready_for_billing' (POD verify / cost-audit)
  → invoice-customer page computes total CLIENT-SIDE → insert invoices(draft) → mark JOs+items invoiced
```

Commercial commitment today = `wo_items.unit_price/total_revenue` snapshots; execution = `job_orders`. **Conflated in one chain.**

## 10. CANONICAL BUSINESS LIFECYCLE (as designed, not yet fed)

`Customer → commercial_work_orders (engagement) → [future] activated services → capability_bindings (ACTIVE registry) → svc_service_requests (commands) → adapters create domain jobs (cus_declarations / job_orders / …) → event_outbox → projections/finance`

Gap analysis against current: engagement creation path missing (P0), activation engine missing (later phase), adapter lineage broken (F-03), orchestrator bias to forwarding, warehouse adapter stub.

## 11. SERVICE REQUEST ≠ JOB ORDER — SEMANTIC ANALYSIS (mandate #6)

**Answer: Service Request ≠ Job Order.** Evidence:

1. **Schema:** `svc_service_requests` (004:8-31) carries message semantics — `status svc_request_status` state machine (ISSUED→ACKNOWLEDGED→ACCEPTED/REJECTED…), `correlation_id`, `causation_id`, `idempotency_key UNIQUE(tenant,id)`, `sla_target_time`, `request_payload JSONB`, plus **loose pointer** `assigned_domain_job_id UUID` with explicit NO-FK design (types.ts:189 comment: "trk_job_orders.id, cus_declarations.id, etc."). A JO-equivalent would not need idempotency keys, correlation/causation chains, rejection_reason, or polymorphic job pointers.
2. **Runtime behavior:** `issueRequest(autoDispatch=true)` (service-request-service.ts:88-92) makes it *behave* like a synchronous 1:1 creator-wrapper — the trucking adapter immediately INSERTS a `job_orders` row and the dispatcher writes back `assigned_domain_job_id` (dispatcher.ts:60-76).
3. **Customs variant:** the same request produces a `cus_declarations` row instead — proof that SR is the generic command and the "job" is polymorphic.
4. **Business workflow:** SR is issued by an orchestrating domain (forwarding execution-plan / future commercial layer) to *command* another SBU; the resulting JO belongs to the target SBU's private lifecycle.

**Implication:** mapping SR 1:1 onto JO would be wrong. The correct invariant: *one SR ⇒ ≤1 domain job (today), N:M possible tomorrow; the binding is `assigned_domain_job_id`, integrity of which must eventually be hardened.*

## 12. TENANT-RESOLUTION ANALYSIS

| Surface | Mechanism | Verdict |
|---|---|---|
| Dashboards/forms (HQ+SBU) | Session auth → `profiles` query → `profile.tenant_id` used explicitly in payloads (AuthContext.tsx:38-50; CreateWOForm:323,368…) | Works live; must migrate to resolver function later |
| `/api/wo`, `/api/forwarding/*`, `/api/v1/service-requests` | `tenant_id` from BODY under service-role | IMPERSONATABLE — D-2 hardening target |
| `/api/v1` customs+forwarding helpers | session → `profiles.tenant_id` | **BROKEN assumption**: profiles has no tenant_id live; would return undefined → these helpers cannot have ever resolved successfully on prod (consistent with dead canonical usage) |
| Driver flows | Server-resolved from JO row / driver links (never client) | Correct pattern; keep |
| Production resolver | `get_my_tenant_id()` (tenant_users staff → tenants owner) | Authoritative; adopted by canonical RLS |

## 13. RLS BOUNDARY ANALYSIS

- Canonical family: strict `get_my_tenant_id()` isolation policies — verified enabled post-deployment.
- Legacy: `work_orders` RLS policy exists (`tr_wo_isolation`); `job_orders`/`wo_items` policies exist but numerous browser-direct writers filter by `id` only, relying wholly on those policies; several service-role routes bypass entirely (§6 risk column).
- Financial tables (`invoices`, `invoice_lines`, `extra_costs`, `md_services`) remain effectively open at DB level — pre-existing debt, outside this phase.

## 14. TRANSITION-RISK MATRIX (what must eventually change)

| ID | Site | Change required toward canonical | Priority |
|----|------|----------------------------------|----------|
| T-01 | Engagement creation path (none exists) | POST /api/v1/commercial/work-orders + hardened auth | **P0** |
| T-02 | Trucking adapter `wo_item_id` omission + no lineage | Resolve-or-create canonical engagement; set lineage; satisfy NOT NULL without weakening | **P0** |
| T-03 | `CreateWOForm` triple browser insert (WO+items+JOs) | Route through canonical engagement + line items via server action/API | **P0** |
| T-04 | `/api/forwarding/wo` + `/api/wo` body-tenant service-role writes | Session-resolved tenant + authorization (D-2) | **P0** |
| T-05 | Shipment creator fabricated `work_order_id`/`service_scope_id` (crypto.randomUUID) | Resolve real engagement/scopes server-side | **P0** |
| T-06 | Binding lifecycle PATCH endpoint absence | Expose transitions (suspend/resume/complete) | P1 |
| T-07 | Capability vocabulary hard-coded ×8 | Registry-driven (ADR-029) | P1 |
| T-08 | `commercial_service_scopes` fabricated-UUID dependency in shp_shipments | Scope resolution strategy (D-3 follow-up) | P1 |
| T-09 | Billing derivation from `is_doc_finished` flags | Service-state-derived billing eligibility | P2 |
| T-10 | Pricing fragmentation (5 homes) | service_pricing consolidation (later 4B phase) | P2 |
| T-11 | fin_financial_ledger_entries unwritten | Ledger hooks keyed to activations | P2 |
| T-12 | Browser-direct readers on legacy tables | Acceptable long-term via compat views; revisit post-cutover | P3 |
| T-13 | `CLEARANCE` vs `CUSTOMS` legacy vocabulary | Data normalization + compat view | P3 |
| T-14 | Orphan `armada` table, `exec_sql_manual` exposure | Cleanup/hardening backlog | P3 |

## 15. RECOMMENDED STRANGLER/BRIDGE ARCHITECTURE (direction only)

```
Legacy UI (unchanged during transition)
   │ writes work_orders/wo_items/job_orders  ← continues to work (protected)
   ▼
BRIDGE (new, small, server-side):
   on legacy WO commit → resolve-or-create canonical engagement (commercial_work_orders)
                        → mirror purchase lines → commercial_line_items (compat)
                        → ensure capability bindings
   on canonical activation → issue svc_service_requests → adapters (lineage fixed)
```
Canonical reads grow through new surfaces (v1 APIs, control-tower projections); legacy reads remain until cutover criteria met. No dual authority: canonical engagement is the commercial truth from day one of the bridge; legacy WO remains an operational artifact linked by bridge reference.

*(Direction only — implementation design deferred to 4B-1 per mandate.)*

## 16. ACTION LIST (P0/P1/P2/P3)

- **P0:** T-01..T-05 above (each blocks canonical adoption outright).
- **P1:** T-06..T-08; plus auth-helper rewrite against real identity chain (`get_my_tenant_id()`-equivalent server resolution); plus role gates (`commercial:read/manage`).
- **P2:** T-09..T-11; plus vocabulary normalization CLEARANCE→CUSTOMS (data fix + views).
- **P3:** T-12..T-14; plus ADR index ratification; plus removal of `EXCHANGE` dead adapter slot.

## 17. EXPLICIT UNKNOWNS (no evidence — not invented around)

1. Whether live `job_orders.wo_item_id` NOT NULL constraint is actually enforced for adapter inserts (runtime test impossible read-only; suspected divergence flagged in earlier phases).
2. Whether any external consumer (scripts, integrations outside repo) writes legacy/canonical tables.
3. Full contents of `item_data` JSONB variants across historical wo_items (schema-on-read).
4. Live `realtime.subscription` table purpose (Supabase internal; restore noise only).
5. Whether Supabase platform search_path exposes `extensions` schema functions (pgcrypto) identically for all roles — relevant to future migrations using extension functions unqualified.
6. Exact business rules behind `max_jo_count` for non-trucking SBUs.

## 18. RECOMMENDED PHASE 4B-1

Scope proposal (implementation stage, requires owner approval):
1. **Bridge core:** canonical engagement resolve-or-create service + hardened commercial api-helper (D-2, built on `get_my_tenant_id()`-equivalent server resolution + role gates).
2. **Lineage repair:** trucking adapter wo_item_id/engagement linkage fix (T-02) + forwarding writer guard (T-04 partial).
3. **Capability registry foundation** (ADR-029 minimal) + binding lifecycle PATCH surface.
4. **Fabricated-ID elimination** in canonical shipment creator (T-05).
5. Test battery: root/bridge/FK-integrity/registry/security suites + static architecture gates, extending the 543-test umbrella.

Explicitly OUT of 4B-1: service catalog, pricing, packages, activations engine, UI.

## 19. STOP CONDITIONS

Standard: stop if any protected system would need modification, if tests fall below 543-baseline minus documented transient, if production would be contacted for write, or if evidence contradicts any assumption in this report.

---

*Evidence base: three parallel forensic sweeps with file:line citations (writer sweep: 107 sites; reader/API sweep: ~70 routes classified; lifecycle sweep: 4 questions resolved), plus read-only live-database verification. No production write occurred; no application file changed.*
