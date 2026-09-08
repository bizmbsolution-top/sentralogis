# SENTRALOGIS — D-REPAIR-2 `is_own` Enumeration Report

**Phase:** Post Test Data Semantic Reconciliation
**Date:** 2026-09-04
**Authorization:** `I AUTHORIZE SENTRALOGIS D-REPAIR-2 IS_OWN ENUMERATION DISCOVERY ONLY.`
**Status:** **YELLOW — EVIDENCE SUFFICIENT FOR OWN, INSUFFICIENT FOR EXTERNAL NON-VENDOR, NO ARCHITECTURAL CONTRADICTION**

---

## 0. Mandatory Authorization Gate

| Item | Value |
|------|-------|
| Authorization phrase | `I AUTHORIZE SENTRALOGIS D-REPAIR-2 IS_OWN ENUMERATION DISCOVERY ONLY.` |
| Authorization source | Explicit user message (separate from the prompt) |
| Authorization timestamp | 2026-09-04T00:46:11Z |
| Authorization status | **VERIFIED** |
| Scope | DISCOVERY ONLY (read-only, no mutation) |

---

## 1. Executive Status

**YELLOW**. D-Repair-2 establishes the canonical evidence chain for `is_own` per ADR-078:

1. **`is_own` is canonical** — sole authoritative source for entity ownership per ADR-078 Decision 2.
2. **`EntityOwnershipService` is canonical and clean** — reads only `is_own`, no `is_vendor` dependency, tenant-scoped.
3. **One independent OWN record exists** — entity `cc3394e4-554a-49e6-95aa-8cf6fc41a8b3` for tenant ATM, set by explicit `UPDATE` in migration `20260811_fix_job_orders_rls_and_dup_entities.sql` per ADR-078 Decision 4.1 (explicit admin/owner action).
4. **No `EXTERNAL NON-VENDOR` record can be authoritatively distinguished** — the architecture has no positive canonical role for "external but not vendor." The only path is `is_own = false ∧ no VENDOR party_role`, which is **by-absence evidence**, not positive proof.
5. **No circular evidence** — no code path derives `is_own` from `is_vendor`. The two are independent. Historical `is_own` values have **unknown origin** (no migration in this repo set them except the 20260811 case for ATM).
6. **HALU has no `is_own` test data** — the HALU WMS seed is warehouses/zones/locations/SKUs only. No entity fixture exists for HALU. Test data for `is_own` ownership semantics is unrepresented for the test tenant.

**No mutation. No schema change. No fixture. No R-B/R-C.**

---

## 2. Scope

Read-only evidence enumeration. Forbidden actions (and confirmed not performed):

- INSERT, UPDATE, DELETE, UPSERT, RPC mutation
- Data repair, backfill, ownership assignment
- Fixture creation or modification
- Migration, schema modification
- R-B / R-C / W5 / D-Repair execution
- `resolveIsVendor()` modification
- Production reader/writer/ADR modification

---

## 3. Prior Art Reused

| Artifact | Path | Reuse |
|----------|------|-------|
| Test Data Semantic Reconciliation | `docs/architecture/SENTRALOGIS_TEST_DATA_SEMANTIC_RECONCILIATION_REPORT.md` | EVIDENCE_GAP (is_own distribution) and UNREPRESENTED_SCENARIO inputs |
| R-Reader Readiness | `docs/architecture/SENTRALOGIS_R_READER_READINESS_ASSESSMENT.md` | 14-pattern classification, NULL semantics |
| R-A Implementation | `docs/architecture/SENTRALOGIS_R_READER_WAVE_R_A_IMPLEMENTATION_REPORT.md` | R-08 R-6 derived preservation |
| D-Repair Execution | `docs/architecture/SENTRALOGIS_D_REPAIR_EXECUTION_REPORT.md` | 62 party_roles matched, 0 drift; D-Repair scope = is_vendor/is_customer/is_supplier/is_broker only |
| W5 Migration | `docs/architecture/SENTRALOGIS_W5_CANONICAL_WRITER_MIGRATION_REPORT.md` | W5 removed is_vendor:false write; does NOT write is_own |
| ADR-078 | `docs/architecture/ADR-078-entity-ownership-classification.md` | Sole governance for ownership |
| `EntityOwnershipService` | `lib/domain/entity/entity-ownership-service.ts` | Canonical read service |
| `entity-ownership-actions.ts` | `lib/actions/entity-ownership-actions.ts` | Server actions |
| `assignment.ts` | `lib/domain/jo/assignment.ts` | R-6 derived (preserved by R-A, not modified) |

