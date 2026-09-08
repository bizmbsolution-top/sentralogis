# SENTRALOGIS — PHASE 4B DISCOVERY REPORT

## SERVICE CATALOG & COMMERCIAL PACKAGING ARCHITECTURE

**Status:** DISCOVERY COMPLETE — NO PRODUCTION CODE MODIFIED
**Date:** 2026-08-25
**Baseline at Discovery Start:** 543 / 543 tests PASS · `tsc --noEmit` 0 errors
**Baseline Re-verified After Discovery:** 543 / 543 PASS · `tsc --noEmit` 0 errors
**Artifacts Produced:** This document only. Zero migrations, zero schema changes, zero business-logic changes, zero UI changes.

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture](#2-current-architecture)
3. [Repository Findings](#3-repository-findings)
4. [Commercial Domain Findings](#4-commercial-domain-findings)
5. [Existing Service Scope Analysis](#5-existing-service-scope-analysis)
6. [Service vs Capability vs Execution Analysis](#6-service-vs-capability-vs-execution-analysis)
7. [Current Pricing/Tariff Analysis](#7-current-pricingtariff-analysis)
8. [Commercial Packaging Analysis](#8-commercial-packaging-analysis)
9. [Progressive Composition Analysis](#9-progressive-composition-analysis)
10. [Service-to-Capability Mapping](#10-service-to-capability-mapping)
11. [Lifecycle Architecture](#11-lifecycle-architecture)
12. [Multi-Tenant Model](#12-multi-tenant-model)
13. [Customer-Facing Model](#13-customer-facing-model)
14. [Internal Operations Model](#14-internal-operations-model)
15. [Finance Implications](#15-finance-implications)
16. [Control Tower / Intelligence Implications](#16-control-tower--intelligence-implications)
17. [Anti-Pattern Findings](#17-anti-pattern-findings)
18. [Recommended Target Architecture](#18-recommended-target-architecture)
19. [Proposed Conceptual Data Model](#19-proposed-conceptual-data-model)
20. [Proposed API Model](#20-proposed-api-model)
21. [Proposed UI/UX Model](#21-proposed-uiux-model)
22. [Security & Governance](#22-security--governance)
23. [ADR Recommendations](#23-adr-recommendations)
24. [Migration Strategy](#24-migration-strategy)
25. [Risk Assessment](#25-risk-assessment)
26. [Backward Compatibility](#26-backward-compatibility)
27. [Testing Strategy](#27-testing-strategy)
28. [Phase 4C Recommendation](#28-phase-4c-recommendation)
29. [Acceptance Criteria](#29-acceptance-criteria)
30. [Final Gate Decision](#30-final-gate-decision)

---

## 1. EXECUTIVE SUMMARY

Phase 4B discovery audited the entire commercial architecture of Sentralogis to determine whether the platform can evolve from:

```
Commercial Work Order → Capability Binding → SBU Execution
```

into an explicitly separated three-layer model:

```
SERVICE (what is SOLD)
    ↓
CAPABILITY (what ORGANIZATIONALLY OWNS execution)
    ↓
EXECUTION (what OPERATIONS actually EXECUTES)
```

### Verdict in one paragraph

The **architectural foundations required for Phase 4B already exist and are sound**: `commercial_work_orders` (ADR-018 engagement root), `commercial_capability_bindings` (ADR-020 peer capabilities), progressive attachment (ADR-019), and idempotent attachment commands (ADR-021) are all verified clean in code and covered by 543 passing tests. Customs sovereignty is genuinely proven: zero imports from customs domain into forwarding, standalone declarations tested with all cross-domain references NULL. However, discovery uncovered a **critical structural reality that Phase 4B implementation must confront head-on**: the canonical commercial stack (`commercial_work_orders`, `commercial_service_scopes`, `commercial_line_items`) has **zero runtime writers or readers** — it exists only as DDL and prose — while the *de-facto* commercial root in daily operation is the legacy trucking-era `work_orders` table populated by `CreateWOForm`. Pricing is fragmented across five disconnected structures, all keyed by SBU rather than by sellable service. The capability vocabulary (`CUSTOMS/FORWARDING/TRUCKING/WAREHOUSE`) is hard-coded in eight independent locations with a legacy `CLEARANCE` vs canonical `CUSTOMS` naming inconsistency.

### Gate decision

**YELLOW — ARCHITECTURE REQUIRES DECISIONS.**

The target SERVICE → CAPABILITY → EXECUTION architecture is fully designable today and this report specifies it completely (Sections 18–21). But before implementation, the product owner must decide four questions — most critically **the resolution of the dual commercial root** (canonical-dead vs legacy-live), which determines where service activations attach. These are listed exhaustively in Section 30.

### Most material findings (headline list)

| # | Finding | Severity | Evidence |
|---|---------|----------|----------|
| F-01 | Canonical commercial stack (`commercial_work_orders` + scopes + line items + `fin_financial_ledger_entries`) has **zero application writers/readers** — dead DDL | CRITICAL | §4.1 |
| F-02 | Legacy `work_orders` (created as "work_orders (trucking)") is the de-facto commercial root; every purchase flow writes there | CRITICAL | §4.1 |
| F-03 | `commercial_service_scopes` fuses three concepts (catalog template + contract terms + operational lane) and is unused; Forwarding UI fabricates random UUIDs for `service_scope_id` | HIGH | §5 |
| F-04 | Two competing composition mechanisms coexist unreconciled: `svc_service_requests` (execution command bus) vs `commercial_capability_bindings` (capability registry) | HIGH | §6 |
| F-05 | Pricing lives in 5 disconnected places, all SBU-keyed; no service-level tariff engine exists (`commercial_pricing_tariffs` was planned but never created) | HIGH | §7 |
| F-06 | Capability type hard-coded at 8 sites incl. DB CHECK constraint; legacy vocabulary uses `CLEARANCE` vs canonical `CUSTOMS` | MEDIUM | §17 |
| F-07 | Forwarding is de-facto orchestrator parent: `source_domain DEFAULT 'FORWARDING'`; execution-plan dispatch fabricates customs parameters (hard-coded office code `'040300'`) | MEDIUM | §3 |
| F-08 | Warehouse ServiceRequest adapter persists nothing (stub); Trucking adapter omits NOT NULL `wo_item_id` | HIGH | §3 |
| F-09 | `/api/v1/*` auth helpers fall back to unauthenticated `x-tenant-id` header / `?tenant_id` query with service-role clients → tenant impersonation risk | HIGH | §22 |
| F-10 | Billing derived client-side from operational flags (`is_doc_finished`/`is_cost_finished`) rather than agreed commercial terms | MEDIUM | §4 |

---

## 2. CURRENT ARCHITECTURE

### 2.1 What Phase 4A established (verified intact)

| ADR | Decision | Verification Result |
|-----|----------|---------------------|
| ADR-018 | Reuse `commercial_work_orders` as canonical commercial engagement root | Schema confirmed (`20260826_002_commercial_and_service_scopes.sql:29-50`). ⚠️ But see F-01/F-02: no runtime usage. |
| ADR-019 | Nullable cross-domain references on `cus_declarations` (`shipment_id`, `execution_leg_id` FKs `ON DELETE SET NULL`; `job_order_id` UUID without FK) | Confirmed (`20260827_013:37-46`; `lib/domain/customs/types.ts:117-120`; factory defaults null at `declaration-factory.ts:51-54`) |
| ADR-020 | `UNIQUE(tenant_id, work_order_id, capability_type)` peer-capability uniqueness | Confirmed (`20260827_013:31`) |
| ADR-021 | Idempotent conflict-aware attachment commands (`ALREADY_ATTACHED` / `CONFLICT` 409 / `FORBIDDEN` 403) | Confirmed (`lib/domain/customs/attachment-service.ts:41-170`; tests 11–17 of Phase 4A suite) |

### 2.2 Verified layer separation status

```
LAYER            OBJECT                          STATE
─────────────────────────────────────────────────────────────────
Commercial       commercial_work_orders          SCHEMA ONLY (dead)
                 commercial_capability_bindings  LIVE via 1 API route (registry-only)
                 svc_service_requests            LIVE (execution command bus)
                 work_orders (LEGACY)            LIVE DE-FACTO COMMERCIAL ROOT
                 wo_items + unit_price           LIVE DE-FACTO PURCHASE LINES
─────────────────────────────────────────────────────────────────
Capability       capability_type enum            LIVE but hard-coded ×8
                 binding lifecycle matrix        CODED BUT API-UNREACHABLE
                                                 (GET/POST only; no PATCH)
─────────────────────────────────────────────────────────────────
Execution        cus_declarations + engines      LIVE, SOVEREIGN, TESTED
                 shp_shipments + legs/units      LIVE (v1 API)
                 fw_consolidations (legacy)      LIVE (parallel generation)
                 job_orders (trucking)           LIVE, PROTECTED SYSTEM
                 wh_* warehouse objects          LIVE
─────────────────────────────────────────────────────────────────
Finance          invoices/invoice_lines          LIVE (legacy, weak RLS)
                 fin_financial_ledger_entries    DEAD (canonical, unwritten)
```

### 2.3 Invariants confirmed standing

1. ✅ Customs remains standalone — zero imports from `lib/domain/customs/**` into shipment/forwarding modules; Test 02 of Phase 4A suite creates declaration with all cross-domain refs NULL.
2. ✅ Forwarding is never a prerequisite for Customs.
3. ✅ Shipment is not a universal root — `shp_shipments.work_order_id` is NOT NULL pointing *down* to commercial, correct direction.
4. ⚠️ Commercial Work Order remains canonical root **by declaration, not by usage** (F-02).
5. ✅ Capability remains a peer concept.
6. ✅ SBU sovereign over execution.
7. ⚠️ Commercial layer owns what customer buys — currently ambiguous (legacy WO items are both purchase record AND execution container).
8. ❌ Finance owns financial truth — violated today: revenue truth triplicated (`wo_items.total_revenue`, `invoices.total_billing`, unwritten `fin_financial_ledger_entries`).
9. ✅ No browser-direct DB access in canonical areas (customs workspaces, clearance pages: 0 hits).
10. ✅ No cross-tenant leakage in canonical APIs (attachment guards verified) — but see F-09 for v1 helper fallback risk.
11. ✅ No mutation of protected systems during discovery.

---

## 3. REPOSITORY FINDINGS

### 3.1 Customs domain (SBU CUSTOMS)

**Execution object inventory (all live, tenant-scoped):** `cus_declarations`, `cus_classification_lines`, `cus_declaration_documents`, `cus_item_audit_logs`, `cus_declaration_validation_runs`, `cus_declaration_exceptions`, `cus_ceisa_preparations`, `cus_ceisa_validation_results`, `cus_declaration_audit_events`, `cus_customs_decisions`, SKU intelligence tables, plus domain engines (validation, classification, tax calculator, CEISA XML/EDI serializers, audit integrity).

**Coupling analysis:**
- Customs → commercial: one-way type import only (`attachment-service.ts:19-23` imports `../commercial/types`). Acceptable vocabulary dependency.
- Customs → shipment/trucking: **zero imports**. Attachment is additive, nullable, idempotent.
- Known gap: `cus_declarations.job_order_id` has no FK constraint ("maximum flexibility" per `20260827_013:43-46`) — integrity enforced only in application code.

### 3.2 Forwarding domain (SBU FORWARDING)

Two full generations coexist:

| Generation | Schema | API | Domain lib |
|-----------|--------|-----|------------|
| Legacy (Jul 2026) | `fw_consolidations`, `fw_price_master`, `fw_container_assignments/items`, `fw_order_headers` | `app/api/forwarding/**` | `lib/domain/forwarding/` |
| Canonical v1 (Aug 2026) | `shp_shipments`, `shp_units`, `shp_execution_legs`, … | `app/api/v1/forwarding/**` (~20 routes) | `lib/domain/shipment/` |

No deprecation bridge except read-compat views (migration 007). The legacy generation contains commercial data duplication (`fw_container_items.sell_price_snapshot` + 9 COGS columns, written at `app/api/forwarding/wo/route.ts:195-204`) and an unauthenticated `tenant_id`-from-body write surface (`wo/route.ts:12,26`).

**Orchestration bias:** `svc_service_requests.source_domain TEXT DEFAULT 'FORWARDING'` (`20260826_004:15`); source enum limited to `FORWARDING|COMMERCIAL` (`lib/domain/service-contracts/types.ts:24-26`); `execution-plan-service.ts:132-152` dispatches CUSTOMS legs with fabricated parameters including hard-coded `customs_office_code: '040300'` and fallback CIF `|| 10000`.

### 3.3 Trucking domain (PROTECTED)

- Parent chain: `job_orders.wo_item_id NOT NULL → wo_items → work_orders` (`032_rename_enterprise_tables.sql:129-132`). No shipment reference anywhere. ✅ Not shipment-rooted.
- Carries embedded commercial fields: `estimated_margin`, `driver_revenue_share` (`035_complete_trucking_columns.sql:27,35`). Untouched in this phase per invariant #11.
- ⚠️ Suspected mismatch: `TruckingServiceRequestAdapter.execute()` inserts `job_orders` without `wo_item_id` (`trucking-adapter.ts:73-86`) against a NOT NULL column — flagged for runtime verification, NOT modified here.

### 3.4 Warehouse domain

Rich execution model (`wh_receipt_orders`, `wh_outbound_shipments`, `wh_tasks`, `wh_vas_orders`, stock opname, repacking…) executed largely through shared `job_orders` rows with `sbu_type='WAREHOUSE'`. **But** the canonical `WarehouseServiceRequestAdapter` is a stub returning a generated UUID with note "Warehouse handling job queued" — persisting nothing (`warehouse-adapter.ts:37-55`).

---

## 4. COMMERCIAL DOMAIN FINDINGS

### 4.1 What currently represents a customer purchase? (Objective A answers)

**Q1 — Customer purchase:** Today it is the **legacy `work_orders` table** (migration `032_rename_enterprise_tables.sql:94-108`, commented "work_orders (trucking)") plus its `wo_items` children carrying `unit_price` / `total_revenue` (`048_add_wo_item_revenue_columns.sql:6-7`). Every real purchase flow writes there: HQ multi-SBU form (`CreateWOForm.tsx:391,436-457`), forwarding WO API (`app/api/forwarding/wo/route.ts:54-69`).

The canonical `commercial_work_orders` — declared the engagement root by ADR-018 — has **zero application writers/readers**. Grep across all `.ts/.tsx` returns only comments. It cannot even be instantiated trivially because `service_scope_id` is NOT NULL referencing an unseeded table.

**Q2 — Operational capability:** `commercial_capability_bindings.capability_type` — live via exactly one production endpoint (`app/api/v1/commercial/work-orders/[id]/capabilities/route.ts`), registry-only (no priced order line, no execution artifact created on activation).

**Q3 — Execution:** The four SBU domains' operational objects (Section 3). Clean.

**Q4 — Are Service and Capability mixed?** Yes, in two ways:
1. Capability bindings accept freeform `pricing JSONB` directly from the HTTP body (`capabilities/route.ts:78`) with no validation, no service reference, no price versioning — a capability row doubles as an unpriced sellable line.
2. Everywhere else in CRM/billing, the *sellable product* is keyed by `sbu_type` — i.e., the organizational unit IS the product vocabulary. Two parallel vocabularies for the same four buckets, never reconciled.

**Q5 — Duplicate commercial truth?** Extensively:
- Two WO masters (canonical dead vs legacy live).
- Three copies of forwarding revenue truth (`fw_price_master` rates → `fw_container_items.sell_price_snapshot` → `wo_items.unit_price/total_revenue`), none linked to `commercial_line_items`.
- Invoice totals recomputed client-side from `wo_items`/JO counts (`hq/invoice-customer/page.tsx:157-160`).
- Revenue in three ledgers that do not reconcile (`wo_items.total_revenue`, `invoices.total_billing`, unwritten `fin_financial_ledger_entries`).

**Q6 — Multiple services per purchase?** Yes, via legacy mechanism only: one `work_orders` row with multiple `wo_items` each tagged `sbu_type` (multi-SBU quotation sections mirror this pre-sale: `crm_quotation_sections.sbu_type UNIQUE(quotation_id, sbu_type)`).

**Q7/Q8 — One service ↔ N capabilities / one capability ↔ N services?** Neither direction is representable today. There is no service entity at all. Closest artifacts: `md_services` charge-code catalog (shape-correct: `charge_code`, category, `default_uom`, COA links — but carries no price and its RLS is fully open); `svc_service_requests.service_product_sku` free-text SKUs (`TRK_CONTAINER_HAULAGE`, `WH_CROSSDOCK_STAGING`, `CUS_IMPORT_PIB_STANDARD`) with no SKU catalog behind them.

**Q9 — Independent activation?** Customs proven independent (Phase 4A tests). At commercial layer, capability activation requires a `commercial_work_orders` row that nothing can create → practically unreachable.

**Q10 — Add services after engagement starts?** Only through Phase 4A POST capabilities endpoint (idempotent create/reactivate verified, `capability-binding-service.ts:87-119`). Gaps: no PATCH/status-transition endpoint exists (binding can only ever be ACTIVE — lifecycle matrix coded at lines 124-150 but API-unreachable); activation creates no priced line; and it targets the dead canonical root. Practically, post-engagement addition = editing a legacy WO in CreateWOForm edit mode.

### 4.2 FK conflation alert (latent bug)

`svc_service_requests.work_order_id` has `REFERENCES commercial_work_orders(id) ON DELETE RESTRICT` (`20260826_004:19`), but the only writer passes an ID generated from the **legacy** `work_orders` table (`app/api/forwarding/wo/route.ts:54-69` → `:128`). Either the canonical migrations are not applied to the live DB, or every forwarding dispatch violates the FK. **Must be resolved during Phase 4B implementation planning — it is direct evidence that "the commercial root" question is not academic.**

### 4.3 Client-fabricated foreign keys

`s bu/forwarding/shipments/create/page.tsx:35` generates `service_scope_id: crypto.randomUUID()` in the browser because no scope rows exist to select. The canonical schema's own mandatory reference is being satisfied with garbage. Any future feature joining through `service_scope_id` will silently resolve nothing.

---

## 5. EXISTING SERVICE SCOPE ANALYSIS

### 5.1 Actual semantics of `commercial_service_scopes` (Objective B)

Column-by-column reading of `20260826_002:7-27`:

```sql
scope_code TEXT, scope_name TEXT,
incoterm com_incoterm_type DEFAULT 'DAP', incoterm_named_place TEXT,
origin_scope_node_id → md_locations, dest_scope_node_id → md_locations,
included_services TEXT[] DEFAULT '{}', excluded_services TEXT[] DEFAULT '{}',
billing_currency TEXT DEFAULT 'IDR', is_active BOOLEAN, version_no INTEGER,
UNIQUE (tenant_id, scope_code)
```

**Verdict: it is a MIXTURE OF ALL FOUR candidate meanings, owned by nobody, used by no one.**

1. **Contract/commercial terms:** `incoterm`, `incoterm_named_place`, `billing_currency` → customer-agreement semantics (Incoterms belong to a *deal*, not to a catalog entry).
2. **Service catalog template:** `included_services[]` / `excluded_services[]` → freeform text arrays, no FK to any catalog entity, no structure (no qty, uom, price).
3. **Operational lane:** `origin_scope_node_id`/`dest_scope_node_id` → a specific origin→destination scope (a lane, not a product).
4. **Pricing structure:** absent entirely (only currency).

Zero `.ts/.tsx` references. Its only indirect consumer is `shp_shipments.service_scope_id` (required by `shipment-factory.ts:51`), which the UI satisfies with fabricated UUIDs (§4.3). Meanwhile `commercial_work_orders.service_scope_id NOT NULL` means the canonical WO cannot be populated without seeded scopes that nothing seeds.

### 5.2 Is a canonical `service_catalog` required?

**YES — and it must NOT be `commercial_service_scopes` re-used.** Evidence-backed reasoning:

- A sellable Service needs: stable code, name, category, default UOM, capability mapping, tax treatment hint, lifecycle state, versioning, availability control. `commercial_service_scopes` has almost none of these and its existing columns bind it to Incoterm/lane semantics that would pollute a catalog.
- The repository already contains the *seed* of a correct shape in `md_services` (charge_code + category + default_uom + COA linkage) and `crm_sbu_customer_rates` (per-customer UOM incl. CONTAINER, pricing types ONE_TIME/RECURRING_MONTHLY/PER_ACTIVITY). A canonical catalog should unify these vocabularies, then those legacy structures become either views or adapters.
- `commercial_pricing_tariffs` was planned in `SENTRALOGIS_LEGACY_MIGRATION_MATRIX.md:29` as adaptation of `fw_price_master` — never created. Phase 4B is the natural home for this plan, generalized beyond forwarding.

---

## 6. SERVICE vs CAPABILITY vs EXECUTION ANALYSIS

### 6.1 Current conceptual state

| Concept | Where it lives today | Health |
|---------|----------------------|--------|
| SERVICE | Nowhere as first-class entity. Ghost vocabulary: free-text SKUs (`CUS_*`, `TRK_*`, `WH_*`), `md_services` charge codes (no prices), `crm_sbu_customer_rates.service_name` (CRM-side) | ABSENT |
| CAPABILITY | `commercial_capability_bindings.capability_type` (registry); `svc_service_requests.target_domain` (routing) | PRESENT but hard-coded ×8, lifecycle half-exposed, `CLEARANCE≠CUSTOMS` drift |
| EXECUTION | Four SBU domains | HEALTHY, SOVEREIGN, TESTED |

### 6.2 Two competing composition mechanisms (must be reconciled, not merged blindly)

**Mechanism 1 — `svc_service_requests`:** inter-domain execution command bus. Typed payloads per SBU (`TruckingServicePayload`, `CustomsServicePayload`, `WarehouseServicePayload`), SLA contracts, idempotency keys, adapters. Strengths: real orchestration semantics. Weaknesses: forwarding-biased defaults, warehouse stub, trucking adapter schema violation, SKUs uncatalogued.

**Mechanism 2 — `commercial_capability_bindings`:** coarse-grained peer-capability registry under the engagement. Strengths: idempotent, unique-constrained, lifecycle states defined, tested. Weaknesses: registry-only (creates nothing operationally), pricing JSONB unvalidated, lifecycle unreachable via API.

**Target reconciliation (design, not implementation):** these are *different layers* pretending to compete. Capability Binding answers "which SBUs are engaged on this commercial engagement?" Service Activation (new, Section 19) should answer "what did the customer buy?" and `svc_service_requests` remains the *execution command channel* between activations and SBU jobs. Composition flow becomes:

```
Service Activation (commercial truth: what was sold)
    ↓ (on activation, per mapped capability)
Capability Binding (engagement-level SBU registry)   [existing, ADR-020]
    ↓ (when execution is actually needed)
svc_service_requests → SBU adapters                  [existing, hardened]
    ↓
Execution objects (cus_declarations / shp_shipments / job_orders / wh_*)
```

This preserves both Phase-4A and Phase-3B investments without redesign.

---

## 7. CURRENT PRICING/TARIFF ANALYSIS

### 7.1 Inventory (five disconnected structures)

| Structure | Unit model | Sell/Cost | Customer-specific? | Verdict |
|-----------|-----------|-----------|--------------------|---------|
| `crm_sbu_customer_rates` (`122_multi_sbu_quotation.sql:5-24`) | `(tenant, customer, sbu_type, service_name)` + `uom` (CBM/KG/PALLET/CONTAINER/TRIP/DOCUMENT) + `pricing_type` (ONE_TIME/RECURRING_MONTHLY/PER_ACTIVITY) + min_qty + lanes | Sell only | YES | Best sell-side shape; wrong key (sbu_type), CRM-side, disconnected from billing |
| `fw_price_master` (`171:10-41`) | Per lane+type+container+effective date; `sell_price`/container + `sell_per_cbm`/`sell_min_cbm` | Sell + 9-column COGS breakdown | NO (market rate card) | Richest cost model; port haulage exists only as embedded COGS component of bundled route price — not separately sellable |
| `md_billing_rates` (`028:300-316`) | Per storage contract, charge codes STR-*/HD-*, free-text uom, validity window | Sell only (cost absent) | YES (contract-scoped) | Warehouse negotiated pricing; conversion target of quotation RPC |
| `crm_quotation_items` (`120`) | qty × uom(free text) × unit_price, trigger-computed subtotal/tax | Sell only | YES (via quote→rate copy `152:100-163`) | Pre-sale only |
| `wo_items.unit_price/total_revenue` (`048`) | Implicit per-item snapshot at WO creation | Sell only | Snapshot | De-facto agreed-price store; recomputed again client-side for invoicing |

Cost side additionally scattered: `job_orders.base_price/purchase_price/vendor_invoice_amount/driver_share_percentage` (`034:37-42`), `extra_costs` (billable flags, `tax_id`), `vendor_invoices`.

### 7.2 Can current structures answer Objective D?

- **"PORT_HAULAGE = Rp X / container":** ❌ Not as a first-class sellable. Port haulage appears only inside `fw_price_master` COGS decomposition (`cogs_port_haulage_origin/dest`). The *shape* to express it exists twice (`crm_sbu_customer_rates.uom='CONTAINER'`; `commercial_line_items.unit_of_measure`), but no catalog entity, no price versioning, no effective-dating outside forwarding.
- **Customs Clearance pricing:** only as `crm_sbu_customer_rates.sbu_type='CLEARANCE'` rows or quotation lines — vocabulary mismatch with canonical CUSTOMS included.
- **Documentation Fee / Lartas Handling:** expressible as `md_services` charge codes (category CLEARANCE/ADMIN, uom DOC) but priceless — no rate attached anywhere systematic.
- **Margin by service:** ❌ impossible today. Margin is computable per-domain (forwarding snapshots; trucking JO joins) but there is no join key from any agreed price line to a Service identity.

### 7.3 Required target properties (for Section 19 design)

1. Price attaches to **Service**, optionally scoped (tenant-wide vs customer-specific vs lane-specific).
2. **Versioned & effective-dated** (proven need by `fw_price_master.effective_date`; quotations snapshot at acceptance).
3. **UOM-typed** with constrained vocabulary (CONTAINER, CBM, KG, TRIP, DOC, PALLET, MONTH, SHIPMENT, ACTIVITY).
4. **Sell and cost separated** (cost stays with capability/SBU procurement; sell belongs to commercial).
5. Currency explicit everywhere (currently IDR-defaulted inconsistently; some pages hardcode `formatRupiah`).
6. Tax deferred to invoice layer (current consistent pattern) but catalog may carry a default tax class hint.

---

## 8. COMMERCIAL PACKAGING ANALYSIS

### 8.1 Should a package be catalog template, customer config, or both?

**Both — two distinct entities (Objective E).** Repository evidence:

- Sales already sells bundles pre-configured per customer: multi-SBU quotation sections (`122:46-67`) with per-SBU approval workflow → the *customer configuration* concept exists de-facto.
- Nothing reusable exists: every bundle is hand-assembled per quote. Recurring bundle patterns (e.g., "Ocean Freight + Import Clearance + Port Delivery") are re-priced from scratch each time → the *template* concept is missing and demonstrably causes duplicated effort.
- `commercial_service_scopes.included_services[]` attempted templates as text arrays and failed (unstructured, unused) — evidence that templates must reference catalog entities by FK, not free text.

### 8.2 Target composition chain (conceptual)

```
Service Catalog                    (platform master + tenant overlay)
      ↓
Service Package Template           (reusable bundle: ordered service items,
      ↓                             optional default quantities/uoms, constraints)
Customer Commercial Engagement     (= commercial_work_orders, ADR-018 preserved)
      ↓
Activated Services                 (engagement-scoped instances, independently
      ↓                             lifecycled, individually priced snapshots)
Capabilities                       (existing commercial_capability_bindings)
      ↓
Execution                          (existing SBU objects)
```

Package rules discovered as necessary from business tests (Section 9 / critical tests): packages must support *subset activation* (customer buys Full Logistics but operations may start Customs first), *progressive addition* (activate remaining package items later), *single-service suspension without sibling impact*, and *price overrides per customer* while retaining template lineage for reporting.

---

## 9. PROGRESSIVE COMPOSITION ANALYSIS

All four scenarios validated conceptually against actual repository mechanisms:

### SCENARIO 1 — Day 1: Customs Clearance only
**Supported today (proven by test):** Phase 4A Test 01–05 create standalone customs under a commercial WO with zero shipment dependency. Gap: the WO itself must exist in canonical table (creation path missing, F-01/F-02). With Service layer: `ACTIVATE(service=CUS_IMPORT_CLEARANCE)` → maps to capability CUSTOMS → binding ACTIVE → declaration created. No Shipment required. ✅ design-clean.

### SCENARIO 2 — Day 2: add Port Delivery
Mechanism exists: new capability binding TRUCKING on same WO (Test 06 proves binding-level addition without touching declaration). Attachment of `cus_declarations.job_order_id` via `attachTrucking` (Test 07: declaration ID/AJU/hash chain unchanged). Gap: binding activation still creates no Job Order — the operational instantiation step is precisely where `svc_service_requests` + trucking adapter must be hardened (and its `wo_item_id` violation fixed) during implementation.

### SCENARIO 3 — Day 3: add Ocean Freight
Forwarding capability activates; `shp_shipments` created under same `work_order_id` (schema supports: `work_order_id NOT NULL`); existing declaration attaches `shipment_id` via `attachShipment` — idempotent, hash-chain preserving (Tests 08, 11–13 prove ALREADY_ATTACHED/CONFLICT semantics). No recreation. ✅

### SCENARIO 4 — Full Logistics from day one
Multiple services activate initially; each SBU sovereign (Test 09 resolves 4 peer active capabilities). With Service layer, Full Logistics = Package Template with 4+ items → N activations → ≤4 distinct capabilities. ✅

### Suspension/removal (Critical Test 8)
Binding lifecycle already defines `ACTIVE→SUSPENDED` transitions in code (`capability-binding-service.ts:128-133`), and uniqueness guarantees siblings unaffected. Missing pieces for implementation: PATCH endpoint for transitions (currently unreachable), and definition of what suspension means downstream (stop new ServiceRequests; do not cancel in-flight executions — SBU sovereignty).

---

## 10. SERVICE-TO-CAPABILITY MAPPING

### 10.1 Cardinality determination (Objective H)

Repository + business evidence forces **N:M** (many-to-many):

- **1 Service → 1 Capability (majority case):** Import Clearance→CUSTOMS; Port Delivery→TRUCKING; Storage→WAREHOUSE; FCL/LCL Freight→FORWARDING.
- **1 Service → N Capabilities (real cases already sold today):** "Door-to-Door Logistics" spans FORWARDING+TRUCKING (+WAREHOUSE when cross-dock); legacy `CreateWOForm` bundles exist precisely because customers buy outcomes spanning SBUs; `fw_container_items` links separate pickup/port-haulage/last-mile WOs proving ops already decomposes one commercial outcome into multiple SBU executions.
- **N Services → 1 Capability:** Customs SBU clearly provides Import Clearance, Export Clearance, PPJK, PIB Prep, PEB Prep, Lartas Verification, SPPB — the mission statement itself enumerates eight customs services.

A pure 1:1 or N:1 design would require structural hacks for door-to-door; a pure M:N-only design overcomplicates the 90% single-mapping case. **Resolution: `service_capabilities` junction with the common case expressed naturally (one row), multi-capability services supported by additional rows.** No redesign needed when a previously-single service gains a second capability — additive junction row.

### 10.2 Mapping governance

Mappings are **catalog metadata** (owned by commercial/platform layer), not runtime discoveries. Execution routing consults the mapping at activation time; SBU adapters remain authoritative for *how* execution happens.

---

## 11. LIFECYCLE ARCHITECTURE

### 11.1 Proposed service lifecycle (conceptual)

```
DRAFT → QUOTED → ACCEPTED → CONTRACTED → ACTIVATED → IN_EXECUTION → COMPLETED → CLOSED
                                                                    ↘ SUSPENDED ↖ (re-activate)
                                              CANCELLED (from any pre-ACTIVATED state;
                                              suspension-with-teardown from ACTIVATED+)
```

### 11.2 Independence boundaries (Objective F)

Discovery finds **four distinct lifecycles already exist** and must NOT be collapsed:

| Lifecycle | Owner | Current carrier | Evidence |
|-----------|-------|-----------------|----------|
| Commercial engagement | Commercial | `com_work_order_status` DRAFT→SUBMITTED→CONFIRMED→IN_EXECUTION→FULFILLED→BILLED→CLOSED→CANCELLED (`001:21-26`) | Canonical |
| Service | **NEW (Phase 4B)** | — | Must be independent: one engagement's services complete at different times (Scenario tests 6–8) |
| Capability binding | Commercial/ops boundary | ACTIVE/SUSPENDED/COMPLETED/CANCELLED (`013:20`) | Exists; API surface incomplete |
| Operational execution | SBU | Per-domain statuses (cus_declarations 18-step lifecycle; JO statuses; shipment milestones) | Sovereign — MUST NOT drive commercial status directly |
| Billing | Finance | invoice draft/sent/accepted/paid (`046`) | Currently coupled to operational flags (`is_doc_finished` → `ready_billing_at` trigger, `163:7-54`) — anti-pattern #8/§17 |

**Boundary rules derived from findings:**
1. Service IN_EXECUTION derives from *its mapped capabilities'* binding states, never directly from SBU row statuses.
2. Service COMPLETED requires all mapped capabilities COMPLETED (or explicit commercial override — waiver pattern already precedented in customs decisions governance).
3. Engagement FULFILLED requires all non-cancelled services COMPLETED.
4. Billing eligibility reads **service/agreement state**, not `is_doc_finished` flags — this decouples finance from operations (fixing anti-pattern O-9/O-10 gradually).
5. Suspension cascades *downward only as far as the capability binding*; in-flight executions continue under SBU exception rules (sovereignty).

---

## 12. MULTI-TENANT MODEL

### 12.1 Verified isolation posture

RLS present with `get_my_tenant_id()` SECURITY DEFINER helper (`066:23-34`) on all canonical commercial/capability/cus/shp tables; legacy tables mixed quality (`invoices`/`invoice_lines`/`extra_costs`/`md_services` effectively open — see §22).

### 12.2 Catalog ownership model (Objective K)

**Recommendation: PLATFORM MASTER SERVICE + TENANT OVERLAY** — supported by direct precedent in-repo:

- Platform master rows: `tenant_id NULL` semantics or a dedicated platform flag; immutable-by-tenants; provide baseline definitions (codes, names, default capability mappings, default UOM).
- Tenant catalog overlay: tenants enable/disable platform services, define availability windows, and create fully tenant-private services (e.g., a specialty project-cargo service).
- Uniqueness: platform codes globally unique in a reserved namespace; tenant codes unique per tenant (`UNIQUE(tenant_id, service_code)` with NULL-tenant rows constrained separately).
- **Pricing is always tenant-scoped** (never platform): direct evidence — `crm_sbu_customer_rates` is already per `(tenant_id, customer_id, …)`, and Critical Test 9 (two customers, same service, different price) demands customer-scoped price versions beneath tenant-scoped rate cards.
- Package templates follow the same master+overlay duality (platform best-practice bundles; tenant-customized bundles).

No unnecessary duplication: tenant overlay stores *deltas* (availability, price, display overrides) referencing master ids; full copies only for tenant-private services.

---

## 13. CUSTOMER-FACING MODEL

Customers must see **Services**, never internal SBU names (Objective L):

| Internal | Customer-facing product |
|----------|------------------------|
| CUSTOMS + PIB prep | "Jasa Kepabeanan Impor" / Import Customs Clearance |
| FORWARDING FCL ocean leg | "Ocean Freight FCL" |
| TRUCKING port haulage | "Port Delivery" / "Angkutan Pelabuhan" |
| WAREHOUSE storage | "Warehouse Storage" (monthly) |

Design requirements extracted from repo UX reality:
- Display-name layer must support localization-ready overrides (tenant overlay from §12 provides the slot).
- Quotation documents (portal/sales quotations preview) render package → service lines with quantities/UOM/prices — the sales portal already renders line items, so this is a vocabulary swap, not new UI grammar.
- Cargo-owner/customer tracking surfaces (`/track/*`) continue showing *execution milestones*; they gain a service label but never capability/SBU internals, costs, or margins (Control Tower Layer-2 sanitization principle, `SENTRALOGIS_CONTROL_TOWER_PROJECTION.md`).

---

## 14. INTERNAL OPERATIONS MODEL

Three internal personas (Objective M):

1. **Operations (per SBU):** unchanged — capability workspaces (Customs Workbench, Forwarding Command Center, Trucking boards, Warehouse portals) remain the execution UI. New: each workspace shows *why* a job exists — upstream service activation reference — enabling cross-SBU traceability without coupling.
2. **Management:** Commercial Engagement view: customer → services → per-service status roll-up → cross-SBU execution map → margin/SLA/exceptions. This is the natural precursor to the Control Tower tri-layer projection already documented (Layer 1 internal ops overview with margin fields planned as `actual_cogs_idr`/`gross_margin_percentage`).
3. **Sales/CS:** service catalog browser + package configurator replacing today's hand-assembled multi-SBU quotation forms.

AI Copilot readiness: service-level events (activated/suspended/completed) emitted through the existing `event_outbox` (`20260826_006:54` already carries `work_order_id`) give the intelligence tower a clean commercial-event stream orthogonal to operational telemetry.

---

## 15. FINANCE IMPLICATIONS

No finance changes in this phase (per mandate) — but discovery confirms the proposed model *unlocks* (Objective N):

| Report | Blocked today by | Unblocked by Service layer |
|--------|------------------|-----------------------------|
| Revenue by Service | No service identity on money | Activated service id on price lines → invoice lines |
| Margin by Service | Cost/sell in different universes per SBU | Service-keyed sell (commercial) joined to capability-keyed cost (execution) |
| Customer P&L | Triplicated revenue truth (§4.1-Q5) | Single engagement → services → priced lines chain |
| Engagement P&L | Same | Engagement is already the root (ADR-018) |
| Pass-through hygiene | Duties mixed into revenue (V-05, audit doc) | Service category enables PASS_THROUGH classification at line level (aligns with ADR-009 3-tier ledger which is already DDL'd but unwritten) |

Worked example from mandate (Customs Rp5M + Forwarding Rp20M + Trucking Rp8M = Rp33M customer total with per-service margins) becomes three activated services with snapshotted sell prices under one engagement, costs aggregated per capability — representable with zero SBU restructuring.

---

## 16. CONTROL TOWER / INTELLIGENCE IMPLICATIONS

- `SENTRALOGIS_CONTROL_TOWER_PROJECTION.md` plans CQRS read projections fed from event outbox. Service activations/lifecycle transitions must be emitted as outbox events (table already supports `event_outbox.work_order_id`) so projections can aggregate *by service* without touching SBU schemas.
- Layer-2 (customer portal) projection gains "your services & their progress" — strictly from commercial/service events, never execution internals.
- Layer-3 (AI/copilot) gains the highest-value signal yet: commercial intent (which services promised, at what SLA/price) against operational reality — the gap AI copilots actually need. `SENTRALOGIS_SERVICE_CONTRACT_SPEC.md` SLA contracts attach naturally at activation level.

---

## 17. ANTI-PATTERN FINDINGS

Full checklist per Objective O:

| # | Anti-pattern | Verdict | Key evidence |
|---|--------------|---------|--------------|
| 1 | SBU-as-product | **PRESENT** | Sellable products keyed `sbu_type` across CRM/catalog/quotation (`122:9,50`; `111:10`); capability activation accepts type with no service reference (`013:20-21`) |
| 2 | Forwarding-as-parent | **PARTIALLY PRESENT** | `source_domain DEFAULT 'FORWARDING'` (`004:15`); source enum excludes others (`types.ts:24-26`); execution-plan sole orchestrator fabricating customs params incl. office `'040300'` (`execution-plan-service.ts:138`) |
| 3 | Shipment-as-mandatory-root | **ABSENT** | `shp_shipments.work_order_id NOT NULL` points down to commercial; customs/trucking have no shipment FK |
| 4 | Customs requiring Shipment | **ABSENT** | Nullable attachments; standalone tests pass; zero imports |
| 5 | Trucking requiring Shipment | **ABSENT** | JO parent is wo_item→WO (`032:129-132`); reverse problem instead: adapter omits required `wo_item_id` |
| 6 | Service and Capability mixed | **PRESENT** | Binding `pricing JSONB` doubles as sellable line; two parallel vocabularies (sbu_type products vs capability types) unreconciled |
| 7 | Pricing tied directly to SBU | **PRESENT** | All five pricing homes SBU-keyed (§7.1) |
| 8 | Commercial data duplicated in SBU | **PRESENT** | `fw_container_items.sell_price_snapshot`+9 COGS cols; `job_orders.estimated_margin/driver_revenue_share`; `wo_items.total_revenue` |
| 9 | Operational status as commercial status | **PRESENT** | Billing gated on `is_doc_finished/is_cost_finished` → `ready_billing_at` (`163:7-54`); invoice amount computed client-side from execution counts (`invoice-customer/page.tsx:157-160`) |
| 10 | Billing coupled to operational records | **PRESENT** | `invoice_lines.job_order_id` direct link (`046:40`); readiness from JO completion |
| 11 | Hard-coded capability lists | **PRESENT ×8 sites** | TS union ×2 (`commercial/types.ts:12`; `service-contracts/types.ts:18-22`), SQL CHECK (`013:18`), validTypes array (`capability-binding-service.ts:37`), UI switches ×2 (`CreateWOForm.tsx:419-422,973-976,1096-1121`; `ServiceRequirements.tsx:9-45`), migration comment (`004:16`); plus vocabulary drift: legacy `CLEARANCE` (`109:7`, `111:10`) ≠ canonical `CUSTOMS` |
| 12 | Cross-tenant references | **RISK SURFACES** | Legacy forwarding APIs take `tenant_id` from body unauthenticated (`wo/route.ts:12,26` etc.); v1 helper header/query fallback (§22); attach-route existence oracle leaks row existence (acceptable, guarded) |
| 13 | Circular dependencies | **ABSENT** | Domain graph acyclic; only wrong-direction namespace dep: commercial API route imports customs api-helper (`capabilities/route.ts:12`) |

Additional latent defects recorded for implementation planning (not anti-patterns per se): broken migration family 175/178 (`fw_order_headers` references nonexistent `customers(customer_id)`/`work_orders(wo_id)`); `pricing.ts` queries drifted columns; `EXCHANGE` target domain has no registered adapter (dead slot).

---

## 18. RECOMMENDED TARGET ARCHITECTURE

```
                         CUSTOMER (md_entities)
                                │
                                ▼
                  COMMERCIAL ENGAGEMENT
              (= commercial_work_orders, ADR-018 UNCHANGED)
                                │
                ┌───────────────┴────────────────┐
                ▼                                ▼
         SERVICE CATALOG                  SERVICE PACKAGE TEMPLATE
         (platform master +               (reusable bundle of
          tenant overlay)                  catalog services)
                │                                │
                └───────────┬────────────────────┘
                            ▼
                  ACTIVATED SERVICES        ← NEW commercial truth:
                  (one row per purchased       WHAT the customer bought,
                   service on engagement,      at what snapped price,
                   own lifecycle)              in which lifecycle
                            │
                            ▼  (derived/projected)
                  CAPABILITY BINDINGS       ← EXISTING (ADR-020):
                  (which SBUs engaged)         WHICH organization owns
                            │
                            ▼  (when execution needed)
                  svc_service_requests      ← EXISTING command bus
                            │
        ┌──────────┬────────┼────────────┬──────────┐
        ▼          ▼        ▼            ▼          
     CUSTOMS   FORWARDING  TRUCKING   WAREHOUSE   …future capabilities
        │          │         │            │       (config-added)
        ▼          ▼         ▼            ▼
      cus_*      shp_*   job_orders     wh_*      EXECUTION
```

**Non-negotiable reading of this diagram:**
- Service = SOLD (commercial truth; prices, packages, customer promises).
- Capability = OWNS (organizational routing; engagement↔SBU registry).
- Execution = DOES (operational objects; sovereign workflows, statuses, resources).

**What changes vs Phase 4A:** nothing is removed or weakened. `commercial_work_orders` stays the root; bindings stay unique/idempotent; attachment commands untouched. What is added is the missing middle: a catalog that makes "CUSTOMS CLEARANCE" a *product* whose activation *derives* capability bindings, instead of capability types masquerading as products.

**Extensibility answer (Objective J):** a new capability (INSURANCE, COLD_CHAIN, LAST_MILE, …) requires: (a) one row in a capability registry instead of editing 8 hard-coded sites + a CHECK constraint migration; (b) an SBU execution domain whenever operations exist (or adapter stub until then); (c) optional catalog services mapping to it. **No change to engagement root, activation model, packages, pricing, or finance chains.** Prerequisite: ADR-029 registry-driven capability vocabulary replacing the CHECK constraint and TS unions with seeded lookup + narrow validation.

---

## 19. PROPOSED CONCEPTUAL DATA MODEL

Discovery-level only. Seven candidate tables evaluated; **six recommended, one rejected** to avoid speculative abstraction.

### 19.1 `service_catalog` — RECOMMENDED (canonical master data)

- **Purpose:** canonical sellable-service definitions.
- **Key columns (conceptual):** `id`, `scope` (`PLATFORM'|'TENANT'` represented via nullable `tenant_id`), `service_code` (e.g., `CUS_IMPORT_CLEARANCE`, `FWD_OCEAN_FCL`, `TRK_PORT_HAULAGE`, `WHS_STORAGE_MONTHLY`), `name`, `description`, `category` (aligned to `md_services.category` vocabulary), `default_uom` (constrained set), `tax_class_hint`, `lifecycle_status` (DRAFT/ACTIVE/RETIRED), `version_no`.
- **Ownership:** Commercial/platform layer.
- **Lifecycle:** slow-moving master data; RETIRED never deleted (historical activations keep FK).
- **Tenant scope:** platform rows tenant-independent; overlay rows per §12.
- **Relationships:** referenced by `service_capabilities`, `service_package_items`, `commercial_engagement_services` (snapshot), `service_pricing`.
- **Uniqueness:** `UNIQUE(COALESCE(tenant_id,'000…'), service_code)`.
- **Indexes:** `(tenant_id, lifecycle_status, category)` for catalog browsing; code lookup unique index.
- **Canonical vs transactional:** CANONICAL MASTER.

### 19.2 `service_capabilities` — RECOMMENDED (mapping junction)

- **Purpose:** N:M service→capability routing metadata.
- **Columns:** `service_catalog_id`, `capability_code TEXT` (registry-driven, see ADR-029 — *not* a CHECK enum), `is_primary BOOLEAN`, optional `activation_payload_template JSONB` (defaults forwarded to ServiceRequests).
- **Uniqueness:** `UNIQUE(service_catalog_id, capability_code)`.
- **Canonical:** yes, master metadata.

### 19.3 `service_packages` + 19.4 `service_package_items` — RECOMMENDED

- **Purpose:** reusable bundle templates (master + tenant overlay like catalog).
- **Header:** code, name, description, availability, lifecycle; `UNIQUE(tenant-scope, package_code)`.
- **Items:** `package_id`, `service_catalog_id`, `quantity_default`, `uom_override`, `sequence_no`, `optional_flag` (supports subset activation), constraints JSONB (e.g., minimum combos). `UNIQUE(package_id, service_catalog_id)`.
- **Canonical master data.**

### 19.5 `commercial_engagement_services` — RECOMMENDED (transactional heart)

- **Purpose:** one row per purchased service instance on an engagement — the "Activated Services" node; *this* is the customer-purchase truth currently missing.
- **Conceptual columns:** `id`, `tenant_id`, `work_order_id → commercial_work_orders` (RESTRICT), `service_catalog_id` (FK, for lineage/reporting), `package_id NULL` (lineage if activated via package), **snapshot columns** (`service_code_snapshot`, `name_snapshot`, `uom_snapshot`, `quantity`, `unit_sell_price_snapshot`, `currency`, `sell_price_total_snapshot`) — snapshotting follows the proven quotation/WO-item pattern and survives catalog retirement/versioning, `lifecycle_status` (Section 11), `activated_at/completed_at/…`, `idempotency_key UNIQUE(tenant_id, work_order_id, service_catalog_id, idempotency_key)`, `metadata JSONB`.
- **Derivation rule:** activating a service ensures mapped capability binding(s) exist (calls existing idempotent `CapabilityBindingService` — reuse, not duplication).
- **Transactional, append-leaning** (status transitions in place; cancellation soft).

### 19.6 `service_pricing` (+ optional `service_price_versions`) — RECOMMENDED as ONE versioned table

- **Purpose:** sell-side rate cards keyed to SERVICE.
- **Shape:** `service_catalog_id`, `tenant_id` (always), `customer_id NULL` (NULL=tenant default rate; set=customer-negotiated — implements Critical Test 9 directly), optional lane columns (nullable origin/dest location ids — generalizing the proven `fw_price_master`/`crm_sbu_customer_rates.route_*` pattern), `pricing_type` (ONE_TIME/RECURRING_MONTHLY/PER_ACTIVITY — vocabulary already established at `122:14`), `unit_price`, `min_qty`, `currency`, `valid_from/valid_to` (**versions ARE rows** — a separate `_versions` table rejected as unnecessary; effective-dating by row window is the pattern `fw_price_master` already proved), `UNIQUE` overlap-exclusion on (service, tenant, customer, lane, validity window).
- **Canonical-commercial master data; snapshots land in `commercial_engagement_services`.**
- Cost rates deliberately EXCLUDED (stay with SBU procurement/execution per ownership boundary, ADR-028) — margin assembled at reporting/projection layer.

### 19.7 Rejected candidates (anti-speculation)

- `service_price_versions` separate table — redundant with row-window versioning above.
- `commercial_engagements` parent — ADR-018 already resolved; do not reopen.
- Capability lookup table — *conditionally deferred*: recommended as part of ADR-029 but may ship as seeded enum-table later if Phase 4B keeps the four-type vocabulary frozen; decision delegated to implementation gate (see §30 D-4).

---

## 20. PROPOSED API MODEL

Conceptual only (Objective R). Follows the established `/api/v1` conventions: auth context resolution, manual tenant filter, admin client, Result-pattern errors, idempotent commands.

| Endpoint | Verb | Semantics | Notes |
|----------|------|-----------|-------|
| `/api/v1/services` | GET | Query catalog (filters: category, capability, status, q) | Platform + tenant merged view per §12; query-side |
| `/api/v1/services/[id]` | GET | Catalog detail incl. capabilities, price summary | Query-side |
| `/api/v1/services` | POST | Create tenant-private service | Admin-gated; validates capability mapping exists |
| `/api/v1/service-packages` | GET/POST | List/create templates | Template management |
| `/api/v1/service-packages/[id]` | GET/PATCH | Detail/update items | Versioned edits only for unreferenced templates |
| `/api/v1/services/pricing` | GET | Rate-card query (service, customer, lane, date) | Resolves most-specific price (customer > tenant-default) |
| `/api/v1/commercial/engagements/[id]/services` | GET | List activated services + lifecycle | Joins engagement root |
| `/api/v1/commercial/engagements/[id]/services` | POST | Activate service(s) | **Command.** Idempotent via key. Validates: engagement exists+tenant, service ACTIVE, lifecycle legal (not duplicate-ACTIVE), price resolution (explicit price OR resolvable rate card). Side effect: ensures capability bindings via existing service. Emits outbox event |
| `/api/v1/commercial/engagements/[id]/services/[serviceId]` | DELETE | Cancel (pre-activation semantics) | Command; guard: refuses if execution artifacts exist → returns CONFLICT directing to suspend flow |
| `/api/v1/commercial/engagements/[id]/services/[serviceId]/transition` | POST | Lifecycle transition (suspend/resume/complete/close) | Command; reuses binding-transition matrix philosophy; fills today's unreachable-lifecycle gap (F: §4.1-Q10) |
| `/api/v1/service-packages/[id]/quote` or engagements apply-package | POST | Bulk-activate package items | One transaction; partial failure atomic; each item individually idempotent |

Cross-cutting determinations:
- **CQS:** queries read catalog/pricing/activations directly; mutations are explicit commands with idempotency keys (pattern identical to `svc_service_requests.idempotency_key`).
- **Authorization slots:** role check against resolved `profiles.role` / `tenant_users.role_code` (plumbing already exists in api-helpers but unused — see §22); propose `commercial:manage` for activation/pricing writes, `commercial:read` for queries; SBU roles get read on their capability slice only.
- **Tenant isolation:** every query filtered by resolved tenant; body-supplied tenant_id rejected (already stated in helper comments; enforcement gap fixed per §22 D-2).
- **Lifecycle validation:** server-side transition matrix mirrors Section 11 rules.

---

## 21. PROPOSED UI/UX MODEL

No UI built in this phase (Objective S). Target flows:

**SALES/CUSTOMER:**
```
Catalog Browser (search/filter by category & capability)
  → Select Services (or pick Package Template)
  → Configure (qty, uom, dates, addresses/lanes)
  → Live Quote (resolved from service_pricing: customer-specific > tenant default)
  → Send/Accept (existing quotation grammar)
  → Activate (creates engagement services; capabilities derive automatically)
```

**OPERATIONS:** unchanged workspaces + one new passive element: each execution artifact displays originating service label (traceability without coupling).

**MANAGEMENT:** Commercial Control Tower: Customer → Engagements → Services (lifecycle chips) → drill into capability workspaces → margin/SLA/exception roll-ups. Directly consumable by the planned tri-layer projections.

Design continuity notes: multi-SBU quotation UI (`122` sections), CreateWOForm item modals, and forwarding ShipmentCreator service-requirements picker are the three existing interaction patterns to converge — the catalog replaces their divergent hardcoded lists with one source.

---

## 22. SECURITY & GOVERNANCE

Audit results (Objective T):

1. **Tenant impersonation fallback (HIGH):** both v1 api-helpers resolve identity from Supabase session first, then fall back to raw `x-tenant-id`/`x-user-id` headers (role `API_CONSUMER`) or `?tenant_id=` (role `ANONYMOUS`) — while executing on the **service-role** admin client, bypassing RLS (`lib/domain/customs/api-helper.ts:49-70`; `lib/domain/shipment/api-helper.ts` equivalent). Comment claims "Rejects untrusted client payload tenant overrides" but the fallback does not verify credentials. **Decision required before Phase 4B exposes pricing/commercial endpoints through this path (D-2, §30).**
2. **Permissive RLS on financial/master tables:** `invoices`/`invoice_lines` `USING(true)` (`046:57-71`); `extra_costs` (`034:28-31`); `md_services` fully open (`111:27-30`). Any catalog that inherits `md_services` patterns must NOT inherit its policy style.
3. **Legacy forwarding write surface:** `tenant_id` accepted from request body unauthenticated (`app/api/forwarding/wo/route.ts:12,26`, `order-header`, `consol stuff`) — outside Phase 4B scope but recorded.
4. **Role model ready but unused:** `profiles.role` (owner/superadmin/admin_wo/admin_finance/director/tenant_admin/viewer) and SBU-scoped `tenant_users.role_code` (`sbu_manager_{tr,wh,cl,fwd}` etc.) exist; **zero routes check role today** — authorization is tenant-presence-only. Service activation permissions slot cleanly into the resolved-context pattern.
5. **Persona isolation requirements for Phase 4B targets:** pricing visibility (sell rates) restricted to commercial/finance/owner roles — never exposed to SBU-ops-only tokens nor to customer-facing Layer-2 projections; SBU users see activations mapped to their capability, not other SBUs' pricing; all commercial mutations audited (precedent: customs SHA-256 audit chain + `cus_declaration_audit_events` — commercial layer should adopt plain append-only event log at minimum).
6. **Browser-direct access:** canonical areas clean (0 violations in `components/workspaces/**`, clearance pages). Future catalog UI must consume APIs, not client `supabase.from()`.

---

## 23. ADR RECOMMENDATIONS

Numbered continuing the Phase-4A sequence (note: earlier families collided historically — recommend the implementation phase also ratify a global ADR index):

| ADR | Title | Justified? | Disposition |
|-----|-------|-----------|-------------|
| ADR-022 | **Canonical Service Catalog** (`service_catalog` master+tenant overlay; retire `commercial_service_scopes` to compatibility) | YES — F-03, §5.2 | RECOMMEND |
| ADR-023 | **Service vs Capability separation** (sold vs owns vs does; binding stops carrying unvalidated pricing) | YES — core mission; F-04 | RECOMMEND |
| ADR-024 | **Service Package architecture** (templates + per-engagement activation; subset/optional items) | YES — §8 | RECOMMEND |
| ADR-025 | **Service-to-Capability mapping** (N:M junction; primary-capability convention) | YES — §10 | RECOMMEND |
| ADR-026 | **Independent commercial service lifecycle** (8-state machine; derivation rules from capability bindings; billing decoupling direction) | YES — §11 | RECOMMEND |
| ADR-027 | **Tenant-scoped catalog & pricing** (platform master + overlay; customer-specific versioned prices; row-window versioning) | YES — §12, §19.6 | RECOMMEND |
| ADR-028 | **Commercial vs operational vs finance ownership boundary** (codifies what discovery found violated: pricing-in-SBU, billing-from-operational-flags) | YES — §4, §15, §17 | RECOMMEND |
| ADR-029 | **Registry-driven capability extensibility** (replace CHECK + TS unions + UI switches with seeded registry; enables future SBUs by configuration) | YES — but scope decision needed (now vs freeze-four-types) → decision D-4 | RECOMMEND WITH DECISION |

---

## 24. MIGRATION STRATEGY

High-level sequence for the eventual implementation phase (no migrations created now):

1. **Stage B-0 — Decisions (gate §30):** resolve D-1…D-5.
2. **Stage B-1 — Vocabulary & registry:** normalize `CLEARANCE→CUSTOMS` in legacy masters (data fix + compat view); optionally introduce capability registry (ADR-029 scope per D-4).
3. **Stage B-2 — Catalog & pricing DDL:** `service_catalog`, `service_capabilities`, `service_packages(_items)`, `service_pricing`, `commercial_engagement_services`; seed platform catalog from `md_services` + `crm_sbu_customer_rates` vocabularies; RLS strict from day one.
4. **Stage B-3 — Commercial root bridge (depends on D-1):** creation path for canonical engagements (and/or compatibility bridge from legacy `work_orders`); resolve `svc_service_requests.work_order_id` FK conflation (§4.2); stop client-fabricated `service_scope_id` (§4.3).
5. **Stage B-4 — Activation engine:** engagement-services API + derivation into existing `CapabilityBindingService` + outbox events; expose binding lifecycle transitions (close existing API gap).
6. **Stage B-5 — Sales surface convergence:** quotation/package configurator reads catalog; CreateWOForm item modals switch to catalog picks.
7. **Stage B-6 — Dual-run & backfill:** mirror legacy WO items as activations for in-flight engagements (compatibility views per migration 007 precedent); 60-day stability window precedent from `IMPLEMENTATION_SEQUENCE.md`.
8. **Stage B-7 — Finance hooks (Phase 4C+, not 4B):** ledger entries keyed to activations; billing eligibility from service state.

Each stage independently green under the 543-test regression umbrella plus new suites (§27).

---

## 25. RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| R-01 Dual commercial root persists into new layer (activations attach to wrong table) | HIGH if D-1 unresolved | CRITICAL | Hard gate: D-1 before any DDL |
| R-02 `svc_service_requests` FK conflation breaks dispatch mid-rollout | MEDIUM | HIGH | Runtime verification task in Stage B-3 |
| R-03 Tenant impersonation via v1 fallback amplified by pricing APIs | MEDIUM | HIGH | D-2 decision + auth hardening as precondition |
| R-04 Catalog seeding invents wrong taxonomy (over-abstraction) | MEDIUM | MEDIUM | Seed strictly from existing vocabularies (`md_services`, `crm_sbu_customer_rates`, observed SKUs); no speculative services |
| R-05 Regression into protected Trucking/Driver/GPS | LOW | HIGH | Zero-touch invariant; regression suite; adapter fixes isolated behind service-contracts tests |
| R-06 Vocabulary migration (`CLEARANCE→CUSTOMS`) breaks legacy reports | MEDIUM | LOW | Compat views; dual-read window |
| R-07 Performance of catalog joins on hot paths | LOW | LOW | Benchmarks mandated in acceptance (precedent: sub-ms @10k benchmarks in 4A) |
| R-08 ADR numbering collisions confuse governance | CERTAIN (historical) | LOW | Global ADR index ratification in 4B docs |

---

## 26. BACKWARD COMPATIBILITY

- **Customs (untouched):** all 416+ customs tests run unchanged; no schema or code modification in scope. Standalone guarantee (Critical Test 12) re-asserted: `shipment_id/execution_leg_id/job_order_id = NULL` path is the tested default and remains the only path Phase 4B exercises.
- **Trucking/Driver/GPS/Android (protected):** zero touch. `job_orders` chain untouched.
- **Legacy WO purchase flow:** continues functioning throughout Stages B-2..B-6; activations are additive; backfill is mirror-only (dual-run), never cutover-first.
- **Existing APIs:** Phase 4A capabilities endpoint unchanged in behavior; new endpoints are additive; binding lifecycle PATCH is purely additive surface.
- **Canonical-dead tables:** `commercial_service_scopes` kept readable via compatibility view after ADR-022 retirement (nothing reads it today, so retirement risk ≈ 0 — but shipments' fabricated scope ids must be handled in B-3).
- **Database:** all new tables additive; no alteration of existing columns; enums avoided in favor of constrained TEXT + registry (removes future-migration friction identified in finding F-06).

---

## 27. TESTING STRATEGY

For eventual implementation (structure only):

1. **Regression umbrella:** `scratch/run-tests.ts` — 543/543 must stay green at every stage.
2. **New suites mirroring established per-phase pattern (`__tests__/*.test.ts`):**
   - `service-catalog.test.ts` — CRUD, tenant overlay resolution, retirement semantics, benchmark (≥10k-row browse <50ms).
   - `service-pricing.test.ts` — specificity resolution (customer>tenant), version windows, currency, Critical Test 9 scenarios.
   - `service-packages.test.ts` — template activation atomicity, optional items, subset flows.
   - `engagement-services.test.ts` — lifecycle matrix, idempotent activation, capability derivation calls, suspension isolation (Critical Tests 1–8, 10).
   - `extensibility.test.ts` — register hypothetical capability (INSURANCE) via registry without touching engagement root (Critical Test 11).
   - Security suite — cross-tenant denial on every new endpoint; role gating; pricing-visibility assertions.
3. **Architectural static gates (extend existing invariants):** zero browser-direct supabase in new code; zero imports from commercial→SBU execution domains; capability vocabulary sourced from registry only (lint/grep assertion replacing the 8-site enumeration).
4. **Critical Business Tests 1–12:** mapped as named acceptance scenarios in `engagement-services.test.ts` + `service-pricing.test.ts`; each traces to a scenario section of this report (§9 covers 1–8; §19.6 covers 9; §10 covers 10–11; §26/Phase-4A suite covers 12).

---

## 28. PHASE 4C RECOMMENDATION

If the gate opens (post-decisions), Phase 4C should be **"Commercial Root Consolidation & Service Catalog Foundation"** — deliberately narrower than full packaging:

1. Resolve D-1 (single commercial root) including the `svc_service_requests` FK conflation repair and end of client-fabricated `service_scope_id`.
2. Ship `service_catalog` + `service_capabilities` + `service_pricing` (DDL + seed + read APIs) — the catalog foundation without activation engine.
3. Auth hardening prerequisite (D-2) for all `/api/v1` helpers.
4. Defer `service_packages`, activation engine, UI to Phase 4D/4E — each independently valuable and testable.

Rationale: findings show the highest-risk item is not the catalog (purely additive) but the root ambiguity; sequencing it first prevents building the new layer on contested ground.

---

## 29. ACCEPTANCE CRITERIA

Discovery-phase acceptance (all met):

- [x] Baseline re-verified: 543/543 PASS, `tsc --noEmit` 0 errors.
- [x] Zero production code, migration, schema, UI, business-logic modifications.
- [x] Zero scratch scripts created (none needed; static analysis + subagent audits sufficient) — nothing to delete.
- [x] Protected systems (Trucking, Driver PWA, Android, GPS, existing Customs implementation) untouched.
- [x] Objectives A–T each answered with file:line evidence (Sections 3–23).
- [x] Anti-pattern checklist O-1…O-13 dispositioned with verdicts (Section 17).
- [x] Critical Business Tests 1–12 demonstrated representable without structural hacks (Sections 9, 10, 19, 26).
- [x] Non-negotiable invariants 1–14 assessed (Sections 2.3, 26); violations found are pre-existing and explicitly surfaced as decisions, not introduced.
- [x] Exactly one documentation artifact produced: this report.
- [x] ADRs 022–029 evaluated with dispositions (Section 23).
- [x] Gate issued with explicit decision list (Section 30).

Implementation-phase acceptance (for the future, mirroring house standards): ≥95% new-suite scenario coverage, 543+ regression green, performance benchmarks (<50ms @10k), zero new lint errors, security suite green, dual-run parity report.

---

## 30. FINAL GATE DECISION

## PHASE 4B DISCOVERY GATE

# 🟡 YELLOW — ARCHITECTURE REQUIRES DECISIONS

The SERVICE → CAPABILITY → EXECUTION target architecture is fully specified and evidence-compatible with all Phase 4A invariants. Implementation must NOT begin until the product owner resolves the following decisions — they are exact, bounded, and each is answerable in one sitting:

### D-1 — Commercial Root Resolution *(BLOCKING, CRITICAL)*
ADR-018 declares `commercial_work_orders` canonical; reality shows zero writers while legacy `work_orders` serves every purchase (F-01/F-02), and `svc_service_requests.work_order_id` FK already collides with that reality (§4.2).
**Choose one:**
- (a) Ratify canonical root: build engagement-creation path + legacy bridge/backfill (Stage B-3 full), or
- (b) Pragmatic root: declare legacy `work_orders` the engagement root going forward and point capability bindings/service activations at it (amending ADR-018), or
- (c) Dual-root with explicit federation (highest complexity — discouraged).
Everything downstream (DDL FK targets, API paths, backfill) depends on this.

### D-2 — API Identity Hardening Scope *(BLOCKING for commercial/pricing APIs)*
Authorize removing/credential-binding the `x-tenant-id`/`?tenant_id` anonymous fallbacks in v1 api-helpers before any pricing or engagement-service endpoint ships on that path (§22.1), or explicitly accept and document the residual risk for internal-only deployment.

### D-3 — `commercial_service_scopes` Retirement *(quick decision)*
Confirm ADR-022 disposition: retire scopes to compatibility view and relocate Incoterm/lane semantics to engagement/package level. (Discovery recommends YES; no code currently depends on it.)

### D-4 — Capability Registry Timing *(scope decision)*
Implement ADR-029 registry-driven capability vocabulary NOW (removes 8-site hard-coding + CHECK constraint; enables config-added SBUs) versus freeze the four-type vocabulary for 4B and defer the registry. Discovery recommends NOW for FORWARDING/TRUCKING/WAREHOUSE/CUSTOMS + registry seeds for future types, but 4B is viable frozen.

### D-5 — Pricing Ownership Confirmation *(confirmation)*
Confirm sell-side pricing moves under the Service catalog with customer-specific versioned rows (§19.6) while cost rates remain SBU-owned (ADR-028). No legacy pricing table is migrated destructively in 4B; confirm read-only coexistence is acceptable to finance stakeholders.

---

**Upon GREEN (all decisions answered):** minimum Phase 4B implementation scope =
Stages B-1 → B-4 of Section 24 (vocabulary normalization, catalog+pricing+activation DDL & APIs, activation engine deriving into existing capability bindings, lifecycle transition surface) with test suites per Section 27; packaging (B-5/B-6) may follow as 4B-cont or 4C per owner preference. Recommended Phase 4C: per Section 28.

**STOP CONDITION HONORED:** This discovery ends here. No Phase 4B implementation, no migrations, no production code changes await explicit authorization on D-1…D-5.

---

*Report generated by Phase 4B discovery process. Evidence base: static repository analysis with file:line citations throughout; baseline validations executed 2026-08-25 (543/543 PASS; tsc 0 errors; git status clean of production changes apart from this document).*
