# ADR-092 — AI Copilot EXECUTE → Canonical Domain Wiring

**Status:** RATIFIED AS AMENDED — 2026-09-30  
**Date:** 2026-09-08 (original) · 2026-09-30 (amended)  
**Author:** Sentralogis Architecture  
**Depends on:** ADR-090 (RATIFIED), ADR-091 (RATIFIED), E7 (GREEN — IMMUTABLE), E9 (GREEN — IMMUTABLE)  
**Supersedes:** None  
**Amendment authority:** AD-01 = RATIFY AS AMENDED, recorded in `docs/architecture/SENTRALOGIS_ADR_092_RATIFY_AMEND_HUMAN_DECISION_GATE.md` (HUMAN ARCHITECTURAL DECISION CLOSURE). This status reflects governance ratification of the amended document only — it is not runtime readiness, staging/production verification, feature-flag activation, or production deployment.

---

## 1. Context

> **Amended 2026-09-30 (stale-wording correction, issue I-17 of the decision package).** The original text of this section described the EXECUTE boundary as returning mock success responses with no `REPLACE_DRIVER` handler. That description was accurate at original drafting (2026-09-08) but no longer matches the currently evidenced source architecture. The original wording is preserved below as `§1.1 Original problem statement (historical)`; the current evidenced state follows in `§1.2`.

### 1.1 Original problem statement (historical, 2026-09-08)

AI Copilot EXECUTE boundary returned mock success responses for mutation intents without invoking canonical domain services.

Original `ExecutionService.routeToDomainService` (`lib/copilot/execute/execution-service.ts`):
- `ASSIGN_DRIVER`: returned hardcoded success message without calling `JobOrderAssignmentService`
- `CANCEL_JOB`: returned hardcoded success message without calling `JobOrderCancellationService`
- `REPLACE_DRIVER`: threw `No execution handler` — no handler existed
- `SHOW_TIMELINE`: not handled in `routeToDomainService` (read-only, no mutation required)

### 1.2 Current evidenced source state (as recorded in the decision package)

The decision package `SENTRALOGIS_ADR_092_RATIFY_AMEND_HUMAN_DECISION_GATE.md` (§5 source evidence, §10 matrix M-2) records:
- `routeToDomainService` contains exactly three mutation cases — `ASSIGN_DRIVER`, `CANCEL_JOB`, `REPLACE_DRIVER` — each fail-closed behind its feature flag before canonical service invocation, plus `default → throw` for unknown intents.
- `SHOW_TIMELINE` remains read-only and is not handled in the EXECUTE switch.
- All three flags default OFF (fail-closed). Runtime EXECUTE verification remains **NOT ESTABLISHED**; real staging EXECUTE remains **NOT PERFORMED**; production verification remains **NOT ESTABLISHED**.

This is a source-evidence statement only. It is NOT runtime verification and NOT production activation.

ADR-090 established the proposal authority boundary (PROPOSE → `copilot_proposals` → EXECUTE).  
ADR-091 established the domain mutation authority boundary (canonical services for `ASSIGN_DRIVER`, `REPLACE_DRIVER`, `CANCEL_JOB`) — ADR-091 remains the underlying RATIFIED domain-mutation authority; this ADR is the Copilot wiring/governance layer and does not create domain mutation authority.  
E7 established proposal-level execution idempotency.  
E9 established atomic concurrent execution claim.

This ADR defines how EXECUTE wires to canonical domain mutation services without reopening, weakening, or modifying ADR-090, ADR-091, E7, or E9.

---

## 2. Problem Statement

The EXECUTE boundary has authority scaffolding but no authoritative domain mutation path:

> **Amended 2026-09-30:** this table records the problem as stated at original drafting (2026-09-08). Per §1.2 and the decision package, the EXECUTE → domain-mutation gap and the `REPLACE_DRIVER` handler gap are now closed **in source**; runtime verification remains a separate, unmet gate (§20a.F).

