# U-14 Sales Order Fulfillment Composition — Architecture Decision Report

**Date:** 2026-08-28
**Gate:** U-14 — Fulfillment Composition Architecture **Discovery & Decision** (the "HOW" between Sales Order and operational execution)
**Depends On:** U-01 → U-13R COMPLETE/GREEN (prior gates ratified ADR-033..038 and built the canonical `sales_orders` header)
**Nature:** **DISCOVERY + ARCHITECTURE DECISION ONLY. NO production code. NO production migration. NO new table/API/ADRs (proposals only).**

**Status: GREEN — decision complete, forensics satisified, implementation DEFERRED.**

---

## A. Executive Decision

> **Fulfillment is a first-class *conceptual* boundary, and a lightweight *composition* aggregate — NOT a re-implementation of operations. The recommendation is Model E (hybrid), which formalizes ADR-036 into a small canonical `Fulfillment` composition record (per-SO plane) that decomposes the SO into per-capability fulfillments, each materialized through the EXISTING canonical mechanisms (capability bindings → WHAT; shipment → forwarding HOW; service request → cross-domain dispatch; guarded WO → operational commitment). Shipment is explicitly NOT the fulfillment aggregate.**

The prior decision surface (U-12A decision-row 4, now ADR-036) already leaned this way: *"Explicit boundary, reusing bindings + SR + shipment (no new container)."* U-14's forensic work **confirms** the reuse direction but **overturns the "no new container" half**: while no *second operational engine* is wanted, a **first-class (but deliberately lightweight, composition-only) Fulfillment aggregate** is required to own the per-SO plan, progress, partial-fulfillment accounting, and multi-SBU decomposition — responsibilities none of the existing canonical objects owns today (each is a single-mechanism owner; none spans "an SO and its decomposition").

### The three-layer invariant (re-asserted from ADR-036/§65 North Star)

```
Commercial  →  Fulfillment  →  Operational
  WHAT          HOW            WHAT WORK
  (SO)          (composition)  (WO/Shipment/SR/declaration)
```

- **SO answers WHAT the customer bought** — commercial, customer-facing, price authority.
- **Fulfillment answers HOW Sentralogis fulfills it** — the plan/decomposition, per-commitment, cross-SBU.
- **Operations answers WHAT work executes** — WO/WO-item/JO, shipment legs, declarations, warehouse ops.
- **SO does NOT become operational; Shipment does NOT become commercial; WO does NOT become the customer order.**

---

## B. Scope

**In scope (this discovery gate):**
1. Forensic inventory & classification of every canonical object that neighbors or could host Fulfillment (§22, §D).
2. Full §45 anti-pattern scan (SO=WO, SO=Shipment, SOR=Fulfillment, Shipment=WO, ServiceRequest=JO, WO=customer-order, one-*=−one-* collapses).
3. Model comparison A–E against the 15 business scenarios (§F/§G/§34).
4. **Decision**: is a first-class Fulfillment aggregate REQUIRED (§48)? Is Shipment the fulfillment aggregate (§49)? Multi-SBU composition options (§50/51), what a fulfillment delegates to (§24), its lifecycle (§G.4), commercial-amendment vs fulfillment-change split (§53), customer/internal visibility split (§54).
5. Cardinality & lineage matrices (§56/§57), event model (§58), identity/tenant/auth/security (§38/§42), domain ownership matrix (§33), ADR proposals **PROPOSED ONLY** (§59, no ADR-033..038 collision).
6. Optional forensic/architecture test suite (§60) + registration (§61) + full regression + tsc (§61/§62).

**Out of scope (deferred, never in U-14):**
- Any new table, migration, DB function, RLS, API route, server action, or UI.
- Any ADR ratification (only PROPOSED proposals are emitted — §59).
- Any refactor/rename of protected legacy operational tables (`work_orders`/`wo_items`/`job_orders`/driver/GPS/dispatch). These are protected: **document, don't refactor.**
- SO sell-lines / pricing (deferred to a future PRICING ADR, per U-12A §K / U-13 §R).
- Any PRICING/Finance/invoice-root redesign.

---

## C. Method & Evidence Sources

Static forensic review of ratified ADRs and canonical implementation. Evidence anchors:

- **ADR-033** (SR = Command, not a Job) — SR owns identity/idempotency/SLA/correlation; the domain job is its RESULT; adapters must preserve lineage; one SR → ≤1 primary domain job today (multi-job possible without schema change).
- **ADR-034** (Engagement → SO 1:N) — `commercial_work_orders` is the long-lived container; `sales_orders` is the child commitment.
- **ADR-035** (SO number authority) — `next_sales_order()` server-side; client MUST NOT generate.
- **ADR-036** (SO Fulfillment Boundary) — the single commercial→operational handoff is `SO(CONFIRMED) → capability bindings + service requests + guarded WOs`; do NOT create a second competing fulfillment architecture.
- **ADR-037** (SO → WO 1:N; many SO → 1 WO FORBIDDEN).
- **ADR-038** (SO → many Shipments; `shp_shipments.sales_order_id` nullable, `ON DELETE SET NULL`).
- **U-13 / U-13R** implementation + reconciliation reports — `sales_orders` header is the sole order root; U-13's ONLY operational mutation is `shp_shipments.sales_order_id` (schema-level, **NOT yet wired to runtime** — see §D.6).
- **Shipment domain** (`lib/domain/shipment/*`): `Shipment` aggregate, `ExecutionPlan`/`ExecutionLeg`, `LegUnitAllocation`, `Milestone`, `ShipmentException`; `ExecutionPlanService.dispatchExecutionLeg` -> `ServiceRequestService.issueRequest` (auto-dispatch) -> adapter -> `assigned_domain_job_id`.
- **Service contracts** (`lib/domain/service-contracts/*`, `lib/application/service-contracts/*`): `svc_service_requests` header (source/target domain, SKU, polymorphic payload, SLA, `assigned_domain_job_id` loose pointer); `forwarding-writer.ts` and `trucking-lineage.ts` (operational writers).
- **Capability model** (`lib/application/capabilities/*`, `lib/application/capability-bindings/*`): registry (WHAT exists, U-05) + binding (WHETHER this tenant provides it, U-06; `UNIQUE(tenant_id, work_order_id, capability_type)` ADR-020; lifecycle ACTIVE/SUSPENDED/COMPLETED/CANCELLED).
- **Legacy operational lineage** (`supabase/migrations/032_rename_enterprise_tables.sql`): `work_orders → wo_items (wo_id) → job_orders (wo_item_id)` — the protected physical execution engine.
- **Customs progressive attachment** (migration 013, ADR-019): `cus_declarations.shipment_id`, `execution_leg_id`, `job_order_id` additive nullable forward refs — the declaration-to-shipment/leg/JO attachment.

---

## D. Forensic Inventory & Classification (§22)

Classification of every object touching the SO→Operations seam:

| # | Object | Business meaning | Class | Parent | Child | Canonical owner |
|---|--------|------------------|-------|--------|-------|-----------------|
| 1 | `commercial_work_orders` (Engagement, ADR-018) | long-lived relationship/context | **CANONICAL** | Customer/tenant | SO, capability bindings, shipments | Commercial |
| 2 | `sales_orders` (ADR-034..038) | customer commercial commitment (WHAT) | **CANONICAL** | Engagement | (future) SO lines, fulfillment plan | Commercial |
| 3 | `commercial_capability_bindings` (ADR-020) | static composition membership (WHAT capability included) | **CANONICAL** | Engagement | (lifecycle) | Commercial |
| 4 | `commercial_capability_registry` (U-05) | global capability vocabulary | **CANONICAL** | — | bindings | Commercial |
| 5 | `svc_service_requests` (ADR-033) | cross-domain COMMAND (dispatch), not a Job | **CANONICAL** | Engagement/Shipment/Leg | target-domain result (`assigned_domain_job_id`) | Operations |
| 6 | `shp_shipments` + units + manifest (mig 003) | operational forwarding aggregate (a voyage) | **CANONICAL** | Engagement (and SO via ADR-038 ref) | units, manifest, exceptions | Operations/Forwarding |
| 7 | `shp_execution_plans` / `shp_execution_legs` | the route plan within a shipment (HOW route) | **CANONICAL** | Shipment | legs, leg-unit-allocation | Operations/Forwarding |
| 8 | `cus_declarations` (+ attachment refs, ADR-019) | customs declaration (operational) | **CANONICAL** | (progressive attach) Shipment/Leg/JO | audit/decisions/preparations | Operations/Customs |
| 9 | `commercial_line_items` (mig 002) | dormant SO sell-line seat (parent FK = Engagement) | **DORMANT** | Engagement | — | (future PRICING ADR) |
| 10 | `commercial_service_scopes` (mig 002/015) | soft-deprecated scope vocabulary | **SOFT-DEPRECATED** | — | — | (superseded by registry U-05) |
| 11 | legacy `work_orders` / `wo_items` / `job_orders` (mig 032) | operational commitment / dispatchable unit / physical execution | **LEGACY-OPERATIONAL (PROTECTED)** | ->wo_items->job_orders | JO routes/telemetry | SBU Ops/Driver |
| 12 | `fw_*` (consolidations/container_assignments/items) | legacy forwarding operational tables | **LEGACY-OPERATIONAL** | — | — | Ops (bridge only) |
| 13 | `fleet_gps_status` / `job_tracking` / telemetry | GPS/driver telemetry | **OPERATIONAL-TELEMETRY** | JO | — | Ops |

**No first-class `Fulfillment` aggregate exists today.** The word "fulfillment" appears only as (a) the ADR-036 boundary concept, (b) statuses on `sales_orders`/`shipments`/`wo` (`IN_FULFILLMENT`, `PARTIALLY_FULFILLED`, `FULFILLED`, `target_fulfillment_date`), and (c) the U-12A decision-row 4 recommendation. There is no `fulfillment` table, no `Fulfillment` domain service, no `Fulfillment` API. **The lane is entirely free.**

