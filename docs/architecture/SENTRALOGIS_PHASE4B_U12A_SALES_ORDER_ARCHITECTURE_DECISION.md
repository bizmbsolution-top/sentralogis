# U-12A Sales Order & Commercial Commitment — Architecture Decision Report

**Date:** 2026-08-28
**Gate:** U-12A — Sales Order & Commercial Commitment Architecture Decision Gate
**Depends On:** U-01 → U-12 ACCEPTED/GREEN
**Nature:** **DECISION GATE — forensic + architecture decision only. NO feature implementation. NO production migration.**

**Status: YELLOW — 19/19 FORENSIC ASSERTS PASS, 386/386 FULL REGRESSION PASS, 0 TS errors. Architecture CONDITIONALLY RATIFIABLE; implementation DEFERRED pending the ADR review in §K.**

---

## A. Executive Decision

> **SO RECOMMENDED: CONDITIONAL — YES, as a new canonical "customer commercial commitment" object, but NOT as we would naively guess.**

### Why CONDITIONAL, not a flat YES

A Sales Order is **architecturally justified** — the repository has a real, confirmed gap: after a Quote is accepted (`crm_quotations.status='ACCEPTED'`, `crm_deals.stage='WON'`, Q§U-12/U-11), **nothing represents "the customer committed to a specific order."** Today execution-side writers (`forwarding-writer`, `shipments/route.ts`, `commercial-work-orders/service.ts`) independently call `resolveOrCreateEngagement` and materialize work with **no commercial order record** between acceptance and fulfillment. This is the confirmed MISSING edge from U-12, now formally addressed.

**But** the hypothesis given in the brief — that `commercial_work_orders` is the Engagement and SO should be a *transaction beneath it* — only **half-fits** the repository. The forensic evidence (§C, §E) shows:

1. `commercial_work_orders` is **already a long-lived, per-customer engagement container** (ADR-018) — *not* a transaction. It is keyed **one-open-per-(tenant,customer)**, created as a **blank slate** (`service_scope_id=NULL`, `total_agreed_revenue=0`), with **zero populated line items** despite the dormant `commercial_line_items` table.
2. The dormant `commercial_line_items` table is exactly the seat where **per-order sell-lines should live**, and its parent is exactly the engagement root.
3. There is **no `sales_orders` table, no SO number authority, no SO CRUD, no UI** — the lane is entirely free (U12A-10A/B green).

**Therefore the correct model is a form of Model C (below): SO is a child of the Engagement, transactionally, backed by the dormant `commercial_line_items` line-item mechanism.** SO does **NOT** replace the engagement, does **NOT** replace `work_orders`, and does **NOT** become a second WO.

The recommendation is **CONDITIONAL** because §P (STOP conditions) surfaced several **must-not** constraints and legacy-amendment questions that a **human architecture ratification** (ADR review, §K) must arbitrate before any `sales_orders.sql` migration or server action is built.

---

## B. Domain Definitions (evidence-anchored)

| Term | Definition (as it must be in the target model) | Current repository seat | Evidence |
|------|------------------------------------------------|-------------------------|----------|
| **CRM** | The Sales/Marketing layer that acquires and develops customers, and manages Leads→Deals→Quotes. **Never operational.** | `crm_leads`(dropped→`md_entities`), `crm_deals`, `crm_activities`, `crm_quotations`, `crm_quotation_sections`, `crm_quotation_items`, `crm_sbu_customer_rates` | mig 115/116/120/122; `app/quote/actions.ts` |
| **Customer** | The business party with whom Sentralogis transacts; the tenant-scoped owner of engagements & orders. | `md_entities` (tenant-owned), `crm_deals.entity_id`, `commercial_work_orders.customer_id` | mig 002; `engagement-bridge.ts` |
| **Engagement** | **The long-lived commercial relationship/context between a tenant and a customer.** One `commercial_work_orders` row; one open per (tenant,customer); blank-slate header; aggregates capabilities + orders + shipments + operational detail. | `commercial_work_orders` (ADR-018) | `engagement-bridge.ts:158`; `20260828_014` |
| **Deal / Opportunity** | A CRM funnel record (sale that can be won/lost). Generates Quotes; on WON it may feed order capture. | `crm_deals` (stage PROSPECTING…WON/LOST) | mig 115; `actions.ts` |
| **Quote** | A **commercial proposal** (non-binding sellable offer). CRM-only; acceptance authorizes nothing operationally except setting stage. | `crm_quotations` + items/sections | U-11/U-12; `actions.ts:142-191` |
| **Sales Order (SO)** | **A customer's specific commercial commitment/order.** The authoritative record of "WHAT the customer ordered" (services, scope, price, PO ref, incoterms). Child of an Engagement; 1..N per engagement. **NEW — not yet built.** | *(proposed)* new `sales_orders` + `sales_order_items` (reusing dormant `commercial_line_items` semantics) | U12A §G/E |
| **Fulfillment** | **The plan/boundary of HOW a commitment is fulfilled** — the step where an SO is decomposed into capability-specific execution commitments. The repo already has the composable pieces (bindings + service requests + shipment plans). | `commercial_capability_bindings` (composition), `svc_service_requests` (dispatch), `shp_execution_plans/legs` (route) | ADR-020; mig 003/004/013 |
| **Shipment** | The **operational forwarding aggregate** (a voyage/journey) that executes the forwarding part of an SO. Anchors to the Engagement (`work_order_id → commercial_work_orders`, NOT legacy). 1..N per engagement. | `shp_shipments`, `shp_units`, `shp_execution_legs`, `shp_manifest_items` | mig 003; `types.ts:401` |
| **Service Scope** | **Soft-deprecated.** Formerly the reusable scope definition; vocabulary authority moved to the capability **registry** (U-05). Zero runtime writers. Do NOT resurrect as SO's scope mechanism. | `commercial_service_scopes` (0 writers) | mig 015; `PHASE4B0` reports |
| **Capability Binding** | **Static composition membership** — "this engagement includes CUSTOMS + FORWARDING + TRUCKING." The multi-SBU switchboard (ADR-020). | `commercial_capability_bindings`, `commercial_capability_registry` | mig 013/015/016 |
| **WO (Work Order)** | **The operational commitment** — "WHAT work must we perform to fulfill (an order)." Multi-SBU header historically; the operational truth. | legacy `work_orders` (+ canonical SR/shipment roots) | mig 032; `CreateWOForm.tsx` |
| **WO Item** | A **dispatchable/revenue line** in a WO; tagged sbu_type; decomposes into JOs. | `wo_items` (item_data, max_jo_count) | mig 032/048; `assignmentSave.ts` |
| **JO (Job Order)** | **Actual physical execution** — the fleet/driver task (cost/COGS basis) with routing stops. | `job_orders` (wo_item_id → wo_items) | mig 032/048; `assignmentSave.ts` |

