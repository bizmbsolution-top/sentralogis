# U-12 Commercial Lineage & Quote-to-Engagement Composition — Forensic Report

**Date:** 2026-08-28
**Gate:** U-12 — Commercial Lineage & Quote-to-Engagement Conversion Boundary Forensic Gate
**Depends On:** U-01 through U-11 ACCEPTED/GREEN
**Status:** **GREEN — 32/32 GATES PASS, 367/367 FULL REGRESSION PASS, 0 TypeScript errors**

---

## A. Executive Summary

**Verdict: GREEN — CLEAN SEPARATION CONFIRMED, NO ACTIVE BYPASS**

U-12 is a **forensic architecture audit**, not a code-repair gate. The objective was to establish whether a canonical Commercial-to-Operations lineage exists, determine the canonical conversion boundary, and prove that no competing Quote→Work Order bypass exists.

| Question | Finding | Verdict |
|----------|---------|---------|
| Does a `Quote → Engagement → WO → JO` lineage exist? | **NO** (deliberately). Quote is CRM-layer only. | CLEAN SEPARATION (not a defect) |
| Is there an active Quote→WO / Deal→WO bypass? | **NO** — zero active bypass paths found | GREEN |
| Is Quote→Engagement conversion implemented? | **NO** — boundary is currently a **documented MISSING edge** | GREEN-WITH-KNOWN-GAP |
| Is multi-SBU (multi-capability) composition supported? | **YES** — `commercial_capability_bindings` (ADR-020) | GREEN |
| Is tenant isolation server-derived? | **YES** — IdentityContext governs (ADR-018) | GREEN |
| Is conversion idempotency/concurrency safe? | **YES** (design) — `resolveOrCreateEngagement` + partial unique index | GREEN |
| Is the legacy lineage protected? | **YES** — `job_orders.wo_item_id → wo_items → work_orders` frozen | GREEN |

**Bottom line:** The canonical architecture intentionally maintains a **clean boundary between the Commercial layer (Quote, CRM) and the Operations layer (Engagement → WO → JO)**. There is no active competing lineage, no bypass, and the foundation for a future Quote→Engagement conversion exists (idempotent engagement resolution, server-derived tenant, multi-capability bindings). The conversion edge itself is the only MISSING segment, and it is deliberately forward-delegated to a U-12A decision review rather than retroactively invented.

---

## B. Forensic Methodology

1. **Schema map** — enumerated all commercial tables (`commercial_work_orders`, `commercial_service_scopes`, `commercial_capability_bindings`, `svc_service_requests`, `legacy_wo_bridge`, `crm_quotations`, `crm_deals`).
2. **Quote domain discovery** — mapped `crm_quotations.status` lifecycle, acceptance commands, and conversion RPCs.
3. **Bypass detection** — grepped for any `quote_id`/`quotation_id`/`deal_id` used as FK in WO/WO-item/JO writes; scanned all runtime code for "reads quote AND writes operational" patterns.
4. **Composition analysis** — examined `resolveOrCreateEngagement`, capability binding lifecycle, and registry to verify multi-SBU support.
5. **Automation** — codified findings into `lib/__tests__/u12-commercial-lineage.test.ts` (gates U12-01 → U12-11), integrated into `scripts/run-full-regression.ts`.

---

## C. Commercial vs Operational Object Classification

The core classification that governs every edge in the graph:

| Class | Purpose | Owner | Objects | Authority |
|-------|---------|-------|---------|-----------|
| **COMMERCIAL** (Customer Commitment) | Records the intent/agreement to transact | CRM / Commercial | `crm_quotations`, `crm_deals` | Quote number authority (`next_quote_number`) |
| **COMMERCIAL** (Canonical Engagement) | The canonical engagement root | Operations-adjacent commercial | `commercial_work_orders` | `resolveOrCreateEngagement` (ADR-018/032) |
| **COMMERCIAL** (Composition) | What capabilities are committed | Capability registry (U-05) | `commercial_capability_bindings`, `commercial_service_scopes`, `svc_service_requests` | Registry + lifecycle (U-06) |
| **OPERATIONAL** (Execution Authorization) | Authorizes physical execution | Operations / SBU | `work_orders`, `wo_items`, `job_orders` | Legacy lineage (protected) |

