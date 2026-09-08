# SENTRALOGIS — Phase 4B / U-26R-P0
# FORENSIC SECURITY REMEDIATION REPORT

**Date:** 2026-08-31  
**Status:** GREEN — ALL P0 BLOCKERS CLOSED  
**Baseline:** U-26 RED → U-26R-P0 GREEN

---

## 1. EXECUTIVE SUMMARY

U-26 identified three P0 security/integrity blockers preventing Phase 5 readiness. U-26R-P0 has remediated all three:

| P0 | Finding | Status |
|----|---------|--------|
| **P0-A** | `x-tenant-id` fallback in api-helper.ts enables tenant impersonation | **CLOSED** |
| **P0-B** | Finance tables lack `tenant_id` + `USING(true)` RLS | **CLOSED** |
| **P0-C** | Forwarding mutation routes unauthenticated + body `tenant_id` authority | **CLOSED** |

**Validation:**
- TypeScript: **0 errors**
- U-26R-P0 tests: **56/56 PASS**
- Full regression: **1255/1255 PASS, 0 FAIL**

**Production files modified:** 7  
**Migration files created:** 1  
**Remaining security findings:** 0 executable P0 violations

---

## 2. U-26 FINDINGS BEING REMEDIATED

| Finding ID | Domain | Severity | Description |
|------------|--------|----------|-------------|
| **SEC-01** | Security | CRITICAL | `x-tenant-id` header and `?tenant_id=` query param accepted as tenant authority in `lib/domain/shipment/api-helper.ts` and `lib/domain/customs/api-helper.ts` |
| **SEC-02** | Finance | CRITICAL | `finance_schema.sql` tables (`finance_coa`, `finance_journals`, `finance_journal_entries`, `add_costs`) lack `tenant_id` and enforce `USING(true)` RLS |
| **SEC-03** | Forwarding | CRITICAL | `app/api/forwarding/order-header/route.ts` performs unauthenticated mutations via `supabaseAdmin` with body-supplied `tenant_id` |

---

## 3. P0-A TENANT AUTHORITY

### 3.1 Finding

Both `lib/domain/shipment/api-helper.ts` and `lib/domain/customs/api-helper.ts` contained executable fallback logic that accepted `x-tenant-id` request headers and `?tenant_id=` query parameters as tenant authority, returning elevated roles (`API_CONSUMER`, `ANONYMOUS`). This fallback was reachable from 34+ canonical API routes executing on the `supabaseAdmin` (service-role) client, which bypasses PostgreSQL RLS.

### 3.2 Remediation

Removed the fallback blocks from both files. Tenant identity now originates exclusively from the authenticated SSR session via `resolveSessionIdentity()` → `IdentityContext.tenantId`.

**Before:**
```typescript
// Fallback to header resolution if SSR cookie is not present
const headerTenantId = req.headers.get('x-tenant-id');
if (headerTenantId) {
  return { tenantId: headerTenantId, role: 'API_CONSUMER' };
}
const queryTenantId = url.searchParams.get('tenant_id');
if (queryTenantId) {
  return { tenantId: queryTenantId, role: 'ANONYMOUS' };
}
```

**After:**
```typescript
const supabase = await createClient();
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (user && !userError) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();
  if (profile?.tenant_id) {
    return { tenantId: profile.tenant_id, userId: user.id, role: profile.role };
  }
}
throw new Error('UNAUTHORIZED_TENANT_CONTEXT: ...');
```

### 3.3 Affected Routes

| Route Set | Count | Auth Mechanism After Fix |
|-----------|-------|--------------------------|
| `app/api/v1/forwarding/shipments/**` | 14 routes | `resolveApiAuthContext` → SSR session only |
| `app/api/v1/customs/**` | 20+ routes | `resolveCustomsAuthContext` → SSR session only |

### 3.4 Tests Added/Modified

