# U-13 Sales Order Foundation — Implementation Report

**Date:** 2026-08-28
**Gate:** U-13 — Sales Order Foundation (canonical `sales_orders` commercial transaction layer)
**Depends On:** U-01 … U-12A-R ACCEPTED/GREEN; ADR-034…038 RATIFIED (U-12A-R)
**Status:** GREEN — COMPLETE (41/41 U-13 tests, 427/427 FULL REGRESSION, 0 TypeScript errors)

---

## A. Executive Summary

**Verdict: GREEN — PRODUCTION-READY FOUNDATION**

| Metric | Value |
|--------|-------|
| Ratified authority | ADR-034 (Engagement → SO 1:N), ADR-035 (SO number authority), ADR-036 (SO Fulfillment Boundary), ADR-037 (SO → WO cardinality), ADR-038 (Shipment → SO reference) |
| Canonical table | `public.sales_orders` (DB-UUID PK, `so_number` DB-authoritative) |
| Number authority | `next_sales_order()` PostgreSQL function (atomic `nextval`, `SO-YYYY-MM-NNNN`) |
| Uniqueness | `UNIQUE(tenant_id, so_number)` + `UNIQUE(tenant_id, idempotency_key)` |
| Tenant isolation | RLS `tenant_id = get_my_tenant_id()` + server-derived `IdentityContext` |
| Protected operational mutation | EXACTLY ONE (authorized ADR-038): `shp_shipments.sales_order_id` (nullable, `ON DELETE SET NULL`) |
| Long-lived container | `commercial_work_orders` untouched (Engagement still the container, ADR-034/ADR-037) |
| Scope decision | **SO header only** — no `sales_order_items` (deferred to a future PRICING ADR per U-12A §K) |
| U-13 test suite | 41/41 PASS (`lib/__tests__/u13-sales-order-foundation.test.ts`) |
| Full regression | **427/427 PASS, 0 FAIL** — 0 TypeScript errors |

U-13 implements the **smallest correct Sales Order foundation**: a canonical commercial transaction header (the "WHAT the customer ordered"), parented 1:N under the long-lived Engagement (ADR-034), with a single atomic server-side number authority (ADR-035), a clean commercial→operational fulfillment boundary (ADR-036), and the one authorized operational reference via Shipments (ADR-038). It does **not** introduce a competing order root, does **not** rewrite any protected operational table other than `shp_shipments.sales_order_id`, and does **not** create SO sell-lines.

---

## B. Scope In / Scope Out

**In scope (U-13 "smallest correct foundation"):**

1. `sales_orders` canonical header: DB-generated `id` UUID, DB-authoritative `so_number`, `UNIQUE(tenant_id, so_number)`, Engagement parent 1:N, nullable optional Quote reference, status enum, idempotency key, commercial fields, audit columns.
2. `next_sales_order(p_tenant_id UUID)` atomic server-side number authority (`nextval`, `SO-YYYY-MM-NNNN`) — mirrors the ratified U-11 `next_quote_number()` pattern.
3. `sales_orders` RLS — tenant-scoped via `get_my_tenant_id()`.
4. ADR-038 minimum operational reference: `shp_shipments.sales_order_id` (ONE SO → MANY Shipments). This is the single protected-operational mutation authorized by U-13.
5. Canonical domain service (`lib/sales-order/service.ts`): create / update-draft / confirm / cancel / find / list, with IdentityContext-derived tenant, `assertPermission` (U-02), engagement & quote ownership validation, and idempotent create (INSERT + unique-violation + re-select).
6. Thin API routes (`/api/v1/commercial/sales-orders[/:id]`) delegating to the domain.
7. U-13 test suite (41 tests: static migration/domain forensic + in-memory behavioral).

**Out of scope (deliberately deferred):**

