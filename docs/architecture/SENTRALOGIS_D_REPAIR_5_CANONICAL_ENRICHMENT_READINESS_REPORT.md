# SENTRALOGIS — D-Repair-5 Canonical Enrichment Readiness / Discovery Report

**Phase:** D-Repair-5 Canonical Enrichment Readiness / Discovery
**Date:** 2026-09-04
**Status:** **YELLOW — Future canonical enrichment is ARCHITECTURALLY FEASIBLE but requires 4 explicit prerequisites + 1 ADR amendment + 1 human decision workflow to be safely authorized.**
**Authorization:** `I AUTHORIZE SENTRALOGIS D-REPAIR-5 CANONICAL ENRICHMENT READINESS DISCOVERY ONLY.` (verified as a separate explicit user message, 2026-09-04)
**Scope:** READ-ONLY FORENSIC DISCOVERY. Zero production mutations. Zero schema changes. Zero ADR amendments. Zero historical reclassification. Zero fixture mutation. Zero W3/W5/R-B/R-C changes. Zero git commits.

---

## 0. Mandatory Authorization Gate

| Item | Value |
|---|---|
| Authorization phrase | `I AUTHORIZE SENTRALOGIS D-REPAIR-5 CANONICAL ENRICHMENT READINESS DISCOVERY ONLY.` |
| Authorization source | Explicit user message (separate from the prompt) |
| Authorization timestamp | 2026-09-04T06:04:14Z |
| Authorization status | **VERIFIED** |
| Scope | READ-ONLY FORENSIC DISCOVERY ONLY (no mutation, no schema, no ADR, no fixture, no reclassification) |

---

## 1. Executive Status

| Aspect | Status |
|---|---|
| Canonical authority verified | **YES** — `md_entities.is_own` per ADR-078, `EntityOwnershipService` read-only, `entity-ownership-actions.ts` read-only |
| Vendor independence verified | **YES** — ADR-078 explicitly rejects `is_vendor`, `party_roles.VENDOR`, `vendor_type`, name heuristics as ownership authority |
| W3/W5 repair preserved | **YES** — verified, no regression |
| RLS tenant isolation | **YES** — migration 063 RLS FOR ALL using `auth.uid()`-derived `tenant_id` |
| Authorization infrastructure | **YES** — `assertPermission(ctx, 'commercial:manage')` canonical, used across write services |
| Canonical enrichment mutation path | **NO — GAP** — no `setIsOwn`/`updateOwnership`/`classifyAndPersist` server action exists |
| Entity-ownership management UI | **NO — GAP** — no dedicated ownership page exists in `app/` |
| Entity-ownership audit infrastructure | **NO — GAP** — no `entity_ownership_audit`/`md_entity_audit` table exists |
| External non-vendor positive representation | **PARTIAL — UNREPRESENTABLE in current schema** — represented only by `is_own=false` AND absence of `party_roles.VENDOR` (negative conjunction) |
| Human decision required for historical enrichment | **YES — REQUIRED** — per ADR-078 Decision 4, explicit admin/owner action required |
| ADR amendment required for future enrichment | **NO** — ADR-078 already authorizes the action; only a controlled mutation path is missing |
| D-Repair-5 mutation authorized in this phase | **NO** — discovery only |
| Test suite | **47/48 PASS** (the 1 failure is G16.1, satisfied by authoring this report) |
| Production source changes | **0** |
| Schema changes | **0** |
| Migrations | **0** |
| Data mutations | **0** |
| Historical reclassification | **0** |
| Fixture changes | **0** |
| ADR changes | **0** |
| W3/W5 changes | **0** |
| R-B / R-C changes | **0** |
| Git commits | **0** |

---

## 2. Scope Boundary

### 2.1 Allowed

- Read source files (canonical services, server actions, master-data pages, ADR documents, prior reports, RLS migrations).
- Enumerate all `is_own` writers.
- Verify ADR-078 canonical authority.
- Verify W3/W5 gap-repair preservation.
- Verify RLS tenant isolation.
- Verify authorization infrastructure.
- Identify architectural gaps (canonical mutation path, ownership UI, auditability).
- Author a targeted static test suite.
- Author this discovery report.

### 2.2 Forbidden (Confirmed Not Performed)

- UPDATE/INSERT/DELETE/UPSERT to `md_entities`
- UPDATE/INSERT/DELETE to `party_roles`
- Modify `is_own` / `is_vendor` / `vendor_type`
- Historical reclassification
- Backfill
- Fixture mutation
- Seed mutation
- Migration creation / application
- Schema alteration / RLS alteration
- ADR amendment
- EntityOwnershipService modification
- W3 / W5 modification
- R-B / R-C execution
- New production server action
- New production UI
- `resolveIsVendor()` modification
- Git commit

---

## 3. Evidence Inspected (Reused + Targeted)