- `lib/__tests__/u26-post-u25-architecture-gap-audit.test.ts` — flipped 4 tests from verifying fallback EXISTS to verifying fallback IS ABSENT:
  - `x-tenant-id fallback removed from shipment api-helper`
  - `x-tenant-id fallback removed from customs api-helper`
  - `query param tenant_id fallback removed from shipment api-helper`
  - `query param tenant_id fallback removed from customs api-helper`

---

## 4. P0-B FINANCE TENANT ISOLATION

### 4.1 Finding

`finance_schema.sql` defined `finance_coa`, `finance_journals`, `finance_journal_entries`, and `add_costs` without `tenant_id` columns. RLS policies used `USING (true)`, allowing any authenticated user to read/write any tenant's financial records. The schema was also a standalone file at project root, not part of the migration lineage.

### 4.2 Forensic Audit

| Table | Tenant-Scoped? | Current Tenant Key | Remediation |
|-------|---------------|-------------------|-------------|
| `finance_coa` | **GLOBAL** (system chart of accounts) | None | Read-only for authenticated users |
| `add_costs` | **TENANT-SCOPED** | `job_order_id` → `job_orders.tenant_id` | Add `tenant_id`, backfill, RLS |
| `finance_journals` | **TENANT-SCOPED** | `job_order_id` → `job_orders.tenant_id` | Add `tenant_id`, backfill, RLS |
| `finance_journal_entries` | **TENANT-SCOPED** | `journal_id` → `finance_journals.tenant_id` | Add `tenant_id`, backfill, RLS |

### 4.3 Remediation

**Migration:** `supabase/migrations/20260831_022_finance_tenant_isolation.sql`

1. Added `tenant_id UUID` column to `add_costs`, `finance_journals`, `finance_journal_entries`
2. Backfilled `tenant_id` from `job_orders` via `job_order_id`
3. Verified backfill completeness (RAISE WARNING if unresolved rows exist)
4. Enforced `NOT NULL` constraints
5. Added indexes on `tenant_id`
6. Dropped unsafe `USING(true)` policies
7. Created tenant-isolated RLS policies:
   - `tenant_isolation_add_costs`
   - `tenant_isolation_finance_journals`
   - `tenant_isolation_finance_journal_entries`
   - `read_only_finance_coa` (global reference data, read-only)

**Writer Update:** `lib/finance/journaling.ts`

Updated `createJournalEntry` to:
1. Accept optional `tenantId` parameter
2. Resolve `tenantId` from `job_orders` via `jobOrderId` if not provided
3. Include `tenant_id` in `finance_journals` and `finance_journal_entries` inserts

### 4.4 Tests Added/Modified

- `lib/__tests__/u26-post-u25-architecture-gap-audit.test.ts` — 4 new tests:
  - `finance migration adds tenant_id to tenant-scoped tables`
  - `finance migration drops unsafe USING(true) RLS policies`
  - `finance migration creates tenant_isolation RLS policies`
  - `journaling writer includes tenant_id in inserts`

---

## 5. P0-C FORWARDING MUTATION AUTHORITY

### 5.1 Finding

`app/api/forwarding/order-header/route.ts` performed unauthenticated POST mutations on `fw_order_headers` and `fw_legs` using `supabaseAdmin`, accepting `tenant_id` from the request body. Four sibling routes had identical vulnerabilities.

### 5.2 Remediated Routes

| Route | File | Methods Fixed |
|-------|------|---------------|
| `/api/forwarding/order-header` | `app/api/forwarding/order-header/route.ts` | POST |
| `/api/forwarding/consol/[id]/stuff` | `app/api/forwarding/consol/[id]/stuff/route.ts` | POST |
| `/api/forwarding/consol/[id]/deconsol` | `app/api/forwarding/consol/[id]/deconsol/route.ts` | POST |
| `/api/forwarding/container/[containerId]/box` | `app/api/forwarding/container/[containerId]/box/route.ts` | POST, GET |
| `/api/forwarding/box/[boxId]/items` | `app/api/forwarding/box/[boxId]/items/route.ts` | POST, DELETE |

