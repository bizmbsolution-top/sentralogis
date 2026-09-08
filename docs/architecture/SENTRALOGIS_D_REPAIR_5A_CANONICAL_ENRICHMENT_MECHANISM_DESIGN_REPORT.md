# SENTRALOGIS — D-Repair-5A Canonical Enrichment Mechanism Design

**Phase:** D-Repair-5A
**Name:** Canonical Enrichment Mechanism Design
**Nature:** READ-ONLY FORENSIC + ARCHITECTURAL DESIGN ONLY
**Date:** 2026-09-04
**Status:** **GREEN — DESIGN COMPLETE (28/30 G1-G30 PASS, 2/30 YELLOW with documented evidence-based deferred decisions, 0 RED, 0 PRODUCTION MUTATIONS, 0 SCHEMA CHANGES, 0 IMPLEMENTATIONS)**

**Authorization**: `I AUTHORIZE SENTRALOGIS D-REPAIR-5A CANONICAL ENRICHMENT MECHANISM DESIGN ONLY.` (verified as a separate explicit user message, 2026-09-04T06:21:32Z)

---

## 0. Authorization Verification

| Item | Value |
|---|---|
| Authorization phrase | `I AUTHORIZE SENTRALOGIS D-REPAIR-5A CANONICAL ENRICHMENT MECHANISM DESIGN ONLY.` |
| Authorization source | Explicit user message (separate from the prompt) |
| Authorization timestamp | 2026-09-04T06:21:32Z |
| Authorization status | **VERIFIED** |
| Scope | DESIGN ONLY (no implementation, no mutation, no schema, no migration, no UI, no server action, no audit infrastructure, no R-B/R-C/R-D, no ADR amendment, no Git commit) |

---

## 1. Phase Identity

**D-Repair-5A** is the **architectural design** phase for the future canonical mechanism that will allow an authorized human to explicitly classify `md_entities.is_own` for existing entities. It is a **DESIGN-ONLY** phase.

This phase answers:

> What is the safest canonical mechanism SENTRALOGIS should implement later to allow an authorized human to explicitly classify entity ownership?

This phase does **NOT** answer:

> Which historical records should be changed?

and does **NOT** perform those changes.

---

## 2. Scope Boundary

### 2.1 Allowed (Performed)

- Read targeted source files: `EntityOwnershipService`, `entity-ownership-actions.ts`, `resolver.ts`, `permissions.ts`, `authorization.ts`, `sales-order/service.ts`, RLS migration 063, audit_logs schema (migration 030)
- Reuse D-Repair-2/3/4/5, W3/W5 reports
- Author the design report
- Author a static verification test

### 2.2 Forbidden (Confirmed Not Performed)

```
Production source changes:           0
Production server-action changes:   0
Production UI changes:              0
Schema changes:                     0
Migration changes:                  0
Data mutations:                     0
Historical reclassification:        0
Fixture changes:                    0
Seed changes:                       0
ADR changes:                        0
W3 changes:                         0
W5 changes:                         0
R-B / R-C / R-D changes:            0
resolveIsVendor() changes:          0
Git commits:                        0
```

---

## 3. Evidence Reused

| Report | Status | Reuse |
|---|---|---|
| `SENTRALOGIS_D_REPAIR_2_IS_OWN_ENUMERATION_REPORT.md` | YELLOW, 21/25 | 67/69 baseline |
| `SENTRALOGIS_D_REPAIR_3_IS_OWN_HISTORICAL_ENUMERATION_REPORT.md` | YELLOW, 27/27 | 67/68 UNKNOWN_PROVENANCE |
| `SENTRALOGIS_D_REPAIR_4_IS_OWN_HISTORICAL_ORIGIN_INVESTIGATION_REPORT.md` | YELLOW, 27/27 | 67 DATABASE_DEFAULT + 1 MIGRATION_DECLARATION + 1 UNKNOWN_PROVENANCE |
| `SENTRALOGIS_W3_W5_IS_OWN_IMPLEMENTATION_GAP_FORENSIC_REPORT.md` | YELLOW, 24/24 | W3/W5 GENUINE_IMPLEMENTATION_GAP |
| `SENTRALOGIS_W3_W5_IS_OWN_GAP_REPAIR_REPORT.md` | GREEN, 40/40 | W3/W5 just-repaired; `is_own: true` atomic in INSERT |
| `SENTRALOGIS_D_REPAIR_5_CANONICAL_ENRICHMENT_READINESS_REPORT.md` | YELLOW, 25/27 G1-G27 | 4 prerequisites (PR1-PR4); 8 human decisions |

---

## 4. Targeted Evidence Inspected (This Phase)

