# ADR-090 — AI Copilot Proposal Authority

**Status:** RATIFIED — 2026-09-08  
**Date:** 2026-09-07  
**Ratified by:** Human Architecture Gate, 2026-09-08  
**Depends on:** ADR-033, ADR-051, ADR-056, ADR-063, ADR-078  
**Supersedes:** None  

--- 

## 1. Context

AI Copilot Stage 3 EXECUTE currently accepts an entire client-supplied proposal object:

```typescript
// app/api/copilot/execute/route.ts
const { proposal, confirmation } = body;
```

The client controls:
- `proposal.intent`
- `proposal.requiredPermissions`
- `proposal.riskLevel`
- `proposal.entities`
- `proposal.humanConfirmationRequired`
- `proposal.proposalId`

EXECUTE trusts these fields verbatim. There is no server-side proposal authority between PROPOSE and EXECUTE.

This ADR establishes the authoritative architecture for the proposal lifecycle.

--- 

## 2. Problem Statement

The PROPOSE → EXECUTE boundary has no authoritative proposal state.

Consequences:
- Intent substitution: `ASSIGN_DRIVER` → `CANCEL_JOB`
- Permission downgrade: `requiredPermissions` → `[]`
- Risk downgrade: `HIGH` → `LOW`
- Entity substitution: `jobOrder A` → `jobOrder B`
- Confirmation bypass: `humanConfirmationRequired` → `false`
- Cross-tenant replay: tenant A proposal executed under tenant B
- Proposal tampering: any execution-critical field modified client-side

Current `proposalId` is a random correlation identifier with no authoritative meaning.

--- 

## 3. Known Forensic Findings

| Finding | Source |
|---------|--------|
| EXECUTE accepts entire client proposal object | `app/api/copilot/execute/route.ts:14-15` |
| `proposal.intent` is client-controlled | `lib/copilot/execute/execution-service.ts:177` |
| `proposal.requiredPermissions` is client-controlled | `lib/copilot/execute/execution-service.ts:72` |
| `proposal.riskLevel` is never inspected at execution | `lib/copilot/execute/execution-service.ts` |
| `proposal.entities` is client-controlled | `lib/copilot/execute/execution-service.ts:98` |
| `proposal.humanConfirmationRequired` is structurally checked but client-supplied | `app/api/copilot/execute/route.ts:21-23` |
| `proposalId` is random correlation ID | `lib/copilot/propose/proposal-service.ts:89` |
| No server-side proposal lookup exists | `lib/copilot/execute/execution-service.ts:44-98` |

--- 

## 4. Decision Drivers

1. Client input must never be execution authority.
2. Tenant identity must always be server-derived.
3. Proposal intent, permissions, risk, and entities must be authoritative.
4. Confirmation requirement must be server-authoritative.
5. Cross-tenant proposal execution must be impossible.
6. The architecture must be compatible with future idempotency and transaction safety.
7. No domain mutation may be introduced in this phase.

--- 

## 5. Security Requirements

### S1 — Client Input Is Never Execution Authority
The client is a presentation and confirmation-input channel only. All execution-critical fields originate from server authority.

### S2 — Tenant Identity Is Always Server-Derived
`tenantId` is resolved via `resolveSessionIdentity()`. Client-supplied tenant identity is never trusted.

### S3 — Proposal Intent Is Authoritative
Intent is established at PROPOSE time from the `IntentRegistry` and cannot be changed by the client before EXECUTE.

### S4 — Required Permissions Are Authoritative
Permissions are derived server-side via `ActionBridge.getRequiredPermissions(intent)` from the `IntentRegistry`.

### S5 — Risk Classification Is Authoritative
Risk is derived server-side via `ActionBridge.getRiskLevel(intent)` from the `IntentRegistry`.

### S6 — Execution Entities Are Authoritative
Entity references are resolved and bound at PROPOSE time. The client cannot substitute entities at EXECUTE time.

### S7 — Confirmation Requirement Is Authoritative
The server determines whether human confirmation is required. The client cannot weaken this requirement.

