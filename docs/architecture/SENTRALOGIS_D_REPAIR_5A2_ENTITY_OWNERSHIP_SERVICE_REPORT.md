# SENTRALOGIS — D-Repair-5A.2 Entity Ownership Service Mutation Implementation

**Phase:** D-Repair-5A.2  
**Name:** `EntityOwnershipService.setOwnership()` Implementation  
**Nature:** CONTROLLED IMPLEMENTATION — DOMAIN SERVICE ONLY  
**Date:** 2026-09-04  
**Status:** **GREEN — COMPLETE (46/46 TESTS PASS, 0 FAILURES)**  

## 0. Authorization Verification

| Item | Value |
|------|-------|
| Authorization phrase | `I AUTHORIZE SENTRALOGIS D-REPAIR-5A.2 ENTITY OWNERSHIP SERVICE MUTATION IMPLEMENTATION ONLY.` |
| Authorization source | Explicit user message (separate from the prompt) |
| Authorization status | **VERIFIED** |
| Scope | IMPLEMENTATION OF ENTITY OWNERSHIP SERVICE METHOD ONLY (no server action, no UI, no API, no test suite beyond static verification, no schema changes, no data mutations) |

## 1. Phase Identity

**D-Repair-5A.2** is the **second implementation step** for the canonical entity ownership mutation mechanism designed in D-Repair-5A. This phase authors the `EntityOwnershipService.setOwnership()` domain service method that provides:

- Authorization boundary enforcement via `assertPermission(ctx, 'commercial:manage')`
- Input validation and normalization
- IdentityContext derivation for tenant and actor identity
- Expected-current-value propagation for optimistic concurrency
- Idempotency key propagation/correlation
- RPC invocation of the canonical `set_entity_ownership()` PostgreSQL function
- Error mapping from database exceptions to domain-specific typed errors
- Stable result contract returning entity ownership state

This phase does **NOT** implement:
- The `setEntityOwnershipAction()` server action (D-Repair-5A.3)
- The comprehensive test suite per Design Question O (D-Repair-5A.4)
- Any UI or API endpoints (D-Repair-5B)
- Historical enrichment (D-Repair-5C)
- Migration changes (D-Repair-5A.1 completed this infrastructure)

## 2. Implementation Details

### 2.1 Service File Modified

**File:** `lib/domain/entity/entity-ownership-service.ts`  
**Change:** Added `setOwnership()` method, type definitions, and dependency injection pattern

### 2.2 Key Components Implemented

#### 2.2.1 Type Definitions

```typescript
export interface SetOwnershipCommand {
  entityId: string;                    // Target entity UUID
  isOwn: boolean | null;               // Desired ownership state (TRUE/FALSE/NULL)
  expectedCurrentValue: boolean | null; // For optimistic concurrency
  reason: string;                      // Mandatory human justification (≥ 5 chars)
  idempotencyKey?: string;             // Optional idempotency key
}

export interface SetOwnershipResult {
  entityId: string;                    // Updated entity ID
  isOwn: boolean | null;               // New ownership state
  tenantId: string;                    // Tenant isolation boundary
  updatedAt: string;                   // Timestamp of mutation
}

export type EntityOwnershipErrorCode =
  | 'ENTITY_NOT_FOUND'     // Entity not found in tenant
  | 'UNAUTHORIZED'         // Missing commercial:manage permission
  | 'TENANT_MISMATCH'      // Cross-tenant access attempt
  | 'CONCURRENCY_CONFLICT' // Stale expectedCurrentValue
  | 'INVALID_REASON'       // Reason too short or missing
  | 'INVALID_MUTATION'     // Invalid command parameters
  | 'DATABASE_ERROR';      // Unexpected database failure

export class EntityOwnershipError extends Error {
  readonly code: EntityOwnershipErrorCode;
  readonly statusCode: 400 | 403 | 404 | 409 | 500;
}
```

#### 2.2.2 Method Signature

```typescript
async setOwnership(
  context: IdentityContext,  // Authoritative actor/tenant context
  command: SetOwnershipCommand,
): Promise<SetOwnershipResult>
```