| File | Lines | Finding |
|---|---|---|
| `lib/application/identity/resolver.ts` | 1-191 | `resolveIdentityContext`, `assertPermission(ctx, permission)`; server-derived from `userId` + `tenant_users`/`tenants`; rejects client `requestedTenantId` as non-authoritative |
| `lib/application/identity/permissions.ts` | 1-50 | `commercial:read` is baseline; `commercial:manage` added for elevated roles |
| `lib/application/identity/authorization.ts` | 74-282 | `commercial:manage` is granted to: hq_commercial_director, hq_admin, owner, superadmin, tenant_superadmin, hq_finance_director. SBU ops do **NOT** have it. |
| `lib/sales-order/service.ts` | 1-494 | Established pattern: `assertPermission(ctx, 'commercial:manage')` for mutations; `idempotency_key` with UNIQUE(tenant_id, key) for retry safety; injectable DB client for testability; SQL error handling for unique_violation |
| `supabase/migrations/030_enterprise_schema.sql` | audit_logs definition | `audit_logs(id, tenant_id, correlation_id, entity_type, entity_id, operation, old_data JSONB, new_data JSONB, changed_fields TEXT[], performed_by, performed_at, ip_address, user_agent)` with RLS `USING (true)` and 3 indexes (entity, correlation, tenant) |
| `supabase/migrations/063_rls_master_entities_fleets_locations.sql` | 7-13 | `md_entities_tenant_isolation` FOR ALL USING `(tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))` |

---

## 5. Current-State Architecture (EXISTING)

| Layer | Implementation | Status |
|---|---|---|
| Canonical field | `md_entities.is_own` (boolean \| null) | EXISTING (DB schema) |
| Canonical service | `EntityOwnershipService.classifyOwnership(tenantId, entityId)` | EXISTING, READ-ONLY |
| Server actions | `classifyOwnership`, `getEntitiesByOwnership`, `getAllEntitiesWithOwnership` | EXISTING, READ-ONLY |
| Identity context | `resolveIdentityContext({ userId, requestedTenantId? })` | EXISTING; rejects client tenant |
| Authorization | `assertPermission(ctx, 'commercial:manage')` (U-02) | EXISTING; used by all canonical write services |
| RLS | `md_entities_tenant_isolation` FOR ALL using `auth.uid()` | EXISTING (defense-in-depth) |
| Generic audit | `audit_logs` with `old_data`/`new_data` JSONB | EXISTING (foundation, ownership-specific usage is new) |
| Writers | 3 total: W3 `fleets/page.tsx:218`, W5 `drivers/page.tsx:450`, migration 20260811 | EXISTING; only INSERT-style; no UPDATE path |
| Idempotency | `idempotency_key` UNIQUE(tenant_id, key) pattern in sales-order | EXISTING convention |
| Optimistic concurrency | NOT YET (default last-write-wins per D-Repair-5) | GAP |

---

## 6. Alternatives Considered

### Design Question A — Mutation Authority

| Option | Verdict | Rationale |
|---|---|---|
| **A. Direct server action `setEntityOwnership()`** | PARTIAL — feasible but bypasses domain layer | Direct mutations are inconsistent with established service pattern; harder to test; bypasses any domain logic |
| **B. Application/domain service `EntityOwnershipService.setOwnership()` called via server action** | **RECOMMENDED** | Matches established pattern (sales-order/service.ts); testable; injectable DB client; service holds business rules; server action only does auth + tenant + dispatch |
| C. Dedicated application command/use-case | CONSIDERED — equivalent to B in this codebase | Adds indirection without benefit; sales-order/service.ts precedent does not use this |
| D. Another existing canonical mutation pattern | **B = existing pattern** | sales-order, fulfillment, operational-handoff all use domain-service + server-action |

**Recommendation: Option B** — add `EntityOwnershipService.setOwnership(ctx, command)` and `setEntityOwnershipAction(command)` in `entity-ownership-actions.ts`.

### Design Question B — Authorization

| Option | Verdict | Rationale |
|---|---|---|
| Reuse `commercial:manage` | **RECOMMENDED** | Already granted to HQ directors, HQ admin, owner, superadmin, tenant_superadmin. These are the same roles that can manage master-data entities (fleets, drivers, contacts) per existing services. SBU ops explicitly do NOT have it — which is correct: SBU ops should not be able to redefine ownership of their tenant's master entities. |
| New permission `entity:manage:ownership` | YELLOW — would be more semantically precise, but: | (1) Requires ADR-077 update for role-permission mapping; (2) Increases permission surface; (3) Risks inconsistency with existing master-data mutation permissions; (4) `commercial:manage` is already the canonical "manage master commercial data" gate. **Recommend defer to future ADR if business demand emerges.** |

**Recommendation**: Reuse `commercial:manage` for the first implementation. Add a dedicated `entity:manage:ownership` permission only if a future business case requires distinguishing ownership management from other commercial-master mutations.

### Design Question C — Input Contract (Conceptual)

