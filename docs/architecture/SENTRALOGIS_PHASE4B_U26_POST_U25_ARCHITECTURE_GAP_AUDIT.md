# SENTRALOGIS — Phase 4B / U-26
# POST-U25 ARCHITECTURE GAP AUDIT

**Date:** 2026-08-31  
**Status:** DISCOVERY COMPLETE — NO PRODUCTION CHANGES  
**Baseline:** U-01 through U-25/U-25R (1255/1255 PASS, 0 TS errors)

---

## 1. EXECUTIVE VERDICT

**GREEN-YELLOW — READY WITH HARDENING**

The canonical commercial architecture (Phase 4B) is architecturally mature: 39 ratified ADRs, clean commercial→fulfillment→operational lineage, 1255 passing tests, 0 TypeScript errors. However, production readiness is incomplete due to:

1. **Active security risk:** `x-tenant-id` fallback in `lib/domain/shipment/api-helper.ts` and `lib/domain/customs/api-helper.ts` enables tenant impersonation via service-role client.
2. **Non-functional SBU UI:** Forwarding SBU shell (`app/sbu/forwarding/`) is "mock only, belum connect DB" per `AGENTS.md:407`.
3. **Zero integration/E2E test coverage:** 100% of tests execute against in-memory mocks; no real PostgreSQL execution, no UI automation.
4. **Finance domain multi-tenant data leak:** `finance_journals`, `finance_journal_entries`, `finance_coa`, `add_costs` lack `tenant_id` and have `USING(true)` RLS policies.

**Recommendation:** Proceed to Phase 5 **WITH HARDENING** — execute a focused 3–4 week hardening sprint (H1–H7) before expanding to new SBU features or customer-facing production rollout.

---

## 2. CURRENT BASELINE

| Metric | Value |
|--------|-------|
| U-25 | 50/50 PASS |
| U-25R | 64/64 PASS |
| Full regression | 1255/1255 PASS |
| TypeScript | 0 errors |
| ADR coverage | ADR-018..056 ratified (39 ADRs) |
| Production source changes in U-25R | 0 |
| Production migration changes in U-25R | 0 |
| Schema changes in U-25R | 0 |
| Architecture changes in U-25R | 0 |

---

## 3. ARCHITECTURE MAP

### 3.1 Canonical Commercial Lineage

```text
Customer
   ↓
Engagement (commercial_work_orders)
   ↓
Sales Order (sales_orders) — SO-YYYY-MM-NNNN
   ↓
Fulfillment (fulfillments) — FL-YYYY-MM-NNNN, revision_no, version_no
   ↓
Fulfillment Allocation (fulfillment_allocations) — capability_type, allocated/delivered_quantity
   ↓
Operational Handoff (operational_handoffs) — OH-YYYY-MM-NNNN
   ↓
SBU Domain Adapter
   ↓
Sovereign Operational Domain
```

### 3.2 Domain Boundaries

| Layer | Domains | Invariant |
|-------|---------|-----------|
| COMMERCIAL | Engagement, Sales Order, Quote | Server-derived tenant, immutable post-confirm, server-number authority |
| FULFILLMENT | Fulfillment, Fulfillment Allocation | Composition only, zero operational writes, versioned revisions |
| CONTRACT SEAM | Operational Handoff | Generic contract, domain adapters, closed state machine |
| SOVEREIGN OPERATIONS | Forwarding, Customs, Trucking, Warehouse | Each owns its tables, state, and execution mechanics |

### 3.3 Control Tower

- **READ-ONLY PROJECTION** — zero DB writes, zero second operational engine, zero shadow tables
- **Internal Operator View:** full commercial context, SBU domain references, diagnostics, available commands
- **Customer View:** sanitized allow-list (milestones, progress, exceptions; 0 margins, 0 staff PII, 0 raw CEISA errors)

### 3.4 Number Authority

| Entity | Authority | Pattern |
|--------|-----------|---------|
| Quote | `next_quote_number()` | Atomic PostgreSQL `nextval` |
| Sales Order | `next_sales_order()` | Atomic PostgreSQL `nextval` |
| Fulfillment | `next_fulfillment_number()` | Atomic PostgreSQL `nextval` |
| Operational Handoff | `next_operational_handoff_number()` | Atomic PostgreSQL `nextval` |

---

## 4. GAP MATRIX

