# ADR-091 — AI Copilot Domain Mutation Authority

**Status:** RATIFIED — 2026-09-08  
**Date:** 2026-09-08  
**Ratified by:** Human Architecture Gate, 2026-09-08  
**Depends on:** ADR-090 (RATIFIED)  
**Supersedes:** None  

--- 

## 1. Context

AI Copilot EXECUTE flow currently supports four proposal types:

```text
ASSIGN_DRIVER
REPLACE_DRIVER
SHOW_TIMELINE
CANCEL_JOB
```

Only `ASSIGN_DRIVER` has existing implementation logic (`lib/services/assignmentSave.ts`), but that logic is a service-layer helper, not a canonical domain service. `REPLACE_DRIVER` has an existing database function (`ops_reject_reassign_jo`), but it is a SECURITY DEFINER RPC, not a canonical domain service. `CANCEL_JOB` has no authoritative domain mutation authority in the repository.

ADR-090 established the proposal authority boundary (PROPOSE → copilot_proposals → EXECUTE). E7 established execution idempotency. E9 established atomic execution claim. This ADR establishes the domain mutation authority boundary for the existing executable proposal types.

--- 

## 2. Problem Statement

The AI Copilot EXECUTE flow lacks authoritative domain mutation services for three of four executable proposal types:

| Proposal | Existing Authority | Gap |
|---|---|---|
| ASSIGN_DRIVER | `assignmentSave.ts` (helper, not canonical) | Missing canonical domain service with proper tenant isolation |
| REPLACE_DRIVER | `ops_reject_reassign_jo` (RPC, not canonical service) | Missing canonical domain service; state contract implicit only |
| CANCEL_JOB | None | No domain service exists |
| SHOW_TIMELINE | Read-only | No mutation required |

Consequences:
- EXECUTE cannot safely mutate domain state through canonical domain services
- `assignmentSave.ts` is not a canonical domain service and has tenant-safety concerns
- `ops_reject_reassign_jo` is a database-level function, not an application-level domain service
- `CANCEL_JOB` has no mutation authority at all
- Proposal types exist without authoritative application-level mutation boundaries

--- 

## 3. Existing Evidence

### 3.1 Job Order Status Model

`lib/domain/jo/status.ts` defines:

```typescript
export const JO_REJECTED_STATUSES = [
  'REJECTED',
  'HANDOVER_REJECTED',
  'CANCELLED',
] as const;

export const JO_PENDING_ASSIGNMENT_STATUSES = ['PENDING', 'NEED_ASSIGNMENT', 'NEED_ASSIGN'] as const;
```

Evidence:
- `CANCELLED` is recognized as a terminal rejected state
- No canonical cancellation service exists for `job_orders`
- Other domains (sales orders, fulfillments, operational handoffs) have canonical cancellation services, but job orders do not

### 3.2 Assignment Logic

`lib/services/assignmentSave.ts`:
- Mutates `job_orders` and `wo_items` directly
- Accepts `tenantId` as explicit parameter
- Includes `tenant_id` in INSERT payloads
- Does NOT consistently filter SELECT/UPDATE/DELETE queries by `tenant_id`
- Handles `draft`, `confirm`, and `handover` modes
- Creates JOs with status `pending` or `assigned`
- Updates `wo_items` status to `need_assignment` or `assigned`

### 3.3 Driver Replacement Logic

`supabase/migrations/183_ops_reject_reassign_jo.sql`:
- SECURITY DEFINER function `ops_reject_reassign_jo`
- Operationally used by SBU Trucking Work Orders `RejectReassignModal`
- Updates `job_orders`: `transporter_id`, `fleet_id`, `driver_id`, `driver_link_token`, `driver_response = 'accepted'`, `status = 'ASSIGNED'`, `rejection_note`
- Inserts `job_tracking` record with `OPS_REJECT_REASSIGN`
- Releases old fleet/driver to `available`
- Marks new fleet/driver as `on_duty`
- NO state precondition check
- NO tenant check
- NO authorization check

### 3.4 Cancellation Logic

No canonical cancellation service or function exists for `job_orders`. The `CANCELLED` status exists in `JO_REJECTED_STATUSES` but no transition authority or state machine governs it.

### 3.5 Domain Service Patterns