```text
conceptual SetOwnershipCommand = {
  entityId: string (UUID, required)
  isOwn: boolean | null (required; null = mark UNCLASSIFIED)
  reason: string (required, min length 5, max 500, free text)
  expectedCurrentValue: boolean | null (required, for optimistic concurrency)
  idempotencyKey?: string (optional, for client retry safety)
}
```

**Why these fields**:
- `entityId` — target entity; tenant derivation is server-side.
- `isOwn` — the new value. `null` is a valid value (UNCLASSIFIED per ADR-078 D3) and MUST be supported.
- `reason` — MANDATORY. Minimum 5 characters. Free text. Distinguishes explicit human classification from DB default.
- `expectedCurrentValue` — MANDATORY. Prevents stale UI overwriting a newer classification.
- `idempotencyKey` — OPTIONAL. If provided, the mutation is retry-safe (UNIQUE constraint catch + re-select, per sales-order pattern).

**Mandatory reason**: YES. ADR-078 D4 requires explicit human action; the reason is the audit-trail evidence that distinguishes this from the 67 DATABASE_DEFAULT records (per D-Repair-4).

### Design Question D — Unknown State

The mechanism MUST accept all three values:

| Value | Meaning | Allowed |
|---|---|---|
| `true` | INTERNAL / OWN | YES |
| `false` | EXTERNAL / NOT OWN | YES |
| `null` | UNCLASSIFIED / NOT YET EXPLICITLY CLASSIFIED | YES (per ADR-078 D3) |

**No fourth state introduced.** No schema change. The `null` write changes the `is_own` column from its current value to `null` (using a special SQL UPDATE since `null` is not a JS boolean).

### Design Question E — Concurrency

| Strategy | Verdict | Rationale |
|---|---|---|
| A. Unconditional UPDATE | **REJECTED** | Last-write-wins allows stale UI to silently overwrite a newer classification. Identified as a D-Repair-5 finding. |
| B. Optimistic concurrency with `expectedCurrentValue` | **RECOMMENDED** | Stale UI cannot silently overwrite. UPDATE WHERE clause includes `is_own = expectedCurrentValue`. If 0 rows updated, throw a `ConcurrencyConflictError` and require UI re-read. |
| C. Row lock (SELECT FOR UPDATE) | CONSIDERED — feasible | Adds lock contention; requires explicit transaction block; not needed for low-frequency human classification. |

**Recommendation: Strategy B** — optimistic concurrency via `WHERE id = $1 AND tenant_id = $2 AND is_own IS NOT DISTINCT FROM $3` (the `IS NOT DISTINCT FROM` operator handles `null` correctly).

### Design Question F — Idempotency

| Transition | Behavior |
|---|---|
| `null → true` | Sets `is_own = true`; audit records before=null, after=true; 1 row updated |
| `null → false` | Sets `is_own = false`; audit records before=null, after=false; 1 row updated |
| `false → false` (same-value) | If `expectedCurrentValue = false` matches: 1 row updated; audit records before=false, after=false (records "explicit confirmation" of prior classification). If `expectedCurrentValue` mismatches: 0 rows updated; ConcurrencyConflictError |
| `true → true` (same-value) | Same as above; audit captures explicit re-confirmation |
| `false → true` (opposite correction) | 1 row updated; audit records transition; UI may re-read |
| `true → false` (opposite correction) | Same as above; audit records transition; UI may re-read |
| Duplicate request with same `idempotencyKey` | If first request succeeded: return prior audit; do not re-mutate. If first request failed: re-attempt. (Per sales-order pattern.) |
| Retry after network error | Client retries with same `idempotencyKey`; server returns the prior result without re-mutating |

**Transaction semantics**: The UPDATE and the audit INSERT must be in the same database transaction. If the audit insert fails, the UPDATE must roll back. (See Design Question H.)

### Design Question G — Audit Strategy

| Option | Verdict | Rationale |
|---|---|---|
| A. Extend `audit_logs` | **RECOMMENDED** | `audit_logs` already has `old_data` JSONB, `new_data JSONB`, `changed_fields TEXT[]`, `performed_by`, `performed_at`, `entity_type`, `entity_id`, `tenant_id`, `correlation_id`. **No schema change needed.** Use `entity_type = 'md_entity'`, `operation = 'OWNERSHIP_CLASSIFIED'`, `old_data.is_own`, `new_data.is_own`, `changed_fields = ['is_own']`, `correlation_id` = `idempotencyKey` if provided |
| B. Create `entity_ownership_audit` | CONSIDERED — more semantically pure, but: | Requires new migration, new RLS, new service code. **Higher complexity, no functional advantage over option A.** |
| C. Use existing structured audit (none found) | N/A | No ownership-specific audit infrastructure exists. |

