# POST-5D FORENSIC ASSESSMENT

## 1. Governance

Roadmap:
FINAL — GOVERNANCE DECISION, DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED

Selected Workstream:
AI Copilot Production Integration — Forensic Discovery + New ADR + Explicit Phase Authorization

Implementation Authorized:
NO

---

## 2. F1 — Domain Ownership

| Path | Classification | Evidence |
|------|----------------|----------|
| `lib/domain/jo/job-order-domain-service.ts` — `JobOrderAssignmentService` | CANONICAL | ADR-091 ratified; 15/15 tests PASS; server-derived tenant, idempotent, atomic asset release |
| `lib/domain/jo/job-order-domain-service.ts` — `DriverReplacementService` | CANONICAL | ADR-091 ratified; handles ASSIGNED-only source state; tenant isolation verified |
| `lib/domain/jo/job-order-domain-service.ts` — `JobOrderCancellationService` | CANONICAL | ADR-091 ratified; terminal CANCELLED state; no competing mutation path |
| `lib/copilot/execute/execution-service.ts` — `routeToDomainService` | MOCK / UNSAFE | Returns hardcoded success responses for ASSIGN_DRIVER and CANCEL_JOB without invoking canonical services |
| `lib/services/assignmentSave.ts` | COMPATIBILITY / LEGACY | Helper-layer mutation; accepts tenantId as parameter but does not consistently filter by tenant_id; classified D in ADR-091 |
| `ops_reject_reassign_jo` (migration 183) | LEGACY / UNSAFE | SECURITY DEFINER RPC; no tenant check, no state precondition, no authorization check |
| `src/platforms/copilot/` | PROTOTYPE | Extensive mock adapters (`MockGeminiClient`, `MockVisionAdapter`); not wired to canonical APIs |

**Ownership Ambiguity:** NONE for canonical services. HIGH for EXECUTE boundary — `ExecutionService` owns the boundary but delegates to mock responses instead of canonical domain services.

---

## 3. F2 — Data Authority

| Surface | Classification | Authority |
|---------|----------------|-----------|
| `copilot_proposals` | CANONICAL AUTHORITY | Server-generated `proposal_number` via `next_copilot_proposal_number()`; `tenant_id` enforced; `UNIQUE(tenant_id, proposal_number)` + `UNIQUE(tenant_id, idempotency_key)` |
| `job_orders` | CANONICAL AUTHORITY | Mutated via `JobOrderAssignmentService`, `DriverReplacementService`, `JobOrderCancellationService` |
| `wo_items` | CANONICAL AUTHORITY | Mutated via canonical domain services |
| `job_tracking` | CANONICAL AUTHORITY | Mutated via canonical domain services |
| `md_fleets`, `md_drivers` | CANONICAL AUTHORITY | Mutated via canonical domain services |
| `claim_proposal_for_execution` | CANONICAL RPC | Atomic E9 concurrent claim; `outcome` in `{'CLAIMED' | 'ALREADY_EXECUTED' | 'CONFLICT' | 'INVALID_STATE'}` |

**Compatibility Projection:** NONE identified for copilot data surfaces.

**Legacy Surface:** `ops_reject_reassign_jo` RPC operates directly on `job_orders`/`job_tracking`/`md_fleets`/`md_drivers` without canonical service mediation.

---

## 4. F3 — Tenant Isolation

| Boundary | Classification | Evidence |
|----------|----------------|----------|
| Session identity origin | VERIFIED | `resolveSessionIdentity()` in `app/api/copilot/execute/route.ts:9` — server-derived, no client tenant trust |
| Proposal authority | VERIFIED | `ProposalAuthorityService.getProposal()` filters by `tenant_id = identity.tenantId` |
| Execution authorization | VERIFIED | `ExecutionService.checkAuthorization()` uses `assertPermission(identity, permission)` |
| Canonical domain services | VERIFIED | `JobOrderAssignmentService`, `DriverReplacementService`, `JobOrderCancellationService` all enforce `IdentityContext.tenantId` |
| RLS defense-in-depth | UNKNOWN | `copilot_proposals` RLS policy not inspected in this assessment |
| `ContextEnricher` | PARTIAL | `src/platforms/copilot/engine/ContextEnricher.ts:36-44` hardcodes `role: 'USER'`, `permissions: ['commercial:read']`, `isTenantOwner: false`, `membershipId: null`, `sbuScope: null` — actual user permissions ignored |