Other canonical domain services follow this pattern:
- `lib/sales-order/service.ts` — `cancelSalesOrder()` with tenant enforcement
- `lib/fulfillment/service.ts` — `performFulfillmentAction()` with state machine
- `lib/operational-handoff/service.ts` — `performOperationalHandoffAction()` with state machine

No equivalent canonical service exists for job order assignment, replacement, or cancellation.

--- 

## 4. Decision

### 4.1 Proposal Scope Decision

**OPTION B — CREATE AUTHORITATIVE DOMAIN SERVICES**

Retain all four proposal types:
- `ASSIGN_DRIVER`
- `REPLACE_DRIVER`
- `SHOW_TIMELINE`
- `CANCEL_JOB`

Create canonical domain services for missing mutation authorities:
- `JobOrderAssignmentService` — canonical assignment authority
- `DriverReplacementService` — canonical driver replacement authority (wrapping/replacing `ops_reject_reassign_jo`)
- `JobOrderCancellationService` — canonical cancellation authority

Rationale:
- Executable proposal types should not exist without authoritative mutation boundaries
- Other domains have established canonical service patterns
- Narrowing scope or removing proposal types would create inconsistent Copilot behavior
- The missing services represent a domain architecture gap, not a Copilot design flaw

### 4.2 `assignmentSave.ts` Disposition

**Classification: D — Candidate for refactoring behind canonical service**

`assignmentSave.ts` should be:
1. Retained as a compatibility adapter during transition
2. Refactored to delegate to `JobOrderAssignmentService` for mutation logic
3. Eventually retired once all callers migrate to the canonical service

Do NOT:
- Treat it as canonical authority
- Modify it under this ADR
- Remove it without migration plan

### 4.3 `ops_reject_reassign_jo` Disposition

**Classification: D — Candidate for replacement by canonical service**

The function should be:
1. Retained temporarily for backward compatibility
2. Replaced by `DriverReplacementService` as the canonical mutation boundary
3. Eventually deprecated once all callers migrate

The function's operational logic (status → `ASSIGNED`, fleet/driver status updates, tracking log) should be preserved in the canonical service.

--- 

## 5. Ratified State Contracts (D1–D9)

### 5.1 D1 — REPLACE_DRIVER Canonical Meaning

**Decision:** OPTION C — DISTINCT OPERATIONS

`REPLACE_DRIVER` is a **pure driver replacement operation**. The existing `ops_reject_reassign_jo` workflow remains semantically distinct because it combines operational rejection and reassignment.

Therefore:
```text
REPLACE_DRIVER ≠ REJECT + REASSIGN
```

`DriverReplacementService` will eventually be a pure replacement authority. `ops_reject_reassign_jo` remains an existing operational workflow until a separately authorized migration/replacement decision is made.

### 5.2 D2 — REPLACE_DRIVER Source States

**Decision:** OPTION A — ASSIGNED ONLY

Canonical source state: `ASSIGNED`

`REPLACE_DRIVER` is not authorized from:
- `IN_PROGRESS`
- completed states
- cancelled states
- rejected states
- terminal states
- payment/completion phases
- any other state unless a future ADR explicitly changes this contract.

### 5.3 D3 — Same-Driver Behavior

**Decision:** OPTION C — REJECT

If `current_driver_id == requested_driver_id`, the canonical operation must reject the request.

Do not:
- regenerate driver tokens
- mutate assignment
- emit a replacement event
- perform resource release/reassignment
- treat the request as successful replacement.

### 5.4 D4 — Handover Rules

**Decision:** OPTION A — STRICT

Driver replacement is permitted only before operational execution/handover has begun. Therefore replacement is prohibited after:
- handover
- execution start
- completion
- payment commitment
- any equivalent irreversible operational milestone.

Because D2 establishes `ASSIGNED` as the canonical source state, the implementation must eventually ensure that an `ASSIGNED` JO has not already crossed an operational execution boundary.

### 5.5 D5 — Transaction Boundary

**Decision:** OPTION A — SINGLE ATOMIC TRANSACTION

The eventual canonical replacement operation must treat its related mutations as one atomic domain transaction. The intended consistency boundary covers, where applicable:
- `job_orders`
- `job_tracking`
- driver resource state
- fleet resource state
- related assignment records

Either all required mutations succeed, or all required mutations roll back.

This is a domain transaction requirement. It is NOT E7 idempotency, NOT E9 concurrent claim, and does not modify E9.

