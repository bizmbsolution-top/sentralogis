# SENTRALOGIS — PHASE 4B-0 ARCHITECTURE GATE

## Bridging the Canonical Foundation to the Operational Application

**Date:** 2026-08-25 · **Mode:** Architecture Gate — inspection, mapping, boundary design. NO implementation.
**Question answered:** *Can Sentralogis begin Phase 4B-0 implementation safely, and exactly how should the application layer transition from the legacy operational model to the canonical model?*

---

## 1. GATE OBJECTIVE

Establish the correct application-layer relationship with the Stage-R canonical foundation (`tenants → md_tenants → commercial_work_orders → line_items → capability_bindings → svc_service_requests → SBU execution`) **without allowing legacy WO/JO/SBU thinking to contaminate it**, and decompose implementation into safe units.

## 2. REPOSITORY FINDINGS

Condensed from `SENTRALOGIS_ARCHITECTURE_FORENSIC_AUDIT.md` (full evidence there):

- ~107 legacy writer sites across 40+ files; dominant pattern = browser-direct Supabase calls under RLS.
- Canonical foundation deployed (R-P1 + 001→013 + R-B), all tables live with 0 rows; RLS verified.
- No runtime path creates `commercial_work_orders`; v1 commercial surface exposes only `[id]/capabilities`.
- v1 auth helpers assume nonexistent `profiles.tenant_id` — production resolver is `get_my_tenant_id()`.
- Trucking adapter inserts JOs without required `wo_item_id` and without engagement lineage.
- Shipment creator fabricates `work_order_id`/`service_scope_id` via `crypto.randomUUID()` in browser.
- Capability vocabulary enumerated at 8 sites; lifecycle transitions for bindings unreachable via API.

## 3. CURRENT APPLICATION ARCHITECTURE

Four de-facto layers exist today but with inconsistent adherence:

```
UI ──┬── browser-direct supabase.from()          (HQ/SBU dashboards, forms)      ← violates layering
     ├── internal /api routes                    (driver flows, forwarding fw_*)  ← LEGACY
     └── internal /api/v1 calls                  (customs + forwarding workspaces)← CANONICAL ✅
API routes ── mixed: domain services ✅ | giant handlers ⚠ | body-tenant service-role ⚠
Domain services ── customs ✅ shipment ✅ commercial (registry only) service-contracts ⚠
```

The customs and forwarding workspaces prove the target pattern already works in production practice: UI → application API → domain service → admin client with tenant filter. The gate's job is to make that pattern universal at the commercial seam.

## 4. CANONICAL FOUNDATION INTERACTION

Treated as strategic target per instruction. One FOUNDATION BLOCKER-class observation recorded (not acted on): `commercial_work_orders.service_scope_id NOT NULL` references an unseeded table — this is a deployment-data issue resolved by seeding/scoping strategy inside 4B-0 implementation, not a schema defect; the nullable relaxation option remains available if owner ratifies.

## 5. LEGACY → CANONICAL MAPPING

Summary matrix (full detail in `SENTRALOGIS_PHASE4B0_APPLICATION_MAPPING.md`):

| Legacy | Canonical | Relationship |
|---|---|---|
| WO | commercial_work_orders | Legacy WO ≈ **application projection** of an engagement that also embeds execution config — NOT equivalent (see §7) |
| WO Item | *(no single counterpart)* | Splits into commercial_line_item (revenue) + execution slot config + future service activation(s) — 1:N |
| SBU | capability_binding / capability_type | Organizational routing label → registry capability |
| JO | operational execution (polymorphic) | Domain-private execution object; never canonical |
| Driver/Fleet/Transporter | resource/provider | Already generic enough inline; canonical provider model later |
| Customer | party (md_entities) | Already shared ✅ |
| fw_* shipment engine | shp_shipments aggregate | Two generations; strangler |

## 6–7. CRITICAL QUESTION: IS LEGACY WO == commercial_work_orders?

**NO — definitive: legacy `work_orders` is an application-level operational projection that happens to carry commercial attributes, not the canonical engagement.**

