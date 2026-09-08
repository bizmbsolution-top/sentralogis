# SENTRALOGIS — DATA-4E-BR9
# PARTY ROLE AUTHORITY TRANSITION — FORENSIC DISCOVERY & READINESS

**Date:** 2026-09-02
**Phase:** DATA-4E-BR9
**Type:** READ-ONLY FORENSIC DISCOVERY / TRANSITION READINESS
**Depends on:** DATA-4E-BR3, BR4, BR4R, BR5, BR5R, BR6, BR7, BR8
**Status:** EXECUTE DISCOVERY ONLY

---

## 1. Executive Decision

| Item | Result |
|------|--------|
| Consumer inventory | **YELLOW** — re-verified current writer/reader set; scope is bounded and known |
| Writer inventory | **YELLOW** — 3 effective writers (W1, W2, W4); W3 is derived display only |
| Reader inventory | **YELLOW** — ≥30 direct reader sites + many nested joins confirmed; priority classification done |
| Semantic equivalence | **YELLOW** — current mapping is correct; perpetual equivalence not guaranteed |
| Drift controls | **RED** — no automatic drift prevention; BR8 index prevents canonical duplicates but not legacy/canonical drift |
| Dual-write readiness | **RED** — no dual-write mechanism; W1/W2/W4 still write legacy only |
| P0 consumers | **GREEN** — no P0 security/authorization consumer found that reads `is_vendor` directly |
| P1 consumers | **YELLOW** — business-rule enforcement (assignment.ts, AssignmentModal, etc.) identified; migration requires careful adapter |
| Special consumers | **YELLOW** — 3 known special consumers; `assignment.ts:282` confirmed as derived classification (not direct is_vendor read) |
| Authority cutover | **NOT READY** — all readiness criteria unmet |
| **Overall** | **YELLOW** — architecture/design work required before next implementation gate |

**No production changes were made. No migrations were executed. No code was modified.**

---

## 2. Baseline Reuse

Reused from prior phases (not rediscovered):

- **BR3 (Migration 035 compatibility):** Foundation compatible. `tenants`, `md_entities`, `get_my_tenant_id()` present. `uq_party_role` with nullable `context_id`.
- **BR4 (Migration 035 execution):** Schema deployed. 4 tables, RLS, FKs, indexes, triggers.
- **BR4R (Cardinality gap):** `uq_party_role` insufficient for `context_id IS NULL` duplicates.
- **BR5 (Migration 038 execution):** 62 backfill rows (43 CUSTOMER + 3 SUPPLIER + 16 VENDOR + 0 BROKER).
- **BR5R (All-role reconciliation):** All 4 roles reconcile; 0 missing, 0 extra, 0 duplicate, 0 cross-tenant, 0 orphan.
- **BR6 (Architecture discovery):** YELLOW. Authority = CONDITIONAL YES. Cardinality = YES (partial index). Transition = Model C → B.
- **BR7 (ADR drafts):** ADR-077 + ADR-070 Amendment drafted.
- **BR8 (Index implementation):** `idx_party_roles_global_unique` partial unique index deployed. ADR-070 Amendment and ADR-077 RATIFIED.

Current authoritative state:

| Aspect | Value |
|--------|-------|
| `party_roles` | Deployed, 62 rows |
| `is_vendor` true | 16 |
| `is_vendor` false | 53 |
| `is_vendor` NULL | 0 |
| Cardinality index | Active (BR8) |
| Authority | `party_roles` intended canonical; `is_vendor` still authoritative for consumers |
| Dual-write | NOT IMPLEMENTED |
| Reader migration | NOT STARTED |

---

## 3. Consumer Inventory (BR9-1)

### 3.1 Direct Reader Sites (≥30 confirmed)