---

## 4. ADR-078 Authority

ADR-078 (ratified 2026-09-03, DATA-4E X6 R2) governs entity ownership.

**Key decisions relevant to this enumeration:**

| Decision | Statement | Implication |
|----------|-----------|-------------|
| **Decision 1** | Ownership is NOT a party role | `party_roles.VENDOR` does NOT answer ownership questions |
| **Decision 2** | `md_entities.is_own` is the canonical ownership signal | `is_own` is authoritative; `is_vendor` is NOT authoritative for ownership |
| **Decision 3** | `NULL` is a distinct state meaning "unclassified" | `is_own = NULL` is NOT equivalent to `is_own = false` |
| **Decision 4** | `is_own` written only by (1) explicit admin/owner action or (2) `vendor_type` normalization from explicit user input | Direct client writes forbidden; backfill forbidden |
| **Decision 5** | `vendor_type` is free-text compatibility, not authoritative | Not used for read-time classification |
| **Decision 6** | Fleet/driver ownership derived from parent entity | `md_fleets.entity_id` and `md_drivers.entity_id` resolve to `md_entities.is_own` |
| **Decision 7** | Tenant-scoped | `is_own` resolved within caller's tenant context |
| **Decision 8** | `party_roles.VENDOR` and `is_own` are orthogonal | A party can be VENDOR + is_own=true; or non-VENDOR + is_own=false |
| **Decision 9** | Name heuristics NOT used | ADR explicitly rejects name-based classification |
| **Decision 10** | `resolveIsVendor()` is R-6 derived compatibility, not canonical | Deprecated; R-C scope |

**Invariant I-OWN-1**: `is_own` is canonical. `is_vendor` is NOT authoritative for ownership.
**Invariant I-OWN-3**: `NULL` is distinct from `FALSE`.
**Invariant I-OWN-4**: Name heuristics are NOT used.
**Invariant I-OWN-6**: `is_own` written only by authorized server paths.

---

## 5. EntityOwnershipService Evidence

**File:** `lib/domain/entity/entity-ownership-service.ts` (43 lines)

**Input source**: `supabase.from('md_entities').select('is_own')` filtered by `tenant_id` and `id`.

**Output semantics**: `OwnershipClassification { isOwn: boolean | null; confidence: 'explicit' | 'unknown'; source: 'is_own' | 'unclassified' }`.

**Tenant boundary**: Filter `.eq('tenant_id', tenantId)` enforced at the query level (line 23). RLS further enforces tenant isolation.

**Dependency on `is_vendor`**: **NONE.** The service does not read `is_vendor`. The only column read is `is_own`.

**Dependency on `is_own`**: **EXCLUSIVE.** Sole data source is `md_entities.is_own`.

**Other canonical relations used**: None. No `party_roles`, no `vendor_type`, no name heuristics.

**Resolution algorithm**:

```typescript
1. Load entity from md_entities by (tenant_id, id)
2. Read is_own (boolean | null)
3. If is_own !== null && is_own !== undefined:
     return { isOwn, confidence: 'explicit', source: 'is_own' }
4. Else (NULL):
     return { isOwn: null, confidence: 'unknown', source: 'unclassified' }
```

This **exactly matches ADR-078's Resolution Algorithm** (lines 196–215 of the ADR). **No architectural contradiction.**

**Service validation result: ✅ CANONICAL SERVICE / ADR-078 ARE CONSISTENT.**

---

## 6. `is_own` Enumeration (Read-Only)

### 6.1 Schema definition (generated types)

`lib/supabase/database.types.ts` line 6383: `"is_own": boolean | null;` (read column on `md_entities` table).

`is_own` is **not defined in any SQL migration** in this repository's `supabase/migrations/` directory. The only migration that references `is_own` is `20260811_fix_job_orders_rls_and_dup_entities.sql` (UPDATE only). The original `CREATE TABLE` / `ADD COLUMN` for `is_own` was applied directly in the remote Supabase project before this migration repo was initialized (or via `supabase db remote commit` not preserved locally).

### 6.2 Occurrence table

