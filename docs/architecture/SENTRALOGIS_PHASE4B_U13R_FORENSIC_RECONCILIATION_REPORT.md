# U-13R Sales Order Forensic Reconciliation Report

**Date:** 2026-08-28
**Gate:** U-13R — Sales Order Forensic Reconciliation (completion of U-13)
**Report:** `docs/architecture/SENTRALOGIS_PHASE4B_U13R_FORENSIC_RECONCILIATION_REPORT.md`
**Sibling:** `docs/architecture/SENTRALOGIS_PHASE4B_U13R_FINAL_ACCEPTANCE.md`

---

## U-13R STATUS: GREEN

```
Full Regression:    460/460 PASS (0 FAIL)
TypeScript:         0 errors
U-13 Suite:         41/41 PASS
U-13R Suite:        33/33 PASS  (lib/__tests__/u13r-sales-order-forensic-reconciliation.test.ts)
```

---

## A. Purpose & Mandate (Requirement §63)

U-13R is the **forensic reconciliation** of the U-13 Sales Order foundation (ADR-034..038, ratified 2026-08-28). It proves that the implemented Sales Order foundation is:

- **architecturally faithful** to the ratified ADRs,
- **structurally safe** (no commercial→operational leakage),
- **tenant-safe** (RLS predicates + server-derived IdentityContext),
- **canonical-authoritative** (single number authority, single writer, DB-UUID PKs),
- **without dual paths** (no competing order root, no client canonical generation),
- **free of P0/P1/P2 defects directly caused by U-13**.

The suite is **READ-MOSTLY**: it is additive (new test file + runner registration), makes **no production code changes**, and performs **no new migrations**. Repair policy (§57): only P0/P1/P2 defects directly caused by U-13 may be minimally repaired; P3/P4 are documented, not silently expanded.

---

## B. Baseline Confirmation (§4)

| Check | Expected | Observed | Verdict |
|---|---|---|---|
| U-13 suite | 41/41 PASS | 41/41 PASS | GREEN |
| Full regression | 427/427 PASS | 460/460 PASS* | GREEN |
| TypeScript | 0 errors | 0 errors | GREEN |

*The count rose from 427 → 460 because the U-13R suite adds 33 forensic checks. All pre-existing 427 pass unchanged (U-13 included), proving the repair did not regress prior gates.

---

## C. Gate-Level Reconciliation (A..AX)

The gate list is executed below against the migration `20260828_019_sales_order_foundation.sql`, the canonical domain `lib/sales-order/`, and the derivation/authorization infrastructure. Each gate is classified **PASS** (satisfied) with the evidence.

### C.1 Identity & Number Authority (Gates A, B, C, D, AK)