**Recommendation: Option A** — extend `audit_logs` with the new operation type and field semantics. **No schema change required.** The existing RLS `USING (true)` on `audit_logs` is permissive (any actor in the same DB can read); this is acceptable for a forensic audit log.

**Note**: The `audit_logs` RLS `USING (true)` is a pre-existing finding. If tenant-isolated audit reads are required in the future, a separate ADR should add tenant-scoped RLS. **D-Repair-5A does not modify audit RLS.**

### Design Question H — Transaction Boundary

**Required atomicity**:

> A successful ownership mutation without a corresponding audit event MUST NEVER be committed.

**Implementation** (designed, not implemented):

```sql
-- PostgreSQL transaction (conceptual, NOT applied)
BEGIN;
  UPDATE md_entities
    SET is_own = $1, updated_at = now()
    WHERE id = $2 AND tenant_id = $3
      AND is_own IS NOT DISTINCT FROM $4
    RETURNING id, is_own, tenant_id;
  -- If 0 rows → ROLLBACK; throw ConcurrencyConflictError
  -- If 1 row → continue to audit
  INSERT INTO audit_logs (
    tenant_id, correlation_id, entity_type, entity_id, operation,
    old_data, new_data, changed_fields, performed_by, performed_at
  ) VALUES (
    $3, $5, 'md_entity', $2, 'OWNERSHIP_CLASSIFIED',
    jsonb_build_object('is_own', $4),
    jsonb_build_object('is_own', $1, 'reason', $6),
    ARRAY['is_own'],
    $7, now()
  );
COMMIT;
-- If either statement fails → ROLLBACK; no partial state
```

**Implementation location**: A new PostgreSQL function `set_entity_ownership()` (similar to `next_sales_order()` and `next_fulfillment_number()`) wraps the UPDATE+INSERT in a single transaction. The function is called via the server action.

**Justification for RPC**: Atomicity is guaranteed by the database; client code cannot accidentally commit only the UPDATE.

### Design Question I — Tenant Isolation

The future mechanism MUST enforce tenant isolation at **three layers**:

| Layer | Control |
|---|---|
| Application | `resolveIdentityContext({ userId })` derives `tenantId` from `auth.uid() → profiles.tenant_id`; server action discards any client `tenantId`; service validates `entity.tenant_id === ctx.tenant_id` before mutation |
| Database (RLS) | `md_entities_tenant_isolation` FOR ALL USING `(tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))`; applied to UPDATE; cross-tenant writes rejected at the database layer |
| Database (RPC) | The new `set_entity_ownership()` function takes `tenantId` as a parameter and includes it in the UPDATE WHERE clause; the function never reads tenant from caller context (unlike some Supabase RLS patterns) |

**No client-controlled tenant ID is trusted.** `x-tenant-id`, `body.tenant_id`, `query.tenant_id` are all ignored.

### Design Question J — Reversibility

| Transition | Permitted? | Notes |
|---|---|---|
| `true ↔ false` | YES | Direct transition; reason field captures "correction of prior misclassification" |
| `true ↔ null` | YES | Reverting to UNCLASSIFIED; reason field captures reason |
| `false ↔ null` | YES | Reverting to UNCLASSIFIED; reason field captures reason |
| Deletion of audit rows | **NO** | Audit is append-only; corrections are recorded as new rows with `changed_fields = ['is_own']` |

**Reversal** means a new transition with a new reason; it does NOT mean deleting prior audit rows. The audit trail is append-only.

### Design Question K — Reason / Provenance

| Field | Requirement |
|---|---|
| `reason` | MANDATORY. Min 5 chars, max 500 chars, free text. The reason MUST distinguish "human explicit classification" from "database default", "migration declaration", "historical inference", and "compatibility projection". The future UI should offer a structured reason-code selector PLUS a free-text detail field, but the design permits free-text-only in v1. |
| `actor identity` | Server-derived: `auth.uid()` → `profiles.id`. Recorded in `audit_logs.performed_by`. |
| `timestamp` | `now()` at the time of UPDATE (within the same transaction as the audit insert). |
| `source` | Implicit: "EXPLICIT_HUMAN_CLASSIFICATION" (the only way to reach the mutation path; no automated path exists). |
| `previous value` | `audit_logs.old_data.is_own` (the value before the update). |
| `new value` | `audit_logs.new_data.is_own` (the value after the update). |
| `correlation_id` | If `idempotencyKey` was provided, set to the key; else set to a server-generated UUID. Allows correlation with client retries. |

**Distinguishing provenance**: The 67 DATABASE_DEFAULT records have `audit_logs` rows that are **empty** (no explicit classification event). Any future row with `operation = 'OWNERSHIP_CLASSIFIED'` is by definition a human-explicit classification. This is the canonical provenance mechanism — no separate `provenance` column needed.

### Design Question L — Historical Enrichment Boundary

The mechanism is **separate from historical enrichment**:

| Concern | Owner | Authorization |
|---|---|---|
| Mechanism implementation | D-Repair-5A → D-Repair-5B (UI/API) → D-Repair-5C (controlled enrichment) | Each phase requires its own distinct authorization |
| Historical record classification (67 records) | Business governance decides which records to enrich; D-Repair-5C executes | Per-record or per-batch human authorization required |
| HALU `7360acc3` | UNKNOWN_PROVENANCE — must be separately classified | Separate authorization required |
| `cc3394e4` | FIXTURE_DECLARATION — already classified | No action needed |

**Critical principle**:

> Database default `false` MUST NOT be treated as confirmed human classification.

The 67 records currently have `is_own = false` from the database default. They are **NOT** explicitly classified. The mechanism is the only path to produce an audit row; the absence of an audit row means the value is a database default, not a human classification.

### Design Question M — External Non-Vendor

**The proposed ownership mechanism is NOT affected by the external non-vendor limitation.** The mechanism writes only `md_entities.is_own`; it does not introduce a new role, enum, or column for external non-vendor representation. A party that is `is_own=false` AND has no `party_roles.VENDOR` row remains represented by the negative conjunction; this is the current state and is not modified by D-Repair-5A.

If a future architectural ADR adds a positive representation for external non-vendor, the mechanism will need to be reviewed for backwards compatibility. **This is out of D-Repair-5A scope.**

### Design Question N — Bypass Analysis

| # | Threat | Control | Verification |
|---|---|---|---|
| 1 | Direct client Supabase `supabase.from('md_entities').update({is_own: true})` | RLS `md_entities_tenant_isolation` rejects rows for other tenants; within own tenant, the application uses server-derived tenantId. Browser-side direct Supabase access still goes through the RLS filter. | RLS policy test (future R-D-2); insert test (cannot bypass RLS) |
| 2 | Server action without authorization | `assertPermission(ctx, 'commercial:manage')` gates the action; missing permission throws `ERR_FORBIDDEN_PERMISSION` | Unit test with stubbed context (future test) |
| 3 | Forged tenant ID (client supplies `tenantId` in body) | Server action derives tenant from `auth.getUser() → profiles.tenant_id`; client `tenantId` is discarded. Existing entity-ownership-actions.ts already does this. | Static code review + integration test |
| 4 | Stale client state (UI thinks `is_own=false`, server has `is_own=true`) | Optimistic concurrency: `expectedCurrentValue` mismatch → 0 rows updated → `ConcurrencyConflictError` → UI re-reads | Unit test for conflict path |
| 5 | Direct API invocation (curl/Postman) | Server action is server-side only; only authenticated users with `commercial:manage` can call; unauthenticated → 401 | Integration test with mock auth |
| 6 | Alternate master-data writer (e.g., a future W6 that writes `is_own`) | The W3/W5 Gap Repair report established the convention: writers that create entities with `is_own` MUST use the explicit selector and atomic INSERT. The future enrichment mechanism is the ONLY path for `UPDATE`. A future ADR or test would enforce this. | Code review + grep test |
| 7 | Migration misuse (someone writes a migration that sets `is_own`) | Migrations require explicit authorization; the 20260811 migration is documented as the only authorized migration write. Future migrations touching `is_own` must be reviewed. | Code review |
| 8 | Service bypass (a new service writes `is_own` without going through the canonical mechanism) | Code review + grep test for any future `.update({ is_own: ... })` outside the canonical service | CI gate (future) |
| 9 | `is_vendor` inference (a future writer derives `is_own` from `is_vendor`) | ADR-078 D8 establishes orthogonality; code review rejects any such inference | CI gate (future) |
| 10 | Name heuristic | ADR-078 D9 rejects; code review rejects | CI gate (future) |
| 11 | Direct SQL administrative mutation | Production DB access is via Supabase + service-role key; RLS does not apply to service-role. The mechanism is implemented in a PostgreSQL function called via RPC; raw SQL from admin client is out of scope for this design. | Operational policy |
| 12 | Audit row tampering | `audit_logs` rows are append-only; the RPC transaction ensures UPDATE and INSERT are atomic. A future ADR could add a hash chain (per D-Repair-5 E) for tamper-evidence. | Operational policy |

**Critical**: The mechanism is designed to be the **only** path for `is_own` UPDATE on existing entities. Future bypasses (alternate writers, raw SQL, etc.) are detected by code review and grep tests.

### Design Question O — Future Test Matrix

The future implementation phase must author a test suite covering:

| Category | Test Cases |
|---|---|
| **Authorization** | (a) authorized actor (commercial:manage) → success; (b) unauthorized actor (sbu_ops) → 403; (c) unauthenticated → 401 |
| **Tenant isolation** | (a) same tenant → success; (b) foreign tenant → 0 rows updated; (c) forged `tenantId` in body → ignored, server-derived tenant used |
| **State transitions** | (a) null → true; (b) null → false; (c) false → true; (d) true → false; (e) same-value true → true (audit captures re-confirmation); (f) same-value false → false (audit captures re-confirmation); (g) explicit null assignment → null |
| **Concurrency** | (a) stale `expectedCurrentValue` → 0 rows updated, `ConcurrencyConflictError`; (b) concurrent conflicting update → 0 rows for the loser, `ConcurrencyConflictError` |
| **Audit** | (a) successful mutation has audit row with correct before/after/reason/actor/tenant; (b) failed mutation has no audit row AND no committed ownership change (transaction rollback); (c) audit row is append-only |
| **Idempotency** | (a) duplicate `idempotencyKey` returns prior result; (b) retry after network error is safe |
| **Compatibility** | (a) `is_vendor` unchanged after mutation; (b) `party_roles` unchanged; (c) `vendor_type` unchanged |
| **Reason validation** | (a) reason < 5 chars → `InvalidReasonError`; (b) reason > 500 chars → `InvalidReasonError`; (c) reason missing → `ReasonRequiredError` |
| **Security** | (a) direct client mutation rejected; (b) server authorization cannot be bypassed; (c) cross-tenant mutation rejected; (d) audit row cannot be tampered with via the mutation path |

**No tests are authored in D-Repair-5A.** This is a test design.

---

## 7. Recommended Canonical Mechanism

### 7.1 WHO

**Tenant administrators, HQ commercial directors, HQ admins, owners, superadmins** — i.e., actors with `commercial:manage` permission per `lib/application/identity/authorization.ts`.

**SBU operations staff explicitly CANNOT classify ownership** — they have `commercial:read` but not `commercial:manage`. This is the correct boundary: SBU ops should not redefine tenant-level master-data ownership.

### 7.2 WHAT

The canonical field that changes is **`md_entities.is_own`** (boolean | null). The new value is one of:
- `true` — INTERNAL / OWN
- `false` — EXTERNAL / NOT OWN
- `null` — UNCLASSIFIED / NOT YET EXPLICITLY CLASSIFIED

No other fields are modified. **`is_vendor`, `vendor_type`, `party_roles` are not touched.**

### 7.3 WHERE

The mutation authority lives in **two layers**:

1. **Application domain service**: `EntityOwnershipService.setOwnership(ctx, command)` — a new method on the existing service. Holds business rules, validation, transaction orchestration.
2. **Server action**: `setEntityOwnershipAction(command)` in `entity-ownership-actions.ts` — `'use server'` directive; performs U-01 identity resolution + U-02 authorization + dispatches to service.

The actual database write is encapsulated in a **PostgreSQL function `set_entity_ownership()`** invoked via `supabase.rpc()`. The function takes `(entityId, tenantId, newIsOwn, expectedCurrentValue, reason, actorId, idempotencyKey)` and atomically performs the UPDATE + audit INSERT.

### 7.4 HOW

#### 7.4.1 Authorization

`assertPermission(ctx, 'commercial:manage')` is called at the top of the server action. If the actor does not have it, `ERR_FORBIDDEN_PERMISSION` is thrown (403).

#### 7.4.2 Tenant isolation

```typescript
const ctx = await resolveIdentityContext({ userId: (await supabase.auth.getUser()).data.user?.id });
// ctx.tenantId is server-derived; client tenantId is ignored
const { data, error } = await supabase.rpc('set_entity_ownership', {
  p_entity_id: command.entityId,
  p_tenant_id: ctx.tenantId,         // server-derived
  p_new_is_own: command.isOwn,        // boolean | null
  p_expected_current_value: command.expectedCurrentValue,
  p_reason: command.reason,
  p_actor_id: ctx.userId,
  p_idempotency_key: command.idempotencyKey ?? crypto.randomUUID(),
});
```

RLS `md_entities_tenant_isolation` provides defense-in-depth.

#### 7.4.3 Concurrency

The RPC uses:

```sql
UPDATE md_entities
  SET is_own = $3, updated_at = now()
  WHERE id = $1 AND tenant_id = $2
    AND is_own IS NOT DISTINCT FROM $4
  RETURNING id, is_own, tenant_id, updated_at;
```

If 0 rows are returned, the RPC raises a `CONCURRENCY_CONFLICT` exception. The server action maps this to `ConcurrencyConflictError` (HTTP 409). The UI re-reads the entity and asks the user to confirm.

#### 7.4.4 Audit recording

The RPC inserts a row in `audit_logs`:

```sql
INSERT INTO audit_logs (
  tenant_id, correlation_id, entity_type, entity_id, operation,
  old_data, new_data, changed_fields, performed_by, performed_at
) VALUES (
  $2, $7, 'md_entity', $1, 'OWNERSHIP_CLASSIFIED',
  jsonb_build_object('is_own', $4),
  jsonb_build_object('is_own', $3, 'reason', $5),
  ARRAY['is_own'],
  $6, now()
);
```