| Location | Context | Read/Write | Authority | Evidence Lineage | Semantic Role |
|----------|---------|------------|-----------|------------------|---------------|
| `lib/supabase/database.types.ts:6383` | `md_entities` Row type | READ schema | n/a (schema) | UNKNOWN (predates migration repo) | canonical column |
| `lib/supabase/database.types.ts:6421,6459` | `md_entities` Insert/Update types | WRITE schema | n/a (schema) | UNKNOWN | canonical column (write) |
| `supabase/migrations/20260811_fix_job_orders_rls_and_dup_entities.sql:9,15` | UPDATE on ATM entity `cc3394e4` | WRITE (data) | tenant_id+entity_id | **FIXTURE_DECLARATION** (explicit admin/owner action) | canonical evidence for ONE record |
| `lib/domain/entity/entity-ownership-service.ts:13,22,35,40` | Service implementation | READ | EntityOwnershipService | **CANONICAL_DIRECT** | canonical reader |
| `lib/actions/entity-ownership-actions.ts:50,52,73` | Server actions (`getEntitiesByOwnership`, `getAllEntitiesWithOwnership`) | READ | server action | CANONICAL_DIRECT | canonical reader wrapper |
| `lib/actions/driver-access-classification-actions.ts:58,73` | Driver access service select `md_entities(name, is_own)` | READ | DriverAccessClassificationService (ADR-079) | CANONICAL_DIRECT | cross-ADR reader |
| `lib/domain/driver/driver-access-classification-service.ts:43,46` | `driver.entity.is_own` check | READ | DriverAccessClassificationService | CANONICAL_DIRECT | ADR-079 consumer |
| `lib/domain/jo/assignment.ts:56,137,243,256,283,287,288` | R-6 derived `mapTransportersForTenant`, `resolveIsVendor` | READ | assignment.ts (R-6) | **LEGACY_DERIVED** (display-name heuristic when `is_own` is null) | R-6 derived (preserved by R-A) |
| `app/(dashboard)/hq/master/fleets/page.tsx:96,121,138,396` | `md_entities(... is_own ...)` select + filter | READ | R-A migrated | CANONICAL_DIRECT (R-2) | R-2 reader |
| `app/(dashboard)/hq/master/drivers/page.tsx:73,154,181,190,250,277,347,743,841,946,948` | `md_entities(name, is_own)` select + filter | READ | R-A migrated | CANONICAL_DIRECT (R-2) | R-2 reader |
| `app/(dashboard)/sbu/trucking/work-orders/page.tsx:203` | nested join `md_drivers(... md_entities(is_own))` | READ | R-A migrated | CANONICAL_DIRECT (R-2) | R-2 reader |
| `app/(dashboard)/sbu/trucking/work-orders/components/AssignmentModal.tsx:246,255,271,301,445,758,975,1016,1303,1311` | `md_entities(is_own)` + filter | READ | R-A migrated (R-08) | CANONICAL_DIRECT (R-2) for R-A sites; LEGACY_DERIVED for R-6 `resolveIsVendor` consumer at line 1304 | mixed R-2 + R-6 |
| `app/(dashboard)/sbu/warehouse/transfers/components/TransferDetailModal.tsx:216,217` | `allEntities.filter(e => e.is_own === false/true)` | READ | R-A migrated | CANONICAL_DIRECT (R-2) | R-2 reader |
| `app/(dashboard)/tenant/master/fleets/page.tsx:37,330,443` | `is_own` display | READ | R-A migrated (X4 bonus) | CANONICAL_DIRECT (R-2) | R-2 reader |
| `app/(dashboard)/hq/finance/cost-audit/hooks/useCostAuditData.ts:173,421,433,436` | `md_transporters(... is_own)` select + display | READ | special consumer (X6 G9 PROTECTED) | CANONICAL_DIRECT (R-2) | special consumer |

**Total `is_own` occurrences: 60+ across 16 files. All READS are via ADR-078 (canonical). The only WRITE in the entire repository is the 20260811 migration UPDATE for entity `cc3394e4` (tenant ATM).**

---

## 7. Evidence Lineage Classification

| Source | Lineage | Note |
|--------|---------|------|
| `EntityOwnershipService.classifyOwnership` | **CANONICAL_DIRECT** | Service reads `is_own` exclusively |
| `entity-ownership-actions.ts` (server actions) | **CANONICAL_DIRECT** | Wrapper over service |
| `DriverAccessClassificationService` | **CANONICAL_DIRECT** | ADR-079 consumer of `is_own` |
| 20260811 migration UPDATE for ATM `cc3394e4` | **FIXTURE_DECLARATION** | Explicit admin/owner action per ADR-078 Decision 4.1 |
| `assignment.ts:resolveIsVendor` | **LEGACY_DERIVED** | R-6 derived; uses `is_own` only as short-circuit, otherwise falls back to `is_vendor` and `driverEntityIsVendor` |
| `assignment.ts:mapTransportersForTenant` | **LEGACY_DERIVED** | R-6 derived; display-name heuristic when `is_own` is null |
| HALU seed | **UNREPRESENTED** | HALU has no entity/role/driver/fleet fixture |
| Historical `is_own` values in production (other than ATM `cc3394e4`) | **UNKNOWN** | No migration in this repo set them; origin is not preserved in this repo |

