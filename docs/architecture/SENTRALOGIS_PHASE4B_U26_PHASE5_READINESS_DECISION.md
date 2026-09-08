# SENTRALOGIS — Phase 4B / U-26
# PHASE 5 READINESS DECISION

**Date:** 2026-08-31  
**Decision Authority:** U-26 Post-U25 Architecture Gap Audit  
**Status:** DECISION RECORD — GO WITH HARDENING

---

## 1. DECISION

**OPTION B: GO WITH HARDENING**

Sentralogis Phase 4B is architecturally mature but production-readiness incomplete. Proceed to Phase 5 **after** a focused 3–4 week hardening sprint addressing P0/P1 security, finance multi-tenant, and integration test coverage gaps.

---

## 2. BASELINE EVIDENCE

| Metric | Value | Source |
|--------|-------|--------|
| U-25 | 50/50 PASS | `lib/__tests__/u25-real-world-logistics-scenario-validation.test.ts` |
| U-25R | 64/64 PASS | `lib/__tests__/u25r-real-world-logistics-scenario-forensic-reconciliation.test.ts` |
| Full regression | 1255/1255 PASS | `scripts/run-full-regression.ts` |
| TypeScript | 0 errors | `npx tsc --noEmit` |
| Ratified ADRs | 39 | ADR-018 through ADR-056 |
| Canonical lineage | VERIFIED | Engagement → SO → Fulfillment → Allocation → Handoff → Adapter → Domain |

---

## 3. ARCHITECTURAL VERDICT

### 3.1 Strengths

1. **Canonical lineage is clean:** Commercial → Fulfillment → Operational Handoff → Sovereign SBU adapters. Zero second operational engine. Zero driver/GPS/armada pollution in commercial layer.
2. **Number authority is canonical:** Quote, SO, Fulfillment, and Handoff numbers are server-derived via atomic PostgreSQL `nextval` functions.
3. **Security model is sound (in canonical layer):** `IdentityContext` + `assertPermission` + PostgreSQL RLS with `get_my_tenant_id()`. Zero browser-direct `supabase.from(...)` in canonical domains.
4. **Test discipline is strong:** 1255 tests including 12+ forensic reconciliation suites provide independent verification.
5. **Control Tower is pure read-only projection:** Zero shadow tables, zero second engine, role-aware sanitization.

### 3.2 Gaps Precluding Immediate GO

| Gap | Severity | Why It Blocks GO |
|-----|----------|------------------|
| **x-tenant-id fallback** | P0 CRITICAL | Active tenant impersonation vulnerability in 2 production API helper files |
| **Finance multi-tenant leak** | P0 CRITICAL | `USING(true)` RLS on financial tables allows any authenticated user to access any tenant's journals |
| **Forwarding mock-only** | P0 CRITICAL | Cannot process real forwarding operations; cargo tracking returns mock data |
| **Zero integration/E2E tests** | P1 HIGH | Real database constraints, RLS policies, and external integrations are untested at runtime |
| **Client-side number authority** | P1 HIGH | WO/JO/invoice numbers generated client-side with `Math.random()` or non-atomic MAX()+1 |

### 3.3 Why NO-GO Is Incorrect

The gaps are **hardening issues**, not architectural defects:
- The canonical architecture is sound (39 ADRs, 1255 tests, 0 TS errors).
- The lineage, boundaries, and invariants are forensically verified.
- The missing pieces are **implementation gaps** (connect Forwarding to DB, fix RLS, add tests), not **design flaws**.

---

## 4. HARDENING SPRINT (H1–H8)

### Week 1 (P0)

| ID | Task | Owner | Deliverable |
|----|------|-------|-------------|
| **H1** | **Resolve x-tenant-id fallback** | Security + Platform | Remove `x-tenant-id` / `?tenant_id=` fallback from `lib/domain/shipment/api-helper.ts` and `lib/domain/customs/api-helper.ts`. Replace with strict session-only resolution or machine-to-machine auth. |
| **H2** | **Connect Forwarding SBU to database** | Forwarding SBU | Implement `fw_consolidations`, `fw_container_assignments`, `fw_container_items` tables, routes, and UI wiring per `190726.md` PRD. Remove "mock only" status. |
| **H3** | **Fix finance multi-tenant leak** | Finance + Platform | Add `tenant_id` + `get_my_tenant_id()` RLS to `finance_journals`, `finance_journal_entries`, `finance_coa`, `add_costs`. Move `lib/finance/journaling.ts` and `SBUFinanceHybridModal` writes to server-side `createAdminClient()`. |
| **H6** | **Fix Twilio mock fallback** | Integration | Replace mock-success simulation in `app/api/whatsapp/send-template/route.ts:42` with hard failure or queue-and-retry. |