| Domain | Status | Severity | Evidence | Recommendation |
|--------|--------|----------|----------|----------------|
| **Commercial (SO/FL/OH)** | 🟢 READY | — | 39 ADRs, 1255 tests, clean lineage | Proceed |
| **Fulfillment** | 🟢 READY | — | Revision model, allocations, state machine | Proceed |
| **Forwarding (canonical)** | 🟡 PARTIALLY READY | HIGH | `shp_*` domain complete; no consolidation, air freight dispatch, MBL/HBL UI | Complete missing UI workflows |
| **Forwarding (legacy)** | 🔴 NOT READY | CRITICAL | Broken schema (`fw_*` enums missing), browser client in domain, zero tests | Retire or fix legacy |
| **Customs** | 🟢 READY | — | Sovereign domain, audit trail, CEISA prep, decision log | Proceed |
| **Trucking** | 🟢 READY | — | Canonical lineage enforced, GPS, POD, auto-complete | Proceed |
| **Warehouse** | 🟡 PARTIALLY READY | HIGH | Full WMS tables/UI, but no canonical domain service, client-side data access | Add `lib/warehouse/service.ts` |
| **Control Tower** | 🟢 READY | — | Read-only projection, role-aware, sanitized customer view | Proceed |
| **Security** | 🟡 MODERATE | HIGH | `x-tenant-id` fallback, unauthenticated forwarding routes, mock permission engine | H1, H6 |
| **Finance** | 🔴 NOT READY | CRITICAL | No tenant_id + `USING(true)` RLS, browser client writes, no P&L/AR/AP aging | H3, H4 |
| **Customer Success** | 🟡 PARTIALLY READY | MEDIUM | Pre-sales CRM complete; no complaints/CSAT/portal | Add post-sales layer |
| **Integration** | 🟡 PARTIALLY CONNECTED | MEDIUM | EasyGo, WhatsApp, CEISA prep connected; no accounting/carrier/bank | Add connectors |
| **Observability** | 🟢 STRUCTURALLY READY | — | Execution health, exceptions, SLA, delay risk available | Extend margin/capacity scoring |
| **AI Copilot** | 🟡 PROTOTYPE | MEDIUM | Architecture sound, but mock data, not wired to canonical APIs | Integrate with Control Tower |

---

## 5. PRODUCTION Risk Register

### P0 — CRITICAL

| ID | Risk | File(s) | Impact | Remediation |
|----|------|---------|--------|-------------|
| **P0-1** | **`x-tenant-id` fallback enables tenant impersonation** | `lib/domain/shipment/api-helper.ts:49-70`, `lib/domain/customs/api-helper.ts:48-70` | Any client can bypass SSR auth and execute on service-role client with arbitrary tenant | Remove fallback or replace with machine-to-machine auth |
| **P0-2** | **Finance tables have zero tenant isolation** | `finance_schema.sql:6-83` | Any authenticated user can read/write any tenant's journal entries, COA, costs | Add `tenant_id` + `get_my_tenant_id()` RLS; move writes to server-side |
| **P0-3** | **Forwarding SBU is mock-only** | `app/sbu/forwarding/` (per `AGENTS.md:407`) | No real forwarding operations can be performed; cargo tracking returns mock data | Implement DB connectivity per `190726.md` PRD |

### P1 — HIGH

| ID | Risk | File(s) | Impact | Remediation |
|----|------|---------|--------|-------------|
| **P1-1** | **Client-side WO number authority** | `lib/utils/woNumber.ts:37-57`, `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx:364` | Race-condition collisions, non-atomic generation | Implement `next_wo_number()` RPC |
| **P1-2** | **Client-side JO number authority** | `lib/domain/service-contracts/adapters/trucking-adapter.ts:76`, `lib/workflow/engine.ts:84` | Duplicate JO numbers | Implement `next_jo_number()` RPC |
| **P1-3** | **Unauthenticated forwarding mutation routes** | `app/api/forwarding/order-header/route.ts`, `app/api/forwarding/consol/[id]/stuff/route.ts`, `app/api/forwarding/consol/[id]/deconsol/route.ts` | CRUD on forwarding tables without auth | Add `resolveSessionIdentity()` + `assertPermission` |
| **P1-4** | **Twilio mock fallback returns success without sending** | `app/api/whatsapp/send-template/route.ts:42` | Silent WhatsApp delivery failure | Hard-fail or queue-and-retry |

### P2 — MEDIUM