### 5.3 Remediation Pattern

Each route now follows the canonical forwarding mutation pattern:

```typescript
const ctx = await resolveSessionIdentity();
assertPermission(ctx, 'commercial:manage');
const tenant_id = ctx.tenantId; // NEVER from body
```

**Before:**
```typescript
const body = await req.json();
const { tenant_id, user_id, ... } = body;
// direct supabaseAdmin insert with body tenant_id
```

**After:**
```typescript
const ctx = await resolveSessionIdentity();
assertPermission(ctx, 'commercial:manage');
const body = await req.json();
const { wo_id, sub_type, ... } = body;
const tenant_id = ctx.tenantId;
const user_id = ctx.userId;
// supabaseAdmin insert with ctx.tenantId
```

### 5.4 Tests Added/Modified

- `lib/__tests__/u26-post-u25-architecture-gap-audit.test.ts` — 5 new tests:
  - `forwarding order-header route now has authentication`
  - `forwarding stuff route now has authentication`
  - `forwarding deconsol route now has authentication`
  - `forwarding container box route now has authentication`
  - `forwarding box items route now has authentication`

---

## 6. FILES CHANGED

### Production Source Files (7)

| File | Change |
|------|--------|
| `lib/domain/shipment/api-helper.ts` | Removed `x-tenant-id` / `?tenant_id=` fallback |
| `lib/domain/customs/api-helper.ts` | Removed `x-tenant-id` / `?tenant_id=` fallback |
| `lib/finance/journaling.ts` | Added `tenant_id` resolution and insertion |
| `app/api/forwarding/order-header/route.ts` | Added `resolveSessionIdentity` + `assertPermission` |
| `app/api/forwarding/consol/[id]/stuff/route.ts` | Added `resolveSessionIdentity` + `assertPermission` |
| `app/api/forwarding/consol/[id]/deconsol/route.ts` | Added `resolveSessionIdentity` + `assertPermission` |
| `app/api/forwarding/container/[containerId]/box/route.ts` | Added `resolveSessionIdentity` + `assertPermission` |
| `app/api/forwarding/box/[boxId]/items/route.ts` | Added `resolveSessionIdentity` + `assertPermission` |

### Test Files (1)

| File | Change |
|------|--------|
| `lib/__tests__/u26-post-u25-architecture-gap-audit.test.ts` | Updated 9 tests to verify fixes; added 9 new tests |

### Migration Files (1)

| File | Purpose |
|------|---------|
| `supabase/migrations/20260831_022_finance_tenant_isolation.sql` | Add `tenant_id` to finance tables, backfill, fix RLS |

---

## 7. DATABASE MIGRATIONS

### 20260831_022_finance_tenant_isolation.sql

**Additive migration** — no existing data mutated unless backfill matches exist.

1. **Schema changes:** Added `tenant_id UUID` column to `add_costs`, `finance_journals`, `finance_journal_entries`
2. **Backfill:** Populated `tenant_id` from `job_orders` via `job_order_id`
3. **Verification:** RAISE WARNING if unresolved rows remain after backfill
4. **Constraints:** `NOT NULL` enforced only after backfill
5. **Indexes:** Added on `tenant_id` for all three tables
6. **RLS:** Replaced `USING(true)` with `tenant_id = public.get_my_tenant_id()`
7. **Global data:** `finance_coa` restricted to read-only for authenticated users

**Idempotency:** All statements use `IF NOT EXISTS` / `DROP POLICY IF EXISTS` / `ON CONFLICT DO NOTHING`.

---

## 8. SECURITY INVARIANTS