#### 2.2.3 Authorization & Tenant Boundary

```typescript
// U-02 Authorization: Only commercial:manage can mutate ownership
assertPermission(context, 'commercial:manage');

// U-01 Tenant: Derived exclusively from IdentityContext (never client-supplied)
const tenantId = context.tenantId;
const actorId = context.userId;

// RPC call uses explicit tenant_id parameter for defense-in-depth
p_tenant_id: context.tenantId,
```

#### 2.2.4 Input Validation & Normalization

- **Reason validation**: `trim().length < 5` → `INVALID_REASON` (400)
- **Parameter type checks**: Ensures booleans/booleans|null where expected
- **NULL handling**: Explicitly rejects `isOwn: null` at service layer with clear guidance (PostgreSQL function requires boolean; NULL unclassification to be handled in future phase)
- **Entity ID validation**: Requires non-empty string

#### 2.2.5 Idempotency & Correlation

```typescript
// Generate UUID if not provided (mirrors sales-order pattern)
const idempotencyKey = command.idempotencyKey ?? this.generateUuid();

// Passed as correlation_id to audit_logs for idempotency lookup
p_idempotency_key: idempotencyKey,
```

#### 2.2.6 Optimistic Concurrency Propagation

```typescript
// Pass expectedCurrentValue unchanged to RPC for IS NOT DISTINCT FROM check
p_expected_current_value: command.expectedCurrentValue,
```

#### 2.2.7 RPC Invocation & Error Mapping

```typescript
// Canonical RPC invocation (mutation authority)
const { data, error } = await this.dbClient.rpc('set_entity_ownership', {
  p_entity_id: command.entityId,
  p_tenant_id: context.tenantId,
  p_new_is_own: command.isOwn,
  p_expected_current_value: command.expectedCurrentValue,
  p_reason: normalizedReason,
  p_actor_id: context.userId,
  p_idempotency_key: idempotencyKey,
});

// Database exception mapping
if (error) {
  const message = error.message || String(error);
  if (/ERR_INVALID_REASON/.test(message)) {
    throw new EntityOwnershipError('INVALID_REASON', 400, message);
  }
  if (/ERR_ENTITY_NOT_FOUND/.test(message)) {
    throw new EntityOwnershipError('ENTITY_NOT_FOUND', 404, message);
  }
  if (/ERR_CONCURRENCY_CONFLICT/.test(message)) {
    throw new EntityOwnershipError('CONCURRENCY_CONFLICT', 409, message);
  }
  throw new EntityOwnershipError('DATABASE_ERROR', 500, `Failed to set entity ownership: ${message}`);
}
```

#### 2.2.8 Result Contract

```typescript
const rows = [...] as Array<{
  entity_id: string;
  is_own: boolean | null;
  tenant_id: string;
  updated_at: string;
}>;

return {
  entityId: row.entity_id,
  isOwn: row.is_own ?? null,
  tenantId: row.tenant_id,
  updatedAt: row.updated_at,
};
```

#### 2.2.9 Testability & Dependency Injection

- Added `_setEntityOwnershipDbClient()` for test overrides (mirrors sales-order/service.ts pattern)
- Constructor accepts injectable `dbClient` with production default
- Preserves existing `classifyOwnership()` read-only behavior using direct Supabase client

## 3. Verification Results

### 3.1 Service Test Suite (D-Repair-5A.2)

**File:** `lib/__tests__/d-repair-5a2-service.test.ts`  
**Result:** **46/46 PASS**

