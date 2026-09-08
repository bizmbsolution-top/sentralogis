# SENTRALOGIS — PHASE 5A WAVE 3
# CONSOLIDATION + STUFFING VERIFICATION / HARDENING

**Date:** 2026-09-05  
**Status:** GREEN — WAVE 3 COMPLETE  
**Phase:** 5A Wave 3 — Consolidation + Stuffing Verification / Hardening  

---

## 1. AUTHORIZATION

```text
Phase 5:
AUTHORIZED — CONTROLLED REMEDIATION

Phase 5A:
AUTHORIZED

Wave:
WAVE 3 — CONSOLIDATION + STUFFING VERIFICATION / HARDENING
```

**Authorization source:** `docs/architecture/SENTRALOGIS_PHASE5_KICKOFF.md`

---

## 2. BASELINE

| Artifact | Status |
|----------|--------|
| Wave 0 | GREEN — READY FOR IMPLEMENTATION |
| Wave 1 | GREEN — SCHEMA FOUNDATION REPAIRED |
| Wave 2 | GREEN — WO NUMBER AUTHORITY & FCL/LCL FLOW HARDENING COMPLETE |
| Wave 2 report | `docs/architecture/SENTRALOGIS_PHASE5A_WAVE2_WO_NUMBER_AUTHORITY.md` |

---

## 3. CONSOLIDATION STATUS

| Area                           | Status | Evidence |
|--------------------------------|--------|----------|
| Consolidation creation         | **REPAIRED** | Server API `app/api/forwarding/consol/route.ts` |
| Consolidation number authority | **VERIFIED** | `next_consol_number()` trigger (migration 052) |
| Tenant isolation               | **VERIFIED** | RLS `fw_consolidations_tenant_isolation` |
| RLS                            | **VERIFIED** | All forwarding tables have tenant-isolated RLS |
| Container assignment           | **VERIFIED** | `fw_container_assignments` FK to `fw_consolidations` |
| Container items                | **VERIFIED** | `fw_container_items` FK to `fw_container_assignments` |
| Lifecycle/status               | **VERIFIED** | `open → stuffing → shipped → arrived → deconsol_done → closed` |
| FCL integration                | **VERIFIED** | Forwarding writer creates container items |
| LCL integration                | **VERIFIED** | Forwarding writer creates container items |

### 3.1 Consolidation Creation — CRITICAL REPAIR

**Finding:** `app/(dashboard)/sbu/forwarding/consol/page.tsx:71-115` performed direct browser Supabase client mutation:
```typescript
const { data, error } = await supabase
  .from('fw_consolidations')
  .insert([payload as any])
```

This bypassed:
1. Server-side authorization (`commercial:manage`)
2. `resolveSessionIdentity()`
3. Canonical `next_consol_number()` DB authority
4. Server-side validation

**Repair:** Created `app/api/forwarding/consol/route.ts` (POST) with:
- `resolveSessionIdentity()` + `assertPermission(ctx, 'commercial:manage')`
- `ctx.tenantId` from canonical session (never from body)
- Server-side validation of required fields
- DB-autonomous `consol_number` via trigger
- Returns `id, consol_number, status`

Updated `consol/page.tsx` to POST to `/api/forwarding/consol` instead of direct Supabase insert.

**Evidence:**
- Source: `app/api/forwarding/consol/route.ts`
- Locator: lines 12-13, 18, 76-87
- Evidence: `resolveSessionIdentity()`, `assertPermission(ctx, 'commercial:manage')`, `tenant_id: ctx.tenantId`
- Confidence: HIGH

---

## 4. STUFFING STATUS

