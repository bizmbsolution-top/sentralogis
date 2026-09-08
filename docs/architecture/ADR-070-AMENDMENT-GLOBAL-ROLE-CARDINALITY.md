# ADR-070 AMENDMENT — Global Role Cardinality

**Status:** RATIFIED (2026-09-02, DATA-4E-BR8 human ratification)
**Ratified by:** Human project owner, 2026-09-02
**Implementation authorization:** NOT GRANTED (separate gate required)
**Date:** 2026-09-02
**Target ADR:** ADR-070 (Canonical Party Role Architecture)
**Companion to:** ADR-077 (Party Role Authority & Global Cardinality)

---

## 1. Amendment Title

Global Role Cardinality Invariant — Explicit Formulation

---

## 2. Target ADR

ADR-070 — Canonical Party Role Architecture (currently AMENDED, PENDING HUMAN RATIFICATION)

---

## 3. Reason for Amendment

ADR-070 §2.2 defines the `party_roles` table with a `UNIQUE (tenant_id, party_id, role_type, context_type, context_id)` constraint, and §3.4 states "UNIQUE constraint prevents duplicate assignments." However, ADR-070 does not:

- Explicitly state the cardinality invariant for GLOBAL context (where `context_id IS NULL`)
- Explain the PostgreSQL NULL semantics behavior
- Distinguish between "deployed schema" and "authoritative cardinality enforcement"

DATA-4E-BR4R, BR5R, and BR6 identified this as an architectural gap. Migration 038's `NOT EXISTS` guard protected the initial backfill, but the DB-level invariant is not enforced and a concurrency race window exists.

This amendment formalizes the invariant that was implicitly assumed.

---

## 4. Existing Ambiguity

ADR-070 §2.2:
> "UNIQUE (tenant_id, party_id, role_type, context_type, context_id)"

This UNIQUE constraint does not, under standard PostgreSQL semantics, prevent multiple rows where `context_id IS NULL`. A reader cannot determine from ADR-070 alone whether "duplicate assignments" refers to:

- (a) Duplicate `(tenant, party, role, context)` regardless of `context_id` NULL status (which the UNIQUE does NOT enforce)
- (b) Duplicate `(tenant, party, role)` for GLOBAL context only (which is the intended invariant but not schema-enforced)
- (c) Something else

ADR-070 §3.4 implies at-most-one but does not state it explicitly for GLOBAL.

---

## 5. New Explicit Invariant

### 5.1 GLOBAL Cardinality Invariant

> **For a given `(tenant_id, party_id, role_type)`, there may be at most one `party_roles` row where `context_type = 'GLOBAL'` and `context_id IS NULL`.**

This invariant applies to ALL GLOBAL party roles:

- CUSTOMER
- SUPPLIER
- VENDOR
- BROKER
- CARRIER
- AGENT

It does NOT apply to contextual roles (ENGAGEMENT, ORDER, CONTRACT), which use non-NULL `context_id` and are constrained by the existing `uq_party_role` UNIQUE.

### 5.2 Invariant Classification

This invariant is a **business semantics** requirement, not merely an implementation detail. It reflects the architectural intent that a party has a single canonical classification per role type at global scope.

---

## 6. GLOBAL Semantics

`context_type = 'GLOBAL'` with `context_id IS NULL` means:

> The role applies to the party at tenant-global scope, not bound to any specific engagement, order, or contract.

GLOBAL roles represent the party's standing classification within the tenant (e.g., "this party is a customer of ours"). They are distinct from:

- **ENGAGEMENT** roles: scoped to a specific engagement
- **ORDER** roles: scoped to a specific order (BILL_TO, SHIP_TO, PAYER, ORDERING_PARTY)
- **CONTRACT** roles: scoped to a specific contract

A party may hold multiple GLOBAL roles of different types (e.g., CUSTOMER + VENDOR). A party may NOT hold two GLOBAL rows of the same type.

---

## 7. PostgreSQL NULL Semantics

The existing `uq_party_role` UNIQUE constraint:

```sql
UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
```

permits multiple rows where `context_id IS NULL` because PostgreSQL UNIQUE constraints treat each NULL as distinct from every other NULL.

**Consequence:** the existing constraint does NOT enforce the GLOBAL cardinality invariant. Two `(tenant, party, role, GLOBAL, NULL)` rows can coexist in the same table.

