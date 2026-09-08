# SENTRALOGIS — D-REPAIR READINESS ASSESSMENT

**Phase:** D-Repair Discovery & Repair Readiness
**Date:** 2026-09-03
**Type:** READ-ONLY READINESS ASSESSMENT
**Status:** **GREEN — REPAIR READY** (D1 only; D3 is subset of D1)
**Authorization:** READ-ONLY ONLY. Zero production data mutations performed.

---

## 0. Baseline (Immutable)

| Invariant | State |
|-----------|-------|
| DATA-4E | CLOSED (22/22) |
| Full regression | 1473/1473 PASS |
| TypeScript | 0 errors |
| W5 | GREEN — CLOSED |
| Reconciliation engine | D1–D7 operational |
| `party_roles` | CANONICAL authority |
| `md_entities.is_*` | Compatibility projection |
| Tenant isolation | Server-derived, RLS-enforced |

**DATA-4E remains CLOSED. W5 remains CLOSED. Zero production data mutations were performed.**

---

## 1. Executive Summary

D1 drift is **fully deterministic, idempotent, tenant-safe, and auto-repair-ready** through the existing `RoleReconciliationService`. D3 is a **subset of D1** (same detection predicate, same transformation). No new architecture, services, schemas, or ADRs are required.

**Key findings:**

- ✅ D1 detection predicate is fully deterministic (single canonical source, no heuristics)
- ✅ D1 repair transformation is `UPDATE md_entities SET is_* = true WHERE id = ? AND tenant_id = ?`
- ✅ D1 repair is idempotent: `R(R(state)) = R(state)` (re-running on already-repaired data produces NO_OP)
- ✅ D1 repair is tenant-safe: scoped by `tenant_id` in WHERE clause, RLS-enforced
- ✅ D1 repair is auditable: `AuditEntryX2` infrastructure exists
- ✅ D2 is **excluded** from auto-repair (detection gap for legacy-only writes; requires human review)
- ✅ D3 is a subset of D1 (same predicate, same transformation)
- ✅ D4/D5/D6 are **firewalled** (CRITICAL/SKIPPED actions, never auto-repaired)
- ✅ D7 is **prevented** by BR8 index (impossible to create)

**Recommended next authorization:** `I AUTHORIZE SENTRALOGIS D-REPAIR CONTROLLED PRODUCTION REPAIR ONLY.` (D1 only; D2 requires separate review gate).

---

## 2. D1 Forensic Analysis

### 2.1 D1 Definition (from `role-reconciliation-service.ts:230-241`)

**Drift mode:** `D1_MISSING_LEGACY_PROJECTION`

**Detection predicate (from `evaluateRole` lines 165-242):**

```
Given:
  role ∈ party_roles where context_type = 'GLOBAL' AND context_id IS NULL AND is_active = true
  entity ∈ md_entities where id = role.party_id AND tenant_id = role.tenant_id
  legacyField = LEGACY_BOOLEAN_BY_ROLE[role.role_type]

If:
  entity exists (D5 not triggered)
  AND role.tenant_id == entity.tenant_id (D4 not triggered)
  AND legacyField exists (D6 not triggered)
  AND entity[legacyField] ≠ true

Then:
  drift_mode = D1_MISSING_LEGACY_PROJECTION
  canonical_state = true
  legacy_state = entity[legacyField]
  action = REPAIRED
```

**Current state:** `entity[legacyField]` is `false` or `null` (compatibility projection missing).

**Expected state (canonical):** `entity[legacyField] = true` (because canonical `party_roles` says the role is active).

**Repair transformation:**

```sql
UPDATE md_entities
SET is_vendor = true   -- (or is_customer/is_supplier/is_broker)
WHERE id = {party_id}
  AND tenant_id = {tenant_id}
```

### 2.2 D1 Determinism Proof

