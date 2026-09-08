# SENTRALOGIS — D-Repair-3 `is_own` Historical Enumeration Report

**Phase:** Post D-Repair-2
**Date:** 2026-09-04
**Authorization:** `I AUTHORIZE SENTRALOGIS D-REPAIR-3 IS_OWN HISTORICAL ENUMERATION DISCOVERY ONLY.`
**Status:** **YELLOW — ENUMERATION COMPLETE, PROVENANCE INSUFFICIENT, NO ARCHITECTURAL CONTRADICTION**

---

## 0. Mandatory Authorization Gate

| Item | Value |
|------|-------|
| Authorization phrase | `I AUTHORIZE SENTRALOGIS D-REPAIR-3 IS_OWN HISTORICAL ENUMERATION DISCOVERY ONLY.` |
| Authorization source | Explicit user message (separate from the prompt) |
| Authorization timestamp | 2026-09-04T01:01:43Z |
| Authorization status | **VERIFIED** |
| Scope | READ-ONLY FORENSIC ENUMERATION ONLY (no mutation) |

---

## 1. Executive Status

**YELLOW**. D-Repair-3 enumerates the complete `is_own` distribution across all 6 active tenants and classifies provenance for every value.

**Definitive findings:**

- **Total `md_entities` rows: 69**
- **`is_own = true`: 2** records
  - HALU `INTERNAL HQ` (`7360acc3-...`) — provenance **UNKNOWN_PROVENANCE** (set before the migration repo tracked `is_own`)
  - Tenant c0611a0a `INTERNAL HQ` (`cc3394e4-...`) — provenance **FIXTURE_DECLARATION** (set by 20260811 migration)
- **`is_own = false`: 67** records
  - All have `is_own=false` populated; provenance **UNKNOWN_PROVENANCE** for all 67 (no migration in this repo ever set `is_own=false`)
- **`is_own = null`: 0** records
- **HALU has 18 entity records** (not 0 as D-Repair-2 inferred from seed-only inspection): 1 OWN + 17 `is_own=false`
- **Cross-tabulation `is_own × is_vendor`**:
  - `is_own=true ∧ is_vendor=false`: 2
  - `is_own=false ∧ is_vendor=true`: 16
  - `is_own=false ∧ is_vendor=false`: 51 ← **the critical Case C group: by-absence EXTERNAL NON-VENDOR**
  - `is_own=true ∧ is_vendor=true`: 0 (none contradict canonical)
- **No circular evidence**: no code path in this repository derives `is_own` from `is_vendor` or from `party_roles`
- **No architectural contradiction** with ADR-078
- **Provenance for 67 of 69 records (97%) is UNKNOWN_PROVENANCE**

**No mutation. No schema change. No fixture. No R-B/R-C. No D-Repair execution. No `resolveIsVendor()` change.**

---

## 2. Scope

This is a read-only historical forensic enumeration. Forbidden actions (and confirmed not performed):

- INSERT, UPDATE, DELETE, UPSERT, RPC mutation
- Data repair, backfill, `is_own` normalization
- Fixture creation, seed modification
- Migration creation, schema modification
- R-B, R-C, W5, D-Repair execution
- `resolveIsVendor()` modification
- ADR modification
- Service / reader / writer / API / UI modification

---

## 3. Prior Art Reused

| Artifact | Path | Reuse |
|----------|------|-------|
| D-Repair-2 | `docs/architecture/SENTRALOGIS_D_REPAIR_2_IS_OWN_ENUMERATION_REPORT.md` | Sections 4–6 (ADR-078, EntityOwnershipService, is_own schema) |
| Test Data Semantic Reconciliation | `docs/architecture/SENTRALOGIS_TEST_DATA_SEMANTIC_RECONCILIATION_REPORT.md` | Gap classification |
| D-Repair Execution | `docs/architecture/SENTRALOGIS_D_REPAIR_EXECUTION_REPORT.md` | 62 party_roles matched; 0 drift |
| R-Reader Readiness | `docs/architecture/SENTRALOGIS_R_READER_READINESS_ASSESSMENT.md` | NULL semantics |
| R-A Implementation | `docs/architecture/SENTRALOGIS_R_READER_WAVE_R_A_IMPLEMENTATION_REPORT.md` | R-08 R-6 preservation |
| ADR-078 | `docs/architecture/ADR-078-entity-ownership-classification.md` | Sole governance |

