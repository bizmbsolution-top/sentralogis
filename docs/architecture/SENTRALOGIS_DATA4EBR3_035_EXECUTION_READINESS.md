# SENTRALOGIS — DATA-4E-BR3
# PARTY ROLE FOUNDATION EXECUTION READINESS FORENSIC

# Migration 035 Compatibility & Authorization Gate

**Date:** 2026-09-02
**Phase:** DATA-4E-BR3
**Predecessor:** DATA-4E-BR2
**Type:** READ-ONLY FORENSIC / EXECUTION READINESS
**Target:** `20260902_035_party_role_foundation.sql`

---

## 0. ABSOLUTE HARD STOP — NON-NEGOTIABLE

This phase is **READ-ONLY FORENSIC ONLY**.

### FORBIDDEN

Do NOT:

* execute migration 035;
* execute migration 038;
* execute any other migration;
* execute DDL;
* execute DML;
* create/drop/alter tables;
* create/drop/alter indexes;
* create/drop/alter constraints;
* create/drop/alter functions;
* create/drop/alter RLS policies;
* modify application code;
* modify tests;
* modify `database.types.ts`;
* modify ADRs;
* modify AGENTS.md;
* implement dual-write;
* migrate `is_vendor` consumers;
* remove/deprecate `md_entities.is_vendor`;
* repair migration 035;
* generate a replacement migration.

Only:

* targeted repository inspection;
* inspection of migration 035 and its direct dependencies;
* SELECT-only catalog/schema verification;
* forensic comparison between migration assumptions and live schema;
* forensic analysis of existing `party_roles` table state.

**HARD STOP immediately after the final forensic report.**

---

# 1. CONTEXT

DATA-4E-BR2 established:

* `public.party_roles` is absent from the live database;
* migration 035 exists in the repository;
* there is no authoritative evidence that migration 035 was applied;
* migration 038 depends on `public.party_roles`;
* therefore migration 038 is currently blocked;
* migration 035 must NOT be executed merely because its file exists;
* a separate execution-readiness gate is required first.

Important forensic correction:

Do NOT state that migration 035 is historically "confirmed never executed" unless authoritative execution evidence exists.

Use:

> **NOT DEPLOYED IN LIVE DB / NO AUTHORITATIVE EXECUTION EVIDENCE**

unless stronger evidence is discovered.

---

# 2. PRIMARY OBJECTIVE

Determine whether:

> `20260902_035_party_role_foundation.sql`

is **currently compatible and safe enough to receive a separate human execution authorization**.

The desired output is NOT execution.

The desired output is one of:

### GREEN

Migration 035 is structurally compatible with the current live database and may proceed to a separate human authorization/execution phase.

### YELLOW

Compatibility or deployment-state ambiguity remains and must be resolved before execution.

### RED

Migration 035 is incompatible, unsafe, obsolete, or requires redesign/repair before execution.

---

# 3. AGENCY / TOKEN-EFFICIENCY RULES

This is a forensic gate, not a repository exploration exercise.

### MUST

* Reuse DATA-4E-B, DATA-4E-BR, and DATA-4E-BR2 findings.
* Inspect only migration 035 and its direct dependencies.
* Use targeted searches.
* Inspect exact relevant schema objects only.
* Prefer `information_schema` / `pg_catalog` SELECT queries.
* Reuse known facts rather than rediscovering the entire repository.
* Do not inspect unrelated SBU domains.
* Do not run full regression.
* Do not run `tsc`.
* Do not perform broad repository scans.
* Do not repeatedly inspect files already established by BR2.
* Summarize findings compactly.
* Stop immediately when all gates are resolved.

### DO NOT

Turn this into a general architecture audit.

The question is only:

> **Can migration 035 safely be authorized for execution against the current live database?**

---

# 4. REQUIRED FORENSIC GATES

## BR3-01 — Exact Migration 035 Inventory

Read:

`supabase/migrations/20260902_035_party_role_foundation.sql`

Record exactly:

* tables created;
* columns;
* data types;
* nullability;
* defaults;
* primary keys;
* foreign keys;
* unique constraints;
* CHECK constraints;
* indexes;
* functions;
* triggers;
* RLS enablement;
* RLS policies;
* dependencies;
* execution ordering assumptions.

Do not modify the file.

Do not assume the previous BR2 summary is complete; verify only the relevant structural facts.

---

# 5. BR3-02 — `tenants` Compatibility

Verify live:

`public.tenants`

Check only what 035 directly requires:

* table existence;
* primary key;
* PK data type;
* relevant columns referenced by 035;
* any directly referenced tenant columns;
* compatibility with 035 foreign keys.

Report:

```text
TENANTS_COMPATIBLE = YES / NO / UNKNOWN
```

---

# 6. BR3-03 — `md_entities` Compatibility

Verify live:

`public.md_entities`

Check:

* table existence;
* primary key;
* PK data type;
* relevant columns referenced by 035;
* tenant relationship if directly referenced;
* compatibility with 035 foreign keys.

Do NOT perform a general md_entities audit.

Report:

```text
MD_ENTITIES_COMPATIBLE = YES / NO / UNKNOWN
```

---

# 7. BR3-04 — `get_my_tenant_id()` Compatibility

Migration 035 uses the tenant isolation mechanism.

Verify the live function:

`public.get_my_tenant_id()`

Check:

* function existence;
* schema;
* argument signature;
* return type;
* whether 035's RLS policy syntax/semantics are compatible with the live function.

Do not modify the function.

Report:

```text
TENANT_HELPER_COMPATIBLE = YES / NO / UNKNOWN
```

---

# 8. BR3-05 — Existing Object Collision Audit

Before any hypothetical execution, determine whether any objects that 035 attempts to create already exist.

Check specifically:

* `party_roles`
* `party_relationships`
* `party_contacts`
* `party_locations`
* indexes created by 035
* constraints created by 035
* functions created by 035
* triggers created by 035
* RLS policies created by 035

For every object:

```text
OBJECT
Expected by 035
Exists live?
Collision risk
Definition compatible?
```

Do NOT drop, replace, or alter anything.

Important:

An absent `party_roles` table is expected.

The key question is whether **any partial foundation objects already exist**.

---

# 9. BR3-06 — `party_id` Semantic Compatibility

Migration 035 references:

`public.md_entities`

Verify that:

* `party_roles.party_id` datatype declared by 035 is compatible with `md_entities.id`;
* FK direction is valid;
* no incompatible domain/type issue exists.

Do not assume UUID compatibility merely because both appear to be identifiers.

---

# 10. BR3-07 — Tenant FK Compatibility

Verify:

`party_roles.tenant_id → tenants.id`

Check exact datatypes.

Also verify whether the migration's intended tenant isolation model is compatible with the current tenant schema.

No DDL.

No changes.

---

# 11. BR3-08 — RLS Safety Review

Inspect the RLS definition in migration 035.

Determine:

* whether `party_roles` is enabled for RLS;
* SELECT policy;
* INSERT policy;
* UPDATE policy;
* DELETE policy;
* tenant predicate;
* interaction with `get_my_tenant_id()`.

Determine whether the policy would accidentally:

* permit cross-tenant access;
* deny legitimate service operations;
* expose rows with NULL tenant IDs;
* create an authorization bypass.

This is a static + catalog review only.

Do not change policies.

---

# 12. BR3-09 — Constraint Safety

Verify the intended:

```text
PRIMARY KEY
UNIQUE(tenant_id, party_id, role_type, context_type, context_id)
CHECK(context_type)
```

and all relevant foreign keys.

Determine whether:

* NULL semantics are intentional;
* PostgreSQL UNIQUE behavior with `context_id` is acceptable;
* GLOBAL roles with NULL `context_id` behave as intended;
* the uniqueness model is compatible with migration 038;
* duplicate GLOBAL/VENDOR roles can be prevented as intended.

Do not create constraints.

Do not test by inserting data.

Static analysis only.

---

# 13. BR3-10 — Migration 038 Compatibility

Read:

`supabase/migrations/20260902_038_party_role_backfill.sql`