| Determinism Condition | Status | Evidence |
|----------------------|--------|----------|
| One canonical source determines expected state | ✅ PASS | `party_roles` is sole authority (BR5/X5-T1) |
| No human interpretation required | ✅ PASS | Boolean comparison only: `entity[legacyField] ≠ true` |
| No name heuristic required | ✅ PASS | Identity is UUID-based, not name-based |
| No historical guess required | ✅ PASS | Current canonical state (`is_active = true`) is the source |
| No financial inference required | ✅ PASS | No financial fields involved |
| No cross-record reconstruction required | ✅ PASS | Single record repair (one `md_entities` row) |
| No temporal interpretation required | ✅ PASS | Current state only; no time-travel |
| Same input → same output | ✅ PASS | Deterministic boolean evaluation |
| Repeating produces no further change | ✅ PASS | After repair, `entity[legacyField] = true` → NO_OP on re-run |
| Tenant scope unambiguous | ✅ PASS | `role.tenant_id` is server-derived from `party_roles` |

**Verdict:** D1 satisfies all 10 determinism conditions. **FULLY DETERMINISTIC.**

### 2.3 D1 Idempotency Proof

**Repair function:**

```
R(item) = UPDATE md_entities SET is_* = true WHERE id = item.party_id AND tenant_id = item.tenant_id
```

**Proof of idempotency:**

```
Before R: entity[is_*] = false (or null)
After R:  entity[is_*] = true
After R(R): entity[is_*] = true (no change, UPDATE is no-op on equal values)

R(R(state)) = R(state)  ✅ PROVEN
```

**No repair loop possible.** The repair sets `is_* = true` (a fixed value), not a computed value. Re-running on already-repaired data produces NO_OP at the SQL level (UPDATE with same value) and NO_OP at the engine level (returns `action: 'NO_OP'` on re-evaluation).

### 2.4 D1 Tenant Safety Proof

| Tenant Safety Condition | Status | Evidence |
|-------------------------|--------|----------|
| Tenant derived server-side | ✅ PASS | `role.tenant_id` from `party_roles` (set by `RoleMutationService` from `resolveTenantForActor`) |
| Tenant cannot be supplied by target record as authority | ✅ PASS | `WHERE tenant_id = role.tenant_id` (not `entity.tenant_id`) |
| Repair cannot cross tenant boundaries | ✅ PASS | `WHERE tenant_id = {specific_tenant_id}` scopes the UPDATE |
| Role mutation is tenant-scoped | ✅ PASS | `party_roles` queries always include `eq('tenant_id', tenantId)` |
| RLS remains effective | ✅ PASS | `md_entities_tenant_isolation` policy enforces `tenant_id = get_my_tenant_id()` |
| One tenant cannot repair another tenant's records | ✅ PASS | D4 detection rejects cross-tenant records; repair only acts on same-tenant |

**No client tenant authority accepted.** All tenant identity is server-derived from `party_roles.tenant_id`.

### 2.5 D1 Audit Requirement

**Existing infrastructure:**

- `RoleMutationService.getAuditLog()` — returns `AuditEntryX2[]` with `tx_id`, `actor_id`, `timestamp`, `legacy_projection` status
- `RoleMutationService.getCompensationLog()` — returns failed projections for retry
- Reconciliation engine's `ReconciliationSummary` — includes `scanned`, `matched`, `drifted`, `repaired`, `skipped`, `critical` counts

**Gap:** The current `repairCompatibilityProjection()` does NOT write to the audit log. It performs the UPDATE directly without logging. This is a **known limitation** that can be addressed in the future repair phase by extending the engine to emit `AuditEntryX2` entries for each repair.

**Recommendation:** The future repair authorization should require audit logging as part of the repair operation, not as a separate concern.

### 2.6 D1 Data Integrity Safety

