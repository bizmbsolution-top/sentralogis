# ADR-079 — Canonical Driver Assignment Access Classification

**Status:** RATIFIED (2026-09-03, DATA-4E X6 R2 ADR ratification)
**Ratified by:** Human project owner, 2026-09-03
**Implementation authorization:** NOT GRANTED (separate gate required)
**Date:** 2026-09-03
**Depends on:** ADR-078 (Entity Ownership Classification)
**Supersedes:** None
**Related:** ADR-080 (Job Financial Workflow Classification)

---

## Context

X6 R2 discovery established that trucking operational `is_vendor` semantics include **driver assignment access routing**: determining whether a driver assignment should use internal driver portal/access behavior or external vendor/JO-link behavior.

Current behavior is embedded in `resolveIsVendor()` and used in:
- `lib/services/assignmentSave.ts` — WA message routing
- `app/(dashboard)/sbu/trucking/assignments/page.tsx` — WA link button
- `app/(dashboard)/sbu/trucking/assignments/components/EditAssignmentModal.tsx` — WA message routing
- `app/(dashboard)/sbu/trucking/work-orders/components/AssignmentModal.tsx` — WA routing for vendor reply assign

The decision tree currently:
1. Resolves transporter ownership via `resolveIsVendor(transporter, driverEntity?.is_vendor)`
2. If internal (`isActuallyOwn === true`): send driver to internal portal (`/driver/portal`)
3. If external vendor: send driver to external JO link (`https://www.sentralogis.com/jo/{token}`)

This routing decision is currently coupled to ownership classification, but the two concepts are distinct:
- **Ownership** answers: "Who controls this asset?"
- **Access routing** answers: "How does this driver receive and acknowledge assignments?"

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

> Should this assignment use internal driver portal/access behavior or external vendor/JO-link behavior?

Current behavior is derived from ownership inference with the following issues:
- Tightly coupled to `resolveIsVendor()` derived logic
- No explicit per-driver or per-assignment access classification
- No tenant-isolated authority model
- Heuristic-dependent (name matching, `vendor_type` parsing)

## Current State

| Aspect | Status |
|--------|--------|
| `md_drivers.md_entities.is_vendor` | Used for access routing via `resolveIsVendor` |
| `md_entities.is_own` | Used for ownership inference |
| `md_entities.vendor_type` | Free-text, used in ownership inference |
| `resolveIsVendor()` | Derived function combining ownership + access routing |
| Internal portal | `/driver/portal` — requires driver auth |
| External JO link | `https://www.sentralogis.com/jo/{token}` — public with token |
| Driver native app | Detected via `has_native_app` flag, independent of access routing |

## Decision

### Decision 1 — Access Classification is Separate from Ownership

Access routing is **NOT** ownership. A driver can be:
- Internally employed (`is_own = TRUE`) but assigned through external vendor link (e.g., subcontractor driver)
- Externally owned (`is_own = FALSE`) but use internal portal (e.g., long-term contracted driver with app access)

These are orthogonal dimensions.

### Decision 2 — Access Classification is Derived, Not Persisted

**Driver assignment access classification is a per-assignment derived property**, not a persisted entity attribute.

There is **NO** explicit `driver_access_type` field in this phase. If an explicit persisted override is architecturally necessary in the future, it will be designed in a separate ADR (Future ADR-XXX).

The classification is determined by:

```typescript
type DriverAccessType = 'INTERNAL_PORTAL' | 'EXTERNAL_LINK' | 'NATIVE_APP';

interface DriverAccessClassification {
  accessType: DriverAccessType;
  reason: string;
}
```

### Decision 3 — Classification Rules

Classification is determined in the following priority order:

1. **Native App Detection:** If `driver.has_native_app === true` → `NATIVE_APP`
   - `has_native_app` is **system/admin-controlled state** (O-5)
   - It is NOT client-reported capability
   - It changes transport/UI behavior only; it does NOT bypass authentication or authorization (O-6)
   - Native app drivers still require canonical authentication (IdentityContext + tenant isolation)