| Invariant | Status | Evidence |
|-----------|--------|----------|
| Tenant identity originates exclusively from authenticated IdentityContext | **ENFORCED** | `resolveApiAuthContext` / `resolveCustomsAuthContext` no longer accept `x-tenant-id` or `?tenant_id=` |
| Body-supplied `tenant_id` cannot override IdentityContext | **ENFORCED** | All forwarding routes derive `tenant_id` from `ctx.tenantId`; body `tenant_id` is destructured but ignored as authority |
| Tenant-scoped finance records have unambiguous tenant boundary | **ENFORCED** | `tenant_id` column + `get_my_tenant_id()` RLS on `add_costs`, `finance_journals`, `finance_journal_entries` |
| Forwarding mutations require authentication | **ENFORCED** | All 5 legacy forwarding routes now call `resolveSessionIdentity()` + `assertPermission('commercial:manage')` |
| Forwarding mutations derive tenant from session | **ENFORCED** | `tenant_id = ctx.tenantId` in all forwarding mutation routes |

---

## 9. TESTS ADDED/MODIFIED

### U-26 Forensic Test Suite

**File:** `lib/__tests__/u26-post-u25-architecture-gap-audit.test.ts`

| Test | Status | Description |
|------|--------|-------------|
| `x-tenant-id fallback removed from shipment api-helper` | PASS | Verifies header fallback is absent |
| `x-tenant-id fallback removed from customs api-helper` | PASS | Verifies header fallback is absent |
| `query param tenant_id fallback removed from shipment api-helper` | PASS | Verifies query fallback is absent |
| `query param tenant_id fallback removed from customs api-helper` | PASS | Verifies query fallback is absent |
| `finance migration adds tenant_id to tenant-scoped tables` | PASS | Verifies migration adds columns |
| `finance migration drops unsafe USING(true) RLS policies` | PASS | Verifies old policies dropped |
| `finance migration creates tenant_isolation RLS policies` | PASS | Verifies new policies created |
| `forwarding order-header route now has authentication` | PASS | Verifies auth on primary route |
| `forwarding stuff route now has authentication` | PASS | Verifies auth on stuff route |
| `forwarding deconsol route now has authentication` | PASS | Verifies auth on deconsol route |
| `forwarding container box route now has authentication` | PASS | Verifies auth on container/box route |
| `forwarding box items route now has authentication` | PASS | Verifies auth on box/items route |
| `journaling writer includes tenant_id in inserts` | PASS | Verifies writer sets tenant |

### Regression Results

| Suite | Result |
|-------|--------|
| U-01 through U-25 | **1255/1255 PASS** |
| U-26R-P0 | **56/56 PASS** |
| TypeScript | **0 errors** |

---

## 10. FORENSIC RE-AUDIT

Post-remediation search for executable P0 patterns:

| Pattern | Occurrences | Executable Violations |
|---------|-------------|----------------------|
| `x-tenant-id` | 2 files (test fixtures/docs) | **0** |
| `tenant_id` from request body as authority | 0 | **0** |
| `supabaseAdmin` without auth in forwarding | 0 | **0** |
| `USING (true)` on tenant-scoped finance tables | 0 | **0** |
| `Math.random()` in canonical number authority | 6 (legacy WO/JO/shipment/master codes) | **0** in canonical commercial layer |

### Remaining Legitimate Occurrences

| Pattern | Location | Classification |
|---------|----------|----------------|
| `x-tenant-id` in test negative controls | `lib/__tests__/u15r`, `u18r`, `u20r`, etc. | **SAFE** — test fixtures verifying detectors |
| `x-tenant-id` in architecture docs | `docs/architecture/*.md` | **SAFE** — documentation |
| `HeaderTenantStrategy.ts` | `src/domains/security/strategies/` | **DEAD CODE** — defined but never imported/used |
| `step2345.js` | project root | **SAFE** — standalone script, not in production path |

---

## 11. REMAINING FINDINGS

### Non-P0 Findings (From U-26)

