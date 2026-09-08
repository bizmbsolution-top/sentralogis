# SENTRALOGIS — DATA-4E-BR7
# ADR-077 DRAFT & ADR-070 AMENDMENT DISCOVERY

**Date:** 2026-09-02
**Phase:** DATA-4E-BR7
**Type:** ADR DRAFTING / ARCHITECTURE DISCOVERY
**Status:** DISCOVERY + DRAFT ONLY
**Production Changes:** FORBIDDEN
**Migration Execution:** FORBIDDEN
**DDL/DML:** FORBIDDEN
**Code Changes:** FORBIDDEN
**Test Changes:** FORBIDDEN
**ADR Ratification:** FORBIDDEN
**Transition Implementation:** FORBIDDEN

---

## 1. Executive Decision

| Aspect | Status |
|--------|--------|
| ADR-077 | **DRAFTED** — PENDING HUMAN RATIFICATION |
| ADR-070 Amendment | **DRAFTED** — PENDING HUMAN RATIFICATION |
| Authority decision | `party_roles` canonical for CUSTOMER, SUPPLIER, VENDOR, BROKER |
| Global cardinality | DB-enforced via partial unique index |
| Transition | Model C (interim) → Model B (final) |
| Open decisions | 6 (listed below) |
| Production changes | NONE |
| Migration executed | NONE |
| DDL/DML performed | NONE |

**Verdict: YELLOW** — drafts are evidence-based, internally consistent, and decision-ready. Implementation requires separate explicit human authorization at each transition stage.

---

## 2. BR6 Baseline

Validated from DATA-4E-BR6:

- **Authority:** CONDITIONAL YES — `party_roles` should become canonical for CUSTOMER, SUPPLIER, VENDOR, BROKER.
- **Cardinality:** YES — database-enforced via partial unique index.
- **Transition:** Model C → Model B.
- **ADR requirement:** ADR-070 amendment + new ADR-077.
- **Dangerous consumers identified:** 3 (`cost-audit:432`, `assignment.ts:282`, `fleet-status:101`).
- **Drift risk:** HIGH (any new UI vendor write desynchronizes).

All conclusions confirmed. No re-derivation performed.

---

## 3. Evidence Validation

| BR6 Conclusion | Evidence Source | Validated |
|----------------|-----------------|-----------|
| `party_roles` is correct canonical model | BR4 (executed), BR5 (62 rows), BR5R (all reconcile), ADR-070 | YES |
| DB-level cardinality needed | BR4R (UNIQUE insufficient), BR5R (NOT EXISTS is migration-level), 038's NOT EXISTS | YES |
| Partial unique index is correct mechanism | PostgreSQL semantics (NULL != NULL), ADR-070 §3.4 "UNIQUE prevents duplicate" | YES |
| Multi-role parties are valid | ADR-070 §3.4 "A party can be CUSTOMER and VENDOR simultaneously" | YES |
| Legacy booleans are TRANSITIONAL | BR5R §15 (transitional authority), 78+ consumers still read legacy | YES |
| Dual-write required during transition | BR6 §13, 4 active writer sites identified in BR2/BR3 | YES |
| Writer before reader migration | BR6 §14.2 (prevents stale reads) | YES |

All evidence supports the BR6 conclusions. No contradictions found.

---

## 4. ADR-070 Findings

Read of `docs/architecture/SENTRALOGIS_ADR_PARTY_ROLE_ARCHITECTURE.md`:

- §2.2: `UNIQUE (tenant_id, party_id, role_type, context_type, context_id)` — explicit schema design
- §3.1: Six GLOBAL role types (CUSTOMER, VENDOR, SUPPLIER, BROKER, CARRIER, AGENT)
- §3.4: "UNIQUE constraint prevents duplicate assignments" — STRONGLY IMPLIED at-most-one
- §3.4: "A party can hold multiple roles in different contexts" — multi-role support
- §3.4: "A party can be CUSTOMER and VENDOR simultaneously" — multi-role example
- §4: Legacy flag treatment table (is_vendor HIGH risk; others LOW)
- §4.2: 6-phase migration strategy
- §7: U-02 remains authoritative for authorization
- §8: Tenant isolation via RLS + get_my_tenant_id()
- §12: Non-goals (does not remove legacy columns in this phase)

