# SENTRALOGIS — POST-5D AI COPILOT PRODUCTION INTEGRATION
## ADR DECISION PACKAGE — FINAL REPORT

**Date:** 2026-09-08  
**Status:** PROPOSED — AWAITING HUMAN RATIFICATION  
**Mode:** DESIGN / FORENSIC ONLY — NO IMPLEMENTATION AUTHORIZED

---

## A. Governance

```text
Authorization:
  SENTRALOGIS AI COPILOT PRODUCTION INTEGRATION
  ADR DECISION PACKAGE / DESIGN / FORENSIC ONLY

Scope:
  ADR-092 — AI Copilot EXECUTE → Canonical Domain Wiring

Implementation allowed: NO

Required next authorization:
  I AUTHORIZE SENTRALOGIS AI COPILOT PRODUCTION INTEGRATION IMPLEMENTATION ONLY.
```

---

## B. Existing Authorities

### ADR-090 — Proposal Authority (RATIFIED)

- Persistent server-side `copilot_proposals` table
- `proposal_number` authority via `next_copilot_proposal_number()`
- `UNIQUE(tenant_id, proposal_number)` + `UNIQUE(tenant_id, idempotency_key)`
- Lifecycle: `PROPOSED → AWAITING_CONFIRMATION → CONFIRMED → EXECUTABLE → EXECUTED / EXPIRED / CANCELLED`
- Immutable after creation
- Client cannot control execution-critical fields

### ADR-091 — Domain Mutation Authority (RATIFIED)

- `JobOrderAssignmentService.assignDriver()` — ASSIGN_DRIVER
- `DriverReplacementService.replaceDriver()` — REPLACE_DRIVER
- `JobOrderCancellationService.cancelJobOrder()` — CANCEL_JOB
- All services enforce tenant isolation, domain permissions, and state preconditions
- Service contracts defined but not yet wired to EXECUTE boundary

### E7 — Execution Idempotency (GREEN — IMMUTABLE)

- Proposal-level: `CONFIRMED → EXECUTABLE → EXECUTED`
- SUCCESS and FAILED both terminal
- Retry after FAILED NOT ALLOWED
- Does NOT define domain mutation idempotency

### E9 — Concurrent Execution Claim (GREEN — IMMUTABLE)

- Atomic `claim_proposal_for_execution` RPC
- Outcomes: `CLAIMED`, `ALREADY_EXECUTED`, `CONFLICT`, `INVALID_STATE`
- Only one concurrent request wins
- Does NOT define domain transaction semantics

---

## C. Production Integration Scope

**Recommendation: Wire all three mutation actions incrementally**

| Action | Wire Now? | Rationale |
|--------|-----------|-----------|
| ASSIGN_DRIVER | YES | Canonical service exists, well-defined preconditions, lowest risk |
| REPLACE_DRIVER | YES | Canonical service exists, no current execution handler (gap), atomic transaction defined |
| CANCEL_JOB | YES | Canonical service exists, minimal downstream effects, clear terminal state |
| SHOW_TIMELINE | NO | Read-only; no domain mutation required |

**Scope boundary:** EXECUTE → canonical domain service wiring only. Does not include:
- PROPOSE-side changes
- ContextEnricher identity fix
- Mock adapter replacement
- External AI provider integration
- UI changes

---

## D. Canonical Mapping

### ASSIGN_DRIVER

```text
ExecutionService.routeToDomainService
  ↓
JobOrderAssignmentService.assignDriver(context, input)
```

Input mapping:
```typescript
{
  jobOrderId: proposal.entities.find(e => e.entityType === 'JobOrder')?.entityId,
  driverId: proposal.entities.find(e => e.entityType === 'Driver')?.entityId,
  fleetId: proposal.entities.find(e => e.entityType === 'Vehicle')?.entityId || null,
  transporterId: null, // not in current proposal entities
  driverPhone: null,    // not in current proposal entities
  notes: null
}
```

Success: `{ success: true, jobOrder: JobOrder }`  
Failure: `{ success: false, error: string, code: 'INVALID_STATE' | 'DATABASE_ERROR' }`  
Conflict: `JobOrderAssignmentService` returns `INVALID_STATE` if JO not in assignable state

