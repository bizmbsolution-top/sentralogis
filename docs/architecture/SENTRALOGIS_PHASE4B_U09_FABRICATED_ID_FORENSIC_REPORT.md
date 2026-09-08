# SENTRALOGIS — U-09 FABRICATED-ID ELIMINATION FORENSIC REPORT

## 1. Executive Summary

**Status: GREEN — ACCEPTED**

U-09 performed a surgical forensic repair of the canonical forwarding shipment creator (`app/(dashboard)/sbu/forwarding/shipments/create/page.tsx`). The identified architectural debt was CLIENT-SIDE FABRICATED IDENTIFIERS — the browser was generating `work_order_id`, `service_scope_id`, and `customer_id` using `crypto.randomUUID()` and `Date.now()`, then trusting the server to persist them as authoritative canonical database IDs.

**Root cause**: The shipment creation form generated UUIDs client-side and sent them as `work_order_id` and `service_scope_id`. The server accepted and persisted these fabricated values without validation against the canonical engagement model (U-03).

**Repair**: Eliminated all client-side canonical ID fabrication. The client now submits business intent only. The server resolves canonical engagement via U-03 `resolveOrCreateEngagement()` when `work_order_id` is omitted.

---

## 2. Before-State Flow

```
CLIENT (page.tsx)
  → crypto.randomUUID() → work_order_id (FABRICATED)
  → crypto.randomUUID() → service_scope_id (FABRICATED)
  → cus_${Date.now()}  → customer_id (FABRICATED FALLBACK)
  → POST /api/v1/forwarding/shipments
  → Server persists fabricated IDs directly into shp_shipments
```

---

## 3. Exact Fabricated-ID Defect

### D-1: work_order_id (page.tsx:34)
```typescript
work_order_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wo_${Date.now()}`
```
**Impact**: A random UUID is persisted as `shp_shipments.work_order_id`, which is a foreign key to `commercial_work_orders.id`. This creates orphan references — shipments point to non-existent engagements.

### D-2: service_scope_id (page.tsx:35)
```typescript
service_scope_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `scope_${Date.now()}`
```
**Impact**: Same pattern as D-1. A fabricated scope ID is persisted as a foreign key.

### D-3: customer_id fallback (page.tsx:151)
```typescript
customer_id: identityData.customer_id || `cus_${Date.now()}`
```
**Impact**: When no customer is selected, a timestamp-derived slug becomes a foreign key to `md_entities.id`.

### D-4: customer_id slug fabrication (ShipmentIdentityForm.tsx:52)
```typescript
onChange('customer_id', `cus_${e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_')}`)
```
**Impact**: A user-typed name is slugified into a fake entity ID.

### D-5: CargoComposer fallback identifiers (CargoComposer.tsx:46-78)
```typescript
CONT-${Math.floor(100000 + Math.random() * 900000)}  // container number fallback
BULK-${bulkType.substring(0, 4)}-${Date.now()}        // unit_identifier fallback
PKG-${Date.now()}                                      // unit_identifier fallback
VIN-${Date.now()}                                      // VIN fallback
```
**Impact**: Business identifiers generated with `Math.random()` and `Date.now()` when user omits input.

---

## 4. Root Cause

The shipment creator was designed as a self-contained form that generated all identifiers locally. There was no integration with the canonical U-03 engagement resolution system. The `CreateShipmentDTO` required `work_order_id` and `service_scope_id` as mandatory fields, forcing the client to fabricate them.

---

## 5. Identifier Classification

| Identifier | Category | Source After Fix |
|---|---|---|
| `shp_shipments.id` | DOMAIN-AUTHORITATIVE | Server (ShipmentFactory via crypto.randomUUID) |
| `work_order_id` | DOMAIN-AUTHORITATIVE | Server (U-03 resolveOrCreateEngagement) |
| `service_scope_id` | DOMAIN-AUTHORITATIVE | Server (U-03 engagement.serviceScopeId) |
| `customer_id` | DOMAIN-AUTHORITATIVE | Client input (validated by U-03 against md_entities) |
| `shipment_number` | DOMAIN-AUTHORITATIVE | Server (ShipmentFactory.generateShipmentNumber) |
| `tracking_token` | DOMAIN-AUTHORITATIVE | Server (ShipmentFactory.generateTrackingToken) |
| `manifest_item.id` | DOMAIN-AUTHORITATIVE | Server (ShipmentFactory) |
| `unit.id` | DOMAIN-AUTHORITATIVE | Server (ShipmentFactory.createUnitEntities) |
| `execution_plan.id` | DOMAIN-AUTHORITATIVE | Server (ExecutionPlanService.buildPlanAndLegs) |
| `execution_leg.id` | DOMAIN-AUTHORITATIVE | Server (ExecutionPlanService.buildPlanAndLegs) |
| `leg_unit_allocation.id` | DOMAIN-AUTHORITATIVE | Server (leg units route) |
| `temp_leg_*` (UI-only) | UI-LOCAL | ExecutionPlanBuilder (prefixed `temp_`, never persisted) |
| `idempotencyKey` | UI-LOCAL | Client (header only, not a canonical ID) |
| `unit_identifier` (user input) | BUSINESS ATTRIBUTE | Client (container number, VIN, etc.) |

---

## 6. Authoritative ID Source

After U-09, every canonical ID originates from one of:

1. **U-03 engagement resolution** (`resolveOrCreateEngagement`) → `work_order_id`
2. **ShipmentFactory** (server-side) → `shipment.id`, `manifest_item.id`, `unit.id`
3. **ExecutionPlanService** (server-side) → `execution_plan.id`, `execution_leg.id`
4. **Database** (via supabaseAdmin inserts with server-generated IDs)

No canonical ID originates from client-side code.

---

## 7. Tenant Authority Analysis

The API route (`app/api/v1/forwarding/shipments/route.ts`) enforces:
```typescript
tenant_id: auth.tenantId  // NEVER trusts body.tenant_id
```
The `resolveApiAuthContext()` (U-01) resolves tenant from server session. Client cannot inject tenant identity. **No change needed** — this was already correct.

---

## 8. Engagement Authority Analysis

Before: Client fabricated `work_order_id` with `crypto.randomUUID()`.
After: Server resolves via U-03:
```typescript
if (!workOrderId && body.customer_id) {
  const engagement = await resolveOrCreateEngagement({ customerId: body.customer_id }, ctx);
  workOrderId = engagement.engagement.id;
  serviceScopeId = engagement.engagement.serviceScopeId || serviceScopeId;
}
```
U-03 remains the **single engagement resolver**. No duplicate resolver created.

---

## 9. Shipment Creation Boundary

```
CLIENT (page.tsx)
  → submits: customer_id, origin, destination, units, legs (BUSINESS INTENT)
  → NO work_order_id, NO service_scope_id
  → POST /api/v1/forwarding/shipments
  ↓