**Gap:** ADR-070 does not explicitly state the GLOBAL cardinality invariant (where `context_id IS NULL`). The UNIQUE constraint in §2.2 is insufficient for GLOBAL roles under PostgreSQL NULL semantics.

The amendment addresses this gap without overreaching into other ADR-070 sections.

---

## 5. ADR-077 Decision Scope

ADR-077 covers:

| Scope | Included? | Rationale |
|-------|-----------|-----------|
| Canonical role authority | YES | Core decision |
| GLOBAL cardinality invariant | YES | Companion to amendment |
| DB-level enforcement mechanism | YES | Partial unique index |
| Legacy boolean status | YES | TRANSITIONAL → NON-AUTHORITATIVE |
| Dual-write strategy | YES | Required for transition |
| Writer migration order | YES | Establishes principle |
| Reader migration strategy | YES | Establishes principle |
| Special consumer safety | YES | 3 dangerous consumers identified |
| Tenant/security requirements | YES | Preserves existing invariants |
| Eight-stage transition | YES | Defined gates and exit conditions |
| Implementation code | NO | Decision document only |
| Schema changes | NO | Conceptual mechanism only |
| Reader migration execution | NO | Future separate phase |
| Consumer migration for 3 special cases | NO | Separate ADRs required |

---

## 6. Authority Decision (Restated)

`party_roles` is the canonical source of truth for CUSTOMER, SUPPLIER, VENDOR, and BROKER. This decision requires:

1. Ratification of ADR-077.
2. Ratification of ADR-070 amendment.
3. Explicit transition execution per eight-stage sequence.

Until ratified, the current transitional state persists: `party_roles` is deployed and populated, but legacy booleans remain authoritative for all application consumers.

---

## 7. Cardinality Decision (Restated)

GLOBAL cardinality MUST be database-enforced via a PostgreSQL partial unique index:

```sql
CREATE UNIQUE INDEX uq_party_role_global
  ON public.party_roles (tenant_id, party_id, role_type)
  WHERE context_type = 'GLOBAL'
    AND context_id IS NULL;
```

This is additive (does not modify `uq_party_role`). The existing constraint remains useful for contextual roles.

---

## 8. Transition Decision (Restated)

Eight-stage sequence with explicit gates:

1. ADR ratification (ADR-077 + ADR-070 amendment)
2. Partial unique index deployment
3. Drift reconciliation
4. Dual-write implementation (4 writer sites)
5. Reader migration (P0 → P5)
6. Legacy deprecation (derived views)
7. Zero-consumer proof
8. Column removal (separate decision)

Each stage requires explicit human authorization.

---

## 9. ADR Boundary Analysis

| Aspect | ADR-070 Amendment | ADR-077 |
|--------|-------------------|---------|
| Cardinality invariant | ✓ (defines) | ✓ (restates) |
| Enforcement mechanism | ✓ (recommends partial index) | ✓ (restates) |
| Source-of-truth authority | (out of scope) | ✓ (defines) |
| Transition strategy | (out of scope) | ✓ (defines) |
| Dual-write | (out of scope) | ✓ (defines) |
| Consumer migration | (out of scope) | ✓ (defines) |
| Special consumer safety | (out of scope) | ✓ (defines) |

**Rationale for two documents:**
- ADR-070 amendment is the foundational invariant clarification (architectural).
- ADR-077 is the execution directive (transition + decisions).
- Keeping them separate respects ADR-070's role as the design authority.

---

## 10. Draft Artifacts Created