Evidence by dimension:
- **Ownership/lifecycle:** legacy WO status flips from assignment cascades and driver completions (assignmentSave.ts:457-472; jo route mirrors) — an engagement's lifecycle must never be driven by execution.
- **Identity:** legacy WO numbers are per-tenant operational codes; canonical identity is UUID engagement with contract metadata.
- **Commercial meaning:** prices live on wo_items snapshots, not the WO header; canonical carries total_agreed_revenue + line items.
- **Approval:** none structured on legacy; canonical enum includes SUBMITTED/CONFIRMED.
- **Financial relationship:** invoices FK directly to legacy WO — billing must re-key to canonical truth eventually.

**Recommendation:** treat legacy WO as the **operational case file**; every legacy WO must ultimately be shadowed by one canonical engagement via resolve-or-create bridge. Never promote legacy tables into canonical authority (violates ADR-018).

## 8. CRITICAL QUESTION: WO ITEM → service_requests?

**WO Item does NOT map 1:1 to Service Request.** Evidence-based decomposition:

- A wo_item is a *purchased service line with execution-slot configuration* (quantity, max_jo_count, sbu_type, addresses).
- The canonical decomposition of ONE forwarding-style item is N service requests:
  `Forwarding item → SR(origin trucking) + SR(export clearance) + SR(ocean) + SR(import clearance) + SR(destination trucking)` — exactly the multi-leg model `shp_execution_legs` already encodes.
- Conversely a simple "Port Delivery" item maps to exactly one SR→TRUCKING.

**Conclusion:** canonical model supports the decomposition correctly via `service_requests` × `shp_execution_legs`; the 1:N item→SR mapping must be produced by the orchestration/execution-plan logic (which exists for shipments) rather than assumed at the item level.

## 9. CRITICAL QUESTION: SBU → CAPABILITY EVOLUTION

Target: `Business Request → Required Capability → Capability Binding → Service Request → Execution`.

Where the application must identify each concept:
- **capability**: catalog/mapping metadata + binding rows — never `if sbu===` branches;
- **service**: commercial activation/catalog (future);
- **execution**: SBU-private objects only;
- **provider/resource**: SBU-owned master data (`md_fleets`, `md_drivers`, `md_transporters`) referenced by execution.

Current hard-coded SBU branching sites (significant): CreateWOForm per-SBU modal switch (:419-422, :973-976, :1096-1121); ServiceRequirements.tsx domain tags; trucking/completed status gates; invoice readiness flags; 8 vocabulary enumeration sites; legacy DB CHECKs using CLEARANCE. Registry-driven replacement is backlog U-05.

## 10. ANTI-CORRUPTION BOUNDARY (ACL)

Based on actual repository structure (Next.js App Router + lib/domain services + supabase clients), the ACL should be a **combination**, not a single pattern:

```
UI / Workspaces
   ↓ (fetch)
Application API  = /api/v1 route handlers (thin: auth, validation, response shaping)
   ↓
Application Services = use-case classes/functions (lib/application/**) — NEW thin layer
   ↓
Domain Services = existing lib/domain/* services (commercial, shipment, customs…)
   ↓
Anti-Corruption Adapters (lib/adapters/**) ← THE NEW SEAM
   • EngagementBridgeAdapter : legacy WO ⇄ commercial_work_orders (resolve-or-create)
   • ExecutionLineageAdapter : SR ⇒ domain job creation with lineage + compensation
   • StatusTranslator        : legacy statuses ⇄ canonical lifecycle events
   ↓
Supabase (canonical schema + legacy schema during transition)
```

Rules enforced by the ACL:
1. Only adapters may write BOTH generations in one use case.
2. Canonical services must never import legacy table names; legacy code must never import canonical table names — all contact through adapter interfaces.
3. Tenant context enters ONLY as a resolved `{tenantId, userId, role}` value object (from `get_my_tenant_id()`-equivalent server resolution).
4. DTOs cross the boundary; row types never leave repositories.

## 11. LEGACY PROTECTION RULE — APPLIED VERDICTS