### REPLACE_DRIVER

```text
ExecutionService.routeToDomainService
  ↓
DriverReplacementService.replaceDriver(context, input)
```

Input mapping:
```typescript
{
  jobOrderId: proposal.entities.find(e => e.entityType === 'JobOrder')?.entityId,
  newDriverId: proposal.entities.find(e => e.entityType === 'Driver')?.entityId,
  newFleetId: proposal.entities.find(e => e.entityType === 'Vehicle')?.entityId || null,
  newTransporterId: null, // not in current proposal entities
  reason: 'Copilot automated replacement' // or from confirmation note
}
```

Success: `{ success: true, jobOrder: JobOrder }`  
Failure: `{ success: false, error: string, code: 'INVALID_STATE' | 'SAME_DRIVER' | 'DATABASE_ERROR' }`  
Conflict: `DriverReplacementService` returns `SAME_DRIVER` if new driver == current driver

### CANCEL_JOB

```text
ExecutionService.routeToDomainService
  ↓
JobOrderCancellationService.cancelJobOrder(context, input)
```

Input mapping:
```typescript
{
  jobOrderId: proposal.entities.find(e => e.entityType === 'JobOrder')?.entityId,
  reason: confirmation.confirmationNote || 'Cancelled via Copilot'
}
```

Success: `{ success: true, jobOrder: JobOrder }`  
Failure: `{ success: false, error: string, code: 'INVALID_STATE' | 'MISSING_REASON' | 'DATABASE_ERROR' }`  
Conflict: `JobOrderCancellationService` returns `INVALID_STATE` if JO in terminal state

### SHOW_TIMELINE

No domain mutation required. Read-only via `TimelineQueryProvider.getTimeline()`.

---

## E. Identity / Tenant Authority

### Source

```text
resolveSessionIdentity() → IdentityContext
```

### Trust Boundary

| Field | Source | Trust |
|-------|--------|-------|
| `tenantId` | `resolveSessionIdentity()` | TRUSTED — server-derived |
| `userId` | `resolveSessionIdentity()` | TRUSTED — server-derived |
| `role` | `resolveSessionIdentity()` | TRUSTED — server-derived |
| `permissions` | `resolveSessionIdentity()` | TRUSTED — server-derived |
| `isTenantOwner` | `resolveSessionIdentity()` | TRUSTED — server-derived |
| `membershipId` | `resolveSessionIdentity()` | TRUSTED — server-derived |
| `sbuScope` | `resolveSessionIdentity()` | TRUSTED — server-derived |

### Prohibited Sources

- `proposal.tenant_id` — NOT TRUSTED for authorization
- `request.body.tenantId` — NOT TRUSTED
- `request.body.userId` — NOT TRUSTED
- `confirmation.confirmedBy` — INFORMATIONAL ONLY
- `proposal.created_by` — INFORMATIONAL ONLY

### ContextEnricher Policy

Current behavior violates identity authority by hardcoding:
```typescript
role: 'USER',
permissions: ['commercial:read'],
isTenantOwner: false,
membershipId: null,
sbuScope: null
```

Required behavior: pass through actual `IdentityContext` fields without modification.

---

## F. Authorization

### Copilot Execution Authorization (Layer 1)

Already implemented in `ExecutionService.execute()`:
1. Proposal authority lookup
2. E9 concurrent claim
3. Permission re-evaluation against `required_permissions`

### Domain Authorization (Layer 2)

Already implemented in canonical services:
- `JobOrderAssignmentService` → `assertPermission(context, 'job_order:assign')`
- `DriverReplacementService` → `assertPermission(context, 'job_order:update')`
- `JobOrderCancellationService` → `assertPermission(context, 'job_order:update')`

### Key Principle

```text
Copilot execution authorization
    ≠
Domain mutation authorization
```

Layer 1 success does NOT imply Layer 2 success. Both must pass independently.

---

## G. State Contract

### ASSIGN_DRIVER

| Source States | Target State | Preconditions | Conflict Behavior |
|---------------|--------------|---------------|-------------------|
| `PENDING`, `NEED_ASSIGNMENT`, `DRAFT` | `ASSIGNED` | JO exists, tenant matches, driver exists | `INVALID_STATE` if JO not assignable |

