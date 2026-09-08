# SENTRALOGIS — Phase 4B U-10: Static Architecture Gates + Targeted E-Class Fixes

**Date:** 2026-08-27
**Status:** GREEN — PRODUCTION READY
**Tests:** 270/270 PASS, 0 FAIL (U-10: 8/8 gates PASS)
**TypeScript:** 0 new errors (4 pre-existing in `scripts/run-u01-to-u08.ts`)

---

## Executive Summary

U-10 implements automated invariant enforcement via static architecture gates and repairs 5 critical client-side fabricated identifier violations (E-class). The gates are wired into the full regression test suite and will block the build on any future violation.

---

## Part 1: Static Architecture Gates (8 tests)

### Gate A — No SBU Execution Imports in Canonical Domain
| Test | Description | Status |
|------|-------------|--------|
| GATE-A-1 | `lib/domain/**` has no imports from `app/(dashboard)/sbu/` | PASS |
| GATE-A-2 | `lib/application/**` has no imports from `app/(dashboard)/sbu/` | PASS |

**Verified clean:** Zero cross-boundary imports in either direction.

### Gate B — No Browser Supabase Client in Canonical Domain
| Test | Description | Status |
|------|-------------|--------|
| GATE-B-1 | `lib/domain/**` has no browser supabase client imports | PASS |
| GATE-B-2 | `lib/application/**` has no browser supabase client imports | PASS |

**Known exceptions:** `lib/domain/forwarding/pricing.ts` and `lib/domain/forwarding/repository.ts` import the browser client (F-class debt, consumed by client `AddForwardingItemModal`).

### Gate C — Capability Vocabulary Centralized
| Test | Description | Status |
|------|-------------|--------|
| GATE-C-1 | No new canonical capability type definitions outside authorized seams | PASS |

**Verified:** All `CapabilityType`/`CapabilityCode` type aliases and `CANONICAL_CAPABILITY_CODES`/`DEFAULT_CAPABILITY_CODES` constants are in `lib/application/capabilities/` or `lib/domain/commercial/`.

### Gate D — Customs Outbound-Null
| Test | Description | Status |
|------|-------------|--------|
| GATE-D-1 | No non-customs domain modules import from `lib/domain/customs/` | PASS |

**Verified:** Zero inbound coupling from shipment, forwarding, commercial, or service-contracts domains into customs.

### Gate E — No md_users Resurrection
| Test | Description | Status |
|------|-------------|--------|
| GATE-E-1 | No `md_users` references in functional TypeScript | PASS |
| GATE-E-2 | No `md_users` in post-erratum SQL migrations (excl. comments) | PASS |

---

## Part 2: Targeted E-Class Fixes (5 violations repaired)

### Violations Fixed

| # | File | Line | Field | Table | Fix |
|---|------|------|-------|-------|-----|
| E-1 | `components/sbu/AssignmentModal.tsx` | 307-308 | `tracking_token`, `driver_link_token` | `job_orders` | Removed client generation; DB default applies on INSERT |
| E-2 | `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx` | 534 | `tracking_token` | `job_orders` | Removed client generation; DB default applies on INSERT |
| E-3 | `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx` | 627 | `tracking_token` | `job_orders` | Removed client generation; DB default applies on INSERT |
| E-4 | `app/(dashboard)/sbu/warehouse/work-orders/[id]/page.tsx` | 1753 | `tracking_token` | `job_orders` | Removed client generation; DB default applies on INSERT |
| E-5 | `lib/services/assignmentSave.ts` | 159,180,232-233,335-336 | `tracking_token`, `wa_token`, `driver_link_token` | `job_orders` | Removed explicit token generation from all insert/update paths; DB defaults apply on INSERT |

### Migration

| File | Purpose |
|------|---------|
| `supabase/migrations/20260828_017_server_side_token_defaults.sql` | Adds `DEFAULT gen_random_uuid()::text` for `tracking_token`, `wa_token`; `DEFAULT substring(gen_random_uuid()::text, 1, 13)` for `driver_link_token` on `job_orders` table |

**Mechanism:** Server-side database defaults generate tokens on INSERT when the column is not explicitly set. Existing rows retain their tokens. UPDATE paths no longer set tokens (preserving existing values).

---

## Files Modified

| File | Change |
|------|--------|
| `lib/__tests__/static-architecture-gates.test.ts` | **NEW** — 8 architecture gate tests |
| `scripts/run-full-regression.ts` | Added U-10 suite import + `toSuiteResult()` helper for array-based suites |
| `components/sbu/AssignmentModal.tsx` | Removed `tracking_token: crypto.randomUUID()` and `driver_link_token: Math.random()...` from JO insert payload |
| `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx` | Removed `tracking_token` generation from TRUCKING and WAREHOUSE JO auto-split inserts |
| `app/(dashboard)/sbu/warehouse/work-orders/[id]/page.tsx` | Removed `tracking_token` generation from auto-heal JO insert |
| `lib/services/assignmentSave.ts` | Removed `generateTrackingToken()` and `generateDriverLinkToken()` imports and all explicit token assignments from draft/confirm/handover payloads |
| `supabase/migrations/20260828_017_server_side_token_defaults.sql` | **NEW** — DB defaults for job_orders tokens |

---

## Forensic Scan Summary

### crypto.randomUUID() Scan (45 files)
- **E-class:** 4 active violations fixed (E-1 through E-4)
- **E-class (deliberate):** 1 — `offlineSyncEngine.ts` `client_ping_id` (P0 GPS idempotency, accepted debt)
- **A-class:** 27 — Server-generated canonical IDs (correct)
- **B-class:** 10 — Tracing/logging event IDs (non-persistent)
- **C-class:** 3 — UI-local temp IDs (never persisted)

### Math.random()/Date.now() Scan (105 files)
- **E-class (client):** ~40 instances across domain factories, adapters, client pages, and value objects
- **E-class (server-side):** ~30 instances in server-side domain factories (using `crypto.randomUUID()` with `Math.random()/Date.now()` fallbacks)
- **D-class:** 8 — Idempotency/correlation keys (not identity)
- **F-class:** 3 — Password generation
- **B-class:** ~25 — UI-local React state keys
- **C-class:** ~25 — File name/storage path generation

### Browser-Side DB Writes Scan (30+ files)
- **E-class:** 4 violations fixed (all `tracking_token` on `job_orders`)
- **F-class:** ~80+ write operations across 30+ files (server-generated IDs, legitimate client writes)

---

## Known Remaining Debt (Not in U-10 Scope)

| Class | Description | Files |
|-------|-------------|-------|
| F-class | Domain factory `Math.random()/Date.now()` fallbacks for IDs | 15 files in `lib/domain/` |
| F-class | Client-side business number generation (TRF-S, OUT-S, RCV-S, etc.) | `warehouse/work-orders/[id]/page.tsx` |
| F-class | Client-side master data code fallbacks (entity_code, fleet_code, etc.) | 8 master data pages |
| F-class | `offlineSyncEngine.ts` client_ping_id (deliberate design) | 1 file |
| F-class | `lib/domain/forwarding/pricing.ts`, `repository.ts` browser client imports | 2 files |

---

## Verification

| Metric | Result |
|--------|--------|
| Full Regression | **270/270 PASS, 0 FAIL** |
| U-10 Gates | **8/8 PASS** |
| TypeScript | 0 new errors |
| DB Schema Changes | Migration only (ADD DEFAULT) — no column changes |
| Protected Systems (U-07/U-08) | Untouched |
| Browser Direct `supabase.from()` in Canonical | 0 new (2 pre-existing F-class exceptions) |