| Area                  | Status | Evidence |
|-----------------------|--------|----------|
| API                   | **VERIFIED** | `app/api/forwarding/consol/[id]/stuff/route.ts` |
| UI                    | **VERIFIED** | No client-side mutations in stuffing page |
| Authorization         | **VERIFIED** | `resolveSessionIdentity()` + `commercial:manage` |
| Tenant ownership      | **VERIFIED** | Container query scoped to `tenant_id = ctx.tenantId` |
| Container ownership   | **REPAIRED** | Added `consolidation_id` cross-check |
| Capacity validation   | **REPAIRED** | Added volume vs `max_volume_cbm` check |
| Duplicate assignment  | **REPAIRED** | Added duplicate item + cross-container checks |
| Status transitions    | **VERIFIED** | Skips already stuffed/shipped containers |
| Transaction integrity | **NOTED** | Multiple separate mutations; no DB transaction wrapper |
| Concurrency           | **NOTED** | No explicit locking; DB constraints provide partial safety |

### 4.1 Stuffing API — REPAIRED

**Location:** `app/api/forwarding/consol/[id]/stuff/route.ts`

**Repairs applied:**

1. **Cross-consolidation container check** (lines added):
```typescript
if (container.consolidation_id !== id) {
  return NextResponse.json({ success: false, error: `Container ${container.container_number} bukan bagian dari konsolidasi ini` }, { status: 400 });
}
```

2. **Duplicate assignment check** (lines added):
```typescript
const existingWoItemIds = new Set((existingItems || []).map(i => i.wo_item_id));
const duplicateItems = wo_item_ids.filter(woId => existingWoItemIds.has(woId));
if (duplicateItems.length > 0) {
  return NextResponse.json({ success: false, error: `Item ${duplicateItems.join(', ')} sudah di-assign ke container ini` }, { status: 409 });
}
```

3. **Cross-container assignment check** (lines added):
```typescript
const { data: otherAssignments } = await supabaseAdmin
  .from('fw_container_items')
  .select('id, container_assignment_id')
  .in('wo_item_id', wo_item_ids)
  .neq('container_assignment_id', container_assignment_id)
  .eq('tenant_id', tenant_id);

if (otherAssignments && otherAssignments.length > 0) {
  return NextResponse.json({ success: false, error: 'Salah satu item sudah di-assign ke container lain' }, { status: 409 });
}
```

4. **Capacity validation** (lines added):
```typescript
const currentVolume = (existingItems || []).reduce((sum, i) => sum + (Number(i.volume_cbm) || 0), 0);
const totalVolume = currentVolume + newItemVolume;

if (container.max_volume_cbm != null && totalVolume > container.max_volume_cbm) {
  return NextResponse.json({ success: false, error: `Total volume ${totalVolume.toFixed(2)} CBM melebihi kapasitas container ${container.max_volume_cbm} CBM` }, { status: 409 });
}
```

### 4.2 Transaction Integrity — NOTED (Out of Scope)

The stuffing and deconsol APIs perform multiple separate mutations without a database transaction wrapper. If a failure occurs mid-operation, partial state may result. This is a known architectural gap. Repair would require converting to a stored procedure or transaction wrapper, which is a larger change than Wave 3 scope permits. **Documented for Wave 4+.**

---

## 5. CLIENT MUTATION SECURITY

| Finding | Status |
|---------|--------|
| Direct browser mutations in consolidation UI | **REPAIRED** |
| Direct browser mutations in stuffing UI | NONE FOUND |
| Direct browser mutations in consolidation detail UI | NONE FOUND |

### 5.1 Consolidation List Page

**Before:** `supabase.from('fw_consolidations').insert([...])` in browser client
**After:** `fetch('/api/forwarding/consol', { method: 'POST' })` server API

### 5.2 Stuffing Page

**Result:** NO client-side mutations found. All reads only.

### 5.3 Consolidation Detail Page

**Result:** NO client-side mutations found. All reads only.

---

## 6. CANONICAL ARCHITECTURE

| Entity | Canonical Table | Authority |
|--------|-----------------|-----------|
| Consolidation | `fw_consolidations` | DB trigger `generate_fw_consol_number()` → `next_consol_number()` |
| Container Assignment | `fw_container_assignments` | Server API with tenant validation |
| Container Item | `fw_container_items` | Server API with ownership validation |
| Box Assignment | `fw_box_assignments` | Server API with tenant validation |
| Box Item | `fw_box_items` | Server API with tenant validation |

---

## 7. SECURITY VALIDATION