| Layer | Current State | Gap |
|-------|---------------|-----|
| Proposal authority | `ProposalAuthorityService` — fully implemented | NONE |
| E7 idempotency | `claim_proposal_for_execution` RPC — verified | NONE |
| E9 concurrent claim | Atomic RPC with `CONFLICT` outcome — verified | NONE |
| EXECUTE → domain mutation | Mock responses only | NO canonical service invocation |
| Context enrichment | `ContextEnricher` hardcodes identity fields | Actual user context ignored |

Consequences:
- Copilot execution does not mutate domain state
- No audit trail of actual domain mutations
- No tenant isolation enforcement in execution path
- No state precondition validation
- No domain-level idempotency
- `REPLACE_DRIVER` proposal type has no execution handler at all

---

## 3. Existing Authorities

### 3.1 ADR-090 — Proposal Authority

- Server-side `copilot_proposals` table with `proposal_number` authority
- `next_copilot_proposal_number()` atomic generator
- `UNIQUE(tenant_id, proposal_number)` + `UNIQUE(tenant_id, idempotency_key)`
- Lifecycle: `PROPOSED → AWAITING_CONFIRMATION → CONFIRMED → EXECUTABLE → EXECUTED / EXPIRED / CANCELLED`
- Tenant-bound: `tenant_id = server-derived identity.tenantId`
- Immutable after creation

### 3.2 ADR-091 — Domain Mutation Authority

Canonical services:
- `JobOrderAssignmentService.assignDriver(context, input)` — ASSIGN_DRIVER
- `DriverReplacementService.replaceDriver(context, input)` — REPLACE_DRIVER
- `JobOrderCancellationService.cancelJobOrder(context, input)` — CANCEL_JOB

All services:
- Accept `IdentityContext` as first parameter
- Enforce tenant isolation via `context.tenantId`
- Enforce domain-specific permissions via `assertPermission`
- Enforce state preconditions
- Return `JobOrderResult { success, jobOrder?, error?, code? }`

### 3.3 E7 — Execution Idempotency

- Proposal-level: `CONFIRMED → EXECUTABLE → EXECUTED`
- SUCCESS and FAILED both transition to terminal `EXECUTED`
- Retry after FAILED is NOT ALLOWED
- Does NOT define domain mutation idempotency

### 3.4 E9 — Concurrent Execution Claim

- Atomic `claim_proposal_for_execution` RPC
- Outcomes: `CLAIMED`, `ALREADY_EXECUTED`, `CONFLICT`, `INVALID_STATE`
- Only one concurrent request can win
- Does NOT define domain transaction semantics

---

## 4. Decision

### 4.1 Production Wiring Scope

**DECISION A — WIRE ALL MUTATION ACTIONS**

Production-wire all three mutation actions:
- `ASSIGN_DRIVER` → `JobOrderAssignmentService.assignDriver()`
- `REPLACE_DRIVER` → `DriverReplacementService.replaceDriver()`
- `CANCEL_JOB` → `JobOrderCancellationService.cancelJobOrder()`

`SHOW_TIMELINE` remains read-only; no domain mutation required.

Rationale:
- All three canonical services exist and are ratified by ADR-091
- All three have verified state preconditions and tenant isolation
- Wiring all three maintains consistency and avoids partial implementation debt
- `REPLACE_DRIVER` currently has no execution handler — this is a gap, not a reason to defer

### 4.2 Implementation Boundary

**DECISION B — EXECUTE BOUNDARY ONLY**

This ADR governs ONLY the EXECUTE → canonical domain service wiring boundary.

It does NOT authorize:
- PROPOSE-side changes
- ContextEnricher changes
- Mock adapter replacement
- External AI provider integration
- UI changes
- Schema changes
- Test creation

---

## 5. Action Scope

