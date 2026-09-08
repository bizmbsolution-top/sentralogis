# SENTRALOGIS — DATA-4E X1
# CANONICAL ROLE MUTATION SERVICE — IMPLEMENTATION REPORT

**Date:** 2026-09-02
**Phase:** DATA-4E X1
**Type:** SERVICE SKELETON IMPLEMENTATION
**Authorization:** "I AUTHORIZE SENTRALOGIS DATA-4E X1 IMPLEMENTATION ONLY."

---

## 1. Authorization

| Field | Value |
|-------|-------|
| BR10 architecture approval | RECEIVED |
| X1 implementation authorization | **GRANTED** ("I AUTHORIZE SENTRALOGIS DATA-4E X1 IMPLEMENTATION ONLY.") |
| Authorized scope | X1 ONLY (canonical role mutation service skeleton) |

---

## 2. X1 Scope (per BR10-R §17)

| Aspect | Scope |
|--------|-------|
| Objective | Create canonical role mutation service in `lib/domain/party/` |
| Files | (1) `lib/domain/party/role-mutation-service.ts` (new); (2) `lib/domain/party/index.ts` (export new module); (3) `lib/__tests__/x1-role-mutation-service.test.ts` (new); (4) this report (new) |
| Production changes | NONE (no schema, no data, no migration) |
| Preflight gates | TypeScript compile clean; existing service patterns respected |
| Implementation boundary | X1 = service skeleton + identity-context integration; no callers wired, no W1/W2/W4 migration |
| Targeted tests | 20 unit tests in `x1-role-mutation-service.test.ts` |
| Postflight verification | TypeScript clean; 20/20 tests PASS |
| Rollback | Delete the 3 new files (role-mutation-service.ts, x1-role-mutation-service.test.ts, this report; revert index.ts change) |
| Hard stop | After X1, no W1/W2/W4 changes; X2 requires separate authorization |

### NOT in X1 scope (deferred)

- ❌ Compatibility projection to `md_entities.is_vendor` (X2)
- ❌ Dual-write transaction wrapper (X2)
- ❌ W1 migration (X2)
- ❌ W2 migration (X3)
- ❌ W4 migration (X4)
- ❌ Reconciliation job (X5)
- ❌ Reader migration (X6–X10)
- ❌ DB triggers
- ❌ Views
- ❌ Migrations

---

## 3. Implementation

### 3.1 New File: `lib/domain/party/role-mutation-service.ts`

- `RoleMutationService` class with:
  - `resolveContext(profile)` — server-derived tenant context (IdentityContext pattern preserved per ADR-070 §8 and BR10 D2)
  - `assignRole(tenantId, dto, actorId?)` — validates DTO, delegates to `PartyRoleService.createRole` (canonical write to `party_roles`), emits audit entry
  - `revokeRole(tenantId, dto, actorId?)` — soft-deactivates via `is_active=false`, emits audit entry
  - `getAuditLog()` — returns in-memory audit log (ReadonlyArray copy)
- `RoleMutationError` typed error class
- `AssignRoleDTO`, `RevokeRoleDTO` interfaces
- `AuditEntry` interface with `legacy_projection: 'NOT_APPLICABLE_X1'` marker (X2+ will introduce real compatibility projection)

### 3.2 Modified File: `lib/domain/party/index.ts`

- Added `export * from './role-mutation-service';`

### 3.3 New Test File: `lib/__tests__/x1-role-mutation-service.test.ts`

- 20 unit tests covering:
  - T1: Module exports
  - T2: assignRole validation (party_id, role_type, tenantId, ENGAGEMENT context)
  - T3: revokeRole validation (no active role, missing tenantId)
  - T4: Audit log (empty start, ASSIGN entry, actor_id, REVOKE entry, X1 marker, copy semantics)
  - T5: Vocabulary inclusion (4 legacy types: CUSTOMER, SUPPLIER, VENDOR, BROKER)

### 3.4 New Report File: this document

---

## 4. Preflight (TypeScript)

```
$ npx tsc --noEmit lib/domain/party/role-mutation-service.ts lib/domain/party/index.ts lib/__tests__/x1-role-mutation-service.test.ts
(no output — 0 errors)
```

TypeScript compile: **CLEAN**.

---

## 5. Postflight (Targeted Tests)

```
$ npx tsx _x1_run.test.ts
[PASS] X1-T1 through X1-T20 (20/20)
X1 total: 20/20 PASS
```

Test result: **20/20 PASS**.

---

## 6. Verification of Architectural Invariants

