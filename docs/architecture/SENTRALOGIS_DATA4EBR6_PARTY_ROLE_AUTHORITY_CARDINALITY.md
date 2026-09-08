# SENTRALOGIS — DATA-4E-BR6
# PARTY ROLE AUTHORITY & GLOBAL CARDINALITY ADR DISCOVERY

**Date:** 2026-09-02
**Phase:** DATA-4E-BR6
**Type:** READ-ONLY FORENSIC ARCHITECTURE / ADR DISCOVERY
**Status:** DISCOVERY ONLY
**Migration Execution:** FORBIDDEN
**DDL/DML:** FORBIDDEN
**Code Changes:** FORBIDDEN
**Test Changes:** FORBIDDEN
**ADR Changes:** FORBIDDEN

---

## 1. Executive Decision

| Question | Recommendation |
|----------|----------------|
| **Q1 — Should `party_roles` become the canonical source of truth for CUSTOMER, SUPPLIER, VENDOR, BROKER?** | **CONDITIONAL YES** — `party_roles` should become canonical, but this requires an explicit transition phase and ADR clarification of authority semantics. |
| **Q2 — Should GLOBAL role cardinality be database-enforced?** | **YES** — a partial unique index on `(tenant_id, party_id, role_type) WHERE context_type = 'GLOBAL' AND context_id IS NULL` is the recommended enforcement mechanism. |
| **Transition strategy** | Model C (Transitional Dual Authority) → Model D (Derived Compatibility Layer) over 3-4 staged phases. |
| **ADR requirement** | **New ADR (ADR-077)** for source-of-truth authority + cardinality enforcement, AND **ADR-070 amendment** to explicitly state cardinality intent and multi-role coexistence. |

**Verdict: YELLOW** — Architecture direction is clear, but implementation must remain blocked until ADR ratification. The BR5R YELLOW findings are resolved at the architecture level; execution requires separate authorization.

---

## 2. Scope / Hard Stop

This phase is **discovery only**. No migration was executed. No schema, data, code, tests, ADRs, or RLS were modified. Only analysis and the report file were produced.

---

## 3. Evidence Baseline

Reused from prior phases:

- **DATA-4E-BR3:** Migration 035 compatibility GREEN.
- **DATA-4E-BR4:** Migration 035 executed successfully. Foundation deployed.
- **DATA-4E-BR4R:** Cardinality design gap identified (UNIQUE does not prevent NULL duplicates).
- **DATA-4E-BR5:** Migration 038 executed. 62 canonical role rows created (43 CUSTOMER + 3 SUPPLIER + 16 VENDOR + 0 BROKER). 0 missing, 0 extra, 0 duplicate, 0 cross-tenant, 0 orphan.
- **DATA-4E-BR5R:** All 4 roles reconcile. YELLOW verdict (cardinality gap, source-of-truth authority unresolved).
- **ADR-070:** Canonical Party Role Architecture (AMENDED status, PENDING HUMAN RATIFICATION).
- **Migration 035:** `party_roles` table + constraints + RLS.
- **Migration 038:** Backfill of 4 legacy booleans to canonical roles with `NOT EXISTS` guard.

---

## 4. Current Live Architecture

### 4.1 `party_roles` (canonical model)

- Deployed: YES (migration 035)
- Populated: 62 rows (migration 038)
- RLS: enabled with tenant isolation
- Used by application: **NO** (consumer migration not yet performed)

### 4.2 `md_entities` legacy booleans

- `is_customer`, `is_supplier`, `is_vendor`, `is_broker` — all present, all writable
- Used by application: YES (all current consumers)
- Backfilled source: 43+3+16+0=62 entities with at least one TRUE flag

### 4.3 Transitional State

Two sources of truth coexist. They are currently synchronized (62/62 match) but can drift because legacy booleans remain writable and no synchronization mechanism is in place.

---

## 5. Legacy Boolean Authority Analysis

### 5.1 Legacy Role Fields

| Field | Type | Read by | Written by | Used for auth | Used for decisions | Used for filter | Used for reporting |
|-------|------|---------|------------|---------------|-------------------|------------------|---------------------|
| `is_vendor` | boolean | 131+ sites per DATA-2R-C | 4 writer sites (per DATA-4E-B) | NO direct RLS | YES (assignment, fleet selection, EasyGo sync) | YES (vendor tab, fleet filter) | YES (cost audit, vendor listing) |
| `is_customer` | boolean | multiple | same writer paths | NO | YES (customer tab, billing) | YES | YES |
| `is_supplier` | boolean | multiple | same writer paths | NO | YES | YES | YES |
| `is_broker` | boolean | minimal | same writer paths | NO | minimal usage | minimal | minimal |