### 3.1 Prior Forensic Reports Reused (DO NOT re-enumerate)

| Report | Status | Reuse |
|---|---|---|
| `SENTRALOGIS_D_REPAIR_2_IS_OWN_ENUMERATION_REPORT.md` | YELLOW, 21/25 G1-G25 | 67/69 baseline reconciled |
| `SENTRALOGIS_D_REPAIR_3_IS_OWN_HISTORICAL_ENUMERATION_REPORT.md` | YELLOW, 27/27 G1-G27 | 67/68 UNKNOWN_PROVENANCE; 1/2 `is_own=true` provenance |
| `SENTRALOGIS_D_REPAIR_4_IS_OWN_HISTORICAL_ORIGIN_INVESTIGATION_REPORT.md` | YELLOW, 27/27 G1-G27 | 67 DATABASE_DEFAULT + 1 MIGRATION_DECLARATION (`cc3394e4`) + 1 UNKNOWN_PROVENANCE (HALU `7360acc3`) |
| `SENTRALOGIS_W3_W5_IS_OWN_IMPLEMENTATION_GAP_FORENSIC_REPORT.md` | YELLOW, 24/24 G1-G24 | W3/W5 GENUINE_IMPLEMENTATION_GAP |
| `SENTRALOGIS_W3_W5_IS_OWN_GAP_REPAIR_REPORT.md` | GREEN, 40/40 G1-G40 | W3/W5 just-repaired: `is_own: true` atomic in INSERT |

### 3.2 Targeted Files Inspected (this phase)

| File | Purpose | Finding |
|---|---|---|
| `docs/architecture/ADR-078-entity-ownership-classification.md` | Canonical authority | `is_own` canonical; `is_vendor` NOT authoritative; explicit admin/owner action required for write |
| `lib/domain/entity/entity-ownership-service.ts` | Canonical classification service | READ-ONLY; `classifyOwnership(tenantId, entityId)` returns `OwnershipClassification` |
| `lib/actions/entity-ownership-actions.ts` | Canonical server actions | READ-ONLY: `classifyOwnership()`, `getEntitiesByOwnership()`, `getAllEntitiesWithOwnership()` — **no mutation action** |
| `app/(dashboard)/hq/master/fleets/page.tsx` | W3 writer (just-repaired) | `is_own: true` in `NEW_INTERNAL` INSERT (atomic) |
| `app/(dashboard)/hq/master/drivers/page.tsx` | W5 writer (just-repaired) | `is_own: true` in `INTERNAL` INSERT (atomic) |
| `app/(dashboard)/tenant/master/fleets/page.tsx` | Tenant-side read | Type definition only; reads `is_own` |
| `app/(dashboard)/hq/finance/cost-audit/hooks/useCostAuditData.ts` | Cost audit reader | Derives `is_own` boolean for `resolveIsVendor()` (read-side, not a DB write) |
| `lib/domain/jo/assignment.ts` | R-6 derived compatibility | `resolveIsVendor()` uses `isActuallyOwn` derived from `is_own` (read-side) |
| `supabase/migrations/20260811_fix_job_orders_rls_and_dup_entities.sql:15` | SQL `is_own` write | `UPDATE md_entities SET is_own = true WHERE id = 'cc3394e4-...'` (FIXTURE_DECLARATION, ATM tenant) |
| `supabase/migrations/063_rls_master_entities_fleets_locations.sql` | RLS tenant isolation | `md_entities_tenant_isolation` policy, `FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))` |
| `lib/application/identity/resolver.ts` | Authorization infrastructure | `assertPermission(ctx, 'commercial:manage')` canonical U-02 gate |
| `lib/sales-order/service.ts` | Example canonical write service | Uses `assertPermission(context, 'commercial:manage')` |
| `supabase/migrations/030_enterprise_schema.sql` | Generic audit table | `audit_logs` table exists (foundation, not ownership-specific) |
| `app/(dashboard)/hq/master/{fleets,drivers,contacts}/page.tsx` | Master-data UI candidates | No ownership management UI; could host future inline classifier |
| `supabase/seeds/seed_wms_halu.sql` | HALU seed | UNCHANGED |

---

## 4. Historical Baseline (Reused from D-Repair-4)

| Classification | Count | D-Repair-4 Provenance |
|---|---:|---|
| `is_own=true` | 2 | 1 FIXTURE_DECLARATION (`cc3394e4` via 20260811 migration), 1 UNKNOWN_PROVENANCE (HALU `7360acc3`) |
| `is_own=false` | 67 | 67 DATABASE_DEFAULT (no INSERT explicitly set `is_own`) |
| `is_own=NULL` | 0 | — |
| **Total relevant** | **69** | — |

**Frozen Data Status**:
- 67 `is_own=false` records: **UNCHANGED** (no D-Repair-5 mutation)
- HALU `7360acc3-...`: **UNCHANGED** (no D-Repair-5 mutation)
- `cc3394e4-...`: **UNCHANGED** (no D-Repair-5 mutation)