**No conclusion already established by these reports is rediscovered.**

---

## 4. ADR-078 Authority (reaffirmed)

ADR-078 governs entity ownership. Key decisions:

- **Decision 2**: `md_entities.is_own` is the canonical ownership signal.
- **Decision 3**: `NULL` is a distinct state meaning "unclassified" (not equivalent to `false`).
- **Decision 4**: `is_own` is written only by (1) explicit admin/owner action or (2) `vendor_type` normalization from explicit user input.
- **Decision 9**: Name heuristics are NOT used.
- **Invariant I-OWN-3**: `NULL` is distinct from `FALSE`.

**Finding: 0 of 69 production records have `is_own = NULL`. Every record is explicitly classified. This is a notable data state.**

---

## 5. EntityOwnershipService Verification (reaffirmed)

Per D-Repair-2 §5:

- Reads only `is_own` from `md_entities` (no `is_vendor` dependency)
- Tenant-scoped via `tenant_id` filter
- Faithfully implements ADR-078 Resolution Algorithm
- **No architectural contradiction with ADR-078**

**Reused from D-Repair-2 — no new inspection needed.**

---

## 6. Complete `is_own` Distribution

### 6.1 Total enumeration

| `is_own` Value | Count | % of Total |
|----------------|------:|----------:|
| `true` | 2 | 2.9% |
| `false` | 67 | 97.1% |
| `NULL` | 0 | 0.0% |
| **TOTAL** | **69** | **100.0%** |

**Source**: Live read-only query against `public.md_entities` via Supabase PostgREST on 2026-09-04.

### 6.2 Cross-tabulation `is_own × is_vendor`

| `is_own` | `is_vendor=true` | `is_vendor=false` | Row Total |
|----------|------------------|-------------------|-----------|
| `true` | 0 | 2 | 2 |
| `false` | 16 | 51 | 67 |
| `NULL` | 0 | 0 | 0 |
| **Col Total** | **16** | **53** | **69** |

**Critical observation:**

- The 51 records with `is_own=false ∧ is_vendor=false` are the **Case C group** — they could be EXTERNAL NON-VENDOR (by absence) or OWN (if `is_own` had been incorrectly set). Per ADR-078, `is_own=false` is **canonical evidence of EXTERNAL** regardless of `is_vendor`. The `is_vendor=false` is **not** evidence of OWN.
- The 16 records with `is_own=false ∧ is_vendor=true` are consistent: external vendor.
- The 2 records with `is_own=true ∧ is_vendor=false` are the OWN records; their `is_vendor=false` is **consistent but not causally derived**.

### 6.3 The 2 `is_own=true` records

| Tenant | Entity ID (short) | Name | is_vendor | is_customer | is_supplier | is_broker | vendor_type | Provenance |
|--------|-------------------|------|-----------|-------------|-------------|-----------|-------------|------------|
| HALU (`78846049...`) | `7360acc3-...` | INTERNAL HQ | false | false | false | false | "OTHER" | **UNKNOWN_PROVENANCE** |
| `c0611a0a` | `cc3394e4-...` | INTERNAL HQ | false | false | false | false | NULL | **FIXTURE_DECLARATION** (20260811 migration) |

**Both are named "INTERNAL HQ"** — this is a naming pattern, not authoritative per ADR-078 Decision 9.

**The HALU `INTERNAL HQ` (`7360acc3-...`) was NOT set by the 20260811 migration** (which only set `cc3394e4`). Its `is_own=true` was set by an unknown mechanism. Possibilities:
- Direct UPDATE via Supabase Studio before the migration repo existed
- An application-level write path not captured in any migration in this repo
- A Supabase Edge Function or trigger not in this repo
- A prior migration applied to a different repo or branch

**Provenance classification: UNKNOWN_PROVENANCE**.

### 6.4 The 67 `is_own=false` records

All 67 records have `is_own=false` explicitly set. **No migration in this repository has ever executed an `UPDATE md_entities SET is_own = false`** — the only `is_own` write is the 20260811 UPDATE for `cc3394e4` (which set `is_own=true`, not false).

**Provenance classification: UNKNOWN_PROVENANCE for all 67 records.**

