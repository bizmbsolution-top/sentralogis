# ADR-078 — Canonical Entity Ownership Classification

**Status:** RATIFIED (2026-09-03, DATA-4E X6 R2 ADR ratification)
**Ratified by:** Human project owner, 2026-09-03
**Implementation authorization:** NOT GRANTED (separate gate required)
**Date:** 2026-09-03
**Depends on:** ADR-077 (Party Role Authority & Global Cardinality)
**Supersedes:** None
**Related:** ADR-079 (Driver Assignment Access Classification), ADR-080 (Job Financial Workflow Classification)

---

## Context

X6 R2 discovery established that trucking operational `is_vendor` semantics represent multiple distinct concepts. One of these concepts is **entity/fleet ownership**: determining whether an operational entity (fleet, driver, transporter) is internally owned/controlled by the tenant or externally owned by a vendor.

Current signals used to infer ownership:
- `md_entities.is_vendor` boolean (true = external vendor, false/unknown = possibly internal)
- `md_entities.is_own` boolean (explicit ownership flag, nullable)
- `md_entities.vendor_type` free-text field (values: "VENDOR", "OWN", "INTERNAL", etc.)
- Entity name heuristics (tenant name, tenant code, "INTERNAL", "(OWN)" substrings)
- Cross-tenant `vendor_tenant_id` on fleets/drivers (separate concern, out of scope)

The current `resolveIsVendor()` function in `lib/domain/jo/assignment.ts` implements a derived decision tree that combines these signals with fallback heuristics. This function is a compatibility shim, not a canonical contract.

`party_roles.VENDOR` answers "Is this party a vendor?" — it does NOT answer "Is this fleet internally owned?" These are orthogonal questions. A party can be a VENDOR role and also own fleets that are used internally.

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

> Is this operational entity internally owned/controlled or externally owned by a vendor?

Current behavior is derived from multiple overlapping signals with implicit precedence:
1. `is_own` explicit boolean (if present)
2. `vendor_type` enum-like values ("OWN"/"INTERNAL" vs "VENDOR")
3. Name heuristics (tenant name/code/"(OWN)"/"INTERNAL" substrings)
4. Fallback to `!is_vendor`

This leads to:
- Non-deterministic classification when signals conflict
- No single source of truth
- Fragile UI behavior dependent on entity naming conventions
- No tenant-isolated authority model

## Current State

| Aspect | Status |
|--------|--------|
| `md_entities.is_own` | Nullable boolean, manually maintained, not authoritative |
| `md_entities.vendor_type` | Free-text field, manually maintained, not enumerated |
| `md_entities.is_vendor` | Transitional/compatibility projection |
| `party_roles.VENDOR` | Canonical for party role, NOT ownership |
| `resolveIsVendor()` | Derived compatibility function, combines multiple signals |
| Fleet ownership | Implicit via `entity_id` on `md_fleets` |
| Driver ownership | Implicit via `entity_id` on `md_drivers` |

## Decision

### Decision 1 — Ownership is a Separate Semantic Concept

Entity ownership is **NOT** a party role. `party_roles.VENDOR` answers a different question. Ownership classification requires its own canonical semantic contract.

### Decision 2 — Canonical Ownership Signal

**`md_entities.is_own` is the canonical persisted ownership classification.**

| Value | Meaning |
|-------|---------|
| `TRUE` | Internally owned/controlled by the tenant |
| `FALSE` | Externally owned by a vendor |
| `NULL` | Ownership classification unknown / not yet explicitly classified |

**Authority:**
- `is_own` is the **sole** authoritative source for ownership classification
- `is_own` MUST be set exclusively by server-side classification/write authority
- Direct client-side writes to `is_own` are prohibited
- `party_roles.VENDOR` is NOT authoritative for ownership
- `vendor_type` is NOT authoritative for ownership
- Entity name heuristics are NOT authoritative for ownership

### Decision 3 — NULL Ownership Semantics (O-1)

`NULL` means **ownership classification unknown / not yet explicitly classified**.

`NULL` is a valid and distinct state. It is NOT equivalent to `FALSE`.

