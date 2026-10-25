# SENTRALOGIS PHASE 3 UNIT 2
# IMPLEMENTATION SCOPE & AUTHORIZATION DESIGN

**Document ID:** `SENTRALOGIS_PHASE3_UNIT2_IMPLEMENTATION_SCOPE_AND_AUTHORIZATION.md`
**Date:** 2026-09-22
**Classification:** FORENSIC / DESIGN-ONLY — NO IMPLEMENTATION AUTHORIZATION
**Scope:** Define the binding implementation contract for Phase 3 Unit 2 — Canonical WO/JO Operational Mutation.
**Implementation Status:** NOT AUTHORIZED — implementation requires separate explicit human authorization.

---

## 1. Status

```text
STATUS:
GREEN — IMPLEMENTATION SCOPE DEFINED
IMPLEMENTATION NOT YET AUTHORIZED

ARCHITECTURAL AUTHORITY:
RESOLVED — LEVEL 0 HUMAN RATIFICATION

IMPLEMENTATION AUTHORIZATION:
HUMAN RATIFICATION PROVIDED — "I AUTHORIZE SENTRALOGIS PHASE 3 UNIT 2 IMPLEMENTATION."
IMPLEMENTATION: NOT AUTHORIZED — requires separate implementation authorization
```

---

## 2. Ratified Architectural Authority

### Level 0 — Explicit Human Architectural Ratification

Phase 3 Unit 2:

```text
CANONICAL WO/JO OPERATIONAL MUTATION
```

### Gate C — Human Implementation Authorization

The human explicitly authorized:

```text
I AUTHORIZE SENTRALOGIS PHASE 3 UNIT 2 IMPLEMENTATION.
```

This authorization is valid for the repository governance process.

### Governance Model

```text
PHASE 3 GOVERNANCE MODEL:
HYBRID

Unit = acceptance / delivery boundary
Phase = implementation sequencing
```

### Ratified Structure

```text
PHASE 3
│
├── UNIT 1
│   └── Canonical Read-only WO/JO Execution Workspace
│       STATUS: CLOSED — GREEN
│
├── UNIT 2
│   └── Canonical WO/JO Operational Mutation
│       STATUS: ARCHITECTURALLY RATIFIED
│       IMPLEMENTATION: NOT AUTHORIZED
│
└── FUTURE UNITS
```

### Terminology

```text
"Phase 3 Unit 2" is the canonical identifier.
"Phase 3.2" is ambiguous / non-canonical and MUST NOT be used as a synonym for Unit 2.
```

### Customs Domain Engine

```text
CUSTOMS DOMAIN ENGINE = SEPARATE IMPLEMENTATION-SEQUENCING CONCERN
NOT automatically Unit 2.
NOT deleted.
NOT redefined.
```

### Human Operator vs Copilot

```text
HUMAN OPERATOR = canonical mutation path — architecturally ratified
COPILOT = separately governed under ADR-090 / ADR-091 / ADR-092
```

### Canonical Authorization

```text
resolveSessionIdentity()
→ IdentityContext
→ assertPermission()
→ server-side tenant resolution
→ domain authorization
→ mutation service
```

### Canonical Lineage

```text
Engagement
→ Sales Order
→ Fulfillment
→ Allocation
→ Operational Handoff
→ WO
→ WO Items
→ JO
→ Execution
```

---

## 3. Unit 2 Boundary

Phase 3 Unit 2 is:

```text
CANONICAL WO/JO OPERATIONAL MUTATION
```

Unit 2 owns:

```text
WO mutation
WO Items mutation
JO human-operated mutation
```

Unit 2 explicitly excludes:

```text
FIN-INVOICE
accounting
vendor invoice
financial settlement
shipment creation (unless separately ratified)
handoff mutation (unless separately ratified)
Customs Domain Engine
Copilot governance
ZHILI
```

Unit 1 remains protected:

```text
GET /api/v1/operational/work-orders/{id}
GET /api/v1/operational/work-orders/{id}/items
GET /api/v1/operational/job-orders/{id}
```

---

## 4. WO Mutation Authority

### 4.1 Canonical Service

**Proposed name:** `WorkOrderMutationService`

**Responsibility:** Canonical WO mutation authority for Phase 3 Unit 2.

**Domain ownership:** Commercial / WO domain.

**Allowed inputs:** Explicit WO mutation commands (defined in §7).

**Identity context:** `resolveSessionIdentity() → IdentityContext`.

**Tenant context:** Server-derived from `IdentityContext.tenantId`.

**Output:** Mutated WO state or domain rejection.