**No circular evidence**: no code path in this repository derives `is_own` from `is_vendor`. The lineage from `party_roles` ↔ `is_vendor` is independent of the lineage of `is_own`. The 62 `party_roles` records (D-Repair matched state) and the `is_own` values (unknown historical origin) are **structurally independent data sets** in the production database.

---

## 8. HALU Ownership Evidence

### 8.1 HALU seed inventory

`supabase/seeds/seed_wms_halu.sql`:

| Table | Rows | `is_own` refs | `is_vendor` refs | `party_role` refs | Entity refs |
|-------|------|---------------|------------------|-------------------|-------------|
| `md_warehouses` | 1 | 0 | 0 | 0 | 0 |
| `md_warehouse_areas` | 6 | 0 | 0 | 0 | 0 |
| `md_warehouse_zones` | 11 | 0 | 0 | 0 | 0 |
| `md_warehouse_locations` | ~70+ | 0 | 0 | 0 | 0 |
| `md_product_skus` | 2 | 0 | 0 | 0 | 0 |

**HALU ownership evidence: ZERO.** No entity records, no party_roles, no drivers, no fleets.

`supabase/migrations/031_fix_rls_and_seed.sql` seeds **only** `organizations` (HQ, WH-JKT, WH-SBY, TRK, FWD) for HALU. No entity/role/ownership data.

### 8.2 HALU test data for ownership semantics

**Case A (OWN) for HALU**: **UNREPRESENTED.** No HALU entity has `is_own = true` set in any seed.

**Case C (EXTERNAL NON-VENDOR) for HALU**: **UNREPRESENTED.** No HALU entity has `is_own = false` set, and no HALU `party_role` exists.

**Case B (VENDOR) for HALU**: **UNREPRESENTED in seed.** However, HALU may have production-data entity records (entities created by HALU users in the app). The D-Repair execution report does not enumerate per-tenant distribution of `party_roles` records.

**Conclusion**: The HALU test tenant has **no authoritative ownership evidence** in its seed. Ownership semantics cannot be tested at HALU from repository data alone.

---

## 9. OWN Scenario Assessment (Case A)

> Can a record be proven `OWN` without relying on `is_vendor = false`?

**YES — for one record: ATM entity `cc3394e4-554a-49e6-95aa-8cf6fc41a8b3`.**

Evidence chain:

```text
2026-08-11 admin/owner explicit action
  (duplicate INTERNAL HQ transporter fix)
      ↓
migration 20260811_fix_job_orders_rls_and_dup_entities.sql
      ↓
UPDATE public.md_entities SET is_own = true
  WHERE id = 'cc3394e4-554a-49e6-95aa-8cf6fc41a8b3'
      ↓
md_entities[cc3394e4].is_own = true (per ADR-078 canonical)
      ↓
EntityOwnershipService.classifyOwnership(tenant_ATM, cc3394e4)
  → { isOwn: true, confidence: 'explicit', source: 'is_own' }
```

This is **FIXTURE_DECLARATION** lineage (explicit admin/owner action), not derived from `is_vendor`. Per ADR-078 Decision 4.1, this is a valid authoritative source.

**For all other `is_own = true` records (if any exist in production)**: lineage is **UNKNOWN** — the only migration setting `is_own` in this repo is the one above. Other values may have been:
- Manually set via Supabase Studio before this migration repo existed
- Set via an earlier migration that wasn't committed to this repo
- Set via a Supabase function/trigger not captured here
- Default null values (in which case the entity is unclassified, not OWN)

**Cannot enumerate** these without a live database query (out of scope per Section 8 of the prompt: "Production tenant records are out of scope for fixture classification").

**Case A result: AUTHORITATIVE for ATM `cc3394e4` only. UNREPRESENTED for HALU. UNKNOWN for all other tenants.**

---

## 10. EXTERNAL NON-VENDOR Scenario Assessment (Case C)

> Can a record be proven `EXTERNAL NON-VENDOR` without relying on `is_vendor = false`?

**NO positive canonical evidence exists in the current architecture.**

The architecture provides only:
- `md_entities.is_own` (boolean | null) — orthogonal to vendor role
- `party_roles.VENDOR` — distinct from ownership
- `party_roles.CUSTOMER`, `SUPPLIER`, `BROKER` — distinct roles