| Control | Status | Evidence |
|---------|--------|----------|
| Tenant isolation | **PASS** | RLS on `fw_consolidations`, `fw_container_assignments`, `fw_container_items` |
| Authorization | **PASS** | `assertPermission(ctx, 'commercial:manage')` on all mutation routes |
| RLS | **PASS** | `tenant_id = public.get_my_tenant_id()` enforced at DB level |
| Cross-tenant references | **PASS** | Container must belong to consolidation; items cannot cross containers |
| Capacity enforcement | **PASS** | Volume vs `max_volume_cbm` validated server-side |
| Status integrity | **PASS** | Invalid status transitions rejected (e.g., deconsol requires arrived/shipped) |
| Client mutation security | **PASS** | All mutations routed through server APIs |
| Consolidation number authority | **PASS** | DB trigger with `next_consol_number()` |

---

## 8. TEST RESULTS

| Test Suite | Result |
|------------|--------|
| Phase 5A-2 Forwarding Schema Repair | 43/43 PASS |
| Phase 5A-5 FCL/LCL Workflow | 24/24 PASS |
| Phase 5A-3 Forwarding Vertical Slice | PASS |
| Phase 5A-2R Forwarding Repository Boundary | PASS |
| Phase 5A-4 Operational Assignment | PASS |
| Phase 5A Wave 3 Consolidation + Stuffing Verification | 32/32 PASS |
| **Total** | **193/193 PASS** |

**TypeScript:** 0 errors  
**Full regression:** NOT RUN (not required per Wave 3 gate)

---

## 9. FILES CHANGED

| File | Change |
|------|--------|
| `app/api/forwarding/consol/route.ts` | NEW — Server API for consolidation creation with auth + tenant isolation |
| `app/(dashboard)/sbu/forwarding/consol/page.tsx` | UPDATED — Replaced direct Supabase insert with server API call |
| `app/api/forwarding/consol/[id]/stuff/route.ts` | UPDATED — Added cross-consolidation check, duplicate assignment protection, capacity validation |
| `lib/__tests__/phase5a3-consolidation-stuffing-verification.test.ts` | NEW — 32 tests for consolidation/stuffing verification |

---

## 10. CHANGE INTEGRITY

| Category | Count |
|----------|-------|
| Production changes | 3 files (1 new API, 2 updated) |
| Schema changes | 0 |
| Migrations | 0 |
| Data mutations | 0 |
| ADR changes | 0 |
| UI changes | 1 (consol list page) |
| API changes | 1 (new consol creation API) |
| Service changes | 1 (stuffing API hardening) |
| Tests executed | 193 |
| Deployment | 0 |
| Git commits | 0 |

---

## 11. KNOWN GAPS (OUT OF SCOPE FOR WAVE 3)

| Gap | Severity | Recommendation |
|-----|----------|----------------|
| No DB transaction wrapper in stuffing API | MEDIUM | Documented for Wave 4+ |
| No DB transaction wrapper in deconsol API | MEDIUM | Documented for Wave 4+ |
| `max_volume_cbm` optional (nullable) | LOW | If capacity enforcement is mandatory, make NOT NULL |
| `volume_cbm` on `fw_container_items` optional | LOW | If capacity enforcement is mandatory, make NOT NULL |

---

## 12. FINAL RESPONSE

PHASE 5A WAVE 3 STATUS: **GREEN**

Consolidation: **VERIFIED + REPAIRED**
- Server API created with authorization + tenant isolation
- Client-side direct mutation eliminated

Container Assignment: **VERIFIED + REPAIRED**
- Cross-consolidation assignment blocked
- Duplicate assignment blocked
- Capacity validation enforced

Container Items: **VERIFIED**

Stuffing: **VERIFIED + REPAIRED**
- Authorization enforced
- Tenant isolation enforced
- Capacity validation enforced
- Duplicate/cross-container assignment blocked

Tenant/Security: **VERIFIED**

Targeted validation: **193/193 PASS**

Next:
PHASE 5A WAVE 4 — DECONSOLIDATION + DELIVERY JO

HARD STOP

---

**END OF PHASE 5A WAVE 3 REPORT**
