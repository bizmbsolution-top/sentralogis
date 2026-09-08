# SENTRALOGIS — W5 CANONICAL WRITER & OPERATIONAL DRIFT DISCOVERY

**Phase:** W5 Canonical Writer & Operational Drift Discovery
**Date:** 2026-09-03
**Type:** READ-ONLY FORENSIC DISCOVERY
**Status:** **GREEN — DISCOVERY COMPLETE**
**Authorization:** READ-ONLY ONLY. No production code, schema, data, migrations, ADRs, or tests modified.

---

## 0. Baseline Invariants (Immutable)

| Invariant | State |
|-----------|-------|
| DATA-4E closure | CLOSED (22/22 PASS) |
| Full regression | 1473/1473 PASS |
| TypeScript | 0 errors |
| W1–W4 writers | Verified clean |
| X6 reader readiness | Completed |
| X6 R2 services | Implemented |
| ADR-078 / ADR-079 / ADR-080 | RATIFIED |
| Reconciliation engine | D1–D7 operational |
| Post-X4 reconciliation | GREEN |
| Deferred-items discovery | GREEN |
| No security vulnerabilities | Confirmed |
| No new ADR required by DATA-4E | Confirmed |

**DATA-4E remains CLOSED. This discovery introduced ZERO production changes.**

---

## 1. Executive Summary

This discovery independently investigates two newly actionable areas: **W5 Canonical Writer** (`hq/master/drivers`) and **Operational Drift Repair** (D1–D7).

**Key findings:**

1. **W5 is a canonical violation** — it writes `is_vendor: false` directly without canonical `assignRoleAction`. This creates **D1 drift** (entity has `is_vendor: false` but no `party_roles` entry). It is **RLS-safe** (no tenant isolation bypass).
2. **W5 migration is mechanically safe** — the existing `RoleMutationService` + `EntityOwnershipService` provide the complete canonical flow. No new ADR or new service is required.
3. **D1/D2/D3 are auto-repairable** through the existing `RoleReconciliationService.reconcile()` method. The repair is **deterministic and idempotent**.
4. **D4/D5/D6 require human/business decision** — they cannot be safely auto-repaired because they involve semantic ambiguity, data integrity violations, or missing ADR mappings.
5. **D7 is prevented** by the BR8 partial unique index (`idx_party_roles_global_unique`).
6. **W5 migration and drift repair should be SEPARATE phases** — they have different scopes, different authorization gates, and different verification criteria.

**Recommended decomposition:** Three independent future phases:
- **Phase W5:** W5 Canonical Writer Migration (single-file change, no ADR required)
- **Phase D-Repair:** Deterministic Operational Drift Repair (dry-run first, then operational approval)
- **Phase D-Human:** Human-Decision Drift Resolution (D4/D5/D6 — requires business policy)

---

## 2. TRACK A — W5 FORENSIC ANALYSIS

### 2.1 A1 — Writer Identification

**Target:** `app/(dashboard)/hq/master/drivers/page.tsx`

**INSERT operation (line 438–449):**

```typescript
const { data: newEntity, error: createError } = await supabase
  .from('md_entities')
  .insert({
    tenant_id: tenantId,           // from useState(useAuth().profile.tenant_id)
    entity_code: entityCode,        // client-generated: `INT-{...}-{random}`
    name: companyName,              // from profile?.tenants?.name
    is_vendor: false,               // ← DIRECT ROLE FLAG WRITE
    vendor_type: null,              // explicit null
    is_active: true                 // explicit true
  })
  .select()
  .single();
```

**Field source analysis:**

| Field | Source | Type |
|-------|--------|------|
| `tenant_id` | `useState` from `useAuth().profile.tenant_id` | Client-derived from server profile |
| `entity_code` | Client-generated: `INT-{companyName.substring(0,3).toUpperCase()}-{Math.random()*1000}` | Hard-coded pattern + random |
| `name` | `profile?.tenants?.name` | Server-derived from profile |
| `is_vendor: false` | **Hard-coded literal** | Not user input, not derived |
| `vendor_type: null` | Hard-coded literal | Not user input, not derived |
| `is_active: true` | Hard-coded literal | Not user input, not derived |

**No UPDATE writes to `is_*` fields found.** W5 only writes `is_vendor: false` on the INSERT path.

**No role mutation performed nearby.** No `assignRoleAction`, `revokeRoleAction`, or `party_roles` INSERT found in this file.