| Gate | Invariant | Evidence | Result |
|---|---|---|---|
| **A** | Engagement ≠ SO; `sales_orders` is a distinct header with its own identity | `sales_orders.so_number TEXT NOT NULL` (own business identity) alongside `engagement_id UUID NOT NULL REFERENCES commercial_work_orders(id) ON DELETE RESTRICT` (parent). No `wo_number` reuse. | **PASS** |
| **B** | SO PK is DB-generated UUID; never client | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` (migration 019). Input DTO (`CreateSalesOrderInput`) contains **no** `tenantId`/`userId`/`id`. | **PASS** |
| **C** | `so_number` is server-authoritative | `so_number TEXT NOT NULL`; allocated exclusively via `next_sales_order()` RPC (`allocateSalesOrderNumber`). | **PASS** |
| **D** | `next_sales_order()` atomic + single authority | `CREATE OR REPLACE FUNCTION next_sales_order(p_tenant_id UUID) ... SECURITY DEFINER ... nextval('seq_sales_order')`, format `SO-YYYY-MM-NNNN`. No `SELECT MAX + increment`. `UNIQUE(tenant_id, so_number)` is the DB safety net. *Concurrent execution: logic-verified; no live DB available → environmental execution N/A (documented).* | **PASS** |
| **AK** | No client canonical SO id/number generation | Repo scan of `app/` for `crypto.randomUUID()/Math.random()/Date.now()` near `so_number/sales_order/salesOrder/so_id`: **0 hits** in runtime code. Only the U-13 *detector* contains these patterns. | **PASS** |

### C.2 Canonical Lineage & Competing Root (Gates AN, AO, AP, K, N)

| Gate | Invariant | Evidence | Result |
|---|---|---|---|
| **AN** | No competing/duplicate order root introduced by U-13 | U-13 adds only `sales_orders`. `commercial_work_orders` remains the long-lived engagement container (ADR-034); no second canonical order table. | **PASS** |
| **AO** | Single serialization writer | Exactly **one** production writer for `sales_orders`: the single `.insert()` in `service.ts::createSalesOrder`, reached only via the two thin API routes. | **PASS** |
| **AP** | No client direct DB access to `sales_orders` | Zero `supabase.from('sales_orders')` calls in `app/` components (`countClientDirectAccess() === 0`). | **PASS** |
| **K** | `commercial_line_items` not reused as SO sell-lines | `commercial_line_items`.parent FK = `commercial_work_orders` (Engagement), **not** `sales_orders` — so it cannot represent SO lines. U-13 keeps header-only; sell-lines deferred to a PRICING ADR (U-12A §K). | **PASS** |
| **N** | `svc_service_requests` (ADR-033 dispatch command) untouched | `.work_order_id REFERENCES commercial_work_orders(id)`; U-13 added no SR semantics and does not write it. | **PASS** |

### C.3 Commercial→Operational Boundary (Gates M, W, Q, R, S, H, T, J)

| Gate | Invariant | Evidence | Result |
|---|---|---|---|
| **M/W** | Confirm/cancel are pure commercial status transitions | `confirmSalesOrder`/`cancelSalesOrder` only `.update('sales_orders')` + read `commercial_work_orders`. Zero writes to `work_orders`/`wo_items`/`job_orders`/`svc_service_requests`/`commercial_capability_bindings` (forensic regex over `service.ts`). | **PASS** |
| **Q** | No SO reference on operational lineage | Operational DDL (`work_orders`→`wo_items`→`job_orders`, migration 032) contains **zero** `sales_order`/`so_id`/`so_number`/`sales_orders` (word-boundary scan). | **PASS** |
| **R** | `sales_order_id` column appears in exactly one migration | Only migration 019 defines the `sales_order_id` column. (Migration 029's `CHECK (source_type IN (...'SALES_ORDER'))` is an **unrelated WMS enum label**, not an SO schema reference — classified P4, documented.) | **PASS** |
| **S** | No SO→JO path; many SO→1 WO forbidden (ADR-037) | Operational DDL and all migrations contain no `sales_order_id`/`so_id` on `work_orders`/`wo_items`/`job_orders`. "Many SO→1 WO" has **no vector** because U-13 creates no SO→WO link field at all. | **PASS** |
| **H** | No quote FK on operational tables | Independent scan: no `quote_id ... REFERENCES` inside the exact operational `work_orders`/`wo_items`/`job_orders` CREATE TABLE blocks (word-boundary scoped). | **PASS** |
| **T** | Quote is CRM-only; `quote_id` appears only on commercial tables | `sales_orders.quote_id UUID REFERENCES crm_quotations(id) ON DELETE SET NULL` (commercial header). Quote never referenced by operational tables. | **PASS** |
| **J** | Operational lineage intact | `work_orders` → `wo_items` → `job_orders` present (migration 032); not altered by 019. | **PASS** |

### C.4 Shipment & Fulfillment (Gates O, P, AE)

| Gate | Invariant | Evidence | Result |
|---|---|---|---|
| **O** | `shp_shipments.sales_order_id` nullable + `ON DELETE SET NULL` (ADR-038) | `ALTER TABLE public.shp_shipments ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL;` | **PASS** |
| **P** | Shipment is the logistics aggregate; SO does not own shipment properties | `sales_order_id` is a **non-unique nullable attribution** FK. A shipment keeps its own lifecycle (`global_status`, BL numbers, etd/eta, tracking). Column is unused by runtime code in U-13 (populated in the Fulfillment phase). | **PASS** |
| **AE** | Delete/attach semantics safe | SO→Shipment = `SET NULL` (cancelled SO never cascades-destroy an operational shipment); SO→Engagement = `RESTRICT` (protects commercial history). No `DELETE FROM sales_orders` executable statement exists; SO lifecycle is DRAFT→CONFIRMED→…→CANCELLED, no hard delete. | **PASS** |

### C.5 Tenant Safety & Authorization (Gates E, F, Z, AA, AD)

| Gate | Invariant | Evidence | Result |
|---|---|---|---|
| **E** | Tenant derived only from IdentityContext | `resolveSessionIdentity()` derives tenant from `tenant_users`/`tenants` membership (server-side); `requestedTenantId` is "validated, never trusted (U-01 Gate 3)"; SO routes pass **no** requested tenant. Domain never reads `x-tenant-id` header or body tenant. | **PASS** |
| **F** | RLS tenant-scoped | `sales_orders` RLS: `FOR ALL TO authenticated USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id())`. All `shp_*` tables (incl. the ADR-038 host) have the same `get_my_tenant_id()` tenant-isolation policy. | **PASS** |
| **Z** | `commercial:*` are canonical U-02 permissions | `commercial:read` / `commercial:manage` are valid `IdentityPermission` values (authorization registry). `assertPermission` raises 403 (`ERR_FORBIDDEN_PERMISSION`) when missing. | **PASS** |
| **AA** | API is thin; authorization before any business op | Routes call `resolveSessionIdentity()` then dispatch to domain. `createSalesOrder` gate 1 = `assertPermission(context,'commercial:manage')`; gate 2 = trusted tenant; gates 3-4 = engagement/quote ownership. | **PASS** |
| **AD** | Service-role trust boundary is fully covered by app-layer checks | The domain uses `supabaseAdmin` (service role → **bypasses RLS**). The real security boundary is the application layer: `assertPermission` + tenant filters (`.eq('tenant_id', ctx.tenantId)`) + `validateEngagement`/`validateQuote` ownership. All reads/writes are tenant-filtered; cross-tenant access raises 404/403. RLS remains the boundary for any browser-direct `authenticated`-role access. **Documented finding (no defect).** | **PASS** |

### C.6 Test Quality & Regression (Gates AC, AR, AS, AT, I)

| Gate | Invariant | Evidence | Result |
|---|---|---|---|
| **AC** | U-13 replaced naive whole-file quote-scanners with table-scoped detectors | `u11-quote-identity-authority.test.ts`, `u12-commercial-lineage.test.ts`, `u12a-sales-order-architecture.test.ts`, `u13-sales-order-foundation.test.ts` all use `tableHasQuoteFk(sql, table)` (table-scoped). U-13R **independently re-derives** these facts. | **PASS** |
| **I** | Detector soundness & precision (no silent weakening) | **Soundness positive control:** `tableHasQuoteFk` catches a planted `work_orders.quote_id REFERENCES crm_quotations(id)` → returns true (U13R-I). **Precision:** returns **false** for a compliant operational table with no quote FK (U13R-I2). The repair is faithful, not weakened. | **PASS** |
| **AR** | U-13R not circular (independent parse) | U-13R re-derives operational DDL via word-boundary regex + its own `tableHasQuoteFk`, independent of the U-11/U-12A/U-13 detectors. | **PASS** |
| **AS** | Blind-spot coverage | U-13R adds blind-spot probes: client direct `sales_orders` access (AP), client canonical `so_number` generation (AK), `sales_order_id` single-migration placement (R), detector soundness/precision (I/I2), confirm-path operational isolation (M). | **PASS** |
| **AT** | Environmental | Full suite runs in-process (tsx) with no network/DB/live-Supabase dependency; deterministic fixtures. Concurrency/RLS behavior is asserted statically + via mock, not live (documented env-N/A). | **PASS** |

### C.7 Migration & Doc Consistency (Gates AU, AV, AW, AX)

| Gate | Invariant | Evidence | Result |
|---|---|---|---|
| **AU** | Migration 019 forensics | Idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE SEQUENCE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`); `DROP POLICY IF EXISTS` + recreate (idempotent RLS); grants scoped to new SO objects. | **PASS** |
| **AV** | Blast radius limited | 019 touches **only** `sales_orders` (+ `seq_sales_order`, function, the `com_sales_order_status` enum) and the single ADR-038 column on `shp_shipments`. No `work_orders`/`wo_items`/`job_orders`/`cus_`/`fw_`/`svc_`/`crm_`/`commercial_capability` mutation (executable-statement scan, comments stripped). | **PASS** |
| **AW** | AGENTS.md reflects U-13 | `AGENTS.md` contains the U-13 `[DONE]` entry (ADR-034..038, migration 019, invariants). | **PASS** |
| **AX** | Doc↔implementation consistency | U-13 implementation report (§37), U-13 final acceptance (§38), ADRs, and this U-13R report agree on every schema fact (verified column-by-column). | **PASS** |