### §45 Anti-Pattern Scan Results (canonical layer + migrations)

| # | Anti-pattern | Surface | Verdict |
|---|--------------|---------|---------|
| 1 | SO = WO | `sales_orders` has NO `work_order_id`; SO domain never writes `work_orders` | **ABSENT** (structurally enforced, U-13) |
| 2 | SO = Shipment | `sales_orders` has no shipment semantics; shipment is a voyage aggregate | **ABSENT** |
| 3 | SO = Fulfillment | No Fulfillment object; SO is header-only, no decomposition slots | **ABSENT** (also the gap this gate fills) |
| 4 | Shipment = WO | `shp_shipments` is operationally distinct from legacy `work_orders`; shipment anchors to Engagement, not WO | **ABSENT** (distinct canonical vs legacy engines) |
| 5 | ExecutionLeg = WO | `shp_execution_legs` is a route leg inside a shipment, dispatched via SR; not a WO | **ABSENT** |
| 6 | CapabilityBinding = WO | binding is static membership (WHAT included); lifecycle-only writes | **ABSENT** |
| 7 | ServiceRequest = JO | **RULED OUT by ADR-033** (Command, not a Job); `assigned_domain_job_id` is a loose result pointer | **ABSENT** |
| 8 | WO = customer order | Legacy `work_orders` historically carried commercial bookkeeping (invoice root), **contained** as legacy; SO supersedes | **CONTAINED legacy debt** (documented, not a U-14 defect) |
| 9 | one-SO=one-shipment/WO | no uniqueness constraint; 1:N is the ratified intent (ADR-037/038) | **ABSENT** |
| 10 | one-shipment=one-WO | shipment↔WO not conflated | **ABSENT** |
| 11 | one-capability=one-WO | binding↔WO not conflated | **ABSENT** |
| 12 | SO directly creates JO | SO domain never touches `job_orders` | **ABSENT** (U13-12/14b) |

**No §45 anti-pattern fires as a defect.** All are either cleanly absent (canonical SO layer) or contained legacy debt (the legacy `work_orders` dual commercial role), which is in-scope for documentation only.

---

## E. The Central Question: WHAT does Fulfillment own? (§48–54)

### §48 — Is a first-class Fulfillment aggregate REQUIRED?

**YES — a lightweight, composition-only Fulfillment aggregate IS required.** Justification (responsibility-owned, not mechanism-owned):

| Responsibility needed between SO and Operations | Existing owner today? |
|--------------------------------------------------|----------------------|
| Per-SO decomposition into capabilities/SBUs (which capabilities fulfill THIS order) | Capability bindings are **per-Engagement, not per-SO** — they say "engagement includes CUSTOMS+TRUCKING", not "SO-2026-08-0042 requires Customs for 20 CTN + Trucking for a D2D leg" |
| Per-SO progress / partial-fulfillment accounting (ordered vs allocated vs delivered qty) | No owner. `sales_orders` has no allocation slots; shipments track their own units but not against the SO's ordered qty |
| Per-SO fulfillment state transitions (`IN_FULFILLMENT / PARTIALLY_FULFILLED / FULFILLED`) driven by operational events | Declared on `sales_orders` enum (U-13) but **no orchestrator sources them** — the events that should advance SO state (shipment delivered, WO completed) have no subscription path into the SO |
| Multi-SBU composition for a specific order | bindings are engagement-scoped (ADR-020); per-SO composition needs a scoping seat |
| The "what/how/when of fulfilling THIS SO" as an audit/plan object | None |

**These cannot be delegated** to any single existing canonical object without overloading it (making Shipment also-commercial, or WO also-commercial, or binding also-order-scoped). The responsibilities are cross-cutting: Fulfillment is the per-SO plane that *scopes* the engagement's capability composition and *tracks* the SO against its operational child commitments. That is a genuinely new, thin responsibility — a **composition aggregate**, not a new operational engine.

**However** — and this is the subtlety that produces Model E — the Fulfillment aggregate must be **composition-only**, holding references/plans, and MUST NOT re-implement operations. Every execution payload stays in the existing mechanism that owns it (shipment for forwarding, declaration for customs, WO/JO for trucking/warehouse execution, SR for dispatch). The new aggregate is the **scoping/accounting/state-plan seam** between the SO header and those mechanisms.

### §49 — Is Shipment itself the fulfillment aggregate?

**NO.** Shipment is the **operational forwarding aggregate** (a voyage/journey). It fails as the universal Fulfillment aggregate:

1. **Scope**: Shipment only covers forwarding. SOs can be non-forwarding (customs-only, warehouse-only, trucking-only) with no shipment at all — yet they still need per-SO fulfillment state. Shipment cannot own those.
2. **1:N many shipments per SO** (ADR-038): no single shipment can be "the" fulfillment of an SO; the aggregate must span N shipments.
3. **Direction**: SO → many Shipments is the ratification; making Shipment the fulfillment would invert/adjoin a commercial responsibility onto an operational object, violating ADR-036/§49's "don't make Shipment for commercial commitment."
4. **Multi-capability**: an SO with forwarding + customs + trucking is fulfilled across shipment + declaration + JO; no single operational object spans it.