| Action | Production-wire now? | Canonical service | Method | Authorization | Preconditions | Side effects |
|--------|---------------------|-------------------|--------|---------------|---------------|--------------|
| ASSIGN_DRIVER | YES | `JobOrderAssignmentService` | `assignDriver(context, input)` | `job_order:assign` | JO in `PENDING`, `NEED_ASSIGNMENT`, or `DRAFT` | JO update, tracking log, fleet/driver status |
| REPLACE_DRIVER | YES | `DriverReplacementService` | `replaceDriver(context, input)` | `job_order:update` | JO in `ASSIGNED`; new driver ≠ current driver | JO update, tracking log, old asset release, new asset activation |
| CANCEL_JOB | YES | `JobOrderCancellationService` | `cancelJobOrder(context, input)` | `job_order:update` | JO NOT in terminal state; reason required | JO → CANCELLED, tracking log, asset release |
| SHOW_TIMELINE | READ ONLY | `TimelineQueryProvider` | `getTimeline(context, query)` | `commercial:read` | None | None |

---

## 6. Identity Authority

### 6.1 Identity Source

The ONLY authoritative identity source is `resolveSessionIdentity()` at the API route boundary.

```text
app/api/copilot/execute/route.ts
  ↓
resolveSessionIdentity()
  ↓
IdentityContext {
  tenantId: string;      // server-derived, NEVER from client
  userId: string;        // server-derived, NEVER from client
  role: string;          // server-derived
  permissions: string[]; // server-derived
  isTenantOwner: boolean;
  membershipId: string | null;
  sbuScope: string | null;
}
```

### 6.2 Prohibited Trust Sources

The following MUST NOT be trusted for authorization or tenant isolation:
- `proposal.tenant_id` — proposal payload is immutable but not authoritative for tenant
- `request.body.tenantId` — client-supplied
- `request.body.userId` — client-supplied
- `confirmation.confirmedBy` — informational only; server uses `ctx.userId`
- `proposal.created_by` — informational only; does not bind executor

### 6.3 ContextEnricher Identity Policy

`ContextEnricher` MUST receive the actual `IdentityContext` from the authenticated request.

Current behavior (GAP-02): hardcoded `role: 'USER'`, `permissions: ['commercial:read']`, `isTenantOwner: false`, `membershipId: null`, `sbuScope: null`.

Required behavior: pass through the server-derived `IdentityContext` fields without modification.

---

## 7. Tenant Authority

Tenant identity flows exclusively from `IdentityContext.tenantId`:

```text
API Route
  ↓
resolveSessionIdentity() → ctx.tenantId
  ↓
ProposalAuthorityService.getProposal(identity, proposalNumber)
  WHERE tenant_id = identity.tenantId
  ↓
ExecutionService.execute(identity, request)
  ↓
canonical domain service(context, input)
  WHERE tenant_id = context.tenantId
```

Cross-tenant execution is impossible because:
1. `resolveSessionIdentity()` returns only the authenticated tenant
2. `ProposalAuthorityService.getProposal()` filters by `tenant_id = identity.tenantId`
3. Canonical domain services filter by `tenant_id = context.tenantId`

---

## 8. Authorization Boundary

### 8.1 Two-Layer Authorization

```text
Copilot Execution Authorization          Domain Mutation Authorization
(ADDR-090 / E7 / E9)                     (ADR-091 / canonical services)
  ↓                                         ↓
May this proposal be executed?            May this actor perform this mutation?
```

These are DISTINCT checks. Success at layer 1 does NOT imply success at layer 2.

### 8.2 Execution Authorization

Already implemented in `ExecutionService.execute()`:
1. Proposal authority lookup (`ProposalAuthorityService.getProposal`)
2. E9 concurrent claim (`claimProposalForExecution`)
3. Permission re-evaluation (`assertPermission` against `required_permissions`)

### 8.3 Domain Authorization

Already implemented in canonical services:
- `JobOrderAssignmentService.assignDriver()` — `assertPermission(context, 'job_order:assign')`
- `DriverReplacementService.replaceDriver()` — `assertPermission(context, 'job_order:update')`
- `JobOrderCancellationService.cancelJobOrder()` — `assertPermission(context, 'job_order:update')`