Do NOT execute it.

Verify only that 035 creates every object/column 038 actually requires.

Specifically verify:

```text
party_roles
party_roles.tenant_id
party_roles.party_id
party_roles.role_type
party_roles.context_type
party_roles.context_id
required uniqueness behavior
```

Determine:

```text
035 → 038 dependency = SATISFIED AFTER 035 / NOT SATISFIED / UNKNOWN
```

Do not modify 038.

---

# 14. BR3-11 — ADR / Architecture Consistency

Inspect only the directly relevant architectural artifacts:

* ADR-070;
* DATA-3 implementation report;
* DATA-3R forensic report;
* DATA-4E-B/B-R/B-R2 reports.

Determine whether migration 035 still implements the currently ratified Party Role architecture.

Specifically identify any contradiction between:

* ADR-070;
* migration 035;
* current live schema;
* current canonical identity/entity model.

Do NOT create or amend an ADR.

If a design contradiction exists, verdict must be YELLOW or RED.

---

# 15. BR3-12 — Obsolescence / Replacement Check

Perform a **targeted** search only for evidence that `party_roles` has been replaced by another canonical role model.

Search for:

* `party_roles`
* `party role`
* `role_type`
* `context_type`
* canonical vendor role model
* replacement role tables/models
* later migrations that supersede 035
* later ADRs explicitly superseding ADR-070

Do NOT broadly search the entire repository for unrelated "role" concepts.

Question:

> Is migration 035 still the canonical implementation, or has it been superseded?

Possible result:

```text
CANONICAL = YES
SUPERSEDED = YES
UNKNOWN
```

If superseded, immediately classify RED/YELLOW and stop further execution-readiness reasoning.

---

# 16. BR3-13 — Partial Foundation / Drift Detection

Determine whether the live database contains any partial implementation of the Party Role Foundation.

Examples:

* one or more party tables exist but `party_roles` does not;
* related indexes exist without their table;
* related functions exist;
* related policies exist;
* alternative party-role table exists;
* columns from 035 already exist elsewhere.

Classify:

```text
NO_PARTIAL_FOUNDATION
PARTIAL_FOUNDATION
ALTERNATIVE_FOUNDATION
UNKNOWN
```

If partial/alternative foundation exists, explain exactly what conflicts with 035.

---

# 17. BR3-14 — Execution Ordering

Determine whether 035 has hidden prerequisites beyond:

* `tenants`;
* `md_entities`;
* `get_my_tenant_id()`;
* PostgreSQL procedural language/extensions actually used.

Do not infer.

Inspect the SQL and verify direct dependencies.

Produce:

```text
035 prerequisites:
1.
2.
3.
...
```

Then:

```text
ALL_PREREQUISITES_SATISFIED = YES / NO / UNKNOWN
```

---

# 18. BR3-15 — Data Safety / Existing Data Interaction

Because `party_roles` is absent, migration 035 should primarily be schema creation.

Verify whether 035 contains:

* INSERT;
* UPDATE;
* DELETE;
* data transformation;
* backfill;
* destructive operations.

If it is schema-only, explicitly state:

> Migration 035 contains no data backfill and therefore does not itself migrate `is_vendor`.

If any data mutation exists, identify it precisely.

Do NOT execute it.

---

# 19. BR3-16 — Execution Readiness Matrix

Produce this exact matrix:

| Gate                         | Result           | Evidence |
| ---------------------------- | ---------------- | -------- |
| 035 structural integrity     | GREEN/YELLOW/RED |          |
| tenants compatibility        | GREEN/YELLOW/RED |          |
| md_entities compatibility    | GREEN/YELLOW/RED |          |
| tenant helper compatibility  | GREEN/YELLOW/RED |          |
| object collision             | GREEN/YELLOW/RED |          |
| FK datatype compatibility    | GREEN/YELLOW/RED |          |
| RLS safety                   | GREEN/YELLOW/RED |          |
| constraint safety            | GREEN/YELLOW/RED |          |
| 038 dependency compatibility | GREEN/YELLOW/RED |          |
| ADR consistency              | GREEN/YELLOW/RED |          |
| replacement/obsolescence     | GREEN/YELLOW/RED |          |
| partial foundation           | GREEN/YELLOW/RED |          |
| prerequisite completeness    | GREEN/YELLOW/RED |          |
| data mutation risk           | GREEN/YELLOW/RED |          |