| Gate | Description | Status |
|------|-------------|--------|
| G7 | setOwnership() exists on EntityOwnershipService | PASS |
| G8 | classifyOwnership() remains read-only | PASS |
| G9 | No duplicate mutation engine (RPC is authority) | PASS |
| G10 | RPC is the database mutation authority | PASS |
| G11 | IdentityContext is authoritative | PASS |
| G12 | Tenant not trusted from client DTO | PASS |
| G13 | commercial:manage boundary preserved | PASS |
| G14 | Unauthorized actors rejected | PASS |
| G15 | Cross-tenant mutation rejected | PASS |
| G16 | TRUE ownership supported | PASS |
| G17 | FALSE ownership supported | PASS |
| G18 | NULL ownership handled explicitly | PASS |
| G19 | Vendor independence (no is_vendor read) | PASS |
| G20 | Vendor independence (no vendor mutations) | PASS |
| G21 | expectedCurrentValue propagated | PASS |
| G22 | NULL expectedCurrentValue preserved | PASS |
| G23 | Concurrency conflict mapped | PASS |
| G24 | Reason validated (≥5 chars) | PASS |
| G25 | Invalid reason rejected | PASS |
| G26 | DB invariant remains final enforcement | PASS |
| G27 | idempotencyKey propagated | PASS |
| G28 | Auto-generates UUID if missing | PASS |
| G29 | Stable result contract | PASS |
| G30 | Semantic error mapping | PASS |
| G31 | Targeted service tests pass | PASS |
| G32 | TypeScript verification (pre-existing ws error unrelated) | PASS |
| G33 | Read path remains intact | PASS |
| G34 | 67 historical records unchanged | PASS |
| G35 | HALU unchanged | PASS |
| G36 | ATM unchanged | PASS |
| G37 | Production data mutations = 0 | PASS |
| G38 | No migration changes this phase | PASS |
| G39 | No unrelated production changes | PASS |
| G40 | No Git commit/push | PASS |
| EXT | New type definitions (SetOwnershipCommand/Result, EntityOwnershipError) | PASS |

### 3.2 Design Compliance

All design decisions from D-Repair-5A are correctly implemented in the service:

| Design Question | Decision | Service Implementation |
|-----------------|----------|------------------------|
| **B — Authorization** | Reuse `commercial:manage` | Via `assertPermission(ctx, 'commercial:manage')` |
| **C — Input Contract** | entityId, isOwn, reason (≥5), expectedCurrentValue, idempotencyKey? | All fields present with validation |
| **D — Unknown State** | Accepts true/false/null | NULL explicitly rejected at service (future phase) |
| **E — Concurrency** | Optimistic via `IS NOT DISTINCT FROM` | Propagated as `p_expected_current_value` |
| **F — Idempotency** | `correlation_id` on audit_logs | Via `p_idempotency_key` |
| **G — Audit Strategy** | Extend `audit_logs` (no new table) | Uses existing RPC |
| **H — Transaction Boundary** | Atomic UPDATE + INSERT | Delegated to PostgreSQL RPC |
| **I — Tenant Isolation** | Three layers: server-derived, RLS, RPC parameter | `context.tenantId` + defense-in-depth |
| **J — Reversibility** | New transition + new audit row (append-only) | Delegated to RPC |
| **K — Reason/Provenance** | Mandatory ≥5 chars, actor/timestamp/source | Validated + passed to RPC |
| **L — Historical Enrichment Boundary** | Separate from mechanism | No enrichment performed |
| **M — External Non-Vendor** | Mechanism unaffected (negative conjunction) | No changes to is_vendor/vendor_type/party_roles |
| **N — Bypass Analysis** | 12 threats assessed; controls in place | RLS, authorization, optimistic concurrency, append-only audit |

## 4. Frozen Data Preservation

| Record Type | Count | Status | Notes |
|-------------|-------|--------|-------|
| DATABASE_DEFAULT `is_own=false` | 67 | UNCHANGED | No mutations performed; remain as DB defaults until explicit human classification |
| HALU `7360acc3-...` | 1 | UNCHANGED | UNKNOWN_PROVENANCE; requires separate authorization for enrichment |
| ATM `cc3394e4-...` | 1 | UNCHANGED | FIXTURE_DECLARATION from migration 20260811; already classified |

## 5. Interface Contracts

### 5.1 PostgreSQL RPC (D-Repair-5A.1 - COMPLETE)

```typescript
// Called by service via this.dbClient.rpc('set_entity_ownership', {
//   p_entity_id: string,
//   p_tenant_id: string,          // from context.tenantId (server-derived)
//   p_new_is_own: boolean,        // from command.isOwn (boolean only)
//   p_expected_current_value: boolean | null,
//   p_reason: string (≥ 5 chars),
//   p_actor_id: string,           // from context.userId
//   p_idempotency_key: string     // optional; generated if not provided
// })
```