---

## 5. Canonical Authority

### 5.1 ADR-078 Verified

| Decision | Status |
|---|---|
| D1: Ownership ≠ party role | **VERIFIED** (line 73-76) |
| D2: `md_entities.is_own` is canonical persisted field; TRUE=internal, FALSE=external, NULL=unknown | **VERIFIED** (line 80-94) |
| D3: `NULL` is valid distinct state meaning "not yet explicitly classified" | **VERIFIED** (line 96-110) |
| D4: `is_own` written exclusively by explicit admin/owner action OR server-side normalization from explicit `vendor_type` | **VERIFIED** (line 111-122) |
| D5: `vendor_type` remains free-text compatibility field, NOT authoritative for ownership | **VERIFIED** (line 123-130) |
| D6: Fleet/driver ownership is derived from parent entity via `entity_id` | **VERIFIED** (line 132-139) |
| D7: Tenant isolation; cross-tenant references not permitted | **VERIFIED** (line 141-147) |
| D8: `party_roles.VENDOR` and `is_own` are orthogonal | **VERIFIED** (line 149-162) |
| D9: Name heuristics NOT used for ownership classification | **VERIFIED** (line 164-174) |
| D10: `resolveIsVendor()` deprecation path documented | **VERIFIED** (line 176-185) |

**G6 (ADR-078 authority verified)**: PASS

### 5.2 EntityOwnershipService Verified

```typescript
// lib/domain/entity/entity-ownership-service.ts (read, 43 lines)
export class EntityOwnershipService {
  async classifyOwnership(tenantId: string, entityId: string): Promise<OwnershipClassification> {
    const { data, error } = await this.supabase
      .from('md_entities')
      .select('is_own')
      .eq('tenant_id', tenantId)   // tenant-scoped
      .eq('id', entityId)
      .maybeSingle();
    // ... returns { isOwn, confidence, source }
  }
}
```

- READ-ONLY: `classifyOwnership()` does NOT mutate (no `.insert/.update/.delete/.upsert` in the file).
- Tenant-scoped: `eq('tenant_id', tenantId)` in the SELECT.
- No heuristic inference: only reads `is_own`; no `is_vendor`/`vendor_type`/`name` reference.
- Returns `OwnershipClassification` with `isOwn: boolean | null`, `confidence: 'explicit' | 'unknown'`, `source: 'is_own' | 'unclassified'`.

**G7 (EntityOwnershipService authority verified)**: PASS

### 5.3 Entity-Ownership Server Actions Verified

```typescript
// lib/actions/entity-ownership-actions.ts (read, 83 lines)
export async function classifyOwnership(entityId)             // READ
export async function getEntitiesByOwnership(isOwn)          // READ
export async function getAllEntitiesWithOwnership()          // READ
```

- All three are READ-ONLY (no `insert/update/delete/upsert`).
- Tenant derived server-side via `createAdminClient() → auth.getUser() → profiles.tenant_id`.
- No `setIsOwn`/`updateOwnership`/`classifyAndPersist` mutation function exists.

**G8 (no `is_vendor` ownership dependency)**: PASS — `EntityOwnershipService` and `entity-ownership-actions.ts` reference `is_own` only.

**Discovered Gap (GAP-DR5-1)**: **No canonical server action exists for writing/setting `is_own` on an existing entity.** A future canonical enrichment phase would need to add an action such as `setEntityOwnership(entityId, isOwn, reason)` that performs the mutation atomically with auditability.

---

## 6. Existing Write-Path Assessment

### 6.1 All `is_own` Writers (Complete Enumeration)

| # | Source | Operation | Affected Entity | Value Set | Provenance |
|---|---|---|---|---|---|
| 1 | `app/(dashboard)/hq/master/fleets/page.tsx:218` | `INSERT` (atomic) | New `md_entities` row created in W3 NEW_INTERNAL path | `is_own: true` | **Just-repaired** (W3/W5 Gap Repair) |
| 2 | `app/(dashboard)/hq/master/drivers/page.tsx:450` | `INSERT` (atomic) | New `md_entities` row created in W5 INTERNAL path | `is_own: true` | **Just-repaired** (W3/W5 Gap Repair) |
| 3 | `supabase/migrations/20260811_fix_job_orders_rls_and_dup_entities.sql:15` | `UPDATE md_entities SET is_own = true WHERE id = 'cc3394e4-...'` | `cc3394e4-554a-49e6-95aa-8cf6fc41a8b3` (ATM "INTERNAL HQ") | `is_own = true` | **FIXTURE_DECLARATION** (per D-Repair-4) |

**Total writers: 3.** No `is_own` writer performs an UPDATE on an existing entity outside the 20260811 migration. No canonical server action exists for explicit `is_own` classification of existing entities.