### 8.4 Authorization Flow

```text
EXECUTE request
  ↓
resolveSessionIdentity()
  ↓
ProposalAuthorityService.getProposal(identity, proposalId)
  ↓ tenant + proposal authority check
ExecutionService.checkAuthorization(identity, proposal.required_permissions)
  ↓ re-evaluate current actor permissions
ProposalAuthorityService.claimProposalForExecution(identity, proposalNumber)
  ↓ E9 atomic claim
routeToDomainService(identity, executionProposal)
  ↓
canonical domain service(context, input)
  ↓ domain-specific permission + tenant + state checks
```

---

## 9. State Contract

### 9.1 ASSIGN_DRIVER

| Aspect | Contract |
|--------|----------|
| Source states | `PENDING`, `NEED_ASSIGNMENT`, `DRAFT` |
| Target state | `ASSIGNED` |
| Preconditions | JO exists, tenant matches, driver/fleet/transporter exist |
| Conflict states | `ASSIGNED`, `IN_PROGRESS`, terminal states |
| Invalid-state behavior | `JobOrderAssignmentService` returns `{ success: false, code: 'INVALID_STATE' }` |

### 9.2 REPLACE_DRIVER

| Aspect | Contract |
|--------|----------|
| Source states | `ASSIGNED` only (ADR-091 D2) |
| Target state | `ASSIGNED` — driver identity change without lifecycle transition |
| Preconditions | JO exists, tenant matches, new driver ≠ current driver (ADR-091 D3), not post-handover (ADR-091 D4) |
| Conflict states | `ASSIGNED` with same driver, `IN_PROGRESS`, terminal states |
| Invalid-state behavior | `DriverReplacementService` returns `{ success: false, code: 'INVALID_STATE' }` or `{ success: false, code: 'SAME_DRIVER' }` |

### 9.3 CANCEL_JOB

| Aspect | Contract |
|--------|----------|
| Source states | NOT terminal (exact source states TBD during implementation design per ADR-091 D6) |
| Target state | `CANCELLED` (terminal, ADR-091 D7) |
| Preconditions | JO exists, tenant matches, reason provided (ADR-091 D9) |
| Conflict states | Terminal states (`CANCELLED`, `COMPLETED`, etc.) |
| Invalid-state behavior | `JobOrderCancellationService` returns `{ success: false, code: 'INVALID_STATE' }` |

---

## 10. Idempotency

### 10.1 Three Distinct Layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Proposal creation idempotency | `UNIQUE(tenant_id, idempotency_key)` on `copilot_proposals` | PROPOSE |
| E7 execution idempotency | `lifecycle_state` transition `CONFIRMED → EXECUTABLE → EXECUTED` | EXECUTE boundary |
| E9 concurrent claim | Atomic `claim_proposal_for_execution` RPC | EXECUTE boundary |
| Domain mutation idempotency | Canonical service contract (per ADR-091) | Domain layer |

### 10.2 Interaction Model

```text
First EXECUTE
  ↓
E9 claim: CLAIMED
  ↓
Domain mutation: SUCCESS
  ↓
E7 record: EXECUTED
  ↓
Retry same EXECUTE
  ↓
E9 claim: ALREADY_EXECUTED
  ↓
Return stored execution result
  ↓
ZERO additional domain mutations
```

### 10.3 Domain Failure Semantics

If domain mutation fails AFTER E9 claim:
- E7 records `EXECUTED` with `status: FAILED`
- Retry is NOT allowed (E7 terminal state)
- Compensation must be handled by domain service or separate authorization

### 10.4 Domain Idempotency Requirements

| Service | Domain Idempotency Requirement |
|---------|-------------------------------|
| `JobOrderAssignmentService` | UNKNOWN — service design required during implementation |
| `DriverReplacementService` | UNKNOWN — service design required during implementation |
| `JobOrderCancellationService` | UNKNOWN — service design required during implementation |

---

## 11. Transaction Boundary

### 11.1 Copilot Execution Transaction

