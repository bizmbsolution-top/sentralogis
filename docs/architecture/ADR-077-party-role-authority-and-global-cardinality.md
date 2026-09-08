# ADR-077 — Party Role Authority & Global Cardinality

**Status:** RATIFIED (2026-09-02, DATA-4E-BR8 human ratification)
**Ratified by:** Human project owner, 2026-09-02
**Implementation authorization:** NOT GRANTED (separate gate required)
**Date:** 2026-09-02
**Depends on:** ADR-070 (Canonical Party Role Architecture), migration 035 (party_role_foundation), migration 038 (party_role_backfill)
**Supersedes:** None
**Related:** ADR-070 Amendment (Global Role Cardinality)

---

## Context

DATA-4E-BR4, BR4R, BR5, BR5R, and BR6 established that:

- `party_roles` is deployed and populated (62 GLOBAL roles: 43 CUSTOMER + 3 SUPPLIER + 16 VENDOR + 0 BROKER).
- Legacy boolean fields (`is_customer`, `is_supplier`, `is_vendor`, `is_broker`) on `md_entities` remain structurally writable and authoritative for all current application consumers.
- The current UNIQUE constraint `uq_party_role (tenant_id, party_id, role_type, context_type, context_id)` does NOT prevent duplicate `(tenant, party, role, GLOBAL, NULL)` rows because PostgreSQL UNIQUE semantics treat `NULL` as distinct from `NULL`.
- Migration 038's `NOT EXISTS` guard was the sole protection during backfill; it is migration-level only and has a concurrency race window.
- Legacy boolean drift risk is HIGH: any new UI vendor write immediately desynchronizes legacy from canonical.

The data integrity of the 038 backfill is GREEN (0 missing, 0 extra, 0 duplicates, 0 cross-tenant, 0 orphan). However, the architectural authority question and the GLOBAL cardinality enforcement question remain unresolved.

## Problem Statement

Two architectural questions must be formalized:

1. **Authority:** Which source is canonical for CUSTOMER, SUPPLIER, VENDOR, and BROKER classification — `md_entities.is_*` boolean flags or `party_roles`?
2. **Cardinality:** How must "at most one GLOBAL role of a given `role_type` per `(tenant_id, party_id)`" be enforced — application-side `NOT EXISTS` or database constraint?

Both questions are decision-ready and can be formalized as architecture decisions.

## Current State