Shipment is a **child effect** of a forwarding fulfillment, not the fulfillment itself.

### §50/51 — Multi-SBU composition / multiple fulfillment plans

- **One SO decomposes into ONE fulfillment composition** (a single per-SO plane) containing **N capability-level fulfillment allocations** (one per capability/SBU engaged: CUSTOMS, FORWARDING, TRUCKING, WAREHOUSE).
- Each allocation materializes within its SBU's existing mechanism:
  - FORWARDING → one or more `shp_shipments` (each can be a child of the forwarding fulfillment allocation with per-allocated qty)
  - CUSTOMS → `cus_declarations` (attached to shipment/leg via ADR-019)
  - TRUCKING → dispatched via `svc_service_requests` → `job_orders`
  - WAREHOUSE → warehouse ops via `svc_service_requests`
- **Multiple fulfillment *plans*** (re-planning) are supported as **versioned revisions** of the composition (SEA: new revision supersedes, prior stays as audit), NOT as parallel competing fulfillment objects. This mirrors the SO amendment approach (U-12A decision-row 11) and the `shp_execution_plans.plan_version` pattern.
- One fulfillment may produce **many operational artifacts** (ADR-033 already permits multi-job SR without schema change; ADR-037 allows 1 SO → N WO; ADR-038 allows 1 SO → N shipments).

### §52 — Fulfillment lifecycle

```
PLANNED  →  ACTIVE  →  PARTIALLY_FULFILLED  →  FULFILLED
               │  └─────────────────────────────┘
               └──►  FULLY_CANCELLED / VOID  (only before/however established by the Fulfillment phase)
```

- The Fulfillment aggregate's own state is **derived/driven by operational events** (an SEA subscription), NOT directly written by JOs/shipments/declarations.
- It must NOT own/mutate SO state directly and MUST NOT own operational state. Its transitions are purely its own composition-progress accounting.
- The **only** source of progress for the composition is the set of events emitted by the existing operational adapters (shipment delivered, WO completed, declaration released, JO completed). Fulfillment *consumes* those and recomputes per-allocated/global progress; it does not *command* operations (SRs do).

### §53 — Commercial amendment vs fulfillment change

- **Commercial amendment** (customer changes WHAT bought / price / scope) → amend the **SO** (new SO revision) exactly as U-12A decision-row 11. The fulfillment composition is *re-planned* from the amended SO, never edited in place to fabricate the commercial change.
- **Fulfillment change** (HOW we execute: different vendor, re-routed leg, re-sequenced shipment split, corrected allocation) → a **fulfillment revision** on the composition, which issues/updates the underlying shipments/SRs/WOs. It NEVER rewrites the SO.
- **Boundary rule**: if the change alters WHAT/price/scope → it is a commercial amendment (SO). If it only alters HOW/allocation/route/split → it is a fulfillment revision. Both are additive/versioned; neither overwrites the other's history.

### §54 — Customer/internal visibility split

- **Customer-facing**: WHAT (SO = order, shipments = tracking of the forwarding part, delivery status, documents). Customer sees order + operational status; NOT the internal composition plan, internal vendors, cost, or SR plumbing.
- **Internal-facing**: the Fulfillment composition, capability allocations, per-SBU breakdown, dispatch/SR status, revenue/cost attribution. This is the ops/commercial-planning view.
- The `SanitizedCustomerTracking` pattern in the shipment domain already demonstrates the sanitized customer DTO; Fulfillment follows it — customer DTOs derive from SO + shipment/milestone, never expose the composition.

---

## F. Business Scenarios (§15) mapped statically to the recommended model

The 15 scenarios validate that Model E (per-SO composition over existing mechanisms) covers all cases without new operational machinery.