Copilot execution does NOT introduce a new transaction boundary. It delegates to canonical domain services which manage their own transactions.

### 11.2 Domain Transaction Boundaries

| Service | Transaction Boundary | Evidence |
|---------|---------------------|----------|
| `JobOrderAssignmentService.assignDriver` | Single-row UPDATE + tracking INSERT | Current implementation: no explicit transaction |
| `DriverReplacementService.replaceDriver` | Single atomic transaction: JO update + tracking INSERT + fleet/driver status updates (ADR-091 D5) | Current implementation: sequential DB calls without explicit transaction |
| `JobOrderCancellationService.cancelJobOrder` | Single-row UPDATE + tracking INSERT + asset releases | Current implementation: sequential DB calls without explicit transaction |

### 11.3 Transaction Requirement

During implementation, canonical services MUST ensure atomicity for multi-row mutations. This is a domain implementation prerequisite, NOT an E7/E9 change.

---

## 12. External Adapter Policy

### 12.1 Mock Adapters

The following mock adapters MUST remain non-production reachable from the EXECUTE boundary:
- `MockGeminiClient` — LLM simulation
- `MockVisionAdapter` — OCR simulation
- `ExecutionEngine` — mock execution engine
- `OperationalMemory` — mock state
- `BusinessValidationBridge` — mock validation logic

### 12.2 Production Adapter Requirement

Production wiring does NOT require external AI provider integration. The EXECUTE boundary operates on authoritative proposals and canonical domain services without requiring LLM/vision inference at execution time.

If future phases require external AI adapters, they must:
- Be explicitly authorized by separate ADR
- Remain outside the EXECUTE → domain mutation critical path
- Fail closed (reject execution) rather than degrade to mock behavior
- Have separate timeout/retry/circuit-breaker policy

### 12.3 Adapter Configuration

Mock adapters may remain in development/test environments. Production environments MUST NOT use mock adapters for execution-critical paths.

---

## 13. Audit Requirements

### 13.1 Existing Audit

`ExecutionService.recordExecutionAudit()` logs:
- `module: 'copilot.execute'`
- `action: 'EXECUTION_COMPLETED'`
- `user_id`, `reference_type`, `reference_id`, `correlation_id`
- `new_data: { intent, proposalId, status, message, entities, confirmedBy, confirmedAt, confirmationNote }`
- `metadata: { tenantId, timestamp }`

### 13.2 Required Domain Audit

Canonical domain services already record:
- `job_tracking` entries for assignment, replacement, cancellation events
- `updated_by` and `updated_at` on `job_orders`

No additional audit infrastructure is required. The EXECUTE audit and domain audit remain separate but complementary.

---

## 14. Testing Requirements

### 14.1 Minimum Acceptance Suite

Future implementation must include integration tests covering:

| Test | Scenario |
|------|----------|
| Happy path ASSIGN_DRIVER | Proposal → EXECUTE → `JobOrderAssignmentService` → successful mutation |
| Happy path REPLACE_DRIVER | Proposal → EXECUTE → `DriverReplacementService` → successful mutation |
| Happy path CANCEL_JOB | Proposal → EXECUTE → `JobOrderCancellationService` → successful mutation |
| Unauthorized actor | Actor without `job_order:assign`/`job_order:update` → DENIED |
| Tenant isolation | Cross-tenant proposal → DENIED |
| Concurrent execution (E9) | Concurrent EXECUTE → one CLAIMED, one CONFLICT |
| Sequential duplicate (E7) | Retry EXECUTED proposal → stored result, ZERO domain mutations |
| Domain failure | Domain service returns error → FAILED execution result, E7 terminal |
| Invalid state | Domain service rejects precondition → DENIED with domain error |
| Transaction atomicity | Partial domain mutation failure → no residual state |
| Mock adapter exclusion | Production path does not invoke `MockGeminiClient` or `MockVisionAdapter` |
| Audit consistency | EXECUTE audit + domain audit records remain consistent |

### 14.2 Test Boundary