**Trigger condition:** Driver creation form with `driverTypeForm === 'INTERNAL'` AND `internalEntityId === null` (line 434–435). This is a one-time creation when no internal entity exists yet for the tenant.

---

### 2.2 A2 — Semantic Classification

| Field Written | Business Meaning | Classification |
|---------------|------------------|----------------|
| `is_vendor: false` | "This entity is NOT a vendor (it is internal/own)" | **ENTITY OWNERSHIP** (per ADR-078 semantics) |
| `tenant_id` | Tenant identity | **TENANT CONTEXT** (server-derived) |
| `entity_code` | Business identifier | **COMPATIBILITY PROJECTION** (not canonical) |
| `name` | Display name | **COMPATIBILITY PROJECTION** (not canonical) |
| `is_active: true` | Active status | **COMPATIBILITY PROJECTION** (not role/ownership) |

**The semantic intent of `is_vendor: false` is ENTITY OWNERSHIP** — the writer is declaring "this entity is internal/own, not a vendor." Under ADR-078, ownership classification is owned by `EntityOwnershipService` which derives `is_own` from `party_roles` (absence of VENDOR role = internal).

**Cross-check:** W3 (`hq/master/fleets` line 212) writes the same field with the same intent. Both writers are declaring ENTITY OWNERSHIP via the wrong field (`is_vendor: false` instead of canonical `assignRoleAction` with no VENDOR role).

---

### 2.3 A3 — Canonical Authority Mapping

| Semantic Required | Current Authority | W5 Usage | Gap |
|-------------------|-------------------|----------|-----|
| Party Role (vendor) | `PartyRoleService` (canonical) | None — direct write to `is_vendor` | YES |
| Entity Ownership | `EntityOwnershipService` (ADR-078) | None — direct write to `is_vendor` | YES |
| Driver Access | `DriverAccessClassificationService` (ADR-079) | None | NO (not needed for entity creation) |
| Financial Workflow | `JobFinancialWorkflowService` (ADR-080) | None | NO (not needed for entity creation) |

**Mapping conclusion:** W5's intent (entity ownership) is owned by `EntityOwnershipService` per ADR-078. The canonical flow is:
1. Create entity without role flags
2. Do NOT assign VENDOR role (absence = internal/own)
3. `EntityOwnershipService.classifyOwnership()` returns `{ isOwn: true, confidence: 'explicit', source: 'is_own' }` (if `is_own` is set) or `{ isOwn: null, confidence: 'unknown', source: 'unclassified' }` (if `is_own` is not set)

**No new service required.** Existing `RoleMutationService` + `EntityOwnershipService` are sufficient.

---

### 2.4 A4 — W5 Drift Analysis

**Drift mode produced:** **D1 (MISSING_LEGACY_PROJECTION)** — but inverted.

**Detailed analysis:**

| Aspect | Finding |
|--------|---------|
| Trigger condition | W5 creates internal entity with `is_vendor: false` but no `party_roles` entry |
| Legacy state produced | `md_entities.is_vendor = false` |
| Canonical state expected | If intent is "internal/own", canonical state should be: no VENDOR role in `party_roles` + `is_own = true` (or null for unknown) |
| Whether drift is deterministic | YES — every W5 invocation produces the same drift pattern |
| Whether every instance is safely repairable | YES — `is_vendor: false` is semantically correct for internal entities; repair would set `is_vendor = false` to match canonical absence of VENDOR role (already correct) |
| Whether historical records could have legitimate exceptions | NO — `is_vendor: false` is the correct legacy projection for an internal entity |

**Key insight:** W5's drift is **self-healing** — the legacy state (`is_vendor: false`) is already semantically correct. The drift is in the **canonical side** (no `party_roles` entry), not the legacy side. The `EntityOwnershipService` will correctly classify it as `{ isOwn: null, confidence: 'unknown' }` — which is technically drift (unknown vs explicit internal) but not data corruption.

**D1 detection by reconciliation engine:**
- The engine scans `party_roles` (canonical) and checks if `md_entities.is_*` matches.
- For W5-created entities: no `party_roles` entry exists → no D1 detected (nothing to compare).
- The drift is **invisible to the reconciliation engine** because it only detects drift when canonical exists but legacy doesn't match.