SERVER (route.ts)
  → resolveApiAuthContext() (U-01)
  → resolveOrCreateEngagement(customer_id) (U-03)
  → returns: real work_order_id, service_scope_id
  ↓
SERVER (ShipmentService → ShipmentFactory)
  → creates: real shipment.id, manifest_item.id, unit.id, plan.id, leg.id
  → persists all via repository
  ↓
DATABASE
  → canonical aggregate with authoritative IDs
```

---

## 10. Execution Leg Analysis

Execution legs are generated **entirely server-side** by `ExecutionPlanService.buildPlanAndLegs()`. The client sends `CreateExecutionLegDTO[]` (business attributes: leg_sequence, leg_code, transport_mode, origin/destination). The server generates `execution_plan.id` and `execution_leg.id` using `crypto.randomUUID()` on the server. **No client-side fabrication exists for leg IDs.**

---

## 11. Shipment Unit Analysis

Shipment units are generated **entirely server-side** by `ShipmentFactory.createUnitEntities()`. The client sends `CreateUnitDTO[]` (business attributes: unit_type, unit_identifier, container_number, etc.). The server generates `unit.id` using `crypto.randomUUID()` on the server. The CargoComposer previously fabricated fallback `unit_identifier` values using `Math.random()`/`Date.now()` — these have been removed; users must now provide explicit identifiers or the add action is rejected.

---

## 12. Client/Server Boundary

| Layer | Before | After |
|---|---|---|
| **Client** | Generates work_order_id, service_scope_id, customer_id fallback | Submits business intent only |
| **Server API** | Passes body through to service | Resolves engagement (U-03), overrides tenant_id |
| **Server Domain** | Creates IDs via factory (already server-side) | Same (unchanged) |
| **Database** | Receives client-fabricated foreign keys | Receives server-resolved authoritative IDs |

---

## 13. Files Created

| File | Purpose |
|---|---|
| `lib/domain/shipment/__tests__/fabricated-id-elimination.test.ts` | U-09 forensic test suite (16 tests) |
| `scripts/run-u09-tests.ts` | U-09 test runner |
| `scripts/run-full-regression.ts` | Full regression runner (U-01..U-09) |

---

## 14. Files Modified

| File | Change |
|---|---|
| `lib/domain/shipment/types.ts` | Made `work_order_id` and `service_scope_id` optional in `CreateShipmentDTO` |
| `lib/domain/shipment/shipment-factory.ts` | Removed `work_order_id`/`service_scope_id` from mandatory validation; default to `''` when omitted |
| `app/(dashboard)/sbu/forwarding/shipments/create/page.tsx` | Removed `work_order_id`/`service_scope_id` from state, removed `customer_id` Date.now() fallback, removed IDs from API call |
| `components/workspaces/forwarding/ShipmentCreator/ShipmentIdentityForm.tsx` | Removed `customer_id` slug fabrication from `customer_name` onChange; updated interface to exclude fabricated fields |
| `components/workspaces/forwarding/ShipmentCreator/CargoComposer.tsx` | Removed `Math.random()`/`Date.now()` fallbacks for unit_identifier, VIN, container number |
| `app/api/v1/forwarding/shipments/route.ts` | Added U-03 engagement resolution when `work_order_id` is missing; imported `resolveOrCreateEngagement` and `IdentityContext` |

---

## 15. Files Untouched

| File | Reason |
|---|---|
| `lib/domain/shipment/execution-plan-service.ts` | Server-side ID generation already correct |
| `lib/domain/shipment/shipment-service.ts` | Orchestration unchanged |
| `lib/domain/shipment/repository.ts` | Persistence unchanged |
| `lib/domain/shipment/api-helper.ts` | Auth unchanged |
| `lib/application/service-contracts/forwarding-writer.ts` | U-08 untouched |
| `lib/application/engagement/engagement-bridge.ts` | U-03 untouched |
| `app/api/v1/forwarding/shipments/[id]/legs/route.ts` | Server-side, unchanged |
| `app/api/v1/forwarding/shipments/[id]/units/route.ts` | Server-side, unchanged |
| `app/api/v1/forwarding/shipments/[id]/legs/[legId]/units/route.ts` | Server-side, unchanged |
| All customs, trucking, warehouse, driver/GPS code | Out of scope |

---

## 16. Database Changes

**NONE.** No migration. No schema modification. No column changes. No constraint changes.

---

## 17. Test Matrix

| Suite | Tests | Status |
|---|---|---|
| U-01 Identity Resolver | 36 | PASS |
| U-02 Authorization | 66 | PASS |
| U-03 Engagement Bridge | 11 | PASS |
| U-03 Commercial Work Orders | 15 | PASS |
| U-03 Work Order Validation | 18 | PASS |
| U-05 Capability Registry | 12 | PASS |
| U-06 Binding Lifecycle | 20 | PASS |
| U-06A Containment | 10 | PASS |
| U-07 Execution Lineage | 12 | PASS |
| U-08 Forwarding Writer Guard | 8 | PASS |
| Shipment Domain | 10 | PASS |
| Shipment API | 11 | PASS |
| Shipment Creator | 9 | PASS |
| **U-09 Fabricated-ID Elimination** | **16** | **PASS** |
| **TOTAL** | **254** | **ALL PASS** |

---

## 18. Static Scan Results

### Scan A — Fabricated Canonical IDs (client page.tsx)
- `crypto.randomUUID()` for `work_order_id`: **REMOVED** ✓
- `crypto.randomUUID()` for `service_scope_id`: **REMOVED** ✓
- `Date.now()` for `customer_id`: **REMOVED** ✓

### Scan B — Shipment Creation Writers
```
forwarding shipment writers:
1. POST /api/v1/forwarding/shipments (route.ts) → ShipmentService → ShipmentFactory → repository
   authority boundary: server API (U-01 auth + U-03 engagement)
   ID source: server (ShipmentFactory + U-03)
   tenant source: auth.tenantId (server session)
   authorization source: resolveApiAuthContext (U-01/U-02)