| # | Scenario | Model E handling |
|---|----------|------------------|
| 1 | Simple trucking (SO = trucking only) | SO → fulfillment composition w/ TRUCKING allocation → SR → JO. No shipment/declaration. |
| 2 | Domestic forwarding | SO → FORWARDING allocation → shipment (domestic) → legs → SR → trucking JO (+ warehouse allocation). No vessel/BL/declaration in SO. |
| 3 | International forwarding (BYD CKD multi-modal, 40 CTN, 2 shipments) | SO → FORWARDING allocation → **2 shipments** (ADR-038 1:N) → legs (sea + customs + inland) → SR → JO + declaration (ADR-019). |
| 4 | Partial scope (customer owns trucking; Sentralogis = ocean + customs) | SO composition = FORWARDING + CUSTOMS only; NO TRUCKING allocation, NO trucking JO. |
| 5 | Split shipment (SO=50 ctx → Shipment A 20 / B 30) | Fulfillment allocation tracks per-shipment allocated qty; SO ordered qty = Σ allocations. Partial fulfillment state. |
| 6 | Partial fulfillment (SO delivered incrementally) | Composition progress = Σ completed allocations; drives `PARTIALLY_FULFILLED` then `FULFILLED` via events. |
| 7 | Multi-SBU (one SO → forwarding + customs + trucking + warehouse) | ONE composition with 4 capability allocations; do NOT create one SO per SBU. |
| 8 | Multiple WO (one SO → per-SBU WOs) | ADR-037 1 SO → N WO; allocations materialize per-SBU WOs. |
| 9 | Multiple Shipments + WO (SO → N shipments → N WOs) | Composition child allocations each fan to their shipment/WO; lineage preserved back to the single SO. |
| 10 | SO confirmed before any WO exists | SO CONFIRMED is commercial-only (ADR-036); composition PLANNED; WOs/shipments created only at Fulfillment-ACTIVE. |
| 11 | Fulfillment re-planning (vendor/route/split changed) | Fulfillment revision (additive); updates underlying shipment/SR/WO; SO untouched. |
| 12 | Customer amendment (WHAT/price/scope changed) | SO revision (U-12A row 11); composition re-planned from amended SO. |
| 13 | Cancellation | SO cancellable until FULFILLED; composition VOID'd; controlled cascade (shipments `sales_order_id` SET NULL on remove); billing reconciliation in a future phase. |
| 14 | External references (PO/booking/BL/container/declaration/WO/JO — never canonical PKs) | All external refs live on operational objects (shipment has BL/booking refs; SO may hold PO ref); SO/fulfillment never hold canonical operation PKs. |
| 15 | Simple trucking with vendor driver dispatch + GPS | TRUCKING allocation → SR → JO → driver/GPS/telemetry (untouched, protected). |

All 15 scenarios **PASS** in Model E. Scenarios 3, 5, 6, 7, 8, 9 exercise the composition's value (many-to-many without compromising any existing cardinality rule).

---

## G. Model Comparison (§34) — Models A–E

| Criterion | A: SO→Capability→Op | B: SO→Shipment→Op | C: SO→Fulfillment Composition→Shipment/Capability→Op | D: SO→Fulfillment Orders→Shipment/Op | **E: Hybrid (A+C, reuse)** |
|-----------|---------------------|-------------------|-----------------------------------------------------|---------------------------------------|----------------------------|
| New aggregate | none | none (shipment is fulfillment) | NEW Fulfillment composition | NEW Fulfillment Order (≈second SO+shipment) | **Lightweight Fulfillment composition + reuse** |
| Per-SO decomposition slot | absent → bindings mis-scoped | absent → shipment can't cover non-forwarding | present | present (heavy) | **present (thin)** |
| Partial-fulfillment accounting | ad-hoc | forwarding-only | owned | owned (heavy) | **owned** |
| Non-forwarding SO (customs/warehouse only) | works@binding-level, no SO progress | **FAILS** | works | works (over-built) | **works** |
| SO state sourcing (events) | unowned | unowned | owned | owned | **owned** |
| New operational engine | no | no | no | risk (over-build) | **no** |
| Duplicates ADR-020+SR+shipment | no | no | partially (composition is new) | **yes (heavily)** | **no (composition is thin, delegates)** |
| Multi-SBU 1:N | under-typed | **impossible** | yes | yes | **yes** |
| Complexity / build cost | low | low | medium | high | **medium-low** |
| Violates ADR-036 rejected alternatives? | no | shadows shipment | only if composition re-implements ops (we avoid) | yes (second engine) | **no** |

**Recommendation: Model E (hybrid).** Model C's explicit composition is needed (§48), but it must be deliberately **thin** and reuse every existing mechanism (§49, ADR-036 rejected "brand-new fulfillment engine" is honored because Model E's aggregate is composition-only, not an engine). Model B fails on non-forwarding; Model D over-builds and risks duplicating ADR-020/SR/shipment.

### G.4 Model E formal definition

```
       SalesOrder (commercial: WHAT)                         [ADR-034..038]
            │  parent Engagement
            ▼
   ┌─ Fulfillment COMPOSITION (per-SO, versioned) ─────────────── (NEW: PROPOSED)
   │    id, tenant_id, sales_order_id, version_no, status
   │    (PLANNED/ACTIVE/PARTIALLY_FULFILLED/FULFILLED/VOID)
   │    ├── Fulfillment Allocation (per capability)   [NEW: PROPOSED]
   │    │     capability_type, allocated_qty, delivered_qty, status
   │    │     → FORWARDING  → shp_shipments (ADR-038 ref + per-allocation qty)
   │    │     → CUSTOMS     → cus_declarations (ADR-019)
   │    │     → TRUCKING    → svc_service_requests → job_orders
   │    │     → WAREHOUSE   → svc_service_requests → warehouse ops
   │    └── (composition references, NOT operational payloads)
   └───────────────────────────────────────────────
            │  Fulfillment-ACTIVE commands (single handoff, ADR-036)
            ▼
   Operational layer: capability bindings (WHAT included, ADR-020) +
                      shipments / declarations / WOs / SRs (delegated)
```

