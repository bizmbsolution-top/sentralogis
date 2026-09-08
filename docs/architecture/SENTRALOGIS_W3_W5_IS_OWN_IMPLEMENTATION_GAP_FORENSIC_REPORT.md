# SENTRALOGIS — W3/W5 `is_own` Implementation Gap Forensic Report

**Phase:** Post D-Repair-4
**Date:** 2026-09-04
**Authorization:** `I AUTHORIZE SENTRALOGIS W3/W5 IS_OWN IMPLEMENTATION GAP FORENSIC DISCOVERY ONLY.`
**Status:** **YELLOW — IMPLEMENTATION GAP CONFIRMED (introduced by X4 migration); W3 AND W5 INDEPENDENT; COMMENTS REFER TO NEVER-COMMITTED SERVICE**

---

## 0. Mandatory Authorization Gate

| Item | Value |
|------|-------|
| Authorization phrase | `I AUTHORIZE SENTRALOGIS W3/W5 IS_OWN IMPLEMENTATION GAP FORENSIC DISCOVERY ONLY.` |
| Authorization source | Explicit user message (separate from the prompt) |
| Authorization timestamp | 2026-09-04T01:42:24Z |
| Authorization status | **VERIFIED** |
| Scope | DISCOVERY ONLY (read-only, no mutation) |

---

## 1. Executive Summary

D-Repair-5 (this phase) conclusively establishes the W3/W5 `is_own` implementation gap as a **GENUINE IMPLEMENTATION GAP** (not stale documentation, not deferred design). The gap was **introduced by the X4 migration** (2026-09-03), which removed the legacy `is_vendor: false, vendor_type: null` writes from W3 and W5 entity INSERTs but did NOT add a canonical `is_own: true` write.

**Key findings:**

1. **W3 INSERT** (`app/(dashboard)/hq/master/fleets/page.tsx:209-222`) omits `is_own`. The comment at line 205 claims `EntityOwnershipService will classify them as is_own=true` — but no such call exists in the code, and `EntityOwnershipService` is **read-only** and cannot perform writes.

2. **W5 INSERT** (`app/(dashboard)/hq/master/drivers/page.tsx:442-455`) has the identical pattern. Comment at line 438 is identical in spirit.

3. **Pre-X4 committed code** (commit 279b3fe0, 2026-08-04) explicitly set `is_vendor: false, vendor_type: null` in the entity INSERT for both W3 and W5. This was the legacy mechanism for marking "internal" entities. **X4 removed this** (per the W5/X4 migration report) but did not replace it with `is_own: true`.

4. **The misleading comments and the `EntityOwnershipService` are both UNCOMMITTED** in the working tree (`??` in git status). 740 untracked files exist in the workspace. Neither the W3/W5 comment text nor the canonical `EntityOwnershipService` has ever been committed to git.

5. **ADR-078 does NOT require automatic `is_own=true` at creation time.** ADR-078 requires that `is_own` writes go through authorized server paths with appropriate authorization. The W3/W5 comments misrepresent ADR-078 by claiming the read-only `EntityOwnershipService` will perform the write.

**Classification: C — IMPLEMENTATION GAP (W3 and W5 both).**

**No mutation. No W3/W5 modification. No schema change. No R-B/R-C. No D-Repair execution.**

---

## 2. Scope

Read-only forensic discovery of the W3/W5 `is_own` implementation gap. Forbidden actions (and confirmed not performed):

- W3 / W5 source modification
- EntityOwnershipService / RoleMutationService / PartyRoleService modification
- `resolveIsVendor()` modification
- Fixtures, seeds, schema, migrations
- R-B, R-C, D-Repair execution
- Data repair, backfill, canonical enrichment

**Read-only operations performed**:
- File reads of W3, W5, EntityOwnershipService
- Git blame on the comment lines in W3 and W5
- Git status to verify untracked state
- ADR-078 review for creation-time guidance

---

## 3. D-Repair-4 Baseline (Immutable)

Per D-Repair-4 findings, preserved unchanged:

- `md_entities.is_own` database default = `false`
- 67 current `is_own=false` records are technically explained by the database default
- Semantic intent of those 67 records remains unresolved
- 0 application entity writers currently include explicit `is_own` assignment (at the time of D-Repair-4)
- No circular dependency with `is_vendor` / `party_roles`
- D-Repair-4 performed zero mutations

**D-Repair-5 does not alter these facts.** D-Repair-5 deepens the investigation by tracing the W3/W5 comment history and the pre-X4 implementation pattern.

---

## 4. W3 Evidence

### 4.1 Current W3 path (post-X4, uncommitted)