This is a known PostgreSQL behavior, not a defect in migration 035. The constraint is correctly designed for contextual roles where `context_id` is non-NULL. The GLOBAL cardinality invariant requires an ADDITIONAL enforcement mechanism.

---

## 8. Enforcement Principle

The GLOBAL cardinality invariant MUST be enforced at the database level.

The recommended mechanism is a **PostgreSQL partial unique index**:

```sql
CREATE UNIQUE INDEX uq_party_role_global
  ON public.party_roles (tenant_id, party_id, role_type)
  WHERE context_type = 'GLOBAL'
    AND context_id IS NULL;
```

This index:

- Enforces at-most-one GLOBAL row per `(tenant, party, role_type)`.
- Is atomic (no race window).
- Is additive (does not modify the existing `uq_party_role`).
- Is compatible with RLS.
- Does not affect contextual roles (ENGAGEMENT, ORDER, CONTRACT).
- Has minimal performance overhead (small index on a filtered subset).

Application-side `NOT EXISTS` guards are NOT sufficient as the sole enforcement because:

- They are migration-level, not reusable.
- They have a concurrency race window.
- They are not authoritative for future writers.

---

## 9. Compatibility with Existing Constraint

The existing `uq_party_role` UNIQUE constraint remains useful for contextual roles (where `context_id IS NOT NULL`):

```sql
UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
```

For contextual rows, this constraint correctly prevents duplicate `(tenant, party, role, engagement_id)`, `(tenant, party, role, order_id)`, and `(tenant, party, role, contract_id)` combinations.

For GLOBAL rows (where `context_id IS NULL`), the existing constraint is insufficient and the partial index provides the additional enforcement.

**No change to `uq_party_role` is proposed.** The partial unique index is purely additive.

---

## 10. Impact

### 10.1 On ADR-070

- §2.2: The `UNIQUE` constraint is preserved and clarified. An additive partial index is added.
- §3.4: "UNIQUE constraint prevents duplicate assignments" is interpreted as: for contextual roles, enforced by `uq_party_role`; for GLOBAL roles, enforced by the additive partial index.
- No other ADR-070 sections require amendment.

### 10.2 On Existing Schema

No existing objects are modified. The partial index is additive.

### 10.3 On Existing Data

The current `party_roles` data (62 GLOBAL rows from migration 038) is already conformant to the invariant (0 duplicates). The partial index creation will succeed without data movement.

### 10.4 On Future Writers

Future writers that insert GLOBAL roles will be protected by the partial index at the DB level. Writers that attempt to insert a duplicate `(tenant, party, role, GLOBAL, NULL)` will receive a UNIQUE violation error.

### 10.5 On Application Code

Application code that previously relied on `NOT EXISTS` guards for GLOBAL role uniqueness may simplify by removing the guard (the DB now enforces it). However, the guard may remain as a defense-in-depth measure; this is an implementation choice.

---

## 11. Relationship to ADR-077

This amendment is the foundation for ADR-077 (Party Role Authority & Global Cardinality). Specifically:

| Aspect | This Amendment | ADR-077 |
|--------|----------------|---------|
| Scope | ADR-070 invariant clarification | Authority + cardinality + transition |
| Cardinality invariant | ✓ (defined here) | ✓ (restated) |
| Enforcement mechanism | ✓ (partial index recommended) | ✓ (restated) |
| Source-of-truth authority | (out of scope) | ✓ |
| Transition strategy | (out of scope) | ✓ |
| Dual-write requirement | (out of scope) | ✓ |
| Consumer migration | (out of scope) | ✓ |

**This amendment is a prerequisite for ADR-077 ratification.** ADR-077 cannot be ratified until this amendment (or equivalent) clarifies the cardinality invariant in ADR-070.

---

## 12. Ratification Requirement

This amendment requires explicit human ratification before:

1. The partial unique index can be created.
2. ADR-077 can be ratified.
3. Any transition stage can begin.

Ratification criteria:

1. Human reviewer confirms the GLOBAL cardinality invariant wording.
2. Human reviewer confirms the enforcement mechanism (partial unique index) is acceptable.
3. Human reviewer confirms the additive approach (no change to `uq_party_role`).
4. Human reviewer confirms the relationship to ADR-077.

After ratification, this amendment becomes a permanent part of ADR-070. The amended ADR-070 should be re-versioned and re-circulated for any future reference.

---

**END OF ADR-070 AMENDMENT DRAFT**