This is the **largest provenance gap**: 97% of the `is_own` values have no repository-traceable origin.

---

## 7. Tenant Distribution

### 7.1 Per-tenant distribution

| Tenant ID (short) | Entities | is_own=true | is_own=false | is_own=NULL | Test? |
|-------------------|---------:|------------:|-------------:|-----------:|-------|
| `78846049` (HALU) | 18 | 1 | 17 | 0 | YES (test tenant) |
| `b0b30927` | 23 | 0 | 23 | 0 | production |
| `c0611a0a` | 16 | 1 | 15 | 0 | production |
| `d6f27bee` | 3 | 0 | 3 | 0 | production |
| `ef7031de` | 7 | 0 | 7 | 0 | production |
| `20e329fc` | 2 | 0 | 2 | 0 | production |
| **TOTAL** | **69** | **2** | **67** | **0** | — |

**Observations:**

- HALU (test tenant) has the most diverse entity set (18 records spanning customer/supplier/vendor/own).
- 5 of 6 tenants have **0 OWN records** (`is_own=true`).
- HALU and tenant `c0611a0a` each have exactly 1 OWN record — both named "INTERNAL HQ" (naming pattern, not authoritative).
- All 67 `is_own=false` records span all 6 tenants.

### 7.2 Tenant distribution analysis

The distribution is **skewed toward `is_own=false`**. This may reflect:
- Pre-ADR-078 defaulting of `is_own` to `false` for entities that were not "the one internal HQ"
- Application behavior defaulting to "external" when ownership is unknown
- Manual classification by operations

**None of these is canonical evidence per ADR-078** — they are observations about the data state.

---

## 8. HALU Assessment

### 8.1 HALU entity records

HALU has **18 entity records** (1 OWN + 17 `is_own=false`):

| Entity Name | is_own | is_vendor | is_customer | is_supplier | is_broker | party_role | Provenance |
|-------------|--------|-----------|-------------|-------------|-----------|------------|------------|
| INTERNAL HQ | true | false | false | false | false | (none) | UNKNOWN_PROVENANCE |
| HALU | false | false | false | false | false | (none) | UNKNOWN_PROVENANCE |
| MBST | false | true | false | false | false | VENDOR | UNKNOWN_PROVENANCE |
| SAS | false | true | false | false | false | VENDOR | UNKNOWN_PROVENANCE |
| ADA | false | true | false | false | false | VENDOR | UNKNOWN_PROVENANCE |
| ABC | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| AHMAD | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| AJM | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| AMD | false | false | true | true | false | CUSTOMER + SUPPLIER | UNKNOWN_PROVENANCE |
| ARISTA | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| ATS | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| BYD PD INDAH | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| BYD SERPONG | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| HANAFI | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| MAU | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| TAM | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| TOP | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |
| TPS | false | false | true | false | false | CUSTOMER | UNKNOWN_PROVENANCE |

(One row truncated: TPS — `is_own=false, is_vendor=false, is_customer=true, is_supplier=false, is_broker=false`, party_role: CUSTOMER)

### 8.2 HALU party_role distribution

| Role | Count | Entity Names |
|------|------:|--------------|
| VENDOR | 3 | MBST, SAS, ADA |
| CUSTOMER | 13 | ABC, AHMAD, AJM, AMD, ARISTA, ATS, BYD PD INDAH, BYD SERPONG, HANAFI, MAU, TAM, TOP, TPS |
| SUPPLIER | 1 | AMD (also CUSTOMER) |
| (none) | 2 | INTERNAL HQ, HALU |
| **Total** | **17 roles across 18 entities** (AMD has 2 roles) | |

### 8.3 HALU ownership fixture assessment

**HALU `is_own=true`: 1 record** (INTERNAL HQ) — provenance UNKNOWN.

**HALU `is_own=false`: 17 records** — provenance UNKNOWN.

**HALU `is_own=null`: 0 records.**

**D-Repair-2 §8.1 said HALU had ZERO entity fixtures.** That conclusion was based on seed-file inspection (which is correct for `supabase/seeds/seed_wms_halu.sql`, which is WMS-only). **HALU entities were created via application usage**, not seeds. This is an important correction to the D-Repair-2 finding.

**HALU OWNERSHIP FIXTURE = PARTIALLY REPRESENTED** (1 OWN record + 17 NOT_OWN records; all UNKNOWN_PROVENANCE).