| ID | Risk | File(s) | Impact | Remediation |
|----|------|---------|--------|-------------|
| **P2-1** | **No invoice number authority** | `lib/domain/invoice/lines.ts`, `046_invoice_lines.sql` | Duplicate invoice numbers | Implement `next_invoice_number()` RPC |
| **P2-2** | **Customs adapter bypasses canonical service** | `lib/domain/service-contracts/adapters/customs-adapter.ts:53-98` | Parallel declaration creation path, duplicate AJU generation | Migrate to `CustomsService` |
| **P2-3** | **Forwarding command-center broken read** | `app/api/v1/forwarding/shipments/[id]/command-center/route.ts:28-34` | Runtime SQL error on `correlation_id` column | Fix column names or add compatibility view |
| **P2-4** | **No real database test execution** | `scripts/run-full-regression.ts` | RLS/FK/CHECK constraints untested at runtime | Add PostgreSQL test container |
| **P2-5** | **No E2E/UI test coverage** | Entire `app/` and `components/` | UI regressions undetected | Add Playwright + React Testing Library |

### P3 — LOW

| ID | Risk | File(s) | Impact | Remediation |
|----|------|---------|--------|-------------|
| **P3-1** | **EasyGo token in plaintext** | `20260805_easygo_integration.sql:10` | Credential exposure in migration history | Rotate token, move to env/Secrets Manager |
| **P3-2** | **VAPID private key hardcoded** | `lib/push/vapid-config.ts:5` | Push notification compromise risk | Move to env variable |
| **P3-3** | **No webhook signature verification** | `app/api/webhooks/whatsapp/route.ts:28-39` | Spoofed webhook delivery | Add X-Hub-Signature verification |
| **P3-4** | **165+ TODOs in production code** | Multiple files | Technical debt, incomplete migrations | Track in backlog, resolve in hardening sprint |

---

## 6. LEGACY / DEBT REGISTER

### 6.1 Harmless

| File | Marker | Rationale |
|------|--------|-----------|
| `components/invoice/mockInvoiceData.ts` | `mockInvoiceData` | Test fixture, not executed in production |
| `lib/domain/shipment/__tests__/fabricated-id-elimination.test.ts` | `fabricated-id` | Test references to fabricated IDs are expected |
| `lib/__tests__/u14a-fulfillment-adr-ratification.test.ts` | `RATIFICATION-ONLY` | Explicitly documented as read-only forensic gate |

### 6.2 Technical Debt

| Category | Count | Severity | Evidence |
|----------|-------|----------|----------|
| **Stubbed event dispatchers** | 5 files | P1 | `SupabaseDomainEventDispatcher`, `RabbitMQDomainEventDispatcher`, `MemoryDomainEventDispatcher`, `KafkaDomainEventDispatcher`, `EventBridgeDomainEventDispatcher` — all contain identical `TODO Phase 3: Publish synchronous domain event` stubs |
| **TODO migration markers** | 20+ files | P2 | `src/components/ui/`, `src/components/shared/`, `src/lib/` — "TODO: Remove after domain migration completes" |
| **Unused DB sequences** | 2 | P2 | `seq_wo_number`, `seq_jo_number` exist in migration 030 but are never wired |
| **Duplicate CeisaPreparationService** | 2 files | P3 | Root-level `lib/domain/customs/ceisa-preparation-service.ts` vs subfolder `lib/domain/customs/ceisa/ceisa-preparation-service.ts` |
| **Legacy status mappers** | Active | P3 | `src/infrastructure/repositories/trucking/StatusMappers.ts` — bidirectional legacy↔canonical mapping |

### 6.3 Architectural Risk

| Risk | File(s) | Severity | Rationale |
|------|---------|----------|-----------|
| **x-tenant-id fallback** | `lib/domain/shipment/api-helper.ts`, `lib/domain/customs/api-helper.ts` | **CRITICAL** | Tenant impersonation via header/query param on service-role client |
| **Browser client in domain layer** | `lib/domain/forwarding/pricing.ts`, `lib/domain/forwarding/repository.ts` | HIGH | Violates server-only boundary |
| **Legacy role system active** | `lib/application/identity/roles.ts:102-204` | MEDIUM | Legacy role strings still flow through authorization |
| **Legacy engagement bridge** | `lib/application/engagement/engagement-bridge.ts:368-440` | MEDIUM | Public legacy resolution path for `work_orders.id` → `commercial_work_orders.id` |

### 6.4 Production Blocker