Tests must exercise the real EXECUTE → canonical domain service boundary. Mocking `ProposalAuthorityService` is acceptable for unit tests, but integration tests must use real proposal records and real domain mutations.

---

## 15. Rollout / Containment

### 15.1 Implementation Order

**DECISION C — ONE ACTION AT A TIME**

Implement wiring for one action at a time in this order:
1. `ASSIGN_DRIVER` — lowest risk, existing canonical service, well-defined preconditions
2. `CANCEL_JOB` — single-row mutation, minimal downstream effects
3. `REPLACE_DRIVER` — multi-row atomic transaction, requires transaction boundary verification

### 15.2 Feature Flag Requirement

Each action MUST be feature-flagged and disabled by default.

Only after the acceptance suite passes for an action may it be enabled in production.

### 15.3 Reversibility

Wiring must be reversible at the integration layer without weakening domain invariants:
- Feature flag OFF → `routeToDomainService` throws the "action not enabled" error **before** any canonical service invocation; the execution result is recorded as `FAILED` with that message and **zero domain mutations** (source/test evidence per the decision package §10 matrix M-3 and §11 issue I-18: Phase 3 test T2 asserts flag OFF → `status=FAILED`). *(Amended 2026-09-30: the original wording claimed flag OFF returns `DENIED`; that contradicted current source/test evidence and has been corrected.)*
- Feature flag OFF (`OFF`), authorization refusal (`DENIED`), execution failure (`FAILED`), `NOT TESTED`, and `UNKNOWN` are distinct states and must not be equated or collapsed.
- No domain mutations occur when flag is OFF
- Domain services remain unchanged

---

## 16. Prohibited Actions

The following are explicitly PROHIBITED in this ADR:

| Prohibited Action | Rationale |
|-------------------|-----------|
| Autonomous domain mutation | Human confirmation required per E7 |
| Background execution | No unattended execution path |
| AI direct database mutation | All mutations through canonical domain services |
| AI direct Supabase mutation | All mutations through canonical domain services |
| Bypassing domain authorization | Copilot execution authorization ≠ domain authorization |
| Weakening tenant isolation | Server-derived tenant only |
| Collapsing E7/E9 layers | Each layer remains distinct |
| Modifying ADR-090 | Proposal authority is immutable |
| Modifying ADR-091 | Domain mutation authority is immutable |
| Modifying E7 | Execution idempotency is immutable |
| Modifying E9 | Concurrent claim is immutable |
| Using mock adapters in production EXECUTE | Mock adapters are development/test only |
| Trusting client-supplied tenant/user identity | Server-derived identity only |

---

## 17. Consequences

### 17.1 Positive

- Closes the EXECUTE → domain mutation gap identified in Post-5D forensic assessment
- Preserves all existing authority layers (ADR-090, ADR-091, E7, E9)
- Establishes clear wiring contract for future implementation
- Enables incremental rollout with feature flags
- Maintains tenant isolation and domain authorization boundaries

### 17.2 Negative

- Requires implementation authorization for each action
- Requires canonical service transaction boundary verification
- Requires integration test suite creation
- `ContextEnricher` identity fix required before production use

### 17.3 Neutral

- No schema changes required
- No new domain services required
- No external AI provider integration required for EXECUTE boundary
- No WhatsApp integration introduced

---

## 18. Acceptance Criteria

### A1 — EXECUTE Invokes Canonical Services
`routeToDomainService` invokes `JobOrderAssignmentService`, `DriverReplacementService`, or `JobOrderCancellationService` for mutation intents.

### A2 — No Mock Domain Mutation
Production EXECUTE path does not return hardcoded mock success responses.

### A3 — Identity Preservation
`ContextEnricher` and EXECUTE boundary use server-derived `IdentityContext` without hardcoded fallbacks.

### A4 — Authorization Preservation
Both Copilot execution authorization and domain authorization are enforced independently.

### A5 — Tenant Isolation Preservation
All domain mutations are scoped to `context.tenantId`; cross-tenant execution fails.