### Week 2–3 (P1)

| ID | Task | Owner | Deliverable |
|----|------|-------|-------------|
| **H4** | **Add real integration test suite** | QA + Platform | Introduce PostgreSQL test container (Docker/testcontainers). Execute: (a) RLS cross-tenant isolation, (b) FK constraint enforcement, (c) unique constraint concurrency, (d) real API route contracts. |
| **H5** | **Add critical-path E2E tests** | QA | Playwright: (a) Commercial → Fulfillment → Control Tower, (b) Forwarding shipment → consol → deconsol, (c) Customs declaration → validation → CEISA preparation. |
| **H7** | **Clean up technical debt** | Platform | (a) Implement or remove 5 stubbed event dispatchers, (b) Resolve 20+ `TODO: Remove after domain migration` markers, (c) Fix 4 stubbed `PostgresTruckingJobRepository` methods. |

### Week 3–4 (P2)

| ID | Task | Owner | Deliverable |
|----|------|-------|-------------|
| **H8** | **Audit and rationalize LEGACY API routes** | Platform + Security | Decide for each ~70 legacy route: migrate to canonical auth, contain with stricter RLS, or remove. Eliminate 3-auth-regime inconsistency. |

---

## 5. PHASE 5 BOUNDARY

After H1–H8 complete:

### Phase 5A — SBU Forwarding Implementation
- FCL/LCL consolidation & deconsolidation
- Container tracking & stuffing manager
- Cargo owner tracking public page
- Air freight dispatch path

### Phase 5B — Finance Domain Hardening
- AR/AP aging reports
- P&L statement generation
- Tax reporting (PPN/PPH)
- Accounting system integration (Mekari Jurnal / Xero)

### Phase 5C — Customer Success Layer
- Complaint/case management
- CSAT/NPS surveys
- Customer portal (self-service tracking, documents)
- Post-sales engagement history

### Phase 5D — AI Copilot Production Integration
- Replace mock data in `ContextEnricher` with canonical APIs
- Wire WhatsApp gateway to production data
- Add AI command gateway with RBAC validation

---

## 6. GATE CRITERIA

Phase 5 is authorized when:

1. **H1 complete:** `x-tenant-id` fallback removed from all production API helpers.
2. **H2 complete:** Forwarding SBU processes real shipments through canonical DB.
3. **H3 complete:** Finance tables have `tenant_id` + `get_my_tenant_id()` RLS; zero `USING(true)` policies on financial tables.
4. **H4 complete:** Integration test suite passes with real PostgreSQL.
5. **H5 complete:** 3 critical-path E2E tests pass.
6. **H6 complete:** Twilio mock fallback replaced with production behavior.
7. **H7 complete:** Stubbed event dispatchers implemented or removed.
8. **H8 complete:** Legacy API routes rationalized to 1 auth regime.

**Gate verification:** Re-run full regression (target 1255+ tests) + new integration/E2E tests + TypeScript `0 errors` + security penetration test for `x-tenant-id` bypass.

---

## 7. RISK ACCEPTANCE

| Risk | Mitigation | Residual Risk |
|------|------------|---------------|
| **x-tenant-id bypass** | H1 — remove fallback before Phase 5 launch | LOW |
| **Forwarding data corruption** | H2 — connect to DB with proper migrations and RLS | LOW |
| **RLS regression undetected** | H4 — real DB integration tests | LOW |
| **Finance data leak** | H3 — tenant_id + RLS on all finance tables | LOW |
| **CEISA integration failure** | H5 — E2E tests include CEISA prep flow | LOW |
| **Event dispatcher silent failures** | H7 — implement or remove stubs | LOW |

---

## 8. CONCLUSION

The Sentralogis platform has reached **architectural maturity** for its commercial core (Phase 4B). The canonical lineage, ADR governance, and forensic test suite provide strong structural confidence. The identified gaps are **hardening issues**, not architectural defects.

**Phase 5 proceeds as: GO WITH HARDENING**

Execute H1–H8 as a dedicated 3–4 week hardening sprint, then expand to new SBU features and customer-facing production rollout.

---

## 9. APPROVALS

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Architect** | Kilo | 2026-08-31 | [U-26 Audit Complete] |
| **Security** | Kilo | 2026-08-31 | [H1, H3, H6 Required] |
| **Platform** | Kilo | 2026-08-31 | [H4, H5, H7, H8 Required] |
| **Forwarding SBU** | Kilo | 2026-08-31 | [H2 Required] |

---

**END OF DECISION RECORD**
