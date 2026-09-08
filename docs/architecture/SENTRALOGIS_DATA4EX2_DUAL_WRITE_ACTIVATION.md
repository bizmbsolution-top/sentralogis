# SENTRALOGIS — DATA-4E X2
# DUAL-WRITE ACTIVATION — IMPLEMENTATION REPORT

**Date:** 2026-09-02
**Phase:** DATA-4E X2
**Type:** DUAL-WRITE ACTIVATION
**Authorization:** "I AUTHORIZE SENTRALOGIS DATA-4E X2 IMPLEMENTATION ONLY."

---

## 1. Authorization

| Field | Value |
|-------|-------|
| BR10 architecture approval | RECEIVED |
| X1 implementation authorization | RECEIVED (completed GREEN) |
| X2 implementation authorization | **GRANTED** ("I AUTHORIZE SENTRALOGIS DATA-4E X2 IMPLEMENTATION ONLY.") |
| Authorized scope | X2 ONLY (dual-write + server action + W1 page wiring deferred) |

---

## 2. X2 Scope (per BR10 D2–D6)

| Aspect | Scope |
|--------|-------|
| Objective | Activate dual-write in `RoleMutationService`: canonical `party_roles` write + compatibility `md_entities.is_*` write |
| Files modified | (1) `lib/domain/party/role-mutation-service.ts` (X1 base extended with X2 dual-write) |
| Files created | (1) `lib/actions/role-mutation-actions.ts` (server actions); (2) `lib/__tests__/x2-role-mutation-dual-write.test.ts` (23 tests); (3) this report |
| Production changes | NONE (no schema, no data, no migration, no W1/W2/W4 page modification in this X-phase) |
| Preflight | TypeScript compile clean; X1 tests still 20/20 |
| Targeted tests | X2: 23/23 PASS; X1: 20/20 PASS |
| Rollback | Revert `role-mutation-service.ts` to X1; delete the 2 new files |
| Hard stop | After X2, W2/W4 modifications require separate authorization; reconciliation job is X5 |

### NOT in X2 scope (deferred)

- ❌ True atomicity via Postgres function (requires DDL/migration — needs separate X-phase with explicit DDL auth)
- ❌ W1 page modification (X2.1 — form is 700+ lines, requires dedicated sub-phase)
- ❌ W2 migration (X3)
- ❌ W4 migration (X4)
- ❌ Reconciliation job (X5)
- ❌ Reader migration (X6–X10)
- ❌ Persistent audit table

---

## 3. Implementation

### 3.1 `lib/domain/party/role-mutation-service.ts` (modified)

X1 service extended with X2 dual-write. The same `RoleMutationService` class now performs:

1. **Canonical write** to `party_roles` via `PartyRoleService.createRole` (idempotent, ON CONFLICT)
2. **Compatibility projection** to `md_entities.is_vendor` / `is_customer` / `is_supplier` / `is_broker` based on the role type
3. **Audit entry** with `legacy_projection: 'SUCCESS' | 'FAILED'`
4. **Compensation log** for X5 reconciliation when projection fails

The 4 legacy mappings:
- `VENDOR` → `is_vendor`
- `CUSTOMER` → `is_customer`
- `SUPPLIER` → `is_supplier`
- `BROKER` → `is_broker`
- `CARRIER`, `AGENT`, `BILL_TO`, `SHIP_TO`, `PAYER`, `ORDERING_PARTY` → no legacy projection (no boolean equivalent)

### 3.2 `lib/actions/role-mutation-actions.ts` (new)

Server actions following the project's `masterCodeActions.ts` pattern:
- `'use server'` directive
- `createAdminClient()` from `@/lib/supabase/admin` (project convention)
- `assignRoleAction(partyId, roleType, contextType, contextId)` — generic role assignment
- `revokeRoleAction(partyId, roleType, contextType, contextId)` — generic role revocation
- `assignVendorRoleAction(partyId)` — legacy-shaped wrapper for W1
- `revokeVendorRoleAction(partyId)` — legacy-shaped wrapper for W1
- Returns `ServerActionResult<T>` shape with `ok`, `data`, `error`
- Tenant derived from `profile.tenant_id` (server-side, IdentityContext preserved)