| # | File | Pattern | Priority |
|---|------|---------|----------|
| 1 | `app/(dashboard)/hq/master/contacts/page.tsx` | Tab filter `.eq('is_vendor', true)` | P5 |
| 2 | `app/(dashboard)/hq/master/contacts/page.tsx` | Display `ent.is_vendor` for VND badge | P5 |
| 3 | `app/(dashboard)/hq/master/contacts/page.tsx` | INSERT/UPDATE `is_vendor` (writer W1) | — |
| 4 | `app/(dashboard)/tenant/master/contacts/page.tsx` | Tab filter + form (writer W2) | P5 |
| 5 | `app/(dashboard)/hq/master/fleets/page.tsx` | `.eq('is_vendor', true/false)` (display only) | P5 |
| 6 | `app/(dashboard)/hq/master/fleets/page.tsx` | Filter `matchesVendor = md_entities.is_vendor === false` (display) | P5 |
| 7 | `app/(dashboard)/tenant/master/fleets/page.tsx` | `.or('is_vendor.eq.true,is_vendor.eq.false')`; display `(Internal)` | P5 |
| 8 | `app/(dashboard)/hq/master/drivers/page.tsx` | `.select('*, md_entities(name, is_vendor, vendor_tenant_id)')` | P5 |
| 9 | `app/(dashboard)/hq/master/drivers/page.tsx` | `const isVendor = d.md_entities?.is_vendor === true` | P5 |
| 10 | `app/(dashboard)/hq/master/drivers/page.tsx` | Display `selectedDriver.md_entities?.is_vendor ? 'VENDOR' : 'OWN'` | P5 |
| 11 | `app/(dashboard)/tenant/master/drivers/page.tsx` | `.eq('is_vendor', true)` filter | P5 |
| 12 | `app/(dashboard)/hq/driver-performance/page.tsx` | `.eq('md_entities.is_vendor', false)` | P3 |
| 13 | `app/(dashboard)/hq/fleet-performance/page.tsx` | `is_vendor_fleet` derived (NOT direct is_vendor) | P5 |
| 14 | `app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx` | Customer list `.select('..., is_customer, is_vendor')` | P3 |
| 15 | `app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx` | Writer (W4) | — |
| 16 | `app/(dashboard)/sbu/forwarding/wo/page.tsx` | Customer select via `is_vendor` | P3 |
| 17 | `app/(dashboard)/sbu/trucking/work-orders/[id]/page.tsx` | `.eq("is_vendor", true)` filter | P3 |
| 18 | `app/(dashboard)/sbu/trucking/work-orders/page.tsx` | Driver list `md_drivers(name, phone, md_entities(is_vendor))` | P3 |
| 19 | `app/(dashboard)/sbu/trucking/assignments/page.tsx` | Driver list + display `isInternal` | P3 |
| 20 | `app/(dashboard)/sbu/trucking/work-orders/components/RejectReassignModal.tsx` | `.eq('is_vendor', true)` filter | P3 |
| 21 | `app/(dashboard)/sbu/trucking/assignments/components/EditAssignmentModal.tsx` | Display `isInternal` | P3 |
| 22 | `app/(dashboard)/sbu/trucking/work-orders/components/AssignmentModal.tsx` | Filter `t.is_vendor`, derive `is_vendor: !isActuallyOwn` | P3 |
| 23 | `app/(dashboard)/sbu/trucking/completed/page.tsx` | Display `job.md_fleets?.md_entities?.is_vendor` (Vendor DP vs Driver Advance) | P3 |
| 24 | `app/(dashboard)/sbu/trucking/completed/components/OperationsCard.tsx` | Display branching on is_vendor | P5 |
| 25 | `app/(dashboard)/sbu/trucking/completed/components/JobDetailModal.tsx` | Display + status branching | P3 |
| 26 | `app/(dashboard)/sbu/trucking/completed/components/FinancesCard.tsx` | Display `isVendor` | P5 |
| 27 | `app/(dashboard)/sbu/trucking/fleet/page.tsx` | `.eq('is_vendor', true)` filter; `companies.filter(c => c.is_vendor)` | P3 |
| 28 | `app/(dashboard)/sbu/trucking/driver-performance/page.tsx` | `.eq('md_entities.is_vendor', false)` | P3 |
| 29 | `app/(dashboard)/sbu/warehouse/transfers/components/TransferDetailModal.tsx` | `.eq('is_vendor', true/false)` filters | P3 |
| 30 | `app/(dashboard)/sbu/warehouse/outbound/components/OutboundDetailModal.tsx` | `.eq('is_vendor', true)` | P3 |
| 31 | `app/(dashboard)/reporting/operational/trucking/page.tsx` | `.eq("is_vendor", true)` | P4 |
| 32 | `app/(dashboard)/reporting/operational/overview/page.tsx` | Vendor count | P4 |
| 33 | `app/api/fleet-status/route.ts` | `is_vendor_fleet` derived from `vendor_tenant_id` (NOT is_vendor) | P3 |
| 34 | `lib/domain/jo/assignment.ts` | `resolveIsVendor()`, `t.is_vendor || !t.is_customer`, `is_vendor: !isActuallyOwn` | P1 |
| 35 | `lib/services/assignmentSave.ts` | `resolveIsVendor(transporter, driver?.md_entities?.is_vendor)` | P1 |
| 36 | `lib/supabase/database.types.ts` | TypeScript type definitions (no runtime behavior) | — |