There is **no `EXTERNAL` role**, **no `EXTERNAL_NON_VENDOR` role**, **no `NON_VENDOR_EXTERNAL` flag** in the canonical model.

The only path to "external non-vendor" is **by absence**:

```text
is_own = false (entity is external)
  ∧
NOT EXISTS (party_role WHERE role_type = 'VENDOR' for this party)
```

This is **negative evidence** (NOT-EXISTS), not positive proof. It is structurally the **same** as the prompt's critical question — there is no canonical way to prove "this is external AND not a vendor" without either (a) accepting `is_own = false` as the negative fact, or (b) confirming no `VENDOR` role exists.

For HALU: **UNREPRESENTED** (no fixtures).

**Case C result: UNREPRESENTED. By-absence inference only. No positive canonical evidence available in the current architecture.**

---

## 11. Vendor Separation Assessment

Per ADR-078 Decision 8:

| Combination | Meaning | Possible? |
|-------------|---------|-----------|
| `VENDOR` role + `is_own = FALSE` | External vendor (common case) | YES — most production vendors |
| `VENDOR` role + `is_own = TRUE` | Vendor that also has internal assets | YES — rare but valid per ADR-078 |
| No `VENDOR` role + `is_own = TRUE` | Internal party | YES — common case (ATM `cc3394e4` is this case) |
| No `VENDOR` role + `is_own = FALSE` | Customer/other party with external assets | YES — ADR-078 explicitly allows |
| `NULL` | Unclassified | YES — default state |

**Vendor semantics are correctly separated from ownership per ADR-078.** No architectural contradiction between canonical implementation and ADR-078.

**Vendor evidence: AUTHORITATIVE for 62 `party_roles` records (D-Repair matched state). However, the 62 records were backfilled from legacy `is_*` flags (BR5 backfill) — this is SEMANTIC_INHERITANCE for those specific records, but the canonical authority is still `party_roles` per X5 reconciliation rules.**

---

## 12. Circular Evidence Analysis

**Question**: Is there a circular lineage like `is_vendor → BR5 → canonical-looking field → service → classification`?

**Answer: NO circular lineage for `is_own`.**

| Path | Status |
|------|--------|
| `is_vendor` → `party_roles.VENDOR` (via BR5 backfill) | **ONE-WAY** — accepted as historical. BR5 is frozen. Future writes flow party_roles → is_vendor (per X5). |
| `is_vendor` → `is_own` (via any code path) | **NOT FOUND.** No code path in this repository derives `is_own` from `is_vendor`. |
| `party_roles` → `is_own` (via any code path) | **NOT FOUND.** No code path in this repository derives `is_own` from `party_roles`. |
| `vendor_type` → `is_own` (via any code path) | **NOT FOUND in read-time logic.** Per ADR-078 Decision 4, `vendor_type` normalization to `is_own` would be a write-time action by an authorized user — not yet implemented. |
| `is_own` → `is_vendor` | **NOT FOUND.** No code path derives `is_vendor` from `is_own`. |
| `is_own` ← explicit admin/owner action (UPDATE) | **FOUND** — 20260811 migration for ATM `cc3394e4`. This is FIXTURE_DECLARATION, not derived. |

**Result: NO circular evidence for `is_own`. The canonical authority is independent of the `is_vendor` lineage.**

---

## 13. Tenant Isolation

| Check | Result |
|-------|--------|
| HALU data is isolated | ✅ HALU is a separate tenant with its own `tenant_id`. RLS via `get_my_tenant_id()`. |
| Ownership evidence is tenant-scoped | ✅ `EntityOwnershipService` filters by `tenant_id` (line 23). RLS enforces. |
| No cross-tenant inference | ✅ No code path in this repo reads ownership across tenants. |
| Service/query uses canonical tenant context | ✅ Server actions derive `tenant_id` from `profile.tenant_id`, not from client. |
| Client-controlled tenant metadata not authority | ✅ `getEntitiesByOwnership` and `getAllEntitiesWithOwnership` derive tenant server-side from auth context. |

**Tenant isolation: VERIFIED.**

---

## 14. Evidence Matrix