### S8 — Proposal Identity Has Authoritative Meaning
`proposalId` must resolve to a server-side authoritative proposal record. Random correlation IDs are insufficient.

### S9 — Cross-Tenant Proposal Execution Is Impossible
Proposal records are tenant-bound. EXECUTE rejects proposals not owned by the resolved session tenant.

### S10 — Tampering Resistance
Modification of execution-critical proposal fields by the client cannot change execution semantics.

### S11 — Authorization Is Re-Established at EXECUTE
EXECUTE does not trust proposal-time authorization alone. Current actor permissions are verified against authoritative policy.

### S12 — Human Confirmation Is Bound to Authoritative Proposal
Confirmation is bound to the server-resolved proposal, not a client-supplied proposal object.

### S13 — Future Idempotency Compatibility
The proposal authority provides a stable anchor for future idempotency keys and replay protection.

### S14 — Future Transaction Compatibility
The proposal authority can later support transaction-safe execution with audit, compensation, and rollback.

### S15 — No Autonomous Execution Path
The proposal authority does not create an unattended or autonomous execution path.

--- 

## 6. Options Considered

### Option A — Persistent Server-Side Proposal Store

**Concept:**
```
PROPOSE
  ↓
create authoritative proposal record
  ↓
proposalId
  ↓
client
  ↓
EXECUTE(proposalId, confirmation)
  ↓
server-side proposal lookup
  ↓
authoritative proposal
  ↓
authorization + confirmation + execution boundary
```

**Advantages:**
- Strongest authoritative boundary
- Explicit lifecycle states
- Durable across requests/processes
- Natural tenant binding via `tenant_id`
- Supports future replay/idempotency
- Auditable
- Easy EXECUTE lookup

**Disadvantages:**
- Requires new persistent storage (schema/migration)
- Requires lifecycle/retention design
- Requires RLS/security policy
- Stale proposal management required

**Verdict:** RECOMMENDED — strongest security properties, aligns with existing platform patterns (e.g., `sales_orders`, `fulfillments`, `operational_handoffs` all use persistent authoritative stores).

---

### Option B — Server-Side Deterministic Reconstruction

**Concept:**
```
proposal reference
  ↓
server-side authoritative inputs
  ↓
reconstruct proposal
```

**Analysis:**
The repository cannot deterministically reconstruct a Copilot proposal from existing canonical data because:
- `intent` is Copilot-specific and not stored in canonical domain tables
- `requiredPermissions` and `riskLevel` are derived from `IntentRegistry` but the specific proposal's policy evaluation is not persisted
- `entities` are resolved at proposal time and may not be reproducible without storing resolution state
- `humanConfirmationRequired` is a proposal-time policy decision, not a domain invariant
- `explainability` data is generated at proposal time and is not reproducible

**Verdict:** NOT VIABLE — cannot guarantee deterministic reconstruction of execution-critical proposal state.

---

### Option C — Cryptographically Signed Proposal

**Concept:**
```
PROPOSE
  ↓
server creates signed payload
  ↓
client
  ↓
EXECUTE
  ↓
server verifies signature
```

**Analysis:**
- Signing key management introduces operational complexity (rotation, storage, access control)
- Payload canonicalization must be rigorously defined
- Signature verification does not solve lifecycle management (expiry, state transitions, cancellation)
- Tenant binding and replay protection still require additional state
- No existing cryptographic signing infrastructure is in place for this purpose
- Failure modes (key compromise, rotation, clock skew) add risk without addressing the core lifecycle problem

**Verdict:** NOT SUITABLE — operational complexity high, does not solve lifecycle/tenant-binding requirements, no approved key-management infrastructure exists.

---

### Option D — Existing Canonical Mechanism

**Concept:** Reuse an existing approved SENTRALOGIS mechanism as proposal authority.