### 8.4 HALU scenario coverage

| Scenario | HALU Representation |
|----------|---------------------|
| A — Own Entity | YES (1 record: `INTERNAL HQ` `is_own=true`) |
| B — Vendor Party | YES (3 records with VENDOR party_role + `is_own=false`) |
| C — External Non-Vendor | YES, by-absence (13 CUSTOMER records with `is_own=false` and no VENDOR role) |
| D — Vendor-Related External Entity | YES (3 records have VENDOR role + `is_own=false` + `vendor_type="TRANSPORTER"`) |
| E — Driver Access (ADR-079) | NOT INSPECTED in this phase (would require separate query) |
| F — Financial Workflow (ADR-080) | NOT INSPECTED in this phase (would require separate query) |

**Critical update to Test Data Semantic Reconciliation findings: HALU DOES have ownership fixtures (1 OWN + 17 NOT_OWN). The scenarios A, B, C, D are represented at HALU. Provenance is UNKNOWN for all 18 records.**

---

## 9. Provenance Investigation

### 9.1 Migration provenance

**Search performed**: Exhaustive search across all 200+ SQL files in `supabase/migrations/`.

**Findings**:

| Migration | is_own reference | Operation | Intent |
|-----------|------------------|-----------|--------|
| `20260811_fix_job_orders_rls_and_dup_entities.sql:15` | `SET is_own = true` (1 record) | UPDATE | Mark one ATM entity as OWN to fix duplicate internal HQ transporter |

**Total `is_own` migration operations: 1** (set `is_own=true` for one ATM entity).

**No migration in this repository:**
- Defines the `is_own` column (`CREATE TABLE` / `ADD COLUMN` for `is_own` not present)
- Sets `is_own = false` for any record
- Performs a backfill of `is_own` from `is_vendor`, `is_customer`, `is_supplier`, `is_broker`, `vendor_type`, or `party_roles`
- Updates `is_own` to NULL or from NULL to a value

**Conclusion**: The `is_own` column is **pre-existing in the remote Supabase database** (predates the migration repo or was added via `supabase db remote commit` not preserved locally). The only migration-traceable write to `is_own` is the 20260811 ATM `cc3394e4` fix.

### 9.2 Seed/fixture provenance

**Search performed**: Exhaustive search across `supabase/seeds/`, `lib/seed/`, and all `*.sql` files outside `migrations/`.

**Findings**: **0 occurrences** of `is_own` in any seed or fixture file. The only seed file (`supabase/seeds/seed_wms_halu.sql`) is WMS-only (warehouses, areas, zones, locations, SKUs).

**Conclusion**: No seed or fixture declares `is_own`. All HALU entity data was created via application usage, not via seed.

### 9.3 Canonical writer provenance

**Search performed**: Exhaustive grep across all `.ts` and `.tsx` files for `is_own` write patterns (`is_own:`, `is_own =`, `.update({...is_own...}`).

**Findings**: **0 write paths** for `is_own` in the application code. The only references are:
- `.select('..., is_own, ...')` — READS in service actions and UI queries
- Comparison expressions `=== true`, `=== false`, `!== true`
- TypeScript type definitions
- Test assertions

**No application-level code path writes `is_own`.**

**Conclusion**: The current application code does NOT set `is_own`. The only repository-traceable writer is the 20260811 migration. All other `is_own` values in the production database were set by:
- Pre-migration-repo writes (most likely)
- Supabase Studio manual updates
- Untracked Edge Functions / Triggers
- Direct SQL executed against the remote DB not committed to the repo

### 9.4 Backfill / legacy derivation provenance

**Search performed**: Exhaustive grep for code patterns that would derive `is_own` from `is_vendor`, `is_customer`, `is_supplier`, `is_broker`, `vendor_type`, `party_roles`, or name heuristics.

**Findings**: **0 such code paths exist in the application code.**

`assignment.ts:mapTransportersForTenant()` (R-6 derived) uses `is_own` as one input but **does not persist** it. It returns an in-memory `TransporterOption` with a derived `is_own` field that is used for UI display, never written back to the database.

`EntityOwnershipService` reads `is_own` directly — it does not derive it.