| Artifact | Path | Status |
|----------|------|--------|
| ADR-077 draft | `docs/architecture/ADR-077-party-role-authority-and-global-cardinality.md` | DRAFT — PENDING RATIFICATION |
| ADR-070 amendment draft | `docs/architecture/ADR-070-AMENDMENT-GLOBAL-ROLE-CARDINALITY.md` | DRAFT — PENDING RATIFICATION |
| BR7 forensic report | `docs/architecture/SENTRALOGIS_DATA4EBR7_ADR_DISCOVERY.md` | THIS DOCUMENT |

---

## 11. Open Questions

| # | Question | Classification | Resolution |
|---|----------|----------------|------------|
| 1 | When does `party_roles` become "active/authoritative" (not just deployed)? | ADR DECISION REQUIRED | Defined in ADR-077 §1 (deployment ≠ authority); transition activation in Stage 5 |
| 2 | What is the activation trigger for the switch from transitional to canonical? | IMPLEMENTATION DESIGN REQUIRED | ADR-077 lists options (date-based, consumer-based, manual); chosen at Stage 4 |
| 3 | When do legacy booleans stop being written? | ADR DECISION REQUIRED | ADR-077 Stage 6 exit criterion (after reader migration) |
| 4 | How is dual-write atomicity ensured? | IMPLEMENTATION DESIGN REQUIRED | ADR-077 §7 conceptual; concrete design in separate phase |
| 5 | How are the 3 special consumers individually migrated? | IMPLEMENTATION DESIGN REQUIRED | ADR-077 §10 marks them out-of-scope; individual ADRs per consumer |
| 6 | Does the cross-tenant `vendor_tenant_id` pattern require its own ADR? | OUT OF SCOPE | Not part of this transition; separate consideration |

---

## 12. Ratification Prerequisites

ADR-077 and ADR-070 amendment are NOT ratified by this phase. Ratification requires:

1. Human review of both documents.
2. Confirmation of:
   - Cardinality invariant wording
   - Partial unique index mechanism
   - Eight-stage transition sequence
   - Special consumer non-goals
   - Tenant/security preservation
3. Explicit human ratification statement (e.g., "I RATIFY ADR-077 and ADR-070 AMENDMENT").
4. Separate execution-phase authorization for each transition stage.

---

## 13. Implementation Prohibitions

This phase did NOT perform:

- ❌ Migration execution
- ❌ DDL (no partial unique index created)
- ❌ DML (no data modification)
- ❌ Schema changes
- ❌ Code changes
- ❌ Test changes
- ❌ ADR ratification
- ❌ Consumer migration
- ❌ Dual-write implementation
- ❌ Dual-read implementation
- ❌ Legacy boolean removal/deprecation
- ❌ RLS changes
- ❌ Trigger/function changes
- ❌ Database view creation
- ❌ Drift reconciliation
- ❌ ADR-070 modification (amendment is a SEPARATE document)
- ❌ DATA-4E-BR8 start

---

## 14. Final Verdict

# **YELLOW**

ADR-077 and ADR-070 amendment drafts are:

- Evidence-based (every decision cites prior forensic findings)
- Internally consistent (amendment and ADR-077 do not contradict)
- Decision-ready (no material ambiguity remains that blocks ratification)
- Scope-appropriate (no implementation, no schema changes, no code changes)

The drafts are complete and await human ratification. After ratification, the eight-stage transition can begin with explicit per-stage authorization.

**No production changes were made. No migrations were executed. No ADRs were ratified. No implementation was performed.**

---

## 15. Hard-Stop Compliance

- No migration executed.
- No DDL/DML performed.
- No schema modified.
- No data modified.
- No application code modified.
- No tests modified.
- No existing ADR modified.
- No new ADR ratified.
- No partial unique index created.
- No RLS modified.
- No consumer migration performed.
- No dual-write implemented.
- No dual-read implemented.
- No legacy boolean removed.
- DATA-4E-BR8 was **NOT** started.

**Hard stop: COMPLIED.**

---

**END OF DATA-4E-BR7 REPORT**