| Component | Verdict | Why |
|---|---|---|
| Legacy execution engine (WO/JO chain, driver PWA, GPS) | **KEEP** | Operationally valuable, field-hardened |
| `CreateWOForm` client-side triple insert | **MODIFY** | Non-atomic + bypasses boundary (route through server action in 4B-1) |
| `/api/wo`, `/api/forwarding/*` body-tenant writes | **MODIFY** then fold behind ACL | Security debt |
| `fw_*` consolidation engine | **KEEP → DEPRECATE** after shp_* parity | Strangler target |
| `job_orders` as universal execution table | **KEEP** (legacy) / new capabilities get own domains | Protected system |
| `commercial_service_scopes` | **DEPRECATE** (compat view) | ADR-022 direction ratified D-3 |
| Warehouse adapter stub | **MODIFY** when WH dispatch needed | Currently no-op |
| `armada`, `exec_sql_manual` | **DEPRECATE/HARDEN** | Orphan / injection surface |
| Customs domain | **KEEP** untouched | Sovereign, proven |

## 12. FORWARDING AUDIT

Stress scenario (BYD CKD China→Subang): representable end-to-end on canonical track — shipment aggregate with N dynamic legs (ocean/truck/customs-as-SR/warehouse), milestones per leg, polymorphic containers, provider flexibility, customer timeline derived from milestones. Blockers are the operational seams already listed (engagement creation T-01, dispatch fabrication, creator fabricated IDs). Backward compatibility preserved: fw_* consolidation continues until parity.

## 13. TRUCKING AUDIT

Mapping: Commercial Request → SR(target=TRUCKING) → adapter creates JO (+routes) → fleet/driver assignment (existing saveAssignments semantics stay) → GPS/geofence lifecycle (untouched) → POD → completion event. Required fixes before first real dispatch: adapter lineage (wo_item_id/engagement), idempotency reuse, compensation verification. Driver workflows unchanged — adapter output lands in the same `job_orders` shape they consume.

## 14. CLEARANCE AUDIT

Independent capability confirmed: SR(target=CUSTOMS) → customs adapter creates declaration draft → sovereign engines take over → release milestone emits event. Forwarding orchestrates via SRs; no customs fields embedded in forwarding objects (verified — attachment refs are nullable pointers).

## 15. WAREHOUSE AUDIT

WH consumption path: SR(target=WAREHOUSE) → warehouse adapter (**currently a stub — must be implemented when WH dispatch is needed**) → wh_receipt/inbound/outbound flow. The canonical layer stays WMS-agnostic because payloads travel in typed JSONB (`WarehouseServicePayload`).

## 16. API/SERVICE BOUNDARY — TARGET & VIOLATIONS

Target (§10 diagram). Current violations to retire incrementally: browser-direct writes (CreateWOForm, modals cluster), body-tenant service-role routes, giant `/api/jo/[token]` handler (~1600 lines — split GPS ingest vs lifecycle vs payments), missing `/api/v1/commercial/work-orders` list/create/detail.

## 17. API RULE

Business decisions live in **domain services**, orchestrated by **application services**; routes do auth/validation/shaping only. Exception tolerated short-term: token-scoped driver routes (single-aggregate scope). No new framework patterns introduced — modular monolith confirmed as correct direction.

## 18. TYPE BOUNDARY

Minimum separation adopted: `Domain types (lib/domain/*/types.ts)` remain source of truth → `API DTOs` per route contract → `Workspace View Models` only where UI aggregates multiple sources. Immediate cleanups: eliminate duplicated ad-hoc row types in older pages as they're touched; introduce `CapabilityCode` branded type replacing string unions at registry introduction.

## 19. STATUS MODEL AUDIT — SEMANTIC COLLISIONS FOUND

| Collision | Today | Canonical separation |
|---|---|---|
| JO completed ⇒ parent WO/item flipped completed | assignmentSave/jo-route mirror | Execution completion ≠ engagement fulfillment; engagement completes when ALL services complete |
| `is_doc_finished && is_cost_finished` ⇒ ready_for_billing ⇒ invoiced | ops flags drive finance | Billing eligibility derives from service/agreement state |
| JO status strings double as display text AND state machine ('MENUNGGU SELESAI') | free-text statuses | Operational lifecycle stays SBU-private; canonical reads derived events only |
| Binding ACTIVE treated as "service purchased" | registry conflated with sale | Binding = routing registry; purchase = future activation record |