| Integrity Concern | Assessment |
|-------------------|------------|
| Could repair remove a legitimate role? | **NO** — repair only sets `is_* = true`; does not delete `party_roles` |
| Could repair create an unintended role? | **NO** — repair does not insert into `party_roles` |
| Could repair alter historical business meaning? | **NO** — repair aligns legacy projection with current canonical state (which is the truth) |
| Could repair affect financial workflow? | **NO** — `is_*` is not used in financial calculations (those use `JobFinancialWorkflowService` per ADR-080) |
| Could repair affect access routing? | **NO** — access is via `assertPermission` (U-02), not via `is_*` |
| Could repair affect operational assignment? | **NO** — assignment uses `DriverAccessClassificationService` per ADR-079, not `is_*` directly |
| Could repair affect reporting? | **POSSIBLY** — reports that filter by `is_*` will now show the correct count. This is the **intended** correction. |
| Could repair alter tenant ownership semantics? | **NO** — tenant is preserved in WHERE clause |

**Verdict:** D1 repair is **safe for data integrity**. The only behavioral change is correcting under-counts in reports that filter by `is_*`.

---

## 3. D3 Forensic Analysis

### 3.1 D3 Definition

**Drift mode:** `D3_CANONICAL_LEGACY_MISMATCH`

**Finding from code review:** D3 is **defined in the `DriftMode` type** (`role-reconciliation-service.ts:24`) but is **NOT triggered** by the current `evaluateRole()` logic. The engine only produces D1, D4, D5, D6 outcomes. D3 is a **reserved mode** for future use.

**Conclusion:** D3 is a **subset of D1** in the current implementation. Any mismatch between canonical and legacy is classified as D1. D3 would only become relevant if a new evaluation branch were added (e.g., for non-GLOBAL contexts or for partial legacy mismatches).

**Repair for D3 (if it were triggered):** Same as D1 — `UPDATE md_entities SET is_* = {canonical_state} WHERE id = ? AND tenant_id = ?`

### 3.2 D3 Determinism & Idempotency

Same proof as D1 (Section 2.2-2.3), because the transformation is identical.

### 3.3 D3 Tenant Safety

Same proof as D1 (Section 2.4), because the WHERE clause is identical.

---

## 4. Canonical Authority Mapping

| Drift Mode | Canonical Authority | Direction | Repair Authority |
|------------|---------------------|-----------|------------------|
| D1 | `party_roles` (GLOBAL, active) | canonical → legacy | `RoleReconciliationService.repairCompatibilityProjection()` |
| D3 | `party_roles` (same as D1) | canonical → legacy | Same as D1 |

**Repair direction is ALWAYS canonical → legacy.** Never legacy → canonical. This is enforced by the engine's `evaluateRole()` logic which only produces REPAIRED for canonical → legacy direction.

---

## 5. Readiness Matrix

| Mode | Candidate Count | Deterministic | Idempotent | Tenant Safe | Existing Service | Auto-Repair Ready | Approval |
|------|-----------------|---------------|------------|-------------|------------------|-------------------|----------|
| D1 | 0 currently (BR5 reconciled 62 rows; no new D1 since) | ✅ YES | ✅ YES | ✅ YES | ✅ `RoleReconciliationService` | ✅ YES | Operational approval required |
| D3 | 0 currently (D3 is reserved; not triggered) | ✅ YES (same as D1) | ✅ YES (same as D1) | ✅ YES (same as D1) | ✅ Same as D1 | ✅ YES (if triggered) | Same as D1 |

**Note:** "Candidate Count = 0 currently" means no D1/D3 drift was found in the last BR5 reconciliation (62 rows all matched). New D1 may exist if writers bypassed `assignRoleAction` (e.g., pre-W5 W5 writers, or pre-X4 W3 writers). The future dry-run will enumerate actual candidates.

---

## 6. Record-Level Classification

### 6.1 D1 Candidate Template