---

## C. Evidence — What the canonical tier ACTUALLY is today

### C.1 `commercial_work_orders` is the LONG-LIVED ENGAGEMENT, not a transaction

- **Full column set** (`20260826_002:30-50`): `id`, `tenant_id NOT NULL→md_tenants`, `wo_number UNIQUE(tenant,customer)`, `customer_id→md_entities`, `service_scope_id` (relaxed to NULL, `014:23`), `contract_reference`, `order_date`, `target_fulfillment_date`, `status com_work_order_status`, `currency`, `total_agreed_revenue=0`, `payment_terms_days=30`, `commercial_notes`, `version_no`, audit.
- **Status enum** (`com_work_order_status`): `DRAFT, SUBMITTED, CONFIRMED, IN_EXECUTION, FULFILLED, BILLED, CLOSED, CANCELLED` (`001:22-24`).
- **No quote/deal FK** — the header carries only `customer_id` → `md_entities`. (`U12A-02`)
- **Partial unique index** `uq_com_wo_open_per_customer(tenant_id, customer_id) WHERE status IN ('DRAFT','SUBMITTED')` (`014:33-35`) → **one open engagement per customer.**
- **resolve-or-create** (`engagement-bridge.ts:158-187,278-294`): creates a **blank slate** (null scope, 0 revenue, DRAFT, one row per tenant+customer). `legacy_wo_bridge` written on genuine creation only (`:182-184`).

**Conclusion:** It is the **relationship/context container**, structurally **capable** of holding many orders (schema has line-items + versioning), but in practice it is **a single open header per customer with nothing transactionally concretized**. This is precisely what makes it a good **Engagement**, and precisely why a transaction object (SO) is needed **below** it.

### C.2 The commercial tier is mostly DDL-only / aspirational

- `commercial_line_items` — table **exists** (`002:53-66`: `work_order_id→commercial_work_orders CASCADE`, `line_sequence`, `service_product_sku`, `service_description`, `quantity`, `uom`, `unit_sell_price`, `total_sell_price`, UNIQUE(wo, seq)). **ZERO runtime writers and ZERO readers.** (U12A-07 pass; PHASE4B0 reports confirm "deployed, EMPTY, zero writers")
- `commercial_service_scopes` — **soft-deprecated** by the capability registry (`015:13-14`). Zero writers.
- `commercial_capability_bindings` / `registry` / `svc_service_requests` — **actively wired** (the U-03/U-05/U-06/U-07/U-08 bridges).

### C.3 Two parallel OPERATIONAL execution models (must not be conflated)

1. **Legacy/haulage engine** — `work_orders → wo_items (wo_id) → job_orders (wo_item_id)`. Legacy `work_orders` is a **hybrid**: it still carries commercial-order bookkeeping (`CreateWOForm.tsx:367-397`) and is the current **invoice root** (`invoice/pdf.ts:86`).
2. **Canonical forwarding engine** — `commercial_work_orders (engagement) ← shp_shipments → shp_execution_plans → shp_execution_legs → svc_service_requests → job_orders`. Shipments anchor to the **engagement** (`003:12`), dispatch legs to trucking JOs via SRs (`execution-plan-service.ts`).