---

## D. Business-Flow Simulated Scenarios (§56)

| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | Direct SO (no quote) | Valid | **PASS** (behavioral U13R-B1: `created=true`, tenant A, `SO-` number) |
| 2 | Quote→SO | Valid, quote attributed | **PASS** (behavioral U13R-B2q: `quoteId` recorded on commercial header) |
| 3 | Multi-SBU inheritance | Supported via engagement capability bindings (ADR-020) | **PASS** (static: SO inherits engagement; no capability-breaking change) |
| 4 | Split shipment (1 SO→N Shipments) | Valid | **PASS** (static: `sales_order_id` non-unique nullable; ADR-038) |
| 5 | Multiple WO (1 SO→N WO) | Valid | **PASS** (static: ADR-037; no SO→WO link yet — enforced structurally in header-only scope) |
| 6 | Many SO→1 WO sharing | **FORBIDDEN** (ADR-037) | **PASS** (static: no vector; no SO→WO write exists in U-13) |
| 7 | Cross-tenant (B caller, A engagement) | **FORBIDDEN** | **PASS** (behavioral U13R-B7: `validateEngagement` rejects) |
| 8 | Quote→Operational (bypass) | **FORBIDDEN** | **PASS** (static: zero quote FK on operational tables; Gate H) |
| 9 | SO→JO (leakage) | **FORBIDDEN** | **PASS** (static: zero SO ref on `job_orders`/`wo_items`/`work_orders`; Gate Q/S) |