**Conclusion**: **NO_REPOSITORY_EVIDENCE_OF_LEGACY_DERIVATION.** There is no code path in this repository that backfills `is_own` from legacy fields.

**However**, the production data state (67 records with `is_own=false` set) strongly suggests that **some external mechanism** set these values. Possibilities:
- A pre-migration-repo script that defaulted `is_own=false` for all entities not marked internal
- An earlier version of the application that wrote `is_own` directly (now removed)
- Supabase Studio bulk operations
- A backfill script from a different repo

**Provenance classification: UNKNOWN_PROVENANCE for all 67 records.**

---

## 10. Circularity Assessment

| Path | Status | Evidence |
|------|--------|----------|
| `is_vendor` → `is_own` (via any code path) | **NOT FOUND** | No code derives `is_own` from `is_vendor` |
| `party_roles` → `is_own` (via any code path) | **NOT FOUND** | No code derives `is_own` from `party_roles` |
| `vendor_type` → `is_own` (via any code path) | **NOT FOUND** in read-time logic | Per ADR-078, would be write-time only (not yet implemented) |
| `is_own` → `is_vendor` (via any code path) | **NOT FOUND** | No code derives `is_vendor` from `is_own` |
| `is_own` ← explicit admin/owner action | **FOUND** | 20260811 migration UPDATE for ATM `cc3394e4` |

**No circular evidence exists.** The 2 `is_own=true` records and the 67 `is_own=false` records are **independent** of the `is_vendor` lineage.

**However, the data state shows a curious alignment**:
- All 2 `is_own=true` records have `is_vendor=false`
- 16 of 67 `is_own=false` records have `is_vendor=true` (consistent)
- 51 of 67 `is_own=false` records have `is_vendor=false` (Case C group)

**The 51/67 Case C records (76% of NOT_OWN) have `is_vendor=false` AND `is_own=false` simultaneously.** This means in the current data, there is a strong negative correlation: `is_vendor=false` does NOT imply `is_own=true`. The two flags are independently maintained, but the values are not contradictory — they just reflect different semantic dimensions.

---

## 11. Independent vs Unknown Provenance

| Record | is_own | Tenant | Independent Evidence? | Provenance Class |
|--------|--------|--------|----------------------|------------------|
| `7360acc3-...` INTERNAL HQ (HALU) | true | HALU | **NO** — no migration/code set this | **UNKNOWN_PROVENANCE** |
| `cc3394e4-...` INTERNAL HQ (c0611a0a) | true | c0611a0a | **YES** — 20260811 migration | **FIXTURE_DECLARATION** |
| (all 67 `is_own=false` records) | false | various | **NO** — no migration/code set these | **UNKNOWN_PROVENANCE** |

**Independent provenance: 1 of 69 records (1.4%).**
**Unknown provenance: 68 of 69 records (98.6%).**

---

## 12. EXTERNAL NON-VENDOR Boundary

Per D-Repair-2 §10 and §12:

> The current architecture has no positive canonical representation for EXTERNAL NON-VENDOR.

**Confirmed by D-Repair-3:**

- 51 records have `is_own=false ∧ is_vendor=false` (Case C candidates)
- 13 of those 51 are HALU CUSTOMER records (with VENDOR `party_role=null` per `party_roles` table)
- The canonical authority for "external non-vendor" is `is_own=false` per ADR-078 Decision 2
- There is no separate `EXTERNAL` or `NON_VENDOR` flag

**D-Repair-3 does NOT introduce** any new role, flag, enum, or column for EXTERNAL NON-VENDOR. The architectural gap is **preserved** as documented in D-Repair-2.

**Architectural/Test-model gap is real and explicit.**

---

## 13. Findings A–I (per Section 16 of prompt)

