# SENTRALOGIS — PHASE 5A-2R
# FORWARDING REPOSITORY BOUNDARY REMEDIATION

**Date:** 2026-08-31  
**Status:** GREEN — CLOSED  
**Phase:** 5A-2R — Forwarding Repository Boundary Remediation

---

## 1. EXECUTIVE SUMMARY

Phase 5A-2R remediates the single remaining controlled finding from Phase 5A-2:

| Finding | Pre-Status | Post-Status | Evidence |
|---------|------------|-------------|----------|
| FWD-RISK-01 (browser supabase/client in forwarding domain) | CONTROLLED | **CLOSED** | Repository/pricing files deleted; server action `lib/actions/forwardingActions.ts` uses `createClient` from `@/lib/supabase/server` + `resolveSessionIdentity()` |

**Validation:**
- TypeScript: 0 errors
- Phase 5A-2R tests: 32/32 PASS
- Full regression: 1255/1255 PASS, 0 FAIL

---

## 2. FWD-RISK-01 DESCRIPTION

### 2.1 Original Finding

> **FWD-RISK-01 — `lib/domain/forwarding/repository.ts` still imports/uses browser `supabase/client`.**

The forwarding domain repository was importing and using the browser Supabase client (`@/lib/supabase/client`) which:
- Bypasses the established server-side identity/authorization boundary (U-01/U-26R-P0)
- Exposes the database directly to client-side manipulation
- Violates the canonical architecture rule: "Client Component → Server Action/Route Handler → IdentityContext → Domain Service → Repository → Server-side Supabase → RLS"

### 2.2 Affected Files

| File | Original Issue |
|------|----------------|
| `lib/domain/forwarding/repository.ts` | Imported `supabase` from `@/lib/supabase/client` for `fetchLocations()` |
| `lib/domain/forwarding/pricing.ts` | Imported `supabase` from `@/lib/supabase/client` for `fetchMasterSellingPrice()`, `fetchMasterCosting()`, `autoPopulatePricing()` |
| `components/hq/AddForwardingItemModal.tsx` | Imported and called the browser-client-backed functions directly |

---

## 3. ORIGINAL REPOSITORY ARCHITECTURE

### 3.1 Caller Matrix

| Repository Method | Caller | Runtime | Auth Source | Tenant Source | Mutation? |
| ----------------- | ------ | ------- | ----------- | ------------- | --------- |
| `fetchLocations()` | `AddForwardingItemModal.tsx` | Client Component | Browser session cookie | Browser session cookie | No (SELECT only) |
| `autoPopulatePricing()` | `AddForwardingItemModal.tsx` | Client Component | Browser session cookie | Browser session cookie | No (SELECT only) |

### 3.2 Why Browser Client Was Used

The forwarding domain was an early-stage feature (Phase 5A) that used the browser client pattern for rapid development. While the tables have RLS enabled (Phase 5A-2), the client-server boundary was not properly enforced — the client component directly invoked database queries through the browser client.

---

## 4. SERVER ACTION PATTERN RESEARCH

### 4.1 Established Canonical Pattern

The codebase has an established server action pattern:

1. **Server Action** (`lib/actions/*.ts` with `'use server'` directive):
   - Uses `createClient()` from `@/lib/supabase/server` (server-side client)
   - Resolves identity via `resolveSessionIdentity()` from `@/lib/application/identity/session-source`
   - Does NOT accept `tenant_id` as a parameter (resolves from session)
   - Does NOT read `x-tenant-id` headers or query parameters

2. **Client Component** calls the server action directly (Next.js handles the RPC)

### 4.2 Reference Implementations

| File | Pattern |
|------|---------|
| `lib/actions/assignmentActions.ts` | `'use server'` + `createClient` from `@/lib/supabase/server` |
| `lib/actions/contractActions.ts` | `'use server'` + `createClient` from `@/lib/supabase/server` |
| `lib/domain/shipment/api-helper.ts` | `resolveApiAuthContext` using `createClient` from `@/lib/supabase/server` |

---

## 5. REMEDIATION

### 5.1 Files Deleted

| File | Reason |
|------|--------|
| `lib/domain/forwarding/repository.ts` | Used browser `supabase/client`; replaced by server action |
| `lib/domain/forwarding/pricing.ts` | Used browser `supabase/client`; replaced by server action |
| `src/lib/domain/forwarding/repository.ts` | Re-export of deleted file |
| `src/lib/domain/forwarding/pricing.ts` | Re-export of deleted file |

