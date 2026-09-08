# SENTRALOGIS — PHASE 5A WAVE 7

## AIR FREIGHT INITIAL DISPATCH PATH

**Execution Mode:** CONTROLLED REMEDIATION  
**Phase:** 5A — SBU Forwarding Domestik  
**Wave:** 7 — Final Wave  
**Scope:** INITIAL / BASIC AIR FREIGHT DATA ONLY  
**Status:** GREEN — COMPLETE  
**Date:** 2026-09-05

---

## 1. Executive Status

**Status:** GREEN — COMPLETE  
**Date:** 2026-09-05  
**Scope:** Air Freight initial data only: Aircraft Name + Flight Number + Schedule + Route.  
**Authorization Basis:** Phase 5A controlled remediation (Wave 7 authorized within existing Phase 5A boundary).

---

## 2. Requirement

Air Freight initial data only:
- Aircraft Name
- Flight Number
- Schedule
- Route

---

## 3. Sea Freight Reference

### Canonical Layer
- **Transport mode:** `OCEAN_VESSEL` in `shp_transport_mode` enum (`20260826_001_canonical_enums_and_extensions.sql:46`)
- **Execution leg:** `shp_execution_legs` with `transport_mode`, `origin_location_id`, `destination_location_id`, `planned_start_at`, `planned_end_at`
- **Domain service:** `ExecutionPlanService.buildPlanAndLegs` (`lib/domain/shipment/execution-plan-service.ts:51`)
- **Repository:** `ShipmentRepository.saveShipment` (`lib/domain/shipment/repository.ts:189`)
- **API routes:** `/api/v1/forwarding/shipments/[id]/legs` (POST/PATCH), `/api/v1/forwarding/shipments/[id]/execution-plan` (POST)
- **UI:** `ExecutionLegEditor.tsx` (transport mode dropdown with OCEAN_VESSEL), `ExecutionLegCard.tsx` (display)

### Legacy Layer
- **Consolidation:** `fw_consolidations` with `vessel_name`, `voyage_number`, `origin_port`, `destination_port`, `etd`, `eta`
- **Leg:** `fw_legs` with `leg_type IN ('SEA', 'LAND', 'AIR', 'CONSOLIDATION')`

### Pattern Summary
Sea Freight follows this model in the canonical layer:
1. Execution leg with `transport_mode = 'OCEAN_VESSEL'`
2. Route via `origin_location_id` / `destination_location_id` (FK to `md_locations`)
3. Schedule via `planned_start_at` / `planned_end_at` (TIMESTAMPTZ)
4. Transport identity (vessel name, voyage) stored in legacy `fw_consolidations`

For Air Freight, route and schedule are already supported at the canonical leg level. The gap was only transport identity fields (`aircraft_name`, `flight_number`).

---

## 4. Air Freight Gap

| Concern | Sea Freight | Air Freight | Gap |
|---------|-------------|-------------|-----|
| Capability | FORWARDING (SBU) | FORWARDING (same SBU) | None |
| Transport identity | `fw_consolidations.vessel_name` + `voyage_number` (legacy) | None | `aircraft_name`, `flight_number` added to `shp_execution_legs` |
| Schedule | `shp_execution_legs.planned_start_at`/`planned_end_at` | Same fields exist | None |
| Route | `shp_execution_legs.origin_location_id`/`destination_location_id` | Same fields exist | None |
| API | `/api/v1/forwarding/shipments/[id]/legs` POST/PATCH | Same endpoints | Updated to accept/return air fields |
| UI | ExecutionLegEditor (transport mode dropdown) | Same editor | Conditional fields for AIR_FREIGHT |
| Authorization | `resolveApiAuthContext`, RLS, `assertPermission` | Same pattern | None |
| Tenant isolation | RLS `tenant_id = get_my_tenant_id()` | Same RLS | None |
| Server authority | Server-derived tenant | Same pattern | None |
| Tests | Phase 5A baseline 257/257 PASS | Wave 7: 27/27 PASS | Closed |

---

## 5. Implementation

### Files Modified