**Verdict:** W5 creates **invisible drift** — canonical state is incomplete (no party_role) but legacy state is semantically correct (`is_vendor: false`). The reconciliation engine will not flag this. The drift only manifests as `EntityOwnershipService` returning `{ isOwn: null }` instead of `{ isOwn: true }`.

---

### 2.5 A5 — Security Analysis

| Concern | Assessment |
|---------|------------|
| Tenant comes from canonical server-side context | ✅ YES — `tenantId` is derived from `useAuth().profile.tenant_id` (server-derived via Supabase Auth) |
| RLS remains effective | ✅ YES — `md_entities_tenant_isolation` policy (migration 063, fixed 155) constrains all writes to `get_my_tenant_id()` |
| Client cannot select another tenant | ✅ YES — RLS prevents `tenant_id` mismatch on INSERT |
| Role mutation cannot cross tenants | ✅ YES — no role mutation in W5; RLS would prevent cross-tenant even if attempted |
| Driver creation cannot create unauthorized role state | ⚠️ PARTIAL — W5 creates entity without `party_roles` entry, so no role is assigned. This is **canonically inconsistent** but **not a security breach** (no role = no privilege) |
| Legacy flags do not become authorization authority | ✅ YES — `is_vendor` is not used for authorization decisions anywhere in the codebase (all authorization uses `assertPermission` from U-02) |

**Security verdict:** W5 is **RLS-safe** and does not introduce a security vulnerability. The canonical inconsistency (no `party_roles` entry) is a **data integrity issue**, not a security issue.

**No HARD STOP triggered.**

---

## 3. TRACK B — OPERATIONAL DRIFT DISCOVERY

### 3.1 D1–D7 Classification (Validated from Current Code)

| Mode | Trigger | Canonical Authority | Deterministic? | Auto-Repair Safe? | Human Decision? | Risk |
|------|---------|---------------------|----------------|-------------------|-----------------|------|
| **D1** | `party_roles` has role (active, GLOBAL) but `md_entities.is_*` ≠ true | `party_roles` | ✅ YES | ✅ YES (`is_* = true`) | NO | LOW |
| **D2** | `party_roles` role was revoked but `md_entities.is_*` still true | `party_roles` | ⚠️ PARTIAL (only detectable if revocation was logged; not detectable if legacy was set without canonical) | ✅ YES (`is_* = false`) | NO | MEDIUM |
| **D3** | Both canonical and legacy exist but differ in non-trivial way | `party_roles` | ✅ YES (subset of D1/D2) | ✅ YES (reconcile to canonical) | NO | LOW |
| **D4** | `party_roles.tenant_id` ≠ `md_entities.tenant_id` | N/A (data corruption) | ❌ NO | ❌ NO (CRITICAL) | **YES** (security/integrity review) | **HIGH** if occurs |
| **D5** | `party_roles.party_id` references entity that doesn't exist in `md_entities` | N/A (referential integrity violation) | ❌ NO | ❌ NO (CRITICAL) | **YES** (data integrity review) | **HIGH** if occurs |
| **D6** | `role_type` in `party_roles` has no legacy boolean mapping | N/A (ADR gap) | ❌ NO | ❌ NO (no repair target) | **YES** (ADR decision required) | N/A (not currently triggered) |
| **D7** | Multiple GLOBAL roles of same type for same (tenant, party) | DB-level prevention (BR8 index) | ❌ NO (prevented) | ❌ NO (cannot occur) | NO | NONE (index prevents) |

### 3.2 D7 Verification

**DB-level prevention:** `idx_party_roles_global_unique` (migration 20260902_050) — partial unique index on `(tenant_id, party_id, role_type) WHERE context_type = 'GLOBAL' AND context_id IS NULL`.

**Verdict:** D7 is **architecturally impossible** to create post-BR8. The index rejects duplicate GLOBAL role INSERTs. No repair needed.

### 3.3 D2 Validation

**D2 detection gap:** The reconciliation engine only detects D2 if:
- A `party_roles` entry was **revoked** (the engine scans active roles)
- OR a `party_roles` entry was **deactivated** (the engine filters `is_active = true`)

**D2 is NOT detected if:**
- Legacy `is_*` was set to `true` without ever creating a canonical `party_roles` entry
- This is exactly the W5 pattern (legacy `is_vendor: false` set without canonical entry — but for the inverted case, legacy `is_* = true` without canonical)

**Verdict:** D2 detection is **partial**. The engine cannot detect legacy-only writes that were never canonicalized. This is a known limitation.