2. **Explicit Driver Entity Ownership:** If `driver.md_entities.is_own === true` → `INTERNAL_PORTAL`
   - Rationale: Internal drivers use the authenticated driver portal
   - Requires driver login (IdentityContext + tenant isolation preserved)

3. **Explicit Driver Entity Ownership:** If `driver.md_entities.is_own === false` → `EXTERNAL_LINK`
   - Rationale: External vendor drivers receive tokenized JO links

4. **Transporter Ownership Fallback:** If driver entity ownership is unknown (`NULL`):
   - If transporter is internal (`is_own === true`) → `INTERNAL_PORTAL`
   - If transporter is external (`is_own === false`) → `EXTERNAL_LINK`
   - If transporter ownership is unknown (`NULL`) → `EXTERNAL_LINK` (safe default)

5. **No heuristic fallback:** If no signals match, the safe default is `EXTERNAL_LINK`. Name heuristics are NOT used for access classification.

### Decision 4 — `has_native_app` Authority and Stale-State Behavior (O-5)

`has_native_app` is **system/admin-controlled state**.

- **Maintenance authority:** Tenant admin or system admin sets `has_native_app` via authorized UI/API
- **Client-reported capability:** A native app MAY report its presence, but this report is NOT authoritative. It is advisory only.
- **Authorization truth:** Only server-side admin-set `has_native_app` may influence access classification
- **Stale-state behavior:** If `has_native_app` is `true` and the driver uninstalls the app, the state remains `true` until an admin resets it. The system does NOT automatically detect uninstallation.

### Decision 5 — Native App Authorization Boundary (O-6)

Native app availability MUST NOT bypass canonical authentication or authorization.

- Native app MAY change transport/UI behavior (push notifications, offline queue, background GPS)
- Native app MUST NOT bypass IdentityContext
- Native app MUST NOT bypass tenant isolation
- Native app MUST NOT bypass authorization checks
- Native app MUST NOT bypass assignment access controls

The native app is a **transport mechanism**, not an **authorization bypass**.

### Decision 6 — Relationship to ADR-078 (Ownership)

Access classification **depends on** ownership classification but is not identical to it:

| Ownership | Default Access | Override Possible? |
|-----------|---------------|-------------------|
| `is_own = TRUE` | `INTERNAL_PORTAL` | No explicit override in this phase |
| `is_own = FALSE` | `EXTERNAL_LINK` | No explicit override in this phase |
| `NULL` | Derived from transporter | No explicit override in this phase |

Future: An explicit `driver_access_type` field on `md_drivers` could allow per-driver overrides. This is a **Future ADR**, not part of R2.

### Decision 7 — Relationship to `party_roles.VENDOR`

`party_roles.VENDOR` is **not used** for access routing. A party with `VENDOR` role may use internal portal if they have internal assets/drivers. Access routing is based on ownership classification, not party role.

### Decision 8 — Tenant Isolation

Access classification is tenant-scoped:
- Driver entity ownership is resolved within the caller's tenant context
- Cross-tenant driver references are not permitted
- `vendor_tenant_id` (cross-tenant vendor pattern) is out of scope

### Decision 9 — WA Message Routing

The WA message content differs by access type:

| Access Type | Link Target | Message Template |
|-------------|-------------|------------------|
| `INTERNAL_PORTAL` | `/driver/portal` | "Open Driver Portal to accept task" |
| `EXTERNAL_LINK` | `https://www.sentralogis.com/jo/{token}` | "Confirm your task via this link" |
| `NATIVE_APP` | Push notification | No WA link needed (app handles) |

### Decision 10 — Deterministic Resolution

The classification MUST be deterministic given the same inputs. No random or time-based variation is permitted.

## Resolution Algorithm