### REPLACE_DRIVER

| Source States | Target State | Preconditions | Conflict Behavior |
|---------------|--------------|---------------|-------------------|
| `ASSIGNED` only (ADR-091 D2) | `ASSIGNED` | JO exists, tenant matches, new driver ≠ current (D3), not post-handover (D4) | `SAME_DRIVER` if identical; `INVALID_STATE` otherwise |

### CANCEL_JOB

| Source States | Target State | Preconditions | Conflict Behavior |
|---------------|--------------|---------------|-------------------|
| NOT terminal (exact states TBD) | `CANCELLED` (terminal, D7) | JO exists, tenant matches, reason required (D9) | `INVALID_STATE` if terminal; `MISSING_REASON` if empty |

---

## H. Idempotency

### Three Distinct Layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Proposal creation | `UNIQUE(tenant_id, idempotency_key)` | PROPOSE |
| E7 execution | `lifecycle_state` transition | EXECUTE boundary |
| E9 concurrent claim | Atomic RPC `claim_proposal_for_execution` | EXECUTE boundary |
| Domain mutation | Canonical service contract | Domain layer |

### Expected Behavior

| Scenario | Expected Result |
|----------|-----------------|
| First EXECUTE | E9 claim: CLAIMED → domain mutation → E7: EXECUTED |
| Concurrent EXECUTE | Winner: CLAIMED; Loser: CONFLICT (zero domain mutations) |
| Retry EXECUTED | E9 claim: ALREADY_EXECUTED → return stored result (zero domain mutations) |
| Domain failure | E7 records FAILED (terminal) → no retry allowed |
| Domain already applied | Domain service handles its own idempotency |

---

## I. Transaction

### Copilot Execution Transaction

No new transaction boundary. EXECUTE delegates to canonical domain services.

### Domain Transaction Boundaries

| Service | Boundary | Requirement |
|---------|----------|-------------|
| `JobOrderAssignmentService.assignDriver` | Single-row UPDATE + tracking INSERT | Verify atomicity during implementation |
| `DriverReplacementService.replaceDriver` | Single atomic transaction (ADR-091 D5): JO + tracking + fleet/driver status | Verify transaction wrapper during implementation |
| `JobOrderCancellationService.cancelJobOrder` | Single-row UPDATE + tracking INSERT + asset releases | Verify atomicity during implementation |

### Critical Requirement

Multi-row domain mutations MUST be atomic. Partial failures must not leave residual state.

---

## J. External Adapters

### Mock Adapters (NON-PRODUCTION)

| Adapter | Current Use | Production Policy |
|---------|-------------|-------------------|
| `MockGeminiClient` | LLM simulation | MUST NOT be reachable from production EXECUTE |
| `MockVisionAdapter` | OCR simulation | MUST NOT be reachable from production EXECUTE |
| `ExecutionEngine` | Mock execution | MUST NOT be reachable from production EXECUTE |
| `OperationalMemory` | Mock state | MUST NOT be reachable from production EXECUTE |
| `BusinessValidationBridge` | Mock validation | MUST NOT be reachable from production EXECUTE |

### Production Path Requirement

Production EXECUTE does NOT require external AI inference. Domain mutation operates on authoritative proposals and canonical services only.

If future phases require AI providers:
- Separate ADR required
- Must remain outside EXECUTE → domain mutation critical path
- Must fail closed, not degrade to mock

---

## K. Integration Acceptance

### Minimum Future Acceptance Suite

| Category | Test |
|----------|------|
| Happy path | Proposal → EXECUTE → canonical service → successful mutation |
| Authorization | Unauthorized actor → DENIED |
| Tenant isolation | Cross-tenant proposal → DENIED |
| Concurrent execution (E9) | Concurrent EXECUTE → CLAIMED + CONFLICT |
| Sequential duplicate (E7) | Retry EXECUTED → stored result, zero domain mutations |
| Domain idempotency | No duplicate domain mutations on retry |
| Domain failure | Correct failure propagation |
| Invalid state | Domain precondition → DENIED |
| Transaction | Partial failure → no residual state |
| Mock adapter exclusion | Production path does not use mocks |
| Audit consistency | EXECUTE audit + domain audit consistent |