The **commercial→operational handoff stays exactly one** (ADR-036): `SO(CONFIRMED) → Fulfillment-ACTIVE → capability bindings + service requests + guarded WOs`. The composition does NOT open a second door to operational tables; it is the *scoping/accounting* record the handoff is planed against. Everything ADR-020/033/037/038 governs remains governed there.

---

## §58 — Event Model (proposed, PENDING)

Following SEA and the existing `event_outbox` convention, the only new Fulfillment events are composition-level facts:

- `fulfillment.plan_created` (SO → composition)
- `fulfillment.plan_activated` (boundary handoff begins)
- `fulfillment.allocation.updated` (per-capability progress)
- `fulfillment.partially_fulfilled`
- `fulfillment.fulfilled`
- `fulfillment.plan_cancelled` / `fulfillment.revision_created`

**No** new operational events from the composition itself; it only *consumes* existing operational events (shipment delivered, WO completed, declaration released, JO completed) to recompute progress. This preserves single-authority (SO state mutated only by the SO service; Fulfillment state only by the Fulfillment service; operational state only by its SBU service).

---

## §38 / §42 — Identity, Tenant, Auth, Security (proposed)

- **Tenant**: server-derived from `IdentityContext` (U-01) — never client header/payload. Fulfillment DTO carries NO tenant_id/engagement_id/SO id that the server can derive. RLS `tenant_id = get_my_tenant_id()`.
- **Identity**: PK = DB-generated UUID (ADR-013/035 pattern). Fulfillment **number** — a business number like `FL-…` — MUST be allocated by a canonical server function (`next_fulfillment_number()`), mirroring `next_sales_order()` / `next_quote_number()`. Client MUST NOT generate.
- **Auth**: `assertPermission` (U-02) with existing roles — `commercial:manage/read` for SO/fulfillment planning, `sbu_ops_*`/dispatch for the operational side. No new roles invented.
- **Cross-tenant**: compose every read/write with `tenant_id = context.tenantId`; validate SO/Engagement ownership before composing. Cross-tenant fulfillment lineage is impossible.
- **Security**: composition never holds canonical operational PKs as authoritative (external/operational refs are loose/derived); no browser-direct `supabase.from(...)`; every write server-side.

---

## §56 — Cardinality Matrix (proposed, consistent with ratified ADR-033..038)

| Relationship | Cardinality | Authority |
|--------------|-------------|-----------|
| Engagement → SO | 1 : N | ADR-034 (RATIFIED) |
| SO → Fulfillment composition | 1 : N (per-SO revisions) | **PROPOSED** (this gate) |
| Fulfillment → capability allocation | 1 : N | **PROPOSED** |
| Fulfillment allocation (FORWARDING) → Shipment | 1 : N | ADR-038 (RATIFIED) |
| Fulfillment allocation (CUSTOMS) → Declaration | 1 : N | ADR-019 (RATIFIED) |
| Fulfillment allocation → SR | 1 : N | ADR-033 (RATIFIED, multi-job SR OK) |
| SO → WO | 1 : N; many SO → 1 WO FORBIDDEN | ADR-037 (RATIFIED) |
| WO → WO-item → JO | 1 : N : N | mig 032 (protected) |
| SO → SO sell-lines | 1 : N (future) | PRICING ADR (deferred) |
| **SO → JO** | **FORBIDDEN** | ADR-037/036 |

---

## §57 — Lineage Matrix (deterministic, backward/forward)

- **Forward lineage**: `SO → Fulfillment composition → capability allocation → (shipment / declaration / SR / WO) → (WO-item) / JO`. A child's `sales_order_id` / `work_order_id` / `shipment_id` (declaration) lets you walk back to the allocation and SO.
- **Backward lineage**: from any operational artifact (JO, WO, shipment, declaration), follow the refs to the composition and SO — deterministic, unique SO ancestry.
- **many SO → 1 WO**: absolute **FORBIDDEN** (ADR-037) — no Fulfillment proposal may ever co-own a WO. The composition fans OUT from one SO; it never merges two SOs into one WO.
- **External references** (PO, booking, BL, container, declaration, WO, JO) are NEVER canonical PKs on the SO/fulfillment — they live on operational objects or as non-authoritative text refs.

---

## §33 — Domain Ownership Matrix (updated for Fulfillment)