**Key architectural decision (confirmed):** A **Quote is a Commercial CRM object**; a **WO/WO-item/JO is an Operational object**. The commercial engagement (`commercial_work_orders`) occupies the **boundary** — it is the first object in the canonical chain that is tenant-grounded and can carry capability bindings. This is the natural, deliberate seam where a conversion boundary belongs.

---

## D. Current Commercial Graph (edge classification)

```
          crm_quotations  (COMMERCIAL — CRM layer)
             │  status: DRAFT → ... → ACCEPTED
             │  deal_id → crm_deals
             │  (NO operational writes on acceptance)
             │
             ▼  [MISSING] Quote → Engagement conversion
   commercial_work_orders  (COMMERCIAL — canonical engagement root, ADR-018)
             │  tenant_id (NOT NULL, server-derived)
             │  PK id UUID; wo_number UNIQUE
             │
             ├──► commercial_capability_bindings  (UNIQUE(tenant, wo, capability_type))
             │        MULTI-SBU composition (ADR-020)
             │
             ├──► svc_service_requests  (work_order_id FK → engagement)
             │
             └──► legacy_wo_bridge  (engagement_id ↔ legacy wo, side-table, no FK)
                        │
                        ▼
   [OPERATIONAL] work_orders ──► wo_items ──► job_orders  (protected lineage)
```

| Edge | Classification | Status |
|------|---------------|--------|
| `crm_quotations → crm_deals` | IMPLEMENTED (FK) | GREEN |
| `crm_quotations → commercial_work_orders` | **MISSING** (deliberately not implemented) | GAP (documented) |
| `crm_quotations → work_orders/wo_items/job_orders` | **ABSENT** (no active bypass) | GREEN |
| `commercial_work_orders → commercial_capability_bindings` | IMPLEMENTED (ADR-020) | GREEN |
| `commercial_work_orders → svc_service_requests` | IMPLEMENTED (FK) | GREEN |
| `commercial_work_orders ↔ work_orders` | IMPLEMENTED via `legacy_wo_bridge` (ADR-032, resolve-or-create, no FK) | GREEN |
| `(officer/writer) resolveOrCreateEngagement → engagement` | IMPLEMENTED (U-03/U-08) | GREEN |
| `(legacy) CreateWOForm → work_orders` | IMPLEMENTED (manual legacy path) | **CONTAINED** (non-canonical, manually gated, no quote linkage) |

---

## E. Direct Quote → WO / Deal → WO Bypass Detection

**Verdict: NO active bypass exists.**

1. **No FK from quotes/deals to any operational table.** `quote_id`, `quotation_id`, `deal_id` are **never** used as FK in `work_orders`, `commercial_work_orders`, `wo_items`, or `job_orders`.
2. **Exactly 3 WO write paths, none quote-driven:**
   - **A)** `app/api/wo/route.ts:200,306` — legacy/orphaned. **No caller exists** → DEAD CODE, not canonical.
   - **B)** `lib/application/service-contracts/forwarding-writer.ts` → `app/api/forwarding/wo/route.ts` — **CANONICAL** (U-08), uses `resolveOrCreateEngagement` (U-03), bridges via `legacy_wo_bridge`.
   - **C)** `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx:391,450,527,618` — **'use client'** browser-supabase manual legacy write. **Does NOT read Quote/Deal** and **never creates an engagement**. It is the pre-existing manual operation-entry path.
3. **No code both reads an operational table and writes a quote table** (and vice-versa) — the layered two-suite scan (`U12-04C`) found zero runtime bypasses.
4. **On acceptance**, `customerApproveQuotation`/`customerApproveDealQuotations`/`handleMarkAsWon` only update `crm_quotations.status = 'ACCEPTED'` + `crm_deals.stage = 'WON'`. **No operational record is created.** Path C is not triggered by quotes.