### 5.2 Consumer Profile

- **78+ reader sites** (per DATA-4E-B) for `is_vendor` alone
- Consumers assume:
  - Boolean semantics (TRUE/FALSE/NULL, where NULL ≈ FALSE)
  - Single-flag decisions (e.g., "is this entity a vendor?")
  - Tenant-scoped filtering (all current consumers include `tenant_id` in queries)
  - No multi-role awareness (most consumers check one flag at a time)
- **No consumer currently checks multiple role flags simultaneously for a single entity.**

### 5.3 Writer Profile

4 active writers identified (HQ contacts, Tenant contacts, HQ fleets, QuickAddContactModal). All set `is_*` booleans on INSERT/UPDATE.

---

## 6. Party Role Authority Analysis

### 6.1 Current `party_roles` Usage

- **Readers:** NONE in production application code (consumer migration not performed)
- **Writers:** Migration 038 only (no application writer)
- **Validators:** NONE
- **Authorization:** NONE
- **Reporting:** NONE
- **UI/Query:** NONE
- **Migration-only:** Migration 038
- **Test-only:** N/A

**Classification: Deployed but unused by application.**

### 6.2 Schema Capability

`party_roles` is structurally capable of:
- Multiple roles per party (multi-role)
- Contextual roles (GLOBAL, ENGAGEMENT, ORDER, CONTRACT)
- Effective dating (`effective_from`, `effective_to`)
- Primary designation (`is_primary`)
- Tenant isolation (RLS + FK)

This is strictly more expressive than boolean flags.

---

## 7. Reader/Writer Conflict Analysis

### 7.1 Drift Scenarios

| Scenario | Possible? | Mechanism | Risk |
|----------|-----------|-----------|------|
| `is_vendor=TRUE`, no canonical VENDOR | YES | Direct INSERT to md_entities bypassing 038 | HIGH |
| `is_vendor=FALSE`, canonical VENDOR present | YES | Direct UPDATE to md_entities after backfill | HIGH |
| `is_vendor=TRUE`, canonical VENDOR present | YES (current state) | Synchronized | LOW (transient) |
| New vendor via UI | YES | UI sets is_vendor=TRUE; no canonical INSERT | HIGH (immediate drift) |
| Delete from party_roles (e.g., via service mistake) | YES | Application DELETE without legacy sync | HIGH |
| Cross-tenant canonical role | NO | RLS prevents | LOW (architectural) |

### 7.2 Drift Risk Classification

**Risk: HIGH** — the system can enter a desynchronized state immediately after migration 038 by:
1. Any UI write to `is_vendor` (creates a "vendor" without a canonical role)
2. Any direct write to `party_roles` that doesn't mirror the legacy flag
3. Any future backfill or repair that targets one source without the other

**The only reason current data is synchronized is that no writes have occurred since 038 completed.** This is a fragile equilibrium.

---

## 8. Drift Risk