| Object | Business meaning | Owner | Parent | Child |
|--------|------------------|-------|--------|-------|
| CRM Deals/Quotes | proposal & funnel | Commercial/Sales | Customer | quote items |
| Engagement | long-lived relationship | Commercial | Customer | SO, bindings, shipments, fulfillment |
| **Sales Order** | customer commercial commitment (WHAT) | Commercial | Engagement | (future) SO lines, Fulfillment |
| **Fulfillment composition** | per-SO HOW/plan/progress | **Commercial↔Ops boundary** | SO | capability allocations, shipments (ref), WOs (ref), SRs (ref) |
| Capability Binding | composition membership | Commercial | Engagement | lifecycle |
| Service Request | cross-domain dispatch command | Operations | Engagement/Shipment/Leg/Fulfillment | target-domain result |
| Shipment | forwarding aggregate | Operations/Forwarding | Engagement / Fulfillment allocation | units, legs, manifest, exceptions |
| Declaration | customs operational | Operations/Customs | Shipment/Leg/JO | audit/decisions/prep |
| WO | operational commitment | Ops/SBU | Fulfillment | WO items |
| WO Item | dispatchable revenue line | Ops/SBU | WO | JOs |
| JO | physical execution / cost | Ops/Driver | WO Item | routes/telemetry |

---

## §59 — ADR Proposals (PROPOSED ONLY — NOT ratified, no ADR-033..038 collision)

> U-14 is a discovery gate; NO ADR is ratified here. The following are **PROPOSED** for a future Fulfillment implementation phase. Numbering starts above the ratified Sales Order package (ADR-034..038) to avoid collision.

- **ADR-PROP-039 — Fulfillment is a Composition, not an Engine.** Fulfillment = per-SO versioned composition aggregate that scopes capability allocations and tracks progress; it MUST NOT re-implement operations and MUST delegate all execution to ADR-020/033/037/038 mechanisms. (Directly satisfies ADR-036 "rejected: brand-new fulfillment engine" — honored by keeping it thin.)
- **ADR-PROP-040 — Shipment is NOT the Fulfillment aggregate.** Shipment is the operational forwarding voyage; Fulfillment spans N shipments and N capabilities. SO → many Shipments remains ADR-038.
- **ADR-PROP-041 — Fulfillment Number Authority.** Fulfillment business number allocated only by a canonical `next_fulfillment_number()` server function (mirror ADR-035); client MUST NOT generate.
- **ADR-PROP-042 — Fulfillment Cardinality & Lineage.** SO → Fulfillment 1:N revisions; Fulfillment → allocation 1:N; forward/backward deterministic lineage; **many SO → 1 WO remains FORBIDDEN (ADR-037)**; SO → JO never.
- **ADR-PROP-043 — Fulfillment State & Events.** Fulfillment state mutated only by the Fulfillment service, sourced by operational events (SEA); SO state only by the SO service; no cross-object state authority.
- **ADR-PROP-044 — Commercial Amendment vs Fulfillment Change split.** WHAT/price/scope → SO revision; HOW/allocation/route/split → Fulfillment revision. Never invert.

All are **PROPOSED**; none ratified; so no production migration/ADR file is created by this gate.

### §59.U-14A Ratification Record (2026-08-28)

> **U-14A — FULFILLMENT COMPOSITION ADR RATIFICATION & AUTHORIZATION.** Ratification-only gate; no implementation. The six proposals above were ratified as standalone documents in `docs/architecture/` (same convention as ADR-034..038):
> **ADR-039** (Fulfillment is a Composition, not an Engine) · **ADR-040** (Shipment is NOT the Fulfillment Aggregate) · **ADR-041** (Fulfillment Number Authority) · **ADR-042** (Fulfillment Cardinality & Lineage) · **ADR-043** (Fulfillment State & Events) · **ADR-044** (Commercial Amendment vs Fulfillment Change). Numbering collision: **NONE** (ADR-033..038 preserved; 039..044 occupy the free slot above). All RATIFIED. Full regression 509/509 PASS, 0 TS errors. Implementation remains **DEFERRED** to the Fulfillment Foundation Implementation phase. See `docs/architecture/SENTRALOGIS_PHASE4B_U14A_FINAL_ACCEPTANCE.md`.

---

## H. Critical Questions answered explicitly (consolidated)

| § | Question | Answer |
|---|----------|--------|
| §48 | Is a first-class Fulfillment aggregate REQUIRED? | **YES** — lightweight, composition-only (planning/accounting/state seam); NOT an operational engine. |
| §49 | Can Shipment be the fulfillment aggregate? | **NO** — forwarding-only, can't cover non-forwarding SOs, can't span N shipments/N capabilities; would dirty an operational object (ADR-036/§49). |
| §50 | Multi-SBU composition? | One composition → N capability allocations, each materialized in its SBU's existing mechanism. |
| §51 | Multiple fulfillment plans? | Supported as **versioned revisions** of the single composition (SEA), not parallel competing objects. |
| §52 | Fulfillment lifecycle? | PLANNED→ACTIVE→(PARTIALLY_FULFILLED)→FULFILLED; VOID/CANCELLED; state sourced by operational events. |
| §53 | Commercial amendment vs fulfillment change? | SO revision vs Fulfillment revision split by WHAT-vs-HOW (§E/§53). |
| §54 | Customer/internal visibility split? | Customer sees WHAT + operational status; internal sees composition/allocations/dispatch/cost. |

---

## I. Risks & STOP-Condition Check

