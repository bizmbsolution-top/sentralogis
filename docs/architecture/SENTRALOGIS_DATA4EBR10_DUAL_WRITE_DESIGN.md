# SENTRALOGIS — DATA-4E-BR10
# DUAL-WRITE DESIGN & AUTHORITY TRANSITION ARCHITECTURE

**Date:** 2026-09-02
**Phase:** DATA-4E-BR10
**Type:** READ-ONLY ARCHITECTURE / TECHNICAL DESIGN
**Depends on:** DATA-4E-BR3 → BR9
**Status:** DESIGN ONLY — NO IMPLEMENTATION

---

## 1. Executive Decision

| Item | Status |
|------|--------|
| Authority model | **DESIGNED** — `party_roles` canonical; `is_vendor` compatibility projection |
| Atomicity model | **RECOMMENDED** — Model A (application transaction) |
| Dual-write location | **RECOMMENDED** — `lib/domain/party/` canonical service (server-side) |
| Failure handling | **DESIGNED** — atomic rollback; reconcile if partial |
| Concurrency | **DESIGNED** — row-level lock + BR8 index |
| Drift strategy | **DESIGNED** — reconciliation job (NOT implemented) |
| Writer migration | **PLANNED** — W1 → W2 → W4 sequentially |
| Reader migration | **PLANNED** — 5-wave strategy |
| Special consumers | **CONFIRMED OUT OF SCOPE** — 3 individual ADRs required |
| Cutover readiness | **NOT READY** — 8/10 criteria unmet |
| Human architecture approval | **REQUIRED** (separate gate) |

**Verdict: YELLOW** — design decisions are coherent and evidence-based, but cutover readiness requires implementation phases that need separate explicit human authorization. No production changes were made.

---

## 2. Baseline Reuse

Reused from prior phases:

- **BR5/BR5R:** 62 canonical role rows; 0 drift at backfill; 16 VENDOR + 43 CUSTOMER + 3 SUPPLIER + 0 BROKER.
- **BR6:** authority = CONDITIONAL YES; cardinality = YES (partial index); transition = Model C → B.
- **BR7:** ADR-070 Amendment and ADR-077 RATIFIED.
- **BR8:** `idx_party_roles_global_unique` partial unique index ACTIVE.
- **BR9:** 36+ reader sites; 3 effective writers (W1/W2/W4); P0=0, P1=2, P2/P3≈25, P4=2, P5≈8; special consumers (3) confirmed OUT OF SCOPE.

---

## 3. Design Gate D1 — Authority Model

### 3.1 Target

```text
party_roles     = CANONICAL AUTHORITY (logical source of truth)
is_vendor       = LEGACY COMPATIBILITY PROJECTION (derived/synced, not independent)
```

### 3.2 Enforcement Location

**Selected: Application service layer + database transaction boundary.**

| Option | Evaluation |
|--------|------------|
| Application service | YES — single point of authority; testable; rollback-friendly |
| Database transaction | YES — atomic with canonical write; RLS preserved |
| Database trigger | REJECTED — couples schema to logic; hard to test; obscures data flow |
| Compatibility projection / derived read | REJECTED alone — no canonical write-side enforcement; combined with dual-write for transitional safety |

**Design:** A canonical role service (e.g., `lib/domain/party/role-mutation-service.ts`) is the SOLE entry point for vendor/role classification. Writers call this service. The service writes to `party_roles` (canonical) and projects to `is_vendor` (legacy) in one transaction. No independent write to `is_vendor` is permitted from the application.

**Single-authority guarantee:** If the application is the only writer, and all writes flow through the service, then there is exactly one authority. The legacy column is a maintained projection, not an independent source.

**Explicit rejection:** Any design where `is_vendor` and `party_roles` are independently writable is FORBIDDEN. This creates dual-authority and causes the drift the BR8 index cannot prevent.

---

## 4. Design Gate D2 — Write Path

### 4.1 Target Flow

```text
UI / API
   │
   ▼
Validation layer (form schema, business rules)
   │
   ▼
IdentityContext (server-derived tenant_id, actor)
   │
   ▼
Canonical Role Mutation Service
   │
   ├── BEGIN TRANSACTION
   │     ├── INSERT/UPDATE party_roles (canonical)
   │     │     (with NOT EXISTS guard or ON CONFLICT)
   │     └── UPDATE md_entities.is_vendor (compatibility projection)
   │   COMMIT
   │
   ▼
Audit log (actor, tenant, before/after, transaction_id)
   │
   ▼
Response to UI/API
```

### 4.2 Service Boundary

- New service: `lib/domain/party/role-mutation-service.ts` (or equivalent path).
- Public API:
  - `assignRole(tenantId, partyId, roleType, contextType, contextId, isActive)`
  - `revokeRole(tenantId, partyId, roleType, contextType, contextId)`
  - `syncCompatibility(tenantId, partyId)` (for reconciliation path; not dual-write)