**Rules:**
- Existing `NULL` values MUST remain `NULL` unless ownership is explicitly known
- Do NOT perform heuristic backfill of `NULL` values
- Do NOT infer ownership from `vendor_type`, name heuristics, or `party_roles` for write authority
- UI and business logic MUST handle `NULL` explicitly:
  - Filter dropdowns: show all entities, mark unclassified
  - Assignment logic: treat `NULL` as "not confirmed internal" → external flow
  - Display: show unclassified entities without internal/vendor badge

### Decision 4 — Write Authority and Validation

`is_own` is written exclusively by:
1. **Explicit admin/owner action** — authorized user sets ownership via controlled UI/API
2. **Server-side normalization from explicit signals** — when `vendor_type` is explicitly set to a known value ("OWN", "INTERNAL", "VENDOR") by an authorized user, the ownership service normalizes to `is_own`

**Validation rules:**
- `is_own` MUST be `TRUE`, `FALSE`, or `NULL`
- No other values are permitted
- Writes to `is_own` require appropriate authorization (tenant admin or owner role)
- Cross-tenant writes are prohibited

### Decision 5 — `vendor_type` Role

`vendor_type` remains a **free-text compatibility field**.

- `vendor_type` is NOT authoritative for ownership
- `vendor_type` MAY be used as an input to ownership normalization when explicitly set by an authorized user
- `vendor_type` values are NOT enumerated or constrained in this phase
- Enumeration/constraint of `vendor_type` is a future independent architectural decision (O-3)

### Decision 6 — Fleet and Driver Ownership

Fleet and driver ownership is **derived from their parent entity** via `entity_id`:

- `md_fleets.entity_id → md_entities.id → is_own`
- `md_drivers.entity_id → md_entities.id → is_own`

There is NO separate ownership flag on `md_fleets` or `md_drivers`. Ownership is always entity-level.

### Decision 7 — Tenant Isolation

Ownership classification is tenant-scoped:
- `is_own` is resolved within the caller's tenant context
- The service validates that the entity belongs to the caller's tenant before classification
- Cross-tenant entity references are not permitted in ownership resolution
- `vendor_tenant_id` (cross-tenant vendor pattern) is out of scope for this ADR

### Decision 8 — Relationship to `party_roles.VENDOR`

| Question | Canonical Source |
|----------|------------------|
| Is this party a vendor? | `party_roles.VENDOR` |
| Is this fleet internally owned? | `md_entities.is_own` (via ADR-078) |
| Is this driver internally employed? | `md_entities.is_own` via parent entity |

A party can be:
- `VENDOR` role + `is_own = FALSE` → external vendor (common case)
- `VENDOR` role + `is_own = TRUE` → vendor that also has internal assets (rare but valid)
- No `VENDOR` role + `is_own = TRUE` → internal party
- No `VENDOR` role + `is_own = FALSE` → customer/other party with external assets
- `NULL` → unclassified

### Decision 9 — Name Heuristics

Entity name heuristics are **NOT used** for ownership classification in this ADR.

Name heuristics are explicitly rejected as an ownership inference mechanism because:
- They are non-deterministic
- They depend on naming conventions
- They cannot be validated or audited
- They produce false positives/negatives

If name-based defaults are needed for UI convenience, they MUST be labeled as "suggested" and MUST NOT be persisted without explicit user confirmation.

### Decision 10 — `resolveIsVendor()` Deprecation Path

`resolveIsVendor()` is a derived compatibility function. It is NOT canonical.

Post-ADR-078/079/080 ratification, `resolveIsVendor()` SHOULD be replaced by:
1. `classifyOwnership()` for ownership questions
2. `classifyDriverAccess()` for access routing questions
3. `classifyJobFinancialWorkflow()` for financial workflow questions

Until replacement is complete, `resolveIsVendor()` remains functional but is flagged as deprecated.

## Data Model Implications

No schema changes are proposed by this ADR. The canonical field `md_entities.is_own` already exists.

Future consideration (separate ADR): a partial unique index or check constraint could enforce that `is_own` is only set by the ownership service, but this is out of scope.

## Resolution Algorithm