**Client-Provided Tenant Identifiers:** NONE trusted. All tenant identity is server-derived.

---

## 5. F4 — Authorization

| Layer | Classification | Evidence |
|-------|----------------|----------|
| Actor identity source | VERIFIED | `resolveSessionIdentity()` → `IdentityContext` |
| API authorization | VERIFIED | `assertPermission(ctx, 'commercial:manage')` in `app/api/copilot/execute/route.ts:10` |
| Proposal-time authorization | VERIFIED | `ProposalService.generateProposal()` checks `context.permissions` |
| Execution-time authorization | VERIFIED | `ExecutionService.checkAuthorization()` re-evaluates `required_permissions` against current actor |
| RPC authorization | VERIFIED | `claim_proposal_for_execution` runs with server role; tenant scoped via `p_proposal_number` lookup |
| E7 idempotency | VERIFIED | EXECUTED proposals return stored result; no duplicate domain mutations |
| E9 concurrent claim | VERIFIED | `claim_proposal_for_execution` RPC returns `CONFLICT` outcome for concurrent requests |

**COPILOT EXECUTION AUTHORITY vs DOMAIN MUTATION AUTHORITY:**
- Copilot Execution Authority: `ProposalAuthorityService` — fully implemented, E7/E9 verified
- Domain Mutation Authority: Canonical services exist (`JobOrderAssignmentService`, etc.) but are **NOT called** by `ExecutionService.routeToDomainService`
- Gap: EXECUTE boundary has authority scaffolding but no authoritative domain mutation path

---

## 6. F5 — State Contract

| State Machine | Classification | Evidence |
|---------------|----------------|----------|
| Proposal lifecycle | VERIFIED | `PROPOSED → AWAITING_CONFIRMATION → CONFIRMED → EXECUTABLE → EXECUTED / EXPIRED / CANCELLED` |
| `ASSIGN_DRIVER` source state | VERIFIED | `JobOrderAssignmentService` enforces PENDING_ASSIGNMENT statuses |
| `REPLACE_DRIVER` source state | VERIFIED | ADR-091 D2: ASSIGNED only; `DriverReplacementService` enforces |
| `CANCEL_JOB` source state | VERIFIED | `JobOrderCancellationService` enforces terminal rejected states |
| `routeToDomainService` state validation | MOCK | Returns hardcoded success without invoking state machines — bypasses all state contracts |

**Implicit Transitions:** NONE in canonical services. `routeToDomainService` has implicit "always success" transition.

---

## 7. F6 — Idempotency

| Layer | Classification | Evidence |
|-------|----------------|----------|
| E7 (Proposal-level) | VERIFIED | `ProposalAuthorityService.executeProposal()` and `recordExecutionResult()` return EXECUTED state with stored result on retry |
| E9 (Concurrent claim) | VERIFIED | `claim_proposal_for_execution` RPC uses atomic claim; returns `CONFLICT` for concurrent requests |
| Domain mutation | VERIFIED | Canonical domain services (`JobOrderAssignmentService`, etc.) have their own idempotency and transaction safety |

**E7/E9 Change Required:** NO — immutable during this assessment.

---

## 8. F7 — Transaction / Consistency

| Boundary | Classification | Evidence |
|----------|----------------|----------|
| Proposal creation | VERIFIED | Single-row INSERT into `copilot_proposals` |
| Proposal claim | VERIFIED | Atomic RPC `claim_proposal_for_execution` |
| Domain mutation (current mock) | N/A | `routeToDomainService` returns mock success — no real mutations |
| Domain mutation (canonical) | VERIFIED | `JobOrderAssignmentService` handles multi-table mutations (JO + WO items + tracking + fleet/driver status) with transaction safety |
| Partial-failure risk | UNKNOWN | `routeToDomainService` not wired; canonical services have rollback semantics but not tested through EXECUTE boundary |

---

## 9. F8 — External Side Effects

| System | Classification | Evidence |
|--------|----------------|----------|
| WhatsApp | LOCKED | No WhatsApp integration in copilot execution path |
| Autonomous Execution | LOCKED | Human confirmation required; no unattended execution path |
| External APIs | READ ONLY | `MockGeminiClient` and `MockVisionAdapter` are mock-only; no real LLM/vision API calls |
| GPS | NONE | No GPS integration in copilot |
| CEISA/customs | NONE | No customs integration in copilot |
| Notifications | NONE | Mock responses only; no real push/notification dispatch |