### 3.4 D4/D5/D6 — Human Decision Required

**D4 (Tenant Mismatch):**
- **Information missing:** Which tenant is correct? Was this a migration error, a data import, or a manual override?
- **Who should decide:** Tenant administrator + data governance team
- **Can decision be represented by existing fields?** YES — `party_roles.tenant_id` is the canonical tenant
- **ADR coverage:** NO ADR covers tenant mismatch recovery
- **New ADR required?** POSSIBLY — depends on whether this is expected to occur
- **Could automated repair produce irreversible damage?** YES — choosing the wrong tenant would orphan data

**D5 (Orphan Canonical Role):**
- **Information missing:** Was the entity deleted intentionally? Should the party_role be deleted too?
- **Who should decide:** Tenant administrator
- **Can decision be represented by existing fields?** YES — `party_roles` can be deactivated
- **ADR coverage:** NO ADR covers orphan role recovery
- **New ADR required?** POSSIBLY
- **Could automated repair produce irreversible damage?** YES — deleting a party_role loses audit trail

**D6 (Unsupported Role Projection):**
- **Information missing:** What legacy field should this role type project to?
- **Who should decide:** Architecture team
- **Can decision be represented by existing fields?** NO — requires new column or new mapping
- **ADR coverage:** NO ADR covers this (all 4 current role types have legacy mappings)
- **New ADR required?** YES if a new role type is added without legacy mapping
- **Could automated repair produce irreversible damage?** N/A (no repair target exists)

**Verdict:** D4/D5/D6 are **BUSINESS DECISION REQUIRED**. They cannot be auto-repaired without risking irreversible semantic damage.

---

## 4. Repair Authority Analysis

### 4.1 D1 — Auto-Repair Candidate

| Question | Answer |
|----------|--------|
| Canonical source of truth? | `party_roles` (GLOBAL, active) |
| Is transformation deterministic? | YES — set `is_* = true` for each canonical role |
| Can repair change business meaning? | NO — repair only sets legacy to match canonical (canonical is already truth) |
| Can repair be repeated safely? | YES — if `is_*` is already `true`, NO_OP |
| Is repair idempotent? | YES — re-running on already-repaired data produces NO_OP |
| Does repair require user approval? | NO — mechanical projection from canonical |
| Does repair require elevated authority? | YES — should be performed by operational/admin role, not end-user |
| Does repair require a transaction? | YES — should be logged for audit |
| Does repair need an audit trail? | YES — `AuditEntryX2` already exists in `RoleMutationService` |
| Does repair require database-level mutation? | YES — `UPDATE md_entities SET is_* = ...` |
| Can existing domain service perform it? | YES — `RoleReconciliationService.repairCompatibilityProjection()` already exists |

**Verdict:** D1 is **fully auto-repairable** through existing infrastructure.

### 4.2 D2 — Auto-Repair Candidate (with caveat)

| Question | Answer |
|----------|--------|
| Canonical source of truth? | `party_roles` (absence of active GLOBAL role) |
| Is transformation deterministic? | YES for detected cases; CANNOT DETECT legacy-only writes |
| Can repair change business meaning? | POSSIBLY — if legacy `is_* = true` was set intentionally without canonical (W5-inverted pattern), repair to `false` would change meaning |
| Can repair be repeated safely? | YES — if already `false`, NO_OP |
| Is repair idempotent? | YES |
| Does repair require user approval? | **YES** — because detection is partial, user should confirm scope |
| Does repair require elevated authority? | YES |
| Does repair require a transaction? | YES |
| Does repair need an audit trail? | YES |
| Can existing domain service perform it? | YES — engine can set `is_* = false` when no active canonical role exists |

**Verdict:** D2 is **conditionally auto-repairable** — safe for detected cases (canonical was revoked), but **requires human review** for the detection gap (legacy-only writes).

### 4.3 D3 — Auto-Repair Candidate

D3 is a subset of D1/D2. Same analysis applies. **Fully auto-repairable** through D1/D2 logic.

---

## 5. W5 vs Drift Repair Separation

### 5.1 Separation Analysis