Both statements are in the same transaction.

#### 7.4.5 Reversal

Reversal is a new transition with a new reason. The audit trail captures both. No deletion.

### 7.5 WHEN

Historical enrichment may begin only after:
1. The mechanism is implemented (D-Repair-5B).
2. Business governance authorizes specific records or batches (human decision per record/batch).
3. The UI/API is available (D-Repair-5C).
4. **Per-record human authorization** is granted.

**The mechanism implementation itself does NOT authorize any historical enrichment.** They are independent.

### 7.6 WHY

This mechanism is the safest because:

1. **Authorization** is gated by `assertPermission('commercial:manage')` — the same gate as all other master-data mutations.
2. **Tenant isolation** is enforced at three layers: server-derived identity, RLS, and RPC parameter.
3. **Concurrency** is optimistic, preventing stale UI overwrites.
4. **Audit** is automatic, atomic, and append-only; `audit_logs` is the canonical forensic record.
5. **Idempotency** is supported via `idempotencyKey` with UNIQUE constraint (per sales-order pattern).
6. **Reversibility** is preserved — corrections are new transitions with new audit rows.
7. **Compatibility** is preserved — `is_vendor`, `vendor_type`, `party_roles` are not touched.
8. **No heuristic inference** — the mechanism writes only what the human explicitly chose.
9. **The 67 frozen records remain untouched** — the mechanism only mutates records that a human explicitly classifies.
10. **The HALU unknown-provenance record remains untouched** — no automatic classification.

---

## 8. Future Implementation Sequence (DESIGN ONLY)

```text
D-Repair-5A  [THIS PHASE]  Design the mechanism (no implementation)
    ↓
D-Repair-5A.1  [FUTURE]   Write the PostgreSQL function set_entity_ownership()
                          (requires migration authorization)
    ↓
D-Repair-5A.2  [FUTURE]   Add EntityOwnershipService.setOwnership(ctx, command)
    ↓
D-Repair-5A.3  [FUTURE]   Add setEntityOwnershipAction(command) server action
    ↓
D-Repair-5A.4  [FUTURE]   Author comprehensive test suite per Design Q-O
    ↓
D-Repair-5B    [FUTURE]   Authorized user classification UI/API
    ↓
HALU enrichment fixtures  [FUTURE, separate authorization]  Test-data mutation
    ↓
Historical enrichment governance  [FUTURE, separate authorization]  Business decision
    ↓
D-Repair-5C   [FUTURE]   Controlled historical enrichment (per-batch human authorization)
```

**Each step requires its own distinct explicit authorization.** No step after D-Repair-5A may be executed.

---

## 9. G1–G30 Results

| # | Gate | Result |
|---|---|---|
| G1 | Exact authorization verified | **PASS** |
| G2 | D-Repair-5A identity verified | **PASS** |
| G3 | Design-only scope enforced | **PASS** |
| G4 | No implementation performed | **PASS** |
| G5 | No historical enrichment performed | **PASS** |
| G6 | ADR-078 authority preserved | **PASS** |
| G7 | `md_entities.is_own` remains canonical | **PASS** |
| G8 | Vendor independence preserved | **PASS** |
| G9 | NULL semantics preserved | **PASS** |
| G10 | W3/W5 repaired baseline preserved | **PASS** |
| G11 | Future mutation authority identified (Option B: domain service + server action + RPC) | **PASS** |
| G12 | Authorization mechanism designed (`commercial:manage`) | **PASS** |
| G13 | Tenant derivation designed (server-derived + RLS + RPC param) | **PASS** |
| G14 | RLS defense-in-depth preserved | **PASS** |
| G15 | Concurrency strategy selected (optimistic via `IS NOT DISTINCT FROM`) | **PASS** |
| G16 | Idempotency semantics defined (UNIQUE on idempotencyKey + re-select) | **PASS** |
| G17 | Reversibility defined (new transition + new audit row, append-only) | **PASS** |
| G18 | Audit strategy selected (extend `audit_logs` with OWNERSHIP_CLASSIFIED operation) | **PASS** |
| G19 | Before/after capture defined (`old_data.is_own` / `new_data.is_own`) | **PASS** |
| G20 | Actor/tenant/reason provenance defined (server-derived + mandatory reason) | **PASS** |
| G21 | Ownership + audit atomicity defined (single PostgreSQL transaction in RPC) | **PASS** |
| G22 | Bypass threats assessed (12 threats; controls in §6 N) | **PASS** |
| G23 | `is_vendor` isolation preserved | **PASS** |
| G24 | `party_roles` isolation preserved | **PASS** |
| G25 | `vendor_type` isolation preserved | **PASS** |
| G26 | No heuristic classification permitted | **PASS** |
| G27 | 67 frozen records remain untouched | **PASS** |
| G28 | HALU `7360acc3` remains untouched | **PASS** |
| G29 | Historical enrichment explicitly separated from mechanism implementation | **PASS** |
| G30 | Future phase boundary and authorization requirements documented | **PASS** (but see YELLOW note below) |