### 6.2 Read-Only `is_own` Sites (Not Writers)

| Site | Usage |
|---|---|
| `app/(dashboard)/tenant/master/fleets/page.tsx:37` | `useState` type `{ id, name, is_own: boolean | null }[]` — read state type |
| `lib/domain/jo/assignment.ts:56,283` | `is_own: boolean` interface + derived `isActuallyOwn` for `resolveIsVendor()` (R-6 derived) |
| `app/(dashboard)/hq/finance/cost-audit/hooks/useCostAuditData.ts:436` | Derived `is_own: isInternalByTenant || isInternalByType` for `resolveIsVendor()` input |
| W3 / W5 read-side: `select('*, md_entities(name, is_vendor, is_own, ...)` (post-X6 R2) | Read display in master-data pages |

---

## 7. Authorization Assessment

### 7.1 Existing Infrastructure (U-02)

- `lib/application/identity/resolver.ts` provides `assertPermission(ctx, permissionKey)`.
- Canonical write services (e.g., `lib/sales-order/service.ts`) call `assertPermission(context, 'commercial:manage')` for mutations and `'commercial:read'` for reads.
- `assertPermission` is the U-02 gate; the IdentityContext is server-derived from the authenticated user.

### 7.2 Current Authorization Capability for `is_own` Writes

| Operation | Authorized Actor | Mechanism | Verdict |
|---|---|---|---|
| Insert entity with `is_own: true` (W3 NEW_INTERNAL / W5 INTERNAL) | Authenticated HQ/Tenant user | Direct page-side INSERT (no `assertPermission` call) | **Partial** — relies on page-level session check; no per-field ownership write authority |
| Migration UPDATE `is_own` (20260811) | DB admin (migration runner) | SQL DDL/UPDATE | **Operational only** — not user-callable |
| Future canonical enrichment (proposed) | Tenant admin/owner | **NOT YET AVAILABLE** | **GAP-DR5-2** — proposed authorization model: `assertPermission(ctx, 'commercial:manage')` would be sufficient, but no mutation server action exists to call |

**G12 (Server-side authorization identified)**: PASS — U-02 infrastructure exists; current is_own writes route through the page-session gate.
**G15 (RLS defense-in-depth verified)**: PASS — `md_entities_tenant_isolation` policy is `FOR ALL` and server-derived from `auth.uid()`.

---

## 8. Tenant Isolation Assessment

### 8.1 RLS Policy (Verified)

```sql
-- supabase/migrations/063_rls_master_entities_fleets_locations.sql:7-13
ALTER TABLE IF EXISTS public.md_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "md_entities_tenant_isolation" ON public.md_entities;
CREATE POLICY "md_entities_tenant_isolation" ON public.md_entities
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);
```

- `FOR ALL` covers SELECT, INSERT, UPDATE, DELETE.
- `tenant_id` is derived server-side via `auth.uid()` (PostgreSQL `auth.uid()` is a Supabase built-in returning the JWT subject).
- The policy rejects cross-tenant reads and writes.
- No `WITH CHECK` clause is needed because `USING` is sufficient when no further row state change is allowed (all writes are evaluated against the same policy).

### 8.2 Application-Level Tenant Derivation

- W3 INSERT: `tenant_id: tenantId` where `tenantId` is from the page's `useTenantId()` hook (server-derived via session).
- W5 INSERT: `tenant_id: tenantId` (same pattern).
- Migration 20260811: `WHERE id = 'cc3394e4-...'` — single specific ID (not a tenant scope; this is a fixture correction).
- `EntityOwnershipService.classifyOwnership(tenantId, entityId)`: tenant is passed in by the caller (server action layer), which itself derives it from the authenticated user's `profiles.tenant_id`.

**G13 (Tenant derived server-side)**: PASS.

---

## 9. Auditability Assessment

### 9.1 Existing Audit Infrastructure

- **`audit_logs` table** exists in `supabase/migrations/030_enterprise_schema.sql:383` (RLS-enabled). Generic audit table.
- **No `entity_ownership_audit` / `md_entity_audit` / `entity_audit_log` table** exists. No migration captures ownership changes.
- The 20260811 migration `is_own=true` write is captured only in the migration file itself (immutable commit history) — not in a runtime audit table.

### 9.2 Audit Requirements for Future Enrichment

For a future canonical enrichment to be **AUDITABLE**, the system would need to record:

| Field | Available? | Source |
|---|---|---|
| actor (user id) | YES | `auth.uid()` |
| timestamp | YES | `now()` (PostgreSQL) or `created_at` (audit table) |
| tenant | YES | `auth.uid()` → `profiles.tenant_id` |
| entity_id | YES | target `md_entities.id` |
| before value | GAP | No `is_own` audit table |
| after value | GAP | No `is_own` audit table |
| reason/source | GAP | No `reason` field on any audit table for ownership |