**Path C (CreateWOForm) containment:** This is a **non-canonical legacy entry point**. It is the user manually building an operational work order from scratch; it does not originate from a Quote and does not touch the commercial engagement layer. It is **contained** (operational-layer only) but is **not part of the canonical commercial lineage**. This is documented debt, not a competing canonical root.

---

## F. Multi-SBU Composition

**Verdict: SUPPORTED — by explicit design (ADR-018/019/020).**

- `commercial_capability_bindings` has `UNIQUE(tenant_id, work_order_id, capability_type)` — permitting **N binding rows per engagement, one per capability type**. One engagement can be bound to `CUSTOMS` + `FORWARDING` + `TRUCKING` + `WAREHOUSE` simultaneously (confirmed by `ppjk-phase4a-commercial-composition.test.ts`).
- Capability vocabulary is a **closed set** `CUSTOMS | FORWARDING | TRUCKING | WAREHOUSE`, centralized in `lib/application/capabilities/registry.ts` (U-05 authority).
- Composition is **progressive** (N sequential binding POSTs) rather than atomic — bindings attach one capability at a time via `POST /api/v1/commercial/work-orders/[id]/capabilities`.
- `resolveOrCreateEngagement` is keyed on **one open engagement per (tenant, customer)** (partial unique index `uq_com_wo_open_per_customer`, migration 014) — so multi-SBU composition for one customer accumulates under a single open engagement root.

**Implication for multi-SBU Quotes:** Because Quote has no lineage bridge to Engagement (per U-11, Quote is CRM-layer only), a multi-SBU Quote would not automatically compose into an Engagement. Multi-SBU composition today is expressed as **capabilities attached to a shared engagement**, not as a quote-derived composition. This is the seam a future conversion boundary (U-12A) would materialize.

---

## G. Tenant Isolation

**Verdict: GREEN — server-derived, per ADR-018.**

- Engagement **input DTO contains NO tenantId** (explicitly documented in `lib/application/engagement/types.ts:66`); tenant is derived from `IdentityContext`.
- `commercial_work_orders.tenant_id` is `NOT NULL REFERENCES md_tenants(id)`; `resolveOrCreateEngagement` keys resolution on `(tenant_id, customer_id)`.
- Capability bindings are tenant-scoped (RLS + 3-key lifecycle lookup with non-leaking 404).
- U-03 tests (T2/T3/T9/T10/T11) and U-06 tests (P1/A4) enforce tenant rejection and non-leaking cross-tenant behavior.

---

## H. Idempotency & Concurrency Safety (of the conversion boundary)

The Quote→Engagement conversion does not exist yet, so idempotency is assessed against the **engagement boundary it would attach to**:

- **resolve-or-create pattern:** `resolveOrCreateEngagement` performs a SELECT, then INSERT with `23505` unique-violation catch + re-SELECT of the concurrent winner (idempotent under retry/race).
- **Partial unique index** `uq_com_wo_open_per_customer (tenant_id, customer_id) WHERE status IN ('DRAFT','SUBMITTED')` guarantees at most one open engagement per tenant+customer — **prevents duplicate engagement creation under concurrent conversion** (U-03 T8 race → exactly ONE engagement).
- **Forwarding-writer gap (pre-existing debt):** SR idempotency keys embed `Date.now()` (`forwarding-writer.ts:270,297`) → retries are not deterministic and can duplicate SRs. Flagged for a forward remediation, **not** part of the Quote→Engagement conversion edge.
- **Forwarding-writer gap (pre-existing debt):** no `FORWARDING` capability binding is auto-created by the writer flow (zero binding rows for `/api/forwarding/wo`). Flagged as a wiring gap, not a lineage defect.

---

## I. U-12 Gate Results

**Test suite:** `lib/__tests__/u12-commercial-lineage.test.ts` — **32/32 PASS**