### 3.2 Special Consumers (per BR6 §17)

| Consumer | Pattern | Type | Equivalent to `is_vendor=TRUE`? |
|----------|---------|------|---------------------------------|
| `cost-audit:432` | `vendor_type` (free text) | **NO** — different concept (vendor classification within cost audit) | NO |
| `assignment.ts:282` | `is_vendor: !isActuallyOwn` from `t.is_vendor`, `t.vendor_type`, `is_own`, name heuristics | **NO** — derived classification (fleet ownership), not direct is_vendor | NO |
| `fleet-status:101` | `vendor_tenant_id` (cross-tenant vendor pattern) | **NO** — cross-tenant relationship, not boolean flag | NO |

These three consumers do NOT semantically consume `is_vendor=TRUE` and should NOT be mechanically migrated. They require individual analysis.

---

## 4. Writer Inventory (BR9-2)

### 4.1 Direct Writers (3 effective, 1 derived)

| ID | File | Operation | Trigger | Tenant Source | Dual-Write Required? | Risk |
|----|------|-----------|---------|---------------|---------------------|------|
| W1 | `app/(dashboard)/hq/master/contacts/page.tsx` | INSERT/UPDATE `is_vendor` | UI form | `profile.tenant_id` | YES | MEDIUM |
| W2 | `app/(dashboard)/tenant/master/contacts/page.tsx` | INSERT/UPDATE `is_vendor` | UI form | `profile.tenant_id` | YES | MEDIUM |
| W3 | `app/(dashboard)/hq/master/fleets/page.tsx` | display filter only | — | — | NO (derived display) | LOW |
| W4 | `app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx` | INSERT `is_vendor: true, is_customer: true` | UI form | `profile.tenant_id` | YES | MEDIUM |

### 4.2 Writer Profile (all W1/W2/W4)

- **Tenant source:** All three writers derive `tenant_id` from `profile.tenant_id` (server-side, client-trusted but server-validated by RLS).
- **Input authority:** UI form data; no direct database writers in non-UI paths.
- **Current semantic purpose:** Mark entity as vendor for downstream filtering/assignment.
- **Can write independently of party_roles?** YES (currently). This is the drift risk.
- **Dual-write required?** YES for W1/W2/W4 to maintain canonical sync.

### 4.3 New Writers Since BR5/BR6

**None confirmed.** No new files reference `is_vendor` INSERT/UPDATE that were not already inventoried in BR5.

---

## 5. Reader Inventory (BR9-3)

### 5.1 Priority Classification

| Priority | Consumer Type | Count | Files |
|----------|---------------|-------|-------|
| P0 | Security / authorization / tenancy | 0 | None (no RLS policy references `is_vendor` directly) |
| P1 | Business-rule enforcement | 2 | `lib/domain/jo/assignment.ts`, `lib/services/assignmentSave.ts` |
| P2 | Operational execution | ~15 | AssignmentModal, work-orders, driver/fleet selection, warehouse transfers |
| P3 | Assignment / vendor selection | ~10 | Driver/fleet/vendor dropdowns, transfer forms |
| P4 | Reporting / analytics | 2 | `reporting/operational/trucking/page.tsx`, `reporting/operational/overview/page.tsx` |
| P5 | UI / display / convenience | ~8 | Badge displays, tab labels, "(Internal)" markers |

### 5.2 Reader Migration Risk by Priority

- **P0:** None (no direct consumer).
- **P1:** HIGH. `assignment.ts` uses `is_vendor` in business logic that affects operational outcomes (assignment eligibility, vendor vs own-fleet distinction). Naive replacement may break operational behavior.
- **P2:** MEDIUM. Filtering queries that select vendor entities for operational work. Can be replaced with `EXISTS (party_roles WHERE role_type='VENDOR' AND context_type='GLOBAL')` but must also consider joins (driver, fleet, etc.).
- **P3:** MEDIUM. Dropdown filters can be replaced but must also handle nested joins (`md_entities(is_vendor)` from parent table).
- **P4:** LOW. Reports can tolerate brief inconsistency during transition.
- **P5:** LOW. UI labels can be replaced; cosmetic impact only.