### 5.2 Files Created

**`lib/actions/forwardingActions.ts`** — Server action with:
- `'use server'` directive
- `createClient` from `@/lib/supabase/server` (NOT browser client)
- `resolveSessionIdentity()` for identity resolution (NOT client-supplied tenant)
- Exports:
  - `fetchForwardingLocations()` — Replaces `fetchLocations()` from repository
  - `fetchMasterSellingPrice()` — Replaces pricing function
  - `fetchMasterCosting()` — Replaces costing function
  - `calculateForwardingPricing()` — Replaces `autoPopulatePricing()`

### 5.3 Files Modified

**`components/hq/AddForwardingItemModal.tsx`**:
- Removed: `import { fetchLocations } from '@/lib/domain/forwarding/repository'`
- Removed: `import { autoPopulatePricing } from '@/lib/domain/forwarding/pricing'`
- Added: `import { fetchForwardingLocations, calculateForwardingPricing } from '@/lib/actions/forwardingActions'`
- Updated: `useEffect` calls `fetchForwardingLocations()` instead of `fetchLocations()`
- Updated: `calculatePricing()` calls `calculateForwardingPricing()` instead of `autoPopulatePricing()`

### 5.4 Test Files Updated

| File | Change |
|------|--------|
| `lib/__tests__/u26r-p1-production-readiness.test.ts` | Updated test to verify browser client is REMOVED and server action pattern is used |
| `lib/__tests__/phase5a2-forwarding-schema-repair.test.ts` | Updated pricing tests to reference new `forwardingActions.ts` |
| `lib/__tests__/static-architecture-gates.test.ts` | Removed `forwarding/pricing.ts` and `forwarding/repository.ts` from browser-client exception list |
| `lib/__tests__/u26-post-u25-architecture-gap-audit.test.ts` | Updated test to verify new server action pattern |

### 5.5 New Test File

**`lib/__tests__/phase5a2r-forwarding-repository-boundary.test.ts`** — 32 tests covering:
- Static boundary (no browser client in repository/pricing)
- Identity & authorization (session-based identity, no client tenant)
- Tenant isolation (RLS preserved on `md_locations` and `fw_price_master`)
- Server action boundary (client component uses server actions)
- Anti-pattern prevention (no `createBrowserClient`, no `supabaseAdmin`, no `USING(true)`)
- Phase 5A-2 preservation (schema repairs intact)

---

## 6. IDENTITY AUTHORITY

### 6.1 Pre-Remediation (BROKEN)

```text
Client Component (AddForwardingItemModal)
        ↓
Browser supabase/client (anon key)
        ↓
Direct DB query (RLS enforced by browser session)
```

**Problem:** The browser client uses the anon key and browser session cookies. This bypasses the canonical identity resolution path.

### 6.2 Post-Remediation (FIXED)

```text
Client Component (AddForwardingItemModal)
        ↓
Server Action (forwardingActions.ts) — 'use server'
        ↓
resolveSessionIdentity() — canonical identity resolver
        ↓
IdentityContext (tenantId, userId, permissions)
        ↓
createClient() from @/lib/supabase/server (server-side client)
        ↓
DB query (RLS enforced by server session)
```

**Result:** Tenant identity is ALWAYS resolved from the authenticated session via `resolveSessionIdentity()`. The server action does NOT accept `tenant_id` as a parameter.

---

## 7. AUTHORIZATION

### 7.1 Current State

The server action `forwardingActions.ts` calls `resolveSessionIdentity()` which:
1. Authenticates the user via `supabase.auth.getUser()`
2. Resolves membership from `tenant_users` and `tenants` tables
3. Validates the requested tenant (if any) against actual membership

The `fetchForwardingLocations()` function is a read-only operation accessible to any authenticated user. The `calculateForwardingPricing()` function is also read-only. Future mutation operations should add `assertPermission(ctx, 'commercial:manage')` before proceeding.

---

## 8. TENANT ISOLATION VERIFICATION

### 8.1 Database RLS (Preserved from Phase 5A-2)

| Table | RLS Status | Policy |
|-------|------------|--------|
| `md_locations` | ENABLED | `fw_locations_tenant_isolation` (via migration 024) |
| `fw_price_master` | ENABLED | `fw_price_master_tenant_isolation` (from migration 171) |