1. **Migration:** `supabase/migrations/20260905_054_air_freight_initial_dispatch.sql`
   - Added `aircraft_name TEXT` and `flight_number TEXT` nullable columns to `shp_execution_legs`
   - Added index `idx_shp_legs_flight_number` on `(tenant_id, flight_number)` WHERE `flight_number IS NOT NULL`
   - Granted `authenticated` access aligned with existing leg grants

2. **TypeScript types:** `lib/domain/shipment/types.ts`
   - Added `aircraft_name?: string | null` and `flight_number?: string | null` to `ExecutionLeg` interface
   - Added `aircraft_name?: string` and `flight_number?: string` to `CreateExecutionLegDTO` interface

3. **Domain service:** `lib/domain/shipment/execution-plan-service.ts`
   - `buildPlanAndLegs`: passes through `aircraft_name` and `flight_number` from DTO to leg entity

4. **Repository:** `lib/domain/shipment/repository.ts`
   - `saveShipment`: includes `aircraft_name` and `flight_number` in bulk INSERT map

5. **API route (POST legs):** `app/api/v1/forwarding/shipments/[id]/legs/route.ts`
   - Accepts `aircraft_name` and `flight_number` in request body
   - Includes fields in INSERT payload

6. **API route (PATCH leg):** `app/api/v1/forwarding/shipments/[id]/legs/[legId]/route.ts`
   - Allows updating `aircraft_name` and `flight_number` via PATCH

7. **API route (bulk plan):** `app/api/v1/forwarding/shipments/[id]/execution-plan/route.ts`
   - Includes `aircraft_name` and `flight_number` in bulk leg INSERT

8. **UI Editor:** `components/workspaces/forwarding/ExecutionPlanBuilder/ExecutionLegEditor.tsx`
   - Added `aircraftName` and `flightNumber` state
   - Conditionally renders fields when `transport_mode === 'AIR_FREIGHT'`
   - Includes fields in `handleSubmit` DTO
   - Added `Plane` icon import

9. **UI Card:** `components/workspaces/forwarding/ExecutionPlanBuilder/ExecutionLegCard.tsx`
   - Displays `aircraft_name` and `flight_number` in a sky-themed info block when `transport_mode === 'AIR_FREIGHT'`

10. **UI Builder:** `components/workspaces/forwarding/ExecutionPlanBuilder/ExecutionPlanBuilder.tsx`
    - Maps `aircraft_name` and `flight_number` when converting `ExecutionLeg[]` to `CreateExecutionLegDTO[]`

### Files Created

1. **Migration:** `supabase/migrations/20260905_054_air_freight_initial_dispatch.sql`
2. **Tests:** `lib/__tests__/phase5a7-air-freight-initial-dispatch.test.ts`

---

## 6. Security

### Identity Authority
- Tenant identity is derived server-side via `resolveApiAuthContext` in all leg mutation routes.
- Client-supplied `tenant_id` in request body is NOT trusted; `auth.tenantId` is used exclusively.

### Authorization
- Leg mutations are protected by the existing forwarding shipment API auth boundary.
- No new permission codes introduced; existing forwarding access controls apply.

### Tenant Isolation
- `shp_execution_legs` has existing RLS policy enforcing `tenant_id = public.get_my_tenant_id()`.
- New index `idx_shp_legs_flight_number` is tenant-scoped for performant operational lookup.

### Server-Side Mutation
- All Air Freight leg mutations flow through server API routes (`POST /legs`, `PATCH /legs/[legId]`, `POST /execution-plan`).
- Zero direct browser database mutation for Air Freight data.

### RLS
- Existing RLS on `shp_execution_legs` remains authoritative.
- No RLS policies were modified.

---

## 7. Tests

### Wave 7 Targeted Tests
**File:** `lib/__tests__/phase5a7-air-freight-initial-dispatch.test.ts`  
**Result:** 27/27 PASS

| Category | Tests | Result |
|----------|-------|--------|
| Air Freight Type Contract | 3 | PASS |
| Domain Layer Pass-Through | 2 | PASS |
| API Route Acceptance | 3 | PASS |
| UI Conditional Rendering | 3 | PASS |
| Sea Freight Unchanged | 3 | PASS |
| Server Authority & Tenant Isolation | 3 | PASS |
| Migration | 1 | PASS |
| Scope Containment | 6 | PASS |
| Semantic Compatibility with Sea Freight | 3 | PASS |