### 5.3 Readers That CANNOT Be Mechanically Replaced

| Reader | Reason | Required Treatment |
|--------|--------|---------------------|
| `assignment.ts:282` | Derives `is_vendor: !isActuallyOwn` from complex heuristic | Separate ADR + reimplementation |
| Any reader using `vendor_type` (e.g., `cost-audit:432`) | Uses free-text vendor classification | Separate ADR |
| Any reader using `vendor_tenant_id` (e.g., `fleet-status:101`) | Cross-tenant vendor relationship | Out of scope |
| `is_vendor_fleet` (derived) | Different concept (fleet ownership) | NOT a vendor role |

---

## 6. Semantic Equivalence Analysis (BR9-4)

### 6.1 Equivalence Statement

```text
is_vendor = TRUE
≡
EXISTS (
  SELECT 1 FROM public.party_roles
  WHERE party_id = md_entities.id
    AND tenant_id = md_entities.tenant_id
    AND role_type = 'VENDOR'
    AND context_type = 'GLOBAL'
    AND context_id IS NULL
    AND is_active = TRUE
)
```

### 6.2 Equivalence Analysis

| Aspect | Analysis | Verdict |
|--------|----------|---------|
| Tenant scope | Both are tenant-scoped via RLS + FK | EQUIVALENT |
| Party identity | Both reference `md_entities.id` | EQUIVALENT |
| Active/inactive semantics | `is_vendor` has no explicit active flag (always current); `party_roles` has `is_active` + `effective_from`/`effective_to` | DIFFERENT — `party_roles` is more expressive |
| Historical records | `is_vendor` is a current state only; `party_roles` could have historical rows (currently no, but possible) | DIFFERENT — `party_roles` supports history |
| NULL behavior | `is_vendor=NULL` = "not vendor"; canonical row absent = "not vendor" | EQUIVALENT |
| Multiple roles | `is_vendor` is a single boolean; `party_roles` can have multiple role types per party | DIFFERENT — `party_roles` is strictly more expressive |
| Contextual roles | `is_vendor` is global only; `party_roles` supports ENGAGEMENT/ORDER/CONTRACT | DIFFERENT — `party_roles` supports contextual roles |
| Legacy records | All 16 legacy vendors have matching canonical rows (BR5 reconciliation) | EQUIVALENT (current state) |
| Cross-tenant vendor references | `is_vendor` is per-tenant; `vendor_tenant_id` handles cross-tenant | NOT EQUIVALENT — `vendor_tenant_id` is separate |
| Timing of role changes | `is_vendor` changes are immediate; `party_roles` has `effective_from`/`effective_to` | DIFFERENT — `party_roles` supports time-bound |

### 6.3 Verdict

**Current mapping is correct.** The 62-row reconciliation proves current equivalence for all existing rows.

**Perpetual equivalence is NOT guaranteed.** If future code:
- Sets `is_vendor=FALSE` without deleting the canonical row → drift
- Sets `is_vendor=TRUE` without inserting a canonical row → drift
- Updates `party_roles.role_type` directly without updating legacy → drift

The semantic mapping is currently maintained by application discipline only. No DB-level invariant prevents drift.

---

## 7. Drift Matrix (BR9-5)

| Drift Event | Possible Now? | Detectable? | Prevented? | Required Control |
|-------------|---------------|-------------|------------|------------------|
| `is_vendor` changes; `party_roles` does not | YES (any UI write) | NO (no trigger) | NO | Dual-write |
| `party_roles` changes; `is_vendor` does not | YES (no application writer) | NO | NO | Application discipline |
| New entity created with `is_vendor=TRUE`, no canonical row | YES (W1/W2/W4) | YES (reconciliation query) | NO | Dual-write + reconciliation |
| Vendor classification removed (`is_vendor=FALSE`) | YES (W1/W2) | NO | NO | Dual-write with DELETE |
| Role deactivated (`party_roles.is_active=FALSE`) | YES (no application writer) | YES (reconciliation) | NO | Application discipline |
| Role reactivated | YES (no application writer) | YES | NO | Application discipline |
| Tenant changes (e.g., data migration) | YES (admin ops) | YES (tenant_id check) | YES (RLS) | RLS |
| Imports / scripts / admin operations | YES (no DB-level guard) | YES (audit) | NO | Audit + reconciliation |
| Concurrent writes (race) | YES (no lock) | NO | NO | Application-level lock or unique index for legacy |
| Failed partial operations (dual-write partial fail) | YES (if dual-write exists) | YES (transaction log) | NO | Single-transaction dual-write |