- Internal helpers: tenant validation, idempotency check, audit emission.

### 4.3 Transaction Boundary

Single PostgreSQL transaction containing:
1. `INSERT INTO party_roles ... ON CONFLICT (uq_party_role) DO UPDATE` (canonical)
2. `UPDATE md_entities SET is_vendor = $1 WHERE id = $2 AND tenant_id = $3` (compatibility)

Both succeed or both fail.

### 4.4 Validation

- `tenantId` must match `IdentityContext.tenantId` (server-side).
- `partyId` must be a valid `md_entities.id` in the same tenant.
- `roleType` must be in the controlled vocabulary (`CUSTOMER`, `SUPPLIER`, `VENDOR`, `BROKER` for now).
- `contextType` must be `GLOBAL` for the legacy boolean migration.
- `isActive` defaults to `true`.

### 4.5 Tenant Derivation

**Server-controlled.** Tenant identity comes from `IdentityContext` (established pattern: `lib/domain/tenantContext.ts`, `lib/domain/customs/api-helper.ts`). Client-supplied `tenant_id` is NEVER trusted. RLS provides defense in depth.

### 4.6 Idempotency

- Repeated `assignRole` with the same parameters produces the same final state.
- `ON CONFLICT (uq_party_role) DO UPDATE` on the canonical write.
- Compatibility write is a simple UPDATE that overwrites the value (idempotent).
- A request ID (idempotency key) is recommended to prevent duplicate side effects on retry.

### 4.7 Role Activation/Deactivation

- `assignRole(isActive=true)` → insert/update canonical row with `is_active=true`; set legacy `is_vendor=true`.
- `revokeRole` → either DELETE canonical row (if permanently removing) or set `is_active=false`; set legacy `is_vendor=false`.
- Initial design: USE `is_active=false` for soft deactivation (preserves audit trail); DELETE only for explicit removal.

### 4.8 Duplicate Handling

- BR8 partial unique index prevents duplicate `(tenant, party, role, GLOBAL, NULL)` insertion.
- Application-level `ON CONFLICT (uq_party_role) DO UPDATE` handles contextual roles.
- Duplicate attempts are silently absorbed (idempotent) or surfaced as errors per idempotency key policy.

### 4.9 Authorization

- `U-02 assertPermission` for `commercial:manage` on mutations.
- Read access: `commercial:read`.
- Tenant isolation enforced by RLS (existing).
- Driver/fleet portal roles are out of scope for this transition.

---

## 5. Design Gate D3 — Dual-Write Atomicity Models

### 5.1 Model Comparison

| Criterion | A: App Transaction | B: DB Trigger | C: Derived Read |
|-----------|-------------------|---------------|------------------|
| **Atomicity** | STRONG (transaction-wrapped) | STRONG (trigger is part of write) | N/A (no write) |
| **Single authority** | YES (service is sole writer) | YES (trigger is sole projection) | WEAK (caller may bypass) |
| **Failure handling** | Clean rollback | Hard to detect/trap | N/A |
| **Concurrency** | Row-level lock on entity | DB lock on write | N/A |
| **Testability** | HIGH (service unit tests) | LOW (requires DB state) | N/A |
| **Rollback** | Standard transaction rollback | Disable trigger + backfill | N/A |
| **Existing writer compatibility** | MEDIUM (must refactor W1/W2/W4) | HIGH (writers unchanged) | HIGH (writers unchanged) |
| **Operational complexity** | MEDIUM | MEDIUM-HIGH (trigger maintenance) | LOW |
| **Migration risk** | MEDIUM | LOW (DB-only) | LOW |

### 5.2 Selected Model: **A (Application Transaction)**

**Rationale:**
- Single authority is preserved at the service layer.
- Atomicity is a standard transactional concern.
- Testability is highest with service-level unit tests.
- Rollback is standard transaction semantics.
- Existing writers require refactoring anyway (the BR5/BR6 analysis already identified them as needing change).

**Model B (DB trigger) is REJECTED because:**
- Triggers obscure data flow and are hard to test in isolation.
- They couple schema to business logic, violating the canonical principle.
- They prevent clean service-level audit logging.

**Model C (derived read) is REJECTED as standalone because:**
- It does not enforce single authority on writes (writers could still write to `is_vendor` directly).
- It requires all consumers to migrate before any legacy write is safe.

**Model A is RECOMMENDED with one concession:** the application service may emit a `compat_legacy_role_event` after commit, which a lightweight DB trigger (Model B complement) consumes to update `is_vendor` if the application write fails. This is a defense-in-depth pattern and is OPTIONAL. The PRIMARY mechanism is Model A.

---

## 6. Design Gate D4 — Failure Semantics