**Forensic Discovery:**
- `svc_service_requests` (ADR-033): Cross-domain operational dispatch command. Designed for `source_domain` → `target_domain` dispatch with `ISSUED/ACKNOWLEDGED/ACCEPTED/REJECTED` lifecycle. Lacks proposal-specific fields (`riskLevel`, `requiredPermissions`, `humanConfirmationRequired`, `explainability`). Lifecycle is dispatch-oriented, not proposal-oriented. Co-opting it would violate ADR-033 command semantics.
- `workflow_instances` / `workflow_steps`: WMS workflow execution tracking with `requires_approval` flag. Not a general-purpose proposal store; tightly coupled to warehouse workflow execution.
- `audit_logs` / `wo_audit_logs`: Append-only audit trails. Not designed for proposal lookup, lifecycle state management, or confirmation tracking.
- `price_overrides` (ADR-063): Pricing-specific approval model. Not generalizable to operational Copilot proposals.

**Verdict:** N/A — no existing canonical mechanism satisfies proposal authority requirements without violating its own governing ADR.

--- 

## 7. Decision Matrix

| Criterion                   | Weight | A Persistent Store | B Deterministic Reconstruction | C Signed Proposal | D Existing Canonical Mechanism |
| --------------------------- | -----: | -----------------: | -----------------------------: | ----------------: | ---------------------------: |
| Server authority            |    20% |        5 — strongest authority | 1 — no persistent state | 3 — authority exists but lifecycle missing | N/A — none suitable |
| Tenant isolation            |    15% |        5 — natural tenant binding | 2 — no tenant scoping | 3 — tenant bindable but not enforced | N/A — none suitable |
| Proposal integrity          |    15% |        5 — immutable payload | 1 — no integrity guarantee | 3 — tamper-evident but not lifecycle-safe | N/A — none suitable |
| Lifecycle management        |    10% |        5 — explicit states | 1 — no lifecycle | 2 — requires custom state layer | N/A — none suitable |
| Replay resistance readiness |    10% |        5 — idempotency key + state | 1 — no replay control | 3 — nonce possible but complex | N/A — none suitable |
| TOCTOU handling             |    10% |        5 — re-evaluate at EXECUTE | 2 — no TOCTOU protection | 3 — signature valid but policy stale | N/A — none suitable |
| Auditability                |     5% |        5 — queryable records | 1 — no audit trail | 3 — signed events only | N/A — none suitable |
| Operational simplicity      |     5% |        3 — requires migration | 3 — no infrastructure | 1 — key management overhead | N/A — none suitable |
| Architecture fit            |     5% |        5 — aligns with existing patterns | 2 — violates canonical authority | 2 — introduces cryptography | N/A — none suitable |
| Future extensibility        |     5% |        5 — supports future E7/E9 | 1 — blocks future idempotency | 3 — extensible but complex | N/A — none suitable |
| **Weighted Score**          | **100%** |  **4.65** | **1.35** | **2.55** | **N/A** |

--- 

## 8. Recommended Architecture

**Decision: Persistent Server-Side Proposal Store (Option A)**

### 8.1 Conceptual Schema

```sql
CREATE TABLE IF NOT EXISTS copilot_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  proposal_number TEXT NOT NULL,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  intent TEXT NOT NULL,
  entities JSONB NOT NULL,
  required_permissions TEXT[] NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  human_confirmation_required BOOLEAN NOT NULL DEFAULT TRUE,
  confirmation_state TEXT NOT NULL DEFAULT 'AWAITING',
  confirmation_actor_id UUID,
  confirmation_at TIMESTAMPTZ,
  confirmation_note TEXT,
  explainability JSONB,
  policy_check JSONB,
  proposal_payload JSONB NOT NULL,
  lifecycle_state TEXT NOT NULL DEFAULT 'PROPOSED',
  expiry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_copilot_proposal_number UNIQUE (tenant_id, proposal_number),
  CONSTRAINT uq_copilot_idempotency UNIQUE (tenant_id, idempotency_key)
);
```

### 8.2 Authority Boundaries