### 7.1 Drift Verdict

**Drift controls: RED.**

The BR8 partial unique index prevents duplicate canonical rows. It does NOT prevent:
- `is_vendor`/canonical divergence
- New entities created via legacy path only
- Vendor classification removal without canonical cleanup
- Concurrent writes from different paths

A reconciliation job (read-only) can detect drift but not prevent it. Dual-write (not yet implemented) is the only mechanism that prevents most drift modes.

---

## 8. Dual-Write Requirements (BR9-6)

### 8.1 Atomicity

Dual-write MUST occur within a single database transaction. If `is_vendor` write succeeds but `party_roles` write fails (or vice versa), the system is in an inconsistent state.

Recommended pattern:
```sql
BEGIN;
  UPDATE md_entities SET is_vendor = $1 WHERE id = $2 AND tenant_id = $3;
  INSERT INTO party_roles (...) ON CONFLICT (uq_party_role) DO UPDATE SET role_type='VENDOR';
COMMIT;
```

### 8.2 Authority

During dual-write: **`party_roles` is the logical authority**; `is_vendor` is a compatibility projection.

Dual-write is NOT two competing authorities. It is one logical authority (canonical) with a sync target (legacy). The legacy write is allowed to fail-and-retry without rolling back the canonical write (as long as reconciliation handles it).

### 8.3 Failure Behavior

| Failure | Required Behavior |
|---------|-------------------|
| `is_vendor` write succeeds; `party_roles` write fails | Roll back both (atomic). |
| `party_roles` write succeeds; `is_vendor` write fails | Roll back both. |
| Both succeed | Commit. |
| Constraint violation on `party_roles` (e.g., BR8 index) | Surface error; do not silently skip. |

### 8.4 Idempotency

Dual-write must be idempotent. Repeated writes with the same input must produce the same final state. The BR8 partial unique index and existing `NOT EXISTS` patterns in 038 are already idempotent for canonical writes.

### 8.5 Concurrency

Concurrent writes from different paths (admin UI, API, jobs) are possible. The BR8 index prevents canonical duplicates but not legacy/canonical divergence. A `SELECT ... FOR UPDATE` on the entity row, or a `UPSERT` with explicit conflict resolution, is recommended for the dual-write implementation.

### 8.6 Auditability

Dual-write should record:
- Source (UI/API/job)
- User/actor
- Tenant
- Both old and new values
- Timestamp
- Transaction ID

This is required for drift detection and forensic review.

### 8.7 Verdict

**Dual-write readiness: RED.**

No dual-write mechanism exists. W1, W2, W4 still write legacy only. Any new vendor created today is invisible to `party_roles`-based consumers.

---

## 9. Special Consumer Analysis (BR9-7)

### 9.1 `cost-audit:432` — `vendor_type` (free text)

**Source evidence:** `app/api/forwarding/order-header/route.ts` uses `vendor_type` as a leg-type classifier (e.g., `'trucking_origin'`, `'shipping_line'`, `'trucking_dest'`, `'trucking_own'`). This is a leg type, not a vendor role.

**Verdict:** `cost-audit:432` and the `vendor_type` leg classifier are DIFFERENT concepts from `is_vendor`. They are operational classifications within the forwarding order-header context, not party roles.

**Treatment:** OUT OF SCOPE. No migration to `party_roles`. May require its own ADR if leg-type classification needs canonicalization.

### 9.2 `assignment.ts:282` — `is_vendor: !isActuallyOwn`

**Source evidence (lines 236-285):**