**File**: `app/(dashboard)/hq/master/fleets/page.tsx`
**Lines**: 201-223

```typescript
// Handle OWN selection
if (formData.entity_id === 'NEW_INTERNAL') {
    // [AI] DATA-4E-X4: Entity insert without direct role flag writes.
    // Internal entities are created without a VENDOR party_role; the
    // EntityOwnershipService will classify them as is_own=true.
    // Create a dedicated internal entity
    const companyName = profile?.tenants?.name || 'INTERNAL HQ';
    const entityCode = `INT-${companyName.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const { data: newEntity, error: createError } = await supabase
      .from('md_entities')
      .insert({
        tenant_id: tenantId,
        entity_code: entityCode,
        name: companyName,
        vendor_type: null,
        is_active: true
      })
      .select()
      .single();
    
    if (createError) throw createError;
    targetEntityId = newEntity.id;
}
```

**Critical observations**:
- INSERT payload (lines 211-217) does NOT include `is_own` field.
- `is_own` will receive the database default `false` per the schema.
- NO subsequent UPDATE/UPSERT to set `is_own=true`.
- NO call to `EntityOwnershipService.classifyOwnership()` or any other service that would set `is_own`.
- The comment at line 205 claims `EntityOwnershipService will classify them as is_own=true` — **no such call exists in the code**.

### 4.2 Pre-X4 W3 path (committed 2026-08-04)

**Commit**: `279b3fe0` (feat: trucking regions master + staff management improvements)
**Lines**: 161-173 (in the pre-X4 file version)

```typescript
const { data: newEntity, error: createError } = await supabase
  .from('md_entities')
  .insert({
    tenant_id: tenantId,
    entity_code: entityCode,
    name: companyName,
    is_vendor: false,        // ← EXPLICIT WRITE (pre-X4)
    vendor_type: null,
    is_active: true
  })
  .select()
  .single();
```

**Critical observation**: The pre-X4 W3 path **explicitly set `is_vendor: false`** to mark the new entity as "internal" (along with `vendor_type: null`). This was the pre-canonical legacy mechanism for marking internal entities. **X4 removed this write** (per the X4 migration report's "no direct role flag writes" rule) but did not replace it with `is_own: true`.

### 4.3 Git blame evidence

```
$ git blame app/(dashboard)/hq/master/fleets/page.tsx -L 200,220