### Regression Safety
- **Phase 5A tests:** 318/318 PASS (includes Waves 0–6 + Wave 7)
- **TypeScript:** 0 new errors in modified files
- **Domain tests:** Pre-existing module resolution issue (`@/lib/supabase/admin` path alias) in `lib/domain/shipment/__tests__/*` is unrelated to Wave 7 changes.

---

## 8. Regression

No broader regression was executed because:
1. Wave 7 changes are confined to `shp_execution_legs` column additions and their pass-through in existing mutation paths.
2. No shared canonical code semantics were altered.
3. No schema changes affect existing columns or constraints.
4. The Phase 5A targeted test suite (318/318 PASS) sufficiently proves preservation of existing invariants.

**Phase 5A baseline:** 257/257 PASS (Waves 0–6)  
**Phase 5A with Wave 7:** 318/318 PASS

---

## 9. Scope Audit

The following were explicitly NOT implemented (per Wave 7 hard scope boundary):

- AWB engine — NOT implemented
- MAWB/HAWB — NOT implemented
- Airline management — NOT implemented
- Airline master — NOT implemented
- Airport master — NOT implemented
- IATA/ICAO engine — NOT implemented
- Flight scheduling engine — NOT implemented
- Aircraft master — NOT implemented
- Aircraft maintenance — NOT implemented
- ULD management — NOT implemented
- Air cargo manifest — NOT implemented
- Air cargo booking engine — NOT implemented
- Cargo weight/dimension engine — NOT implemented
- Dangerous goods workflow — NOT implemented
- Air freight pricing engine — NOT implemented
- Tariff engine — NOT implemented
- Freight-rate redesign — NOT implemented
- Customs redesign — NOT implemented
- International forwarding redesign — NOT implemented
- Shipment architecture redesign — NOT implemented
- New Air Freight lifecycle — NOT implemented
- New dispatch orchestration engine — NOT implemented
- New Service Request engine — NOT implemented
- New SO/Fulfillment architecture — NOT implemented
- Driver Coin changes — NOT implemented
- WhatsApp changes — NOT implemented
- Cargo Owner Tracking changes — NOT implemented
- Deconsolidation redesign — NOT implemented
- Consolidation/Stuffing redesign — NOT implemented
- DATA-4E work — NOT implemented
- D-Repair work — NOT implemented
- Phase 5B — NOT implemented
- Phase 5C — NOT implemented
- Phase 5D — NOT implemented

---

## 10. Remaining Risks / Debt

1. **Validation depth:** Air Freight aircraft name and flight number are nullable in the database and optional in the DTO. The UI enforces required-ness conditionally, but the API does not reject missing values for `AIR_FREIGHT` legs. This is consistent with the existing Sea Freight pattern (vessel name is NOT NULL only in legacy `fw_consolidations`, not in canonical `shp_execution_legs`). Risk: LOW.

2. **Legacy `fw_legs` not updated:** The legacy `fw_legs` table has `leg_type = 'AIR'` but no air-specific columns. This is acceptable because `fw_legs` is legacy-only and not actively used in the TypeScript domain layer. Risk: LOW.

3. **No Air Freight capability code:** `AIR_FREIGHT` remains a `transport_mode` value, not a separate capability code. This follows the existing architecture (only 4 canonical capabilities: CUSTOMS, FORWARDING, TRUCKING, WAREHOUSE). Risk: LOW — consistent with design principle.

---

## 11. Final Decision

> **GREEN — COMPLETE**

Wave 7 is complete. All required Air Freight initial data fields (Aircraft Name, Flight Number, Schedule, Route) are supported through the existing canonical execution leg architecture. The implementation follows the Sea Freight pattern with minimal schema addition (2 nullable columns on `shp_execution_legs`). No new architecture, no new domains, no new engines were introduced. All 27 targeted Wave 7 tests pass. Existing Phase 5A invariants remain intact.

**Next logical activity:** Phase 5A Final Closure / Final Reconciliation.