```ts
.map((t) => {
  const displayName = t.legal_name || t.name;
  const explicitOwn = typeof t.is_own === "boolean" ? t.is_own : undefined;
  const explicitVendorType = (t.vendor_type || "").toUpperCase();
  const explicitVendorTypeOwn = explicitVendorType === "OWN" || explicitVendorType === "INTERNAL";
  const explicitVendorTypeVendor = explicitVendorType === "VENDOR";
  const inferredOwnByFallback =
    !t.is_vendor ||
    displayName.toUpperCase().includes(tenantNameUp) ||
    displayName.toUpperCase().includes(tenantCodeUp) ||
    displayName.toUpperCase().includes("INTERNAL") ||
    displayName.toUpperCase().includes("(OWN)");
  const isActuallyOwn = ...;
  return {
    ...
    is_vendor: !isActuallyOwn,
    is_own: isActuallyOwn,
  };
})
```

**Verdict:** `is_vendor: !isActuallyOwn` is a DERIVED classification that combines:
- `t.is_vendor` boolean (direct)
- `t.vendor_type` (free text)
- `t.is_own` (explicit own flag)
- Name heuristics (tenant name/code matching, "INTERNAL", "(OWN)")

**Treatment:** This is a fleet-OWNERSHIP classification, not a vendor role. It should NOT be mechanically migrated to `party_roles.VENDOR`. A separate ADR is required if this logic needs canonicalization.

### 9.3 `fleet-status:101` — `vendor_tenant_id`

**Source evidence (`app/api/fleet-status/route.ts`):**

```ts
const isVendorFleet = !!fleet.vendor_tenant_id && fleet.vendor_tenant_id !== tenantId;
```

**Verdict:** This is a CROSS-TENANT VENDOR RELATIONSHIP, indicating a fleet that belongs to a different tenant (external vendor). It is not the same as `is_vendor=TRUE` on `md_entities`.

**Treatment:** OUT OF SCOPE. The `vendor_tenant_id` pattern is a cross-tenant vendor mechanism that operates at a different layer. No migration to `party_roles`.

---

## 10. Authority Cutover Criteria (BR9-8)

Before `party_roles` can become canonical authority and `is_vendor` become non-authoritative, ALL of the following MUST be satisfied:

| # | Criterion | Current Status | Evidence Required |
|---|-----------|----------------|--------------------|
| 1 | All direct writers identified | **MET** | BR9 §4 (W1/W2/W4 confirmed) |
| 2 | Dual-write operational | **NOT MET** | Not implemented |
| 3 | Zero unexplained drift | **NOT MET** | No reconciliation job |
| 4 | All P0/P1 readers migrated | **NOT MET** | P0=0 (none), P1=`assignment.ts` (uses complex derived logic) |
| 5 | All remaining readers classified | **MET** | BR9 §5 (P0-P5 classification done) |
| 6 | Special consumers resolved | **NOT MET** | 3 special consumers require separate ADRs |
| 7 | Zero production writes bypassing canonical authority | **NOT MET** | W1/W2/W4 still write legacy only |
| 8 | Reconciliation repeatedly GREEN | **NOT MET** | Initial BR5R reconciliation is GREEN; no ongoing reconciliation |
| 9 | Rollback strategy defined | **NOT MET** | No rollback plan documented |
| 10 | Explicit human authorization for the cutover | **NOT MET** | Not yet requested |

**Cutover status: NOT READY.**

The cutover requires:
1. Dual-write implementation in W1/W2/W4
2. Reconciliation job
3. Special consumer resolution (3 separate ADRs)
4. P1 reader migration (assignment.ts) with adapter
5. Rollback strategy documentation
6. Explicit human authorization

---

## 11. Transition Readiness Matrix (BR9-9)

| Area | Status | Rationale |
|------|--------|-----------|
| Consumer inventory | **YELLOW** | Bounded; re-verified; 36+ sites confirmed |
| Writer inventory | **YELLOW** | 3 effective writers; no new writers since BR5 |
| Reader inventory | **YELLOW** | Classified P0-P5; P1 requires adapter |
| Semantic equivalence | **YELLOW** | Current mapping correct; perpetual not guaranteed |
| Drift controls | **RED** | No dual-write, no reconciliation job |
| Dual-write readiness | **RED** | Not implemented |
| P0 consumers | **GREEN** | None (no security consumer reads is_vendor) |
| P1 consumers | **YELLOW** | `assignment.ts` uses complex derived logic; needs adapter |
| Special consumers | **YELLOW** | 3 identified; require separate ADRs |
| Cutover criteria | **RED** | 8 of 10 criteria unmet |