### 5.6 D6 — CANCEL_JOB State Contract

**Decision:** OPTION A — CANCELLED AS CANONICAL TERMINAL CANCELLATION

Canonical target: `CANCELLED`

`CANCELLED` represents business cancellation of the Job Order. Do not create a new cancellation status in this ratification gate.

The exact allowed source states must still be represented explicitly as a future service contract if repository evidence does not establish them.

Therefore:
```text
CANCEL_JOB
    source states: TO BE DEFINED DURING IMPLEMENTATION DESIGN
    target state: CANCELLED
```

### 5.7 D7 — Cancellation Terminality

**Decision:** OPTION A — TERMINAL + NON-REVERSIBLE

Once a Job Order reaches `CANCELLED`, the canonical operation cannot restore it to an active state. There is no implicit `UNCANCEL`. If future business requirements require reversal, that must be a separate explicitly authorized architectural decision and operation.

### 5.8 D8 — Cancellation Downstream Effects

**Decision:** OPTION A — MINIMAL

Canonical cancellation mutation scope:
1. Cancel the Job Order.
2. Release applicable assigned driver/fleet resources.
3. Record the cancellation event/audit information.

Do NOT automatically cascade cancellation to:
- `work_orders`
- `wo_items`
- fulfillment records
- financial records
- unrelated operational records.

Any broader cascade requires separate domain evidence and authorization.

### 5.9 D9 — Cancellation Reason

**Decision:** OPTION A — MANDATORY

A future canonical cancellation operation must require a cancellation reason. The reason must be captured in the domain/audit record using an existing appropriate field where possible.

Do NOT introduce a new reason-code schema/catalog in this gate.

--- 

## 6. Proposed Service Contracts

### 6.1 JobOrderAssignmentService

```typescript
interface JobOrderAssignmentService {
  assignDriver(context: IdentityContext, input: {
    jobOrderId: string;
    driverId: string;
    fleetId?: string;
    transporterId?: string;
    driverPhone?: string;
    notes?: string;
  }): Promise<JobOrder>;

  batchAssign(context: IdentityContext, input: {
    woItemId: string;
    assignments: AssignmentSlot[];
    mode: 'draft' | 'confirm' | 'handover';
  }): Promise<SaveAssignmentsResult>;
}
```

**Contract requirements:**
- Tenant identity: server-derived from `IdentityContext`
- Authorization: domain-specific permission check
- Preconditions: JO must be in assignable state (`PENDING`, `NEED_ASSIGNMENT`, `DRAFT`)
- Mutation: single-row or multi-row depending on mode
- Transaction: multi-row requires explicit transaction boundary (domain implementation prerequisite, NOT E9)
- Audit: record assignment actor, timestamp, previous state
- Idempotency: E7 proposal-level execution idempotency; domain-level idempotency TBD by service design

### 6.2 DriverReplacementService

```typescript
interface DriverReplacementService {
  replaceDriver(context: IdentityContext, input: {
    jobOrderId: string;
    newDriverId: string;
    newFleetId?: string;
    newTransporterId?: string;
    reason?: string;
  }): Promise<JobOrder>;
}
```

**Contract requirements:**
- Tenant identity: server-derived from `IdentityContext`
- Authorization: domain-specific permission check
- Preconditions: JO must be in `ASSIGNED` state (D2)
- Mutation: single-row update to `job_orders` + related fleet/driver status updates + `job_tracking`
- Transaction: single atomic transaction covering all related mutations (D5)
- Audit: record replacement actor, timestamp, previous driver, reason
- Idempotency: E7 proposal-level execution idempotency; domain-level idempotency TBD
- Same-driver behavior: REJECT if `current_driver_id == new_driver_id` (D3)
- Handover rule: Strict — replacement only before execution/handover (D4)

### 6.3 JobOrderCancellationService

```typescript
interface JobOrderCancellationService {
  cancelJobOrder(context: IdentityContext, input: {
    jobOrderId: string;
    reason: string;
  }): Promise<JobOrder>;
}
```

**Contract requirements:**
- Tenant identity: server-derived from `IdentityContext`
- Authorization: domain-specific permission check
- Preconditions: JO must NOT be in terminal state; exact source states TBD during implementation design (D6)
- Mutation: single-row update to `job_orders.status = 'CANCELLED'` + release driver/fleet resources
- Transaction: single-row; no transaction required
- Audit: record cancellation actor, timestamp, reason
- Idempotency: E7 proposal-level execution idempotency; domain-level idempotency TBD
- Downstream effects: Minimal — only JO + resource release (D8)
- Reason: Mandatory (D9)