| Field | Authority | Source |
|-------|-----------|--------|
| `proposalId` | Server-generated | `proposal_number` sequence / UUID |
| `tenantId` | Server-derived | `resolveSessionIdentity()` |
| `intent` | Server-authoritative | `IntentRegistry` |
| `entities` | Server-bound | Entity resolution at PROPOSE time |
| `requiredPermissions` | Server-authoritative | `ActionBridge.getRequiredPermissions(intent)` |
| `riskLevel` | Server-authoritative | `ActionBridge.getRiskLevel(intent)` |
| `humanConfirmationRequired` | Server-authoritative | Proposal-time policy |
| `confirmation_state` | Server-authoritative | EXECUTE boundary |
| `lifecycle_state` | Server-authoritative | State machine: PROPOSED → AWAITING_CONFIRMATION → CONFIRMED → EXECUTABLE → EXECUTED / EXPIRED / CANCELLED |
| `idempotency_key` | Server-generated | Deterministic per proposal context |

### 8.3 PROPOSE Flow

```text
Actor Identity
  ↓
Tenant Context
  ↓
Authorization
  ↓
PROPOSE
  ↓
IntentRegistry → intent, requiredPermissions, riskLevel
  ↓
Entity Resolution → bound entities
  ↓
Policy Evaluation → confirmation requirement
  ↓
Create copilot_proposals record
  ↓
proposalId
  ↓
Client receives display data only
```

### 8.4 EXECUTE Flow

```text
Client: EXECUTE(proposalId, confirmation)
  ↓
resolveSessionIdentity()
  ↓
Server lookup: copilot_proposals WHERE proposalId AND tenantId
  ↓
Verify tenant ownership
  ↓
Resolve authoritative intent, permissions, risk from record
  ↓
Re-evaluate current actor permissions (assertPermission)
  ↓
Validate confirmation requirement (server-authoritative)
  ↓
Validate confirmation input
  ↓
Execution Boundary
```

### 8.5 Client Contract

EXECUTE accepts:
```typescript
{
  proposalId: string;
  confirmation: {
    confirmed: boolean;
    confirmedBy?: string; // ignored; server uses ctx.userId
    confirmedAt?: string; // ignored; server sets timestamp
    confirmationNote?: string;
  };
}
```

Any client-supplied `intent`, `requiredPermissions`, `riskLevel`, `entities`, `humanConfirmationRequired`, or `tenantId` is ignored for authorization and execution purposes.

--- 

## 9. Rejected Alternatives

| Alternative | Reason Rejected |
|-------------|-----------------|
| **B — Deterministic Reconstruction** | Cannot guarantee deterministic reconstruction of Copilot-specific proposal state from canonical domain data. |
| **C — Cryptographically Signed Proposal** | No approved key-management infrastructure; does not solve lifecycle/tenant-binding; operational complexity too high. |
| **D — svc_service_requests reuse** | Operational dispatch command (ADR-033); lacks proposal fields; wrong lifecycle semantics; violates single responsibility. |
| **D — audit_logs reuse** | Append-only audit trail; no lifecycle states; no confirmation tracking; not queryable as proposal authority. |

--- 

## 10. Proposal Lifecycle

```
PROPOSED
  ↓
AWAITING_CONFIRMATION
  ↓
CONFIRMED
  ↓
EXECUTABLE
  ↓
EXECUTED
```

Alternative terminal states:
- `EXPIRED` — proposal exceeded `expiry_at`
- `CANCELLED` — actor or system cancelled before execution
- `REJECTED` — authorization failed at EXECUTE

**CONFIRMED vs EXECUTABLE:** Distinct states. `CONFIRMED` means human approval was recorded. `EXECUTABLE` means the proposal passed final authorization checks at EXECUTE time. This separation allows audit of confirmation vs. execution authorization.

**Immutability:** Proposal payload is immutable after creation. Amendments require a new proposal.

--- 

## 11. Immutability Requirement

The authoritative proposal is **immutable after creation**.