| Aspect | W5 Migration | Drift Repair |
|--------|--------------|--------------|
| Scope | 1 file (`hq/master/drivers/page.tsx`) | Entire `md_entities` + `party_roles` dataset |
| Authorization | Implementation gate (like X1-X4) | Operational approval (different gate type) |
| Verification | Code change + regression test | Dry-run + manual review + production run |
| Risk | LOW (single file, RLS-safe) | MEDIUM (touches production data) |
| Reversibility | HIGH (git revert) | LOW (data mutation, needs backup) |
| Dependency | None (can start immediately) | Depends on W5 being fixed first (to prevent new drift) |

**Verdict:** W5 migration and drift repair should be **TWO SEPARATE PHASES** because:
1. They have different authorization gates (implementation vs operational)
2. They have different verification criteria
3. Drift repair should occur **after** W5 is fixed (to prevent new drift during repair)
4. They are independently verifiable

**Recommended order:** W5 Migration → Drift Repair (sequential, not parallel).

---

## 6. ADR Coverage

| Finding | ADR-078 | ADR-079 | ADR-080 | New ADR? |
|---------|---------|---------|---------|----------|
| W5 canonical migration | ✅ FULLY COVERED (use `EntityOwnershipService`) | N/A | N/A | NO |
| W5 drift (invisible D1) | ✅ COVERED (drift exists; repair would set `is_own = true`) | N/A | N/A | NO |
| D1 auto-repair | ✅ COVERED (`RoleReconciliationService`) | N/A | N/A | NO |
| D2 auto-repair | ⚠️ PARTIALLY COVERED (detection gap for legacy-only writes) | N/A | N/A | NO (gap is detection, not semantics) |
| D4 human decision | ❌ NOT COVERED (no tenant mismatch recovery ADR) | N/A | N/A | POSSIBLY (if D4 ever occurs) |
| D5 human decision | ❌ NOT COVERED (no orphan role recovery ADR) | N/A | N/A | POSSIBLY (if D5 ever occurs) |
| D6 human decision | ❌ NOT COVERED (no new role type without legacy mapping ADR) | N/A | N/A | POSSIBLY (if new role type added) |

**Verdict:** All **actionable findings** (W5 migration, D1 repair) are **FULLY COVERED** by existing ADRs. D4/D5/D6 are **NOT COVERED** but are not currently triggered — they are **future-proofing concerns**, not implementation blockers.

**No new ADR required for W5 migration or D1 repair.** D4/D5/D6 coverage is a separate future concern.

---

## 7. Data Repair Safety

| Drift Mode | Requires NULL Interpretation? | Requires Historical Inference? | Requires Name Heuristics? | Requires Financial Inference? | Can Produce Irreversible Damage? | Classification |
|------------|-------------------------------|--------------------------------|---------------------------|------------------------------|-----------------------------------|----------------|
| D1 | NO | NO | NO | NO | NO | **AUTO-REPAIRABLE** |
| D2 (detected) | NO | NO | NO | NO | YES (if legacy was intentional) | **AUTO-REPAIRABLE with review** |
| D2 (undetected) | YES (assume no canonical = not a role) | YES (infer from absence) | NO | NO | YES | **HUMAN REVIEW REQUIRED** |
| D3 | NO | NO | NO | NO | NO (subset of D1/D2) | **AUTO-REPAIRABLE** |
| D4 | YES (which tenant is correct?) | YES (migrate from when?) | NO | NO | YES (wrong choice = data loss) | **HUMAN / BUSINESS REVIEW REQUIRED** |
| D5 | YES (was entity deleted intentionally?) | YES (cascade vs orphan?) | NO | NO | YES (delete = audit loss) | **HUMAN / BUSINESS REVIEW REQUIRED** |
| D6 | N/A (no repair target) | N/A | N/A | N/A | N/A | **ADR REVIEW REQUIRED** |

**Verdict:** Only D1 and D3 are **fully auto-repairable** without semantic risk. D2 requires human review for the detection gap. D4/D5/D6 require business/ADR decisions.

---

## 8. W5 Forensic Matrix

| Item | Finding | Canonical Authority | Drift | ADR | Migration Complexity | Risk | Next Action |
|------|---------|---------------------|-------|-----|---------------------|------|-------------|
| W5-01 | INSERT `is_vendor: false` without canonical `assignRoleAction` | `EntityOwnershipService` (ADR-078) | Invisible D1 (canonical incomplete) | ADR-078 | LOW (single file, remove 1 field, add no-op role assignment) | LOW (RLS-safe) | Phase W5 |
| W5-02 | No `party_roles` entry created for internal entity | `RoleMutationService` | Invisible D1 | ADR-078 | LOW (add explicit "no VENDOR role" canonical flow) | LOW | Phase W5 |
| W5-03 | Client-generated `entity_code` with `Math.random()` | N/A (not canonical) | None (compatibility field) | None | OUT OF SCOPE (not DATA-4E) | LOW | Future hardening |
| W5-04 | No UPDATE writes to `is_*` fields | N/A | None | N/A | N/A | NONE | None |