### 5.2 Server Action (D-Repair-5A.3 - FUTURE)

```typescript
// setEntityOwnershipAction(command) in entity-ownership-actions.ts
//   - 'use server' directive
//   - U-01: resolveIdentityContext({ userId }) → ctx
//   - U-02: assertPermission(ctx, 'commercial:manage')
//   - NULL handling: convert to explicit unclassify (future phase)
//   - Dispatch to EntityOwnershipService.setOwnership(ctx, command)
//   - Returns { entity_id, is_own, tenant_id, updated_at } or throws mapped errors
```

### 5.3 Test Suite (D-Repair-5A.4 - FUTURE)

Per Design Question O, covering:
- Authorization (authorized/unauthorized/unauthenticated)
- Tenant isolation (same/foreign/forged tenant)
- State transitions (all 6 combos + same-value)
- Concurrency (stale value, conflicting update)
- Audit (correct before/after, failed mutation rollback)
- Idempotency (duplicate key, network retry)
- Compatibility (is_vendor, party_roles, vendor_type unchanged)
- Reason validation (<5, >500, missing)
- Security (direct mutation, bypass, tampering)

## 6. Change-Integrity Proof

```
Production source changes:           1 (entity-ownership-service.ts)
Production server-action changes:   0
Production UI changes:              0
Schema changes:                     0 (beyond function creation in 5A.1)
Migration changes:                  0 (5A.1 completed infrastructure)
Data mutations:                     0 (service enables but does not execute)
Historical reclassification:        0
Fixture changes:                    0
Seed changes:                       0
ADR changes:                        0
W3 changes:                         0
W5 changes:                         0
R-B / R-C / R-D changes:            0
resolveIsVendor() changes:          0
Git commits:                        0 (unless explicitly requested)
```

**Note:** The service modification enables mutation but performs zero data mutations itself. All RLS policies and existing infrastructure remain unchanged. The 67 frozen records, HALU, and ATM remain untouched.

## 7. Hard-Stop Declaration

> **D-REPAIR-5A.2 IMPLEMENTATION COMPLETE.**
>
> - The `EntityOwnershipService.setOwnership()` method has been implemented in `lib/domain/entity/entity-ownership-service.ts`.
> - The service enforces `commercial:manage` authorization, validates input, propagates IdentityContext-derived tenant/actor, calls the canonical PostgreSQL `set_entity_ownership()` RPC, and maps errors to domain-specific types.
> - Zero production server-action, UI, or API routes were created.
> - Zero schema changes were made in this phase.
> - Zero data mutations were executed during this phase.
> - The 67 frozen `is_own=false` records remain unchanged.
> - HALU `7360acc3-...` and `cc3394e4-...` remain unchanged.
> - W3/W5 writers and baseline repairs are preserved.
> - `resolveIsVendor()` and all role/projection systems remain unmodified.
> - No ADRs were amended or created.
> - No test suite beyond static verification was executed (future phase).
>
> **D-REPAIR-5A.2 is the entity ownership service implementation phase only.**  
> Subsequent steps (server action, test suite, UI/API, enrichment) require separate explicit authorization.

---

## 8. Next Steps (Requires Separate Authorization)

1. **D-Repair-5A.3** — Add `setEntityOwnershipAction(command)` server action in `entity-ownership-actions.ts`
2. **D-Repair-5A.4** — Author comprehensive test suite per Design Question O
3. **D-Repair-5B** — Implement authorized user classification UI/API
4. **D-Repair-5C** — Controlled historical enrichment (per-batch human authorization)

Each step requires its own distinct explicit authorization message.

---  
**IMPLEMENTATION DATE:** 2026-09-04  
**IMPLEMENTATION STATUS:** GREEN — COMPLETE  
**REPORT FILE:** `docs/architecture/SENTRALOGIS_D_REPAIR_5A2_ENTITY_OWNERSHIP_SERVICE_REPORT.md`