### A6 — State Contract Preservation
All domain preconditions from ADR-091 are enforced by canonical services.

### A7 — E7/E9 Preservation
E7 proposal-level idempotency and E9 concurrent claim remain unchanged.

### A8 — Audit Preservation
EXECUTE audit and domain audit records remain complementary and consistent.

### A9 — Mock Adapter Containment
Mock adapters (`MockGeminiClient`, `MockVisionAdapter`, etc.) cannot be reached from production EXECUTE path.

### A10 — Feature Flag Containment
Each action is independently feature-flagged and disabled by default.

---

## 19. Implementation Boundary

This ADR does NOT authorize implementation.

Implementation requires:
1. **ADR-092 ratification** — this document
2. **Separate explicit implementation authorization** — one per action
3. **Schema authorization** — if `copilot_proposals` RLS or schema changes needed
4. **Test authorization** — integration test suite for each action
5. **ContextEnricher fix authorization** — separate authorization for identity fix

---

## 20. Rejected Alternatives

| Alternative | Reason Rejected |
|-------------|-----------------|
| **A — Full Copilot Rewire** | Too broad; violates token-efficiency and incremental rollout principles |
| **B — Extend E7/E9** | E7/E9 are immutable; domain mutation idempotency belongs to canonical services |
| **C — New Domain Service Layer** | Canonical services already exist; additional abstraction adds complexity without benefit |
| **D — Client-Supplied Identity Context** | Violates server-derived tenant isolation principle |
| **E — Bypass Domain Authorization** | Violates ADR-091; Copilot execution authorization ≠ domain authorization |

---

## 20a. Governance Clarifications (Amendment 2026-09-30)

Added under AD-03/AD-04/AD-05 = ADD / CLARIFY. Document-only: no new commands, permissions, flags, implementation, or runtime claims.

### 20a.A — Primary Command Interface

Copilot is the intended Primary Command Interface for Sentralogis, while remaining separate from the system's authorization authority. Copilot may interpret intent, resolve context, present information, prepare proposals, request confirmation, and invoke authorized domain commands. This is a **target architecture** statement (C0 CD-01 direction); it does NOT claim that this target architecture is already fully deployed, operationally established, or runtime-verified. The distinctions `TARGET ARCHITECTURE` vs `CURRENT IMPLEMENTATION` vs `RUNTIME VERIFICATION` vs `PRODUCTION ACTIVATION` remain separate and must not be collapsed.

### 20a.B — Authorization / Authorized Data Surface

Copilot is not a free-form database interface. Copilot operates only through authorized server-side identity, tenant, permission, and data/domain access boundaries: `resolveSessionIdentity()` → `IdentityContext` → server-side authorization → authorized data surface / domain context. Copilot READ flows only through an Authorized Data Surface appropriate to the authenticated user's identity, tenant, permissions, and domain context. **Natural-language input must not grant authority**: user language, intent, entity names, or a requested role must never override server-side authorization, and Copilot must not infer authorization from natural-language intent. No client-supplied identity, no weakened tenant isolation, no second authorization authority.

### 20a.C — READ / PROPOSE / EXECUTE Separation

- **READ** — retrieves authorized information; does not mutate domain state.
- **PROPOSE** — prepares a proposed action; a proposal is not execution.
- **EXECUTE** — performs an authorized, confirmed mutation through the canonical domain service.

These three modes are distinct and must not be collapsed. EXECUTE requires, with no step bypassable: (1) authenticated server identity; (2) tenant context; (3) required server-side permission; (4) authorized proposal/action; (5) explicit human confirmation; (6) feature flag enabled for the specific command; (7) canonical domain service execution; (8) audit/event recording.

### 20a.D — EXECUTE Scope (Allowlist, Unchanged)

The authorized Copilot EXECUTE surface is an explicit allowlist, not an open command mechanism:

```text
ASSIGN_DRIVER
REPLACE_DRIVER
CANCEL_JOB
```