| Case | Behavior |
|------|----------|
| 1. canonical succeeds, compatibility fails | **ROLLBACK entire transaction**. Surface error. Do NOT commit canonical alone. |
| 2. compatibility succeeds, canonical fails | **ROLLBACK entire transaction**. Surface error. |
| 3. transaction aborts (e.g., constraint violation, timeout) | All changes rolled back automatically. Surface error with transaction_id. |
| 4. concurrent same-role writes | Row-level lock (`SELECT ... FOR UPDATE` on `md_entities` row). Loser waits, re-evaluates, retries idempotently. |
| 5. duplicate GLOBAL role attempt | BR8 partial unique index returns `23505`. Surface as user-friendly "vendor already assigned". No retry. |
| 6. tenant mismatch (caller tenantId ≠ entity tenantId) | RLS rejects query. Surface authorization error. No partial commit. |
| 7. role deactivation | `is_active=false` on canonical row; `is_vendor=false` on legacy. Idempotent. Soft delete preserved. |

**Critical principle:** The system MUST NEVER produce an "unknown authority state" where canonical and compatibility disagree. If a transaction cannot complete atomically, it must be fully rolled back and surfaced to the operator. Reconciliation is the safety net for historical drift, not an in-band recovery path.

---

## 7. Design Gate D5 — Concurrency

### 7.1 Race Scenarios

| Scenario | Prevention |
|----------|------------|
| W1 and W2 write same entity simultaneously | `SELECT ... FOR UPDATE` on `md_entities` row at transaction start |
| Admin UI and API write simultaneously | Same — transaction serialization per entity |
| Concurrent same-role writes (W1 same entity, different roles) | `party_roles` UNIQUE prevents GLOBAL duplicates; contextual roles have `uq_party_role` |
| Authority reversal (legacy write attempted after canonical) | Service is SOLE writer; any legacy write outside the service is a code defect (alert via monitoring) |
| Lost update | `SELECT ... FOR UPDATE` + idempotent `ON CONFLICT DO UPDATE` |

### 7.2 Lost Update Prevention

```sql
BEGIN;
  SELECT id FROM md_entities WHERE id = $1 AND tenant_id = $2 FOR UPDATE;
  -- (no other writer can proceed until COMMIT/ROLLBACK)
  INSERT INTO party_roles (...) ON CONFLICT (uq_party_role) DO UPDATE SET ...;
  UPDATE md_entities SET is_vendor = $3 WHERE id = $1 AND tenant_id = $2;
COMMIT;
```

### 7.3 BR8 Index Role

`idx_party_roles_global_unique` prevents duplicate canonical rows at the DB level. The application does NOT need to re-check for duplicates; the DB enforces it.

---

## 8. Design Gate D6 — Existing Writers

| Writer | Current Write | Canonical Replacement | Dual-Write Requirement | Migration Complexity | Risk |
|--------|---------------|----------------------|-------------------------|----------------------|------|
| **W1** HQ contacts (`app/(dashboard)/hq/master/contacts/page.tsx`) | `supabase.from('md_entities').insert({...is_vendor:...})` | `roleMutationService.assignRole({roleType:'VENDOR', contextType:'GLOBAL'})` | YES | MEDIUM — UI form refactor + service call | MEDIUM |
| **W2** Tenant contacts (`app/(dashboard)/tenant/master/contacts/page.tsx`) | Same as W1 | Same | YES | MEDIUM | MEDIUM |
| **W4** QuickAddContactModal (`app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx`) | `supabase.from('md_entities').insert({is_customer: true, is_vendor: true, ...})` | `roleMutationService.assignRole({roleType:'CUSTOMER'})` + `assignRole({roleType:'VENDOR'})` (two calls, one transaction) | YES | MEDIUM-HIGH — dual role on insert | MEDIUM |

**Decision:** All three writers (W1, W2, W4) MUST migrate to the canonical role mutation service. No writer remains legacy-only.

**W4 specifics:** The current code inserts with `is_customer: true, is_vendor: true` simultaneously. The canonical equivalent is two `assignRole` calls in one transaction.

**W3 (fleets display) is NOT a writer** — it's a derived display from `vendor_tenant_id`. No migration.

---

## 9. Design Gate D7 — Reader Migration Strategy

### 9.1 Wave Structure