**Error boundary:** Domain error mapping, no raw DB errors to UI.

**Do NOT create a generic `updateWorkOrder()` CRUD abstraction.**

### 4.2 WO Command Boundary

Candidate commands:

```text
WO_CREATE
WO_UPDATE
WO_TRANSITION
WO_CANCEL
WO_COMMITMENT_UPDATE
```

Classification:

| Command | Classification |
| ------- | -------------- |
| WO_CREATE | REQUIRES DECISION |
| WO_UPDATE | REQUIRES DECISION |
| WO_TRANSITION | REQUIRES DECISION |
| WO_CANCEL | REQUIRES DECISION |
| WO_COMMITMENT_UPDATE | REQUIRES DECISION |

**Do NOT assume all are in scope.** Each command requires explicit architectural decision.

### 4.3 WO State Transitions

Map the currently documented WO lifecycle.

Do NOT invent states.

For each transition identify:

```text
Current State
→ Command
→ Next State
→ Preconditions
→ Permission
→ Confirmation
→ Audit
```

If lifecycle authority is missing:

```text
WO LIFECYCLE AUTHORITY = UNRESOLVED
```

and mark implementation blocked for that transition.

### 4.4 WO Mutation Authority Status

```text
WO MUTATION AUTHORITY:
NOT YET ESTABLISHED
PRE-IMPLEMENTATION DESIGN GATE
```

---

## 5. JO Human Mutation Authority

### 5.1 Existing Services

```text
JobOrderAssignmentService
DriverReplacementService
JobOrderCancellationService
```

### 5.2 Human vs Copilot Distinction

```text
HUMAN OPERATOR MUTATION AUTHORITY
≠
COPILOT EXECUTE AUTHORITY (ADR-091)
```

ADR-091 governs Copilot Execute. Human-operated Unit 2 authority is distinct.

### 5.3 JO Human Mutation Authority Status

```text
JO HUMAN MUTATION AUTHORITY:
NOT YET ESTABLISHED
PRE-IMPLEMENTATION DESIGN GATE
```

---

## 6. Human Operator vs Copilot

### Human Operator

```text
Human Operator
→ Canonical UI / API
→ Canonical authorization
→ Domain mutation service
→ Domain state transition
```

### Copilot

```text
Copilot
→ ADR-090 / ADR-091 / ADR-092
→ Copilot execution authority
```

### Separation

- Do NOT merge the two paths.
- Do NOT alter ADR-092.
- Do NOT implement Copilot.
- Do NOT change Copilot rollout semantics.
- Do NOT activate Copilot flags.
- Do NOT bypass Copilot confirmation.

---

## 7. WO Command Matrix

| Command | Endpoint | Service | Permission | Confirmation | Transaction | Audit | Idempotency | Lifecycle | Status |
| ------- | -------- | ------- | ---------- | ------------ | ----------- | ----- | ----------- | --------- | ------ |
| WO_CREATE | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| WO_UPDATE | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| WO_TRANSITION | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| WO_CANCEL | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| WO_COMMITMENT_UPDATE | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |

Every unknown is explicitly marked `UNDEFINED`. Never silently assume.

---

## 8. JO Command Matrix

| Command | Endpoint | Service | Permission | Confirmation | Transaction | Audit | Idempotency | Lifecycle | Status |
| ------- | -------- | ------- | ---------- | ------------ | ----------- | ----- | ----------- | --------- | ------ |
| ASSIGN_DRIVER | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| REPLACE_DRIVER | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| CANCEL_JOB | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| ACCEPT_JOB | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| START_JOB | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| STATUS_TRANSITION | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | UNDEFINED |

Every unknown is explicitly marked `UNDEFINED`. Never silently assume.

---

## 9. Permission Matrix

Existing permissions relevant to Unit 2:

```text
job_order:read
job_order:assign
job_order:update
job_order:create
job_order:complete
work_order:read
work_order:create
work_order:update
work_order:approve
```

Unit 2-specific permission mapping: NOT DESIGNED.

```text
PERMISSION DESIGN = PRE-IMPLEMENTATION GATE
```

Do not modify permissions. Do not modify permission definitions.

---

## 10. Confirmation Model

Which mutation classes require explicit human confirmation: NOT YET DEFINED.

Separate:

```text
READ
PROPOSE
CONFIRM
EXECUTE
```

For human Unit 2 operations, identify:

- commands that may execute immediately
- commands requiring confirmation
- commands requiring secondary confirmation
- commands that must never be implicit

Do not implement confirmation UI. Do not implement command execution.