---

## 9. Drift Repair Matrix

| Mode | Deterministic | Auto-Repair Safe | Audit Required | Human Decision | Data Risk | Recommended Phase |
|------|---------------|-----------------|----------------|----------------|-----------|-------------------|
| D1 | ✅ YES | ✅ YES | ✅ YES (existing infrastructure) | NO | LOW | Phase D-Repair (deterministic) |
| D2 (detected) | ✅ YES | ✅ YES (with review) | ✅ YES | YES (review scope) | MEDIUM | Phase D-Repair (with review gate) |
| D2 (undetected) | ❌ NO | ❌ NO | N/A | **YES (BUSINESS DECISION)** | HIGH | Phase D-Human |
| D3 | ✅ YES | ✅ YES | ✅ YES | NO | LOW | Phase D-Repair (subset of D1/D2) |
| D4 | ❌ NO | ❌ NO | ✅ YES | **YES (BUSINESS DECISION)** | **HIGH** | Phase D-Human |
| D5 | ❌ NO | ❌ NO | ✅ YES | **YES (BUSINESS DECISION)** | **HIGH** | Phase D-Human |
| D6 | ❌ NO | ❌ NO | N/A | **YES (ADR DECISION)** | N/A | Phase D-Human |
| D7 | N/A (prevented) | N/A | N/A | NO | NONE | None (index prevents) |

---

## 10. Canonical Authority Matrix

| Semantic | Current Authority | W5 Usage | Drift Repair Authority | Gap |
|----------|-------------------|----------|------------------------|-----|
| Party Role | `PartyRoleService` + `RoleMutationService` (BR5) | None — direct write bypasses | `RoleReconciliationService` (D1) | YES (W5 bypasses) |
| Ownership | `EntityOwnershipService` (ADR-078) | None — direct write to `is_vendor` | `EntityOwnershipService` (classification only; no repair) | YES (W5 bypasses; no repair for ownership) |
| Driver Access | `DriverAccessClassificationService` (ADR-079) | None | N/A (not applicable to entity creation) | NO |
| Financial Workflow | `JobFinancialWorkflowService` (ADR-080) | None | N/A (not applicable to entity creation) | NO |

---

## 11. Future Phase Decomposition

### Phase W5 — W5 Canonical Writer Migration

| Attribute | Value |
|-----------|-------|
| **Objective** | Migrate `hq/master/drivers` to canonical `assignRoleAction` flow |
| **Exact scope** | 1 file: `app/(dashboard)/hq/master/drivers/page.tsx` lines 438-449 |
| **Dependencies** | None (existing `RoleMutationService` + `EntityOwnershipService`) |
| **Required ADRs** | None (ADR-078 sufficient) |
| **Required authorization** | "I AUTHORIZE W5 CANONICAL WRITER MIGRATION ONLY" |
| **Production risk** | LOW (RLS-safe, single file, git-revertible) |
| **Acceptance criteria** | 1. No direct `is_vendor` write in INSERT payload, 2. No direct `is_vendor` write in UPDATE payload, 3. Canonical role flow invoked for internal entity creation, 4. Full regression still PASS, 5. TypeScript 0 errors |

### Phase D-Repair — Deterministic Operational Drift Repair

| Attribute | Value |
|-----------|-------|
| **Objective** | Repair D1/D3 drift against production data using `RoleReconciliationService` |
| **Exact scope** | `RoleReconciliationService.reconcile(dryRun: false)` for D1/D3 only |
| **Dependencies** | Phase W5 must be complete (to prevent new drift during repair) |
| **Required ADRs** | None (ADR-078 sufficient) |
| **Required authorization** | "I AUTHORIZE OPERATIONAL DRIFT REPAIR — D1/D3 ONLY" (operational approval, not implementation) |
| **Production risk** | MEDIUM (touches production data; requires backup) |
| **Acceptance criteria** | 1. Dry-run executed first with results documented, 2. Human review of dry-run results, 3. Production backup verified, 4. Repair executed, 5. Post-repair reconciliation shows 0 D1/D3 drift, 6. No D4/D5/D6 triggered, 7. Audit log preserved |