| # | Evidence | Source | Tenant | Meaning | Independent? | Lineage | Status |
|---|----------|--------|--------|---------|--------------|---------|--------|
| 1 | `EntityOwnershipService` definition | `lib/domain/entity/entity-ownership-service.ts` | n/a | Canonical owner-classification service | YES (does not depend on `is_vendor`) | **CANONICAL_DIRECT** | AUTHORITATIVE |
| 2 | `entity-ownership-actions.ts` server actions | `lib/actions/entity-ownership-actions.ts` | n/a | Wrappers over service | YES | CANONICAL_DIRECT | AUTHORITATIVE |
| 3 | 20260811 migration UPDATE for ATM `cc3394e4` | `supabase/migrations/20260811_fix_job_orders_rls_and_dup_entities.sql` | ATM | `is_own = true` for one entity | YES (explicit admin action) | **FIXTURE_DECLARATION** | AUTHORITATIVE (single record) |
| 4 | `DriverAccessClassificationService` | `lib/domain/driver/driver-access-classification-service.ts` | n/a | ADR-079 reader of `is_own` | YES | CANONICAL_DIRECT | AUTHORITATIVE (consumer) |
| 5 | `assignment.ts:resolveIsVendor` | `lib/domain/jo/assignment.ts:133-139` | n/a | R-6 derived | NO (uses `is_vendor` fallback) | **LEGACY_DERIVED** | R-6 (preserved by R-A, R-C scope) |
| 6 | `assignment.ts:mapTransportersForTenant` | `lib/domain/jo/assignment.ts:236-291` | n/a | R-6 derived with name heuristic | NO | **LEGACY_DERIVED** | R-6 (preserved by R-A, R-C scope) |
| 7 | HALU entity fixtures | `supabase/seeds/seed_wms_halu.sql` | HALU | None (WMS only) | n/a | **UNREPRESENTED** | GAP |
| 8 | Production `party_roles` records (62) | D-Repair execution report | (all 15) | VENDOR/CUSTOMER/SUPPLIER/BROKER | NO (BR5 backfilled from `is_*`) | **SEMANTIC_INHERITANCE** (per D-Repair: 0 drift) | AUTHORITATIVE per D-Repair |
| 9 | Production `is_own` values (other than ATM `cc3394e4`) | unknown | (all 15) | n/a | n/a | **UNKNOWN** (no migration in this repo) | EVIDENCE GAP (cannot enumerate without live query) |
| 10 | `is_own` schema column | `lib/supabase/database.types.ts:6383` | n/a | `boolean \| null` | YES | UNKNOWN (predates migration repo) | AUTHORITATIVE (schema-level) |

---

## 15. Evidence Gaps

| Gap | Type | Affected Tenant(s) | Implication |
|-----|------|-------------------|-------------|
| **G-1**: HALU has no entity/role/driver/fleet fixture | UNREPRESENTED | HALU | Ownership semantics cannot be tested at HALU from repository data |
| **G-2**: EXTERNAL NON-VENDOR scenario not architecturally representable | ARCHITECTURAL | all | No positive canonical role for "external non-vendor" exists; only by-absence |
| **G-3**: Historical `is_own` values (excluding ATM `cc3394e4`) have unknown origin | UNKNOWN | all | Cannot determine whether existing `is_own` values are authoritative without live query |
| **G-4**: D-Repair did not enumerate `is_own` distribution | EVIDENCE GAP | all | D-Repair scope was `is_vendor`/`is_customer`/`is_supplier`/`is_broker`; `is_own` was out of scope |
| **G-5**: HALU test data does not exercise any ownership scenario | UNREPRESENTED | HALU | R-2 Entity Ownership readers cannot be smoke-tested at HALU from seed data alone |

---

## 16. Future Remediation Options (NOT executed)

### 16.1 Read-only enumeration (proposed D-Repair-3)

A new read-only phase that:

- Queries `md_entities` for `is_own` distribution per tenant (no mutation)
- Cross-references with `party_roles` and `is_vendor` to map the 4D matrix
- Produces a per-tenant ownership distribution report
- **Required authorization**: separate explicit message
- **Mutates data**: NO
- **Resolves**: G-3, G-4

### 16.2 HALU fixture authoring (proposed HALU-Fixture-Authoring)

A new phase that authors test fixtures for HALU:

- Insert 4 entities: 1 OWN (`is_own = true`), 1 VENDOR (`is_own = false` + VENDOR role), 1 EXTERNAL NON-VENDOR (`is_own = false`, no VENDOR role), 1 UNCLASSIFIED (`is_own = null`)
- Insert 4 drivers (one per entity)
- Insert 4 fleets (one per entity)
- **Required authorization**: separate explicit message
- **Mutates data**: YES (fixture INSERT)
- **Resolves**: G-1, G-5