| Risk | Class | Mitigation |
|------|-------|-----------|
| Composition becomes a second operational engine | **HIGH** | ADR-PROP-039 hard rule: composition holds refs/plans only; all execution via existing mechanisms. Test: no operational write table imported. |
| Composition co-owns a WO (many SO → 1 WO) | **HIGH** | ADR-PROP-042 keeps ADR-037 absolute; no shared WO vector. |
| Fulfillment state diverges from real ops | **MEDIUM** | Event-sourced (SEA) consumption of operational events; no direct state writes from JOs. |
| Non-forwarding SO under-modeled | **MEDIUM** | Allocations are capability-generic (not forwarding-only). |
| Over-eager build (Model D temptation) | **MEDIUM** | Keep composition thin; reuse; ship in a dedicated Fulfillment phase, not now. |
| SO-line/pricing absence blocks qty accounting | **LOW** | Allocated/delivered qty lives on allocations independent of sell-line pricing (PRICING ADR later). |
| Client-side business-number generation returns | **LOW** | ADR-PROP-041 server authority (mirror ADR-035/U-11). |
| Cross-tenant composition leakage | **LOW** | IdentityContext tenant + RLS + ownership validation. |

| STOP condition | Result |
|----------------|--------|
| A Fulfillment compound duplicates an existing canonical object? | **NO** — composition is new and thin; inventory clean. GREEN |
| Composition re-implements operations? | **NO** (by design; ADR-PROP-039). GREEN |
| Shipment required to be the fulfillment? | **NO** — rejected §49. GREEN |
| New operational engine risk? | None beyond the thin composition, which is delegating. GREEN |
| Violates ADR-033..038? | **NO** — preserves all ratified authority. GREEN |
| Requires direct SO→operational writes? | **NO** — single ADR-036 handoff preserved. GREEN |
| Destructive migration / legacy refactor? | **NO** — deferred + additive-only in any future phase. GREEN |

**No STOP condition fires.** The architecture is discoverable and decidable now; implementation is deferred to a dedicated Fulfillment phase (pending ADR ratification of ADR-PROP-039..044).

---

## J. Implementation Boundary (this gate)

### Build now (U-14)
**Nothing in production.** This is a discovery + architecture decision gate. New artifacts only:
- This decision report.
- `SENTRALOGIS_PHASE4B_U14_FINAL_ACCEPTANCE.md` (final acceptance).
- `lib/__tests__/u14-fulfillment-composition-architecture.test.ts` (architecture/forensic assertions, registered in the runner).

### Build later (a future, separate Fulfillment handoff phase — after ADR-PROP-039..044 ratification)
1. Migration: `fulfillment_compositions` + `fulfillment_allocations` + `next_fulfillment_number()` + RLS (additive only).
2. Fulfillment domain service + `SO(CONFIRMED) → Fulfillment-ACTIVE` boundary command + event sourcing.
3. Allocation→mechanism adapters (reuse SR adapters; NO new engine).
4. UI (ops planning view + customer tracking read).

### Do not build / never build
- No second operational engine, no `Fulfillment` that touches `job_orders`/`work_orders` directly.
- No many-SO→one-WO (ADR-037).
- No client-generated Fulfillment identity/number.
- No Fulfillment state mutation by JOs/shipments/declarations directly.
- No Fulfillment bypassing the ADR-036 single handoff.
- No ratification of any ADR in this gate.

---

## K. Files Changed / Created (this gate)

| File | Change |
|------|--------|
| `docs/architecture/SENTRALOGIS_PHASE4B_U14_FULFILLMENT_COMPOSITION_ARCHITECTURE_DECISION.md` | **NEW** — this decision report |
| `docs/architecture/SENTRALOGIS_PHASE4B_U14_FINAL_ACCEPTANCE.md` | **NEW** — final acceptance |
| `lib/__tests__/u14-fulfillment-composition-architecture.test.ts` | **NEW** — forensic/architecture suite |
| `scripts/run-full-regression.ts` | **MODIFIED** — registered U-14 suite |
| `AGENTS.md` | **MODIFIED** — added U-14 `[DONE]` entry (decision recorded; no invariants changed) |

**No production source, no production migration, no new ADR was created (proposals only, §59).** This gate is read-mostly + additively documented.

---

## L. Verification

```bash
npx tsx scripts/run-full-regression.ts   # 460/460 PASS, 0 FAIL (+ U-14 suite)
npx tsc --noEmit                          # 0 errors
```

---

## M. Conclusion

Fulfillment is the explicit, first-class (but deliberately thin) **composition** seam between the commercial SO and operational execution — **Model E**. It is REQUIRED (§48), it is NOT the Shipment (§49), it preserves every ratified cardinality (ADR-034..038) and the single ADR-036 handoff, and it reuses capability bindings + service requests + shipments + guarded WOs rather than building a second engine. Implementation is DEFERRED to a dedicated Fulfillment phase pending ADR ratification (ADR-PROP-039..044). No production code, migration, or table is touched by this gate.

---

**U-14 COMPLETE — GREEN (decision complete, implementation DEFERRED)**