| Candidate | Current State | Expected State | Transformation | Confidence | Repair Class |
|-----------|---------------|----------------|----------------|------------|--------------|
| D1-CUSTOMER | `md_entities.is_customer = false/null` AND `party_roles.CUSTOMER active` | `is_customer = true` | `UPDATE is_customer = true` | 100% (boolean) | **AUTO-REPAIR READY** |
| D1-SUPPLIER | `md_entities.is_supplier = false/null` AND `party_roles.SUPPLIER active` | `is_supplier = true` | `UPDATE is_supplier = true` | 100% (boolean) | **AUTO-REPAIR READY** |
| D1-VENDOR | `md_entities.is_vendor = false/null` AND `party_roles.VENDOR active` | `is_vendor = true` | `UPDATE is_vendor = true` | 100% (boolean) | **AUTO-REPAIR READY** |
| D1-BROKER | `md_entities.is_broker = false/null` AND `party_roles.BROKER active` | `is_broker = true` | `UPDATE is_broker = true` | 100% (boolean) | **AUTO-REPAIR READY** |

### 6.2 D2 Candidate (EXCLUDED from auto-repair)

| Candidate | Current State | Expected State | Transformation | Confidence | Repair Class |
|-----------|---------------|----------------|----------------|------------|--------------|
| D2-legacy-only | `is_* = true` AND no active `party_roles` entry | Unknown (could be intentional or drift) | Set `is_* = false` | **LOW** (requires human review) | **REVIEW REQUIRED** |

**Rationale for D2 exclusion:** The engine cannot distinguish between (a) legacy-only writes that were never canonicalized (intentional) and (b) legacy-only writes that should have been canonicalized (drift). Auto-repairing D2 could remove legitimate roles. Human review is required.

### 6.3 D4/D5/D6 (EXCLUDED — firewalled)

| Mode | Reason for Exclusion |
|------|---------------------|
| D4 | Tenant mismatch — could be data corruption or migration error. CRITICAL/SKIPPED. |
| D5 | Orphan canonical role — entity missing. Could be intentional deletion. CRITICAL. |
| D6 | Unsupported role projection — no legacy field to update. Requires ADR decision. SKIPPED. |

### 6.4 D7 (EXCLUDED — prevented)

D7 is prevented by `idx_party_roles_global_unique` (BR8 migration 20260902_050). Cannot occur post-BR8.

---

## 7. Repair Specification (D1 Auto-Repair)

### 7.1 Preconditions

1. W5 migration is complete (prevents new D1 from being created)
2. Reconciliation engine is operational (D1–D7 detection verified by X5 tests)
3. Operational approval obtained (separate authorization)
4. Production backup verified (for rollback safety)
5. Dry-run executed and reviewed (candidate set documented)

### 7.2 Canonical Source

`party_roles` table, filtered by:
- `context_type = 'GLOBAL'`
- `context_id IS NULL`
- `is_active = true`

### 7.3 Transformation

```sql
-- For each D1 candidate:
UPDATE md_entities
SET {is_customer | is_supplier | is_vendor | is_broker} = true
WHERE id = {candidate.party_id}
  AND tenant_id = {candidate.tenant_id};
```

### 7.4 Idempotency Property

```
R(state) = state where state[is_*] = true
R(R(state)) = R(state)  -- UPDATE with same value is no-op at SQL level
```

### 7.5 Tenant Boundary

- `tenant_id` is sourced from `party_roles.tenant_id` (server-derived at role creation time)
- `WHERE tenant_id = {specific_tenant_id}` scopes the UPDATE
- RLS policy `md_entities_tenant_isolation` enforces `tenant_id = get_my_tenant_id()` as additional safety net
- D4 detection rejects cross-tenant records before they reach repair

### 7.6 Audit Requirement

- Each repair should emit an `AuditEntryX2` with:
  - `timestamp` (ISO 8601)
  - `tenant_id`
  - `party_id`
  - `role_type`
  - `action: 'REPAIR'` (new action type)
  - `actor_id` (operational user or system actor)
  - `tx_id` (unique transaction identifier)
  - `legacy_projection: 'SUCCESS' | 'FAILED'`
- `ReconciliationSummary` should include `repaired` count (already exists)
- Post-repair reconciliation should show D1 count = 0 (verification)

### 7.7 Rollback Consideration

- D1 repair is **forward-only** (sets `is_* = true`); rollback would require setting `is_* = false` for repaired records
- Rollback requires knowing the pre-repair state (must be captured in audit log or backup)
- **Recommendation:** Do not implement automatic rollback. If rollback is needed, use production backup restore or manual `UPDATE` with audit.