Both converge on `job_orders` = the physical execution unit.

### C.4 `resolveOrCreateEngagement` callers (Q25)

Called from **three** production writers, all on-demand:
- `lib/application/service-contracts/forwarding-writer.ts:175`
- `lib/application/commercial-work-orders/service.ts:126`
- `app/api/v1/forwarding/shipments/route.ts:32`

**Implication:** Today the engagement is created *lazily by operational writers* with **no preceding commercial order**. Under the SO model, the engagement should be created/resolved **at order capture (SO creation)**, and operational writers should reference the already-existing customer commitment. This inverts today's on-demand creation into an explicit commercial-first handoff — **without weakening U-03** (resolve-or-create stays, idempotent).

---

## D. Canonical Lifecycle (Single Authoritative — evidence-based)

```text
                           ┌──────────────────────────────────────────────┐
                           │                  CRM (SALES)                  │
                           │  Lead ─► Deal/Opportunity ─► Quote (+items)    │
                           │  Quote accepted: status=ACCEPTED, stage=WON   │
                           │  (NEVER touches operational tables)           │
                           └───────────────────┬──────────────────────────┘
                                               │  CONVERSION BOUNDARY  (§H)
                                               ▼
                        ┌─────────────────────────────────────────────────┐
                        │            COMMERCIAL LAYER (canonical)          │
                        │  ENGAGEMENT  (commercial_work_orders, ADR-018)   │
                        │     │   one open per (tenant, customer)          │
                        │     │                                            │
                        │     └──►  SALES ORDER (NEW, this gate)           │
                        │             - WHAT the customer ordered           │
                        │             - 1..N per engagement                 │
                        │             - lines = commercial_line_items       │
                        │     │                                            │
                        │     └──► composition: capability bindings (ADR-020)
                        └───────────────────┬─────────────────────────────┘
                                            │  FULFILLMENT BOUNDARY (§H)
                                            ▼
                        ┌─────────────────────────────────────────────────┐
                        │               OPERATIONAL LAYER                  │
                        │  SHIPMENT (shp_shipments→legs) : CUSTOMS (decl)  │
                        │       : WAREHOUSE : TRUCKING                      │
                        │  svc_service_requests ─► job_orders              │
                        │  + legacy work_orders ─► wo_items ─► job_orders   │
                        └───────────────────┬─────────────────────────────┘
                                            ▼
                                  ACTUAL EXECUTION (JO)
```

**Principle preserved (from the brief §46):** CRM=acquire, Quote=propose, **SO=commit**, Fulfillment=plan, WO=operational commitment, WO item=executable unit, JO=execution.

---

## E. Object Ownership & Cardinality

### D. Object Ownership Matrix

| Object | Business Meaning | Canonical Owner | Parent | Child |
|--------|------------------|-----------------|--------|-------|
| CRM Deals/Quotes | proposal & sales funnel | Commercial/Sales | Customer | Quote items/sections |
| **Engagement** | long-lived relationship & context | Commercial (canonical) | Customer (tenant) | SO, capability bindings, shipments, operational bridges |
| **Sales Order** | customer commercial commitment | Commercial (canonical, NEW) | Engagement | SO line items, fulfillment references |
| Fulfillment | plan/how of commitment | Operational-commercial boundary | SO | shipments/declarations/WOs/SRs |
| Shipment | operational forwarding aggregate | Operations/Forwarding | Engagement | units, execution legs, manifest |
| Capability Binding | composition membership | Commercial (canonical) | Engagement | (lifecycle) |
| Service Request | cross-domain dispatch contract | Operations | Engagement/Shipment/Leg | target-domain JO |
| WO | operational commitment | Operations/SBU | Fulfillment | WO items |
| WO Item | dispatchable revenue line | Operations/SBU | WO | JOs |
| JO | actual execution / cost | Operations/Driver | WO Item | job_routes |

### E. Cardinality Matrix

| Relationship | Cardinality | Reason / Evidence |
|--------------|-------------|-------------------|
| Engagement ↔ SO | **1 — N** | One open engagement per (tenant,customer) (`014:33`); N orders per relationship (brief hypothesis). Confirm in §K. |
| Quote ↔ SO | **1 — N** (Quote may seed many SOs via annual contract→monthly SOs); also **0 — N** (direct SO w/o quote) | Brief §5 requires no forced 1:1. Billing contract path exists for warehouse only. |
| SO ↔ Fulfillment | **1 — N** (split/partial fulfillment) | SO=50 ctrs → Shipment A(20) + B(30). §F-6/7. |
| SO ↔ Shipment | **1 — N** (many voyages per order); also partial (one order → many shipments) | `shp_shipments.work_order_id` NOT NULL but NOT UNIQUE (`003:12`, U12A-08B). |
| SO ↔ WO | **1 — N** (one SO can produce many WOs per SBU/complexity). **N SO → 1 WO: NO (invariant)** — WO must not cross orders | §10. Keep WO single-order to protect lineage & billing. |
| WO ↔ WO Item | **1 — N** | wo_items cascade to work_orders (`032:115-123`). |
| WO Item ↔ JO | **1 — N** | one wo_item → N JOs (max_jo_count/unit_count, `assignmentSave.ts`). |
| SO ↔ Capability | **1 — N** (SO requests many SBUs → one multi-band binding set) | ADR-020 UNIQUE(tenant, wo, capability_type) allows CUSTOMS+FORWARDING+TRUCKING+WAREHOUSE. |
| Shipment ↔ Execution Leg | **1 — N** (one shipment, many legs) | `shp_execution_legs` CASCADE to shipment/plan (`003:133-153`). |

