# SENTRALOGIS — PHASE 4B-3
# U-05 CAPABILITY REGISTRY FOUNDATION — IMPLEMENTATION REPORT

**Status:** COMPLETE · **Date:** 2026-08-26
**Depends on:** U-01 ✅ · U-02 ✅ · U-03 ✅ · U-04 ✅ (all ACCEPTED)
**Boundary:** Capability Registry ONLY. No binding lifecycle, no SR, no execution.

---

## 1. Capability Definition

A capability is a **canonical, globally-defined statement of WHAT Sentralogis can
provide** — an operational vocabulary entry, not an organizational unit and not a job.
The registry deliberately carries NO tenant dimension, NO execution attributes
(driver/fleet/route/JO/WO/location/GPS), and NO relationship to engagements or service
requests (mandate §20).

## 2. Registry Architecture

```
lib/application/capabilities/
    types.ts        CanonicalCapability, CapabilityCode, errors
    repository.ts   Read-only port + supabase impl + injection seam
    registry.ts     cache → repo → static-fallback resolver + domain sync
    sbu-adapter.ts  legacy SBU → canonical code (one-directional)
    index.ts
```

Canonical table: `commercial_capability_registry` (migration `20260828_015`).

## 3. Global vs Tenant Scope (§11)

**Decision: definitions are GLOBAL; availability/binding stays tenant-scoped.**
"What capabilities exist" is a platform truth; "which tenant provides what" belongs to
future binding lifecycle (U-06+). Enforced physically: the table has no `tenant_id`
column. Verified by T10 invariant test.

## 4. Canonical Codes (§7)

`CUSTOMS · FORWARDING · TRUCKING · WAREHOUSE`

Stable machine-readable business identity — `UNIQUE(capability_code)` at database level;
UUIDs are internal PKs only. Case-normalized on resolution (`customs == CUSTOMS`, T9).
Codes are independent of display names (`name` also UNIQUE).

## 5. Code vs SBU Type (§8) & Compatibility Adapter (§25)

The four values are **capability codes**, NOT SBU types. The registry ends the conflation.
Legacy compatibility is an explicit ONE-DIRECTIONAL adapter:

| Legacy `sbu_type` | Canonical capability |
|---|---|
| `trucking` | `TRUCKING` |
| `warehouse` | `WAREHOUSE` |
| `clearances` | `CUSTOMS` ← deliberate de-conflation |
| `forwarding` | `FORWARDING` |

Unknown legacy value → `null` (never guesses). No reverse mapping exists; legacy
vocabulary cannot re-enter as canonical truth.

## 6. Seed Strategy (§10)

Migration seeds the four rows with `ON CONFLICT (capability_code) DO NOTHING`,
`is_system = TRUE`, status `ACTIVE`. Repeat-safe, deterministic, tenant-independent.
`loadRegistry()` additionally guarantees the four canonical codes always resolve even if
a snapshot were ever corrupted (definitions never silently vanish).

## 7. Authorization (§13)

No new permissions. Decisions:
- **Read** = authenticated infrastructure access: any valid IdentityContext may resolve;
  no permission gate beyond authentication (vocabulary is needed broadly by future
  binding/SR logic). Unauthenticated context → `UNAUTHENTICATED` error (T11).
- **Mutation** = impossible from the application layer BY CONSTRUCTION: the repository
  port exposes only `listActive()`/`findByCode()`; no create/update/delete exists
  anywhere in the module (T2/T13–T15). Database grants are SELECT-only for
  `authenticated`; writes reserved for authorized migrations/admin tooling.

## 8. Repository Boundary

Narrow read-only port — not a generic query builder — so business code cannot express
unscoped or mutating queries. Production impl uses `supabaseAdmin`; tests inject mocks
via `_setCapabilityRegistryRepository()`.

## 9. service_scope Relationship (§5/§23) — KEEP / ADAPT / DEPRECATE decision

**Soft-DEPRECATE (no destructive action):**

- Forensics found ZERO live writers of `commercial_service_scopes`; its remaining
  referencers are FK columns (`commercial_work_orders.service_scope_id` nullable since
  migration 014; `shp_shipments.service_scope_id` — U-09 fabricated-ID debt) and reads.
- Therefore: tables/FKs stay untouched; registry becomes the authoritative vocabulary.
- **Deferred data-migration strategy (NOT executed here, per mandate):**
  legacy scope rows → canonical target mapping documented for a later unit:
  `scope_code/incoterm/lane` metadata dissolves into future engagement/package
  configuration (per Application Mapping §A row "retired → compat view").

## 10. CapabilityBindingFactory Integration (§15)

New dependency-inversion seam `lib/domain/commercial/capability-code-source.ts`:
domain validates via injectable `isValidCapabilityCode()` whose DEFAULT is byte-for-byte
identical to the previous hard-coded four-type list. When the application registry
loads, it syncs registry truth into the seam (`loadRegistry()` →
`setCapabilityCodeValidator()`). Binding lifecycle remains UNACTIVATED — factory still
only constructs entities; no new bindings are created anywhere (T14, §22).

## 11. Cache / Fallback Strategy (§16)

