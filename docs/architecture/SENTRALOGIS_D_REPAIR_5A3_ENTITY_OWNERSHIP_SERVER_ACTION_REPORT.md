# SENTRALOGIS D-REPAIR-5A.3 — Entity Ownership Server Action Report

**Status: GREEN — COMPLETE (37/37 tests PASS, 0 new TypeScript errors)**

## Scope
D-Repair-5A.3 implements `setEntityOwnershipAction()` — the server action entry point that exposes the `setEntity_ownership()` RPC to authenticated callers with canonical authorization, tenant isolation, and error mapping. This is the **third and final link** in the D-Repair-5A chain:

1. **D-Repair-5A.1** — PostgreSQL RPC function `set_entity_ownership()` (migration `20260904_051_set_entity_ownership.sql`) — **67/67 PASS**
2. **D-Repair-5A.2** — Domain service `EntityOwnershipService.setOwnership()` (`lib/domain/entity/entity-ownership-service.ts`) — **46/46 PASS**
3. **D-Repair-5A.3** — Server action `setEntityOwnershipAction()` (`lib/actions/entity-ownership-actions.ts`) — **37/37 PASS** (this phase)

## Implementation

### `lib/actions/entity-ownership-actions.ts`
- **`setEntityOwnershipAction(entityId, isOwn, expectedCurrentValue, reason, idempotencyKey?)`** — `use server` action returning `Promise<ServerActionResult<SetOwnershipResult>>`
- **Authentication**: `createAdminClient()` + `getUser()` — 403 if no user
- **Tenant resolution**: `resolveTenantForActor()` from profile — 403 if tenant missing
- **Authorization**: `assertPermission(identityContext, 'commercial:manage')` — granted to `hq_commercial_director`, `hq_admin`, `owner`, `superadmin`, `tenant_superadmin`, `hq_finance_director`; SBU ops explicitly excluded
- **IdentityContext**: server-derived from profile (`tenantId: ctx.tenant_id`), never client-supplied
- **Service dispatch**: `new EntityOwnershipService(ctx.supabase as any).setOwnership(identityContext, command)` with `SetOwnershipCommand` built from action params
- **Error mapping**:
  - `INVALID_MUTATION` (NULL not supported) → `ok: false`
  - `INVALID_REASON` → `ok: false`
  - `ENTITY_NOT_FOUND` → `ok: false`
  - `CONCURRENCY_CONFLICT` → `ok: false`
  - `FORBIDDEN_PERMISSION` → `ok: false`
  - Generic fallback → `ok: false, error: "Failed to set entity ownership: <message>"`
- **Success**: `{ ok: true, data: result }`

### Preserved functions (accidentally overwritten during initial write, restored)
- `classifyOwnership(entityId)` — read-only ownership classification
- `getEntitiesByOwnership(isOwn)` — list entities by ownership class
- `getAllEntitiesWithOwnership()` — full ownership listing

## Test Suite
**File**: `lib/__tests__/d-repair-5a3-server-action.test.ts` — **37 checks (G1–G13)**

| Gate | Description | Result |
|------|-------------|--------|
| G1 | Export & `use server` directive | PASS |
| G2 | Signature & return type | PASS |
| G3 | Authorization (`assertPermission`, `commercial:manage`, 403 paths) | PASS |
| G4 | Server-derived tenant isolation (`ctx.tenant_id` from profile) | PASS |
| G5 | Service invocation (`EntityOwnershipService`, `setOwnership`, command construction) | PASS |
| G6 | Success/failure return shapes | PASS |
| G7 | Error mapping (6 error codes + fallback) | PASS |
| G8 | Idempotency key propagation | PASS |
| G9 | NULL ownership handling (accepted, passed through, service rejects) | PASS |
| G10 | Imports & dependencies (10 checks) | PASS |
| G11 | Preserved read functions unchanged (3 checks) | PASS |
| G12 | No production data mutations; 67 frozen records + HALU/ATM unchanged (4 checks) | PASS |
| G13 | No migration changes in this phase | PASS |

## TypeScript
`npx tsc --noEmit` — **0 new errors**. Only pre-existing `scripts/run-d-repair.ts:17` `ws` module declaration error (unrelated, never touched).

## Invariants Preserved
- 67 `is_own=false` records + HALU `7360acc3` + ATM `cc3394e4` **FROZEN** across all phases
- `commercial:manage` permission matrix unchanged
- `resolveIsVendor()` (R-6 derived) preserved
- No entity-ownership management UI exists anywhere in `app/` (no UI phase authorized)
- No `entity_ownership_audit` or `md_entity_audit` table exists
- Zero production data mutations in this phase (server action enables but does not execute)

## Next Phase
- **D-Repair-5A.4** (test suite) — requires separate authorization
- **D-Repair-5B** (UI/API) — requires separate authorization
- **D-Repair-5C** (historical enrichment) — requires separate authorization