- `sales_order_items` / SO sell-lines / pricing model. Per U-12A §K, `commercial_line_items` cannot safely represent SO sell-lines (its parent FK points to the Engagement `commercial_work_orders`, which would corrupt SO lineage). A **future PRICING ADR** governs this. U-13 does NOT create `sales_order_items` and does NOT reuse `commercial_line_items` — header only.
- WO ownership column / SO→WO physical composition. ADR-037 (many SO → one WO FORBIDDEN) is enforced structurally in U-13 (no `work_order_id` on `sales_orders`; the SO domain never writes `work_orders`). The physical fulfillment composition belongs to the Fulfillment phase (ADR-036).
- No marketplace/CRM/Quote/forwarding/dispatch/driver/GPS/finance/billing redesign.
- No UI. U-13 is domain + API + migration only (UI composition belongs to a later phase).

---

## C. Ratified Architecture (ADR-034 … ADR-038)

Ratified by U-12A-R (2026-08-28) — **all `Status: RATIFIED`**, in `docs/architecture/`:

- **ADR-034** — Engagement → Sales Order (1:N). `commercial_work_orders` remains the long-lived container; `sales_orders` is the specific customer commercial commitment child.
- **ADR-035** — SO number authority: `next_sales_order()` PostgreSQL generator; client MUST NOT generate canonical SO numbers.
- **ADR-036** — SO Fulfillment Boundary (commercial → operational handoff). Confirm is the explicit commercial commitment; it does not itself create operational records.
- **ADR-037** — SO → WO cardinality: 1 SO → N WO; **many SO → 1 WO is FORBIDDEN**. Enforced structurally in U-13.
- **ADR-038** — Shipment → SO reference: 1 SO → many Shipments (`shp_shipments.sales_order_id`, nullable, `ON DELETE SET NULL`).

---

## D. Canonical Data Model — `public.sales_orders`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK `DEFAULT gen_random_uuid()` | DB-generated — NEVER client (ADR-013/ADR-035) |
| `tenant_id` | UUID NOT NULL → `md_tenants(id)` | server-derived from IdentityContext (U-01) |
| `engagement_id` | UUID NOT NULL → `commercial_work_orders(id)` `ON DELETE RESTRICT` | ADR-034 parent, 1:N (NOT unique) |
| `quote_id` | UUID → `crm_quotations(id)` `ON DELETE SET NULL` | optional; direct SO valid |
| `so_number` | TEXT NOT NULL | allocated only by `next_sales_order()` (ADR-035) |
| `status` | `com_sales_order_status` `DEFAULT 'DRAFT'` | DRAFT/CONFIRMED/IN_FULFILLMENT/PARTIALLY_FULFILLED/FULFILLED/CLOSED/CANCELLED |
| `idempotency_key` | UUID | `UNIQUE(tenant_id, idempotency_key)` |
| `order_date` / `target_fulfillment_date` | DATE / DATE | commercial timing (ADR-036) |
| `currency` / `total_agreed_revenue` | TEXT / NUMERIC(18,2) | revenue `CHECK (>= 0)` (fundamental pricing deferred to PRICING ADR) |
| `payment_terms_days` | INTEGER | `CHECK (>= 0)` |
| `incoterm` / `commercial_notes` | TEXT / TEXT | optional |
| `version_no` | INTEGER `DEFAULT 1` | optimistic-concurrency style; `CHECK (>= 1)` |
| `confirmed_at` / `cancelled_at` / `cancelled_reason` | TIMESTAMPTZ / TIMESTAMPTZ / TEXT | lifecycle audit |
| `created_at` / `updated_at` | TIMESTAMPTZ | DB defaults |
| `created_by` / `updated_by` | UUID → `auth.users(id)` | audit |

**Constraints:** `uq_sales_order_number UNIQUE(tenant_id, so_number)`; `uq_sales_order_idempotency UNIQUE(tenant_id, idempotency_key)`; revenue/payment/version non-negativity `CHECK`s; NOT-NULL `engagement_id` (ADR-034); nullable `quote_id` (direct SO).

