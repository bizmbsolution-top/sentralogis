# SENTRALOGIS — AI COPILOT

# ADR-090 — PROPOSAL AUTHORITY RATIFICATION REPORT

**Date:** 2026-09-08  
**Status:** COMPLETE · GREEN · ADR-090 RATIFIED  
**Depends on:** ADR-018..056 (RATIFIED), ADR-063 (RATIFIED), ADR-078 (RATIFIED)  
**Nature:** Architectural Ratification & Document Authorization  
**Production Code Changes:** 0 (Ratification Only)  
**Production Migration Changes:** 0 (Ratification Only)  
**Implementation Status:** DEFERRED — Requires separate explicit authorization  

---

## 1. Executive Summary

**ADR-090** establishes the authoritative architecture for the AI Copilot PROPOSE → HUMAN CONFIRMATION → EXECUTE proposal lifecycle.

The ADR was ratified on 2026-09-08 by the Human Architecture Gate.

**Decision:** Persistent Server-Side Proposal Store (Option A) with weighted score 4.65/5.

---

## 2. Ratification Inventory

| Document File | Scope / Title | Status | Date |
|---|---|---|---|
| `docs/architecture/ADR-090-copilot-proposal-authority.md` | AI Copilot Proposal Authority | **RATIFIED** | 2026-09-08 |

*Integrity Audit:* Verified no numbering collisions across `ADR-018` through `ADR-090`.

---

## 3. Architectural Summary of Ratified Decision

### 3.1 Proposal Authority Model

**Decision:** Persistent Server-Side Proposal Store

The authoritative proposal is stored in a new `copilot_proposals` table with:
- Server-generated `proposalId` / `proposal_number`
- Tenant binding via server-derived `tenantId`
- Immutable proposal payload after creation
- Explicit lifecycle states: `PROPOSED` → `AWAITING_CONFIRMATION` → `CONFIRMED` → `EXECUTABLE` → `EXECUTED` / `EXPIRED` / `CANCELLED` / `REJECTED`
- `idempotency_key` for future replay protection
- RLS policies for tenant isolation

### 3.2 Security Invariants Established

| Invariant | Description |
|---|---|
| S1 | Client input is never execution authority |
| S2 | Tenant identity is always server-derived |
| S3 | Proposal intent is authoritative |
| S4 | Required permissions are authoritative |
| S5 | Risk classification is authoritative |
| S6 | Execution entities are authoritative |
| S7 | Confirmation requirement is authoritative |
| S8 | Proposal identity has actual authoritative meaning |
| S9 | Cross-tenant proposal execution is impossible |
| S10 | Tampering with execution-critical fields cannot change execution semantics |
| S11 | Authorization is re-established at EXECUTE |
| S12 | Human confirmation is bound to authoritative proposal |
| S13 | Compatible with future idempotency controls |
| S14 | Compatible with future transaction-safe execution |
| S15 | No autonomous execution path created |

### 3.3 EXECUTE Input Contract

EXECUTE accepts:
```typescript
{
  proposalId: string;
  confirmation: {
    confirmed: boolean;
    confirmationNote?: string;
  };
}
```

All execution-critical fields (`intent`, `requiredPermissions`, `riskLevel`, `entities`, `humanConfirmationRequired`, `tenantId`) are resolved server-side from the authoritative proposal record.

### 3.4 Authority Boundaries

| Field | Authority | Source |
|---|---|---|
| `proposalId` | Server-generated | `proposal_number` sequence / UUID |
| `tenantId` | Server-derived | `resolveSessionIdentity()` |
| `intent` | Server-authoritative | `IntentRegistry` |
| `entities` | Server-bound | Entity resolution at PROPOSE time |
| `requiredPermissions` | Server-authoritative | `ActionBridge.getRequiredPermissions(intent)` |
| `riskLevel` | Server-authoritative | `ActionBridge.getRiskLevel(intent)` |
| `humanConfirmationRequired` | Server-authoritative | Proposal-time policy |
| `confirmation_state` | Server-authoritative | EXECUTE boundary |
| `lifecycle_state` | Server-authoritative | State machine |

---

## 4. Options Considered

| Option | Classification | Reason |
|---|---|---|
| **A — Persistent Server-Side Proposal Store** | **RECOMMENDED** | Strongest authority, natural tenant binding, supports future idempotency/transactions, aligns with platform patterns |
| **B — Deterministic Reconstruction** | REJECTED | Cannot deterministically reconstruct Copilot-specific proposal state from canonical data |
| **C — Cryptographically Signed Proposal** | REJECTED | No approved key-management infrastructure; does not solve lifecycle/tenant-binding; high operational complexity |
| **D — Existing Canonical Mechanism** | REJECTED | No existing mechanism satisfies proposal authority requirements without violating its own governing ADR |

---

## 5. Decision Matrix

| Criterion | Weight | A Persistent Store | B Deterministic Reconstruction | C Signed Proposal | D Existing Canonical Mechanism |
|---|---|---|---|---|---|
| Server authority | 20% | 5 | 1 | 3 | N/A |
| Tenant isolation | 15% | 5 | 2 | 3 | N/A |
| Proposal integrity | 15% | 5 | 1 | 3 | N/A |
| Lifecycle management | 10% | 5 | 1 | 2 | N/A |
| Replay resistance readiness | 10% | 5 | 1 | 3 | N/A |
| TOCTOU handling | 10% | 5 | 2 | 3 | N/A |
| Auditability | 5% | 5 | 1 | 3 | N/A |
| Operational simplicity | 5% | 3 | 3 | 1 | N/A |
| Architecture fit | 5% | 5 | 2 | 2 | N/A |
| Future extensibility | 5% | 5 | 1 | 3 | N/A |
| **Weighted Score** | **100%** | **4.65** | **1.35** | **2.55** | **N/A** |

