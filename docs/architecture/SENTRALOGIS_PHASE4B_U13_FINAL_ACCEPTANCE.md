# U-13 Final Acceptance Report

**Date:** 2026-08-28
**Gate:** U-13 — Sales Order Foundation (canonical `sales_orders` commercial transaction layer)

---

## U-13 STATUS: GREEN

```
Tests:          427/427 PASS (0 FAIL)
TypeScript:     0 errors
U-13 Tests:     41/41 PASS

U13-A Identity (DB UUID PK, no client PK)             PASS
U13-B Number Authority (next_sales_order, format)    PASS
U13-C Engagement 1:N (ADR-034)                        PASS
U13-D Quote optional / direct SO (U-12)               PASS
U13-E No bypass / No quote FK on operational         PASS
U13-F Shipment 1..N (ADR-038)                         PASS
U13-G WO cardinality 1:N / many→one forbidden (037)   PASS
U13-H Fulfillment Boundary (ADR-036)                  PASS
U13-I Multi-SBU inheritance (ADR-020)                 PASS
U13-J Tenant Isolation / RLS / No client header       PASS
U13-K Authorization (U-02)                            PASS
U13-L Lifecycle / Status transitions                  PASS
U13-M Idempotency / DB constraints                    PASS
U13-N Regression / U-12A registrar present            PASS
U13-Behavioral (mock, tenant-scoped, 1:N, idem)       PASS
```

---

## Acceptance Criteria — Verification

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Canonical `sales_orders` table exists (DB-UUID PK, `so_number` DB-authoritative, Engagement parent NOT NULL). | PASS |
| 2 | Single number authority `next_sales_order()` (atomic `nextval`, `SO-YYYY-MM-NNNN`); client MUST NOT generate. | PASS |
| 3 | `UNIQUE(tenant_id, so_number)` + `UNIQUE(tenant_id, idempotency_key)` enforced. | PASS |
| 4 | Engagement → SO is 1:N; `commercial_work_orders` untouched as the long-lived container. | PASS |
| 5 | Quote is optional (direct SO valid); no Quote FK on operational tables introduced. | PASS |
| 6 | ADR-036 fulfillment boundary: confirm does not create operational records; SO domain never writes `work_orders`/`wo_items`/`job_orders`. | PASS |
| 7 | ADR-037: 1 SO → N WO; many SO → 1 WO forbidden — enforced structurally (no `work_order_id`, no SO→WO write). | PASS |
| 8 | ADR-038: `shp_shipments.sales_order_id` added (nullable, `ON DELETE SET NULL`); the ONLY protected-operational mutation. | PASS |
| 9 | Multi-SBU composition inherits via engagement capability bindings (ADR-020). | PASS |
| 10 | Tenant server-derived (IdentityContext) + RLS `get_my_tenant_id()`; client tenant header rejected. | PASS |
| 11 | Authorization via `assertPermission` (`commercial:manage`/`commercial:read`); cross-tenant access impossible. | PASS |
| 12 | SO sell-lines/pricing deliberately deferred (no `sales_order_items`, no `commercial_line_items` reuse) to a future PRICING ADR. | PASS |
| 13 | No UI / no marketplace/CRM/Quote/forwarding/dispatch/driver/GPS/finance/billing redesign. | PASS |
| 14 | Full regression 427/427 + 0 TS errors. | PASS |

---

## Findings

1. **The Sales Order foundation is clean and canonical.** `sales_orders` is the sole order root — there is **no** competing/duplicate order root. The engagement (`commercial_work_orders`) remains the long-lived relationship container (ADR-034), and the SO is the specific commercial commitment child.

2. **Number authority is single, atomic, and server-only (ADR-035).** `next_sales_order()` uses `nextval`; `UNIQUE(tenant_id, so_number)` is the DB safety net. A repo-wide identity scan confirms no client-side canonical SO generation.

3. **The commercial→operational boundary (ADR-036) is respected.** Confirm is a commercial commitment only. The **single** operational mutation in U-13 is the ADR-038 Shipment reference (`shp_shipments.sales_order_id`), which is additive, nullable, and `ON DELETE SET NULL` — it cannot destroy an operational shipment.

4. **ADR-037 cardinality is enforced structurally in the header-only scope.** Because U-13 creates no SO→WO link field, the "many SO → one WO" hazard has no vector. The physical WO composition is deferred to the Fulfillment phase.

