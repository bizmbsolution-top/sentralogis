# ADR-080 — Canonical Job Financial Workflow Classification

**Status:** RATIFIED (2026-09-03, DATA-4E X6 R2 ADR ratification)
**Ratified by:** Human project owner, 2026-09-03
**Implementation authorization:** NOT GRANTED (separate gate required)
**Date:** 2026-09-03
**Depends on:** ADR-078 (Entity Ownership Classification), ADR-079 (Driver Assignment Access Classification)
**Supersedes:** None
**Related:** ADR-060 (Buy vs Sell Price), ADR-064 (Financial Settlement Interface)

---

## Context

X6 R2 discovery established that trucking operational `is_vendor` semantics include **job financial workflow classification**: determining whether a job is financially handled as a vendor-priced/vendor purchase flow or an internal driver-share flow.

Current behavior:
- `job.purchase_price` is set for vendor assignments (cost to pay vendor)
- `job.base_price * driver_share_percentage / 100` is used for internal drivers (cost = revenue share)
- `job.advance_amount` + `job.driver_payment_amount` track payments differently:
  - Vendor: "DP" (down payment) workflow
  - Internal: "Driver Advance" + settlement workflow
- UI labels differ:
  - Vendor: "Awaiting DP", "Vendor DP", orange styling
  - Internal: "Awaiting Settlement", "Driver Advance", blue styling

This classification is currently derived from `resolveIsVendor()` in `assignmentSave.ts` and embedded in completed UI components.

### `resolveIsVendor()` Semantic Decomposition

`resolveIsVendor()` currently conflates four distinct semantic concepts:

| Concept | Current Signal | Canonical Replacement |
|---------|---------------|----------------------|
| Party role | `is_vendor` / `party_roles.VENDOR` | `party_roles.VENDOR` |
| Ownership | `is_own`, `vendor_type`, name heuristics, `!is_vendor` fallback | `md_entities.is_own` (ADR-078) |
| Access routing | Derived from ownership + driver entity | Derived per-assignment (ADR-079) |
| Financial workflow | Derived from ownership | Persisted fields `purchase_price` / `driver_share_percentage` (ADR-080) |
| Display state | `is_vendor` badge | Derived from ownership + financial workflow |

`resolveIsVendor()` must eventually become a compatibility consumer of these contracts, not a canonical authority.

## Problem Statement

There is no canonical, deterministic contract for answering:

> Is this job financially handled as vendor-priced/vendor purchase flow or internal driver-share flow?

Current behavior is derived from ownership inference with the following issues:
- Tightly coupled to `resolveIsVendor()` derived logic
- Financial calculations (`purchase_price` vs `driver_share_percentage`) are split across two code paths
- No explicit job-level financial classification
- UI display logic duplicated across multiple components
- Risk of inconsistency between assignment save and completed UI

## Current State

| Aspect | Status |
|--------|--------|
| `job.purchase_price` | Set for vendor assignments; `NULL`/0 for internal |
| `job.base_price` | Revenue price, always set |
| `job.driver_share_percentage` | Percentage for internal driver payout |
| `job.advance_amount` | DP for vendor, advance for internal |
| `job.driver_payment_amount` | Payment tracking for both |
| `job.is_doc_finished` | Document completion flag |
| `resolveIsVendor()` | Derived function used for financial branch |
| Completed UI | Duplicated vendor/internal branching across 3+ components |

## Decision

### Decision 1 — Financial Workflow is a Job-Level Classification

Job financial workflow is a **property of the job assignment**, derived from the transporter/driver ownership at assignment time. It is:
- **Persisted implicitly** via `purchase_price` presence/absence
- **NOT** a separate persisted field (no schema change)
- **NOT** a party role
- **NOT** an entity ownership property (though derived from it)

### Decision 2 — Canonical Financial Classification Values

```typescript
type FinancialWorkflow = 'VENDOR_PURCHASE' | 'INTERNAL_SHARE' | 'UNKNOWN';

interface JobFinancialClassification {
  workflow: FinancialWorkflow;
  confidence: 'explicit' | 'inferred' | 'unknown';
  source: string;
}
```

| Value | Meaning | Primary Field | Secondary Fields |
|-------|---------|---------------|------------------|
| `VENDOR_PURCHASE` | Job is priced as vendor purchase; pay vendor via `purchase_price` | `purchase_price > 0` | `driver_share_percentage` is NULL/0 |
| `INTERNAL_SHARE` | Job is priced as internal driver revenue share | `driver_share_percentage > 0` | `purchase_price` is NULL/0 |
| `UNKNOWN` | No financial classification available | Both NULL/0 | — |

### Decision 3 — Classification Source of Truth

The financial workflow is determined **at assignment save time** by `assignmentSave.ts` using:

```typescript
const isVendor = resolveIsVendor(transporter, driver?.md_entities?.is_vendor);
const workflow: FinancialWorkflow = isVendor ? 'VENDOR_PURCHASE' : 'INTERNAL_SHARE';
```

This classification is then persisted implicitly:
- `VENDOR_PURCHASE` → `purchase_price` is set, `driver_share_percentage` is NULL/0
- `INTERNAL_SHARE` → `purchase_price` is NULL/0, `driver_share_percentage` is set

**The persisted fields ARE the classification.** No separate field is needed.

### Decision 4 — Deterministic Resolution Rules

Classification is deterministic at assignment time:

1. If `transporter` resolves to external vendor (`is_own === false`) → `VENDOR_PURCHASE`
2. If `transporter` resolves to internal (`is_own === true`) AND `driver_share_percentage > 0` → `INTERNAL_SHARE`
3. If both signals conflict (external transporter + driver share %) → **error** (cannot mix workflows)
4. If no signals available → `UNKNOWN` (validation error at assignment save)

### Decision 5 — Financial Invariant: Mixed Workflow is Invalid (O-7)

**A job MUST NOT have both `purchase_price > 0` AND `driver_share_percentage > 0`.**

This is encoded as an ADR invariant/design rule:

- **I-FIN-1:** A job MUST have exactly one financial workflow. Mixed workflows (`purchase_price > 0` AND `driver_share_percentage > 0`) are invalid.
- **I-FIN-2:** Financial workflow is determined at assignment save and MUST NOT change after job creation.
- **I-FIN-3:** `purchase_price` is the authoritative cost for vendor jobs. `driver_share_percentage` is the authoritative cost basis for internal jobs.
- **I-FIN-4:** Advance/payment tracking (`advance_amount`, `driver_payment_amount`) is independent of workflow type but the label/display differs.

**Data audit requirement:** If existing production data violates I-FIN-1 (`purchase_price > 0` AND `driver_share_percentage > 0`), this MUST be resolved via explicit data audit/migration, NOT by silently changing data. The validation rule will be enforced at assignment save time; existing violations must be manually reviewed and corrected.

### Decision 6 — Completed UI Classification

The completed UI reads the persisted fields, NOT `is_vendor`:

| UI Pattern | Current (unsafe) | Post-ADR (safe) |
|------------|------------------|-----------------|
| Status label: "Awaiting DP" vs "Awaiting Settlement" | `job.md_fleets?.md_entities?.is_vendor` | `job.purchase_price > 0 ? 'Awaiting DP' : 'Awaiting Settlement'` |
| Status color: orange vs blue | `job.md_fleets?.md_entities?.is_vendor` | `job.purchase_price > 0 ? orange : blue` |
| Fleet label: "Vendor" vs fleet type | `job.md_fleets?.md_entities?.is_vendor` | `job.purchase_price > 0 ? 'Vendor' : job.md_fleets?.md_fleet_types?.type_name` |
| Advance section: "Vendor DP" vs "Driver Advance" | `job.md_fleets?.md_entities?.is_vendor` | `job.purchase_price > 0 ? 'Vendor DP' : 'Driver Advance'` |
| Direct cost calculation | `isVendor ? purchase_price : base_price * share_pct / 100` | Same logic, derived from persisted fields |

### Decision 7 — Control Tower Deferral (O-8)

Financial workflow classification is **NOT** added to the Control Tower read model in this phase.

Control Tower integration is deferred until:
- ADR-080 is fully implemented
- Operational semantics are proven in production
- A separate design decision is made for Control Tower financial workflow projection

### Decision 8 — Relationship to Ownership (ADR-078) and Access (ADR-079)

| Dimension | Canonical Source | Persisted? |
|-----------|------------------|------------|
| Ownership (who controls asset) | `md_entities.is_own` (ADR-078) | Yes |
| Access routing (how driver receives task) | Derived per-assignment (ADR-079) | No |
| Financial workflow (how job is priced/settled) | Persisted fields (`purchase_price`, `driver_share_percentage`) | Yes |

These are orthogonal but currently conflated in `resolveIsVendor()`.

### Decision 9 — Tenant Isolation

Financial workflow classification is tenant-scoped:
- All financial fields are tenant-isolated via RLS
- No cross-tenant financial data exposure
- `vendor_tenant_id` is out of scope

## Resolution Algorithm