| Blocker | File(s) | Why |
|---------|---------|-----|
| **Forwarding SBU mock-only** | `app/sbu/forwarding/` per `AGENTS.md:407` | Cannot process real forwarding operations |
| **Finance multi-tenant leak** | `finance_schema.sql:6-83` | Cross-tenant data access via `USING(true)` RLS |
| **x-tenant-id bypass** | `api-helper.ts` files | Active tenant impersonation vulnerability |

---

## 7. REAL-WORLD SCENARIO COVERAGE MATRIX

| Scenario | Classification | Evidence | Gaps |
|----------|---------------|----------|------|
| **A — Domestic Trucking** | ✅ FULLY SUPPORTED | WO → JO → Driver → GPS → POD → Complete. Lineage binding enforced. | None |
| **B — Import FCL** | 🟡 PARTIALLY SUPPORTED | FCL container type exists; customs import declarations exist; consolidation exists. | No integrated FCL import-to-delivery orchestration; manual handoff between SBUs |
| **C — CKD EV Shipment** | 🟡 PARTIALLY SUPPORTED | CKD as commodity text; customs classification handles any HS code. | No CKD-specific workflows (knock-down routing, VIN registration, EV battery compliance) |
| **D — Multi-SBU** | ✅ FULLY SUPPORTED | Proven in U-15/U-25: 1 SO → 4 capability allocations → 4 handoffs → 4 SBUs. | None |
| **E — Split Shipment** | ✅ FULLY SUPPORTED | Proven in U-22/U-23/U-24/U-25: multiple FORWARDING allocations with distinct shipments. | None |
| **F — Operational Failure** | ✅ FULLY SUPPORTED | Handoff rejection/failure isolation; SLA escalation; forwarding attention items; trucking stuck-JO detection. | None |
| **G — Commercial Amendment** | 🟡 PARTIALLY SUPPORTED | Versioned fulfillment revisions; replanning creates new revision. | SO immutable (by design); no formal amendment workflow (ADR-044 unbuilt) |

---

## 8. TEST COVERAGE ASSESSMENT

### 8.1 What the 1255 Tests Prove

1. **Structural integrity:** Regex-based architecture gates verify source-code absence of forbidden patterns (e.g., `x-tenant-id`, `.from('job_orders').insert`).
2. **Domain logic:** State machines, factories, validators, and mappers are unit-tested with high coverage.
3. **Mock-based behavioral flows:** Create → confirm → fulfill → handoff → adapt → progress flows execute correctly against in-memory mocks.
4. **Forensic reconciliation:** 12+ forensic suites independently verify ADR compliance, lineage fidelity, and boundary enforcement.
5. **Number authority:** Server-side RPC functions are verified for Quote, SO, Fulfillment, and Handoff.

### 8.2 What the 1255 Tests Do NOT Prove

| Gap | Severity | Explanation |
|------|----------|-------------|
| **Real database constraint enforcement** | HIGH | 0% of tests execute SQL against PostgreSQL. FK, UNIQUE, CHECK, and RLS constraints are validated by regex only. |
| **Real API route execution** | HIGH | `app/api/v1/commercial/**`, `app/api/v1/customs/**`, `app/api/v1/forwarding/**` have zero route-level tests. |
| **Real cross-tenant isolation** | HIGH | Tenant isolation is validated by `IdentityContext` string checks, not by executing cross-tenant queries against a real DB with RLS. |
| **Real UI rendering** | HIGH | Zero component or screenshot tests for Control Tower, Forwarding, Customs, or Trucking UIs. |
| **Real concurrent writes** | MEDIUM | Concurrency is simulated with `Promise.all()` on mock DBs, not with real database transactions. |
| **External integration reliability** | MEDIUM | EasyGo, Twilio, CEISA are tested by unit/in-memory tests only; no real network execution. |

### 8.3 Test Quality Scorecard

| Dimension | Rating |
|-----------|--------|
| Structural coverage | 🟢 Strong |
| Unit coverage | 🟢 Strong |
| Domain coverage | 🟡 Moderate |
| Database execution | 🔴 None |
| Integration coverage | 🔴 Mock-only |
| E2E coverage | 🔴 None |
| UI coverage | 🔴 None |
| Security coverage | 🟡 Moderate (regex-only) |
| Forensic coverage | 🟢 Strong |

---

## 9. PHASE 5 RECOMMENDATION

### 9.1 Decision: **B) GO WITH HARDENING**

The canonical commercial architecture is ready for controlled expansion. The gaps identified are **hardening issues**, not architectural defects.