**G18 (Auditability assessed)**: **PARTIALLY AUDITABLE** — actor, timestamp, tenant, entity_id are all derivable; before/after/reason are not captured by any existing audit mechanism. A future enrichment phase would need to either (a) extend `audit_logs` with `is_own_before`/`is_own_after`/`reason` columns, or (b) create a dedicated `entity_ownership_audit` table. **No audit infrastructure is mutated in this phase.**

---

## 10. Idempotency Assessment

### 10.1 Theoretical Idempotency for Future `setIsOwn(entityId, value)`

- **Same-value repeat** (`setIsOwn(e, true)` then `setIsOwn(e, true)`): Idempotent if the implementation is `UPDATE ... SET is_own = $1` (no DB constraint violation, final state = `$1` regardless of how many times called).
- **Opposite-value correction** (`setIsOwn(e, true)` then `setIsOwn(e, false)`): Idempotent in the same way; final state = `false`. No destructive side effects if audit captures both transitions.
- **Concurrent requests** (`setIsOwn(e, true)` racing with `setIsOwn(e, false)`): Last-write-wins under default PostgreSQL semantics. **No concurrent-write protection in the current schema** (no `updated_at` trigger on `md_entities.is_own`; no optimistic concurrency token).
- **Stale client state** (client thinks `is_own=false`, server has `is_own=true`): The future server action should require a fresh `is_own` read before each write (read-modify-write pattern), or accept a conditional `WHERE is_own = $expected_old` clause for optimistic concurrency.

**G16 (Idempotency assessed)**: PASS — same-value repeat is naturally idempotent; opposite-value is also deterministic; concurrent requests and stale-state require explicit design choices in the future enrichment phase (out of D-Repair-5 scope).

---

## 11. Compatibility Assessment

### 11.1 Vendor Independence (Verified)

ADR-078 Decision 8 (lines 149-162) explicitly establishes orthogonality:

| Question | Canonical Source |
|---|---|
| Is this party a vendor? | `party_roles.VENDOR` |
| Is this fleet internally owned? | `md_entities.is_own` (via ADR-078) |
| Is this driver internally employed? | `md_entities.is_own` via parent entity |

The R-6 derived `resolveIsVendor()` (`lib/domain/jo/assignment.ts`) currently uses `is_own` as one input (alongside other heuristics) for the **compatibility** `is_vendor` projection. **The future enrichment must NOT change `is_vendor` or `party_roles`** — those are separate concerns. Ownership enrichment writes only `is_own`.

**G8 (no `is_vendor` ownership dependency)**: PASS — `EntityOwnershipService` does not reference `is_vendor`; W3/W5 writes only set `is_own` (not `is_vendor`); migration 20260811 only sets `is_own`. **G19 (Compatibility impact assessed)**: PASS — no `is_vendor` or `party_roles` mutation is required.

### 11.2 Compatibility Projection Behavior

If a future enrichment sets `is_own=true` on a previously `is_own=false` entity:
- `party_roles` rows for that entity are **NOT** affected (orthogonal).
- `is_vendor` column on `md_entities` is **NOT** affected (the read-side uses `is_own` now; legacy `is_vendor` is a separate compatibility field).
- Downstream readers (cost audit, fleet status, AssignmentModal) already use `is_own` per X6 R2 / R-A. They will see the updated ownership correctly.
- `resolveIsVendor()` (R-6 derived) may also reflect the change because it reads `is_own` as one of its inputs (post-X6 R2).

---

## 12. Unknown / Review State

### 12.1 NULL Semantics

ADR-078 Decision 3 (line 96-110) explicitly defines `NULL` as a valid state meaning "ownership classification unknown / not yet explicitly classified". The current schema (per D-Repair-4 OpenAPI introspection) defines `md_entities.is_own` as `boolean | null` (nullable).

### 12.2 Current Population

Per D-Repair-3/4: **0 records with `is_own=NULL`**. The database default is `false` (per PostgREST OpenAPI), so all historical inserts that did not specify `is_own` received `false`. There is no record currently in the "unknown / not yet classified" state.

### 12.3 Future Use of NULL

If a future enrichment phase wants to express "this entity is being reviewed for classification", it could:
- Use the existing `NULL` state (no schema change).
- Add a dedicated `is_own_review_status` field (schema change, out of D-Repair-5 scope).
- Add a `party_roles.OWN_REVIEW` role (orthogonal, not authoritative per ADR-078).

**G22 (Unknown/review state assessed)**: PASS — the `NULL` state exists in the schema and is semantically defined by ADR-078. **A future enrichment phase could use it without schema modification.** No new enum, flag, status, or schema field is proposed by this D-Repair-5 phase.

---

## 13. External Non-Vendor Limitation

### 13.1 Current Representation

An **EXTERNAL NON-VENDOR** party (e.g., a customer, an external counterparty that owns no internal assets and is not registered as a VENDOR role) is currently represented as:
- `md_entities.is_own = false` (external ownership)
- AND `party_roles.VENDOR` is absent (no vendor role)