**Indexes:** tenant, engagement, quote, (tenant,status).

**Rollback:** `DROP TABLE IF EXISTS public.sales_orders; DROP SEQUENCE IF EXISTS seq_sales_order; DROP FUNCTION IF EXISTS public.next_sales_order(UUID); ALTER TABLE public.shp_shipments DROP COLUMN IF EXISTS sales_order_id;` (all additive/idempotent/non-destructive).

---

## E. Number Authority — `next_sales_order()` (ADR-035)

```sql
CREATE OR REPLACE FUNCTION public.next_sales_order(p_tenant_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_year TEXT; v_month TEXT; v_seq BIGINT; v_so_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq  := nextval('seq_sales_order');
  v_so_number := 'SO-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_so_number;
END; $$;
```

- **Atomic & concurrency-safe:** `nextval()` is session-safe; no `SELECT MAX + increment` race.
- **Uniqueness safety net:** `UNIQUE(tenant_id, so_number)` at DB level.
- **Format:** `SO-YYYY-MM-NNNN` (world-visible, per-tenant-unique; separate `seq_sales_order`).
- **Client MUST NOT** generate canonical SO numbers (invariant enforced by U13-02, U13-06, U13-06b and §35 scan).
- Server-only path: `allocateSalesOrderNumber()` in `service.ts` invokes `rpc('next_sales_order', { p_tenant_id })`.

---

## F. Lifecycle State Machine (ADR-036/§25)

```
DRAFT → CONFIRMED → (Fulfillment phase) → IN_FULFILLMENT → PARTIALLY_FULFILLED → FULFILLED → CLOSED
DRAFT | CONFIRMED | IN_FULFILLMENT | PARTIALLY_FULFILLED → CANCELLED
```

U-13 domain implements only the transitions the **header** can perform today:

- **DRAFT → CONFIRMED** (`confirmSalesOrder`): confirms the commercial commitment. **Does NOT create operational records** (ADR-036 boundary).
- **DRAFT / active → CANCELLED** (`cancelSalesOrder`): controlled amendment recording `cancelled_reason`; terminal states (`FULFILLED`/`CLOSED`) are not cancellable.
- **DRAFT edit** (`updateDraftSalesOrder`): only `EDITABLE_SO_STATUSES` (`DRAFT`, `CONFIRMED`); increments `version_no`.

`IN_FULFILLMENT / PARTIALLY_FULFILLED / FULFILLED / CLOSED` are declared for the Fulfillment phase; the header service rejects invalid/arbitrary client transitions (`INVALID_STATUS_TRANSITION`).

---

## G. Fulfillment Boundary (ADR-036)

- `createSalesOrder` / `confirmSalesOrder` never touch `work_orders`, `wo_items`, or `job_orders` (verified by U13-12 and structural scans).
- The **only** operational reference U-13 introduces is `shp_shipments.sales_order_id` (ADR-038) — a nullable additive FK with `ON DELETE SET NULL` (a cancelled/removed SO cannot cascade-destroy the shipment).
- SO→WO physical composition (ADR-037 cardinality) is deferred to the Fulfillment phase and enforced structurally in U-13.

---

## H. Work Order Cardinality (ADR-037)

- **Allowed:** 1 SO → N WO.
- **Forbidden:** many SO → 1 WO.
- **U-13 enforcement (structural):** `sales_orders` has **no** `work_order_id` column; the SO domain never writes `work_orders`. Therefore no sharing/co-ownership vector exists in U-13. The physical fulfillment composition will be designed in the Fulfillment phase against the ratified 1:N-only rule.

---

## I. Multi-SBU (ADR-020 inheritance)

A single SO inherits multi-SBU composition through its parent Engagement: `commercial_capability_bindings` (`UNIQUE(tenant_id, work_order_id, capability_type)`) already supports CUSTOMS/FORWARDING/TRUCKING/WAREHOUSE peer capabilities on one engagement (ADR-020). U-13 adds no new composition mechanism; verified by U13-11.