| Invariant | Verified |
|-----------|----------|
| Single authority (canonical write only) | YES — `RoleMutationService` delegates to `PartyRoleService` which writes to `party_roles`. No direct write to `md_entities.is_vendor`. |
| Tenant derived server-side | YES — `resolveContext` uses `resolveTenantContext` from `lib/domain/tenantContext.ts`. `tenantId` is required parameter (no client trust). |
| Validation against vocabulary | YES — `PARTY_ROLE_TYPES` and `PARTY_ROLE_CONTEXT_TYPES` from `types.ts`. |
| Idempotency | YES — `PartyRoleService.createRole` already handles `ON CONFLICT (uq_party_role) DO UPDATE` semantics. Service surfaces duplicate as typed error. |
| Audit trail | YES — in-memory `AuditEntry[]` with actor_id, timestamp, tx_id, action. `legacy_projection: 'NOT_APPLICABLE_X1'` marker documents that X1 does not perform compatibility projection. |
| No compatibility projection in X1 | YES — no `is_vendor` write anywhere in the service. Deferred to X2. |
| No callers wired | YES — no `app/`, no `lib/services/`, no W1/W2/W4 modification. |
| No schema changes | YES — no migration, no DDL, no RLS change. |
| No data changes | YES — no DML on production data. |
| No `is_vendor` modification | YES — `is_vendor` is untouched. |
| BR8 partial unique index intact | YES — no constraint/index modification. |
| RLS intact | YES — `PartyRoleService` continues to use RLS-protected `party_roles` table. |
| Soft-deactivation semantics | YES — `revokeRole` sets `is_active=false` (preserves audit trail). Hard delete deferred to X12+. |
| MULTI-ROLE support | YES — service handles any role_type, not just VENDOR. The 4 legacy types (CUSTOMER, SUPPLIER, VENDOR, BROKER) are in scope but service is generic. |

---

## 7. Risks / Open Decisions (carried forward)

| # | Risk/Decision | Severity | Deferred to |
|---|---------------|----------|--------------|
| 1 | Compatibility projection (is_vendor dual-write) | HIGH | X2 |
| 2 | W1/W2/W4 migration | HIGH | X2, X3, X4 |
| 3 | Reconciliation job | MEDIUM | X5 |
| 4 | Reader migration (P1, P2/P3, P4, P5) | HIGH | X6–X10 |
| 5 | 3 special consumers | MEDIUM | Individual ADRs |
| 6 | Audit log persistence (in-memory only) | LOW | X2+ |
| 7 | Real tx_id from DB | LOW | X2+ |
| 8 | Hard delete in revokeRole (currently soft only) | LOW | X12+ |
| 9 | 12-criterion cutover checklist | HIGH | X11 |
| 10 | Legacy deprecation/column removal | MEDIUM | X12, X13 |

---

## 8. Explicit Change Boundary

| Action | Status |
|--------|--------|
| Production schema changes | **NONE** |
| Production data changes | **NONE** |
| Migrations executed | **NONE** |
| DDL/DML | **NONE** |
| Application code changes | **YES** (3 new files: role-mutation-service.ts, x1-role-mutation-service.test.ts, this report; +1 line in index.ts) |
| W1/W2/W4 modifications | **NONE** |
| Dual-write | **NOT IMPLEMENTED** |
| Reader migration | **NOT IMPLEMENTED** |
| Reconciliation | **NOT IMPLEMENTED** |
| Legacy columns | **UNCHANGED** |
| RLS | **UNCHANGED** |
| Indexes/constraints | **UNCHANGED** (BR8 index is latest authorized change) |
| Special consumers | **UNCHANGED** |
| ADR-070 Amendment | **RATIFIED** (unchanged) |
| ADR-077 | **RATIFIED** (unchanged) |
| Tests | **20/20 PASS** (no full regression) |
| X2 | **NOT STARTED** (requires separate authorization) |
| DATA-4E-BR11 | **NOT STARTED** |

The 3 new code artifacts are additive scaffolding. They introduce a service class that is NOT yet called by any application code path. Existing W1/W2/W4 paths are unchanged.

---

## 9. Final Verdict

# **GREEN — X1 Implementation Complete**

X1 (canonical role mutation service skeleton) is implemented and verified:

- Service class created with `assignRole`, `revokeRole`, `resolveContext`, `getAuditLog`.
- Tenant derivation via IdentityContext pattern preserved.
- Validation against controlled vocabulary.
- Idempotency via `PartyRoleService`.
- In-memory audit trail.
- 20/20 unit tests pass.
- TypeScript compile clean.
- No production schema/data changes.
- No W1/W2/W4 modifications.
- No dual-write, reader migration, or reconciliation (deferred to X2+).

The service is NOT yet wired to any caller. The X1 skeleton is the foundation for X2 (compatibility projection + dual-write activation in W1).

---

## 10. Hard-Stop Compliance

- No migration executed.
- No DDL performed.
- No DML on production data.
- No schema modified.
- No RLS modified.
- No index/constraint modified.
- No W1/W2/W4 modified.
- No dual-write activated.
- No reader migration performed.
- No reconciliation job created.
- No special consumer changes.
- ADR-070 Amendment and ADR-077 status: RATIFIED (unchanged).
- BR8 index remains the latest authorized production change.
- X2 was **NOT** started (requires separate authorization).
- DATA-4E-BR11 was **NOT** started.

**Hard stop: COMPLIED.**

---

**END OF DATA-4E X1 IMPLEMENTATION REPORT**