| Finding | Result |
|---------|--------|
| **A** — How many `is_own=true` records? | **2** (HALU `7360acc3-...`, tenant c0611a0a `cc3394e4-...`) |
| **B** — How many `is_own=false` records? | **67** (across all 6 tenants) |
| **C** — How many NULL records? | **0** (every record explicitly classified) |
| **D** — How many have independent provenance? | **1** (the 20260811 migration update for `cc3394e4`) |
| **E** — How many have unknown provenance? | **68** (HALU `7360acc3-...` + all 67 `is_own=false` records) |
| **F** — Is any value demonstrably derived from `is_vendor`? | **NO** (no code path derives `is_own` from `is_vendor`; **NO_REPOSITORY_EVIDENCE_OF_LEGACY_DERIVATION**) |
| **G** — Does HALU contain any ownership fixture? | **YES** — 18 entity records (1 OWN + 17 NOT_OWN; correcting D-Repair-2 §8.1 which said zero based on seed-only inspection) |
| **H** — Can historical data independently establish EXTERNAL NON-VENDOR? | **NO** — there is no positive canonical representation; only by-absence (is_own=false + no VENDOR role) |
| **I** — Are any historical records candidates for human semantic review? | **YES** — 68 records with UNKNOWN_PROVENANCE (the HALU `INTERNAL HQ` and all 67 `is_own=false` records). **Do NOT repair; flag for human review only.** |

---

## 14. Deterministic vs Human Decision

### 14.1 Deterministic (no human decision needed)

1. **Exact count of `is_own=true`**: 2 (live query).
2. **Exact count of `is_own=false`**: 67 (live query).
3. **Exact count of NULL**: 0 (live query).
4. **No migration in this repository ever set `is_own=false`**: 0 occurrences.
5. **No code path in this repository derives `is_own` from `is_vendor` or `party_roles`**.
6. **No seed or fixture declares `is_own`**.
7. **Only one migration writes `is_own`** (20260811, for `cc3394e4`).
8. **`EntityOwnershipService` is canonical and consistent with ADR-078**.
9. **No architectural contradiction**.
10. **EXTERNAL NON-VENDOR is not representable in the current architecture**.

### 14.2 Human Decision Required (DO NOT EXECUTE)

1. **Whether to backfill `is_own` for the 68 UNKNOWN_PROVENANCE records** — **NOT recommended per ADR-078 Decision 4**.
2. **Whether to add a positive canonical representation for EXTERNAL NON-VENDOR** — requires ADR amendment.
3. **Whether to author HALU fixtures for scenarios E (Driver Access) and F (Financial Workflow)** — not authorized in this phase.
4. **Whether the 51 Case C records (is_own=false ∧ is_vendor=false) require reclassification** — requires authorized user action per ADR-078 Decision 4.1.
5. **Whether to investigate the pre-migration-repo origin of the 68 UNKNOWN_PROVENANCE values** — out of scope for this phase.
6. **Whether to update the 20260811 migration or add a new migration to mark the HALU `INTERNAL HQ` `is_own=true` provenance as FIXTURE_DECLARATION** — requires separate authorization.

---

## 15. Future Remediation Options (NOT executed)

### 15.1 Read-only investigation (proposed D-Repair-4 or similar)

A new read-only phase that:

- Examines Supabase audit logs (if available) for historical writes to `is_own`
- Reviews git history of removed application code that may have written `is_own`
- Examines pre-migration-repo backups
- **Required authorization**: separate explicit message
- **Mutates data**: NO
- **Resolves**: 68 UNKNOWN_PROVENANCE records (potentially)

### 15.2 Manual explicit classification (proposed D-Repair-5 or Canonical Enrichment via UI)

A new phase that:

- Implements an authorized-user UI/API for explicit `is_own` classification
- Allows tenant admins to re-classify any UNKNOWN_PROVENANCE record through controlled paths
- **Required authorization**: separate explicit message + UI/API implementation
- **Mutates data**: YES (authorized user-driven reclassification)
- **Resolves**: 68 UNKNOWN_PROVENANCE records (gradually, as users classify)
- **Compliance**: required to comply with ADR-078 Decision 4 (only authorized user actions, no heuristic backfill)

### 15.3 Architectural gap resolution (proposed ADR-078-amendment or new ADR)

A new architectural decision that:

- Defines a positive canonical representation for EXTERNAL NON-VENDOR
- Could be: a new party role (e.g., `EXTERNAL`), a new flag (e.g., `is_external_non_vendor`), or a redefinition of `is_own` to have four states instead of three
- **Required authorization**: separate explicit message + ADR ratification
- **Mutates schema**: YES (potential new column/role/constraint)
- **Mutates data**: YES (potential backfill under new ADR authority)
- **Resolves**: the 51 Case C records' inability to be positively proven as EXTERNAL NON-VENDOR

### 15.4 Recommended path per ADR-078

Per ADR-078 (Decisions 3 and 4):