```typescript
async function classifyDriverAccess(
  tenantId: string,
  driverId: string | null,
  transporterId: string | null
): Promise<DriverAccessClassification> {
  // 1. Native app detection (highest priority)
  if (driverId) {
    const driver = await loadDriver(tenantId, driverId);
    if (driver.has_native_app === true) {
      return { accessType: 'NATIVE_APP', reason: 'driver.has_native_app' };
    }
  }

  // 2. Driver entity ownership
  if (driverId) {
    const driverEntity = await loadEntityViaDriver(tenantId, driverId);
    const ownership = await classifyOwnership(tenantId, driverEntity.id);
    if (ownership.isOwn === true) {
      return { accessType: 'INTERNAL_PORTAL', reason: 'driver.entity.is_own' };
    }
    if (ownership.isOwn === false) {
      return { accessType: 'EXTERNAL_LINK', reason: 'driver.entity.is_own' };
    }
    // NULL falls through to transporter fallback
  }

  // 3. Transporter ownership fallback
  if (transporterId) {
    const transporter = await loadEntity(tenantId, transporterId);
    const ownership = await classifyOwnership(tenantId, transporter.id);
    if (ownership.isOwn === true) {
      return { accessType: 'INTERNAL_PORTAL', reason: 'transporter.ownership.fallback' };
    }
    // FALSE or NULL → external (safe default)
    return { accessType: 'EXTERNAL_LINK', reason: 'transporter.ownership.fallback' };
  }

  // 4. Safe default (no heuristic fallback)
  return { accessType: 'EXTERNAL_LINK', reason: 'safe_default' };
}
```

## Tenant Isolation Rules

- Driver and entity lookups are scoped to the caller's tenant
- Cross-tenant driver/entity references are rejected
- `vendor_tenant_id` is out of scope

## Compatibility Behavior

| Existing Pattern | Post-ADR Replacement |
|------------------|----------------------|
| `resolveIsVendor(transporter, driverEntity?.is_vendor)` | `classifyDriverAccess()` |
| `isInternal ? '/driver/portal' : external link` | `accessType === 'INTERNAL_PORTAL' ? '/driver/portal' : external link` |
| `driver?.md_entities?.is_vendor === false` | `classifyDriverAccess().accessType === 'INTERNAL_PORTAL'` |

## Migration Strategy

1. **ADR ratification** — establish canonical access classification
2. **Service implementation** — `DriverAccessClassificationService` with `classifyDriverAccess()`
3. **Reader migration** — replace `resolveIsVendor()` calls in assignment/routing code
4. **Deprecation** — mark `resolveIsVendor()` as deprecated shim

## Rejected Alternatives

| Alternative | Reason for Rejection |
|-------------|----------------------|
| Use `party_roles.VENDOR` for access routing | Party role ≠ access classification |
| Persist access type on `md_drivers` in this phase | Adds redundancy; derived classification is sufficient. Future ADR if explicit override needed. |
| Use `vendor_tenant_id` for access routing | Cross-tenant pattern, out of scope |
| Keep `resolveIsVendor()` as canonical | Derived shim; mixes ownership, access, and financial semantics |
| Use name heuristics for access classification | Non-deterministic, not authoritative |
| Allow client-reported `has_native_app` as authorization truth | Must be system/admin-controlled only (O-5) |

## Invariants

1. **I-ACC-1:** Access classification is derived, not persisted.
2. **I-ACC-2:** `NATIVE_APP` takes precedence over all other signals.
3. **I-ACC-3:** The safe default for unknown drivers is `EXTERNAL_LINK`.
4. **I-ACC-4:** Access classification is orthogonal to `party_roles.VENDOR` and financial workflow classification.
5. **I-ACC-5:** Native app availability does NOT bypass canonical authentication or authorization (O-6).
6. **I-ACC-6:** `has_native_app` is system/admin-controlled state, not client-reported capability (O-5).

## Consequences

- **Positive:** Decouples access routing from ownership inference
- **Positive:** Enables native app detection without auth bypass
- **Positive:** Clear migration path for assignment/routing code
- **Negative:** Requires service implementation and reader migration
- **Negative:** Native app state must be maintained by admin/system

## Open Questions

1. Should there be an explicit `driver_access_type` override field on `md_drivers`? (Future ADR, not R2)
2. How should `has_native_app` stale state be handled when a driver uninstalls the app?
3. Should native app drivers still be required to authenticate via portal, or can they operate in a native-only mode?