| Gate | Focus | Coverage |
|------|-------|----------|
| U12-01 | Commercial Object Classification | commercial_work_orders, scopes, bindings; no competing `commercial_engagements` |
| U12-02 | Canonical Engagement | single root, `tenant_id NOT NULL`, `id UUID PK`, `resolveOrCreateEngagement` authority |
| U12-03 | Quote Conversion Boundary | boundary identified; no conversion command exists; acceptance creates no operational records; only warehouse RPC outbound |
| U12-04 | No Direct Quote→WO Bypass | no quote/deal FK on operational; no bypass read/write pair; CreateWOForm not quote-driven |
| U12-05 | Multi-SBU Composition | UNIQUE(tenant, wo, capability_type); 4-capability closed registry |
| U12-06 | Tenant Isolation | DTO no tenantId; IdentityContext; U-03/U-06 suites enforce |
| U12-07 | Idempotent Conversion | resolve-or-create; partial unique index (open engagement per customer) |
| U12-08 | Concurrency Safety | U-03 race → exactly ONE engagement |
| U12-09 | Operational Lineage | forwarding-writer canonical; svc_service_requests FK |
| U12-10 | Legacy Containment | protected `job_orders.wo_item_id → wo_items`; legacy no quote FK; adapters server-only |
| U12-11 | Full Regression | U-11/U-10R/U-10 suites present; runner includes U-12 |

---

## J. Regression & TypeScript Results

| Check | Result |
|-------|--------|
| Full regression (`scripts/run-full-regression.ts`) | **367/367 PASS** (was 335/335 + 32 new U-12) |
| `tsc --noEmit` | **PASS** (0 errors) |
| New TypeScript errors introduced by U-12 | **0** |
| New migrations | **0** (pure forensic + test suite; no schema change) |
| Domain / runtime source modified by U-12 | **0** (test + runner only) |

> **Note on pre-existing debt:** A stale untracked orphan script `scripts/run-u01-to-u08.ts` referenced renamed test functions (`runCommercialWorkOrdersSuite`, `runForwardingWriterSuite`, `runTruckingLineageSuite`, `runBindingLifecycleSuite`) and broke `tsc`. It was **not** part of the U-11 baseline and was removed (backup at `%TEMP%\opencode\run-u01-backup.ts`) to restore the "0 TypeScript errors" invariant. No functional source was modified.

---

## K. Disposition & Outstanding Items

**Disposition: GREEN** — clean separation confirmed, no active bypass, no competing canonical lineage, tenant isolation proven, multi-SBU composition supported, idempotency/concurrency foundation verified, full regression green.

**Forward-delegated (not retrofitted) — to be addressed in a U-12A decision review:**

| Item | Classification | Impact |
|------|---------------|--------|
| `Quote → Engagement` conversion edge | **MISSING** (deliberate) | The canonical conversion boundary is defined but not implemented. Any future build MUST route through `resolveOrCreateEngagement` + capability bindings, never a direct `quote_id → work_orders` FK. |
| CreateWOForm legacy Path C | **CONTAINED** (non-canonical) | Manual operational entry; no quote linkage; does not create engagement. Candidate for eventual migration to canonical writer. |
| Forwarding SR idempotency (`Date.now()` keys) | **DEBT** | Retry non-determinism can duplicate SRs. |
| No auto `FORWARDING` binding in writer | **DEBT** | `/api/forwarding/wo` yields zero binding rows. |

---

## L. Files Changed / Created (U-12)

| File | Change |
|------|--------|
| `lib/__tests__/u12-commercial-lineage.test.ts` | **NEW** — 32 U-12 gate assertions |
| `scripts/run-full-regression.ts` | **MODIFIED** — imported + registered U-12 suite |
| `docs/architecture/SENTRALOGIS_PHASE4B_U12_COMMERCIAL_LINEAGE_REPORT.md` | **NEW** — this report |
| `docs/architecture/SENTRALOGIS_PHASE4B_U12_FINAL_ACCEPTANCE.md` | **NEW** — final acceptance |
| `scripts/run-u01-to-u08.ts` | **REMOVED** (stale orphan, backed up to `%TEMP%`) |