**Legacy boolean drift risk: HIGH** (upgraded from BR5R's MEDIUM based on deeper analysis).

Justification: Every new vendor created via the existing UI will immediately desynchronize. There is no writer-side enforcement that maintains sync. The 4 active writer sites will create this drift organically.

---

## 9. Global Cardinality Intent

### 9.1 Evidence Review

| Source | Statement | Classification |
|--------|-----------|----------------|
| ADR-070 §3.4 | "UNIQUE constraint prevents duplicate assignments" | STRONGLY IMPLIED at-most-one |
| ADR-070 §2.2 | UNIQUE (tenant_id, party_id, role_type, context_type, context_id) | EXPLICIT schema design |
| Migration 038 | `NOT EXISTS` guard per INSERT | EXPLICIT migration-level enforcement |
| Migration 035 | `UNIQUE` constraint with nullable `context_id` | EXPLICIT schema acceptance of NULL |
| Application code | No current consumer checks for duplicates | IMPLICIT no runtime concern |

**Intent: AT-MOST-ONE per `(tenant_id, party_id, role_type, context_type)`.**

The `context_id` NULL in the UNIQUE is a standard PostgreSQL pattern, not an intentional allowance of multiple GLOBAL rows. The `NOT EXISTS` guard in 038 confirms the intent: each party should have at most one GLOBAL role of each type.

**Ambiguity: None regarding intent. Ambiguity: enforcement mechanism (DB vs application).**

---

## 10. PostgreSQL NULL Semantics Finding

PostgreSQL UNIQUE constraints treat `NULL` as distinct from `NULL`. Therefore:

```text
UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
```

permits multiple rows where `context_id IS NULL`. This is standard PostgreSQL behavior and is not a bug in migration 035; it is a fundamental constraint of the UNIQUE implementation when nullable columns are included.

**Consequence:** The current foundation does NOT enforce at-most-one GLOBAL role at the DB level. Only migration 038's `NOT EXISTS` guard provided this guarantee during backfill.

---

## 11. Concurrency / Race Analysis

### 11.1 Race Scenario

```text
Transaction A: BEGIN; SELECT NOT EXISTS (GLOBAL VENDOR for party P) → false; INSERT ...
Transaction B: BEGIN; SELECT NOT EXISTS (GLOBAL VENDOR for party P) → false; INSERT ...
Transaction A: COMMIT;
Transaction B: COMMIT;
```

### 11.2 Risk Assessment

The `NOT EXISTS` subquery in migration 038 is **NOT** protected by any isolation mechanism that would prevent this race:
- If Transaction A and B both run at READ COMMITTED isolation (PostgreSQL default), both can see the same "not exists" result.
- If both INSERT, two rows will be created because the UNIQUE constraint allows multiple NULL `context_id` values.
- The `NOT EXISTS` in 038 is run as a subquery, not as a row-level lock (no `SELECT ... FOR UPDATE`).

**Concurrency risk: MEDIUM** — unlikely in practice (manual backfill is single-threaded), but structurally possible if the same pattern is replicated in a concurrent application writer.

### 11.3 Current Mitigation

None at the DB level. The 038 backfill was a single migration execution with no concurrency.

---

## 12. Cardinality Enforcement Options

| Model | Invariant Strength | Concurrency Safety | Complexity | Recommendation |
|-------|--------------------|--------------------|------------|----------------|
| A — Application-only enforcement | WEAK (race-prone) | POOR (concurrent writers can bypass) | LOW (no schema change) | **NO** — insufficient |
| B — DB partial unique index | STRONG (atomic) | EXCELLENT (DB-level lock) | LOW (one DDL) | **YES** — recommended |
| C — Schema redesign (non-nullable context_id) | STRONG | EXCELLENT | HIGH (breaks migration 035 contract, massive blast radius) | **NO** — too invasive |
| D — Trigger-based enforcement | STRONG | GOOD | MEDIUM (trigger maintenance) | **NO** — partial index is simpler |
| E — Intentional multiplicity | N/A (redefines intent) | N/A | N/A | **NO** — contradicts ADR-070 intent |

**Recommended: Model B (partial unique index)**

Conceptual DDL (NOT to be executed in this phase):

```sql
CREATE UNIQUE INDEX uq_party_role_global
  ON public.party_roles (tenant_id, party_id, role_type)
  WHERE context_type = 'GLOBAL' AND context_id IS NULL;
```

---

## 13. Source-of-Truth Options

| Model | Semantic Correctness | Extensibility | Multi-Role | Migration Complexity | Backward Compat | Long-term Fit | Drift Risk | Recommendation |
|-------|----------------------|---------------|------------|----------------------|------------------|----------------|------------|----------------|
| A — Legacy Boolean Authority | POOR (boolean overload) | POOR (exponential growth) | NO | NONE | YES | POOR | HIGH (no canonical upgrade) | **NO** |
| B — Party Role Authority | EXCELLENT (canonical) | EXCELLENT (contextual) | YES | HIGH (131+ consumers) | REQUIRES TRANSITION | EXCELLENT | LOW (after transition) | **YES (long-term)** |
| C — Transitional Dual Authority | GOOD (interim) | GOOD | YES | MEDIUM | YES (dual-read) | TRANSITIONAL | MEDIUM (sync required) | **YES (interim)** |
| D — Derived Compatibility Layer | GOOD (canonical + projections) | GOOD | YES | MEDIUM-HIGH | YES (projections) | GOOD | LOW (projections auto-sync) | **YES (long-term alternative)** |

**Recommended sequence: C (interim) → D (long-term) → B (final canonical)**

Specifically:
1. **Phase 1:** Declare `party_roles` authoritative (ADR-077).
2. **Phase 2:** Deploy partial unique index (cardinality safety net).
3. **Phase 3:** Dual-write: all 4 writer sites insert/update both `md_entities.is_*` AND `party_roles`.
4. **Phase 4:** Migrate readers: change consumers to read from `party_roles`.
5. **Phase 5:** Convert legacy booleans to database views (derived projections) or stop writing to them entirely.
6. **Phase 6:** Eventually remove legacy boolean columns after zero-consumer proof (per ADR-070 §4.2 strategy).

---

## 14. Transition Strategy Options

### 14.1 Stage Analysis

| Stage | Description | Necessity | Notes |
|-------|-------------|-----------|-------|
| 0 — Current transitional | Both sources exist, synchronized | Current state | Fragile equilibrium |
| 1 — Declare authority | ADR-077 declares `party_roles` canonical | REQUIRED | Provides governance |
| 2 — Deploy safety net | Partial unique index | REQUIRED | Prevents future drift |
| 3 — Dual-write | Writers update both | REQUIRED | Maintains sync during transition |
| 4 — Reader migration | Consumers read from `party_roles` | REQUIRED | Reduces read risk |
| 5 — Deprecate legacy | Legacy booleans become derived views | RECOMMENDED | Single source of truth |
| 6 — Remove legacy | Drop boolean columns | FUTURE | After zero-consumer proof |

### 14.2 Order Considerations

- **Writer migration before reader migration** is RECOMMENDED. If readers migrate first and writers still write to legacy only, consumers will see stale data.
- **Dual-read is NEEDED** during transition: consumers should read from `party_roles` but fall back to legacy boolean if canonical row is missing (defensive).
- **Dual-write is NEEDED** for the 4 writer sites until all readers have migrated.
- **Drift reconciliation** is needed at the start of Phase 3 to ensure legacy and canonical are synchronized.
- **Feature flags** are NOT strictly required if dual-write is implemented correctly (the write to both sources is atomic within a single transaction).
- **Authorization consumers** (if any) require special treatment: they must read from the authoritative source immediately (cannot rely on dual-read).

### 14.3 Recommended Transition Sequence

1. **ADR-077 ratification** (authority + cardinality decision).
2. **Deploy partial unique index** (cardinality safety net).
3. **Drift reconciliation job** (verify all legacy TRUEs have canonical rows).
4. **Dual-write implementation** (4 writer sites).
5. **Consumer migration** (78+ reader sites, phased by priority P0→P5).
6. **Legacy deprecation** (convert booleans to views or stop writing).
7. **Zero-consumer proof** (verify no consumer reads legacy booleans).
8. **Column removal** (separate decision, separate phase).

---

## 15. Consumer Impact (78+ consumers)

### 15.1 Priority Classification

| Priority | Consumer Type | Estimated Count | Migration Risk |
|----------|---------------|-----------------|----------------|
| P0 | Security / authorization | 0-1 (no direct RLS dependency per DATA-4E-B) | CRITICAL if exists |
| P1 | Business-rule enforcement | ~6 (assignment.ts, EasyGoSyncService) | HIGH |
| P2 | Transactional writes | 4 (the 4 writer sites) | MEDIUM |
| P3 | Operational queries | ~50 (fleet/contact tabs, filters) | MEDIUM |
| P4 | Reporting / analytics | ~10 (cost-audit, operational reports) | LOW |
| P5 | UI / convenience | ~15 (badges, display labels) | LOW |

### 15.2 Dangerous Consumers

A consumer is **dangerous to migrate** if its semantic cannot be preserved by a simple `EXISTS (SELECT 1 FROM party_roles WHERE role_type='X' AND ...)` replacement.

| Consumer | Risk Reason |
|----------|-------------|
| `cost-audit:432` | Uses `vendor_type` (free text), not `is_vendor` (per DATA-4E-BR4R §4.1). Cannot be replaced by `party_roles.VENDOR` directly. |
| `fleet-status:101` | Uses `vendor_tenant_id` (cross-tenant pattern), not `is_vendor` per DATA-4E-BR4R §4.1. No migration needed. |
| `assignment.ts:282` | Semantics: "Vendor = NOT own-fleet". This is a DERIVED concept, not a direct role lookup. Requires careful reimplementation (VENDOR role AND fleet not owned by current tenant). |

### 15.3 Migration Strategy Per Priority

- **P0:** Immediate (if exists); security consumers cannot tolerate drift.
- **P1:** Phase 1 of reader migration; business rules are critical.
- **P2:** Dual-write implementation; must precede reader migration for new entities.
- **P3:** Phase 2 of reader migration; operational queries are high-volume.
- **P4:** Phase 3; reporting can tolerate brief inconsistency.
- **P5:** Phase 4; UI badges are low-risk.

---

## 16. Tenant / Security Analysis

### 16.1 Tenant Isolation Preservation

| Check | Current State | After Model B Authority | Risk |
|-------|---------------|--------------------------|------|
| `tenant_id` authority | IdentityContext (server-derived) | Unchanged | NONE |
| RLS on `party_roles` | enabled with `get_my_tenant_id()` | Unchanged | NONE |
| RLS on `md_entities` | enabled | Unchanged | NONE |
| Cross-tenant role leakage | Prevented by RLS + FK | Unchanged | NONE |
| Client-controlled tenant identity | NOT POSSIBLE | Unchanged | NONE |

### 16.2 New Security Risk Analysis

Moving role authority from `md_entities.is_*` to `party_roles`:

- **No new RLS risk** — both tables have tenant-scoped RLS.
- **No new authorization bypass** — `party_roles` is not used for authorization (U-02 is authoritative per ADR-070 §12).
- **No new injection risk** — same parameterized query patterns apply.
- **Potential new risk: application writer that reads from `party_roles` and writes to `md_entities.is_*` without the reverse write.** This is a dual-write completeness risk, not a tenant isolation risk.

**Verdict: Moving role authority to `party_roles` does NOT create new security risk, provided dual-write is implemented correctly.**

---

## 17. ADR-070 Alignment

### 17.1 What ADR-070 Explicitly Decides

- §2: Party identity and Party role are distinct canonical concepts.
- §2.2: `party_roles` table structure with UNIQUE constraint.
- §3.1: GLOBAL role types (CUSTOMER, VENDOR, SUPPLIER, BROKER, CARRIER, AGENT).
- §3.2: Commercial context roles (BILL_TO, SHIP_TO, PAYER, ORDERING_PARTY).
- §3.3: Shipment context roles (SHIPPER, CONSIGNEE, NOTIFY_PARTY) are NOT in `party_roles`.
- §3.4: Role coexistence rules including multi-role support.
- §4: Legacy flag treatment table (is_vendor is the high-risk migration).
- §4.2: 6-phase migration strategy (create → dual-write → migrate readers → migrate writers → deprecate → remove).
- §7: Security implications (U-02 remains authoritative for authorization).
- §12: Non-goals (does not remove legacy columns in this phase).

### 17.2 What ADR-070 Implicitly Suggests

- Cardinality intent: AT-MOST-ONE per (tenant, party, role, context) is implied by §3.4 "UNIQUE constraint prevents duplicate assignments" and §2.2's UNIQUE design.
- Source-of-truth authority: `party_roles` is canonical (per §2 "canonical Party role authority" and §11 "All domains use canonical party_roles instead of boolean flags").
- Migration strategy: 6-phase strategy in §4.2 is explicit but not yet ratified as a binding execution plan.

### 17.3 What ADR-070 Does Not Decide

- **Database-level cardinality enforcement mechanism** — ADR-070 does not specify HOW the UNIQUE constraint is enforced when `context_id IS NULL`. The current PostgreSQL behavior is a known constraint but not addressed in the ADR.
- **Explicit "at-most-one per (tenant, party, role, context_type) for GLOBAL"** — only implied.
- **When `party_roles` becomes authoritative** — §4.2 lists phases but does not declare a binding date or trigger.
- **What happens to legacy booleans after migration** — §12 says "does not remove legacy columns in this phase" but does not address long-term treatment.

### 17.4 Architecture Gaps

| Gap | Severity | Resolution |
|-----|----------|------------|
| DB-level cardinality enforcement mechanism | **HIGH** | New ADR (ADR-077) or ADR-070 amendment |
| Explicit "GLOBAL = at-most-one" statement | MEDIUM | ADR-070 amendment |
| Authority transition trigger/criteria | MEDIUM | ADR-077 |
| Long-term treatment of legacy booleans | LOW | ADR-070 amendment or future ADR |

### 17.5 ADR Strategy Recommendation

**Two documents preferred over one:**

1. **ADR-070 Amendment** — add explicit cardinality intent ("at most one per (tenant, party, role, context_type) for GLOBAL") and clarify that legacy booleans are TRANSITIONAL until Phase 5 of the §4.2 strategy completes.

2. **ADR-077 (NEW)** — declare:
   - `party_roles` as the canonical source of truth for CUSTOMER, SUPPLIER, VENDOR, BROKER.
   - Database-level cardinality enforcement via partial unique index.
   - The transition sequence from DATA-4E-BR6 §14.3.
   - Authority activation trigger (e.g., after dual-write + reader migration complete).

**Rationale:** ADR-070 is the architectural decision; ADR-077 is the execution directive. Keeping them separate respects ADR-070's role as the design authority while providing a clear execution path.

---

## 18. Decision Matrix

### 18.1 Role Authority

| Option | Architecture Fit | Security | Concurrency | Migration Risk | Complexity | Recommendation |
|--------|-----------------|----------|-------------|----------------|------------|----------------|
| A — Legacy Boolean | RED | GREEN | RED | LOW (no migration) | LOW | **REJECT** |
| B — Party Role (final) | GREEN | GREEN | GREEN | HIGH | HIGH | **END STATE** |
| C — Transitional Dual | YELLOW | GREEN | YELLOW | MEDIUM | MEDIUM | **INTERIM** |
| D — Derived Compatibility | YELLOW | GREEN | YELLOW | MEDIUM-HIGH | MEDIUM | **LONG-TERM ALT** |

**Selected: C (interim) → B (final), with D as a viable alternative.**

### 18.2 Global Cardinality

| Option | Invariant | Concurrency | Complexity | Recommendation |
|--------|-----------|-------------|------------|----------------|
| A — Application-only | WEAK | POOR | LOW | **REJECT** |
| B — Partial unique index | STRONG | EXCELLENT | LOW | **SELECT** |
| C — Schema redesign | STRONG | EXCELLENT | HIGH | **REJECT (too invasive)** |
| D — Trigger | STRONG | GOOD | MEDIUM | **REJECT (partial index simpler)** |
| E — Intentional multiplicity | N/A | N/A | N/A | **REJECT (contradicts intent)** |

**Selected: B (partial unique index).**

### 18.3 Transition Strategy

| Stage | Necessity | Risk | Recommendation |
|-------|-----------|------|----------------|
| 0 — Current state | — | HIGH (fragile sync) | **DOCUMENT** |
| 1 — ADR-077 | REQUIRED | LOW | **PROCEED** |
| 2 — Partial index | REQUIRED | LOW | **PROCEED** |
| 3 — Dual-write | REQUIRED | MEDIUM | **PROCEED** |
| 4 — Reader migration | REQUIRED | MEDIUM | **PROCEED (phased P0→P5)** |
| 5 — Deprecate legacy | RECOMMENDED | LOW | **PROCEED** |
| 6 — Remove columns | FUTURE | LOW | **DEFER (zero-consumer proof first)** |

---

## 19. Recommended Architecture

### 19.1 Authority

**`party_roles` should become the canonical source of truth for CUSTOMER, SUPPLIER, VENDOR, and BROKER — CONDITIONAL on:**

1. ADR-077 ratification declaring authority.
2. Partial unique index deployed for cardinality safety.
3. Dual-write implemented for all 4 writer sites.
4. Phased reader migration (P0→P5) completed.
5. Legacy booleans downgraded to derived views or stop-written.
6. Zero-consumer proof before column removal.

### 19.2 Cardinality

**GLOBAL role cardinality MUST be database-enforced — YES.**

**Preferred mechanism: partial unique index** on `(tenant_id, party_id, role_type) WHERE context_type = 'GLOBAL' AND context_id IS NULL`.

This provides:
- DB-level atomic enforcement
- Concurrency safety
- No application-side race risk
- Minimal performance overhead
- Compatibility with existing RLS
- Compatibility with ENGAGEMENT/ORDER/CONTRACT contextual roles (which are not affected by the partial index)

### 19.3 Transition

**Recommended sequence (from §14.3):**

1. ADR-077 ratification.
2. Deploy partial unique index.
3. Drift reconciliation (one-time: verify all legacy TRUEs have canonical rows).
4. Dual-write implementation (4 writer sites).
5. Reader migration (78+ consumers, phased P0→P5).
6. Legacy deprecation (convert to views or stop writing).
7. Zero-consumer proof.
8. Column removal (separate decision phase).

### 19.4 Legacy Fields

| Field | Recommended Long-Term Role |
|-------|----------------------------|
| `is_customer` | DEPRECATE → derived view or stop-written → eventually drop |
| `is_supplier` | DEPRECATE → derived view or stop-written → eventually drop |
| `is_vendor` | DEPRECATE → derived view or stop-written → eventually drop |
| `is_broker` | DEPRECATE → derived view or stop-written → eventually drop |

During transition: dual-write maintains sync. After transition: legacy becomes a derived projection (e.g., a SQL view: `CREATE VIEW md_entities_v AS SELECT *, (EXISTS (SELECT 1 FROM party_roles WHERE ... AND role_type='VENDOR')) AS is_vendor FROM md_entities`).

### 19.5 ADR

| Document | Status | Purpose |
|----------|--------|---------|
| ADR-070 | AMEND | Add explicit cardinality intent; clarify "does not remove legacy columns in this phase" |
| ADR-077 (NEW) | CREATE | Declare `party_roles` canonical; specify partial unique index; specify transition sequence |

---

## 20. Required Future ADR Decisions

These decisions are **required** before implementation can proceed:

1. **ADR-070 amendment** — explicit statement: "At most one GLOBAL role of each `role_type` per `(tenant_id, party_id)` is the intended invariant."
2. **ADR-077 creation** — declares `party_roles` as canonical source of truth for the 4 GLOBAL role types and specifies the partial unique index.
3. **Activation criteria** — what triggers the switch from "transitional" to "canonical"? Options:
   - Date-based (e.g., 30 days after dual-write deployment)
   - Consumer-based (e.g., 100% of P0-P2 readers migrated)
   - Manual (human authorization)
4. **Legacy field deprecation timeline** — when do legacy booleans stop being written?
5. **Dangerous consumer resolution** — how to handle `cost-audit:432` (vendor_type) and `assignment.ts:282` (NOT own-fleet)?
6. **Cross-tenant vendor pattern** — `vendor_tenant_id` is separate from `is_vendor`; confirm it is NOT in scope of this transition.

---

## 21. Explicit Non-Actions

The following were considered and explicitly NOT performed:

- ❌ Migration execution
- ❌ DDL/DML
- ❌ Schema changes
- ❌ Code changes
- ❌ Test changes
- ❌ ADR changes
- ❌ Partial unique index creation
- ❌ Trigger creation
- ❌ RLS changes
- ❌ Consumer migration
- ❌ Dual-write implementation
- ❌ Dual-read implementation
- ❌ Legacy boolean removal/deprecation
- ❌ Drift reconciliation
- ❌ Data repair

---

## 22. Final Verdict

# **YELLOW**

Architecture direction is clear and well-supported by evidence:

- `party_roles` is the correct canonical model.
- DB-level cardinality enforcement via partial unique index is the correct mechanism.
- The transition path is well-defined and can be staged safely.

However, implementation must remain blocked until:

1. ADR-070 amendment is ratified (explicit cardinality intent).
2. ADR-077 is created and ratified (source-of-truth authority, partial index, transition sequence).
3. Explicit human authorization for each transition phase.

The BR5R YELLOW findings are resolved at the architecture level. Two follow-on artifacts are required before any execution:

- ADR-070 amendment document
- ADR-077 new document

After these are ratified, the transition can proceed in staged phases with explicit human authorization at each gate.

**No migration was executed. No schema, data, code, tests, or ADRs were modified. This is a discovery-only report.**

---

## 23. Hard-Stop Compliance

- No migration executed.
- No DDL/DML performed.
- No schema modified.
- No data modified.
- No application code modified.
- No tests modified.
- No existing ADRs modified.
- No new ADR created.
- No partial unique index created.
- No RLS modified.
- No legacy boolean values changed.
- No consumer migration performed.
- No dual-write implemented.
- No dual-read implemented.
- No columns removed or deprecated.
- DATA-4E-BR7 was NOT started.

**Hard stop: COMPLIED.**

---

**END OF DATA-4E-BR6 REPORT**