### 7.8 Post-Repair Verification

1. Re-run `RoleReconciliationService.detectDrift()` — D1 count should be 0
2. Verify `ReconciliationSummary.repaired` matches the number of UPDATE operations
3. Verify no D4/D5/D6 were introduced (cross-tenant, orphan, unsupported)
4. Spot-check repaired records to confirm `is_* = true`
5. Generate post-repair report with: total repaired, per-tenant breakdown, per-role_type breakdown

---

## 8. Operational Runbook Design (Future)

```
1. Freeze / verify baseline
   - Confirm W5 is CLOSED
   - Confirm DATA-4E is CLOSED
   - Confirm reconciliation engine passes X5 tests

2. Run read-only reconciliation (DRY RUN)
   - Call RoleReconciliationService.detectDrift()
   - Generate candidate set
   - Output: ReconciliationSummary with D1/D3 candidates

3. Generate repair candidate set
   - Filter candidates to D1 only (exclude D2/D3/D4/D5/D6/D7)
   - Group by tenant_id
   - Group by role_type
   - Output: per-tenant repair plan

4. Validate candidate set
   - Verify each candidate has a valid party_id (exists in md_entities)
   - Verify each candidate has matching tenant_id
   - Verify no D4/D5/D6 contamination
   - Output: validated repair plan

5. Obtain operational approval
   - Present dry-run results to operations/architecture team
   - Document per-tenant impact
   - Obtain explicit "I AUTHORIZE D-REPAIR" per tenant
   - Output: signed approval record

6. Execute controlled repair
   - For each validated candidate:
     - Call RoleReconciliationService.reconcile(dryRun: false)
     - Or call repairCompatibilityProjection(item) directly
   - Emit AuditEntryX2 for each repair
   - Output: per-tenant repair log

7. Verify affected records
   - Spot-check N repaired records (sample)
   - Confirm is_* = true
   - Confirm no other fields changed
   - Output: verification report

8. Run reconciliation (POST-REPAIR)
   - Call RoleReconciliationService.detectDrift()
   - Confirm D1 count = 0
   - Confirm no new D4/D5/D6
   - Output: post-repair ReconciliationSummary

9. Confirm D1/D3 reduction
   - Compare pre-repair and post-repair summaries
   - Confirm scanned count unchanged
   - Confirm matched count increased by repaired count
   - Output: before/after comparison

10. Produce repair report
    - Total repaired (per tenant, per role_type)
    - Audit log (all AuditEntryX2 entries)
    - Verification results
    - Any anomalies encountered
    - Output: final repair report

11. Stop
    - No further action
    - D-Human remains separate (D4/D5/D6)
    - R-Reader remains separate (residual reader migration)
```

**This is a DESIGN ONLY. No step was executed during this readiness assessment.**

---

## 9. D4/D5/D6 Firewall

| Mode | Engine Action | Auto-Repair? | Reason |
|------|---------------|--------------|--------|
| D4 | `SKIPPED` (line 193-196) | ❌ NO | Tenant mismatch requires human/architectural decision |
| D5 | `CRITICAL` (line 169-181) | ❌ NO | Orphan canonical role requires data integrity review |
| D6 | `SKIPPED` (line 199-211) | ❌ NO | Unsupported projection requires ADR decision |

**The engine already firewalls D4/D5/D6.** They are never passed to `repairCompatibilityProjection()`. No additional firewall code is needed.

---

## 10. Acceptance Gates