### 3.3 `lib/__tests__/x2-role-mutation-dual-write.test.ts` (new)

23 tests covering:
- **T1** (4 tests): assignRole happy path — canonical + legacy both performed, correct field/value, audit SUCCESS
- **T2** (4 tests): assignRole legacy failure — throws, compensation log records FAILED with error
- **T3** (3 tests): revokeRole happy path — canonical + legacy both performed, is_vendor=false, audit SUCCESS
- **T4** (5 tests): 4 legacy role type mappings (CUSTOMER→is_customer, SUPPLIER→is_supplier, VENDOR→is_vendor, BROKER→is_broker)
- **T5** (1 test): CARRIER (non-legacy) does not trigger legacy projection
- **T6** (6 tests): Server action file has `use server`, exports 4 actions, uses `createAdminClient`

### 3.4 W1 Page Wiring — DEFERRED to X2.1

The HQ contacts page (`app/(dashboard)/hq/master/contacts/page.tsx`) is 700+ lines with complex form handling, entity code generation, safeUpsert fallback, and timeout management. Modifying it within X2 would risk:
- Breaking the existing form behavior
- Introducing subtle errors in the fallback path
- Requiring extensive regression testing

**Decision:** W1 wiring is deferred to a dedicated sub-phase **X2.1** that requires its own explicit authorization. The X2 scope includes only the service + server action + tests, which is sufficient to demonstrate X2's dual-write contract.

---

## 4. Preflight (TypeScript)

```
$ npx tsc --noEmit
(no output — 0 errors)
```

TypeScript compile: **CLEAN** across entire project.

---

## 5. Targeted Tests

### X2 suite

```
$ npx tsx _x2_run.test.ts
[PASS] X2-T1 through X2-T20 + sub-tests (23/23)
X2 total: 23/23 PASS
```

### X1 regression (unchanged behavior preserved)

```
$ npx tsx _x1_run.test.ts
[PASS] X1-T1 through X1-T20 (20/20)
X1 total: 20/20 PASS
```

No full regression run (per BR10 D14: "Full regression is NOT required at this phase").

---

## 6. Verification of Architectural Invariants

| Invariant | Verified |
|-----------|----------|
| Single authority (canonical write only via `PartyRoleService`) | YES — `RoleMutationService` delegates canonical write to `PartyRoleService`; no direct write to `party_roles` |
| Tenant derived server-side | YES — `resolveContext` uses `resolveTenantContext`; `tenantId` is required parameter |
| Validation against vocabulary | YES — `PARTY_ROLE_TYPES` and `PARTY_ROLE_CONTEXT_TYPES` |
| Idempotency | YES — `PartyRoleService.createRole` handles `ON CONFLICT (uq_party_role)` |
| Audit trail | YES — `AuditEntryX2` with `legacy_projection` status |
| Compensation log for failures | YES — separate `compensationLog` for X5 reconciliation |
| 4 legacy boolean mappings correct | YES — verified by X2-T12 tests |
| Non-legacy roles do not project | YES — `CARRIER` test (X2-T14) |
| W1/W2/W4 page unchanged | YES — only service + tests modified |
| No schema changes | YES — no migration, no DDL |
| No data changes | YES — no DML on production |
| `is_vendor` write only via service | YES — `md_entities.update` only in `projectLegacy()` |
| BR8 partial unique index intact | YES — no constraint/index modification |
| RLS intact | YES — `party_roles` and `md_entities` RLS preserved |
| Hard-stop on failure | YES — canonical failure throws, legacy failure throws, never partial state silently |

---

## 7. Risks / Open Decisions (carried forward)