| Wave | Targets | Entry Gate | Migration Rule | Rollback | Exit Gate |
|------|---------|------------|----------------|----------|-----------|
| **Wave 0** | Instrumentation | Dual-write active in W1/W2/W4 | Add canonical-query helper; do not change reads | Disable helper; revert to legacy | Canonical query returns same result as legacy for ≥1 week |
| **Wave 1** | P1 (assignment.ts, assignmentSave.ts) | Wave 0 GREEN; "is_vendor" adapter designed | Replace `is_vendor` reads with canonical `EXISTS` query via `resolveVendorRole()` adapter | Revert to legacy read; flag adapter as broken | P1 functions produce same outputs for ≥1 week; no business rule regression |
| **Wave 2** | P2/P3 (~25 sites) | Wave 1 GREEN | Replace `.eq('is_vendor', true/false)` with canonical EXISTS subquery | Revert to legacy; flag site | All P2/P3 sites return same results for ≥2 weeks |
| **Wave 3** | P4 (2 reporting sites) | Wave 2 GREEN | Same rule; reporting tolerance is higher | Revert; report accepted | Reports match for ≥2 weeks |
| **Wave 4** | P5 (~8 UI sites) | Wave 3 GREEN | Same rule; cosmetic only | Revert; cosmetic | UI labels correct for ≥1 week |
| **Wave 5** | Zero-consumer proof | Wave 4 GREEN | Search for `is_vendor` references in production code; must be 0 | Identify any remaining | Zero `is_vendor` reads in production code path |

### 9.2 Adapter Pattern (Wave 1)

For P1 readers, introduce `resolveVendorRole(partyId, tenantId)` that returns the canonical vendor status:

```ts
async function resolveVendorRole(partyId: string, tenantId: string): Promise<boolean> {
  const { data } = await supabase
    .from('party_roles')
    .select('id')
    .eq('party_id', partyId)
    .eq('tenant_id', tenantId)
    .eq('role_type', 'VENDOR')
    .eq('context_type', 'GLOBAL')
    .is('context_id', null)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}
```

The adapter is used in `assignment.ts` and `assignmentSave.ts` to replace the `resolveIsVendor(transporter, driverEntity?.is_vendor)` function. The P1 wave does NOT remove the old function; both work in parallel. Only after Wave 5 zero-consumer proof is the legacy function removed.

### 9.3 P0 Consumers

None. P0 = 0 per BR9. No security/authorization consumer reads `is_vendor` directly.

### 9.4 Special Consumers (P1+ separate)

Wave 1 does NOT migrate:
- `assignment.ts:282` derived `is_vendor: !isActuallyOwn` (it uses the input `is_vendor` flag, but the actual decision is `!isActuallyOwn` which combines `is_vendor`, `vendor_type`, `is_own`, and name heuristics).
- `cost-audit:432` (`vendor_type`).
- `fleet-status:101` (`vendor_tenant_id`).

These require separate ADRs per ADR-077 §10.

---

## 10. Design Gate D8 — Semantic Query Contract

### 10.1 Canonical Vendor-Role Query

```sql
SELECT EXISTS (
  SELECT 1 FROM public.party_roles
  WHERE party_id = $1
    AND tenant_id = $2
    AND role_type = 'VENDOR'
    AND context_type = 'GLOBAL'
    AND context_id IS NULL
    AND is_active = TRUE
) AS is_vendor;
```

### 10.2 Distinctions

| Concept | Source | Equivalent to VENDOR? |
|---------|--------|----------------------|
| `is_vendor = TRUE` | legacy boolean | YES (target equivalence) |
| `party_roles.VENDOR, GLOBAL, is_active=TRUE` | canonical | YES (direct) |
| `party_roles.VENDOR, GLOBAL, is_active=FALSE` | canonical | NO (inactive) |
| `party_roles.VENDOR, ENGAGEMENT` | canonical | NO (contextual, not global) |
| `assignment.ts is_vendor: !isActuallyOwn` | derived | NO (fleet ownership classification) |
| `vendor_tenant_id IS NOT NULL` | operational | NO (cross-tenant relationship) |
| `vendor_type` (free text) | leg classifier | NO (leg type, not party role) |
| Historical vendor (was vendor, no longer) | legacy | NO (current state) |

**Critical:** The canonical query distinguishes currently-active vendor, historical vendor, contextual vendor, and derived classifications. The legacy `is_vendor` collapses all of these into one boolean. The migration must NOT conflate these.

---

## 11. Design Gate D9 — Drift Detection

### 11.1 Reconciliation Mechanism (DESIGNED, NOT implemented)

A reconciliation job runs periodically (e.g., every 6 hours) to detect drift:

| Drift Event | Comparison | Severity | Alert | Remediation |
|-------------|------------|----------|-------|-------------|
| `is_vendor = TRUE`, canonical VENDOR missing | legacy → canonical | HIGH | YES | Insert canonical row (compatibility → authority) |
| `is_vendor = FALSE`, canonical VENDOR active | canonical → legacy | HIGH | YES | Set `is_vendor = false` (canonical → compatibility) |
| `is_vendor = FALSE`, canonical VENDOR active but `is_active = false` | canonical inactive | LOW | NO (intentional soft-deactivation) | None — wait for canonical reactivation |
| Canonical VENDOR, `is_vendor = FALSE` | canonical → legacy | HIGH | YES | Set `is_vendor = true` |
| Inactive canonical role, `is_vendor = TRUE` | n/a (canonical says inactive) | LOW | NO (intentional) | None |
| Tenant mismatch (canonical.tenant_id ≠ entity.tenant_id) | canonical | CRITICAL | YES | HALT; forensic review |
| Orphan canonical role (party_id not in md_entities) | canonical | HIGH | YES | Investigate; do not auto-delete |
| Duplicate GLOBAL role | BR8 index | CRITICAL | YES | Already prevented at insert time |

