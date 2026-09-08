# U-13R Final Acceptance Report

**Date:** 2026-08-28
**Gate:** U-13R — Sales Order Forensic Reconciliation (completion of U-13)
**Report:** `docs/architecture/SENTRALOGIS_PHASE4B_U13R_FINAL_ACCEPTANCE.md`
**Reconciliation:** `docs/architecture/SENTRALOGIS_PHASE4B_U13R_FORENSIC_RECONCILIATION_REPORT.md`

---

## U-13R STATUS: GREEN

```
Full Regression:    460/460 PASS (0 FAIL)
TypeScript:         0 errors
U-13 Suite:         41/41 PASS
U-13R Suite:        33/33 PASS
Production impact:  NONE (read-only forensic gate; no source/migration change)
```

---

## Acceptance Criteria — Verification

| # | Criterion | Result |
|---|-----------|--------|
| 1 | U-13R suite exists (`lib/__tests__/u13r-sales-order-forensic-reconciliation.test.ts`) and is registered in the regression runner. | PASS |
| 2 | Structural faithfulness proven: `sales_orders` DDL matches ADR-034..038 (DB-UUID PK, `so_number` authority, Engagement parent RESTRICT, nullable `quote_id`, `UNIQUE(tenant_id, so_number)`, `UNIQUE(tenant_id, idempotency_key)`). | PASS |
| 3 | Single number authority `next_sales_order()` (atomic `nextval` + `SECURITY DEFINER`, `SO-YYYY-MM-NNNN`); no client generation (Gate AK/C/D). | PASS |
| 4 | Commercial→operational boundary: zero SO/Quote reference on `work_orders`/`wo_items`/`job_orders`; confirm = pure status transition (Gates M/W/Q/R/S/H). | PASS |
| 5 | ADR-037 (many SO → 1 WO forbidden) enforced structurally — no SO→WO vector in U-13 (Gate S). | PASS |
| 6 | ADR-038: `shp_shipments.sales_order_id` nullable + `ON DELETE SET NULL`; the ONLY protected-operational mutation (Gates O/P/AE). | PASS |
| 7 | Tenant safety: RLS `get_my_tenant_id()` on `sales_orders` + `shp_*`; tenant server-derived; no client tenant header; cross-tenant rejected (Gates E/F/AD, behavioral U13R-B7). | PASS |
| 8 | Authorization via `assertPermission` (`commercial:manage/read`); thin API routes (Gates Z/AA). | PASS |
| 9 | No competing order root; single SO writer; no client direct `sales_orders` access (Gates AN/AO/AP). | PASS |
| 10 | Repair faithfulness: table-scoped detectors proven via soundness + precision positive controls (Gates AC/I/I2) — the U-13 repair is NOT a silent weakening. | PASS |
| 11 | No P0/P1/P2 defect directly caused by U-13; no production repair required (§57). | PASS |
| 12 | Full regression 460/460 PASS + 0 TypeScript errors; read-mostly (no source/migration change). | PASS |

---

## Findings Summary

1. **The reconciliation confirms the U-13 Sales Order foundation is canonical and clean.** There is no competing order root, no commercial→operational leakage, and no dual path. The single protected-operational reference is the ADR-038 `shp_shipments.sales_order_id`.

2. **Every GREEN criterion (§63) holds.** The gate list A..AX was executed and reported in the reconciliation report (§61); all PASS.

3. **No repair was required.** Per the read-mostly mandate (§57), U-13R made **zero production code or migration changes**. The only changes are additive: the new forensic test suite and its runner registration.

4. **The U-13 repair (table-scoped detectors) is verified faithful**, not weakened — by independent re-derivation and by soundness/precision positive controls (U13R-I/I2).

5. **Incidental observations are P3/P4 and documented only** (migration 029's unrelated `SALES_ORDER` enum label; deferred SO sell-line table; unused-in-runtime `sales_order_id`), in accordance with the "document, don't silently expand" policy.

---

## Invariants Re-asserted

- `sales_orders` is the sole commercial order root (ADR-034).
- SO numbers MUST be allocated by `next_sales_order()`; client MUST NOT generate (ADR-035).
- Confirm is a commercial commitment; no operational record at confirm (ADR-036).
- SO→WO 1:N; many SO→1 WO FORBIDDEN (ADR-037).
- `shp_shipments.sales_order_id` nullable + `SET NULL`; the only protected-operational ref (ADR-038).
- No Quote FK on operational tables; Quote is CRM-only.
- No client `supabase.from('sales_orders')`; no client canonical SO number; no client tenant header.

---

## Verdict

The U-13 Sales Order foundation is reconciled and accepted. All forensic gates pass, the enforcement matrix is intact, the full regression is 460/460 PASS with 0 TypeScript errors, and the read-mostly mandate is honored (no production source or migration was changed). The U-13 repair is proven faithful.

**U-13R COMPLETE — GREEN**