```typescript
type FinancialWorkflow = 'VENDOR_PURCHASE' | 'INTERNAL_SHARE' | 'UNKNOWN';

function classifyJobFinancialWorkflow(job: Job): FinancialWorkflow {
  const hasVendorPrice = Number(job.purchase_price) > 0;
  const hasDriverShare = Number(job.driver_share_percentage) > 0;
  
  if (hasVendorPrice && !hasDriverShare) return 'VENDOR_PURCHASE';
  if (!hasVendorPrice && hasDriverShare) return 'INTERNAL_SHARE';
  if (!hasVendorPrice && !hasDriverShare) return 'UNKNOWN';
  
  // Both set — invalid state per I-FIN-1
  return 'UNKNOWN'; // validation should catch this
}

// At assignment save time:
function determineWorkflowAtAssignment(
  transporter: Entity,
  driverSharePct: number
): FinancialWorkflow {
  const ownership = classifyOwnership(transporter.id);
  
  if (ownership.isOwn === false) {
    if (driverSharePct > 0) {
      throw new Error('Cannot assign vendor transporter with driver share percentage');
    }
    return 'VENDOR_PURCHASE';
  }
  
  if (ownership.isOwn === true) {
    if (driverSharePct > 0) {
      return 'INTERNAL_SHARE';
    }
    throw new Error('Internal assignment requires driver share percentage');
  }
  
  // NULL ownership — require explicit classification
  throw new Error('Transporter ownership must be classified before assignment');
}
```

## Tenant Isolation Rules

- Financial workflow classification is tenant-scoped
- All financial fields are tenant-isolated via RLS
- No cross-tenant financial data exposure
- `vendor_tenant_id` is out of scope

## Compatibility Behavior

| Existing Pattern | Post-ADR Replacement |
|------------------|----------------------|
| `resolveIsVendor(transporter, driverEntity?.is_vendor)` in assignmentSave | `determineWorkflowAtAssignment()` |
| `isVendor ? purchase_price : base_price * share_pct / 100` in UI | `classifyJobFinancialWorkflow(job)` + same calculation |
| `job.md_fleets?.md_entities?.is_vendor ? 'Awaiting DP' : 'Awaiting Settlement'` | `job.purchase_price > 0 ? 'Awaiting DP' : 'Awaiting Settlement'` |
| `job.md_fleets?.md_entities?.is_vendor ? 'Vendor DP' : 'Driver Advance'` | `job.purchase_price > 0 ? 'Vendor DP' : 'Driver Advance'` |
| `job.md_fleets?.md_entities?.is_vendor ? 'Vendor' : fleet_type` | `job.purchase_price > 0 ? 'Vendor' : fleet_type` |

## Migration Strategy

1. **ADR ratification** — establish canonical financial workflow classification
2. **Service implementation** — `JobFinancialWorkflowService` with `classifyJobFinancialWorkflow()` and `determineWorkflowAtAssignment()`
3. **Assignment save migration** — replace `resolveIsVendor()` with explicit workflow determination
4. **UI migration** — replace `is_vendor` reads with persisted field checks in completed components
5. **Validation** — add invariant check that jobs have exactly one workflow
6. **Data audit** — identify and manually resolve existing jobs violating I-FIN-1

## Rejected Alternatives

| Alternative | Reason for Rejection |
|-------------|----------------------|
| Add `financial_workflow` enum column to `job_orders` | Redundant; persisted fields already encode this |
| Use `party_roles.VENDOR` for financial classification | Party role ≠ financial workflow |
| Use `vendor_type` for financial classification | Free-text, not deterministic |
| Persist workflow at job creation only | Workflow may need to be read/validated at any time |
| Keep `resolveIsVendor()` as canonical | Derived shim; mixes multiple semantic dimensions |
| Silently fix existing mixed-workflow data | Must be resolved via explicit audit/migration |

## Invariants

1. **I-FIN-1:** A job MUST have exactly one financial workflow. Mixed workflows (`purchase_price > 0` AND `driver_share_percentage > 0`) are invalid.
2. **I-FIN-2:** Financial workflow is determined at assignment save and MUST NOT change after job creation.
3. **I-FIN-3:** `purchase_price` is authoritative for vendor jobs; `driver_share_percentage` is authoritative for internal jobs.
4. **I-FIN-4:** UI display labels are derived from persisted fields, not from `is_vendor` or ownership.
5. **I-FIN-5:** Financial workflow classification is NOT exposed in Control Tower in this phase (O-8).

## Consequences

- **Positive:** Eliminates fragile `is_vendor` dependency in financial UI
- **Positive:** Financial workflow is explicitly validated at assignment time
- **Positive:** Clear migration path for completed UI components
- **Negative:** Requires service implementation and UI migration
- **Negative:** Existing jobs with inconsistent fields must be audited and manually resolved

## Open Questions

1. Should `driver_share_percentage` be required for internal assignments, or defaulted?
2. Should there be an explicit data audit for existing jobs violating I-FIN-1?
3. Should the financial workflow be explicitly exposed in the Control Tower read model? (Deferred per O-8)