### 16.3 Canonical enrichment (proposed D-Repair-2-Apply or Canonical-Enrichment)

A new phase that retroactively derives `is_own` for the 62 backfilled `party_roles` records per ADR-078:

- For each entity with no VENDOR role → `is_own = true` (internal)
- For each entity with VENDOR role → `is_own = false` (external)
- Requires explicit ADR amendment or human decision
- **Required authorization**: separate explicit message + ADR amendment
- **Mutates data**: YES (`is_own` UPDATE on 62 records)
- **Resolves**: G-3 (for the 62 records)
- **WARNING**: This would re-introduce the SEMANTIC_INHERITANCE problem that ADR-078 Decision 4 explicitly rejects ("Do NOT perform heuristic backfill of `NULL` values"). This option is **NOT recommended** per ADR-078.

### 16.4 Recommended path

Per ADR-078 (Decisions 3 and 4):

> Existing `NULL` values MUST remain `NULL` unless ownership is explicitly known
> Do NOT perform heuristic backfill of `NULL` values
> Do NOT infer ownership from `vendor_type`, name heuristics, or `party_roles` for write authority

The **architecturally correct remediation** is:

1. **D-Repair-3** (read-only enumeration) to map current state
2. **HALU-Fixture-Authoring** to provide test coverage at HALU
3. **Manual explicit classification** of any entity that needs to be definitively OWN or EXTERNAL — done by an authorized user through a controlled UI/API (not yet implemented in R-A; would be a separate phase)

**No backfill. No heuristic. No D-Repair-2-Apply.**

---

## 17. Explicit Non-Actions

This phase did **NOT**:

- Insert, Update, Delete, Upsert any record
- Run any RPC that mutates data
- Create or apply any migration
- Modify any seed, fixture, or test-data file
- Assign or remove any role
- Repair any ownership value
- Backfill any value
- Modify any production service (PartyRoleService, EntityOwnershipService, DriverAccessClassificationService, JobFinancialWorkflowService, RoleReconciliationService)
- Modify any reader, writer, API, UI, ADR, schema, or authorization logic
- Begin R-B, R-C, W5, D-Repair
- Globally replace `resolveIsVendor()` or `mapTransportersForTenant()`
- Run full regression
- Query production tenant data (out of scope per Section 8)

**Mutations: 0. Schema changes: 0. Production changes: 0. R-B: 0. R-C: 0.**

---

## 18. G1–G25 Gate Results

| Gate | Result | Evidence |
|------|--------|----------|
| G1 — Authorization verified | ✅ PASS | Explicit user message 2026-09-04T00:46:11Z |
| G2 — ADR-078 identified as governing authority | ✅ PASS | ADR-078 RATIFIED 2026-09-03; sole governance |
| G3 — Prior reports reused | ✅ PASS | Section 3 |
| G4 — `EntityOwnershipService` inspected | ✅ PASS | 43-line file, read-only `is_own` |
| G5 — Canonical ownership source identified | ✅ PASS | `md_entities.is_own` via `EntityOwnershipService` per ADR-078 Decision 2 |
| G6 — `is_own` authority status determined | ✅ PASS | CANONICAL (sole authoritative per ADR-078 Decision 2) |
| G7 — Every relevant `is_own` occurrence classified | ✅ PASS | Section 6.2 — 60+ occurrences across 16 files classified |
| G8 — Evidence lineage established | ✅ PASS | Section 7 |
| G9 — Circular/backfill evidence identified | ✅ PASS | No circular for `is_own`; 62 party_roles records SEMANTIC_INHERITANCE (independent of `is_own`) |
| G10 — HALU ownership evidence enumerated | ⚠️ YELLOW | HALU has NO entity/role/driver/fleet fixture (GAP) |
| G11 — OWN scenario tested | ⚠️ YELLOW | AUTHORITATIVE for ATM `cc3394e4` only; UNREPRESENTED at HALU; UNKNOWN elsewhere |
| G12 — EXTERNAL NON-VENDOR distinction tested | ❌ FAIL (UNREPRESENTED) | No positive canonical role exists; only by-absence |
| G13 — Vendor semantics kept separate | ✅ PASS | ADR-078 Decision 8; `is_own` ≠ VENDOR role |
| G14 — Tenant isolation verified | ✅ PASS | Section 13 |
| G15 — No production mutation | ✅ PASS | Section 17 |
| G16 — No test-data mutation | ✅ PASS | Section 17 |
| G17 — No schema/migration change | ✅ PASS | Section 17 |
| G18 — No fixture authoring | ✅ PASS | Section 17 |
| G19 — No R-B change | ✅ PASS | Section 17 |
| G20 — No R-C change | ✅ PASS | Section 17 |
| G21 — No `resolveIsVendor()` change | ✅ PASS | Section 17 |
| G22 — No D-Repair execution | ✅ PASS | Section 17 |
| G23 — Evidence gaps explicitly classified | ✅ PASS | Section 15 — 5 gaps (G-1 through G-5) |
| G24 — Future remediation implications documented without execution | ✅ PASS | Section 16 — 3 proposed phases, none executed |
| G25 — Report created | ✅ PASS | This document |