**Overall: YELLOW — Architecture/design work required.**

---

## 12. Risks / Open Decisions

| # | Risk/Decision | Severity | Required Action |
|---|---------------|----------|------------------|
| 1 | `assignment.ts:282` derived logic | HIGH | Separate ADR; cannot mechanically migrate |
| 2 | Dual-write atomicity | HIGH | Design phase; single-transaction pattern |
| 3 | Drift detection job | MEDIUM | Implementation phase |
| 4 | Rollback strategy | MEDIUM | Design phase |
| 5 | 3 special consumers (cost-audit, assignment, fleet-status) | MEDIUM | 3 separate ADRs |
| 6 | P1 reader migration adapter | HIGH | Implementation phase |
| 7 | Activation trigger for cutover | MEDIUM | Design decision |
| 8 | Legacy field deprecation timeline | LOW | Decision after reader migration |
| 9 | Legacy field end-state (derived view vs removal) | LOW | Decision after zero-consumer proof |
| 10 | Backward compatibility during transition | MEDIUM | Design decision |

---

## 13. Recommended Next Gate

The next phase after BR9 should be a **DUAL-WRITE DESIGN** phase (not implementation):

1. **Phase X1:** Design dual-write contract (atomicity, idempotency, failure handling, auditability).
2. **Phase X2:** Implement dual-write in W1 (HQ contacts).
3. **Phase X3:** Implement dual-write in W2 (Tenant contacts).
4. **Phase X4:** Implement dual-write in W4 (QuickAddContactModal).
5. **Phase X5:** Reconciliation job.
6. **Phase X6 (parallel):** Special consumer ADRs (3).
7. **Phase X7:** P1 reader migration (assignment.ts adapter).
8. **Phase X8:** P3-P5 reader migration (bulk).
9. **Phase X9:** Zero-consumer proof.
10. **Phase X10:** Legacy deprecation/column removal.

Each phase requires explicit human authorization.

**Next gate recommendation:** **DUAL-WRITE DESIGN PHASE** — produce a technical design document (not implementation) for the dual-write contract, before any code changes.

---

## 14. Explicit Change Boundary

| Action | Status |
|--------|--------|
| Production schema changes | **NONE** |
| Production data changes | **NONE** |
| Migrations executed | **NONE** |
| Application code changes | **NONE** |
| Dual-write | **NOT IMPLEMENTED** |
| Reader migration | **NOT IMPLEMENTED** |
| Legacy columns | **UNCHANGED** |
| RLS | **UNCHANGED** |
| Indexes/constraints | **UNCHANGED** (BR8 index is latest authorized change) |
| Tests | **NO FULL REGRESSION** |
| ADR-070 Amendment | **RATIFIED** (prior phase) |
| ADR-077 | **RATIFIED** (prior phase) |
| BR8 partial index | **ACTIVE** (latest authorized production change) |

---

## 15. Final Verdict

# **YELLOW — Architecture / Design Work Required**

The consumer, writer, and reader inventories are well-defined. The semantic mapping is currently correct. The BR8 partial unique index prevents canonical duplicate insertion.

However, the transition is **NOT READY** because:
- No dual-write mechanism exists (drift risk: HIGH).
- 8 of 10 cutover criteria are unmet.
- P1 reader (`assignment.ts`) uses complex derived logic requiring a custom adapter.
- 3 special consumers require separate ADRs.
- No rollback strategy documented.
- No explicit human authorization for cutover.

**Recommended next gate:** DUAL-WRITE DESIGN PHASE (technical design document, not implementation). This is a separate explicit authorization.

---

## 16. Hard-Stop Compliance

- No migration executed.
- No DDL performed.
- No DML performed.
- No schema modified.
- No data modified.
- No application code modified.
- No tests modified.
- No dual-write implemented.
- No reader migration performed.
- No legacy column changes.
- No RLS changes.
- No index/constraint changes.
- No special consumer changes.
- DATA-4E-BR10 was **NOT** started.
- ADR-070 Amendment and ADR-077 status: RATIFIED (unchanged from BR8).
- BR8 index remains the latest authorized production change.

**Hard stop: COMPLIED.**

---

**END OF DATA-4E-BR9 REPORT**