---

## E. Species Classification of SO-Related Identifiers (Gate AQ)

| Identifier | Site(s) | Classification |
|---|---|---|
| `sales_orders` (canonical table) | Migration 019 + `service.ts` + 2 API routes | **CANONICAL-COMMERCIAL** (authoritative) |
| `so_number` / `next_sales_order()` | `service.ts` only (+ migration) | **CANONICAL-BUSINESS-NUMBER** (server-authoritative) |
| `sales_order_id` (shipment FK) | Migration 019 only; unused by runtime | **CANONICAL-OPERATIONAL-ATTRIBUTION** (ADR-038; populated in Fulfillment) |
| `idempotency_key` (SO) | `service.ts` | **IDEMPOTENCY-CORRELATION** (not a business identity) |
| `SALES_ORDER` (source_type label) | Migration `029_wms_operational_schema.sql:61` (`CHECK source_type IN (...)`) | **UNRELATED-ENUM-LABEL** (P4; no SO data reference) |
| `FORBIDDEN_WO_SHARING` error code | `types.ts` (declared only) | **RESERVED** (enforced structurally; not yet raised) |

No SO-related identifier is generated, mutated, or read client-side. No `md_users` resurrection. No operational table carries an SO or Quote reference.

---

## F. Enforcement Matrix (Gate AC)