### 9.2 Mandatory Pre-Conditions (3–4 Week Hardening Sprint)

| ID | Task | Severity | Target |
|----|------|----------|--------|
| **H1** | **Resolve `x-tenant-id` fallback:** Remove or secure the fallback in `lib/domain/shipment/api-helper.ts` and `lib/domain/customs/api-helper.ts` | **P0** | Week 1 |
| **H2** | **Connect Forwarding SBU to database:** Implement `fw_*` tables, routes, and UI wiring per `190726.md` PRD | **P0** | Week 1-2 |
| **H3** | **Fix finance multi-tenant leak:** Add `tenant_id` + `get_my_tenant_id()` RLS to `finance_*` tables; move writes to server-side | **P0** | Week 1-2 |
| **H4** | **Add real integration test suite:** PostgreSQL test container with RLS, FK, CHECK, and concurrency tests | **P1** | Week 2-3 |
| **H5** | **Add critical-path E2E tests:** Playwright for Commercial→Fulfillment→Control Tower, Forwarding shipment, Customs declaration | **P1** | Week 3-4 |
| **H6** | **Fix Twilio mock fallback:** Hard-fail or queue-and-retry when credentials missing | **P1** | Week 1 |
| **H7** | **Clean up technical debt:** Implement or remove 5 stubbed event dispatchers; resolve 20+ migration TODOs | **P2** | Week 2-4 |
| **H8** | **Audit LEGACY API routes:** Rationalize ~70 legacy routes to canonical auth or remove | **P2** | Week 3-4 |

### 9.3 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **x-tenant-id bypass exploited** | Medium | Critical | H1 — resolve before Phase 5 launch |
| **Forwarding data corruption** | High | High | H2 — connect to DB with proper migrations and RLS |
| **RLS regression undetected** | Medium | High | H4 — real DB integration tests |
| **CEISA integration failure** | Medium | Medium | H5 — E2E tests include CEISA prep flow |
| **Event dispatcher silent failures** | High | Medium | H7 — implement or remove stubs |
| **Legacy auth bypass** | Medium | High | H8 — rationalize legacy routes |

### 9.4 Phase 5 Boundary

After H1–H8 complete:
- **Phase 5A:** SBU Forwarding implementation (FCL/LCL, consolidation, deconsolidation, cargo owner tracking)
- **Phase 5B:** Finance domain hardening (AR/AP aging, P&L, tax reporting, accounting integration)
- **Phase 5C:** Customer Success layer (complaints, CSAT/NPS, customer portal)
- **Phase 5D:** AI Copilot production integration (replace mock data with canonical APIs)

---

## 10. EVIDENCE INDEX

### WS1 — Repository Architecture Inventory
- `lib/domain/forwarding/` — LEGACY domain with browser client imports
- `lib/domain/shipment/` — CANONICAL forwarding domain
- `app/api/forwarding/` — MIXED (canonical + legacy routes)
- `supabase/migrations/174-176_fw_*.sql` — BROKEN schema (missing enums)

### WS2 — Commercial Domain Completeness
- `lib/sales-order/service.ts:353-424` — only DRAFT/CONFIRMED/CANCELLED transitions
- `lib/fulfillment/service.ts:540-606` — only activate/cancel/void
- `lib/control-tower/service.ts:118` — references nonexistent `replanFulfillment`
- `supabase/migrations/20260828_019_sales_order_foundation.sql:22-24` — `sales_order_items` deferred

### WS3 — Forwarding Domain Readiness
- `lib/domain/shipment/` — 12 tables, state machine, execution plans, milestones
- `lib/domain/forwarding/` — broken legacy with browser client
- `app/(dashboard)/sbu/forwarding/wo/page.tsx` — legacy WO list
- `app/(dashboard)/sbu/forwarding/consol/` — legacy consolidation

### WS4 — Customs Domain Readiness
- `lib/domain/customs/customs-service.ts` — sovereign aggregate
- `lib/domain/customs/audit/` — SHA-256 hash chain audit trail
- `lib/domain/customs/ceisa/` — preparation only, zero transmission
- `lib/domain/service-contracts/adapters/customs-adapter.ts:53-98` — boundary violation (direct `cus_declarations` write)

### WS5 — Trucking Domain Readiness
- `lib/application/service-contracts/trucking-lineage.ts:223-328` — canonical lineage resolution
- `app/api/wo/route.ts:286-308` — legacy WO→JO bypass
- `lib/services/assignmentSave.ts:181-483` — legacy assignment bypass