Rationale:
- Execution-critical fields must not change after human confirmation
- Amendment creates a new proposal rather than mutating an existing one
- Aligns with platform immutability patterns (`sales_orders` snapshot, `fulfillment` revisions)

--- 

## 12. Policy Versioning

EXECUTE must:
1. Trust proposal-time policy for fields that are immutable (`intent`, `requiredPermissions`, `riskLevel` at creation time)
2. Re-evaluate current actor authorization at EXECUTE time (S11)
3. Re-evaluate current policy for confirmation requirement at EXECUTE time

This means:
- A proposal created when the actor had permission remains valid even if permissions change (proposal authority is preserved)
- But EXECUTE still re-checks current permissions (defense in depth)
- If policy changes make the intent no longer valid, EXECUTE may reject despite proposal being CONFIRMED

--- 

## 13. Entity Version / State

Proposal entities are bound at PROPOSE time by entity ID and resolution context.

At EXECUTE time:
- The server re-reads current entity state from canonical domain services
- Entity existence and tenant ownership are verified
- Entity state changes between PROPOSE and EXECUTE do not invalidate the proposal unless the domain service rejects the operation

This preserves:
- What the user confirmed (entity references in proposal)
- What exists at execution time (current entity state from canonical authority)

--- 

## 14. Tenant Authority

`tenantId` is server-derived from `resolveSessionIdentity()` at both PROPOSE and EXECUTE.

The proposal record is tenant-bound:
```sql
tenant_id = server-derived identity tenantId
```

Cross-tenant execution fails because the server lookup includes `tenant_id = identity.tenantId`.

--- 

## 15. Actor Authority

Current architecture finding: actor binding is NOT REQUIRED BY CURRENT AUTHORITY MODEL.

The proposal record preserves `created_by` (actor who generated the proposal) and `confirmation_actor_id` (actor who confirmed) for governance and audit. No binding between proposal creator and executor is enforced.

--- 

## 16. Confirmation Model

```text
Server: What must be confirmed? (proposal authority)
Client: I confirm. (confirmation input)
Server: Who confirmed? When? Which authoritative proposal? (server-authoritative)
```

The client determines only the fact of confirmation (`confirmed: true`). The server determines:
- Whether confirmation is required (`human_confirmation_required` from proposal record)
- Which proposal is being confirmed (`proposalId` lookup)
- Who confirmed (`ctx.userId`)
- When (`server timestamp`)

--- 

## 17. Future Idempotency Compatibility

The proposal authority provides a stable anchor for future E7 (idempotency) implementation:
- `idempotency_key` on proposal record supports duplicate-submission detection
- `lifecycle_state` supports single-consumption semantics (EXECUTABLE → EXECUTED)
- `proposalId` is the stable reference for retry-safe EXECUTE calls

--- 

## 18. Future Transaction Compatibility

The proposal authority supports future E9 (transaction) implementation:
- Proposal creation and execution state transitions can participate in domain transactions
- Audit trail can be tied to proposal lifecycle
- Compensation/rollback can reference proposal state

--- 

## 19. Future Domain Mutation Compatibility

The proposal authority does not wire any real domain mutation. It provides a safe anchor for future domain service invocation:
```
authoritative proposal
  ↓
authorized domain service (future E7/E9)
  ↓
canonical persistence
```

--- 

## 20. Future WhatsApp Compatibility

The proposal authority does not introduce a separate WhatsApp path. Future WhatsApp confirmation can route through the same EXECUTE boundary:
```
WhatsApp confirmation
  ↓
canonical identity resolution
  ↓
authoritative proposal
  ↓
same EXECUTE boundary
```

--- 

## 21. Migration Requirement

**SCHEMA REQUIRED — NOT AUTHORIZED IN THIS PHASE**

Implementation requires:
- New `copilot_proposals` table
- `seq_copilot_proposal_number` sequence
- `next_copilot_proposal_number()` PostgreSQL function
- RLS policies for tenant isolation
- Indexes for `tenant_id`, `proposal_number`, `idempotency_key`, `correlation_id`, `lifecycle_state`