155bbda1 (bizmbsolution-top 2026-05-06) 200:        // Handle OWN selection
155bbda1 (bizmbsolution-top 2026-05-06) 202:        if (formData.entity_id === 'NEW_INTERNAL') {
00000000 (Not Committed Yet       ) 203:            // [AI] DATA-4E-X4: Entity insert without direct role flag writes.
00000000 (Not Committed Yet       ) 204:            // Internal entities are created without a VENDOR party_role; the
00000000 (Not Committed Yet       ) 205:            // EntityOwnershipService will classify them as is_own=true.
155bbda1 (bizmbsolution-top 2026-05-06) 206:            // Create a dedicated internal entity
279b3fe0 (bizmbsolution-top 2026-08-04) 207:            const companyName = profile?.tenants?.name || 'INTERNAL HQ';
...
```

**The comment text (lines 203-205) is `Not Committed Yet` — it is in the local working tree but has never been committed to git history.** The INSERT body (lines 211-217) is the pre-X4 version (committed 2026-05-06 / modified 2026-08-04).

### 4.4 W3 internal HQ semantic signal

The W3 INSERT uses these fields as inputs to the entity creation:
- `tenant_id` (server-derived)
- `entity_code` (deterministic: `INT-{name}-{random}`)
- `name` = `profile?.tenants?.name || 'INTERNAL HQ'`
- `vendor_type` = `null`
- `is_active` = `true`

**There IS a clear semantic signal for "internal HQ"**: the `entity_id === 'NEW_INTERNAL'` selector in the calling code, plus the deterministic entity_code prefix `INT-`, plus the `name` derived from the tenant name. This signal is **strong enough** to authoritatively establish `is_own=true` for these records, but the W3 code does not act on it.

---

## 5. W5 Evidence

### 5.1 Current W5 path (post-X4, uncommitted)

**File**: `app/(dashboard)/hq/master/drivers/page.tsx`
**Lines**: 433-460

```typescript
// Handle OWN selection creation if internal entity missing
if (driverTypeForm === 'INTERNAL') {
  if (!internalEntityId) {
    // [AI] PHASE-W5: Entity insert without direct role flag writes.
    // Internal entities are created without a VENDOR party_role; the
    // EntityOwnershipService will classify them as internal per ADR-078
    // (absence of VENDOR role = is_own classification).
    const companyName = profile?.tenants?.name || 'INTERNAL HQ';
    const entityCode = `INT-${companyName.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const { data: newEntity, error: createError } = await supabase
      .from('md_entities')
      .insert({
        tenant_id: tenantId,
        entity_code: entityCode,
        name: companyName,
        vendor_type: null,
        is_active: true
      })
      .select()
      .single();
    
    if (createError) throw createError;
    targetEntityId = newEntity.id;
    setInternalEntityId(newEntity.id);
  } else {
    targetEntityId = internalEntityId;
  }
}
```

**Identical pattern to W3**:
- INSERT payload omits `is_own`.
- `is_own` receives the database default `false`.
- NO `EntityOwnershipService` call exists.
- The comment at line 438 makes the same false claim.

### 5.2 Pre-X4 W5 path (committed 2026-08-04)

**Commit**: `279b3fe0`
**Original line 195 (pre-X4)**: `is_vendor: false,` in the entity INSERT.

The pre-X4 W5 path also explicitly set `is_vendor: false` in the entity INSERT — same pattern as W3, same removal in X4.

### 5.3 Git blame evidence

```
$ git blame app/(dashboard)/hq/master/drivers/page.tsx -L 433,460

07f05c63 (bizmbsolution-top 2026-08-13) 433:       // Handle OWN selection creation if internal entity missing
07f05c63 (bizmbsolution-top 2026-08-13) 434:       if (driverTypeForm === 'INTERNAL') {
07f05c63 (bizmbsolution-top 2026-08-13) 435:         if (!internalEntityId) {
00000000 (Not Committed Yet       ) 436:           // [AI] PHASE-W5: Entity insert without direct role flag writes.
00000000 (Not Committed Yet       ) 437:           // Internal entities are created without a VENDOR party_role; the
00000000 (Not Committed Yet       ) 438:           // EntityOwnershipService will classify them as internal per ADR-078
00000000 (Not Committed Yet       ) 439:           // (absence of VENDOR role = is_own classification).
279b3fe0 (bizmbsolution-top 2026-08-04) 440:           const companyName = profile?.tenants?.name || 'INTERNAL HQ';
...
```

**Same finding as W3**: the comment text (lines 436-439) is `Not Committed Yet`. The INSERT body is the pre-X4 version (committed 2026-08-04).

### 5.4 W5 internal HQ semantic signal

The W5 INSERT uses these inputs:
- `tenant_id` (server-derived)
- `entity_code` (deterministic: `INT-{name}-{random}`)
- `name` = `profile?.tenants?.name || 'INTERNAL HQ'`
- `vendor_type` = `null`
- `is_active` = `true`
- `driverTypeForm === 'INTERNAL'` (calling code selector)

**Same strong semantic signal as W3**: the calling code's `INTERNAL` selector and the deterministic entity_code prefix `INT-` clearly indicate this is an "internal HQ" entity. This signal is sufficient to authoritatively establish `is_own=true`, but the W5 code does not act on it.

---

## 6. Comment-to-Code Reconciliation

Per prompt Section 3:

| Path | Comment Intent | Actual Code | Persisted Result | Classification |
|------|----------------|-------------|------------------|----------------|
| `app/(dashboard)/hq/master/fleets/page.tsx:203-205` | "EntityOwnershipService will classify them as is_own=true" after INSERT | INSERT omits `is_own`; no service call; no post-insert UPDATE | `is_own = false` (database default) | **GENUINE_IMPLEMENTATION_GAP** |
| `app/(dashboard)/hq/master/drivers/page.tsx:436-439` | "EntityOwnershipService will classify them as internal per ADR-078 (absence of VENDOR role = is_own classification)" after INSERT | INSERT omits `is_own`; no service call; no post-insert UPDATE | `is_own = false` (database default) | **GENUINE_IMPLEMENTATION_GAP** |

**Both W3 and W5 have the same classification: GENUINE_IMPLEMENTATION_GAP.**

**Establishing the intended contract (per prompt Section 3, "Establish the intended contract first"):**

The W3/W5 comments claim that internal HQ entities should be classified as `is_own=true`. This intent is consistent with:
- The pre-X4 implementation (which set `is_vendor: false` to mark the same entities as "internal")
- The X4 migration report's stated intent (canonical ownership, not legacy `is_vendor`)
- The naming pattern (`INTERNAL HQ`, `INT-{name}-{random}`)
- The calling code selectors (`NEW_INTERNAL`, `INTERNAL`)

**The intended contract is: "When W3/W5 creates a new 'internal HQ' entity, that entity MUST have `is_own = true` in the database after the operation completes."**

The actual code does NOT satisfy this contract. The `is_own` value ends up as `false` (database default), not `true` (intended).

This is NOT a documentation-only issue (the comment is wrong AND the code is incomplete). It is NOT a deferred design (the contract is clear). It is NOT stale documentation (the comment was added recently, after the X4 migration).

It IS a genuine implementation gap: the contract is well-defined, the code attempts to satisfy it, but the implementation is incomplete — the post-insert ownership classification step is missing.

---

## 7. EntityOwnershipService Contract

**File**: `lib/domain/entity/entity-ownership-service.ts` (43 lines, UNTRACKED in git)

**API surface**:

```typescript
class EntityOwnershipService {
  constructor(private readonly supabase: SupabaseClient) {}

  async classifyOwnership(tenantId: string, entityId: string): Promise<OwnershipClassification> {
    // ...
    const { data, error } = await this.supabase
      .from('md_entities')
      .select('is_own')
      .eq('tenant_id', tenantId)
      .eq('id', entityId)
      .maybeSingle();
    // ...
    const isOwn = data.is_own ?? null;
    return { isOwn, confidence: 'explicit' | 'unknown', source: 'is_own' | 'unclassified' };
  }
}
```

**Contract verification** (per prompt Section 4):

| Property | Value |
|----------|-------|
| Required inputs | `tenantId: string`, `entityId: string` |
| Classifies existing entities only? | **YES** — reads from DB; cannot classify non-existent entity |
| Writes `md_entities.is_own`? | **NO** — read-only service |
| Read-only or mutating? | **READ-ONLY** |
| Can safely operate after entity creation? | **YES** — but only READS what already exists; cannot WRITE |
| Assumes entity existence? | **YES** — `entityId` must already exist in DB |
| Depends on tenant identity? | **YES** — `tenantId` filter is mandatory |
| Hidden `is_vendor` dependency? | **NO** — only `is_own` is selected |

**Critical finding**: The W3/W5 comments claim that `EntityOwnershipService` will classify newly-created entities. This is **architecturally impossible** because:
1. `classifyOwnership` only reads `is_own` from the database.
2. The service does not perform any writes.
3. The service cannot create a new ownership value for a newly-created entity.

The W3/W5 comments are therefore **factually incorrect**, not just "stale" or "deferred."

---

## 8. ADR-078 Reconciliation

Per prompt Section 5.

**ADR-078 requirements for `is_own` writes**:

| Line | Statement | Implication |
|------|-----------|-------------|
| 90 | "is_own MUST be set exclusively by server-side classification/write authority" | W3/W5 must use server-side path to set `is_own` |
| 91 | "Direct client-side writes to is_own are prohibited" | Browser must not directly write `is_own` |
| 120 | "Writes to is_own require appropriate authorization (tenant admin or owner role)" | Requires auth check |
| 239 | "Migration Strategy step 2: Writer authorization — ensure is_own writes go through authorized server-side paths only" | Step 2 of the migration strategy |
| 262 | "I-OWN-6: is_own is written exclusively by authorized server-side paths. Direct client-side writes are prohibited." | Invariant |

**ADR-078 does NOT explicitly require** that entity creation automatically sets `is_own=true`. The closest the ADR comes to creation-time guidance is in Decision 4:

> Decision 4 — Write Authority and Validation
> is_own is written exclusively by:
> 1. Explicit admin/owner action — authorized user sets ownership via controlled UI/API
> 2. Server-side normalization from explicit signals — when vendor_type is explicitly set to a known value ("OWN", "INTERNAL", "VENDOR") by an authorized user, the ownership service normalizes to is_own

**Interpretation**: ADR-078 contemplates that W3/W5 could set `is_own` via Decision 4.2 ("server-side normalization from explicit signals"). The W3/W5 callsite is a server-side `supabase.from('md_entities').insert(...)` call from a Next.js server action context — it qualifies as a server-side path. The calling code's `NEW_INTERNAL` / `INTERNAL` selector and the deterministic `INT-` entity_code prefix are explicit signals.

**However, ADR-078 does NOT mandate** that this path MUST set `is_own=true`. ADR-078 only REQUIRES that if `is_own` is written, the path must be authorized server-side.

**Conclusion**: ADR-078 does not forbid the W3/W5 path from setting `is_own=true`; it merely does not require it. The W3/W5 implementation gap is therefore a **deviation from the implicit intent** (which is established by the pre-X4 code that set `is_vendor: false` and by the X4 migration's stated goal of canonical ownership), not a direct violation of ADR-078.

**The W3/W5 comments misrepresent ADR-078** by claiming:
- "EntityOwnershipService will classify them as is_own=true" — ADR-078 does not say this
- "absence of VENDOR role = is_own classification" — ADR-078 does not say this; ADR-078 explicitly states "is_own and party_roles.VENDOR are orthogonal" (Decision 8)

**The comments are factually wrong on two counts**:
1. They claim `EntityOwnershipService` (a read-only service) will perform a write.
2. They claim ADR-078 derives `is_own` from absence of VENDOR role — which is the opposite of ADR-078 Decision 8.

---

## 9. Database Default Analysis

Per prompt Section 7.

**Confirmed via D-Repair-4**: `md_entities.is_own` has database default `false` (verified via PostgREST OpenAPI introspection).

**Technical behavior**: A newly inserted entity with no explicit `is_own` value receives `false`.

**Semantic behavior (per W3/W5 context)**:
- W3/W5 call the `NEW_INTERNAL` / `INTERNAL` selector — this is a clear "internal" semantic signal.
- The post-insert `is_own` value is `false` (database default).
- The W3/W5 caller's semantic intent is "this is an internal entity, not a vendor."
- The actual `is_own=false` value happens to match "external/non-own" semantically — which is **opposite to the caller's intent**.

**The technical default is in CONFLICT with the semantic intent of the calling code.** This is the implementation gap.

---

## 10. Internal HQ Semantic Signal Assessment

Per prompt Section 8.

**The W3/W5 entity creation has a clear "internal HQ" concept.** Evidence:

| Signal | W3 | W5 |
|--------|----|----|
| Calling code selector | `formData.entity_id === 'NEW_INTERNAL'` | `driverTypeForm === 'INTERNAL'` |
| Deterministic entity_code prefix | `INT-{...}` | `INT-{...}` |
| Entity name | `profile?.tenants?.name \|\| 'INTERNAL HQ'` | `profile?.tenants?.name \|\| 'INTERNAL HQ'` |
| `vendor_type` | `null` | `null` |
| `is_active` | `true` | `true` |

**This signal is RELIABLE enough** to authoritatively establish `is_own=true` for these records. There is no ambiguity: when the caller passes `NEW_INTERNAL` or `INTERNAL`, the new entity is always intended to be the tenant's internal HQ.

**There is a semantic signal. The code does not act on it.** The signal exists but the implementation gap means it is not translated into a canonical `is_own=true` write.

---

## 11. Vendor Independence

Per prompt Section 9.

**Verification: W3/W5 does NOT determine ownership by `is_vendor` or `party_roles.VENDOR`.**

| File | Line | `is_vendor` | `party_roles` | `resolveIsVendor()` |
|------|------|-------------|---------------|---------------------|
| `app/(dashboard)/hq/master/fleets/page.tsx:201-223` | INSERT body | Not in payload (removed by X4) | Not referenced | Not called |
| `app/(dashboard)/hq/master/drivers/page.tsx:433-460` | INSERT body | Not in payload (removed by X4) | Not referenced | Not called |

**Vendor independence verified.** The W3/W5 INSERT path does NOT use `is_vendor` or `party_roles` or `resolveIsVendor()` to determine ownership.

**No RED classification on this dimension.**

---

## 12. Transaction / Atomicity Assessment

Per prompt Section 10.

**The intended sequence** (per W3/W5 comment intent) would be:

1. Create entity (INSERT into `md_entities`).
2. Classify ownership (call `EntityOwnershipService` or similar).
3. Persist ownership (UPDATE `is_own=true`).

**Current architecture support for atomic execution**:
- The W3/W5 INSERT is a single `supabase.from('md_entities').insert(...).select().single()` call — atomic at the row level.
- No transaction wrapper is used in W3/W5.
- No `EntityOwnershipService` call exists in W3/W5.
- No post-insert UPDATE exists in W3/W5.
- `supabase-js` does not provide automatic multi-statement transaction support for the PostgREST client (transactional RPCs require custom PostgreSQL functions).

**Atomicity analysis**:
- A correct implementation could either (a) set `is_own: true` in the INSERT payload (single atomic INSERT), or (b) execute an UPDATE after the INSERT (two statements, not atomic, but acceptable if both succeed or both fail in practice).
- ADR-078 does not require atomicity across entity creation and ownership classification.
- The pre-X4 implementation used option (a) implicitly (by setting `is_vendor: false` and `vendor_type: null`).

**No architectural barrier to a correct implementation.** The gap is purely a missing code step, not a missing transaction infrastructure.

---

## 13. Historical Context

Per prompt Section 11.

### 13.1 Pre-X4 era (before 2026-09-03)

**Pre-X4 W3 INSERT** (commit 279b3fe0, 2026-08-04, line 167-168):

```typescript
is_vendor: false,
vendor_type: null,
```

The pre-X4 code **explicitly marked** new internal entities as "not vendor" by setting `is_vendor: false` and `vendor_type: null`. This was the pre-canonical legacy mechanism.

### 13.2 X4 era (2026-09-03, R-A implementation)

**The X4 migration** (per `SENTRALOGIS_DATA4EX4_W3_W4_CANONICAL_WRITER_MIGRATION.md`) was scoped to:
- W3 (`hq/master/fleets`): migrate fleet-entity INSERT to canonical role-based path
- W4 (`QuickAddContactModal`): migrate contact INSERT to canonical path
- Remove direct `is_vendor` writes per BR9/BR10
- Migrate R3 (special consumer for fleet display) to use canonical role

**X4 did NOT explicitly require** that W3's internal-entity creation path set `is_own=true`. X4's scope was about **role canonicalization** (VENDOR role via `party_roles`), not ownership classification (`is_own`).

**The implementation gap was introduced when X4 removed `is_vendor: false`** from the W3 internal-entity INSERT **without adding a corresponding `is_own: true` write**.

### 13.3 Post-X4 (current state)

The current W3/W5 working tree contains:
- The pre-X4 INSERT body (without `is_vendor: false`)
- New comment text claiming `EntityOwnershipService` will classify
- Reference to `EntityOwnershipService` which is itself untracked in git

**The 740 untracked files in the working tree** (per `git status`) include the canonical `EntityOwnershipService`, all DATA-4E ADR files, the R-A implementation report, the X4/X5/X6 reports, the canonical owner services, and many more. The entire canonical infrastructure introduced by DATA-4E is in the local working tree but has not been committed.

**This explains the W3/W5 comment situation**:
- The W3/W5 comments were added in the working tree (uncommitted) as part of the R-A / canonicalization effort.
- The comments reference `EntityOwnershipService` which is also in the working tree (uncommitted).
- If/when these files are committed together, the comments would point to a service that exists in the same commit.
- In the current uncommitted state, the comments reference a service that exists in the local filesystem but is not in the git-tracked codebase.

### 13.4 When was the W3 INSERT body last modified in git?

`git blame` shows the W3 INSERT body was last modified in commit `279b3fe0` (2026-08-04). The comment text was added in the working tree (`Not Committed Yet`).

**Conclusion**: The W3 INSERT body has not been modified in git history since 2026-08-04. The X4 migration did not modify the W3 INSERT body in git (the X4 change exists in the working tree but is uncommitted).

---

## 14. Gap Classification

Per prompt Section 12.

### Selected classification: **C — IMPLEMENTATION GAP** (for both W3 and W5)

**Justification**:

- The intended contract is well-defined: new internal HQ entities should have `is_own=true` after creation.
- The pre-X4 code established the contract via legacy `is_vendor: false, vendor_type: null` writes.
- The X4 migration removed the legacy writes but did not implement the canonical `is_own: true` write.
- The current code attempts to satisfy the contract via a comment that references a service that is read-only and cannot perform writes.
- The actual `is_own` value ends up as `false` (database default), in direct conflict with the caller's intent.

**Not A (NO GAP)**: There IS a gap; the comment is incorrect and the code is incomplete.

**Not B (DOCUMENTATION GAP)**: This is not merely a documentation issue. The implementation actually fails to satisfy the contract.

**Not D (DESIGN GAP)**: ADR-078 does define the contract sufficiently. The "internal HQ" semantic is clear from the calling code. The gap is in execution, not design.

**Not E (MIXED)**: Both W3 and W5 have the identical gap pattern.

---

## 15. Human Decisions Required

Per prompt Section 13.

| Decision | Type | Recommendation |
|----------|------|----------------|
| **HD-1**: Should W3/W5 be modified to set `is_own: true` in the entity INSERT payload (option A: inline write) or in a post-insert UPDATE (option B: two-step) or via a server action (option C: canonical service call)? | Implementation choice | Recommend A: inline `is_own: true` in the INSERT payload (simplest, atomic, matches pre-X4 pattern of inline legacy writes). |
| **HD-2**: Should the misleading comments at W3 line 205 and W5 line 438 be corrected/removed as part of the fix? | Documentation choice | Recommend: correct the comments to accurately describe the chosen implementation (after HD-1 decision). |
| **HD-3**: Should the `is_own: true` write be conditional on a `NEW_INTERNAL` / `INTERNAL` selector, or always-on for these entity creation paths? | Behavior choice | Recommend: always-on for the `NEW_INTERNAL` / `INTERNAL` path (the selector is the trigger). |
| **HD-4**: Should the W3/W5 fix be authorized as a new phase, or as part of D-Repair-5-Apply (which does not exist yet)? | Phase authorization | Recommend: new phase with explicit "I AUTHORIZE W3/W5 IS_OWN FIX ONLY" authorization. |
| **HD-5**: Should the canonical infrastructure (EntityOwnershipService, ADRs, R-A/X reports, etc.) be committed to git before the W3/W5 fix is applied? | Repository hygiene | Recommend: yes, but this is a separate decision. The W3/W5 fix can be done independently. |
| **HD-6**: Should the 67 production records with `is_own=false` (D-Repair-4 DATABASE_DEFAULT) be re-classified as part of the W3/W5 fix? | Data repair | Recommend: NO. Per ADR-078, this requires explicit authorized-user classification, not a heuristic backfill. The W3/W5 fix only addresses FUTURE entity creation. Historical records are a separate D-Repair-5 / Canonical Enrichment concern. |
| **HD-7**: Should the HALU `7360acc3` `is_own=true` (D-Repair-4 UNKNOWN_PROVENANCE) be re-classified? | Data repair | Recommend: NO. Same as HD-6. The W3/W5 fix is about future writes, not historical repair. |

**Per prompt**: these are documented for human decision, not decided during D-Repair-5.

---

## 16. Explicit Non-Actions

This phase did **NOT**:

- Modify W3, W5, EntityOwnershipService, PartyRoleService, RoleMutationService
- Modify `resolveIsVendor()` or `mapTransportersForTenant()`
- Modify any fixture, seed, or test data
- Create or apply any migration
- Modify any schema, ADR, or production service
- Perform any data repair, backfill, or canonical enrichment
- Begin R-B, R-C, W3 (modification), W5 (modification), D-Repair execution

**Mutations: 0. W3 changes: 0. W5 changes: 0. Schema changes: 0. R-B: 0. R-C: 0.**

**Read-only operations performed**:
- File reads of W3, W5, EntityOwnershipService, ADR-078
- Git blame on W3 lines 200-220 and W5 lines 433-460
- Git status to verify untracked state
- Git show of pre-X4 versions of W3 and W5

---

## 17. G1–G24 Gate Results

| Gate | Result | Evidence |
|------|--------|----------|
| G1 — Authorization verified | ✅ PASS | Explicit user message 2026-09-04T01:42:24Z |
| G2 — D-Repair-4 baseline preserved | ✅ PASS | Section 3 reaffirms baseline; no changes |
| G3 — W3 path identified | ✅ PASS | Section 4: `app/(dashboard)/hq/master/fleets/page.tsx:201-223` |
| G4 — W5 path identified | ✅ PASS | Section 5: `app/(dashboard)/hq/master/drivers/page.tsx:433-460` |
| G5 — W3 comment reconciled | ✅ PASS | Section 6: GENUINE_IMPLEMENTATION_GAP |
| G6 — W5 comment reconciled | ✅ PASS | Section 6: GENUINE_IMPLEMENTATION_GAP |
| G7 — EntityOwnershipService contract verified | ✅ PASS | Section 7: read-only, cannot write |
| G8 — ADR-078 contract verified | ✅ PASS | Section 8: ADR-078 does not require creation-time `is_own=true`; comments misrepresent ADR-078 |
| G9 — Database default verified | ✅ PASS | Section 9: `default: false` per D-Repair-4 |
| G10 — Internal HQ semantic signal assessed | ✅ PASS | Section 10: clear `NEW_INTERNAL`/`INTERNAL` selector + `INT-` prefix + tenant name |
| G11 — Vendor independence verified | ✅ PASS | Section 11: W3/W5 INSERT does not use `is_vendor`/`party_roles.VENDOR`/`resolveIsVendor` |
| G12 — Transaction/atomicity implications assessed | ✅ PASS | Section 12: no architectural barrier; gap is missing code, not infrastructure |
| G13 — Historical context assessed | ✅ PASS | Section 13: pre-X4 set `is_vendor: false, vendor_type: null`; X4 removed; no replacement; comments and EntityOwnershipService uncommitted in working tree |
| G14 — No heuristic ownership inference | ✅ PASS | The intended contract is explicit (NEW_INTERNAL/INTERNAL selector), not heuristic |
| G15 — No External Non-Vendor invention | ✅ PASS | Gap is about W3/W5 OWN case, not EXTERNAL NON-VENDOR |
| G16 — No production mutation | ✅ PASS | Section 16 |
| G17 — No schema mutation | ✅ PASS | Section 16 |
| G18 — No fixture mutation | ✅ PASS | Section 16 |
| G19 — No R-B/R-C change | ✅ PASS | Section 16 |
| G20 — No W3/W5 modification | ✅ PASS | Section 16 |
| G21 — Evidence-based classification | ✅ PASS | All evidence from git history + file content; no fabrication |
| G22 — Human decisions documented | ✅ PASS | Section 15: 7 human decisions |
| G23 — Report created | ✅ PASS | This document |
| G24 — Final hard stop executed | ✅ PASS | Section 19 |

**G1–G24 result: 24 / 24 PASS.** Status is YELLOW per Section STATUS RULES:

> YELLOW: Use YELLOW if the gap is established but the intended remediation requires human architectural/product decision, historical intent remains incomplete, or ADR-078 does not fully define the creation-time behavior.

The gap is **clearly established** (G5, G6 PASS), but the intended remediation (how to fix W3/W5) requires human architectural decision (HD-1, HD-2, HD-3, HD-4) which D-Repair-5 cannot make. ADR-078 does not fully define the creation-time behavior (G8 PASS — ADR-078 does not require automatic `is_own=true`).

**YELLOW is correct.**

---

## 18. Mutation Statement

| Category | Count |
|----------|------:|
| Production source changes | 0 |
| Schema changes | 0 |
| Migration changes | 0 |
| Data mutations | 0 |
| Fixture changes | 0 |
| Seed changes | 0 |
| ADR changes | 0 |
| Service changes | 0 |
| Reader changes | 0 |
| Writer changes | 0 |
| R-B changes | 0 |
| R-C changes | 0 |
| W3 changes | 0 |
| W5 changes | 0 |
| EntityOwnershipService changes | 0 |
| resolveIsVendor() changes | 0 |

**All zero. Discovery only.**

---

## 19. Recommendation

The W3/W5 `is_own` implementation gap is a **GENUINE IMPLEMENTATION GAP** introduced by the X4 migration. The X4 migration removed the legacy `is_vendor: false, vendor_type: null` writes from W3 and W5 internal-entity INSERTs but did not add a canonical `is_own: true` write. The current code attempts to compensate via a comment that references `EntityOwnershipService` (a read-only service that cannot perform writes). The result is that **all future W3/W5 internal HQ entities will be created with `is_own=false` (database default)**, directly contradicting the calling code's semantic intent.

**Recommended remediation** (NOT authorized by D-Repair-5, requires separate explicit authorization):

1. **Modify W3** to set `is_own: true` in the entity INSERT payload (line 211-217) when `formData.entity_id === 'NEW_INTERNAL'`.
2. **Modify W5** to set `is_own: true` in the entity INSERT payload (line 444-450) when `driverTypeForm === 'INTERNAL'`.
3. **Correct the misleading comments** at W3 line 205 and W5 line 438 to accurately describe the chosen implementation.
4. **Add a new W3/W5 targeted test** to verify that newly-created internal HQ entities have `is_own=true` after the operation.
5. **Optionally commit the canonical infrastructure** (EntityOwnershipService, ADRs, R-A/X reports) to git so the comments reference committed code.
6. **Do NOT retroactively re-classify the 67 production records** (per ADR-078 Decision 4 — explicit authorized-user classification required).
7. **Do NOT modify the EntityOwnershipService** — it correctly implements ADR-078 Resolution Algorithm and is read-only by design.

**No mutation executed in D-Repair-5. All changes are recommended for a future authorized phase.**

---

## 20. HARD STOP

```
SENTRALOGIS W3/W5 IS_OWN IMPLEMENTATION GAP FORENSIC REPORT
STATUS: YELLOW — IMPLEMENTATION GAP CONFIRMED (introduced by X4 migration); COMMENTS REFER TO NEVER-COMMITTED READ-ONLY SERVICE
```

The W3 (fleet) and W5 (driver) entity creation paths do NOT set `is_own=true` for newly-created internal HQ entities. The pre-X4 code explicitly set `is_vendor: false, vendor_type: null` (the legacy "internal" marker); X4 removed these writes but did not add a canonical `is_own: true` write. The current comments claim that `EntityOwnershipService` (a read-only service that exists only in the uncommitted working tree) will perform the write, which is **factually impossible**.

Classification: **C — IMPLEMENTATION GAP** (for both W3 and W5).

**No mutation. No W3/W5 modification. No schema change. No R-B/R-C. No D-Repair execution.**

**HARD STOP — END W3/W5 IS_OWN IMPLEMENTATION GAP FORENSIC DISCOVERY.**