### 11.2 Critical Principle

> **Reconciliation may repair compatibility state but MUST NOT promote `is_vendor` back to authority.**

If reconciliation finds `is_vendor = TRUE` and canonical VENDOR missing, it MAY insert the canonical row (to make them agree). It MUST NOT interpret `is_vendor` as the source of truth — it treats the canonical as the authority and the legacy as a projection that needs to be brought into agreement.

### 11.3 Comparison Key

```sql
SELECT e.id, e.tenant_id,
  e.is_vendor AS legacy,
  EXISTS (
    SELECT 1 FROM party_roles pr
    WHERE pr.party_id = e.id
      AND pr.tenant_id = e.tenant_id
      AND pr.role_type = 'VENDOR'
      AND pr.context_type = 'GLOBAL'
      AND pr.context_id IS NULL
      AND pr.is_active = TRUE
  ) AS canonical
FROM md_entities e
WHERE e.is_vendor = TRUE
   OR EXISTS (
     SELECT 1 FROM party_roles pr
     WHERE pr.party_id = e.id
       AND pr.tenant_id = e.tenant_id
       AND pr.role_type = 'VENDOR'
       AND pr.context_type = 'GLOBAL'
       AND pr.context_id IS NULL
       AND pr.is_active = TRUE
   );
```

### 11.4 Frequency and Audit

- Frequency: every 6 hours (configurable).
- Audit: each run produces a report (counts, drift events, remediation actions).
- Alert threshold: >0 drift events of HIGH/CRITICAL severity triggers PagerDuty/email.
- Remediation authority: automatic repair for HIGH/CRITICAL is RECOMMENDED; CRITICAL may require human review.

---

## 12. Design Gate D10 — Rollback Strategy

### 12.1 Rollback Principle

> **Rollback does NOT mean "make is_vendor canonical again".**
> **Rollback means: stop the transition, retain party_roles authority, restore compatibility behavior.**

### 12.2 Rollback Triggers

| Stage | Rollback Trigger | Action |
|-------|------------------|--------|
| Dual-write activation | >5% dual-write transaction failures over 1 hour | Disable service write path; revert W1/W2/W4 to legacy-only temporarily; investigate |
| Wave 1 | P1 adapter produces incorrect business outcome (e.g., wrong assignment) | Revert Wave 1 adapter; restore legacy `is_vendor` read in `assignment.ts`/`assignmentSave.ts` |
| Wave 2 | ≥3 P2/P3 sites report incorrect filtering | Revert affected sites; investigate |
| Wave 3 | Reports show inconsistent data | Revert Wave 3; investigate |
| Wave 4 | UI labels incorrect | Revert Wave 4; cosmetic only |
| Zero-consumer proof | Any consumer still reads `is_vendor` | Do NOT declare success; continue Wave 5 |

### 12.3 Rollback Procedure

1. **Stop the transition:** disable the migration wave's adapter/service.
2. **Restore compatibility:** if a service write was failing, ensure W1/W2/W4 still write `is_vendor` directly (legacy path).
3. **Investigate:** forensic review of what went wrong.
4. **Communicate:** notify operators of rollback.
5. **Re-plan:** do not re-attempt until root cause is identified and fixed.

### 12.4 Rollback Constraints

- The BR8 partial unique index CANNOT be rolled back (it is additive; rolling back would leave a gap in canonical integrity).
- The canonical data (`party_roles`) is NOT modified by rollback.
- The legacy data (`is_vendor`) is NOT modified by rollback.
- Only the migration wave's adapter/service code is reverted.

---

## 13. Design Gate D11 — Authority Cutover

### 13.1 Cutover Criteria

Before `party_roles` is declared explicitly canonical AND `is_vendor` is declared non-authoritative, ALL of the following MUST be satisfied:

| # | Criterion | Current Status | Evidence |
|---|-----------|----------------|----------|
| 1 | All direct writers identified | **MET** | BR9 §4 (W1, W2, W4) |
| 2 | All writers use canonical path | **NOT MET** | No dual-write implemented |
| 3 | Compatibility projection verified | **NOT MET** | Not implemented |
| 4 | Reconciliation repeatedly GREEN | **NOT MET** | No reconciliation job |
| 5 | Zero unexplained drift | **NOT MET** | No drift detection |
| 6 | P0/P1 readers migrated | **NOT MET** | P0=0 (none), P1 not started |
| 7 | P2/P3 migration complete | **NOT MET** | Not started |
| 8 | P4/P5 classified/migrated | **NOT MET** | Not started |
| 9 | Special consumers resolved | **NOT MET** | 3 separate ADRs required |
| 10 | Zero production writes bypass canonical authority | **NOT MET** | W1/W2/W4 still write legacy only |
| 11 | Rollback procedure validated | **NOT MET** | Designed, not exercised |
| 12 | Explicit human authorization obtained | **NOT MET** | Not requested |

**Cutover status: NOT READY.** 11 of 12 criteria unmet.

### 13.2 Cutover Definition

"Cutover" means:
- ADR-070 Amendment and ADR-077 are formally re-stated as the binding architecture.
- `is_vendor` is formally labeled `NON-AUTHORITATIVE / DEPRECATED / DERIVED_PROJECTION` in the database comment.
- A SQL view `md_entities_v` exposes `is_vendor` as a derived projection for backward compatibility.
- Application code reads from canonical only.
- Writes go through the canonical service only.
- Legacy column is read-only (or write-prohibited via trigger; not yet designed).

### 13.3 Pre-Cutover Evidence

Evidence required before cutover can be requested:

1. Reconciliation job running for ≥2 weeks with 0 HIGH/CRITICAL drift events.
2. Dual-write active in W1/W2/W4 for ≥2 weeks with 0 transaction failures.
3. Wave 1 (P1) migration active for ≥2 weeks with 0 business rule regressions.
4. Wave 2 (P2/P3) migration complete for ≥2 weeks.
5. Wave 3 (P4) and Wave 4 (P5) migration complete.
6. Wave 5 zero-consumer proof passed.
7. 3 special consumer ADRs ratified and their migrations complete.
8. Rollback procedure documented and reviewed.

---

## 14. Design Gate D12 — Legacy Column Future

### 14.1 Lifecycle States

| State | Permitted Writes | Permitted Reads | Authority | Gate to Next State |
|-------|------------------|-----------------|-----------|---------------------|
| **ACTIVE** | YES (current writers) | YES (current consumers) | SOLE (de facto) | Dual-write activation in W1/W2/W4 |
| **TRANSITIONAL** | YES (dual-write) + via service | YES (parallel) | COMPATIBILITY PROJECTION (canonical is authority) | Wave 5 zero-consumer proof |
| **NON-AUTHORITATIVE** | NO (write-prohibited) | YES (view) | NONE (column is derived) | All consumers migrated; view stable ≥1 month |
| **DEPRECATED** | NO | NO (view absorbs) | NONE | Database comment added; ≥1 quarter after non-authoritative |
| **REMOVED** | N/A (column dropped) | N/A | N/A | Migration removes column; all consumers confirmed via view |

### 14.2 Current State

`is_vendor` is currently **ACTIVE** per the legacy application's de facto authority.

### 14.3 Transition Trigger

State changes require explicit human authorization per state. Each state is documented in AGENTS.md when entered.

---

## 15. Design Gate D13 — Special Consumers

### 15.1 `cost-audit` — `vendor_type`

**Source:** `app/api/forwarding/order-header/route.ts` uses `vendor_type` as a leg-type classifier (e.g., `'trucking_origin'`, `'shipping_line'`, `'trucking_dest'`, `'trucking_own'`).

**Verdict:** This is a leg-type classification within the forwarding order-header context. It is NOT a party role. It belongs to a different domain (forwarding leg semantics).

**Treatment:** OUT OF SCOPE. No migration to `party_roles`. If leg-type classification needs canonicalization, a separate ADR is required.

### 15.2 `assignment.ts:282` — `is_vendor: !isActuallyOwn`

**Source:** `lib/domain/jo/assignment.ts:236-285` derives `is_vendor` from `t.is_vendor`, `t.vendor_type`, `t.is_own`, and name heuristics.

**Verdict:** This is a fleet-OWNERSHIP classification (internal vs external fleet for assignment), not a vendor role. The `is_vendor` output is a derived field name, not a direct read of the `is_vendor` boolean.

**Treatment:** OUT OF SCOPE. No migration to `party_roles.VENDOR`. The P1 wave replaces the input `t.is_vendor` read with canonical (so the heuristic is fed canonical data), but the `is_vendor: !isActuallyOwn` output remains. A separate ADR is required if the assignment logic needs redesign.

### 15.3 `fleet-status` — `vendor_tenant_id`

**Source:** `app/api/fleet-status/route.ts` uses `vendor_tenant_id` to identify cross-tenant vendor fleets.