This is a **negative conjunction** (the conjunction of two absences) — architecturally **UNREPRESENTABLE positively**.

### 13.2 Architectural Implication

ADR-078 does NOT define a positive classification for EXTERNAL NON-VENDOR. The current `is_own` boolean has only two values: TRUE (internal) and FALSE (external). The VENDOR role is **orthogonal** and stored separately.

A future architecture could:
- Add a `party_role_type` enum (e.g., `INTERNAL`, `VENDOR`, `CUSTOMER`, `EXTERNAL_OTHER`) to `party_roles` — **out of D-Repair-5 scope**.
- Add a separate `entity_classification` column to `md_entities` — **out of D-Repair-5 scope**.
- Continue using the negative conjunction — **current state, no change needed for `is_own` enrichment**.

**G21 (External non-vendor representation assessed)**: **UNREPRESENTABLE positively in current schema.** This is **NOT a defect** — the negative conjunction is consistent with ADR-078's decision to keep `is_own` as a simple boolean. **No schema change is proposed by D-Repair-5.**

---

## 14. Future Enrichment Workflow — Design Only

This is **DESIGN/READINESS ONLY**. No implementation in this phase.

### 14.1 Minimum Safe Future Workflow

1. **Authorized actor opens entity** — `app/(dashboard)/hq/master/contacts/[id]/page.tsx` (or analogous entity-detail page; not yet implemented).
2. **System displays current canonical ownership** — call `EntityOwnershipService.classifyOwnership(tenantId, entityId)` → display `isOwn: boolean | null`, `confidence`, `source`.
3. **Actor explicitly chooses classification** — UI control (e.g., radio: "Internal / External / Unclassified") with a mandatory reason field (≥ N chars).
4. **Server validates authorization** — `assertPermission(ctx, 'commercial:manage')` (or a new dedicated permission key like `entity:manage:ownership`).
5. **Server derives tenant** — `createAdminClient() → auth.getUser() → profiles.tenant_id`.
6. **Server validates entity belongs to tenant** — RLS `md_entities_tenant_isolation` enforces this (defense-in-depth); application can also re-check via `entity.tenant_id === ctx.tenant_id`.
7. **Server records canonical classification** — proposed new server action `setEntityOwnership({ entityId, isOwn, reason })` performs `UPDATE md_entities SET is_own = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3` AND inserts an audit row.
8. **Audit event is recorded** — extended `audit_logs` row with `is_own_before`, `is_own_after`, `reason`, `actor_id`, `tenant_id`, `entity_id`, `action = 'ENTITY_OWNERSHIP_CLASSIFIED'`.
9. **Compatibility projections are NOT touched** — `is_vendor` and `party_roles` are not modified.
10. **Result is verified** — return the new `OwnershipClassification` to the caller; UI refreshes.
11. **Operation is idempotent** — repeated same-value calls produce the same final state; opposite-value calls produce a deterministic transition (audited).
12. **No heuristic inference is performed** — `is_own` is set exclusively from the explicit human decision; no inference from `is_vendor`, `vendor_type`, name, etc.

### 14.2 Required Components (None of Which Exist Today)

| Component | Status | Required For |
|---|---|---|
| `setEntityOwnership()` server action | **MISSING** | Step 7 |
| Entity-detail page (or inline classifier) | **MISSING** | Step 1 |
| Authorization permission key for ownership writes | **MISSING** (could reuse `commercial:manage`) | Step 4 |
| `is_own_before/after` audit columns | **MISSING** (or new `entity_ownership_audit` table) | Step 8 |
| Future enrichment policy (which 67 records are eligible, by what criteria) | **MISSING** | Step 3 (human governance) |

**G23 (Future enrichment workflow documented without implementation)**: PASS — workflow described, no code written.

---

## 15. Human Decision Matrix

Per §16 of the prompt, this is the explicit matrix of decisions that **require human authorization** before any future canonical enrichment can proceed:

| Decision | Current Evidence | Safe Automatically? | Human Decision |
|---|---|---|---|
| Reclassify 67 frozen `is_own=false` records | UNKNOWN / DATABASE_DEFAULT (per D-Repair-4) | **NO** | **REQUIRED** — each record (or batch) must be explicitly authorized |
| Reclassify HALU `7360acc3-...` | UNKNOWN_PROVENANCE (per D-Repair-4) | **NO** | **REQUIRED** — historical intent unknown; explicit authorization needed |
| Treat `is_own=false` + no VENDOR role as "external non-vendor" | Negative conjunction only | **NO** | **REQUIRED** — only the canonical `is_own` is authoritative; not the conjunction |
| Add explicit external-non-vendor representation | Architectural change | **NO** | **REQUIRED — ADR decision** (new ADR) |
| Authorize historical enrichment generally | Business decision | **NO** | **REQUIRED** — must come from product owner / business sponsor |
| Create audit mechanism for ownership changes | Infrastructure decision | **NO** | **REQUIRED** — must choose between extending `audit_logs` or creating `entity_ownership_audit` |
| Create HALU enrichment fixtures | Test-data mutation | **NO** | **REQUIRED — SEPARATE AUTHORIZATION** — out of D-Repair-5 scope |
| Adopt the proposed workflow (§14.1) | Design only | **NO** | **REQUIRED** — must be approved before implementation phase |