`SHOW_TIMELINE` remains READ-only and is NOT an EXECUTE mutation command. ADR-091 remains the underlying RATIFIED domain-mutation authority; this ADR is only the Copilot wiring/governance layer and does not create domain mutation authority. Everything else (including `UPDATE_STATUS`, `VERIFY_POD`, `CREATE_INVOICE`, `APPROVE_PAYMENT`, `POST_ACCOUNTING`, `CREATE_CUSTOMER`, and any background/autonomous command) is outside this ADR's EXECUTE scope unless separately authorized by future governance. Historical documentation examples are not implemented EXECUTE handlers. AD-02 = RETAIN EXISTING RATIFIED JO DOMAIN BOUNDARY — this amendment adds no commands.

### 20a.E — Financial / Accounting / Administrative Exclusion

ADR-092 does NOT authorize Copilot EXECUTE for: financial mutation, accounting mutation, invoice mutation, payment approval, settlement mutation, administrative/security mutation, RLS mutation, tenant administration, permission administration, or schema/database administration. Such capabilities remain outside the current EXECUTE boundary. This establishes scope only and does not prohibit future architecture work under separate governance.

### 20a.F — Runtime / Production Boundary

ADR-092 governance status (including this amendment and RATIFIED AS AMENDED status) is separate from, and does not constitute: runtime verification; staging execution verification; production verification; production activation; production deployment. Current evidence, unchanged by this amendment: runtime EXECUTE verification = **NOT ESTABLISHED**; real staging EXECUTE = **NOT PERFORMED**; production EXECUTE verification = **NOT ESTABLISHED**. Feature flags `COPILOT_EXECUTE_ASSIGN_DRIVER`, `COPILOT_EXECUTE_REPLACE_DRIVER`, `COPILOT_EXECUTE_CANCEL_JOB` remain default **OFF** (fail-closed); this amendment does not activate them, does not modify their values, and does not claim they are enabled in production. Flag activation, rollout, and deployment each require separate authorization and evidence gates.

### 20a.G — Failure / Unknown / Anti-Fabrication

Copilot must not report a mutation as completed without authoritative execution evidence. If the required authoritative data or execution evidence is unavailable, Copilot must communicate that limitation rather than inventing a result. The states `OFF`, `DENIED`, `FAILED`, `NOT TESTED`, and `UNKNOWN` are distinct and must not be equated; execution outcomes must distinguish at minimum `UNKNOWN`, `NOT AUTHORIZED`, `PROPOSED`, `WAITING FOR CONFIRMATION`, `FAILED`, and `COMPLETED`.

---

## 21. Status

**RATIFIED AS AMENDED — 2026-09-30**

This ADR establishes the architectural boundary for AI Copilot EXECUTE → canonical domain wiring. It was amended and ratified with status `RATIFIED AS AMENDED` solely because AD-01 = RATIFY AS AMENDED was explicitly selected by the Human Architect, with AD-03/AD-04/AD-05 = ADD / CLARIFY and AD-06 = AUTHORIZE ADR-092 EDIT IN A SEPARATE FOLLOW-UP GATE, recorded in `docs/architecture/SENTRALOGIS_ADR_092_RATIFY_AMEND_HUMAN_DECISION_GATE.md` (HUMAN ARCHITECTURAL DECISION CLOSURE).

AD-02 = RETAIN EXISTING RATIFIED JO DOMAIN BOUNDARY: the EXECUTE allowlist remains exactly `ASSIGN_DRIVER`, `REPLACE_DRIVER`, `CANCEL_JOB` (§5, §20a.D). ADR-091 remains the underlying RATIFIED domain-mutation authority and is unmodified.

This status is a governance document status only. It does NOT constitute runtime readiness, staging or production verification, feature-flag activation, rollout, or production deployment — all of which remain separate future gates (§20a.F).

This ADR does not authorize implementation. Implementation requires separate explicit authorization for each action (§19).

---

**END OF ADR-092 (RATIFIED AS AMENDED)**