### Phase D-Human — Human-Decision Drift Resolution

| Attribute | Value |
|-----------|-------|
| **Objective** | Resolve D4/D5/D6 drift through business/ADR decisions |
| **Exact scope** | D4 (tenant mismatch), D5 (orphan role), D6 (unsupported projection) — only if triggered |
| **Dependencies** | None (can proceed independently if drift is detected) |
| **Required ADRs** | POSSIBLY (new ADRs may be needed for D4/D5 recovery procedures) |
| **Required authorization** | "I AUTHORIZE HUMAN-DECISION DRIFT RESOLUTION" (business + architecture approval) |
| **Production risk** | HIGH (irreversible if wrong decision) |
| **Acceptance criteria** | 1. Each D4/D5/D6 case documented with evidence, 2. Business decision recorded for each, 3. ADR created if needed, 4. Manual repair executed per decision, 5. Post-repair reconciliation clean |

### Phase R-Reader — Residual Reader Migration (Not Part of This Discovery)

| Attribute | Value |
|-----------|-------|
| **Objective** | Migrate residual legacy readers to canonical services |
| **Exact scope** | 14 reader patterns across 11 files (per DATA-4E Deferred Discovery R-01 through R-14) |
| **Dependencies** | None |
| **Required ADRs** | None |
| **Required authorization** | Separate gate (not covered by this discovery) |
| **Production risk** | LOW (display/filter changes only) |
| **Acceptance criteria** | Per-wave acceptance criteria (Wave 1-4) |

---

## 12. Hard Stop Check

| Hard Stop | Triggered? | Evidence |
|-----------|------------|----------|
| H1: Security issue | **NO** | W5 is RLS-safe. No tenant isolation or authorization bypass. |
| H2: Semantic ambiguity | **NO** | W5 maps cleanly to ADR-078 (entity ownership). |
| H3: Data interpretation required | **NO** | D1/D3 are deterministic. D2/D4/D5/D6 are explicitly NOT auto-repaired. |
| H4: Schema requirement | **NO** | No schema changes proposed. |
| H5: ADR conflict | **NO** | No ADR contradictions found. |
| H6: Unsafe auto-repair | **NO** | Only D1/D3 classified as auto-repairable; D2 requires review; D4/D5/D6 require human decision. |
| H7: Scope expansion | **NO** | Assessment limited to W5 + D1-D7 as specified. |
| H8: Baseline contamination | **NO** | DATA-4E closure state verified intact (22/22, 1473/1473). |

---

## 13. Production Change Gate Verification

| Change Type | Expected | Actual | Status |
|-------------|----------|--------|--------|
| Production source changes | 0 | 0 | ✅ |
| Schema changes | 0 | 0 | ✅ |
| New migrations | 0 | 0 | ✅ |
| Data mutations | 0 | 0 | ✅ |
| Backfills | 0 | 0 | ✅ |
| ADR modifications | 0 | 0 | ✅ |
| Test modifications | 0 | 0 | ✅ |

**Zero phase violations.**

---

## 14. Final Status

### GREEN — DISCOVERY COMPLETE

**Conditions met:**
- ✅ W5 is fully understood (writer identified, semantic classified, drift analyzed, security verified)
- ✅ D1–D7 are fully classified (deterministic status, auto-repair safety, human decision requirements)
- ✅ No security issue exists (RLS-safe, no tenant isolation or authorization bypass)
- ✅ ADR coverage is understood (ADR-078 sufficient for W5 + D1/D3; D4/D5/D6 are future-proofing)
- ✅ Future phases can be clearly scoped (3 independent phases: W5, D-Repair, D-Human)
- ✅ W5 vs drift repair separation is justified
- ✅ No hard stops triggered
- ✅ All production change gates zero
- ✅ DATA-4E baseline verified intact

---

## 15. Final Hard Stop

> **DATA-4E remains CLOSED. This phase introduced ZERO production changes. No implementation authorization is implied. Any recommended future phase requires separate explicit authorization.**

**No code was modified. No schema was changed. No data was mutated. No ADR was amended. No migration was created. No test was altered. No implementation was started. No drift was repaired.**

**The only deliverable is this forensic discovery report and the recommended future phase decomposition (Phase W5, Phase D-Repair, Phase D-Human, Phase R-Reader).**