---

## 11. Transaction Boundaries

For each mutation determine whether the operation requires atomicity: NOT YET DETERMINED.

Consider:

```text
WO state
WO items
JO state
driver assignment
transporter/fleet references
operational ownership
related event/audit records
```

Identify:

```text
ATOMIC TRANSACTION REQUIRED
or
SEPARATE TRANSACTION ACCEPTABLE
or
NOT YET DETERMINED
```

Do not modify DB functions or transactions.

---

## 12. Audit Model

Which commands require auditable records: NOT YET DEFINED.

At minimum evaluate:

```text
actor
tenant
command
target
before state
after state
timestamp
reason
correlation/idempotency key
source
```

Determine whether the existing architecture already has an audit/event mechanism that should be reused.

Do NOT create an audit table. Do NOT modify event infrastructure.

---

## 13. Idempotency Model

Which mutation commands require idempotency: NOT YET DEFINED.

At minimum evaluate:

```text
ASSIGN_DRIVER
REPLACE_DRIVER
CANCEL_JOB
ACCEPT_JOB
START_JOB
WO transitions
```

For each command classify:

```text
REQUIRED
RECOMMENDED
NOT REQUIRED
NOT YET DETERMINED
```

Do not implement idempotency.

---

## 14. Tenant Isolation

Future Unit 2 implementation MUST use canonical identity.

Required architecture:

```text
resolveSessionIdentity()
→ IdentityContext
→ assertPermission()
```

Tenant identity MUST be server-resolved.

Every mutation authority MUST enforce tenant scope.

Do not rely on client-supplied tenant IDs. Do not use client profile data as the authority. Do not modify RLS.

---

## 15. API Boundary

Candidate endpoints: NOT YET DEFINED.

Determine:

```text
POST
PATCH
DELETE
command endpoint
```

only as design proposals.

Do NOT implement routes.

For each candidate endpoint specify:

```text
Endpoint
HTTP method
Command
Authorization
Input
Output
Error semantics
Idempotency
Audit
Transaction
```

Do not duplicate legacy trucking endpoints as the canonical API.

---

## 16. UI Mutation Boundary

Extend the existing canonical operational workspace where the contract requires UI support.

Do NOT redesign unrelated navigation. Do NOT modify Unit 1 read behavior unnecessarily.

Mutation controls must:

- reflect permission
- reflect lifecycle state
- require confirmation where defined
- show meaningful failure states
- avoid exposing unauthorized commands
- preserve tenant boundaries
- avoid optimistic state changes unless explicitly justified by the contract

The UI must not determine authorization independently. Server-side authorization remains authoritative.

---

## 17. Legacy Coexistence / Deprecation

Existing legacy surfaces:

```text
/api/trucking/job-orders/{id}/assign
/api/trucking/job-orders/{id}/cancel
/api/trucking/job-orders/{id}/accept
lib/services/assignmentSave.ts
src/application/trucking/services/JobOrderService.ts
```

Strategy: COEXIST TEMPORARILY. Do NOT delete or disable them merely because the canonical Unit 2 path exists. Implement the contract's coexistence/deprecation strategy. If migration/deprecation cannot safely be completed within Unit 2 scope: document the boundary. Do not perform opportunistic cleanup.

---

## 18. Database Requirements

Determine whether Unit 2 requires:

- new tables
- new columns
- new enums
- new functions
- new triggers
- new indexes
- RLS changes
- constraints

Classify each:

```text
REQUIRED
OPTIONAL
NOT REQUIRED
UNKNOWN
```

If DB changes are required, record them as future migration prerequisites. Do NOT create any.

---

## 19. Domain Boundary

Unit 2 owns:

```text
WO
WO Items
JO
JO operational assignment
JO operational lifecycle
```

Unit 2 explicitly excludes:

```text
FIN-INVOICE
accounting
vendor invoice
financial settlement
shipment creation unless separately ratified
handoff mutation unless separately ratified
Customs Domain Engine
Copilot governance
ZHILI
```

Do not expand scope because a mutation is technically adjacent.

---

## 20. Command Authority Matrix