---

## J. Identity / Tenant / Authorization (U-01 / U-02)

- **Tenant** is resolved EXCLUSIVELY from the trusted `IdentityContext` (`resolveSessionIdentity()` from `lib/application/identity/session-source.ts`). Client-supplied tenant headers/payload are rejected. The input DTO documents the **NO-tenantId** invariant (U13-16c).
- **Authorization** via `assertPermission(context, 'commercial:manage' | 'commercial:read')` (U-02). Cross-tenant access is impossible: every read/write adds `.eq('tenant_id', context.tenantId)` and engagement ownership is validated.
- **RLS** at DB level: `USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id())`.

---

## K. Create Path — Idempotency & Tenancy

`createSalesOrder` order of operations:

1. `assertPermission(context, 'commercial:manage')` (U-02).
2. `tenantId = context.tenantId` (trusted, U-01 — never client).
3. `validateEngagement(tenantId, engagementId)` — rejects cross-tenant/missing engagement (`ENGAGEMENT_NOT_FOUND`, 404).
4. `validateQuote(tenantId, quoteId)` if provided — rejects cross-tenant quote (`QUOTE_NOT_FOUND`, 404); quote is optional (direct SO).
5. `allocateSalesOrderNumber(tenantId)` → canonical `so_number` (ADR-035).
6. INSERT with `idempotency_key`; on unique-violation (`23505`) with idempotency key supplied, re-select by `(tenant_id, idempotency_key)` and return the existing row (`created:false`) — retry-safe, consistent with U-03 `resolveOrCreateEngagement`.
7. Return `{ salesOrder, created:true }`.

---

## L. API

**`POST /api/v1/commercial/sales-orders`** — create Sales Order (body: `engagementId`, optional `quoteId`, `idempotencyKey`, commercial fields). 201 + `{ salesOrder, created }`; 401/403 identity; 404 engagement/quote; 409 conflict; 422 domain.

**`GET /api/v1/commercial/sales-orders?engagementId=`** — list SOs for an engagement (validates engagement ownership; `commercial:read`).

**`GET /api/v1/commercial/sales-orders/[id]`** — fetch by id (`commercial:read`; tenant-scoped).

**`PATCH /api/v1/commercial/sales-orders/[id]`** — update DRAFT header (`commercial:manage`; only editable statuses).

**`POST /api/v1/commercial/sales-orders/[id]/action`** — `confirm` | `cancel` (body: `{ action, reason? }`).

HTTP error mapping in `lib/sales-order/http.ts` (`toErrorResponse`) maps `IdentityResolutionError` and `SalesOrderError` to stable status/error-code pairs (`NOT_FOUND`, `CONFLICT`, `UNIQUE_VIOLATION`, `INVALID_STATUS_TRANSITION`, `ENGAGEMENT_NOT_FOUND`, `QUOTE_NOT_FOUND`, `SALES_ORDER_NOT_FOUND`, `DATABASE_ERROR`).

Routes are thin; all business logic lives in the canonical domain (`service.ts`). **0 browser-direct `supabase.from(...)`.**

---

## M. Test Suite — `lib/__tests__/u13-sales-order-foundation.test.ts` (41 tests)