--- 

## 7. State Contracts

### 7.1 Driver Replacement State Contract

**RATIFIED STATE CONTRACT:**

| Aspect | Decision |
|---|---|
| Operation Identity | Pure driver replacement (D1) |
| Source states | `ASSIGNED` only (D2) |
| Target state | `ASSIGNED` — driver identity change without lifecycle transition |
| Same-driver behavior | REJECT (D3) |
| Handover rule | Strict — only before execution/handover (D4) |
| Driver eligibility | New driver/fleet/transporter must exist; old assets released; new assets marked `on_duty` |
| Transaction | Single atomic transaction (D5) |
| Audit | `job_tracking` with replacement event |

### 7.2 Job Order Cancellation State Contract

**RATIFIED STATE CONTRACT:**

| Aspect | Decision |
|---|---|
| Operation Identity | Business cancellation (D6) |
| Source states | TO BE DEFINED DURING IMPLEMENTATION DESIGN |
| Target state | `CANCELLED` (D6) |
| Terminality | Terminal + non-reversible (D7) |
| Downstream effects | Minimal — JO + resource release only (D8) |
| Reason | Mandatory (D9) |
| Audit | Record cancellation actor, timestamp, reason |

--- 

## 8. Idempotency and Transaction Model

### 8.1 E7 Execution Idempotency

E7 establishes Copilot execution idempotency at the proposal level:

```text
lifecycle_state + proposal_payload.executionResult
```

Properties:
- `CONFIRMED → EXECUTABLE → EXECUTED`
- SUCCESS and FAILED both transition to terminal `EXECUTED`
- Retry after FAILED is NOT ALLOWED
- This is proposal-level only; it does not define domain mutation idempotency

### 8.2 E9 Concurrent Execution Claim

E9 establishes atomic concurrent execution claim:

```text
CONFIRMED
    ↓
atomic claim
    ↓
CLAIMED
```

Outcomes:
- `CLAIMED` → execution may proceed
- `CONFLICT` → no domain mutation
- `ALREADY_EXECUTED` → no domain mutation

Properties:
- Only one concurrent request can win the execution claim
- This is execution claiming only; it does not define domain transaction semantics

### 8.3 Domain Mutation Idempotency

Domain mutation idempotency is NOT defined by E7 or E9.

Each canonical domain service must define its own idempotency contract:

| Service | Domain Idempotency |
|---|---|
| JobOrderAssignmentService | UNKNOWN — service design required |
| DriverReplacementService | UNKNOWN — service design required |
| JobOrderCancellationService | UNKNOWN — service design required |

### 8.4 Domain Transaction Semantics

Domain transaction semantics are NOT defined by E9.

E9 provides atomic execution claiming only. Multi-row or cross-table domain mutations require an explicit transaction boundary defined during domain service design.

| Service | Transaction Boundary |
|---|---|
| JobOrderAssignmentService | Multi-row requires explicit transaction (domain implementation prerequisite, NOT E9) |
| DriverReplacementService | Single atomic transaction (D5) |
| JobOrderCancellationService | Single-row; no transaction required |

--- 

## 9. Tenant Isolation Contract

The canonical tenant rule for all three services:

```text
Tenant identity must be:
  - server-derived from IdentityContext
  - never from client request body
  - never from proposal payload
  - enforced at domain mutation boundary
  - verified against authoritative domain record
```

Current violations:
- `assignmentSave.ts`: accepts `tenantId` from caller; does NOT consistently filter queries by `tenant_id`
- `ops_reject_reassign_jo`: no tenant parameter; no tenant check

Required fix (implementation phase):
- All SELECT/UPDATE/DELETE queries MUST include `tenant_id = context.tenantId`
- INSERT payloads MUST include server-derived `tenant_id`
- No client-supplied tenant identity may be trusted

--- 

## 10. Authorization Contract

```text
Copilot execution authorization
    ≠
Domain mutation authorization
```

Copilot EXECUTE verifies:
- Proposal authority
- E9 atomic claim
- E7 idempotency
- Confirmation