No migration may be created without separate explicit authorization.

--- 

## 22. Implementation Requirement

**NO IMPLEMENTATION AUTHORIZED IN THIS PHASE**

Implementation requires:
1. Ratification of this ADR.
2. Separate explicit implementation authorization.
3. Schema/migration authorization.

--- 

## 23. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema migration required | Certain | High | Separate authorization required |
| Proposal expiry management | Medium | Medium | TTL + cleanup job (future) |
| Stale proposal execution | Medium | Medium | Re-evaluate authorization at EXECUTE |
| Proposal accumulation | Medium | Low | Retention policy (future) |
| TOCTOU policy changes | Low | Medium | Re-evaluate current policy at EXECUTE |

--- 

## 24. Consequences

### Positive
- Establishes trustworthy proposal authority
- Eliminates client-controlled execution fields
- Natural tenant binding via server-derived identity
- Supports future idempotency and transaction safety
- Aligns with existing platform persistence patterns
- Auditable proposal lifecycle

### Negative
- Requires new database schema and migration
- Requires RLS and security policy design
- Requires proposal lifecycle management
- Requires retention/cleanup strategy

### Neutral
- No domain mutation introduced
- No existing canonical mechanisms modified

--- 

## 25. Acceptance Criteria

### A1 — Server Proposal Authority
A real server-side authority exists.

### A2 — EXECUTE Resolves Authority
EXECUTE resolves proposal state from server authority via `proposalId` lookup.

### A3 — No Client Proposal Authority
Client cannot control execution-critical proposal fields.

### A4 — Intent Authority
Intent is server-authoritative from `IntentRegistry`.

### A5 — Permission Authority
Permissions are server-derived from `ActionBridge.getRequiredPermissions(intent)`.

### A6 — Risk Authority
Risk is server-authoritative from `ActionBridge.getRiskLevel(intent)`.

### A7 — Entity Authority
Entities are server-bound at PROPOSE time and verified at EXECUTE time.

### A8 — Confirmation Authority
Confirmation requirement is server-authoritative.

### A9 — Tenant Binding
Proposal is bound to server-derived tenant; cross-tenant execution fails.

### A10 — Tamper Resistance
T1–T8 tampering scenarios are rejected by server.

### A11 — No Mutation Expansion
Zero real domain mutations introduced by proposal authority implementation.

### A12 — Scope Compliance
No E7/E9/domain mutation/WhatsApp work performed.

--- 

## 26. Required Future Authorizations

1. **Schema Authorization:** `copilot_proposals` table, sequence, function, RLS policies.
2. **Implementation Authorization:** Proposal authority service, PROPOSE-side changes, EXECUTE-side changes.
3. **E7 Authorization:** Idempotency and replay protection.
4. **E9 Authorization:** Transaction-safe execution semantics.
5. **Domain Mutation Authorization:** Canonical domain service wiring for specific intents.

--- 

## 27. Status

**RATIFIED — 2026-09-08**

This ADR has been ratified by the Human Architecture Gate.

Ratification establishes the architecture boundary for future implementation. Implementation still requires separate explicit authorization for:
1. Schema/migration authorization (`copilot_proposals` table, sequence, function, RLS policies).
2. Implementation authorization (proposal authority service, PROPOSE-side changes, EXECUTE-side changes).
3. E7 authorization (idempotency and replay protection).
4. E9 authorization (transaction-safe execution semantics).
5. Domain mutation authorization for specific intents.

--- 

## 28. Ratification Record

**Ratification Date:** 2026-09-08  
**Ratified by:** Human Architecture Gate  
**ADR Number:** ADR-090  
**Title:** AI Copilot Proposal Authority  
**Decision:** Persistent Server-Side Proposal Store (Option A)  
**Weighted Score:** 4.65/5  

**Required Future Authorizations:**
1. Schema Authorization
2. Implementation Authorization
3. E7 Idempotency Authorization
4. E9 Transaction Authorization
5. Domain Mutation Authorization

--- 

**END OF ADR-090**