**Verdict:** This is a cross-tenant vendor relationship, not a party boolean. It is a different domain (fleet ownership across tenants).

**Treatment:** OUT OF SCOPE. No migration to `party_roles`. A separate ADR is required if cross-tenant vendor relationships need canonicalization.

---

## 16. Design Gate D14 — Test Strategy

### 16.1 Test Categories (DESIGNED, NOT executed)

| Category | Tests |
|----------|-------|
| Canonical write | create GLOBAL VENDOR; activate; deactivate; repeated idempotent; multi-role (CUSTOMER + VENDOR) |
| Cardinality | duplicate GLOBAL role rejected (BR8 index); contextual role unaffected; party with GLOBAL VENDOR cannot have second GLOBAL VENDOR |
| Compatibility | canonical change produces expected legacy projection; projection failure rolls back transaction; legacy change attempted outside service is rejected |
| Tenant isolation | cross-tenant write rejected; cross-tenant read rejected; canonical.tenant_id mismatch is impossible (server-derived) |
| Concurrency | concurrent same-role writes serialize correctly; concurrent role state changes; `SELECT ... FOR UPDATE` prevents lost update |
| Drift | simulated `is_vendor=TRUE` without canonical row detected; simulated canonical row without `is_vendor=TRUE` detected; reconciliation repairs compatibility without promoting legacy |
| Reader migration | canonical query returns expected result; P1 adapter produces same business outcome as legacy |

### 16.2 Test Constraints

- Full regression is NOT required for this design.
- Tests are targeted at the role mutation service and the reconciliation job.
- The BR8 index and `party_roles` schema are assumed correct; no schema tests.

---

## 17. Design Gate D15 — Observability

### 17.1 Required Metrics

| Metric | Source | Alert Condition |
|--------|--------|-----------------|
| Dual-write transaction failures | service logs | >0 in 5 min |
| Cardinality violations | DB error log | >0 (should be impossible) |
| Drift events HIGH/CRITICAL | reconciliation output | >0 per run |
| Reconciliation drift count | reconciliation output | >0.1% of vendor population |
| `is_vendor` writes outside service | DB trigger (if added) | >0 |
| Reader migration coverage | static analysis | <100% post-Wave 5 |
| Party-role write audit trail | service audit log | completeness = 100% |
| Cross-tenant write attempts | RLS denial log | >10/min (potential attack) |

### 17.2 Audit Trail

Every canonical role mutation records:
- `actor_id` (user/service)
- `tenant_id`
- `party_id`
- `role_type`
- `context_type`, `context_id`
- `action` (assign/revoke/activate/deactivate)
- `before` and `after` values
- `timestamp`
- `transaction_id`
- `source` (UI/API/job/import)

This audit is mandatory for forensic review and reconciliation.

---

## 18. Design Gate D16 — Implementation Sequencing

### 18.1 Proposed Sequence

```text
BR10 (this report) — Design
   ↓
Human architecture approval (REQUIRED, separate gate)
   ↓
Implementation authorization (REQUIRED, separate gate)
   ↓
Phase X1: Canonical Role Mutation Service
   ↓
Phase X2: Dual-write in W1 (HQ contacts)
   ↓
Phase X3: Dual-write in W2 (Tenant contacts)
   ↓
Phase X4: Dual-write in W4 (QuickAddContactModal)
   ↓
Phase X5: Reconciliation Job
   ↓
Phase X6: P1 Reader Migration (Wave 1)
   ↓
Phase X7: P2/P3 Reader Migration (Wave 2)
   ↓
Phase X8: P4 Reader Migration (Wave 3)
   ↓
Phase X9: P5 Reader Migration (Wave 4)
   ↓
Phase X10: Zero-Consumer Proof (Wave 5)
   ↓
Phase X11: Authority Cutover (with explicit human authorization)
   ↓
Phase X12: Legacy Deprecation
   ↓
Phase X13: Column Removal
```

Each phase requires its own explicit human authorization gate. The sequence is RECOMMENDED; deviations require architecture review.

### 18.2 Phase Dependencies

- X1 must complete before X2/X3/X4.
- X2, X3, X4 can run in parallel (independent writers) or sequentially.
- X5 should run continuously from X4 onward.
- X6 depends on X2/X3/X4 (P1 readers depend on canonical being authoritative).
- X7 depends on X6 (P2/P3 depend on P1 pattern proven).
- X8 depends on X7.
- X9 depends on X8.
- X10 depends on X9.
- X11 depends on X10 + evidence criteria.
- X12 depends on X11.
- X13 depends on X12.

---

## 19. Decision Matrix

