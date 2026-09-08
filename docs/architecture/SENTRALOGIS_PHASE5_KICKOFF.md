# SENTRALOGIS — PHASE 5
# KICKOFF DOCUMENT

**Date:** 2026-08-31  
**Status:** AUTHORIZED — CONTROLLED REMEDIATION  
**Architecture Gate:** U-26R-P1 YELLOW

---

## 1. AUTHORIZATION

Phase 5 is authorized to begin under **CONTROLLED REMEDIATION**.

**Preconditions verified:**
- U-01 through U-25: accepted
- U-26: completed
- U-26R-P0: GREEN
- U-26R-P1: YELLOW
- P0-A Tenant Authority: VERIFIED
- P0-B Finance Isolation: VERIFIED
- P0-C Forwarding Mutation Security: VERIFIED
- U-26R-P1 tests: 27/27 PASS
- Security tests: 56/56 PASS
- Full regression: 1255/1255 PASS
- TypeScript: 0 errors
- Remaining blockers: **0**

**Phase 5 may proceed with controlled remediation tracking.**

---

## 2. U-26R-P1 BASELINE

U-26R-P1 reconciled all remaining U-26 findings:

| Classification | Count | Status |
| -------------- | ----: | ------ |
| GAP | 6 | 0 BLOCKER, 4 CONTROLLED, 2 NON-BLOCKING |
| RISK | 10 | 4 CONTROLLED, 6 NON-BLOCKING |
| DEBT | 7 | 1 CONTROLLED, 6 NON-BLOCKING |
| OBSERVATION | 5 | 1 CONTROLLED, 4 OBSERVATION |
| BLOCKER | 0 | — |

**No Phase-5 blocker remains.**

---

## 3. ARCHITECTURE INVARIANTS

These are protected invariants for Phase 5:

### Identity
Tenant authority comes only from authenticated IdentityContext. Never trust `x-tenant-id`, query `tenant_id`, or body `tenant_id` as authority.

### Authorization
Use canonical role/permission model. Do not introduce route-specific authorization frameworks.

### Commercial Hierarchy
Canonical flow: Engagement → Quote → Sales Order → Fulfillment. Do not create another commercial root.

### Fulfillment
Fulfillment remains lightweight composition-only aggregate. It must NOT become a second order/commercial/shipment engine.

### Capability
Capability Registry and Capability Binding remain canonical. Do not create parallel mechanisms.

### Operations
Operational execution remains downstream of commercial intent. SBUs (Trucking, Forwarding, Customs, Warehouse) are not competing commercial roots.

### Forwarding
Forwarding is a composable orchestration domain. Use Shipment Aggregate, Shipment Unit, Service Scope, Execution Leg, POL, POD, Incoterms, MBL/HBL. Do not create a parallel forwarding architecture.

### Finance
Tenant-scoped finance data must remain tenant isolated. Never reintroduce `USING (true)` for tenant-scoped data.

---

## 4. CONTROLLED REMEDIATION BASELINE

See: `docs/architecture/SENTRALOGIS_PHASE5_CONTROLLED_REMEDIATION_REGISTER.md`

**Controlled items (must be tracked through Phase 5):**
1. Legacy number authority (WO, JO, Shipment, SR, Customs, SPPB) — create server-side functions
2. Legacy forwarding domain browser client — migrate to server-side data access
3. Customs adapter bypass — migrate to canonical CustomsService
4. Forwarding shell mock data — replace with real data or remove
5. Integration/E2E test infrastructure — set up DB test container and Playwright

**Non-blocking debt (can remain after Phase 5 begins):**
- 16 items tracked in register
- Includes stubs, TODOs, missing features, legacy compatibility code

---

## 5. PHASE 5 OBJECTIVES

1. Build next production capabilities
2. Preserve canonical architecture
3. Preserve security invariants
4. Progressively close controlled U-26 findings
5. Increase real integration/E2E confidence
6. Avoid architecture fragmentation
7. Avoid reintroducing legacy authority patterns

---

## 6. TEST STRATEGY

See: `docs/architecture/SENTRALOGIS_PHASE5_TEST_MATRIX.md`

### Priority Order
1. Security integration tests (tenant isolation, RLS, auth)
2. Commercial integration tests (Engagement → SO → Fulfillment)
3. Operational integration tests (Fulfillment → Shipment → Handoff)
4. Forwarding integration tests (critical workflow)
5. E2E tests (Playwright for critical business paths)