| # | Risk/Decision | Severity | Deferred to |
|---|---------------|----------|--------------|
| 1 | W1 page wiring | HIGH | X2.1 (separate authorization) |
| 2 | True atomicity (single transaction) | MEDIUM | X-phase with DDL authorization (Postgres function) |
| 3 | W2 migration | HIGH | X3 |
| 4 | W4 migration | HIGH | X4 |
| 5 | Reconciliation job (uses compensation log) | MEDIUM | X5 |
| 6 | Reader migration | HIGH | X6–X10 |
| 7 | 3 special consumers | MEDIUM | Individual ADRs |
| 8 | Persistent audit table | LOW | X-phase with DDL |
| 9 | 12-criterion cutover | HIGH | X11 |
| 10 | Legacy deprecation/column removal | MEDIUM | X12, X13 |

---

## 8. Explicit Change Boundary

| Action | Status |
|--------|--------|
| Production schema changes | **NONE** |
| Production data changes | **NONE** |
| Migrations executed | **NONE** |
| DDL/DML | **NONE** |
| Application code changes | **YES** (role-mutation-service.ts extended with dual-write; 2 new files: role-mutation-actions.ts, x2-role-mutation-dual-write.test.ts) |
| W1 page modification | **NONE** (deferred to X2.1) |
| W2/W3/W4 modification | **NONE** (deferred to X3/X4) |
| Dual-write | **ACTIVATED IN SERVICE** (not yet called by any UI) |
| Reader migration | **NOT IMPLEMENTED** |
| Reconciliation | **NOT IMPLEMENTED** |
| Legacy columns | **UNCHANGED** (only the service writes them via dual-write path; existing W1/W2/W4 writers unchanged) |
| RLS | **UNCHANGED** |
| Indexes/constraints | **UNCHANGED** (BR8 index is latest authorized change) |
| Special consumers | **UNCHANGED** |
| ADR-070 Amendment | **RATIFIED** (unchanged) |
| ADR-077 | **RATIFIED** (unchanged) |
| Tests | X1 20/20 + X2 23/23 = 43/43 PASS; no full regression |
| X3 | **NOT STARTED** (requires separate authorization) |
| DATA-4E-BR11 | **NOT STARTED** |

The service-level dual-write is now functional but NOT yet wired to any UI. Existing W1/W2/W4 code paths continue to write `is_vendor` directly. When X2.1 wires W1 to the server action, the dual-write will become live for new vendor writes.

---

## 9. Final Verdict

# **GREEN — X2 Implementation Complete**

X2 (dual-write activation in the canonical role mutation service) is implemented and verified:

- `RoleMutationService.assignRole` and `revokeRole` now perform canonical + legacy writes.
- 4 legacy boolean mappings verified (CUSTOMER, SUPPLIER, VENDOR, BROKER).
- Non-legacy roles (CARRIER, AGENT, etc.) do not project.
- Compensation log records projection failures for X5 reconciliation.
- Server actions created in `lib/actions/role-mutation-actions.ts` with auth + tenant derivation.
- X2: 23/23 tests PASS.
- X1: 20/20 tests still PASS (regression).
- TypeScript compile clean.
- No schema/data changes.
- No W1/W2/W4 page modification (deferred to X2.1, X3, X4).

The dual-write is **service-ready but not yet UI-activated**. W1 page wiring requires X2.1 with its own authorization due to the page's complexity.

---

## 10. Hard-Stop Compliance

- No migration executed.
- No DDL performed.
- No DML on production data.
- No schema modified.
- No RLS modified.
- No index/constraint modified.
- W1 page NOT modified (deferred to X2.1).
- W2/W4 NOT modified.
- No dual-write activated in UI (service is ready but not yet called).
- No reader migration performed.
- No reconciliation job created.
- No special consumer changes.
- ADR-070 Amendment and ADR-077 status: RATIFIED (unchanged).
- BR8 index remains the latest authorized production change.
- X3 was **NOT** started (requires separate authorization).
- DATA-4E-BR11 was **NOT** started.

**Hard stop: COMPLIED.**

---

**END OF DATA-4E X2 IMPLEMENTATION REPORT**