**G1–G25 result: 21 / 25 PASS, 3 YELLOW (G10, G11) / FAIL (G12). Status is therefore YELLOW, not GREEN.**

YELLOW is correct per Section 17 rule:

> YELLOW: If ownership exists but evidence remains circular, legacy-derived, or insufficient: STATUS: YELLOW. Document the exact missing evidence.

The evidence for `is_own` ownership exists (one explicit record for ATM `cc3394e4`) but is insufficient to prove OWN across all tenants and is unable to prove EXTERNAL NON-VENDOR at all. The exact missing evidence is documented in Section 15 (G-1 through G-5).

---

## 19. Exact Change Inventory

| Path | Change |
|------|--------|
| `docs/architecture/SENTRALOGIS_D_REPAIR_2_IS_OWN_ENUMERATION_REPORT.md` | CREATED (this file) |

**No other files created, modified, or deleted. No production source changes. No test changes. No migration changes. No fixture changes. No seed changes. No ADR changes. No service changes. No reader changes. No writer changes.**

---

## 20. Final Recommendation

The canonical authority for entity ownership is correctly established: `md_entities.is_own` is the sole authoritative source per ADR-078 Decision 2, and `EntityOwnershipService` faithfully implements the ADR-078 Resolution Algorithm. **No architectural contradiction** between the canonical service and ADR-078.

**However, three evidence gaps prevent GREEN:**

1. **HALU has no ownership test data** — the HALU WMS seed contains warehouses/zones/locations/SKUs only, no entity/role/driver/fleet fixture. Ownership semantics cannot be smoke-tested at HALU from repository data alone.
2. **Only one `is_own = true` record has independent canonical evidence** (ATM `cc3394e4` from explicit 20260811 UPDATE). All other `is_own` values have **UNKNOWN origin** because no migration in this repository set them.
3. **EXTERNAL NON-VENDOR cannot be positively proven** — the architecture has no role/flag for "external but not vendor." The only path is by-absence (no VENDOR party_role), which is structurally the same negative-evidence problem that ADR-078 was designed to eliminate for `is_own`.

**Recommended future phases (NOT authorized by this phase, NOT executed):**

1. **D-Repair-3** (read-only): enumerate per-tenant `is_own` distribution via live query. Authorization required.
2. **HALU Fixture Authoring**: create entity/role/driver/fleet fixtures for HALU covering 4 ownership scenarios (OWN, VENDOR, EXTERNAL NON-VENDOR, UNCLASSIFIED). Authorization required.
3. **Manual Explicit Classification** (NOT heuristic backfill, per ADR-078 Decision 4): for any entity that needs to be definitively OWN or EXTERNAL, an authorized user must classify it through a controlled UI/API. Requires separate phase to implement classification UI/API.

**Per ADR-078, the architecturally correct path is NOT a backfill.** Existing NULL `is_own` values must remain NULL unless explicitly classified. Heuristic backfill (e.g., from `is_vendor = false` or `party_roles.VENDOR` absence) is explicitly rejected by ADR-078.

---

## 21. Final Status

```
D-REPAIR-2 IS_OWN ENUMERATION
STATUS: YELLOW — EVIDENCE SUFFICIENT FOR ONE OWN RECORD, INSUFFICIENT FOR EXTERNAL NON-VENDOR, NO ARCHITECTURAL CONTRADICTION
```

The canonical authority chain is verified clean (ADR-078 → `EntityOwnershipService` → `md_entities.is_own`). No circular evidence. No architectural contradiction. One independent OWN record (ATM `cc3394e4`). All other `is_own` values are **UNKNOWN** in origin and require either enumeration (D-Repair-3) or explicit classification (manual, per ADR-078 Decision 4). EXTERNAL NON-VENDOR is unrepresented in the current architecture and would require a new role/flag to be positively proven.

**HARD STOP — END D-REPAIR-2 IS_OWN ENUMERATION DISCOVERY.**