### 8.2 Application Layer (New)

- Server action resolves tenant from `resolveSessionIdentity()` — never from client input
- No `tenant_id` parameter accepted by any exported function
- No `x-tenant-id` header reading
- No query parameter parsing for tenant

---

## 9. REGRESSION

| Baseline | Result | Delta |
|----------|--------|-------|
| TypeScript errors | 0 | 0 |
| Phase 5A-2R tests | 32/32 PASS | +32 |
| Full regression | 1255/1255 PASS | 0 |

**Note:** Full regression count remains 1255/1255. The new Phase 5A-2R tests are in a separate test file (not registered in `scripts/run-full-regression.ts`). This is intentional — the new tests are boundary-repair-specific, and the regression runner already covers the existing security tests.

---

## 10. REMAINING FINDINGS

### 10.1 Remaining from Phase 5A-2

| ID | Description | Status | Plan |
|----|-------------|--------|------|
| FWD-GAP-04 | No integration between canonical `shp_shipments` and legacy `fw_*` | CONTROLLED | Phase 5A-3 |
| FWD-RISK-02 | `fw_container_items.tracking_token` backfilled with non-deterministic tokens | CONTROLLED | Phase 5A-3 (deterministic token migration) |
| FWD-DEBT-01 | Forwarding shell dashboard mock data | DEFERRED | Phase 5A-4 |
| FWD-DEBT-02 | Legacy compatibility views duplicate canonical data | DEFERRED | Phase 5E |

### 10.2 New Findings

No new GAP/RISK/DEBT introduced by Phase 5A-2R.

---

## 11. PHASE 5A-3 READINESS

### 11.1 Prerequisites Met

- All `fw_*` tables have `tenant_id` and RLS (Phase 5A-2)
- Forwarding repository boundary remediated (Phase 5A-2R)
- Server action pattern established for forwarding domain
- P0 security remains intact

### 11.2 Phase 5A-3 Scope (Recommended)

1. Wire `fw_consolidations` → `shp_shipments` lineage
2. Replace `fw_container_items.tracking_token` backfill with deterministic server-side default
3. Build the integration seam between canonical shipments and legacy `fw_*` tables

---

## 12. ABSOLUTE RULES COMPLIANCE

| Rule | Status |
|------|--------|
| Do not restart U-26 | COMPLIANT |
| Do not reopen P0 | COMPLIANT |
| Do not weaken RLS | COMPLIANT |
| Do not introduce `supabaseAdmin` as a shortcut | COMPLIANT |
| Do not trust client tenant identity | COMPLIANT |
| Do not move the browser Supabase client into another abstraction | COMPLIANT (deleted, not moved) |
| Do not implement FCL/LCL in this workstream | COMPLIANT |
| Do not modify commercial architecture | COMPLIANT |
| Do not create a new repository architecture if an accepted server-side pattern exists | COMPLIANT (reused `lib/actions/` pattern) |
| Preserve all existing passing tests | COMPLIANT |
| If a P0 tenant/security regression is discovered, STOP immediately | COMPLIANT (no regression) |
| Do not declare FWD-RISK-01 CLOSED without executable evidence | COMPLIANT (tests + tsc + regression) |

---

## 13. FINAL STATUS

```
PHASE 5A-2R STATUS: GREEN

FWD-RISK-01:
CLOSED

Browser Repository Dependency:
REMOVED

Server Identity Boundary:
VERIFIED

Authorization:
VERIFIED

Tenant Isolation:
VERIFIED

Production Runtime Changes:
- lib/actions/forwardingActions.ts (created)
- components/hq/AddForwardingItemModal.tsx (modified)
- lib/domain/forwarding/repository.ts (deleted)
- lib/domain/forwarding/pricing.ts (deleted)
- src/lib/domain/forwarding/repository.ts (deleted)
- src/lib/domain/forwarding/pricing.ts (deleted)

Migration:
NONE

New Tests:
32/32 PASS (Phase 5A-2R)

TypeScript:
PASS (0 errors)

Full Regression:
1255/1255 PASS

New GAP:
0

New RISK:
0

New DEBT:
0

Phase 5A-3:
READY

Decision:
GREEN — PROCEED
```

---

**END OF PHASE 5A-2R REPORT**