```
resolveCapability(code)
  → normalize (trim+upper)
  → in-memory snapshot cache (lazy single-load)
  → miss/error → static fallback table (ONLY the four canonical codes,
                 used exclusively when the DB is unavailable)
  → otherwise  → UNKNOWN_CAPABILITY / INACTIVE_CAPABILITY (deterministic reject)
```

Fallback NEVER creates capabilities (FB2). Unknown codes NEVER map onto known ones —
`CUSTOMS_X ≠ CUSTOMS` (T8).

## 12. Migration

`20260828_015_capability_registry.sql` — additive, idempotent, non-destructive:
table + two unique constraints + status CHECK + seed + SELECT-only grants + global-read
RLS policy + verification suite comments. Rollback: single DROP TABLE. No existing data
or production records touched. Legacy `service_scopes` NOT mutated.

## 13. Tests — 12/12 PASS

T1/T3 four-canonical+seed-idempotency · T2 duplicate protection + zero mutation API ·
T4–T7 deterministic resolution ×4 · T8 unknown rejection · T9 case normalization ·
T10 global-scope invariant · T11 unauthenticated rejection · T12 factory compat
(default unchanged + registry-synced + INSURANCE rejected both modes) · T13–T15
read-only boundary proof · T16 SBU adapter mappings · FB1/FB2 DB-unavailable fallback.

## 14. Legacy Compatibility (§25/§16-T16)

Zero changes to: CreateWOForm, legacy WO/JO engine, trucking/forwarding/clearance/
warehouse execution, U-04 API, Phase-4A capabilities route, GPS/driver systems.
Factory behavior verified identical under default authority (full regression green).

## 15. Remaining Debt

1. Migration 015 must be applied before registry-backed resolution hits production
   paths (fallback covers the four codes meanwhile).
2. `database.types.ts` regeneration still pending (carried debt; now includes
   `legacy_wo_bridge`, migration 014 relax, and this registry after deploy).
3. Existing `[id]/capabilities` route still hardcodes nothing new but retains broken
   customs auth helper (pre-existing debt, own unit).
4. Registry admin mutation surface (if ever needed) requires its own authorization
   design — intentionally out of scope.
5. `svc_service_requests.target_capability`-style consumers (future SR work) should
   resolve through `resolveCapability()`, never raw strings — enforcement lands with
   those units.

## 16. U-06 Recommendation

Proceed to **U-06 Binding Lifecycle PATCH Surface** (backlog): expose
`CapabilityBindingService.transitionStatus` via PATCH under manage-gate with outbox
events (`CAPABILITY_*`). Prerequisites satisfied: registry authority live (validator
seam), engagement surface stable (U-04), identity/authz hardened (U-01/U-02).
Recommend the PATCH route consume `resolveCapability()` so binding types can never
drift from registry truth, and add the registry-read gate decision (authenticated vs
`commercial:read`) explicitly in that unit's mandate.

---

```text
========================================
SENTRALOGIS — U-05 FINAL STATUS
========================================

Capability Registry                         PASS
CUSTOMS                                     PASS
FORWARDING                                  PASS
TRUCKING                                    PASS
WAREHOUSE                                   PASS
Deterministic Resolution                    PASS
Duplicate Protection                        PASS   (UNIQUE(capability_code))
Unknown Capability Handling                 PASS   (reject, never create/map)
Seed Idempotency                            PASS
Tenant Isolation                            PASS   (global by design; auth required)
Authorization                               PASS   (read=authenticated; no mutation API)
SBU Compatibility                           PASS   (one-directional adapter)
CapabilityBindingFactory Compatibility      PASS   (default behavior unchanged)
No Service Request Creation                 PASS
No Capability Binding Creation              PASS
No Execution Creation                       PASS
Legacy Compatibility                        PASS
U-01 Regression                             PASS   (36/36)
U-02 Regression                             PASS   (66/66)
U-03 Regression                             PASS   (11/11)
U-04 Regression                             PASS   (48/48: core 15 + validation 18 + …)
U-05 Tests                                  PASS   (12/12)
Typecheck                                   PASS
Lint                                        PASS
Build                                       PASS
Full Regression                             PASS   (701/701)

FILES CREATED          7   (module ×5, tests ×1, migration ×1) + this report
FILES MODIFIED         3   (scratch/run-tests.ts runner registration;
                            lib/domain/commercial/capability-binding-service.ts —
                              validation via injectable seam, default identical;
                            NEW lib/domain/commercial/capability-code-source.ts counts as created)
DATABASE MIGRATIONS    1   (20260828_015_capability_registry.sql — additive/idempotent)
TEST COUNT           701/701 full regression · 12 new U-05 assertions
```

Component classification:

```text
NEW       lib/application/capabilities/** · lib/domain/commercial/capability-code-source.ts ·
          supabase/migrations/20260828_015_capability_registry.sql
KEEP      commercial_service_scopes tables+FKs (soft-deprecated, zero mutation) ·
          commercial_capability_bindings (untouched) · CreateWOForm · legacy WO/JO ·
          all execution domains · U-04 API
MODIFY    scratch/run-tests.ts (runner) · capability-binding-service.ts (seam only)
DEPRECATE commercial_service_scopes as vocabulary authority (soft — no schema action)
```

**STOP.** Awaiting authorization for U-06. No binding lifecycle, PATCH surface, SR,
bridges, JO generation, or finance integration implemented (mandate §31).