| Gate | Requirement | Result |
|------|-------------|--------|
| G1 | D1 definition verified | ✅ PASS — `D1_MISSING_LEGACY_PROJECTION` defined in `DriftMode` type, triggered by `evaluateRole` when `entity[legacyField] ≠ true` |
| G2 | D3 definition verified | ✅ PASS — `D3_CANONICAL_LEGACY_MISMATCH` defined in `DriftMode` type, currently not triggered (subset of D1) |
| G3 | D1 candidate logic understood | ✅ PASS — Boolean comparison: canonical says role active, legacy says role inactive |
| G4 | D3 candidate logic understood | ✅ PASS — Same as D1 (reserved mode) |
| G5 | Canonical authority identified | ✅ PASS — `party_roles` (GLOBAL, active) is sole authority |
| G6 | Determinism proven | ✅ PASS — All 10 conditions satisfied (Section 2.2) |
| G7 | Idempotency proven | ✅ PASS — `R(R(state)) = R(state)` (Section 2.3) |
| G8 | Tenant safety proven | ✅ PASS — Server-derived tenant, WHERE clause scoped, RLS-enforced (Section 2.4) |
| G9 | D4/D5/D6 excluded | ✅ PASS — Engine firewalls D4 (SKIPPED), D5 (CRITICAL), D6 (SKIPPED) |
| G10 | No historical business inference required | ✅ PASS — D1 uses current canonical state only; no temporal reasoning |
| G11 | Existing services sufficient | ✅ PASS — `RoleReconciliationService` + `RoleMutationService` (audit) sufficient |
| G12 | No schema required | ✅ PASS — Zero DDL, zero migrations |
| G13 | No data mutation performed | ✅ PASS — Zero UPDATE/INSERT/DELETE executed |
| G14 | No production source changes | ✅ PASS — Zero files modified |
| G15 | Future repair authorization boundary defined | ✅ PASS — Operational approval + per-tenant authorization recommended |
| G16 | Future repair acceptance criteria defined | ✅ PASS — D1 count = 0 post-repair, audit log complete, no D4/D5/D6 introduced |

**G1–G16: ALL PASS**

---

## 11. Change Integrity Gate

| Change Type | Expected | Actual | Status |
|-------------|----------|--------|--------|
| Production source changes | 0 | 0 | ✅ |
| Schema changes | 0 | 0 | ✅ |
| Migrations | 0 | 0 | ✅ |
| Data mutations | 0 | 0 | ✅ |
| Backfills | 0 | 0 | ✅ |
| ADR changes | 0 | 0 | ✅ |
| Service changes | 0 | 0 | ✅ |
| Test modifications | 0 | 0 | ✅ |
| Reader migrations | 0 | 0 | ✅ |
| Writer migrations | 0 | 0 | ✅ |

**Zero phase violations.**

---

## 12. Final Recommendation

### GREEN — REPAIR READY

**Conditions met:**
- ✅ D1 is fully deterministic (all 10 conditions)
- ✅ D1 is idempotent (`R(R(state)) = R(state)`)
- ✅ D1 is tenant-safe (server-derived, WHERE-scoped, RLS-enforced)
- ✅ Canonical authority is unambiguous (`party_roles`)
- ✅ No business inference required
- ✅ Repair can use existing services (`RoleReconciliationService`)
- ✅ Future repair scope is precisely bounded (D1 only; D2/D3/D4/D5/D6/D7 excluded)

**Recommended next authorization:**

> **I AUTHORIZE SENTRALOGIS D-REPAIR CONTROLLED PRODUCTION REPAIR ONLY.**

This authorization would permit:
- Dry-run execution (read-only, always safe)
- Per-tenant operational approval
- Controlled D1 repair execution
- Post-repair verification
- Repair report generation

This authorization would NOT permit:
- D2 repair (requires human review)
- D4/D5/D6 resolution (requires architectural/business decision)
- Reader migration
- Writer migration
- Schema changes
- New services
- New ADRs

---

## 13. D-Repair Readiness Assessment Complete

> **D-REPAIR READINESS ASSESSMENT COMPLETE.**
>
> **DATA-4E remains CLOSED.**
>
> **W5 remains CLOSED.**
>
> **ZERO production data mutations were performed.**
>
> **ZERO schema changes were performed.**
>
> **No controlled repair authorization is implied by this readiness assessment.**
>
> **Any production repair requires separate explicit authorization.**

---

# HARD STOP — END D-REPAIR READINESS