| Command | Domain | Human Authority | Copilot Authority | Permission | Confirmation | Transaction | Audit | Idempotency | Scope |
| ------- | ------ | --------------- | ----------------- | ---------- | ------------ | ----------- | ----- | ----------- | ----- |
| WO_CREATE | WO | TBD | N/A | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| WO_UPDATE | WO | TBD | N/A | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| WO_TRANSITION | WO | TBD | N/A | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| WO_CANCEL | WO | TBD | N/A | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| WO_COMMITMENT_UPDATE | WO | TBD | N/A | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| ASSIGN_DRIVER | JO | TBD | ADR-091 | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| REPLACE_DRIVER | JO | TBD | ADR-091 | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| CANCEL_JOB | JO | TBD | ADR-091 | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| ACCEPT_JOB | JO | TBD | ADR-091 | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| START_JOB | JO | TBD | ADR-091 | TBD | TBD | TBD | TBD | TBD | UNDEFINED |
| STATUS_TRANSITION | JO | TBD | ADR-091 | TBD | TBD | TBD | TBD | TBD | UNDEFINED |

Every unknown is explicitly marked `UNDEFINED`. Never silently assume.

---

## 21. Implementation Sub-Phase Sequence

```text
U2-1 — Canonical mutation domain/application authority
U2-2 — Permission + tenant enforcement
U2-3 — WO mutation API boundary
U2-4 — JO human mutation API boundary
U2-5 — Transaction / audit / idempotency enforcement
U2-6 — Canonical UI mutation controls
U2-7 — Dedicated Unit 2 tests
U2-8 — Build + regression
U2-9 — Safe runtime verification, if fixtures exist
U2-10 — Forensic implementation closure
```

These are examples only. Design a sequence based on dependency. No implementation is authorized.

---

## 22. Test Strategy

### Unit tests

Domain/service command behavior.

### Integration tests

Identity + permission + tenant + persistence.

### Negative tests

- unauthorized
- wrong tenant
- invalid transition
- duplicate command
- stale state
- missing entity

### Runtime verification

- authenticated request
- permission enforcement
- tenant isolation
- mutation correctness
- audit evidence
- idempotency

### Regression

Existing full regression must remain protected. Do NOT modify `scripts/run-full-regression.ts` unless separately authorized. Do NOT create tests during this task.

---

## 23. Runtime Verification Gate

Current runtime limitations:

```text
Safe test identity: NOT AVAILABLE
Cross-tenant fixtures: NOT AVAILABLE
```

Therefore:

```text
Runtime authorization verification = NOT VERIFIED
Runtime tenant isolation = NOT VERIFIED
```

Define what fixtures and identities are required before implementation acceptance. Do NOT create them.

---

## 24. Deployment Gate

```text
DEPLOYMENT AUTHORIZATION = SEPARATE GATE
```

Implementation authorization does NOT authorize deployment. Do not run production deployment. Do not use `vercel --prod`. Do not promote a deployment to production. A separate deployment authorization is required after implementation acceptance.

---

## 25. Production Activation Gate

```text
PRODUCTION ACTIVATION AUTHORIZATION = SEPARATE GATE
```

Production activation is separate. Do NOT enable production capability, change feature flags, mutate production data, execute production business mutations, or run production functional tests without a separate explicit production authorization.

---

## 26. Protected Workstreams

Explicitly preserve:

```text
FIN-INVOICE
COPILOT
ADR-090
ADR-091
ADR-092
ZHILI
Phase 4
Phase 5
Exchange
Capital
financial/accounting
unrelated SBUs
migration remediation
```

No changes.

---

## 27. Explicit Non-Authorizations

The following are explicitly NOT authorized by this document:

```text
NOT AUTHORIZED:
- Implementation of Unit 2
- Modification of Unit 1
- Database schema changes
- Migration creation/execution
- RLS modification
- Test creation/modification
- API implementation
- UI implementation
- Service implementation
- Copilot implementation
- FIN-INVOICE work
- ADR-090/091/092 implementation changes
- ZHILI implementation or activation
- Production deployment
- Vercel deployment
- Supabase deployment
- Feature flag activation
- Production capability activation
- Worktree reset/clean/stash/checkout
- Commit/push
```

---

## 28. Implementation Preconditions

If Unit 2 is ratified, the following preconditions must be satisfied before implementation:

### Architecture

- formal Unit 2 ratification
- canonical mutation authority
- domain ownership
- command boundaries

### Authorization

- permissions
- tenant isolation
- identity context
- resource authorization

### Operational semantics

- allowed state transitions
- idempotency
- concurrency
- audit/event behavior
- failure semantics
- confirmation model

### Legacy

- canonical vs legacy boundaries
- migration strategy
- compatibility strategy

### Testing

- dedicated Unit 2 suite
- authorization tests
- tenant tests
- negative tests
- state-transition tests
- regression

### Deployment

- separate deployment authorization
- controlled rollout
- feature flags where applicable

---

## 29. Final Gate Decision