| Decision | Recommendation | Evidence | Status |
|----------|----------------|----------|--------|
| **Authority** | `party_roles` canonical; `is_vendor` compatibility projection | ADR-070 Amendment + ADR-077 (RATIFIED) | DESIGNED |
| **Atomicity model** | Model A (application transaction) | BR10 §5.1 evaluation; testability + atomicity | RECOMMENDED |
| **Dual-write location** | `lib/domain/party/` canonical service | ADR-077 §7 transition; D1 above | RECOMMENDED |
| **Failure handling** | Atomic rollback; never partial state | D4 above; D5 concurrency | DESIGNED |
| **Concurrency** | Row-level lock + BR8 index + ON CONFLICT | D5 above; BR8 index | DESIGNED |
| **Drift detection** | Reconciliation job (not implemented) | D9 above; BR9 §12 | DESIGNED (NOT implemented) |
| **Writer migration** | W1, W2, W4 → canonical service | D6 above; BR9 §4 | PLANNED |
| **Reader migration** | 5-wave strategy (P1→P2/P3→P4→P5→zero-proof) | D7 above; BR9 §5 | PLANNED |
| **Special consumers** | 3 OUT OF SCOPE; individual ADRs | D13 above; BR9 §9 | CONFIRMED |
| **Rollback** | Stop transition, retain authority, restore compatibility | D10 above | DESIGNED |
| **Cutover criteria** | 12-criterion checklist | D11 above | NOT READY (11/12 unmet) |
| **Legacy lifecycle** | ACTIVE → TRANSITIONAL → NON-AUTHORITATIVE → DEPRECATED → REMOVED | D12 above | DESIGNED |

---

## 20. Risks / Open Decisions

| # | Risk/Decision | Severity | Required Action |
|---|---------------|----------|------------------|
| 1 | Dual-write atomicity in distributed scenarios | HIGH | Single-DB transaction is sufficient (single Supabase instance) |
| 2 | W4 dual role insert (CUSTOMER + VENDOR) | MEDIUM | Service must support multi-role call within one transaction |
| 3 | 3 special consumers require separate ADRs | MEDIUM | 3 parallel ADR processes |
| 4 | P1 adapter must preserve assignment.ts business logic | HIGH | Wave 1 must run in parallel with legacy for ≥1 week |
| 5 | Reconciliation repair of compatibility (not authority) | MEDIUM | Design enforces direction: canonical → legacy only |
| 6 | BR8 index cannot be rolled back | LOW | Acceptable; index is additive and correct |
| 7 | IdentityContext preservation during transition | MEDIUM | Service must continue to derive tenant from server context |
| 8 | Performance of canonical EXISTS query in hot paths | MEDIUM | BR8 index covers tenant_id, party_id, role_type; can be optimized with composite indexes if needed |

---

## 21. Explicit Change Boundary

| Action | Status |
|--------|--------|
| Production schema changes | **NONE** |
| Production data changes | **NONE** |
| Migrations executed | **NONE** |
| DDL/DML | **NONE** |
| Application code changes | **NONE** |
| Dual-write | **NOT IMPLEMENTED** |
| Reader migration | **NOT IMPLEMENTED** |
| Reconciliation | **NOT IMPLEMENTED** |
| Legacy columns | **UNCHANGED** |
| RLS | **UNCHANGED** |
| Indexes/constraints | **UNCHANGED** (BR8 index is latest authorized change) |
| Tests executed | **NO FULL REGRESSION** |
| Special consumers | **UNCHANGED** |
| ADR-070 Amendment | **RATIFIED** (unchanged from prior phase) |
| ADR-077 | **RATIFIED** (unchanged from prior phase) |

---

## 22. Final Verdict

# **YELLOW — DESIGN DECISIONS REQUIRED**

The architecture is coherent and evidence-based. All 16 design gates (D1–D16) have recommendations. The decision matrix is complete.

However, the design is NOT yet executable. Multiple decisions require explicit human authorization:

1. **Human architecture approval** of the BR10 design.
2. **Implementation authorization** for Phase X1 (canonical role mutation service).
3. Per-phase authorization for X2–X13.

Until the human architecture approval is provided, the design remains a design document. The current state of `is_vendor` as transitional legacy and `party_roles` as canonical schema (BR8 index in place) is the status quo.

The next required action is: **Human architecture approval of the BR10 design**, via a separate explicit authorization statement. No implementation is implied by this report.

---

## 23. Hard-Stop Compliance

- No migration executed.
- No DDL performed.
- No DML performed.
- No schema modified.
- No data modified.
- No application code modified.
- No tests modified.
- No dual-write implemented.
- No reader migration performed.
- No reconciliation job created.
- No legacy column changes.
- No RLS changes.
- No index/constraint changes.
- No special consumer changes.
- No ADR-070 Amendment or ADR-077 modifications.
- BR8 index remains the latest authorized production change.
- DATA-4E-BR11 was **NOT** started.

**Hard stop: COMPLIED.**

---

**END OF DATA-4E-BR10 REPORT**