---

## 6. Forensic Baseline

### 6.1 Pre-Ratification Forensic Findings

| Finding | Severity | Status |
|---|---|---|
| EXECUTE accepts entire client-supplied proposal object | CRITICAL | ADDRESSED by ADR-090 |
| `proposal.intent` is client-controlled | CRITICAL | ADDRESSED by ADR-090 |
| `proposal.requiredPermissions` is client-controlled | CRITICAL | ADDRESSED by ADR-090 |
| `proposal.riskLevel` is never inspected at execution | HIGH | ADDRESSED by ADR-090 |
| `proposal.entities` is client-controlled | CRITICAL | ADDRESSED by ADR-090 |
| `proposal.humanConfirmationRequired` is structurally checked but client-supplied | MEDIUM | ADDRESSED by ADR-090 |
| `proposalId` is random correlation ID | HIGH | ADDRESSED by ADR-090 |
| No server-side proposal lookup exists | CRITICAL | ADDRESSED by ADR-090 |

### 6.2 Tampering Matrix

| Tampering Scenario | Server Rejects? | ADR-090 Resolution |
|---|---|---|
| `requiredPermissions` → `[]` | YES | Server derives permissions from authoritative proposal record via `ActionBridge.getRequiredPermissions(intent)` |
| Intent A → Intent B | YES | Intent is authoritative from `IntentRegistry`; cannot be changed by client |
| Entity A → Entity B | YES | Entities are server-bound at PROPOSE time; verified at EXECUTE time |
| Risk HIGH → LOW | YES | Risk is server-authoritative from `ActionBridge.getRiskLevel(intent)` |
| Confirmation required → false | YES | Confirmation requirement is server-authoritative from proposal record |
| Proposal ID changed/unknown | YES | EXECUTE requires server-side lookup of `proposalId`; unknown IDs rejected |
| Cross-tenant proposal | YES | Proposal is tenant-bound; EXECUTE verifies `tenant_id = identity.tenantId` |

---

## 7. Implementation Boundary

### 7.1 Authorized by This Ratification

- Architecture decision is ratified and becomes governing architecture for AI Copilot proposal authority
- Future implementation must conform to this ADR
- Schema design is approved in principle (conceptual schema provided in ADR)

### 7.2 NOT Authorized by This Ratification

- ❌ Database migration creation
- ❌ `copilot_proposals` table creation
- ❌ RLS policy implementation
- ❌ Sequence/function creation
- ❌ Proposal service implementation
- ❌ EXECUTE route modification
- ❌ PROPOSE route modification
- ❌ Domain mutation wiring
- ❌ Idempotency implementation
- ❌ Transaction implementation
- ❌ WhatsApp integration
- ❌ Production code changes of any kind

### 7.3 Required Future Authorizations

1. **Schema Authorization:** `copilot_proposals` table, sequence, function, RLS policies
2. **Implementation Authorization:** Proposal authority service, PROPOSE-side changes, EXECUTE-side changes
3. **E7 Authorization:** Idempotency and replay protection
4. **E9 Authorization:** Transaction-safe execution semantics
5. **Domain Mutation Authorization:** Canonical domain service wiring for specific intents

---

## 8. Verification

### 8.1 ADR Consistency Check

- Consistent with AI Copilot Architecture ADR (`SENTRALOGIS_AI_COPILOT_ARCHITECTURE_DECISION.md`)
- Consistent with Stage 1 READ implementation
- Consistent with Stage 2 PROPOSE implementation
- Consistent with Stage 3 EXECUTE forensic findings
- No conflict with existing ratified ADRs (ADR-018..056, ADR-063, ADR-078)

### 8.2 Security Completeness Check

- S1–S15 security invariants are addressed in ADR-090
- All 12 tampering scenarios are explicitly rejected
- Tenant binding, confirmation binding, policy authority, and proposal identity are all defined

### 8.3 Repository Architecture Check

- No existing canonical proposal/approval authority was overlooked
- `svc_service_requests` (ADR-033): operational dispatch command, not proposal authority
- `workflow_instances`: WMS workflow execution tracking, not proposal authority
- `audit_logs` / `wo_audit_logs`: append-only audit trails, not proposal authority
- `price_overrides` (ADR-063): pricing-specific approval model, not generalizable

### 8.4 Modification Check

- 0 production code changes
- 0 schema changes
- 0 migrations created
- 0 tests modified
- Only ADR document created/updated

---

## 9. Consequences

### Positive
- Establishes trustworthy proposal authority for AI Copilot
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

## 10. Next Steps

1. Schema authorization for `copilot_proposals` table
2. Implementation authorization for proposal authority service
3. Implementation of PROPOSE-side changes
4. Implementation of EXECUTE-side changes
5. E7 idempotency implementation authorization
6. E9 transaction semantics implementation authorization
7. Domain mutation authorization for specific intents

---

## 11. Status

**RATIFIED — 2026-09-08**

This ADR has been ratified by the Human Architecture Gate.

Implementation requires separate explicit authorization for schema, service, and domain mutation phases.

--- 

**END OF ADR-090 RATIFICATION REPORT**