| Aspect | Status |
|--------|--------|
| `party_roles` schema | Deployed (migration 035) |
| `party_roles` data | 62 GLOBAL rows (migration 038) |
| `party_roles` RLS | Enabled with tenant isolation |
| `party_roles` application usage | NONE (consumer migration not performed) |
| Legacy `md_entities.is_*` booleans | Writable, authoritative for all current consumers |
| Drift risk | HIGH (any new write desynchronizes) |
| Cardinality DB enforcement | NONE (uq_party_role insufficient for NULL context_id) |
| Cardinality application enforcement | Migration-level only (038's NOT EXISTS) |

## Decision

### Decision 1 — Canonical Role Authority

**`party_roles` is the canonical source of truth for the four GLOBAL role types: CUSTOMER, SUPPLIER, VENDOR, BROKER.**

Deployment and backfill (migrations 035, 038) did NOT by themselves make `party_roles` authoritative. **This ADR is what establishes the architectural decision.** Until this ADR is ratified, `party_roles` is structurally present but not architecturally authoritative.

The legacy boolean fields on `md_entities` are TRANSITIONAL / COMPATIBILITY fields. They are NOT a second authority. During the transition period they are maintained via dual-write; after the transition they become derived projections or are removed.

### Decision 2 — Role Semantics (Multi-Role)

A single party MAY hold multiple GLOBAL role types simultaneously. Examples:

```text
Party A: CUSTOMER + SUPPLIER
Party B: CUSTOMER + VENDOR
```

There is NO exclusivity between role types. The UNIQUE constraint permits multiple role rows per `(tenant, party)` as long as `role_type` differs.

The same party MAY have at most one row per `(tenant, party, role_type, context_type, context_id)` — i.e., uniqueness is per-role-type, not per-party.

### Decision 3 — GLOBAL Role Semantics

`context_type = 'GLOBAL'` with `context_id IS NULL` means:

> The role applies to the party at tenant-global scope, not bound to any specific engagement, order, or contract.

This is the canonical classification form for party-level roles (CUSTOMER, SUPPLIER, VENDOR, BROKER, CARRIER, AGENT). It is distinct from contextual roles (ENGAGEMENT, ORDER, CONTRACT) which are scoped to a specific `context_id`.

### Decision 4 — GLOBAL Cardinality Invariant

For a given `(tenant_id, party_id, role_type)`, there may be AT MOST ONE row where `context_type = 'GLOBAL'` and `context_id IS NULL`.

Formally:

```text
UNIQUE (tenant_id, party_id, role_type)
WHERE context_type = 'GLOBAL'
  AND context_id IS NULL
```

This invariant is currently enforced by migration 038's `NOT EXISTS` guard. That guard is:
- Migration-level (not reusable)
- Race-prone under concurrent writers
- Not authoritative for future writers

The invariant MUST be enforced at the database level via a **PostgreSQL partial unique index**. The partial index is additive (does not modify `uq_party_role`).

### Decision 5 — Existing `uq_party_role` Limitation

The existing `uq_party_role UNIQUE (tenant_id, party_id, role_type, context_type, context_id)` remains useful for CONTEXTUAL role uniqueness (ENGAGEMENT/ORDER/CONTRACT rows) where `context_id IS NOT NULL`. It does NOT enforce GLOBAL uniqueness because:

- `context_id IS NULL` permits multiple NULL values under PostgreSQL UNIQUE semantics.
- A GLOBAL row is uniquely identified by `(tenant_id, party_id, role_type, context_type='GLOBAL', context_id=NULL)`. The existing constraint cannot distinguish two such rows.

**No change to `uq_party_role` is proposed.** The partial unique index is ADDITIVE.

### Decision 6 — Legacy Boolean Authority

| Field | Current Status | Target Status |
|-------|----------------|----------------|
| `is_customer` | TRANSITIONAL / COMPATIBILITY | NON-AUTHORITATIVE (derived view or removed) |
| `is_supplier` | TRANSITIONAL / COMPATIBILITY | NON-AUTHORITATIVE (derived view or removed) |
| `is_vendor` | TRANSITIONAL / COMPATIBILITY | NON-AUTHORITATIVE (derived view or removed) |
| `is_broker` | TRANSITIONAL / COMPATIBILITY | NON-AUTHORITATIVE (derived view or removed) |

The legacy booleans are NOT deprecated by this ADR. Deprecation requires:
- Dual-write implementation
- Reader migration to `party_roles`
- Zero-consumer proof
- Separate deprecation decision

### Decision 7 — Dual-Write Strategy

During the transition, the 4 active writer sites (HQ contacts, Tenant contacts, HQ fleets, QuickAddContactModal) MUST maintain semantic synchronization between:
- `md_entities.is_*` boolean
- `party_roles` row (with `context_type='GLOBAL'`, `context_id=NULL`)

Dual-write is REQUIRED because:
- New UI writes will create a legacy `is_vendor=TRUE` immediately. Without a canonical INSERT, the new vendor is invisible to consumers that have migrated to `party_roles`.
- Existing readers still read from legacy booleans. Removing the legacy write before reader migration breaks them.

Dual-write EXIT criterion: when ALL readers (P0–P5) have migrated to `party_roles`, legacy writes may stop.

Dual-write FAILURE HANDLING: conceptually, the legacy write and canonical write should occur in the same transaction. If one fails, both should fail to maintain consistency. This requires implementation-level design (separate decision).

### Decision 8 — Writer Migration Order

Recommended writer sequence:

```text
1. ADR ratification (ADR-077 + ADR-070 amendment)
2. DB cardinality enforcement (partial unique index)
3. Drift reconciliation (verify legacy TRUEs have canonical rows)
4. Writer migration / dual-write (4 writer sites)
5. Reader migration (P0 → P5)
```

Writer migration MUST precede reader migration. If readers migrate first and writers still write to legacy only, consumers will see stale data.

### Decision 9 — Reader Migration Strategy

Existing 78+ readers (per DATA-4E-B) must eventually consume `party_roles` as canonical authority. Priority classification:

| Priority | Consumer Type | Risk |
|----------|---------------|------|
| P0 | Security / authorization | CRITICAL if exists |
| P1 | Business-rule enforcement | HIGH |
| P2 | Transactional writers | MEDIUM |
| P3 | Operational consumers | MEDIUM |
| P4 | Reporting / analytics | LOW |
| P5 | UI / convenience | LOW |

Reader migration is phased from P0 (highest risk) to P5 (lowest risk). This ADR does not implement reader migration; it establishes the principle.

### Decision 10 — Special Consumer Safety

Three consumers identified by DATA-4E-BR6 must NOT be automatically treated as direct `is_vendor` consumers:

| Consumer | Reason | Treatment |
|----------|--------|-----------|
| `cost-audit:432` | Uses `vendor_type` free-text semantics, not `is_vendor` | Separate decision; do not automatically replace |
| `assignment.ts:282` | Derives "VENDOR = NOT own-fleet" — business rule, not direct role lookup | Separate decision; requires reimplementation |
| `fleet-status:101` | Uses `vendor_tenant_id` (cross-tenant pattern), not `is_vendor` | OUT OF SCOPE for this transition |

These consumers must be analyzed and migrated INDIVIDUALLY in a separate design phase.

### Decision 11 — Tenant / Security

`party_roles` does NOT introduce new tenant isolation requirements. Existing invariants are preserved:

- `tenant_id` authority: server-derived (IdentityContext)
- RLS: `tenant_id = get_my_tenant_id()`
- No client-controlled tenant identity
- Cross-tenant role access: prevented by RLS

The partial unique index must include `tenant_id` as the first column to preserve tenant-local uniqueness (not cross-tenant).

## Eight-Stage Transition

| Stage | Objective | Prerequisite | Exit Condition | Hard-Stop Condition |
|-------|-----------|--------------|----------------|----------------------|
| 1 | ADR-077 + ADR-070 amendment ratification | None | Both ADRs ratified by human | Ratification fails |
| 2 | Partial unique index deployment | Stage 1 | Index created and verified via `information_schema` | Index creation fails |
| 3 | Drift reconciliation | Stage 2 | All legacy TRUEs have matching canonical rows | Drift count > 0 after reconciliation job |
| 4 | Dual-write implementation | Stage 3 | All 4 writer sites update both sources | Any writer cannot be safely dual-written |
| 5 | Reader migration (P0 → P5) | Stage 4 | All 78+ readers consume `party_roles` | Reader breaks business rule |
| 6 | Legacy deprecation (derived views) | Stage 5 | Legacy booleans become SQL views or stop-written | Consumer still reads legacy |
| 7 | Zero-consumer proof | Stage 6 | Zero references to legacy booleans in code | Any consumer found |
| 8 | Column removal | Stage 7 | Separate decision and execution | n/a (final stage) |

Each stage requires explicit human authorization before proceeding.

## Consequences

✓ `party_roles` becomes the single source of truth for GLOBAL role classification.
✓ DB-level cardinality invariant prevents duplicate GLOBAL roles under concurrency.
✓ Existing `uq_party_role` remains useful for contextual roles.
✓ ADR-070 amendment provides explicit cardinality intent.
✓ Transition is staged with explicit gates.

⚠ Requires discipline: 4 writer sites must implement dual-write correctly.
⚠ 78+ reader sites require phased migration.
⚠ 3 special consumers require individual analysis.
⚠ Partial unique index is additive; no schema reduction.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dual-write atomicity failure | HIGH | Same-transaction writes; conceptual design required |
| Reader migration breaks business rule | HIGH | P0/P1 reviewed first; feature flag for rollback if needed |
| Partial unique index creation fails | LOW | Stage 2 hard-stop; investigate before proceeding |
| Legacy boolean drift undetected | MEDIUM | Stage 3 reconciliation; ongoing drift monitoring |
| Special consumer mis-mapped | MEDIUM | Explicit non-goal list in this ADR; individual ADR per consumer |
| Cross-tenant data exposure | LOW (preserved) | RLS unchanged; partial index keyed on `tenant_id` |

## Rejected Alternatives

- **Application-only cardinality enforcement:** rejected because of concurrency race risk and lack of DB-level invariant.
- **Trigger-based enforcement:** rejected because partial index is simpler, faster, and equivalent in semantics.
- **Schema redesign (non-nullable context_id):** rejected because it would break migration 035 contract and have massive blast radius.
- **Intentional multiplicity:** rejected because ADR-070 and 038's `NOT EXISTS` confirm at-most-one intent.
- **Keep legacy as independent authority:** rejected because it contradicts ADR-070 canonical model and prevents future contextual role support.
- **Drop `uq_party_role`:** rejected because it is still useful for contextual roles.

## Non-Goals

- This ADR does NOT implement dual-write, reader migration, partial index, or any schema change.
- This ADR does NOT ratify itself; human ratification is required.
- This ADR does NOT remove legacy boolean fields.
- This ADR does NOT define the exact partial index DDL (conceptual only).
- This ADR does NOT handle CARRIER or AGENT roles (separate decision).
- This ADR does NOT handle the 3 special consumers (separate decisions).

## Dependencies

- ADR-070 (Canonical Party Role Architecture) — provides role taxonomy
- ADR-070 Amendment (Global Role Cardinality) — provides explicit cardinality intent
- Migration 035 (party_role_foundation) — provides schema
- Migration 038 (party_role_backfill) — provides initial data
- U-02 (assertPermission) — remains authoritative for authorization

## Acceptance / Exit Criteria

This ADR is considered RATIFIED when:

1. Human review confirms the four GLOBAL role types (CUSTOMER, SUPPLIER, VENDOR, BROKER) as canonical scope.
2. Human review confirms the partial unique index mechanism.
3. Human review confirms the eight-stage transition sequence.
4. ADR-070 amendment is ratified alongside this ADR.

Implementation may begin ONLY after ratification.

## Related ADRs

- ADR-070 (Canonical Party Role Architecture) — amended
- ADR-018 (Engagement Root)
- ADR-031 (Anti-Corruption Boundary)
- ADR-032 (Engagement resolveOrCreate)
- ADR-034 (Engagement → Sales Order)
- ADR-070 Amendment (Global Role Cardinality) — companion document

## Implementation Boundary

This ADR is a DECISION document. It does NOT contain executable DDL, DML, or code. Implementation requires:

1. Ratification of this ADR.
2. Ratification of ADR-070 amendment.
3. Separate execution-phase authorization for each transition stage.
4. Per-stage forensic reports before proceeding.

---

**END OF ADR-077 DRAFT**