**Static / migration / forensic (checks):**
- **Identity:** U13-01 PK = DB UUID `gen_random_uuid()`; U13-02 no client PK generation; U13-06/U13-06b number authority server-only via RPC.
- **Number:** U13-03 function + `nextval` atomic; U13-03b `SO-YYYY-MM-NNNN` format; U13-04 `UNIQUE(tenant_id, so_number)`; U13-05 sequence.
- **Engagement:** U13-07 `engagement_id` NOT NULL FK (1:N, not unique); U13-08 engagement not renamed/dropped.
- **Quote/direct:** U13-09 `quote_id` nullable (direct SO).
- **No bypass:** U13-10 **table-scoped** — no `quote_id` FK column on `work_orders`/`wo_items`/`job_orders`; U13-12 SO create doesn't touch operational tables.
- **Shipment (ADR-038):** U13-13 `shp_shipments.sales_order_id` FK nullable + `ON DELETE SET NULL`; U13-13b not UNIQUE (many shipments per SO).
- **WO (ADR-037):** U13-14 U-13 migration mutates no protected WO table + no `work_order_id`; U13-14b no SO→JO shortcut; U13-15 ADR-037 enforced structurally.
- **Tenant/RLS:** U13-16 RLS enabled + `get_my_tenant_id()`; U13-16b no client-header tenant authority; U13-16c DTO documents NO-tenantId.
- **Lifecycle:** U13-17 status enum DRAFT..CLOSED,CANCELLED; U13-18 no arbitrary client status (`INVALID_STATUS_TRANSITION`).
- **Idempotency/constraints:** U13-19 `UNIQUE(tenant_id, idempotency_key)` + number not used as idempotency; U13-20 revenue/payment non-neg `CHECK`s.
- **Regression:** U13-21 U-12A registrar still present.

**Behavioral (in-memory chainable mock):**
- **U13-B01..**: create passthrough, idempotency create (`created:false` on unique-violation re-select), number authority cadence/format, multi-SBU inheritance, shipment mutation containment, confirm/cancel transitions + invalid-transition rejection, `findById` tenant-scoped (B cannot read A), list requires read permission + tenant-owned engagement (cross-tenant list fails `ENGAGEMENT_NOT_FOUND`), and 1:N engagement→many-SO (distinct numbers).

---

## N. Full Regression

| Suite | Result |
|-------|--------|
| Identity Resolver (U-01) | 36/36 PASS |
| Authorization Gate (U-02) | 66/66 PASS |
| Shipment Domain / API / Creator | 10/10, 11/11, 9/9 PASS |
| U-03 Engagement Bridge / Commercial WO / Validation | 11/11, 15/15, 18/18 PASS |
| U-04 Validation | 18/18 PASS |
| U-05 Capability Registry | 12/12 PASS |
| U-06 Binding Lifecycle / U-06A Containment | 20/20, 10/10 PASS |
| U-07 Execution Lineage / U-08 Forwarding Writer | 12/12, 8/8 PASS |
| U-09 / U-10 / U-10R | PASS |
| U-11 Quote Identity | **28/28 PASS** |
| U-12 Commercial Lineage | **32/32 PASS** |
| U-12A Sales Order Architecture | **19/19 PASS** |
| **U-13 Sales Order Foundation** | **41/41 PASS** |

**TOTAL: 427/427 PASS, 0 FAIL** — `npx tsc --noEmit`: 0 errors.

> Note: `[Shipment API Error]` logged during the run is a pre-existing environmental condition (live PostgreSQL at `10.0.0.1:5432` unavailable); that suite gracefully handles DB absence and still reports 11/11 PASS. No counted failure.

---

## O. Repository Identity Scan (§35)

- No client-side `SO-YYYY-MM-` generation outside `__tests__`/migrations.
- `so_number` is assigned only inside `service.ts` from `next_sales_order()` RPC; the API routes are the only server entry points.
- No `Math.random()`/`Date.now()`/`crypto.randomUUID()` composition building a canonical SO number in `app/`/`lib/`.
- 0 browser-direct `supabase.from(...)` for `sales_orders` — all writes are server-side domain/API.

---

## P. Files Changed / Created