---

## F. Forwarding Scenarios

### 1. Domestic Forwarding (Factory A → Port → Warehouse B)
- **SO** holds: customer, PO ref, origin factory, destination warehouse, service=domestic forwarding (truck+warehouse+handling), commercial price. *No driver/plate/booking.*
- **Fulfillment**: capability bindings TRUCKING + WAREHOUSE.
- **Ops**: `shp_shipments` (domestic), legs → `svc_service_requests` → trucking `job_orders`; warehouse via warehouse adapter. **SO ✓ (no routing table).**

### 2. International Forwarding (China → Origin Port → Ocean → Indonesia Port → Customs → Truck → Customer)
- **SO** holds: customer, PO ref, incoterms, origin/dest, service=Int'l forwarding+customs+port+inland truck. **No vessel booking, no BL, no declarations here.**
- **Fulfillment**: bindings FORWARDING + CUSTOMS + TRUCKING.
- **Ops**: `shp_shipments` (multimodal journey) with legs (origin haulage/ocean/customs/inland); declarations attach to shipment+leg (ADR-019); inland leg → trucking JO. **SO stays commercial.**

### 3. Multimodal (Shanghai→Ocean→Singapore→Ocean→Tanjung Priok→Truck→Subang)
- **SO**: origin Shanghai, destination Subang, commercial service (multimodal).
- **Shipment**: one `shp_shipments` (voyage) with multiple `shp_execution_legs` (2 ocean + 1 truck) — the OLD route-plan concept maps to **execution legs**, not SO.
- **Fulfillment**: bindings FORWARDING + TRUCKING. **Legs are operational (§15).**

### 4. Partial-Scope Forwarding (customer owns trucking; Sentralogis = Ocean + Customs only)
- **SO** expresses **only** the services Sentralogis provides (Ocean + Customs). Capability bindings = FORWARDING + CUSTOMS **only**.
- **No TRUCKING binding, no trucking JO.** The customer-owned haulage is out of scope; SO spans only committed capabilities. **Partial scope ✓ — do NOT assume Forwarding=everything.**

### 5. Multi-SBU Order (One SO → Forwarding + Customs + Trucking + Warehouse)
- **One SO** under one Engagement; **one binding set** `UNIQUE(tenant,wo,capability_type)` with 4 rows = ADR-020. **Do NOT create one order per SBU** (explicit §17 constraint).
- Ops: forwarding→shipment, customs→declaration, trucking→JO, warehouse→warehouse ops — all linked to the same engagement. **Multi-SBU ✓.**

### 6. Split Shipment (SO=50 ctrs → Shipment A=20, Shipment B=30)
- **SO** tracks ordered qty (50) in `sales_order_items.quantity`.
- **Shipment A/B** each carry their own unit counts; Fulfillment tracks allocated qty.
- **Remaining quantity = ordered − Σ(shipment.qty)**. Partial fulfillment state on SO. **✓ design.**

### 7. Partial Fulfillment
- SO can be **PARTIALLY_FULFILLED** before **FULFILLED**; WOs/JOs complete incrementally; SO state updates only on fulfillment events (SEA), never directly from JO mutation. **✓ design.**

---

## G. State Machines (single owner per object — no duplicate authority)

| Object | Proposed states | Owner of state |
|--------|-----------------|----------------|
| Quote | (existing) DRAFT→…→ACCEPTED/REJECTED | CRM/Commercial (U-11 authority) |
| **SO** | DRAFT → CONFIRMED → IN_FULFILLMENT → PARTIALLY_FULFILLED → FULFILLED → BILLED → CLOSED; CANCELLED | **SO service (NEW)** — the only writer |
| Fulfillment | PLAN / ACTIVE / DONE (derived from bindings+shipments+WOs) | Fulfillment orchestration |
| WO | (existing legacy) + canonical | Ops/SBU service |
| JO | (existing) draft→assigned→…→completed | assignmentSave / driver actions |