> Existing `NULL` values MUST remain `NULL` unless ownership is explicitly known
> Do NOT perform heuristic backfill of `NULL` values

The **architecturally correct** path is:

1. **Accept current state**: 69 records with explicit `is_own` values; 68 of 68 (excluding the 20260811 migration) have UNKNOWN_PROVENANCE but are explicitly classified.
2. **D-Repair-4 (read-only investigation)** if historical origin matters.
3. **D-Repair-5 (authorized reclassification UI/API)** for any entity that needs to be definitively re-classified — done by tenant admins, not by automated backfill.
4. **ADR amendment** only if a positive EXTERNAL NON-VENDOR representation is needed.

**No backfill. No heuristic. No D-Repair-3-Apply. No R-B/R-C.**

---

## 16. Explicit Non-Actions

This phase did **NOT**:

- Insert, Update, Delete, Upsert any record
- Run any RPC that mutates data
- Create or apply any migration
- Modify any seed, fixture, or test-data file
- Reclassify any ownership value
- Backfill any value
- Add any new role, flag, column, or enum
- Modify any production service (PartyRoleService, EntityOwnershipService, DriverAccessClassificationService, JobFinancialWorkflowService, RoleReconciliationService)
- Modify any reader, writer, API, UI, ADR, schema, or authorization logic
- Begin R-B, R-C, W5, D-Repair, Canonical Enrichment, Fixture Authoring
- Globally replace `resolveIsVendor()` or `mapTransportersForTenant()`
- Run full regression

**The single database operation performed was a read-only PostgREST query against `md_entities` and `party_roles` via the service role key** (per Section 8 of prompt: "Production tenant data is for distribution/provenance analysis only"). No state was modified.

**Mutations: 0. Schema changes: 0. Production changes: 0. R-B: 0. R-C: 0.**

---

## 17. G1–G27 Gate Results

| Gate | Result | Evidence |
|------|--------|----------|
| G1 — Authorization verified | ✅ PASS | Explicit user message 2026-09-04T01:01:43Z |
| G2 — ADR-078 identified as governing authority | ✅ PASS | ADR-078 RATIFIED 2026-09-03 |
| G3 — D-Repair-2 findings reused | ✅ PASS | Sections 4–6 reaffirm D-Repair-2 |
| G4 — EntityOwnershipService verified | ✅ PASS | D-Repair-2 §5; service canonical |
| G5 — Complete `is_own` distribution enumerated | ✅ PASS | Section 6: 69 total (2 true, 67 false, 0 NULL) |
| G6 — True/false/NULL states classified | ✅ PASS | Section 6.1 |
| G7 — Tenant distribution established | ✅ PASS | Section 7: 6 tenants, 18 max (HALU) |
| G8 — HALU status established | ✅ PASS | Section 8: HALU has 18 entities (1 OWN + 17 NOT_OWN) — corrects D-Repair-2 |
| G9 — Migration provenance searched | ✅ PASS | Section 9.1: 1 migration write (20260811 for `cc3394e4`) |
| G10 — Seed/fixture provenance searched | ✅ PASS | Section 9.2: 0 seed/fixture references to `is_own` |
| G11 — Canonical writer provenance searched | ✅ PASS | Section 9.3: 0 application code paths write `is_own` |
| G12 — Legacy/backfill provenance searched | ✅ PASS | Section 9.4: **NO_REPOSITORY_EVIDENCE_OF_LEGACY_DERIVATION** |
| G13 — Circular derivation explicitly tested | ✅ PASS | Section 10: NO circular evidence |
| G14 — Independent vs unknown provenance separated | ✅ PASS | Section 11: 1 independent (FIXTURE_DECLARATION), 68 unknown |
| G15 — No heuristic semantic inference | ✅ PASS | All 68 UNKNOWN records flagged as such, no reconstruction |
| G16 — EXTERNAL NON-VENDOR gap preserved | ✅ PASS | Section 12: no new representation introduced; gap documented |
| G17 — No production mutation | ✅ PASS | Section 16 |
| G18 — No test-data mutation | ✅ PASS | Section 16 |
| G19 — No fixture creation | ✅ PASS | Section 16 |
| G20 — No schema/migration change | ✅ PASS | Section 16 |
| G21 — No service change | ✅ PASS | Section 16 |
| G22 — No R-B change | ✅ PASS | Section 16 |
| G23 — No R-C change | ✅ PASS | Section 16 |
| G24 — No `resolveIsVendor()` change | ✅ PASS | Section 16 |
| G25 — Human-decision findings isolated | ✅ PASS | Section 14.2: 6 human-decision items, none executed |
| G26 — Future remediation options documented only | ✅ PASS | Section 15: 3 proposed phases, none executed |
| G27 — Report created | ✅ PASS | This document |