---

# 20. BR3-17 — FINAL DECISION

Choose exactly one:

## GREEN — READY FOR HUMAN AUTHORIZATION

Use only if:

* migration 035 is structurally valid;
* all direct dependencies are verified;
* no incompatible object collision exists;
* RLS is safe;
* FK datatypes are compatible;
* no superseding architecture exists;
* no partial foundation conflict exists;
* migration 035 is compatible with current live schema;
* 038 dependency is satisfied **after** 035;
* no unresolved material ambiguity remains.

GREEN means:

> **035 MAY PROCEED TO A SEPARATE HUMAN-AUTHORIZED EXECUTION PHASE.**

It does NOT authorize execution.

## YELLOW — REQUIRES RESOLUTION

Use if:

* execution history ambiguity matters;
* schema compatibility is not fully proven;
* an object collision requires analysis;
* architecture status is ambiguous;
* deployment ordering is uncertain;
* any material question remains unresolved.

## RED — NOT EXECUTABLE / REQUIRES REPAIR

Use if:

* 035 conflicts with the live schema;
* required dependencies are missing;
* FK datatypes are incompatible;
* RLS is unsafe;
* migration is obsolete/superseded;
* partial foundation creates unsafe collision;
* migration would produce an invalid architecture.

---

# 21. CRITICAL DISTINCTION

Do NOT confuse:

```text
035 FILE EXISTS
```

with:

```text
035 WAS EXECUTED
```

Do NOT confuse:

```text
party_roles ABSENT
```

with an absolute historical statement that 035 was never executed.

The correct forensic language is:

> **`party_roles` is not deployed in the current live database, and no authoritative execution evidence for migration 035 has been identified.**

Only use stronger language if authoritative evidence is discovered.

---

# 22. REQUIRED FINAL REPORT FORMAT

Create:

`docs/architecture/SENTRALOGIS_DATA4EBR3_035_EXECUTION_READINESS.md`

Include:

1. Executive Decision
2. Migration 035 Inventory
3. Live Dependency Verification
4. Object Collision Audit
5. FK Compatibility
6. RLS Review
7. Constraint Review
8. Migration 038 Dependency Check
9. ADR Consistency
10. Replacement/Obsolescence Check
11. Partial Foundation Check
12. Execution Ordering
13. Data Mutation Analysis
14. Execution Readiness Matrix
15. Final Verdict
16. Required Preconditions for Any Future Execution
17. Explicit Authorization Boundary

Do not create any other artifact unless strictly necessary for the report.

---

# 23. AUTHORIZATION BOUNDARY

The final report MUST explicitly state:

> Migration 035 was NOT executed during DATA-4E-BR3.

> Migration 038 was NOT executed during DATA-4E-BR3.

> No schema was changed.

> No data was changed.

> No application code was changed.

> No tests were changed.

> No ADR was created or amended.

> No `is_vendor` consumer was migrated.

> No dual-write was implemented.

> No `is_vendor` column was removed or deprecated.

If the final verdict is GREEN, state:

> Migration 035 is **READY FOR A SEPARATE HUMAN AUTHORIZATION DECISION ONLY**. GREEN does not constitute authorization to execute.

If YELLOW or RED:

> Migration 035 MUST NOT be executed until the identified blockers are resolved and a separate execution phase is explicitly authorized.

---

# 24. HARD STOP

After producing:

`SENTRALOGIS_DATA4EBR3_035_EXECUTION_READINESS.md`

STOP.

Do not:

* execute 035;
* execute 038;
* repair 035;
* generate a new migration;
* modify code;
* modify tests;
* modify ADRs;
* modify AGENTS.md;
* modify schema;
* modify data;
* implement dual-write;
* migrate consumers.

Return only the concise forensic summary and final verdict.

**END OF DATA-4E-BR3**