| Layer | Mechanism | Enforcement |
|---|---|---|
| **DB** | `UNIQUE(tenant_id, so_number)`; `UNIQUE(tenant_id, idempotency_key)`; RLS `get_my_tenant_id()`; `ON DELETE SET NULL`/`RESTRICT`; enum + CHECK constraints | Canonical identity, tenant isolation, reference safety |
| **Domain** | `assertPermission`; tenant filter on every query; `validateEngagement`/`validateQuote`; `next_sales_order()` RPC; server-derived tenant | Authorization + tenant + number authority + no client tenant |
| **API** | Thin `resolveSessionIdentity()` → domain dispatch | No tenant from body; clean HTTP/domain separation |
| **Test** | U-13 (41) + U-13R (33) + table-scoped detectors + positive controls | Prevent regression & confirm faithful repair |

---

## G. Findings, Classifications & Repair Policy

**Primary finding (read-mostly):** The U-13 Sales Order foundation is **architecturally faithful, structurally safe, tenant-safe, canonical-authoritative, and without dual paths**. **No P0/P1/P2 defect directly caused by U-13 was found.** Therefore **no production repair was required** (§57 — nothing to repair).

**Incidental observations (all P3/P4, documented — NOT expanded):**
- **P4** — Migration 029's `source_type` includes the label `'SALES_ORDER'` (an unrelated WMS enum literal). Not an SO data reference; no action.
- **P3** — `commercial_line_items` (Engagement-sell-line model) and the future `sales_order_items` (SO sell-lines) coexist as distinct concepts; the SO line table is deliberately deferred to a PRICING ADR (U-12A §K). No ambiguity is introduced by U-13.
- **P4** — `sales_order_id` is declared but not yet written by runtime code (expected for a header-only foundation; populated in the Fulfillment phase). No action.

**U-13R suite precision work (test-only, not a production change):** The first authoring of the U-13R suite produced 5 false-positive REDs, all **test-logic bugs** (not defects): (1) AU2 matched `DROP TABLE` inside migration rollback **comments**; (2)(3) Q/H substring-matched `commercial_work_orders` as the operational `work_orders`; (4) R counted an unrelated `SALES_ORDER` enum label as a schema reference; (5) I2's precision premise was misdesigned. All five were corrected in-suite (comment stripping, word-boundary scoping, column-level migration counting, and a genuine precision control). This is exactly the discipline the gate demands: **the reconciliation must be precise so it does not false-flag legitimate architecture.**

---

## H. Invariant Re-assertions (carried from U-13)

1. `sales_orders` is the sole commercial order root; `commercial_work_orders` remains the long-lived engagement container (ADR-034).
2. SO numbers MUST be allocated by `next_sales_order()`; client MUST NOT generate canonical SO numbers (ADR-035).
3. Confirmation is a commercial commitment; no operational record is created at confirm (ADR-036).
4. SO→WO is 1:N; **many SO → 1 WO FORBIDDEN** (ADR-037).
5. The only protected-operational reference in U-13 is `shp_shipments.sales_order_id` (nullable, `SET NULL`) (ADR-038).
6. No Quote FK on `work_orders`/`wo_items`/`job_orders`. Quote is CRM-only.
7. No client `supabase.from(...)` on `sales_orders`; no client canonical SO number generation; no client tenant header.

---

## I. Deliverables

- **Suite:** `lib/__tests__/u13r-sales-order-forensic-reconciliation.test.ts` (33 checks, U13R-00..U13R-Z, U13R-B1/B2q/B7/BF)
- **Runner:** registered in `scripts/run-full-regression.ts` (async suite)
- **Report:** this file (§61)
- **Acceptance:** `docs/architecture/SENTRALOGIS_PHASE4B_U13R_FINAL_ACCEPTANCE.md` (§62)
- **Evidence numbers:** Full regression **460/460 PASS, 0 FAIL**; TypeScript **0 errors**

---

## J. Verdict

Every GREEN criterion (§63) holds. The U-13 Sales Order foundation is reconciled as **architecturally faithful, structurally safe, tenant-safe, canonical-authoritative, without dual paths, and free of U-13-caused P0/P1/P2 defects**. The repair delivered during U-13 (table-scoped detectors, direct-SO, cross-tenant guards) is proven faithful by independent forensic control (U13R-I/I2) and full regression.

**U-13R COMPLETE — GREEN**