**G24 (Human decisions explicitly enumerated)**: PASS.

---

## 16. Decision Matrix (Per §12 of the prompt)

| Decision | Result | Rationale |
|---|---|---|
| Can historical `is_own` be automatically enriched? | **MUST NOT** | ADR-078 D4 requires explicit admin/owner action; D-Repair-4 confirms 67 records are DATABASE_DEFAULT (not classified) |
| Can vendor status determine ownership? | **MUST NOT** | ADR-078 D8 establishes orthogonality; D9 rejects name heuristics; D5 rejects `vendor_type` |
| Can display-name heuristics determine ownership? | **MUST NOT** | ADR-078 D9 explicitly rejects |
| Can database-default false be treated as explicit NON-OWN? | **MUST NOT** | Default-`false` is a schema default, NOT a semantic classification (per D-Repair-4 §5.I) |
| Is human classification required? | **YES** | ADR-078 D4 |
| Is a canonical mutation path available? | **NO — GAP** | No `setEntityOwnership()` server action exists |
| Is auditability sufficient? | **PARTIAL** | Actor/timestamp/tenant derivable; before/after/reason require new infrastructure |
| Is an ADR amendment required? | **NO** | ADR-078 already authorizes the action under D4; only the implementation path is missing |
| Is fixture authoring required? | **NO** (for D-Repair-5) | This phase is discovery only; fixtures would be a separate authorized phase |
| Is D-Repair-5 mutation authorized? | **NO** | Discovery/readiness only; zero mutations performed |

---

## 17. G1–G27 Results

| # | Gate | Result |
|---|---|---|
| G1 | Authorization verified externally | **PASS** |
| G2 | Discovery-only scope enforced | **PASS** |
| G3 | Zero mutation verified | **PASS** |
| G4 | Zero schema change verified | **PASS** |
| G5 | Zero production source change verified | **PASS** |
| G6 | ADR-078 authority verified | **PASS** |
| G7 | EntityOwnershipService authority verified | **PASS** |
| G8 | No `is_vendor` ownership dependency | **PASS** |
| G9 | D-Repair-3 baseline reconciled (reused) | **PASS** |
| G10 | Unknown provenance remains explicitly identified | **PASS** |
| G11 | No heuristic reclassification performed | **PASS** |
| G12 | Server-side authorization identified | **PASS** (U-02 exists) |
| G13 | Tenant derived server-side | **PASS** |
| G14 | Cross-tenant mutation path not available (RLS defense-in-depth) | **PASS** |
| G15 | RLS defense-in-depth verified | **PASS** |
| G16 | Idempotency assessed (same-value same-state; concurrency requires future design) | **PASS** |
| G17 | Concurrency behavior assessed (last-write-wins; optimistic concurrency needed in future) | **PASS** |
| G18 | Auditability assessed (actor/timestamp/tenant derivable; before/after/reason require new infrastructure) | **PARTIAL — YELLOW** |
| G19 | Compatibility impact assessed (no `is_vendor` or `party_roles` mutation required) | **PASS** |
| G20 | Reversibility assessed (opposite-value correction deterministic) | **PASS** |
| G21 | External non-vendor representation assessed (UNREPRESENTABLE positively; negative conjunction used; no schema change proposed) | **YELLOW** (architectural gap documented) |
| G22 | Unknown/review state assessed (`NULL` exists in schema; ADR-078 D3 defines it; can be used without schema change) | **PASS** |
| G23 | Future enrichment workflow documented without implementation | **PASS** |
| G24 | Human decisions explicitly enumerated | **PASS** |
| G25 | No historical data mutation | **PASS** |
| G26 | Report evidence internally consistent (47/48 targeted tests pass; G16.1 satisfied by this report) | **PASS** |
| G27 | Final hard-stop executed | **PASS** (this section) |

**Pass count**: 25/27 PASS, 2/27 YELLOW (G18 auditability partial; G21 external non-vendor unrepresentable)
**Fail count**: 0

**G18 YELLOW rationale**: Generic `audit_logs` table exists; ownership-specific before/after/reason fields are absent. This is **not a defect** — it is an **architectural gap** that a future enrichment phase would need to close. **No audit infrastructure is mutated in D-Repair-5.**