### Test Type Classification
- **Unit**: Single function/class in isolation
- **Static**: Source-code pattern/architecture checks
- **Integration**: Multiple components with real DB
- **DB/RLS**: PostgreSQL constraint + RLS enforcement
- **API Integration**: Route handler with real HTTP + DB
- **Browser E2E**: Full UI flow in real browser

**Honest assessment:** Current 1255 tests are strong on unit/static/forensic, zero on real DB/API/E2E. This is a controlled finding.

---

## 7. MIGRATION STRATEGY

Every Phase 5 migration must:
1. Create a new migration file
2. Never modify historical migrations
3. Inspect existing data
4. Define tenant ownership
5. Preserve existing records
6. Verify foreign keys
7. Verify indexes
8. Verify RLS
9. Verify constraints
10. Be safe for existing tenants

**Never:**
- Silently delete production data
- Fabricate tenant ownership
- Weaken RLS to make a feature work
- Use service-role access as a security bypass

---

## 8. SECURITY RULES

### Service-Role Rule
`supabaseAdmin` / service-role access may only be used where explicitly justified. Every service-role usage must answer:
1. Why is normal authenticated DB access insufficient?
2. What authorization happens before the call?
3. How is tenant boundary guaranteed?
4. Can the operation be performed safely with RLS?
5. Is the operation auditable?

### Authoritative Identifier Rule
Phase 5 MUST NOT introduce client-generated authoritative business identifiers. Never use `Math.random()` or `Date.now()` as authoritative business number generation.

Preferred pattern:
```
Client → Authenticated Server Action/API → Domain Service → Database Sequence/Function → Unique Business Number
```

---

## 9. WORKSTREAM STRUCTURE

Phase 5 must be executed incrementally in small, reviewable workstreams. Each workstream must have:
- objective
- scope
- files
- schema changes
- ADR impact
- tests
- validation
- status

### Proposed Workstream Order
1. **Phase 5A — SBU Forwarding Implementation** (FCL/LCL, consolidation, deconsolidation, cargo owner tracking)
2. **Phase 5B — Finance Hardening** (AR/AP aging, P&L, tax reporting)
3. **Phase 5C — Customer Success** (complaints, CSAT/NPS, customer portal)
4. **Phase 5D — AI Copilot Production Integration** (replace mock data with canonical APIs)
5. **Hardening Sprint** (controlled remediation items in parallel)

---

## 10. COMPLETION CRITERIA

Phase 5 is complete when:
- No unauthorized competing aggregate exists
- Canonical lineage intact
- ADRs respected
- Tenant isolation intact
- Authorization intact
- No client authority bypass
- Migrations safe
- RLS verified
- Constraints verified
- Critical workflows functional
- Regression green
- Critical integration coverage established
- E2E coverage added where appropriate
- Controlled findings either CLOSED or explicitly DEFERRED with owner/control

---

## 11. ARCHITECTURE FIT CHECK

Before implementing any Phase 5 feature:

1. **Discovery**: Understand the feature scope
2. **Architecture Fit Check**: Does it fit existing aggregates?
3. **ADR Decision**: Does it need a new ADR?
4. **Database Design**: Tenant/RLS/constraints
5. **Domain Service**: Authority/lifecycle/cardinality
6. **API**: Authentication/authorization
7. **UI**: No client authority fabrication
8. **Tests**: Meaningful automated coverage
9. **Regression**: All existing tests remain green
10. **Forensic Review**: Close any U-26 finding touched

---

## 12. BLOCKER ESCALATION

Any controlled finding that becomes a genuine security/integrity/production blocker must immediately be promoted to **PHASE 5 BLOCKER**.

**Stop → Forensic Analysis → Remediation → Regression → Resume**

Do not downgrade a blocker simply because existing tests pass.

---

## 13. BASELINE VERIFICATION

**Pre-kickoff baseline:**
- TypeScript: 0 errors
- Full regression: 1255/1255 PASS
- Production runtime changes: NONE

**Verified:** 2026-08-31

---

## 14. NEXT STEPS

1. Review this kickoff document
2. Review Controlled Remediation Register
3. Review Test Matrix
4. Identify first Phase 5 workstream
5. Perform architecture fit check
6. Begin implementation only when scope is explicit

**Do not invent a new product roadmap.**

Use existing scope from `190726.md` (SBU Forwarding) and Phase 5 plan.

---

## 15. PHASE 5 STATUS

**AUTHORIZED — CONTROLLED REMEDIATION**

Phase 5 may proceed. All findings are tracked. No blockers remain.

Build forward without breaking the architecture already won.

---

**END OF KICKOFF DOCUMENT**
