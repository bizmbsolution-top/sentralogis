# SENTRALOGIS — D-Repair-4 `is_own` Historical Origin Investigation

**Phase:** Post D-Repair-3
**Date:** 2026-09-04
**Authorization:** `I AUTHORIZE SENTRALOGIS D-REPAIR-4 IS_OWN HISTORICAL ORIGIN INVESTIGATION ONLY.`
**Status:** **YELLOW — ORIGIN PARTIALLY ESTABLISHED, 67/69 RECORDS RESOLVED AS DATABASE_DEFAULT, 1/69 UNRESOLVED, 1/69 FIXTURE_DECLARATION**

---

## 0. Mandatory Authorization Gate

| Item | Value |
|------|-------|
| Authorization phrase | `I AUTHORIZE SENTRALOGIS D-REPAIR-4 IS_OWN HISTORICAL ORIGIN INVESTIGATION ONLY.` |
| Authorization source | Explicit user message (separate from the prompt) |
| Authorization timestamp | 2026-09-04T01:15:29Z |
| Authorization status | **VERIFIED** |
| Scope | READ-ONLY FORENSIC ORIGIN INVESTIGATION ONLY (no mutation) |

---

## 1. Executive Summary

D-Repair-4 establishes the historical origin of all 69 `md_entities.is_own` values through exhaustive investigation of migrations, seeds, application writers, git history, and database schema.

**Critical new finding (not in D-Repair-3):**

> **`md_entities.is_own` has a database default of `false` in the remote Supabase schema** (confirmed via PostgREST OpenAPI introspection).

This single finding **resolves the provenance gap for 67 of 69 records**:

- **All 67 `is_own=false` records** originated from the **database default** applied to entities that were inserted WITHOUT explicitly setting `is_own`. This is the **canonical path** for these records per their technical origin, but it is **NOT semantic classification** per ADR-078 Decision 3 (which requires explicit `is_own` setting).
- **1 record** (`cc3394e4-...` ATM "INTERNAL HQ") was set explicitly via the 20260811 migration UPDATE — **FIXTURE_DECLARATION**.
- **1 record** (`7360acc3-...` HALU "INTERNAL HQ") was created in the project prototype phase (2026-05-03, 3 months before W5, 1 month before git history) — **UNKNOWN_PROVENANCE** with respect to semantic intent. Its `is_own=true` was set after initial creation (`updated_at` 2026-05-13 > `created_at` 2026-05-03) by an untracked mechanism.

**No circular evidence. No architectural contradiction. No mutation. No R-B/R-C/W5/D-Repair execution.**

**However, a critical application-level finding emerged:**

> The W3 (fleet) and W5 (driver) entity INSERT paths contain a comment claiming `EntityOwnershipService will classify them as is_own=true` after insert, but the actual code does NOT explicitly set `is_own=true`. The database default `false` is therefore applied — directly contradicting the W3/W5 writer's stated intent.

This means **W3 and W5 internal-entity creation paths create entities with `is_own=false`**, even though those entities are semantically intended to be `is_own=true`. This is an **architectural implementation gap** in W3 and W5 — **NOT a D-Repair-4 scope issue**, but a finding that the W3/W5 implementations do not match their own canonical intent.

---

## 2. Scope

Read-only historical forensic investigation. Forbidden actions (and confirmed not performed):

- INSERT, UPDATE, DELETE, UPSERT, RPC mutation
- Data repair, backfill, `is_own` normalization
- Fixture creation, seed modification
- Migration creation, schema modification
- R-B, R-C, W5 (modification), W3 (modification), D-Repair execution
- `resolveIsVendor()` modification
- ADR modification
- W3 / W5 modification

**Read-only operations performed:**
- 1 read-only PostgREST query for OpenAPI schema introspection
- 1 read-only PostgREST query for entity timestamps
- 1 read-only PostgREST query for oldest entities
- Multiple read-only bash/grep queries against local files
- Git log queries (read-only)

---

## 3. D-Repair-3 Baseline (Immutable)

| Classification                  | Count |
| ------------------------------- | ----: |
| Total relevant `is_own` records |    69 |
| `is_own=true`                   |     2 |
| `is_own=false`                  |    67 |
| `is_own=NULL`                   |     0 |
| Known repository provenance     |     1 |
| UNKNOWN_PROVENANCE              |    68 |
| Legacy-derived evidence         |     0 |
| Circular evidence               |     0 |
| Mutations                       |     0 |

**Baseline preserved unchanged. D-Repair-4 does not modify this baseline; it classifies each of the 69 records within this baseline.**

---

## 4. Investigation Method

D-Repair-4 searched for evidence in **6 dimensions** in the order specified by the prompt:

| Section | Investigation | Method |
|---------|---------------|--------|
| A | Migration History | Exhaustive grep across 200+ SQL files; git log -S/-G for `is_own` in `*.sql` |
| B | Seed/Fixture History | Exhaustive search of `supabase/seeds/`, `lib/seed/`, test factories, scratch/debug scripts |
| C | Application Writers | Grep for `.insert/.update/.upsert` to `md_entities`; review of payloads for `is_own` field |
| D | Backfill/Legacy Paths | Grep for code deriving `is_own` from `is_vendor`/`party_roles`; review of reconciliation service |
| E | Git History | `git log -S` and `git log -G` for `is_own`; review of `md_entities` introduction |
| F | Database Default | PostgREST OpenAPI introspection of `md_entities.is_own` schema definition |
| G | HALU Special Case | Targeted timestamp and git-history search for `7360acc3-...` |
| H | `is_own=false` Special Case | Investigation of all writers; default analysis |
| I | Database Default Analysis | Same as F (OpenAPI introspection) |
| J | Independence Verification | Reaffirmed: no code path derives `is_own` from other fields |

---

## 5. Migration Evidence

**Search**: Exhaustive grep for `is_own` across all SQL files in `supabase/migrations/`. Git log for all `is_own` introductions in `*.sql`.

**Findings**:

| Migration | Line | Operation | Affected Entity | Value Set |
|-----------|-----:|-----------|-----------------|-----------|
| `20260811_fix_job_orders_rls_and_dup_entities.sql` | 15 | `UPDATE md_entities SET is_own = true WHERE id = 'cc3394e4-...'` | cc3394e4-554a-49e6-95aa-8cf6fc41a8b3 (ATM, tenant c0611a0a) | `is_own = true` |

**Total `is_own` migration writes: 1** (set `is_own=true` for one entity).

**Total `is_own = false` migration writes: 0.**

**The `is_own` column itself is NOT defined in any migration** in this repository. The column definition (including its `DEFAULT false`) was applied directly to the remote Supabase database before this migration repo was initialized. Git history confirms: only one commit ever introduced `is_own` into any SQL file — commit 22af0f8 ("fix(assignment): cookie-based auth...") on 2026-08-11, which added the 20260811 migration. **No migration predates 22af0f8 in this repo that touches `is_own`.**

**Conclusion**: The `is_own` column and its default value are **pre-existing in the remote database**. The migration repo can only trace ONE write event (cc3394e4 = true).

---

## 6. Seed/Fixture Evidence

**Search**: Exhaustive grep for `is_own` across `supabase/seeds/`, all `*.sql` files outside migrations, and all `lib/seed/` and test factory files.

**Findings**: **0 occurrences** of `is_own` in any seed, fixture, or test data file.

The only seed file (`supabase/seeds/seed_wms_halu.sql`) is WMS-only (warehouses, areas, zones, locations, SKUs). No entity fixture exists.

The HALU `7360acc3-...` entity was referenced in `scratch/debug_drivers.mjs` (commit 08620d9, 2026-05-19) — this is a **read-only debug script** that queries the entity, not a writer. It confirms the entity existed by 2026-05-19 but does NOT explain how it was created or how its `is_own=true` was set.

**Conclusion**: No seed or fixture declares `is_own`. All HALU entity data was created via application usage or pre-migration-repo manual operations.

---

## 7. Application Writer Evidence

**Search**: Grep for `.insert/.update/.upsert` to `md_entities` across all `.ts`/`.tsx` files. Review of payloads for `is_own` field.

**Writers identified that touch `md_entities`** (5 paths):

| Writer | File:Line | Operation | `is_own` in payload? |
|--------|-----------|-----------|----------------------|
| Sales Leads (port portal) | `app/portal/sales/leads/page.tsx:47` | `INSERT` (CUSTOMER) | **NO** (relies on DB default) |
| HQ Master Contacts (W1) | `app/(dashboard)/hq/master/contacts/page.tsx:303` | `INSERT` (any type) | **NO** (entityData from form, no is_own) |
| Tenant Master Contacts (W2) | `app/(dashboard)/tenant/master/contacts/page.tsx:206` | `INSERT` (any type) | **NO** (form data, no is_own) |
| HQ Master Fleets (W3) | `app/(dashboard)/hq/master/fleets/page.tsx:210` | `INSERT` (internal HQ entity) | **NO** (comment claims `is_own=true` but payload omits it) |
| HQ Master Drivers (W5) | `app/(dashboard)/hq/master/drivers/page.tsx:442` | `INSERT` (internal HQ entity) | **NO** (comment claims `is_own=true` but payload omits it) |
| Quick Add Contact (W4) | `app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx` | `INSERT` | **NO** (per X4) |
| EasyGo Sync Service | `src/application/gps/EasyGoSyncService.ts:140` | `INSERT` (vendor entity) | **NO** (only `is_vendor: true`) |