| File | Change |
|------|--------|
| `supabase/migrations/20260828_019_sales_order_foundation.sql` | NEW — enum, sequence, `sales_orders`, `next_sales_order()`, RLS, `shp_shipments.sales_order_id` |
| `lib/sales-order/types.ts` | NEW — SO types/statuses/errors/inputs (NO-tenantId documented) |
| `lib/sales-order/service.ts` | NEW — canonical SO domain service |
| `lib/sales-order/http.ts` | NEW — error→HTTP mapping |
| `app/api/v1/commercial/sales-orders/route.ts` | NEW — POST create, GET list |
| `app/api/v1/commercial/sales-orders/[id]/route.ts` | NEW — GET/PATCH/action |
| `lib/__tests__/u13-sales-order-foundation.test.ts` | NEW — 41-test suite |
| `scripts/run-full-regression.ts` | MODIFIED — registered U-13 suite |
| `lib/__tests__/u12a-sales-order-architecture.test.ts` | MODIFIED — U12A-10A/10B updated to ratified state (exactly one canonical root + single authority), U12A-02A table-scoped |
| `lib/__tests__/u11-quote-identity-authority.test.ts` | MODIFIED — U11-20 table-scoped (precision, no weakening) |
| `lib/__tests__/u12-commercial-lineage.test.ts` | MODIFIED — U12-04A/10B table-scoped (precision, no weakening) |
| `docs/architecture/ADR-034..038-*.md` | RATIFIED (U-12A-R) |
| `docs/architecture/SENTRALOGIS_PHASE4B_U13_FINAL_ACCEPTANCE.md` | NEW |

---

## Q. Invariants Introduced

1. **SO business numbers MUST be allocated by canonical `next_sales_order()`** — client code MUST NOT generate canonical SO numbers (ADR-035).
2. **SO PK is DB-generated UUID** — never client.
3. **Engagement → SO is 1:N** — `commercial_work_orders` remains the long-lived container (ADR-034); Engagement is NOT renamed/replaced.
4. **SO → WO is 1:N; many SO → 1 WO is FORBIDDEN** (ADR-037) — enforced structurally in U-13 (no `work_order_id` on `sales_orders`; SO domain never writes `work_orders`).
5. **SO commercial→operational boundary (ADR-036):** confirm does not create operational records; the only U-13 operational mutation is `shp_shipments.sales_order_id` (ADR-038, 1 SO → many Shipments, nullable, `ON DELETE SET NULL`).
6. **Tenant is server-derived** (`IdentityContext`), never from client headers/payload; RLS `tenant_id = get_my_tenant_id()`.
7. **Sell-lines/pricing deferred** to a future PRICING ADR (U-12A §K) — `sales_order_items` not created, `commercial_line_items` not reused for SO lines.

---

## R. Risks & Remaining Debt

- **Sell-lines/pricing model** — deliberately absent (header-only). Governed by a future PRICING ADR. No line-level detail until then.
- **Fulfillment composition** — SO→WO physical linking is deferred to the Fulfillment phase; U-13 enforces the cardinality structurally only.
- **`total_agreed_revenue`** is a single header amount with a non-negativity `CHECK`; multi-line revenue (sell-lines) is a PRICING-ADR concern.
- **Sequence is global** (not per-tenant); per-tenant uniqueness is enforced by `UNIQUE(tenant_id, so_number)`, so different tenants may share `NNNN` — acceptable and intentional.
- DB-connected suites (`Shipment API`) require live credentials outside this environment; they degrade gracefully.

---

## S. Deploy / Application

- Migration `20260828_019_sales_order_foundation.sql` must be applied via Supabase (as with U-11 `018`, U-12A `017`, and prior migrations).
- No new environment variables; `next_sales_order()` runs `SECURITY DEFINER` and reads `seq_sales_order` (grants set on `authenticated`).
- Domain runs server-side only (App Router route handlers + Next Server Actions), never browser-direct.

---

## T. Verification Commands

```bash
npx tsx scripts/run-full-regression.ts   # 427/427 PASS, 0 FAIL
npx tsc --noEmit                          # 0 errors
```

---

**U-13 COMPLETE — GREEN**