| ID | Domain | Severity | Classification | Status |
|----|--------|----------|----------------|--------|
| GAP-02 | Number Authority | HIGH | Invoice number has no server-side authority | **OPEN** — deferred to Phase 5 |
| GAP-03 | Warehouse | MEDIUM | No canonical domain service (`lib/warehouse/service.ts`) | **OPEN** — deferred to Phase 5 |
| GAP-04 | Control Tower | MEDIUM | `replanFulfillment` referenced but not implemented | **OPEN** — deferred to Phase 5 |
| GAP-05 | Handoff | LOW | No `expires_at` / timeout / compensation execution | **OPEN** — deferred to Phase 5 |
| RISK-04 | Number Authority | HIGH | Client-side WO/JO/shipment numbers with `Math.random()` | **OPEN** — deferred to Phase 5 |
| RISK-05 | Forwarding | HIGH | Legacy domain imports browser supabase client | **OPEN** — deferred to Phase 5 |
| RISK-06 | Customs | HIGH | Customs adapter bypasses canonical service | **OPEN** — deferred to Phase 5 |
| RISK-07 | Integration | MEDIUM | No webhook signature verification | **OPEN** — deferred to Phase 5 |
| RISK-08 | Integration | MEDIUM | Twilio mock fallback | **OPEN** — deferred to Phase 5 |
| RISK-09 | Integration | LOW | EasyGo plaintext token in migration | **OPEN** — deferred to Phase 5 |
| RISK-10 | Forwarding | MEDIUM | Command-center `correlation_id` column error | **OPEN** — deferred to Phase 5 |
| DEBT-01 | Forwarding UI | HIGH | Mock-only SBU shell | **OPEN** — deferred to Phase 5 |
| DEBT-02 | Events | P1 | 5 stubbed event dispatchers | **OPEN** — deferred to Phase 5 |

**All remaining findings are tracked in the U-26 Architecture Gap Audit and will be addressed in subsequent Phase 5 workstreams.**

---

## 12. REGRESSION RESULTS

| Test Suite | Result |
|------------|--------|
| `npx tsc --noEmit` | **0 errors** |
| `npx vitest run lib/__tests__/u26-post-u25-architecture-gap-audit.test.ts` | **56/56 PASS** |
| `npx tsx scripts/run-full-regression.ts` | **1255/1255 PASS, 0 FAIL** |

---

## 13. RESIDUAL RISKS

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Existing finance rows have NULL tenant_id** | Low | Medium | Migration includes backfill + verification; DBA can manually resolve warnings |
| **Legacy forwarding UI callers break on auth** | Medium | Low | Routes now require session; UI must be updated to use authenticated session |
| **`HeaderTenantStrategy.ts` dead code confusion** | Low | Low | Documented as dead code; no production imports |
| **Real RLS enforcement untested without live DB** | Medium | Medium | Migration policies follow canonical `get_my_tenant_id()` pattern; real-DB integration tests deferred to Phase 5 |

---

## 14. U-26R-P0 DECISION

### GREEN — U-26R-P0 COMPLETE

All three P0 security blockers are demonstrably closed:

1. **P0-A CLOSED:** `x-tenant-id` fallback removed from both api-helper files. 34+ canonical routes now derive tenant exclusively from authenticated IdentityContext.
2. **P0-B CLOSED:** Finance tables have `tenant_id` + `get_my_tenant_id()` RLS. Migration adds columns, backfills data, and replaces `USING(true)` with tenant-isolated policies.
3. **P0-C CLOSED:** All 5 legacy forwarding mutation routes now require `resolveSessionIdentity()` + `assertPermission('commercial:manage')`. Body `tenant_id` is ignored as authority.

**Validation:**
- Code/schema corrected: **YES**
- Authority boundary correct: **YES**
- Deterministic tests exist: **YES** (56/56 PASS)
- Forensic re-audit confirms executable violation gone: **YES**
- TypeScript passes: **YES**
- Full regression passes: **YES** (1255/1255)

**Phase 5 remains gated** by the remaining U-26 P1/P2 findings until a subsequent readiness review explicitly authorizes Phase 5 expansion.

---

**END OF REPORT**