**Rule:** SO state is mutated only by the **SO command service (event-first)**. Operations do NOT mutate SO directly; they emit events that the SO service consumes. This preserves single-authority (priciple: don't duplicate state authority, §G.B).

---

## H. Commercial → Operational Boundary

**The boundary is a command, not a status flip.**

1. **CONVERSION BOUNDARY (Commercial-internal):** `Quote accepted → SO created`. Quoting/sales produces a commercial commitment record. **Still commercial; nothing operational yet.** (U-12 invariant: no Quote→WO.)
2. **FULFILLMENT BOUNDARY (Commercial → Operational):** an authorized command — **`SO(CONFIRMED) → dispatch fulfillment`** — creates capability bindings + issues `svc_service_requests` (which materialize `job_orders`/`cus_declarations`/warehouse ops via adapters), and/or creates WOs via the guarded writers. **This command is the single controlled handoff.** Only this path may create operational records from a commercial intent.

**Nobody but this boundary may turn the SO into WOs/JOs.** No other code may read SO and write `job_orders/work_orders/wo_items` directly (mirrors U-12's "no CRM→WO").

---

## I. Legacy Containment

| Object | Role after SO | Strategy |
|--------|---------------|----------|
| `commercial_work_orders` | **Engagement** (unchanged, ADR-018). Parent of SO. | Keep. No FK to legacy WO (bridge only). |
| `sales_orders` + `sales_order_items` (**NEW**) | Canonical customer commitment + sell-lines. | New; backed by dormant `commercial_line_items` semantics. |
| legacy `work_orders` / `wo_items` / `job_orders` | Operational execution engine (protected lineage `job_orders.wo_item_id→wo_items`). | Keep as operational. **Do not call SO.** Move invoice root toward SO/fulfillment in a future phase. |
| `commercial_service_scopes` | soft-deprecated | Do not resurrect as SO scope; use bindings+registry. |
| `commercial_line_items` | dormant | **Repurpose as SO line-items** (the intended seat). |
| `svc_service_requests` | runtime dispatch contract (**not** an order) | Keep. It is complementary to SO, not a competing order root. |
| `shp_shipments` / legs | operational forwarding aggregate | Keep; anchor to engagement; fulfillment of forwarding scope. |
| `fw_container_items` / `fw_*` | legacy forwarding | Keep as legacy operational; bridge. |

**Competing order roots:** **0** after ratification (SO is the first). No `sales_orders` table exists (U12A-10A green); service scope & line-item are dormant not competing; SR is a dispatch contract, not an order.

---

## J. Risks

| Risk | Class | Mitigation |
|------|-------|-----------|
| `commercial_work_orders` misread as an order (ambiguity) | **HIGH** | Ratify its role as **Engagement** explicitly (ADR). Name it; stop calling it a "work order". |
| SO → two WOs / WO fulfilling two SOs | **HIGH** | Enforce **1 SO → N WO; N SO → 1 WO: NO** invariant in the SO/WO service. |
| SO becoming a "second WO" or CRM staying operational | **HIGH** | Single Fulfillment boundary (§H); no direct CRM/SO→operational writes. |
| stranding legacy `work_orders` as the de-facto order root | **MEDIUM** | Phase the invoice/root migration behind SO; keep operational lineage intact. |
| `commercial_service_scopes` resurrection confusion | **MEDIUM** | Explicitly deprecate; use capability registry. |
| Shipping model (shipment anchors to engagement, NOT SO) mismatch | **MEDIUM** | Decide in ADR whether shipments reference SO (recommended: SO ref on shipment, engagement remains anchor). |
| Split/partial fulfillment accounting drift | **MEDIUM** | SO tracks ordered qty; Fulfillment tracks allocated; single-quantity authority. |
| `total_agreed_revenue` placeholder never populated | **LOW** | SO line-items become the price authority; engagement header derives from SOs. |
| SR idempotency `Date.now()` keys | **LOW/MEDIUM** | Existing debt flagged (U-12 §H); remediate in SO/fulfillment phase. |

No **BLOCKING** risk found — the architecture can be ratified.

---

## K. ADR Recommendations (PROPOSED — PENDING ARCHITECTURE RATIFICATION)

> These were **proposals** at U-12A time. No ADR was ratified by the U-12A gate.
> **Numbering corrected by U-12A-R (2026-08-28):** the original U-12A proposal used ADR-033..037, but ADR-033 was already ratified for the unrelated *"Service Request is a Command, Not a Job"*. The Sales Order ADR package was therefore renumbered to the collision-free **ADR-034..038**. Original proposal numbers are preserved below for forensic traceability; the **authoritative** numbers are the bolded ADR-034..038 reviewed in the U-12A-R ratification package.

- **ADR-034** (was ADR-033) — `sales_orders` = canonical customer commercial commitment; **Engagement → Sales Order 1:N**. RATIFIED (U-12A-R).
- ~~ADR-034~~ (proposal) — SO sell-lines reuse the dormant `commercial_line_items` semantics / `sales_order_items`; SO as **commercial price authority**. NOT in the ratified U-12A-R set — **deferred to a future pricing ADR** (see §L Sales Order definition row / §N).
- **ADR-035** (was ADR-037) — **Sales Order Number Authority**: SO business numbers allocated only by `next_sales_order()` PostgreSQL function (mirror U-11 Quote); **client MUST NOT generate canonical SO identity/number**. RATIFIED (U-12A-R).
- **ADR-036** (was ADR-035) — **Sales Order Fulfillment Boundary**: SO(CONFIRMED) → bindings + service requests + guarded WOs is the **single** commercial→operational handoff. RATIFIED (U-12A-R).
- **ADR-037** (was ADR-036) — **Sales Order → Work Order Cardinality**: **1 SO → N WO; N SO → 1 WO forbidden; WO single-order**. RATIFIED (U-12A-R).
- **ADR-038** (new, was only §L decision-row) — **Shipment → Sales Order Reference**: **1 SO → many Shipments** (partial/split/multimodal/consolidation). RATIFIED (U-12A-R).

---

## L. Decision Matrix (required)

| # | Question | Option A | Option B | Option C | Recommendation |
|---|----------|----------|----------|----------|----------------|
| 1 | Engagement vs SO | Engagement=relationship, SO=transaction (Model C) | SO replaces engagement (Model B) | Engagement only, no SO | **Model C** — evidence: `commercial_work_orders` is already a per-customer relationship container with dormant line-items. |
| 2 | Quote→SO | Quote seeds 1..N SO | 1 Quote=1 SO | Quote→no SO (skip) | **Quote seeds 1..N**; direct SO also valid. Non-operational. |
| 3 | Direct SO | Yes (no Deal/Quote) | No | Only via Quote | **YES** — existing customers order directly (§22). |
| 4 | SO→Fulfillment | Implicit (SO→WO) | Explicit Fulfillment object | Fulfillment = bindings+SR+shipment | **Explicit boundary, reusing bindings+SR+shipment** (no new container). |
| 5 | SO→WO | 1 SO→1 WO | 1 SO→N WO | many SO→1 WO | **1 SO→N WO; many→1 NO** (§10). |
| 6 | SO→Shipment | 1 SO→1 | 1 SO→N | N SO→1 | **1 SO→N shipments** (voyages); partial ok. |
| 7 | Many SO→one WO | Allow | Forbid | — | **FORBID** (invariant). |
| 8 | One SO→many WO | Allow | Forbid | — | **ALLOW** (per SBU/complexity). |
| 9 | Partial fulfillment | Supported | Not | — | **SUPPORTED** (qty tracking, §F-7). |
| 10 | Split shipment | Supported | Not | — | **SUPPORTED** (§F-6). |
| 11 | Amendment | Immutable history + new revision | In-place edit | New SO | **Immutable history + revision** (SEA): new revision, downstream WO unaffected unless re-fulfilled. |
| 12 | Cancellation | Allowed pre-fulfillment | Allowed anytime | Never | **Allowed until FULFILLED**; cascades controlled; billing reconciliation (§21). |

---

## M. API / Identity / Tenant / Auth / Event Cross-Cuts

- **Identity (Q33):** NEW `sales_orders.id UUID` (DB), `sales_order_number` via **`next_sales_order()`** server function (U-11 pattern). **Client MUST NOT generate canonical SO identity or number.** Add `UNIQUE(tenant_id, sales_order_number)`.
- **Tenant (Q31):** SO DTO carries **no** tenant_id/company_id/perusahaan_id/engagement_id that the server can derive. Engagement resolved server-side from customer via `resolveOrCreateEngagement` (identity-context tenant). Client-supplied tenant/engagement → rejected (U-03 T2 pattern).
- **Authorization (Q32):** map to U-02 canonical roles: `commercial:manage` (create/approve/amend/cancel SO), `sbu_ops_*`/`job_order:*` (fulfillment, WO, JO). Reuse `assertPermission`/`assertTenantScope`. No new roles invented.
- **Events (Q34, SEA):** only justifiable events: `SO_CREATED`, `SO_CONFIRMED`, `SO_AMENDED`, `SO_CANCELLED`, `SO_PARTIALLY_FULFILLED`, `SO_FULFILLED`, `SO_CLOSED`. The **SO_CONFIRMED → Fulfillment** event and **Fulfillment → Operational** handoff are the two boundary-crossing events. Use the existing `event_outbox`/audit infrastructure.
- **Pricing/Billing (Q29/Q30):** **SO is the commercial price authority.** Quote → SO copies committed price at acceptance; SO → WO copies into operational; **SO provides billing** (or SO→Fulfillment→Billable Event→Sentrabiz). WO remains revenue basis only via items; JO remains cost basis. Do NOT redesign Finance; only ownership boundary defined here.

---

## N. Implementation Boundary (Requirement §39)

### Build now
**Nothing in production.** This is a decision gate.

### Build later (after ADR ratification — a future phase, e.g. U-13)
1. Migration `sales_orders` + `sales_order_items` (reusing `commercial_line_items` or a new table) + `next_sales_order()` + UNIQUE numbers.
2. Server actions/service: `createSalesOrder`, `confirmSalesOrder`, `amendSalesOrder` (revision), `cancelSalesOrder`; fulfillment boundary command.
3. `<commercial> → fulfillment → WOs/SRs/shipments` handoff adapter.
4. Server `next_sales_order()` number authority (U-11 pattern).

### Do not build / never build
- **No direct Quote→WO / CRM→WO** (invariant).
- **No N SO → 1 WO** (invariant).
- **No client-generated SO identity/number.**
- **No SO CRUD bypassing the SO service** (single authority).
- **No turning SO into a WO, or Engagement into an SO.**

### Needs another architecture gate
- Whether shipments reference **SO directly** (recommended) vs remain engagement-anchored (ADR).
- Invoice root migration from legacy `work_orders` → SO/Fulfillment.
- `svc_service_requests` idempotency-key remediation (pre-existing U-12 §H debt).
- Cross-tenant/multi-SBU SO → WO materialization ordering (one WO per SBU or one aggregate).

---

## O. Required Diagrams (textual)

### Diagram 1 — Commercial Lifecycle
```text
CRM  ─►  Quote  ─►  SO  ─►  Fulfillment
      └accepts┘    (NEW)    (bindings + SR + shipment)
```

### Diagram 2 — Operational Lifecycle
```text
Fulfillment ─► WO ─► WO Item ─► JO
```

### Diagram 3 — Forwarding
```text
SO → Fulfillment → shp_shipments → shp_units → shp_execution_legs → svc_service_requests → JO
```

### Diagram 4 — Multi-SBU
```text
        SO
         │
   Capability Bindings (ADR-020)
   ├── Forwarding ─► Shipment
   ├── Customs   ─► cus_declarations
   ├── Trucking  ─► job_orders
   └── Warehouse ─► warehouse ops
```

---

## P. STOP-Condition Check (Requirement §43)

| Condition | Result |
|-----------|--------|
| SO duplicates existing canonical object? | **NO** — no order root exists; line-items dormant. GREEN |
| Engagement vs SO semantics cannot be separated? | **CAN be separated** (relationship vs transaction). GREEN |
| `commercial_work_orders` semantically ambiguous? | **IF** kept as "work order" yes; **resolved** by ratifying it as **Engagement**. CONDITIONAL-GREEN (must be ratified) |
| Multiple order roots? | **0** after SO (SR is dispatch, not order). GREEN |
| `svc_service_requests` competes with SO? | **NO** — complementary. GREEN |
| Forwarding Shipment conflicts with SO? | **NO** — shipment is operational; anchors to engagement. GREEN (shipment→SO ref = ADR) |
| WO acts as both commercial order + operational commitment? | **YES (legacy, today)** — contained; SO supersedes the commercial half over time. CONDITIONAL |
| Legacy data prevents safe cardinality? | **No** destructive change; additive SO + number authority. GREEN |
| SO requires direct CRM→WO? | **NO** — established Fulfillment boundary. GREEN |
| Destructive migration required? | **NO** — additive only. GREEN |
| Cannot support partial/multimodal/multi-SBU? | **It can** (§F). GREEN |

**No STOP condition fully fires.** The gate is **CONDITIONALLY ratifiable** — the residual decisions are ADR-level (Model C acceptance, shipment→SO reference, WO multi-vs-single order materialization).

---

## Q. Required Output (Requirement §45)

```text
U-12A COMPLETE — YELLOW (CONDITIONAL — ratifiable, implementation deferred)

Sales Order:           CONDITIONAL (recommended: YES, Model C)
Engagement vs SO:      Engagement = commercial_work_orders (relationship, ADR-018);
                       SO = new customer commitment transaction (child, 1..N)  [Model C]
Quote → SO:            1 Quote → N SO; direct SO also valid (non-operational)
Direct SO:             YES (existing customer direct order)
SO → Fulfillment:      Explicit boundary; reuse bindings + svc_service_requests + shipment
SO → Shipment:         1 SO → N shipments (split/partial supported)
SO → WO:               1 SO → N WO; many SO → 1 WO: FORBIDDEN
Many SO → One WO:      NO (invariant)
Partial fulfillment:   SUPPORTED (quantity tracking; SO state via events)
Split shipment:        SUPPORTED (SO qty = ordered; Fulfillment tracks allocated)
Multi-SBU:             SUPPORTED (ADR-020 bindings; one SO, not one per SBU)
Forwarding:            domestic / international / multimodal all supported (SO stays commercial)
Legacy conflicts:      0 (all contained; commercial_line_items dormant; service_scopes soft-deprecated)
Competing order roots: 0
Tenant isolation:      PASS (identity-context derived; DTO has no tenant/engagement authority)
Architecture diagrams: 4 (commercial, operational, forwarding, multi-SBU)
ADR proposals:         5 (originally ADR-033..037, PROPOSED/PENDING RATIFICATION)
ADR renumbering:       U-12A-R corrected to ADR-034..038 (ADDR-033 collision resolved, 2026-08-28)
Production migrations: 0
Implementation:        DEFERRED (U-13, pending ratification)
Final recommendation:  Ratify SO as canonical Customer Commercial Commitment (Model C),
                        with a single Fulfillment boundary and a server-side SO-number authority.
                        Do NOT build SO yet. Confirm ADRs, then implement in a dedicated phase.
Ratification status:   ADR-034..038 RATIFIED by U-12A-R (2026-08-28); U-13 AUTHORIZATION GRANTED.
```

---

## R. Files Changed / Created

**U-12A (original gate):**

| File | Change |
|------|--------|
| `docs/architecture/SENTRALOGIS_PHASE4B_U12A_SALES_ORDER_ARCHITECTURE_DECISION.md` | **NEW** — this decision report |
| `lib/__tests__/u12a-sales-order-architecture.test.ts` | **NEW** — 19 forensic asserts (invariant & object-presence only, NO SO implementation) |
| `scripts/run-full-regression.ts` | **MODIFIED** — registered U-12A suite |

**U-12A-R (ratification & renumbering, 2026-08-28):**

| File | Change |
|------|--------|
| `docs/architecture/ADR-034-engagement-to-sales-order.md` | **NEW** — RATIFIED (Engagement → Sales Order 1:N) |
| `docs/architecture/ADR-035-sales-order-number-authority.md` | **NEW** — RATIFIED (SO number authority) |
| `docs/architecture/ADR-036-sales-order-fulfillment-boundary.md` | **NEW** — RATIFIED (SO fulfillment boundary) |
| `docs/architecture/ADR-037-sales-order-work-order-cardinality.md` | **NEW** — RATIFIED (SO → WO cardinality) |
| `docs/architecture/ADR-038-shipment-to-sales-order-reference.md` | **NEW** — RATIFIED (Shipment → SO reference) |
| `docs/architecture/SENTRALOGIS_PHASE4B_U12A_SALES_ORDER_ARCHITECTURE_DECISION.md` | **MODIFIED** — §K/§Q/§R/§S/§T reflect ADR-034..038 + ratification record |

**No production schema, no runtime source, no production migration was modified by U-12A or U-12A-R.** These are decision/ratification gates.

---

## S. AGENTS.md

Per Requirement §41: **no SO invariants added to AGENTS.md at the U-12A (pre-ratification) gate** — the decision was PROPOSED. The U-12 invariant (Quote is CRM-only; no Quote→WO) remained the operative binding rule.

**Post-U-12A-R update (2026-08-28):** ADR-034..038 are now **RATIFIED**. Per the U-12A-R task (no-implementation / AGENTS.md §51), SO invariants are added to AGENTS.md ONLY after implementation is proven and ratified (U-13). The ratified ADRs are recorded here and in the standalone ADR documents; AGENTS.md invariants await U-13 implementation.

---

## T. U-12A-R Ratification Record (2026-08-28)

> **U-12A-R — SALES ORDER ADR RATIFICATION & RENUMBERING.** This is an architectural ratification only; no production implementation (>§25). Per repository convention, recent ADRs (ADR-030..033) are recorded as standalone documents in `docs/architecture/`; the Sales Order ADR package follows the same convention. No competing decision-log was created.

**Decision: Sales Order architecture ratified.**

- **ADR-034** — Engagement → Sales Order (1:N)
- **ADR-035** — Sales Order number authority (`next_sales_order()`)
- **ADR-036** — Sales Order fulfillment boundary
- **ADR-037** — Sales Order → Work Order cardinality (1 SO → N WO; N SO → 1 WO FORBIDDEN)
- **ADR-038** — Shipment → Sales Order reference (1 SO → N Shipments)

**Numbering correction (forensic traceability):** U-12A originally proposed ADR-033..037. A numbering conflict was discovered during the U-13 authorization gate: ADR-033 already existed and was RATIFIED (2026-08-25) as *"Service Request is a Command, Not a Job"*. The Sales Order ADRs were therefore renumbered to **ADR-034..038**. Existing ADR-033 is retained unchanged. This U-12A report preserves the original proposal numbers for traceability (§19) while the standalone ADRs carry the authoritative numbering.

**Additional ratified semantics (non-ADR, recorded here):**
- **Direct SO = VALID** (a customer may place an SO without Lead/Opportunity/Deal/Quote).
- **Quote → SO = 1:N**, Quote optional; **Quote → WO FORBIDDEN**, **Quote → JO FORBIDDEN**; Quote remains COMMERCIAL/CRM-only.
- **Multi-SBU**: ONE SO may compose multiple capabilities/SBUs; do NOT create per-SBU SOs.
- **CRM semantics**: CRM = acquisition/relationship/opportunity; Quote = commercial proposal; Sales Order = customer commercial commitment.
- **Operational protection**: `work_orders → wo_items → job_orders` preserved; SO MUST NOT replace WO/WO-Item/JO; SO MUST NOT directly create JO.
- **Tenant isolation**: tenant derived from trusted server identity; never `x-tenant-id`/client-provided as authoritative security. Cross-tenant commercial lineage impossible.

**Status:** RATIFIED
**Date:** 2026-08-28
**Implementation:** DEFERRED to U-13