### WS6 — Warehouse Domain Readiness
- `app/(dashboard)/hq/warehouse/` — full WMS UI
- `lib/operational-handoff/adapters/warehouse.ts` — sovereign adapter
- **GAP:** No `lib/warehouse/service.ts`

### WS7 — Operational Handoff Contract
- `lib/operational-handoff/types.ts:46-58` — closed state machine
- `lib/operational-handoff/service.ts:155-453` — idempotent creation, lifecycle actions
- **GAP:** No `expires_at`, no timeout, no compensation execution, no optimistic locking

### WS8 — Control Tower Readiness
- `lib/control-tower/service.ts:7-12` — read-only projection
- `components/control-tower/ControlTowerWorkspace.tsx` — operator/customer toggle
- **GAP:** Customer view requires auth; no public tracking page

### WS9 — UI ↔ API ↔ Domain Connectivity
- `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx:359-697` — 9+ direct table mutations
- `app/(dashboard)/commercial/pipeline/page.tsx:360-391` — hardcoded mock data
- `app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx:38-97` — 4 sequential direct queries

### WS10 — Security Forensics
- `lib/domain/shipment/api-helper.ts:49-70` — `x-tenant-id` fallback
- `lib/domain/customs/api-helper.ts:48-70` — identical fallback
- `app/api/forwarding/order-header/route.ts` — unauthenticated mutation
- `finance_schema.sql:77-83` — `USING(true)` RLS

### WS11 — Number/Identity Authority
- `lib/utils/woNumber.ts:37-57` — client-side WO number with `Math.random()` fallback
- `lib/domain/service-contracts/adapters/trucking-adapter.ts:76` — client-side JO number
- `lib/domain/shipment/shipment-factory.ts:26-31` — `Math.random()` shipment number
- `lib/domain/invoice/lines.ts` — no invoice number authority

### WS12 — Financial/Capital Domain Gap
- `finance_schema.sql:6-83` — no `tenant_id`, `USING(true)` RLS
- `lib/finance/journaling.ts:1` — browser client writes
- `components/sbu/SBUFinanceHybridModal.tsx:35` — browser client writes
- No P&L, AR/AP aging, payroll, tax reporting

### WS13 — Customer Success/CRM Gap
- `crm_leads`, `crm_deals`, `crm_quotations` — pre-sales only
- `crm_activities` — not linked to operational entities
- `/track/cargo/[token]/page.tsx` — mock data
- No complaints, CSAT/NPS, customer portal

### WS14 — Integration Architecture
- `src/infrastructure/external/EasyGoClient.ts` — connected, plaintext token
- `lib/twilio/clients.ts` — connected, no webhook verification
- `lib/domain/customs/ceisa/` — preparation only, zero transmission
- No accounting, carrier, bank, payment gateway integrations

### WS15 — Observability/Intelligence Gap
- `lib/control-tower/service.ts:39-98` — 9-state aggregate status
- `lib/monitoring/trucking-monitor.ts:29-128` — stuck JO detection
- `app/(dashboard)/hq/ops-dashboard/page.tsx:87-159` — SLA 1-7
- **GAP:** No margin risk scoring, capacity risk, customer risk, unified SBU scorecard

### WS16 — AI Copilot Readiness
- `src/platforms/copilot/engine/CopilotEngine.ts` — prototype
- `src/platforms/copilot/engine/ContextEnricher.ts:31-33` — mock data
- **GAP:** Not wired to canonical APIs; no production integration

### WS17 — Real-World Scenario Coverage
- U-25 tests prove Multi-SBU, Split Shipment, Operational Failure
- **GAP:** Import FCL end-to-end, CKD EV special handling, Commercial amendment workflow

### WS18 — Test Quality Forensics
- 1255 tests, 0% real DB execution, 0% E2E, 0% UI automation
- ~60% structural/forensic, ~30% domain/unit, ~10% mock-based integration

### WS19 — Legacy/Debt Inventory
- 165+ TODOs, 5 stubbed event dispatchers, 20+ migration TODOs
- 3 production blockers (x-tenant-id, finance RLS, forwarding mock)

### WS20 — Phase 5 Boundary
- **Recommendation:** GO WITH HARDENING (Option B)
- 8 hardening tasks (H1–H8), 3–4 week sprint
- After hardening: Phase 5A (Forwarding), 5B (Finance), 5C (Customer Success), 5D (AI Copilot)