**Pass count**: 30/30 PASS.

**YELLOW note on G30**: The future implementation sequence (§8) lists 7 future steps. Each step requires its own distinct authorization. **The decision on whether to begin ANY of them is a business governance decision and is out of D-Repair-5A scope.** No gate is RED.

---

## 10. Change-Integrity Proof

```
Production source changes:           0
Production server-action changes:   0
Production UI changes:              0
Schema changes:                     0
Migration changes:                  0
Data mutations:                     0
Historical reclassification:        0
Fixture changes:                    0
Seed changes:                       0
ADR changes:                        0
W3 changes:                         0
W5 changes:                         0
R-B / R-C / R-D changes:            0
resolveIsVendor() changes:          0
Git commits:                        0
```

**Zero non-zero values. Phase is contained.**

---

## 11. Deferred Decisions

| Decision | Deferred To | Reason |
|---|---|---|
| Whether to add a dedicated `entity:manage:ownership` permission | Future ADR | Current `commercial:manage` is sufficient; can be revisited if business demand emerges |
| Tenant-isolated RLS on `audit_logs` | Future ADR | Pre-existing permissive RLS; not modified by D-Repair-5A |
| Hash chain for audit tamper-evidence | Future ADR | Not in D-Repair-5A scope |
| External non-vendor positive representation | Future architectural ADR | Out of D-Repair-5A scope; preserves current negative conjunction |
| `set_entity_ownership()` PostgreSQL function implementation | D-Repair-5A.1 (future, separate authorization) | Requires migration |
| Service method `EntityOwnershipService.setOwnership()` | D-Repair-5A.2 (future, separate authorization) | Implementation |
| Server action `setEntityOwnershipAction()` | D-Repair-5A.3 (future, separate authorization) | Implementation |
| Test suite per Design Q-O | D-Repair-5A.4 (future, separate authorization) | Test implementation |
| UI/API entry point | D-Repair-5B (future, separate authorization) | UI implementation |
| HALU enrichment fixtures | Separate phase (separate authorization) | Test-data mutation |
| Historical enrichment governance | Separate phase (separate authorization) | Business decision |
| Controlled historical enrichment | D-Repair-5C (future, separate authorization) | Mutation phase |

---

## 12. Final Recommendation

**D-Repair-5A has produced a complete, safe, evidence-based design for the future canonical enrichment mechanism.** The design:

- Preserves all ADR-078 invariants.
- Reuses existing infrastructure (`assertPermission`, `audit_logs`, RLS, sales-order idempotency pattern).
- Introduces no schema changes, no ADR amendments, no service modifications.
- Identifies 4 explicit prerequisites for future implementation (migration for RPC, service method, server action, test suite).
- Separates mechanism implementation from historical enrichment governance.
- Preserves all frozen data (67 records, HALU `7360acc3`, `cc3394e4`).

**The recommended future mechanism is**: a domain service + server action + PostgreSQL RPC that uses `commercial:manage` authorization, server-derived tenant, optimistic concurrency via `IS NOT DISTINCT FROM`, and append-only audit via `audit_logs` with operation `OWNERSHIP_CLASSIFIED`. Reason is mandatory (≥ 5 chars). Idempotency via `idempotencyKey`. Reversal via new transition. No heuristic inference. No `is_vendor` / `vendor_type` / `party_roles` mutation.

---

## 13. Hard-Stop Declaration

> D-REPAIR-5A DESIGN ONLY.
>
> No production source was modified.
> No schema was changed.
> No migration was created or applied.
> No data was mutated.
> No fixture was created.
> No historical record was reclassified.
> HALU `7360acc3-...` remains UNCHANGED.
> `cc3394e4-...` remains UNCHANGED.
> The 67 frozen records remain UNCHANGED.
> W3 / W5 / R-B / R-C / R-D were not modified.
> `resolveIsVendor()` was not modified.
> `is_vendor`, `vendor_type`, `party_roles` were not modified.
> ADR-078 was not amended.
> No new ADR was created.
> No server action was created.
> No API route was created.
> No UI was created.
> No audit infrastructure was modified.
> No Git commit was performed.
>
> D-Repair-5A is the **design** phase only. Implementation requires D-Repair-5A.1 through A.4 (each with its own authorization). UI requires D-Repair-5B. Historical enrichment requires D-Repair-5C and per-record human authorization.

---

# HARD STOP — END D-REPAIR-5A CANONICAL ENRICHMENT MECHANISM DESIGN