## 20. EVENT BOUNDARY

Event origination rule: **domain services own their events**. Concretely: capability binding transitions, engagement lifecycle changes, and SR acceptance emit to `event_outbox` (already deployed); SBU execution emits domain-local events which MAY forward summary milestones. No broker; outbox polling consumers for projections/finance/notification. Event catalogue (WO_CREATED, JO_ASSIGNED, CUSTOMS_RELEASED…) to be ratified as the first 4B-1 deliverable alongside producers.

## 21. CUSTOMER VISIBILITY BOUNDARY

Customer view = read-model projection over canonical milestones/events (`fn_get_sanitized_customer_tracking` precedent exists). Internal cost/margin/provider data excluded by construction (projection selects whitelisted fields). Current token-tracking APIs already follow this shape; they will re-point to canonical projections when activations exist. No duplication of business truth.

## 22–23. MIGRATION STRATEGY & SEQUENCE

Strangler with bridge (diagram §10). Dependency-derived sequence:

| Stage | Content | Depends on |
|---|---|---|
| **4B-1a** | Hardened commercial resolver/api-helper (session→get_my_tenant_id-equivalent→roles) + role gates | — |
| **4B-1b** | Engagement resolve-or-create service + `/api/v1/commercial/work-orders` POST/GET/list | 4B-1a |
| **4B-1c** | Capability registry (minimal) + binding lifecycle PATCH + de-hardcode commercial-layer validTypes | 4B-1b |
| **4B-1d** | ExecutionLineageAdapter: fix trucking adapter lineage + forwarding writer guard | 4B-1b |
| **4B-1e** | Fabricated-ID elimination in canonical shipment creator | 4B-1b |
| **4B-2** | Service activations (commercial_engagement_services) + outbox producers | 4B-1 |
| **4B-3** | Catalog/pricing/packages (ADR-022+) | 4B-2 |
| **4B-4** | SBU integration waves: forwarding → trucking → clearance → warehouse (per demand) | 4B-2 |
| **4B-5** | Projections/control-tower/customer read models; ledger producers | 4B-2 |

## 24. GATE DECISION

# 🟡 GO WITH CONDITIONS

Implementation of Phase 4B-0 may begin **only after** the following prerequisites are completed as its FIRST work packages (they are the conditions):
1. Hardened tenant/identity resolver for canonical APIs (D-2) — no body/header/query tenant authority.
2. Engagement resolve-or-create path (T-01) — canonical root becomes creatable.
3. ACL skeleton (adapters + application service layer) with import-boundary lint gates.

With these in place, the remaining backlog proceeds under strangler rules. Big-bang alternatives rejected (see Backlog preamble).

---

```text
STAGE R
FOUNDATION = CLOSED

PHASE 4B-0
ARCHITECTURE GATE = GO WITH CONDITIONS

CANONICAL FOUNDATION
        ↓
APPLICATION BOUNDARY   ← ACL (adapter + application service) = the new seam
        ↓
OPERATIONAL APPLICATION
        ↓
WORKSPACE
```

### Five explicit answers

1. **Canonical entry point for application logic?** Application services behind `/api/v1`, reached through Anti-Corruption Adapters; tenant context resolved server-side via the `get_my_tenant_id()` identity chain; nothing else touches canonical tables.
2. **What happens to legacy WO?** KEEP as operational case file; each becomes shadowed by a canonical engagement via the EngagementBridge (resolve-or-create); its commercial columns freeze as compatibility data and its lifecycle ceases to define commercial truth.
3. **What happens to legacy JO?** KEEP as sovereign SBU execution object; canonical world reaches it exclusively through ServiceRequest adapters carrying lineage; no canonical table will ever replace `job_orders` for trucking execution.
4. **What happens to SBU?** Evolves from hard-coded branch labels to registry-driven capabilities: binding rows declare organizational ownership, SRs command execution, SBUs keep private workflows/data/documents/pricing/events/SLA.
5. **What is the safest first implementation step?** 4B-1a — the hardened tenant resolver + role-gated api-helper — because it is small, testable, unblocks everything else, touches zero protected behavior, and closes the highest-severity security debt.