Domain services must independently verify:
- Domain-specific permissions
- Tenant ownership
- State preconditions
- Business rules

Current authorization status:
- `assignmentSave.ts`: no explicit authorization check
- `ops_reject_reassign_jo`: no authorization check
- `CANCEL_JOB`: no authorization mechanism exists

--- 

## 11. E7/E9 Preservation

All E7 and E9 semantics remain immutable:

- E7: `CONFIRMED → EXECUTABLE → EXECUTED` with SUCCESS/FAILED terminal states
- E9: `CLAIMED / CONFLICT / ALREADY_EXECUTED` atomic claim outcomes
- Domain mutation occurs ONLY after `CLAIMED`
- `CONFLICT` and `ALREADY_EXECUTED` produce zero domain mutations

--- 

## 12. Implementation Prerequisites

Before implementation may begin:

### ARCHITECTURAL PREREQUISITES
1. **ADR-091 ratification** — this document
2. **Driver replacement state contract design:**
   - Allowed source states: `ASSIGNED` only (D2)
   - Target state semantics: `ASSIGNED` — driver identity change without lifecycle transition
   - Same-driver behavior: REJECT (D3)
   - Handover restrictions: Strict pre-execution only (D4)
   - Driver eligibility rules: to be designed
   - Transaction boundary: Single atomic transaction (D5)
3. **Job order cancellation state contract design:**
   - Allowed source states: TO BE DEFINED DURING IMPLEMENTATION DESIGN (D6)
   - Terminal/reversible semantics: Terminal + non-reversible (D7)
   - Downstream effects: Minimal — JO + resource release only (D8)
   - Reason requirements: Mandatory (D9)

### IMPLEMENTATION PREREQUISITES
4. **Implementation authorization** — separate explicit authorization for each service
5. **Tenant isolation enforcement** — audit and fix `assignmentSave.ts` and `ops_reject_reassign_jo` tenant filtering
6. **Domain authorization design** — permission checks for each service
7. **Domain idempotency design** — per-service idempotency contract

### SCHEMA PREREQUISITES
8. **Schema authorization** — if `job_orders` schema changes required

### TEST PREREQUISITES
9. **Test authorization** — targeted tests for each new service

--- 

## 13. Governance Impact

| Component | Status |
|---|---|
| E7 | GREEN — BOUNDED COMPLETE |
| E9 | GREEN — BOUNDED COMPLETE |
| Domain Mutation | ADR-091 — RATIFIED |
| WhatsApp | LOCKED |
| Autonomous Execution | LOCKED |

--- 

## 14. Consequences

### Positive
- Establishes clear domain mutation authority for all executable proposal types
- Aligns Copilot execution with existing canonical domain service patterns
- Fixes tenant-safety gaps in existing assignment/replacement logic
- Provides clear migration path for `assignmentSave.ts` and `ops_reject_reassign_jo`
- Resolves nine architectural decisions with explicit human ratification

### Negative
- Requires creation of three new domain services
- Requires domain design for remaining service contract details
- Requires tenant isolation enforcement in existing code
- Requires additional implementation authorization

### Neutral
- No changes to E7/E9 semantics
- No changes to proposal types or lifecycle
- No schema changes required for basic implementation

--- 

## 15. Ratified Decisions (D1–D9)

| Decision | Question | Ratified Choice |
| -------- | -------- | --------------- |
| D1 | Canonical meaning of REPLACE_DRIVER | **C — Distinct Operations** |
| D2 | REPLACE_DRIVER source states | **A — ASSIGNED only** |
| D3 | Same-driver behavior | **C — REJECT** |
| D4 | Handover rules | **A — Strict pre-execution replacement** |
| D5 | Transaction boundary | **A — Single atomic transaction** |
| D6 | Cancellation state contract | **A — CANCELLED canonical terminal** |
| D7 | Cancellation terminality | **A — Terminal + non-reversible** |
| D8 | Downstream effects | **A — Minimal** |
| D9 | Cancellation reason | **A — Mandatory** |

--- 

## 16. Status

**RATIFIED — 2026-09-08**

This ADR has been ratified by the Human Architecture Gate.

Ratification establishes the architecture boundary for future implementation. Implementation requires separate explicit authorization for:
1. Schema/migration authorization
2. Service implementation authorization
3. Tenant isolation enforcement
4. Test authorization

--- 

**END OF ADR-091**