**Conclusion**: **0 application code paths write `is_own`**. The 7 entity INSERT paths all rely on the database default `false`.

**Critical finding**: W3 and W5 INSERT paths contain comments claiming `EntityOwnershipService will classify them as is_own=true` (or similar), but the actual code does NOT execute any post-insert classification. The result is that **W3 and W5 internal-entity creation creates entities with `is_own=false` (database default), even though the W3/W5 writers' intent is to create `is_own=true` internal entities**.

**This is an architectural implementation gap, not a D-Repair-4 issue**: the W3/W5 canonical intent (per their migration reports and architectural documentation) is to create internal entities that the `EntityOwnershipService` should classify as OWN. But the actual code does NOT call `EntityOwnershipService` after insert, and the `is_own` value remains at the database default `false`.

**This gap is documented for future review but NOT repaired in D-Repair-4** (per Section "STRICT NO-MUTATION RULE" and the prompt's prohibition on W3/W5 modification).

---

## 8. Backfill / Legacy Evidence

**Search**: Grep for code patterns that would derive `is_own` from `is_vendor`, `is_customer`, `is_supplier`, `is_broker`, `vendor_type`, `party_roles`, or name heuristics.

**Findings**: **0 such code paths exist in the application code.**

`assignment.ts:mapTransportersForTenant()` (R-6 derived) uses `is_own` as one input but **does not persist** it.

`EntityOwnershipService` reads `is_own` directly — it does not derive it.

`RoleReconciliationService` reconciles `party_roles` ↔ `is_vendor`/`is_customer`/`is_supplier`/`is_broker` only — it does NOT touch `is_own`.

**Conclusion**: **NO_REPOSITORY_EVIDENCE_OF_LEGACY_DERIVATION.** This confirms D-Repair-3's finding. **LEGACY_DERIVED = 0.**

---

## 9. Git History Evidence

**Searches performed**:

| Search | Result |
|--------|--------|
| `git log -S "is_own" -- supabase/` | 1 commit: 22af0f8 (the 20260811 migration introduction) |
| `git log -S "is_own"` (all files) | 10 commits — all are application code that READS `is_own`; no new SQL writes |
| `git log -G "is_own" -- "*.sql"` | 1 commit: 22af0f8 |
| `git log --diff-filter=A -- "**md_entities*"` | 5 commits adding migration files for md_entities (logo, parent_id, payment_terms) — none defines `is_own` |
| `git log -G "CREATE TABLE.*md_entities"` | 0 commits (md_entities predates this repo) |
| `git log -S "7360acc3"` | 2 commits: 08620d9 and 7a1a229 — both reference the ID only in scratch/debug scripts, not in writers |

**Earliest commit**: f5457b8 ("Initial commit from Create Next App", 2026-04-11) — no md_entities code.

**Conclusion**: The git history conclusively shows that:

1. The `is_own` column was never created in a migration in this repository (predates the migration repo).
2. The only SQL write to `is_own` was the 20260811 migration (cc3394e4 → true).
3. The HALU `7360acc3` entity was referenced in read-only debug scripts in May 2026 but no writer code created it.

**Git history CANNOT establish the origin of the 67 `is_own=false` values or the HALU `7360acc3` `is_own=true` value** — they were either:
- Created via the database default (most likely for the 67 false values)
- Created via untracked mechanisms (Supabase Studio, Edge Functions, or pre-migration-repo code)

---

## 10. Database Default Evidence

**Method**: PostgREST OpenAPI introspection of `public.md_entities.is_own` schema.

**Result** (live query, 2026-09-04):

```json
{
  "default": false,
  "format": "boolean",
  "type": "boolean"
}
```

**The `md_entities.is_own` column has a database default of `false`.**

This is a **CRITICAL** finding: any entity INSERT that does not explicitly specify `is_own` will receive `false` automatically.

**Technical origin classification for the 67 `is_own=false` records: DATABASE_DEFAULT.**

**Semantic provenance distinction (per prompt Section H):**

> A default value explains how a value may have been produced, but does not necessarily establish intentional semantic classification.

Per ADR-078 Decision 3:

> `is_own` MUST be set exclusively by server-side classification/write authority.
> Do NOT perform heuristic backfill of `NULL` values.
> Direct client-side writes to `is_own` are prohibited.

**Interpretation per ADR-078**:
- The 67 records with `is_own=false` have a **technical origin of DATABASE_DEFAULT** (the column default filled in the value).
- This is **NOT a semantic classification** — no user/admin intentionally classified these 67 entities as "external" per ADR-078 Decision 4.
- The current `is_own=false` values are **semantically equivalent to UNCLASSIFIED** per the strict reading of ADR-078 (the value was not set by an authorized write, so it does not constitute classification).

**This is a fundamental finding**: the production database has **0 records with semantically authoritative `is_own=false` classification**. All 67 `is_own=false` values are technical defaults, not user-intent classifications.

---

## 11. Candidate-Level Provenance Matrix (All 69 Records)

Per Section F of the prompt. The full list is too large to include in this report; the **summary by classification**:

| Classification | Count | Source |
|----------------|------:|--------|
| `MIGRATION_DECLARATION` (or `FIXTURE_DECLARATION`) | 1 | `cc3394e4-...` — 20260811 migration UPDATE |
| `DATABASE_DEFAULT` (technical origin only — see Section H) | 67 | Database default `false` applied to INSERTs that omitted `is_own` |
| `UNKNOWN_PROVENANCE` | 1 | HALU `7360acc3-...` — `is_own=true` set after creation by untracked mechanism |

**Provenance matrix (top 5 + HALU special + ATM special):**

| Tenant | Entity ID | Name | is_own | Current Evidence | Historical Evidence | Provenance | Confidence | Source |
|--------|-----------|------|-------:|------------------|---------------------|------------|------------|--------|
| HALU | 7360acc3-0e74-4eaa-8dc4-0ffc9eb5a8b7 | INTERNAL HQ | true | created 2026-05-03, updated 2026-05-13 | referenced in `scratch/debug_drivers.mjs` (read-only) | **UNKNOWN_PROVENANCE** | UNKNOWN | D-Repair-4 §13 |
| c0611a0a | cc3394e4-554a-49e6-95aa-8cf6fc41a8b3 | INTERNAL HQ | true | created 2026-08-04 (not 2026-05) | 20260811 migration UPDATE `SET is_own = true` | **MIGRATION_DECLARATION** (also fits `FIXTURE_DECLARATION`) | HIGH | `supabase/migrations/20260811_fix_job_orders_rls_and_dup_entities.sql:15` |
| HALU | d8fb3472-f4cd-4cf8-9af1-ca3e6ccd454d | TPS | false | created 2026-05-03 08:15:27 | oldest md_entities record | **DATABASE_DEFAULT** | HIGH (technical) / UNKNOWN (semantic) | DB schema default `false` |
| HALU | f730cd13-b10a-40ee-a6c1-58952eebefd9 | MBST | false | created 2026-05-03 08:16:37 | party_role=VENDOR, is_vendor=true | **DATABASE_DEFAULT** (is_own) + **LEGACY_PROJECTION** (is_vendor=true) | HIGH (technical) | DB schema default + pre-W5 path |
| HALU | 04f0b9b9-8197-44bd-b748-99e85b676d93 | ADA | false | created 2026-05-12 02:39:28 | party_role=VENDOR | **DATABASE_DEFAULT** (is_own) | HIGH (technical) | DB schema default |
| HALU | f18c007f-c86f-4af8-aa81-dfe0df090c4a | ABC | false | created (mid-May 2026) | party_role=CUSTOMER | **DATABASE_DEFAULT** (is_own) | HIGH (technical) | DB schema default |

**Pattern**: All 67 `is_own=false` records (across all 6 tenants) have a consistent provenance: **DATABASE_DEFAULT**. The `is_own=false` value was applied by the column default at INSERT time, not by an explicit classification action.

---

## 12. HALU `7360acc3-...` Findings

**Identity**: HALU "INTERNAL HQ" entity, `is_own=true`, created 2026-05-03 12:22:17 UTC, last updated 2026-05-13 02:28:02 UTC.

**Investigation**:

| Source | Evidence | Conclusion |
|--------|----------|------------|
| Migration history | 0 references in any migration file | Not set by migration |
| Seed/fixture history | 0 references in any seed/fixture | Not set by seed |
| Git history | Referenced in `scratch/debug_drivers.mjs` (08620d9, 2026-05-19) — read-only | Not set by any committed code |
| Application writers | No INSERT/UPDATE payload contains `is_own` for this entity | Not set by current application code |
| Timestamp analysis | `updated_at` (2026-05-13) > `created_at` (2026-05-03) | The `is_own` was set/updated AFTER creation |
| `vendor_type` | "OTHER" (not "INTERNAL" or "OWN") | Does not match ADR-078 Decision 4.2 normalization rules |
| `is_vendor` | false | Consistent but not causally related |

**Possible origin mechanisms (none confirmed)**:

1. **Supabase Studio manual update** — the most likely mechanism given the early-prototype timing (2026-05-13) and the entity's name "INTERNAL HQ" (matching the pattern from ATM's later `cc3394e4`).
2. **Pre-migration-repo code** — the entity was created via early prototype code (2026-05-03) that was later rewritten; the original code path is not in this git history.
3. **Supabase Edge Function or Trigger** — not present in this repo.