---

## 10. F9 — Tests / Regression Baseline

| Suite | Result | Notes |
|-------|--------|-------|
| ADR-091 Copilot Domain Mutation Authority | 15/15 PASS | Verifies canonical services in isolation |
| Copilot Stage 1 READ | PASS | Mocks `ProposalAuthorityService`; validates READ providers |
| Copilot Stage 2 PROPOSE | PASS | Mocks `ProposalAuthorityService`; validates proposal generation |
| Copilot Stage 3 EXECUTE | PASS | Mocks `ProposalAuthorityService`; validates EXECUTE boundary |
| Full Regression | 1531/1539 PASS | 8 pre-existing failures unrelated to copilot |

**Targeted Results:** All copilot tests pass, but they mock the domain mutation layer. No integration test exercises real canonical domain mutation through the EXECUTE boundary.

---

## 11. F10 — Architectural Decision Requirements

| Requirement | Status |
|-------------|--------|
| ADR for proposal authority | EXISTING ADR SUFFICIENT — ADR-090 RATIFIED |
| ADR for domain mutation authority | EXISTING ADR SUFFICIENT — ADR-091 RATIFIED |
| ADR for EXECUTE → canonical domain wiring | NEW ADR REQUIRED — no ADR governs the mock-to-canonical transition |
| Implementation authorization | IMPLEMENTATION AUTHORIZATION REQUIRED |
| Human business decision | YES — whether to proceed with AI Copilot production integration |

**Implementation Readiness:** NOT READY — `routeToDomainService` is a mock boundary; canonical services exist but are not wired.

---

## 12. Gaps

GAP-01:
`ExecutionService.routeToDomainService` returns hardcoded mock success responses for `ASSIGN_DRIVER` and `CANCEL_JOB` without invoking canonical domain services (`JobOrderAssignmentService`, `DriverReplacementService`, `JobOrderCancellationService`). This means EXECUTE has authority scaffolding (E7/E9/proposal authority) but no authoritative domain mutation path.

GAP-02:
`ContextEnricher` (`src/platforms/copilot/engine/ContextEnricher.ts:36-44`) hardcodes `role: 'USER'`, `permissions: ['commercial:read']`, `isTenantOwner: false`, `membershipId: null`, `sbuScope: null` instead of using actual user identity context. This means Copilot context enrichment does not reflect the authenticated user's actual permissions or role.

GAP-03:
`src/platforms/copilot/` prototype layer uses mock adapters (`MockGeminiClient`, `MockVisionAdapter`). Real LLM and vision integration is not wired. This is a prototype-only implementation.

GAP-04:
No integration or E2E tests exercise real PostgreSQL execution through the copilot EXECUTE boundary. All tests mock `ProposalAuthorityService` and do not verify canonical domain mutations.

GAP-05:
`copilot_proposals` RLS policy not verified in this assessment. Schema exists but production RLS enforcement not confirmed.

---

## 13. Recommended Next Gate

1. **Forensic Discovery Complete** — this report establishes the gap baseline
2. **New ADR Required** — "AI Copilot EXECUTE → Canonical Domain Wiring" defining the mock-to-canonical transition, state contract validation, and transaction boundaries
3. **Explicit Phase Authorization Required** — user must provide:
   ```
   I AUTHORIZE SENTRALOGIS AI COPILOT PRODUCTION INTEGRATION IMPLEMENTATION ONLY.
   ```
4. **Acceptance Gate Must Define** — targeted test count, full regression baseline (1531/1539), TypeScript/lint criteria, tenant isolation criteria, and architectural invariant checklist

---

## 14. Change Ledger

CODE:
NONE — read-only assessment; no production code modified

SCHEMA:
NONE — no schema changes

MIGRATIONS:
NONE — no migrations created or modified

DATABASE:
NONE — no database mutations

TESTS:
NONE — no tests modified or repaired

CONFIG:
NONE — no configuration changes

PRODUCTION:
NONE — no production deployment

---

**YELLOW — ARCHITECTURAL / BUSINESS DECISION REQUIRED**

Evidence is sufficient to identify the gap (`routeToDomainService` mock boundary, hardcoded identity in `ContextEnricher`, prototype adapters), but a human decision and explicit implementation authorization are required before any wiring work can proceed. ADR-090 and ADR-091 are ratified and sufficient for the authority model; a new ADR or phase authorization is required for the implementation boundary.