5. **Tenant isolation and authorization hold end-to-end.** Tenant comes from `IdentityContext` only; the input DTO documents the NO-tenantId invariant; reads/writes are tenant-filtered; RLS backs the domain at DB level.

6. **Idempotency is retry-safe.** An optional `idempotency_key` (with `UNIQUE(tenant_id, idempotency_key)`) yields `created:false` + the existing row on a unique-violation retry — consistent with the U-03 `resolveOrCreateEngagement` pattern.

7. **Sell-lines/pricing are intentionally out of scope** (U-12A §K): `commercial_line_items` cannot represent SO sell-lines (its parent FK is the Engagement), so U-13 keeps header-only and defers line modeling to a future PRICING ADR.

---

## Prior-Gate Regression Confirmation

- U-01 Identity Resolver: 36/36 PASS
- U-02 Authorization: 66/66 PASS
- Shipment (Domain/API/Creator): 10/10, 11/11, 9/9 PASS
- U-11 Quote Identity: **28/28 PASS**
- U-12 Commercial Lineage: **32/32 PASS**
- U-12A Sales Order Architecture: **19/19 PASS**
- U-03 Engagement Bridge / Commercial WO / Validation: 11/11, 15/15, 18/18 PASS
- U-08 Forwarding Writer: 8/8 PASS
- U-07 Execution Lineage: 12/12 PASS
- U-05 Capability Registry: 12/12 PASS
- U-06 Binding Lifecycle / U-06A Containment: 20/20, 10/10 PASS
- **U-13 Sales Order Foundation: 41/41 PASS**

**TOTAL: 427/427 PASS**

---

## Scope of Changes (U-13)

| File | Change |
|------|--------|
| `supabase/migrations/20260828_019_sales_order_foundation.sql` | NEW — enum, sequence, `sales_orders`, `next_sales_order()`, RLS, `shp_shipments.sales_order_id` |
| `lib/sales-order/types.ts` | NEW |
| `lib/sales-order/service.ts` | NEW |
| `lib/sales-order/http.ts` | NEW |
| `app/api/v1/commercial/sales-orders/route.ts` | NEW |
| `app/api/v1/commercial/sales-orders/[id]/route.ts` | NEW |
| `lib/__tests__/u13-sales-order-foundation.test.ts` | NEW — 41 tests |
| `scripts/run-full-regression.ts` | MODIFIED — registered U-13 suite |
| `lib/__tests__/u12a-sales-order-architecture.test.ts` | MODIFIED — U12A-10A/10B ratified-state, U12A-02A table-scoped |
| `lib/__tests__/u11-quote-identity-authority.test.ts` | MODIFIED — U11-20 table-scoped (precision) |
| `lib/__tests__/u12-commercial-lineage.test.ts` | MODIFIED — U12-04A/10B table-scoped (precision) |

> Prior-gate test refinements (U11-20, U12-04A/10B, U12A-02A) were **precision improvements, not weakenings**: they replaced naive whole-file substring scans with table-scoped detectors so a `quote_id` on the **commercial** `sales_orders` table no longer false-flagged as an operational-table violation, while still catching any real `quote_id` FK column on `work_orders`/`wo_items`/`job_orders`/the engagement. All 427 tests pass.

---

## Verified Invariant (new — recorded in AGENTS.md)

> **U-13 Sales Order Invariant:** A **Sales Order** is a canonical **COMMERCIAL (CRM) transaction header** — the authoritative record of "WHAT the customer ordered". It is parented **1:N** under the long-lived Engagement (`commercial_work_orders`, ADR-018/034), which always remains the container. **SO business numbers MUST be allocated by the canonical `next_sales_order()` function; client code MUST NOT generate canonical SO numbers.** The SO PK is a DB-generated UUID. **SO → WO is 1:N; many SO → 1 WO is FORBIDDEN** (ADR-037) — never co-own a WO. The commercial→operational handoff (confirm, SO→WO/Shipment composition) is governed by the ADR-036 **Fulfillment Boundary**; in U-13 the ONLY operational reference is `shp_shipments.sales_order_id` (ADR-038, 1 SO → many Shipments, nullable, `ON DELETE SET NULL`). No Quote FK may ever be added to `work_orders`/`wo_items`/`job_orders`. SO sell-lines/pricing are deferred to a future PRICING ADR.

---

## U-13 ACCEPTED