---

## L. Human Decisions

### D-01: Production Wiring Scope

**Question:** Should all three mutation actions be production-wired simultaneously, or incrementally?

| Option | Description |
|--------|-------------|
| A | Wire all three actions simultaneously |
| B | Wire incrementally: ASSIGN_DRIVER → CANCEL_JOB → REPLACE_DRIVER |
| C | Wire only ASSIGN_DRIVER first; defer REPLACE_DRIVER and CANCEL_JOB |

**Recommended:** B (incremental)  
**Impact:** Lower risk, enables validation per action, aligns with feature-flag containment  
**Human ratification required:** YES

### D-02: ContextEnricher Identity Fix

**Question:** Should `ContextEnricher` identity fix be bundled with EXECUTE wiring or authorized separately?

| Option | Description |
|--------|-------------|
| A | Bundle with ADR-092 implementation |
| B | Separate authorization for ContextEnricher fix |
| C | Defer ContextEnricher fix to future phase |

**Recommended:** B (separate authorization)  
**Impact:** Keeps ADR-092 focused on EXECUTE boundary; identity fix has broader Copilot impact  
**Human ratification required:** YES

### D-03: Mock Adapter Containment

**Question:** Should mock adapters be removed from production bundle, or merely gated?

| Option | Description |
|--------|-------------|
| A | Remove mock adapters from production bundle |
| B | Gate mock adapters behind environment checks |
| C | Leave mock adapters in place; rely on code review |

**Recommended:** A (remove from production bundle)  
**Impact:** Cleaner production artifact; eliminates risk of mock execution in production  
**Human ratification required:** NO — forensic recommendation only

### D-04: REPLACE_DRIVER Entity Mapping

**Question:** Current proposal entities do not include `transporterId`. How should `REPLACE_DRIVER` handle missing transporter?

| Option | Description |
|--------|-------------|
| A | Require `transporterId` in proposal entities (PROPOSE-side change) |
| B | Allow `null` transporter; use existing transporter from JO |
| C | Reject REPLACE_DRIVER proposals without transporter entity |

**Recommended:** B (allow null; preserve existing transporter)  
**Impact:** Minimal; maintains current JO state  
**Human ratification required:** YES

---

## M. Proposed ADR-092

**Status:** PROPOSED — NOT RATIFIED

ADR-092 content has been prepared at:

```text
docs/architecture/ADR-092-copilot-execute-canonical-domain-wiring.md
```

The ADR includes:
- Context and problem statement
- Existing authorities (ADR-090, ADR-091, E7, E9)
- Decision matrix (A: wire all actions, B: EXECUTE boundary only)
- Action scope table
- Identity/tenant authority
- Authorization boundary (two-layer model)
- State contracts per action
- Idempotency model (three-layer)
- Transaction boundary
- External adapter policy
- Audit requirements
- Testing requirements
- Rollout/containment (incremental, feature-flagged)
- Prohibited actions
- Consequences
- Acceptance criteria (A1–A10)
- Implementation boundary
- Rejected alternatives

---

## N. Change Ledger

```text
Production code changes: 0
Schema changes: 0
Migration changes: 0
Data changes: 0
Test changes: 0
E7 changes: 0
E9 changes: 0
ADR-090 changes: 0
ADR-091 changes: 0
```

---

## O. Final Verdict

```text
YELLOW — HUMAN DECISION REQUIRED
```

Evidence is sufficient to define the exact wiring contract (ADR-092 drafted), but human ratification of the ADR and explicit implementation authorization are required before any production wiring can proceed.

**Required next steps:**
1. Human ratification of ADR-092
2. Explicit implementation authorization per action:
   ```
   I AUTHORIZE SENTRALOGIS AI COPILOT PRODUCTION INTEGRATION IMPLEMENTATION ONLY.
   ```
3. Separate authorization for ContextEnricher identity fix (if D-02 Option B chosen)

---

**END OF ADR DECISION PACKAGE**