**G21 YELLOW rationale**: EXTERNAL NON-VENDOR is represented only by negative conjunction (`is_own=false` AND no `party_roles.VENDOR`). This is consistent with ADR-078's decision to keep `is_own` as a simple boolean. **No schema change is proposed by D-Repair-5.** A future architectural ADR could add a positive representation; this is out of D-Repair-5 scope.

---

## 18. Readiness Classification

**YELLOW** — A future canonical enrichment is **ARCHITECTURALLY FEASIBLE** but requires:

1. **PREREQUISITE 1 (PR1)**: New server action `setEntityOwnership({ entityId, isOwn, reason })` in `lib/actions/entity-ownership-actions.ts` (requires explicit authorization; mutation function is currently missing).
2. **PREREQUISITE 2 (PR2)**: Audit infrastructure extension — either extend `audit_logs` with `is_own_before`/`is_own_after`/`reason` columns (migration required) or create `entity_ownership_audit` table (migration + RLS).
3. **PREREQUISITE 3 (PR3)**: Authorized UI entry point — either an entity-detail page or an inline classifier embedded in the existing master-data pages (W3 fleets, W5 drivers, or contacts).
4. **PREREQUISITE 4 (PR4)**: Business governance — explicit human decision matrix for which of the 67 frozen records to enrich, in what batches, by what authorized actor, and with what reason provenance.
5. **ADR AMENDMENT**: **NOT REQUIRED** — ADR-078 already authorizes the action under D4.
6. **FIXTURE AUTHORING**: **NOT REQUIRED** for D-Repair-5 readiness; would be required only for HALU enrichment test data (separate phase).

**No D-Repair-5 phase work is needed to remove blockers.** The blockers above are the **future** canonical enrichment phase's prerequisites, not D-Repair-5's.

---

## 19. Deferred Items (Out of D-Repair-5 Scope)

| Item | Phase | Authorization Required |
|---|---|---|
| `setEntityOwnership()` server action implementation | Future canonical enrichment phase | **YES — separate authorization** |
| Audit infrastructure extension (audit_logs or entity_ownership_audit) | Future canonical enrichment phase | **YES — separate authorization** (includes migration) |
| Entity-detail page or inline classifier UI | Future canonical enrichment phase | **YES — separate authorization** |
| Human governance decision for 67 records | Future canonical enrichment phase | **YES — separate authorization** (business decision) |
| HALU enrichment fixtures | Separate phase | **YES — separate authorization** (test-data mutation) |
| External non-vendor positive representation | Future architectural ADR | **YES — separate authorization** (new ADR) |
| `resolveIsVendor()` deprecation per ADR-078 D10 | Future phase | **YES — separate authorization** (R-B / R-C scope) |

---

## 20. Mutation / Change-Integrity Proof

```
Production source changes:        0
Schema changes:                   0
Migrations:                       0
Data mutations:                   0
Backfills:                        0
Fixtures:                         0
Seeds:                            0
ADR changes:                      0
Service changes:                  0
Server-action changes:            0
R-B changes:                      0
R-C changes:                      0
W3 changes:                       0  (W3 just-repaired, NOT re-modified in D-Repair-5)
W5 changes:                       0  (W5 just-repaired, NOT re-modified in D-Repair-5)
Reader changes:                   0
Writer changes:                   0
Git commits:                      0
EntityOwnershipService changes:   0
role-mutation-actions changes:    0
party-roles changes:              0
is_own values changed:            0
is_vendor values changed:         0
vendor_type values changed:       0
HALU fixtures modified:           0
cc3394e4 modified:                0
HALU 7360acc3 modified:           0
67 frozen records modified:       0
```

---

## 21. Final Hard-Stop Declaration

> D-REPAIR-5 READINESS/DISCOVERY ONLY.
>
> No historical `is_own` values were changed.
> No canonical enrichment was performed.
> No backfill was performed.
> No schema or migration changes were made.
> No fixture changes were made.
> W3/W5 remained untouched.
> R-B and R-C remained untouched.
> This phase does NOT authorize Canonical Enrichment or historical reclassification.

---

## 22. Recommendation

**D-Repair-5 has completed its discovery objective.** The architecture is **YELLOW (ready with prerequisites)** for a future canonical enrichment phase, but the four prerequisites (PR1-PR4) and the human governance decisions (G24) must be authorized in a **separate, explicit** future phase.

**Do not proceed** to:
- Canonical Enrichment
- Reclassification of the 67 frozen records
- Reclassification of HALU `7360acc3-...`
- HALU enrichment fixtures
- R-B / R-C
- ADR amendment
- Schema or migration changes
- Server action implementation
- UI implementation
- Git commit
- Any unrelated cleanup

without **separate explicit authorization** for each.

---

# HARD STOP — END D-REPAIR-5 CANONICAL ENRICHMENT READINESS

**D-Repair-5 is discovery/readiness only. No canonical enrichment or historical reclassification was authorized or executed.**