**G1–G27 result: 27 / 27 PASS.** Status is therefore YELLOW per Section 22 (evidence gaps remain, but no architectural contradiction and no mutation).

YELLOW is correct per Section 22:

> YELLOW: Use YELLOW if enumeration completed, evidence gaps remain, historical provenance cannot be established for some records, no mutation occurred.

The enumeration is complete (G5 PASS, G6 PASS, G7 PASS, G8 PASS). Evidence gaps remain for provenance (G14: 68 UNKNOWN_PROVENANCE). No mutation occurred (G17–G24).

---

## 18. Exact Change Inventory

| Path | Change |
|------|--------|
| `docs/architecture/SENTRALOGIS_D_REPAIR_3_IS_OWN_HISTORICAL_ENUMERATION_REPORT.md` | CREATED (this file) |

**No other files created, modified, or deleted. No production source changes. No test changes. No migration changes. No fixture changes. No seed changes. No ADR changes. No service changes. No reader changes. No writer changes.**

**Read-only operation performed**: A single PostgREST query against `public.md_entities` and `public.party_roles` via the service role key, executed from a temporary `query-isown.ts` file (deleted after query completion — see cleanup below).

**Cleanup verification**: The temporary `query-isown.ts` script used for the live read-only query was created in the workspace root, executed once, and deleted. No artifacts of the query remain in the repository except this report.

---

## 19. Final Recommendation

The complete `is_own` distribution across the production database is **explicit and fully classified**: 69 records, 2 with `is_own=true`, 67 with `is_own=false`, 0 NULL. **No records are in the `unclassified` state**, but **98.6% (68/69) have UNKNOWN_PROVENANCE** — no migration or application code in this repository ever wrote them.

**Key update to D-Repair-2**: HALU **DOES** have ownership fixtures (18 entity records). D-Repair-2 §8.1 conclusion that HALU has zero entity fixtures was based on seed-file inspection only and missed entities created via application usage. HALU now represents scenarios A, B, C, and D with explicit data.

**No circular evidence, no architectural contradiction, no mutation**. The canonical authority chain (ADR-078 → `EntityOwnershipService` → `md_entities.is_own`) is verified clean.

**However, the 68 UNKNOWN_PROVENANCE records represent a significant provenance gap** that cannot be resolved without:
1. Investigation of pre-migration-repo data history (D-Repair-4, read-only), OR
2. Explicit authorized-user reclassification (D-Repair-5 / Canonical Enrichment via UI, requires mutation authorization), OR
3. Acceptance of current state with documented UNKNOWN_PROVENANCE classification.

Per ADR-078 Decision 4, **heuristic backfill is explicitly rejected**. The architecturally correct path is one of the three options above, all of which require separate explicit authorization.

**The 51 Case C records (is_own=false ∧ is_vendor=false) cannot be positively proven as EXTERNAL NON-VENDOR** — they can only be inferred by absence. This is an architectural gap (no positive representation for EXTERNAL NON-VENDOR) that was documented in D-Repair-2 and is preserved here.

---

## 20. Final Status

```
D-REPAIR-3 IS_OWN HISTORICAL ENUMERATION
STATUS: YELLOW — ENUMERATION COMPLETE, PROVENANCE INSUFFICIENT (68/69 UNKNOWN_PROVENANCE), NO ARCHITECTURAL CONTRADICTION
```

The complete `is_own` distribution is enumerated. Provenance is established for exactly 1 of 69 records (ATM `cc3394e4` via 20260811 migration). All other 68 records have UNKNOWN_PROVENANCE. No migration, code, seed, or fixture in this repository ever set `is_own=false` for any record. The 68 UNKNOWN records cannot be repaired without separate authorization.

**HARD STOP — END D-REPAIR-3 IS_OWN HISTORICAL ENUMERATION.**