```typescript
interface OwnershipClassification {
  isOwn: boolean | null; // true = internal, false = external, null = unknown
  confidence: 'explicit' | 'inferred' | 'unknown';
  source: 'is_own' | 'vendor_type_normalization' | 'unclassified';
}

async function classifyOwnership(tenantId: string, entityId: string): Promise<OwnershipClassification> {
  // 1. Load entity within tenant context
  const entity = await loadEntity(tenantId, entityId);
  
  // 2. Explicit is_own is the sole authority
  if (entity.is_own !== null && entity.is_own !== undefined) {
    return { isOwn: entity.is_own, confidence: 'explicit', source: 'is_own' };
  }
  
  // 3. If is_own is NULL, ownership is unknown
  // Do NOT infer from vendor_type, name heuristics, or party_roles
  return { isOwn: null, confidence: 'unknown', source: 'unclassified' };
}
```

**Note:** The algorithm does NOT include `vendor_type` normalization or name heuristics. Those are rejected per O-2. If normalization from `vendor_type` is desired, it must be an explicit write-time action by authorized user, not a read-time inference.

## Tenant Isolation Rules

- Ownership classification is resolved within the caller's tenant context
- The service validates that the entity belongs to the caller's tenant before classification
- Cross-tenant entity lookups return 404/403 as per existing authorization patterns

## Compatibility Behavior

| Existing Consumer Pattern | Post-ADR Behavior |
|---------------------------|-------------------|
| `entity.is_vendor === true` → external | Replace with `classifyOwnership().isOwn === false` |
| `entity.is_vendor === false` → internal | Replace with `classifyOwnership().isOwn === true` |
| `entity.is_vendor === undefined` → unknown | Replace with `classifyOwnership().isOwn === null` |
| `entity.is_own === true` → internal | Use directly (`isOwn === true`) |
| `entity.is_own === false` → external | Use directly (`isOwn === false`) |
| `entity.is_own === null` → unknown | `classifyOwnership().isOwn === null` |

## Migration Strategy

1. **ADR ratification** — establish canonical authority of `is_own`
2. **Writer authorization** — ensure `is_own` writes go through authorized server-side paths only
3. **Reader migration (R2 implementation)** — replace `resolveIsVendor()` and direct `is_vendor` reads with `classifyOwnership()` in remaining consumers
4. **Deprecation** — mark `md_entities.is_vendor` as deprecated (separate decision)

## Rejected Alternatives

| Alternative | Reason for Rejection |
|-------------|----------------------|
| Use `party_roles.VENDOR` as ownership signal | Party role ≠ ownership. A vendor can own internal assets. |
| Use `vendor_type` alone as ownership signal | Free-text, not deterministic, not authoritative (O-2) |
| Use entity name heuristics for ownership | Non-deterministic, naming-convention dependent (O-2) |
| Add new `ownership_type` enum column | `is_own` boolean is sufficient; enum adds unnecessary complexity |
| Use `vendor_tenant_id` for ownership | Cross-tenant pattern, different semantic |
| Infer ownership from fleet/driver existence | Implicit, non-deterministic, entity-level is clearer |
| Keep `resolveIsVendor()` as canonical | Derived shim; mixes ownership, access, and financial semantics |

## Invariants

1. **I-OWN-1:** `is_own` is the canonical ownership flag. `is_vendor` is NOT authoritative for ownership.
2. **I-OWN-2:** Ownership is entity-level, not fleet-level or driver-level.
3. **I-OWN-3:** `NULL` is a valid ownership state meaning "ownership classification unknown / not yet explicitly classified", distinct from `FALSE`.
4. **I-OWN-4:** Name heuristics are NOT used for ownership classification.
5. **I-OWN-5:** `party_roles.VENDOR` and `is_own` are orthogonal. A party can be both a VENDOR role and internally owned.
6. **I-OWN-6:** `is_own` is written exclusively by authorized server-side paths. Direct client-side writes are prohibited.

## Consequences

- **Positive:** Single deterministic source for ownership classification
- **Positive:** Eliminates fragile name-based heuristics from ownership decisions
- **Positive:** Clear migration path for remaining `is_vendor` consumers
- **Negative:** Requires writer authorization enforcement
- **Negative:** Existing `is_own` nulls remain unknown until explicitly classified (no automatic backfill)

## Open Questions

1. Should there be a UI for explicit ownership classification, or rely on admin/server-side assignment?
2. Should `vendor_type` values be enumerated/enforced, or remain free-text? (O-3 — deferred)
3. Should `is_own` changes be audited?