```text
FINAL GATE DECISION

Phase 3 uses a hybrid governance model:

- Units define acceptance/delivery boundaries.
- Phases define implementation sequencing.

Phase 3 Unit 1 is CLOSED — GREEN.

Phase 3 Unit 2 is formally ratified as:

CANONICAL WO/JO OPERATIONAL MUTATION.

The identifier "Phase 3 Unit 2" is canonical for this workstream.
"Phase 3.2" must not be used as its synonym.

The Customs Domain Engine remains a separate implementation-sequencing concern and is not automatically Unit 2.

Human-operated WO/JO mutation authority must be explicitly designed before implementation.

Copilot remains separately governed under ADR-090/091/092.

Canonical identity, authorization, tenant isolation, and business lineage remain mandatory architectural constraints.

This ratification does NOT authorize implementation, database changes, testing, deployment, or production activation.

NEXT GATE:
PHASE 3 UNIT 2 IMPLEMENTATION SCOPE & AUTHORIZATION
```

---

## 30. Implementation Authorization Checklist

```text
IMPLEMENTATION AUTHORIZATION CHECKLIST

[ ] WO mutation authority ratified
[ ] JO human mutation authority ratified
[ ] command matrix ratified
[ ] permission matrix ratified
[ ] confirmation rules ratified
[ ] transaction boundaries ratified
[ ] audit requirements ratified
[ ] idempotency requirements ratified
[ ] tenant enforcement ratified
[ ] API boundary ratified
[ ] UI mutation boundary ratified
[ ] legacy strategy ratified
[ ] DB requirements ratified
[ ] dedicated test strategy ratified
[ ] runtime verification prerequisites available
[ ] deployment strategy ratified
[ ] production activation gate defined
[ ] explicit implementation authorization granted
```

The final checkbox MUST remain:

```text
[ ] explicit implementation authorization granted
```

because this task itself does not provide implementation authorization.

---

## 31. Git Safety

After creating this document:

```text
git status --short
git diff --stat
git diff --name-only
```

Verify:

- only the intended design document was created
- the 13 pre-existing tracked modifications remain untouched
- no implementation files changed
- no migration files changed
- no test files changed
- no unrelated architecture documents changed

Do NOT:

```text
git add
git commit
git push
vercel deploy
supabase db push
```

unless separately authorized.

---

## 32. Required Final Report

Return exactly:

```text
=== PHASE 3 UNIT 2 — IMPLEMENTATION SCOPE & AUTHORIZATION DESIGN ===

STATUS:
GREEN — IMPLEMENTATION SCOPE DEFINED

ARCHITECTURAL AUTHORITY:
LEVEL 0 — HUMAN RATIFIED

UNIT 2:
CANONICAL WO/JO OPERATIONAL MUTATION

WO MUTATION AUTHORITY:
NOT YET ESTABLISHED — PRE-IMPLEMENTATION DESIGN GATE

JO HUMAN MUTATION AUTHORITY:
EXISTING SERVICES ACKNOWLEDGED
HUMAN-OPERATED AUTHORITY REQUIRES EXPLICIT DESIGN

COMMAND MATRIX:
UNDEFINED — REQUIRES DESIGN

PERMISSION MATRIX:
UNDEFINED — REQUIRES DESIGN

CONFIRMATION:
NOT YET DEFINED

TRANSACTION:
NOT YET DETERMINED

AUDIT:
NOT YET DEFINED

IDEMPOTENCY:
NOT YET DEFINED

TENANT ISOLATION:
SERVER-SIDE — CANONICAL PATH REQUIRED

API BOUNDARY:
NOT YET DEFINED

UI BOUNDARY:
NOT YET DEFINED

LEGACY STRATEGY:
COEXIST TEMPORARILY

DATABASE REQUIREMENTS:
NOT YET DETERMINED

TEST STRATEGY:
NOT YET DEFINED

RUNTIME VERIFICATION:
NOT YET EXECUTED

DEPLOYMENT:
NOT AUTHORIZED

PRODUCTION ACTIVATION:
NOT AUTHORIZED

IMPLEMENTATION:
NOT AUTHORIZED

PROTECTED WORKSTREAMS:
PRESERVED

DOCUMENT:
docs/architecture/SENTRALOGIS_PHASE3_UNIT2_IMPLEMENTATION_SCOPE_AND_AUTHORIZATION.md

NEXT GATE:
EXPLICIT HUMAN IMPLEMENTATION AUTHORIZATION

STOP:
YES
```

Do not implement anything. Do not authorize implementation. Do not deploy. Do not activate anything.