```

### Scan C — Client-Side Database Writes
- `page.tsx`: **ZERO** `.from(...).insert(...)` calls ✓
- `ShipmentIdentityForm.tsx`: **ZERO** direct DB calls ✓
- `CargoComposer.tsx`: **ZERO** direct DB calls ✓

### Scan D — Fabricated Foreign Keys
- `work_order_id` on page.tsx: **REMOVED** ✓ (now resolved via U-03 server-side)
- `service_scope_id` on page.tsx: **REMOVED** ✓ (now resolved via U-03 server-side)
- `customer_id` fallback on page.tsx: **REMOVED** ✓
- `customer_id` slug on ShipmentIdentityForm.tsx: **REMOVED** ✓

---

## 19. Regression Results

| Check | Status |
|---|---|
| U-01..U-08 regression | 208/208 PASS |
| U-09 focused tests | 16/16 PASS |
| Full regression | 254/254 PASS |
| TypeScript (`tsc --noEmit`) | 0 errors |
| ESLint (targeted files) | 0 errors |
| Production build (`next build`) | PASS (Compiled successfully) |
| Pre-existing lint warnings | All in unrelated files (trucking, warehouse, driver) |

---

## 20. Remaining Debt

| Item | Classification |
|---|---|
| ExecutionPlanBuilder `temp_leg_*` IDs are UI-local with `Date.now()` | PRE-EXISTING DEBT — These are React state-only identifiers, never persisted. Prefixed `temp_` to distinguish. Safe. |
| `ShipmentFactory` generates IDs via `crypto.randomUUID()` on server | PRE-EXISTING DEBT — Server-side generation is acceptable per U-09 spec. Could be replaced with DB-generated UUIDs in future. |
| `ExecutionPlanService.buildPlanAndLegs` generates IDs on server | PRE-EXISTING DEBT — Same as above. Server-side generation is acceptable. |
| `leg_unit_allocation.id` generated on server (leg units route) | PRE-EXISTING DEBT — Same. Server-side. |
| No customer entity selector in ShipmentIdentityForm (still free-text) | PRE-EXISTING DEBT — The form still accepts free-text customer_name. Should be replaced with a proper entity lookup. Customer_id is no longer fabricated, but must be explicitly provided. |
| `idempotencyKey` in page.tsx uses `Date.now()` + `Math.random()` | OUT OF SCOPE — This is a header value, not a canonical database identifier. |

---

## 21. Non-Goals (Preserved)

- No shipment domain redesign
- No shipment schema redesign
- No U-03 engagement resolution redesign
- No U-07 lineage modification
- No U-08 forwarding writer modification (unless defect discovered — none found)
- No migration
- No trucking behavior change
- No customs behavior change
- No warehouse behavior change
- No driver/GPS behavior change
- No pricing redesign
- No quotation redesign
- No finance redesign

---

## 22. Final Acceptance

| Criterion | Status |
|---|---|
| No canonical shipment ID fabricated client-side | ✅ PASS |
| No canonical shipment-unit ID fabricated client-side | ✅ PASS |
| No canonical execution-leg ID fabricated client-side | ✅ PASS |
| No commercial engagement ID fabricated client-side | ✅ PASS |
| Persistent canonical IDs originate from authoritative creation | ✅ PASS |
| Client-generated UI-only IDs classified and proven non-authoritative | ✅ PASS |
| Tenant authority remains IdentityContext/server-side | ✅ PASS |
| Authorization remains intact | ✅ PASS |
| U-03 remains single engagement resolver | ✅ PASS |
| U-07 remains untouched | ✅ PASS |
| U-08 remains intact | ✅ PASS |
| No schema change | ✅ PASS |
| No migration | ✅ PASS |
| Focused U-09 tests PASS | ✅ 16/16 |
| U-01..U-08 regression PASS | ✅ 208/208 |
| Full regression PASS | ✅ 254/254 |
| TypeScript PASS | ✅ 0 errors |
| Lint PASS | ✅ 0 errors |
| Build PASS | ✅ Compiled successfully |
| Static fabricated-ID scan zero offenders | ✅ 0 offenders |
| No unrelated runtime behavior changed | ✅ PASS |

---

```
========================================
SENTRALOGIS — U-09 FINAL STATUS
========================================

Fabricated canonical shipment ID ....... PASS
Fabricated shipment-unit ID ........... PASS
Fabricated execution-leg ID ........... PASS
Fabricated engagement ID .............. PASS
Authoritative ID boundary ............. PASS
Tenant authority ...................... PASS
Authorization ......................... PASS
U-03 single resolver .................. PASS
U-07 untouched ........................ PASS
U-08 preserved ........................ PASS
No schema change ...................... PASS
No migration .......................... PASS

U-09 tests ............................ 16/16 PASS
Full regression ....................... 254/254 PASS
Typecheck ............................. 0
Lint .................................. 0
Build ................................. PASS

FABRICATED-ID OFFENDERS ............... 0

FILES CREATED ......................... 3
FILES MODIFIED ........................ 6
DATABASE CHANGES ...................... NONE

FINAL STATUS: ACCEPTED
========================================
```