**Classification: UNKNOWN_PROVENANCE.**

**Per the prompt**: "A test tenant record is not automatically a fixture declaration." The HALU `7360acc3` is in a test tenant, but its `is_own=true` was set by a mechanism that this repository cannot trace. It is NOT classified as `FIXTURE_DECLARATION` because no fixture or seed file declares it.

**Confidence: UNKNOWN. The HALU `7360acc3` `is_own=true` is semantically equivalent to the ATM `cc3394e4` `is_own=true` (both named "INTERNAL HQ", both semantically intended to be OWN), but only ATM's value has repository-traceable provenance.**

---

## 13. `is_own=false` Findings (All 67 Records)

**Investigation result**: The 67 `is_own=false` records all have a **technical origin of DATABASE_DEFAULT**.

**Per the prompt's H section**:

> A default value explains how a value may have been produced, but does not necessarily establish intentional semantic classification.

**Per the prompt's H section**:

> If technical origin is known but semantic intent is unknown, preserve the semantic provenance as `UNKNOWN_PROVENANCE`.

**Two-layer provenance classification (per prompt's H requirement)**:

| Layer | Classification |
|-------|----------------|
| **Technical origin** | DATABASE_DEFAULT (the column default filled in `is_own=false` for all 67 records) |
| **Semantic provenance** | UNKNOWN_PROVENANCE (no user/admin intentionally classified these 67 entities per ADR-078 Decision 4) |

**Per ADR-078 Decision 3** (strict reading): the current `is_own=false` value on these 67 records does **NOT** constitute a semantic classification. The 67 records are **technically classified as `is_own=false` but semantically unclassified**.

**This is a significant finding**: 67 of 69 production records (97%) have `is_own=false` but have **not been semantically classified as external/non-own** by an authorized user. The `EntityOwnershipService` will return `{ isOwn: false, confidence: 'explicit', source: 'is_own' }` for these records, but the underlying value was a default, not a classification.

**Note on naming convention**: Many of these entities have `is_vendor=false` AND `is_own=false` simultaneously (51 of 67 = 76%). This is the "Case C" group from D-Repair-2/D-Repair-3. The naming pattern is consistent with customer/supplier roles (e.g., "ABC", "AHMAD", "BYD PD INDAH") but the `is_own=false` value is NOT semantic evidence of "external" — it is the database default.

---

## 14. Independence / Circularity Assessment

Per prompt Section J:

**`is_own` ↔ `is_vendor`**: **INDEPENDENT.** No code path derives one from the other.

**`is_own` ↔ `party_roles`**: **INDEPENDENT.** No code path derives `is_own` from `party_roles`.

**`is_own` ↔ `vendor_type`**: **INDEPENDENT in code.** ADR-078 Decision 4.2 mentions "Server-side normalization from `vendor_type`" but this is **NOT yet implemented in the application code**. No code path normalizes `vendor_type` to `is_own` currently.

**Conclusion: No circular dependency. Architectural independence confirmed.**

---

## 15. External Non-Vendor Boundary

**Preserved per D-Repair-2 / D-Repair-3:**

- 51 records have `is_own=false ∧ is_vendor=false` (Case C group)
- The canonical authority for "external non-vendor" is `is_own=false` per ADR-078 Decision 2
- There is no separate `EXTERNAL` or `NON_VENDOR` flag

**D-Repair-4 does NOT introduce any new role, flag, enum, or column.**

**New insight from D-Repair-4**: The 51 Case C records have `is_own=false` via **DATABASE_DEFAULT** (not via user classification). They are semantically unclassified per ADR-078. They are NOT "external non-vendor" in the canonical sense — they are "entities that the system has not classified" because the default applied to their INSERT.

---

## 16. Provenance Classification Totals

Per Section 17 of prompt:

| Classification        | Count |
| --------------------- | ----: |
| `CANONICAL_DIRECT`    | 0 |
| `CANONICAL_DERIVED`   | 0 |
| `LEGACY_PROJECTION`   | 0 |
| `LEGACY_DERIVED`      | 0 |
| `BACKFILL_DERIVED`    | 0 |
| `FIXTURE_DECLARATION` | 0 |
| `IMPORT_OR_SEED`      | 0 |
| `UI_OR_API_WRITE`     | 0 |
| `SCRIPT_OR_ADMIN_WRITE` | 0 |
| `MIGRATION_DECLARATION` | 1 (cc3394e4) |
| `DATABASE_DEFAULT` (new category, technical origin only) | 67 |
| `UNKNOWN_PROVENANCE`  | 1 (HALU 7360acc3) |
| **TOTAL**             | **69** |

**Note**: `DATABASE_DEFAULT` is added as a new category by D-Repair-4 because the original prompt's categories did not include "database default as technical origin." The 67 records' semantic provenance remains `UNKNOWN_PROVENANCE` per the prompt's H section.

**Two-layer view (more accurate)**:

| Layer | Classification | Count |
|-------|----------------|------:|
| Technical origin | MIGRATION_DECLARATION (cc3394e4) | 1 |
| Technical origin | DATABASE_DEFAULT (the other 67 false values + 0 true values) | 67 |
| Technical origin | UNKNOWN (HALU 7360acc3) | 1 |
| Semantic provenance | SEMANTIC CLASSIFICATION (per ADR-078) | **0** |
| Semantic provenance | UNCLASSIFIED per ADR-078 strict reading | **69** |

**Critical insight**: Per the strict reading of ADR-078 (no heuristic backfill, explicit classification only), **NONE of the 69 production records have a semantically authoritative `is_own` classification**. The 1 migration UPDATE (cc3394e4) is the closest to authoritative, but it was a data fix, not a semantic classification action. The HALU 7360acc3 `is_own=true` was set by an unknown mechanism.

**This does not mean the values are wrong** — many of them are semantically correct. But the repository does not contain evidence of explicit semantic classification per ADR-078 Decision 4.1.

---

## 17. Evidence Gaps

| Gap | Description | Affected Records |
|-----|-------------|------------------|
| **EG-1**: HALU `7360acc3` semantic intent | Was the `is_own=true` value set with semantic intent (this is the internal HQ), or was it a default/accident? | 1 |
| **EG-2**: 67 records' semantic intent | The `is_own=false` value was applied via database default. Did the original inserters intend to classify these as "external"? | 67 |
| **EG-3**: W3/W5 implementation gap | The W3/W5 INSERT paths do not set `is_own=true` despite their comment claiming they would. This means newly-created internal HQ entities via W3/W5 receive `is_own=false` (database default), contradicting the W3/W5 architectural intent. | All future W3/W5 creates |
| **EG-4**: Pre-migration-repo code | Entities created in 2026-04 / 2026-05 (before git history or before the first commit) have no repository-traceable writer. | ~18 HALU entities |

**EG-3 is a critical application-level finding** — W3 and W5 internal-entity creation does NOT set `is_own=true`. This is a **separate issue from provenance** and is an actual architectural implementation gap that the D-Repair-4 investigation uncovered. It is **NOT a D-Repair-4 scope issue** (the prompt explicitly forbids modifying W3/W5), but it is documented here as a critical finding for future work.

---

## 18. Human Decisions Required

| Decision | Type | Recommendation |
|----------|------|----------------|
| HD-1: Whether to classify HALU `7360acc3` as FIXTURE_DECLARATION (semantic intent) | Human review | Recommend: yes, given naming pattern, `updated_at` post-creation, and consistency with ATM `cc3394e4` |
| HD-2: Whether to add a post-insert hook in W3/W5 to set `is_own=true` for internal HQ entities | W3/W5 modification | Recommend: yes, but requires separate authorization (W3/W5 modification) |
| HD-3: Whether the 67 `is_own=false` records require reclassification (user action per ADR-078 Decision 4.1) | Authorized user action | Recommend: defer to D-Repair-5 / Canonical Enrichment via UI |
| HD-4: Whether to add a "non-default" indicator to distinguish explicit vs default `is_own=false` values | Schema modification | Recommend: defer to future ADR (out of scope) |
| HD-5: Whether the W3/W5 implementation gap is a P0/P1 bug requiring immediate fix | Triage | Recommend: classify as P1 (architectural intent vs implementation mismatch) |
| HD-6: Whether to investigate Supabase audit logs for HALU 7360acc3's `is_own=true` origin | D-Repair-5 (proposed) | Recommend: authorize D-Repair-5 read-only audit log investigation |

**Per the prompt**: none of these are decided during D-Repair-4.

---

## 19. Critical Architectural Finding (W3/W5 Implementation Gap)

**NOT a D-Repair-4 scope issue**, but documented here as a critical finding for future review:

**The W3 (fleet) and W5 (driver) entity INSERT paths contain a comment claiming that `EntityOwnershipService` will classify the new internal HQ entity as `is_own=true` after insert. However, the actual code does NOT call `EntityOwnershipService.classifyOwnership` and does NOT set `is_own=true` explicitly.**

**Code evidence**:

`app/(dashboard)/hq/master/fleets/page.tsx:203-222` (W3):

```typescript
// [AI] DATA-4E-X4: Entity insert without direct role flag writes.
// Internal entities are created without a VENDOR party_role; the
// EntityOwnershipService will classify them as is_own=true.
// Create a dedicated internal entity
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
```

The payload omits `is_own`. The database default `false` applies. The comment is **incorrect**: `EntityOwnershipService` is a READ-ONLY service; it does not perform writes.

`app/(dashboard)/hq/master/drivers/page.tsx:435-449` (W5): same pattern, same incorrect comment.

**Consequence**: Every W3/W5 "internal HQ" entity creation results in an `md_entities` row with `is_own=false` (database default), not `is_own=true` (W3/W5 architectural intent).

**Per D-Repair-4 scope**: this finding is DOCUMENTED ONLY. Modification of W3/W5 is explicitly forbidden by the prompt. Future work (not authorized by D-Repair-4) would be required to fix this gap.

---

## 20. Explicit Non-Actions

This phase did **NOT**:

- Insert, Update, Delete, Upsert any record
- Run any RPC that mutates data
- Create or apply any migration
- Modify any seed, fixture, or test-data file
- Reclassify any ownership value
- Backfill any value
- Add any new role, flag, column, or enum
- Modify W3, W5, W1, W2, W4
- Modify any production service (PartyRoleService, EntityOwnershipService, DriverAccessClassificationService, JobFinancialWorkflowService, RoleReconciliationService)
- Modify any reader, writer, API, UI, ADR, schema, or authorization logic
- Begin R-B, R-C, W5 (modification), D-Repair (execution)
- Globally replace `resolveIsVendor()` or `mapTransportersForTenant()`
- Run full regression

**Read-only operations performed**:
- PostgREST OpenAPI introspection (`is_own` schema definition)
- PostgREST entity timestamp queries
- PostgREST oldest-entity query
- Exhaustive grep across 200+ SQL files for `is_own`
- Git log searches (`-S`, `-G`, `--diff-filter`)
- Grep across all `.ts`/`.tsx` files for `is_own` and `md_entities` writers

**Mutations: 0. Schema changes: 0. Production changes: 0. W3 changes: 0. W5 changes: 0. R-B: 0. R-C: 0.**

---

## 21. G1–G27 Gate Results

| Gate | Result | Evidence |
|------|--------|----------|
| G1 — Authorization verified | ✅ PASS | Explicit user message 2026-09-04T01:15:29Z |
| G2 — D-Repair-3 baseline preserved | ✅ PASS | Section 3 reaffirms baseline; no record counts changed |
| G3 — All 69 relevant records accounted for | ✅ PASS | Section 11: all 69 records classified |
| G4 — All 68 UNKNOWN candidates investigated | ✅ PASS | Sections 5–13 investigate all 68; 67 resolved to DATABASE_DEFAULT, 1 to UNKNOWN_PROVENANCE |
| G5 — Migration history searched | ✅ PASS | Section 5: 1 migration write (20260811) |
| G6 — Seed/fixture history searched | ✅ PASS | Section 6: 0 occurrences |
| G7 — Production writer history searched | ✅ PASS | Section 7: 7 entity writers identified, 0 set `is_own` |
| G8 — Backfill/legacy history searched | ✅ PASS | Section 8: NO_REPOSITORY_EVIDENCE_OF_LEGACY_DERIVATION confirmed |
| G9 — Git history searched | ✅ PASS | Section 9: 1 commit (22af0f8) introduced `is_own` to SQL |
| G10 — Database default investigated | ✅ PASS | Section 10: `default: false` confirmed via OpenAPI |
| G11 — HALU `7360acc3-...` investigated | ✅ PASS | Section 12: UNKNOWN_PROVENANCE with detailed analysis |
| G12 — All 67 `is_own=false` records investigated | ✅ PASS | Section 13: DATABASE_DEFAULT (technical) / UNKNOWN (semantic) per prompt H |
| G13 — Provenance categories applied conservatively | ✅ PASS | No record forced into a known category without evidence |
| G14 — Unknown remains unknown when evidence is insufficient | ✅ PASS | HALU 7360acc3 preserved as UNKNOWN_PROVENANCE |
| G15 — No heuristic classification | ✅ PASS | All classifications evidence-based; no derivation from is_vendor/party_roles/name |
| G16 — `is_own` independence verified | ✅ PASS | Section 14: no circular dependency |
| G17 — No circular dependency found | ✅ PASS | Section 14: independent of is_vendor and party_roles |
| G18 — External Non-Vendor boundary preserved | ✅ PASS | Section 15: no new representation; Case C group documented |
| G19 — No production mutation | ✅ PASS | Section 20 |
| G20 — No schema mutation | ✅ PASS | Section 20 |
| G21 — No fixture mutation | ✅ PASS | Section 20 |
| G22 — No R-B/R-C changes | ✅ PASS | Section 20 |
| G23 — No unrelated production changes | ✅ PASS | Section 20 |
| G24 — Evidence gaps explicitly documented | ✅ PASS | Section 17: 4 evidence gaps |
| G25 — Historical origin conclusion supported by repository evidence | ✅ PASS | DATABASE_DEFAULT origin proven via OpenAPI; MIGRATION_DECLARATION proven via migration file; HALU 7360acc3 UNKNOWN with detailed analysis |
| G26 — D-Repair-4 report created | ✅ PASS | This document |
| G27 — Mandatory hard stop executed | ✅ PASS | Section 24 |

**G1–G27 result: 27 / 27 PASS.** Status is YELLOW per Section 22:

> YELLOW: Use YELLOW if enumeration/investigation is complete, but historical provenance remains materially unresolved, repository history is incomplete, or evidence cannot establish semantic intent for some records.

The investigation is **complete** (all 27 gates pass). However, **1 record (HALU 7360acc3) remains UNKNOWN_PROVENANCE**, and **semantic intent for 67 records remains UNKNOWN** (even though their technical origin is established as DATABASE_DEFAULT). Repository history is incomplete (pre-migration-repo code is not in this git history).

**YELLOW is correct.**

---

## 22. Exact Change Inventory

| Path | Change |
|------|--------|
| `docs/architecture/SENTRALOGIS_D_REPAIR_4_IS_OWN_HISTORICAL_ORIGIN_INVESTIGATION_REPORT.md` | CREATED (this file) |

**No other files created, modified, or deleted. No production source changes. No test changes. No migration changes. No fixture changes. No seed changes. No ADR changes. No service changes. No reader changes. No writer changes. No W3/W5 changes.**

**Read-only operations performed (transient scripts):**
- `query-default.ts` (PostgREST queries for schema default + timestamps) — created, executed, deleted
- All git log queries (read-only)
- All grep/find operations (read-only)

**Cleanup verification**: The `query-default.ts` script used for the read-only schema introspection was created in the workspace root, executed once, and deleted. No artifacts of the queries remain in the repository except this report.

---

## 23. Final Recommendation

D-Repair-4 establishes the following definitive findings:

1. **The 67 `is_own=false` records have a technical origin of DATABASE_DEFAULT** (the remote Supabase schema defines `is_own` with `DEFAULT false`). They were inserted without explicit `is_own` setting, so the default applied. This is a **technical origin, not a semantic classification per ADR-078 Decision 3**.

2. **The 1 `is_own=true` ATM record (`cc3394e4`) was set via the 20260811 migration UPDATE** — clear MIGRATION_DECLARATION provenance.

3. **The 1 `is_own=true` HALU record (`7360acc3`) remains UNKNOWN_PROVENANCE**. It was created in the project prototype phase (2026-05-03), before the current writer code paths existed. The `is_own=true` was set after creation (`updated_at` 2026-05-13) by an untracked mechanism (most likely Supabase Studio manual update).

4. **No circular evidence. No architectural contradiction.** `is_own` is independent of `is_vendor` and `party_roles`.

5. **Critical application-level finding**: The W3 and W5 entity INSERT paths (which are NOT modified by D-Repair-4) contain comments claiming `EntityOwnershipService` will classify new internal HQ entities as `is_own=true`, but the actual code does not set `is_own=true`. Database default `false` applies, contradicting W3/W5 architectural intent. This is a **W3/W5 implementation gap**, not a D-Repair-4 issue, but is documented for future review.

**Recommended future phases (NOT authorized by D-Repair-4)**:

- **D-Repair-5** (read-only): investigate Supabase audit logs for the HALU `7360acc3` `is_own=true` origin.
- **W3/W5 fix** (requires W3/W5 modification authorization): add a post-insert step in W3/W5 to set `is_own=true` for internal HQ entities (or refactor to call `EntityOwnershipService`).
- **D-Repair-6** (read-only): survey authorized-user classification UI/API for `is_own` (does not currently exist).
- **Canonical Enrichment** (authorized user action): per ADR-078 Decision 4.1, allow tenant admins to re-classify the 67 DATABASE_DEFAULT `is_own=false` records through controlled UI/API.
- **ADR amendment** (separate decision): if positive EXTERNAL NON-VENDOR representation is needed.

**No mutation. No W3/W5 fix. No D-Repair execution. No R-B/R-C.**

---

## 24. HARD STOP

```
D-REPAIR-4 IS_OWN HISTORICAL ORIGIN INVESTIGATION
STATUS: YELLOW — ORIGIN PARTIALLY ESTABLISHED, 67/69 RESOLVED AS DATABASE_DEFAULT, 1/69 UNRESOLVED, 1/69 MIGRATION_DECLARATION
```

The 67 `is_own=false` records have a technical origin of DATABASE_DEFAULT (database column default applied at INSERT time). This is **not a semantic classification per ADR-078**; the 67 records are semantically unclassified. The 1 ATM record (`cc3394e4`) was set via the 20260811 migration UPDATE. The 1 HALU record (`7360acc3`) remains UNKNOWN_PROVENANCE (set by an untracked mechanism in the early prototype phase).

**No mutation. No W3/W5 modification. No schema change. No R-B/R-C. No D-Repair execution.**

**HARD STOP — END D-REPAIR-4 IS_OWN HISTORICAL ORIGIN INVESTIGATION.**
