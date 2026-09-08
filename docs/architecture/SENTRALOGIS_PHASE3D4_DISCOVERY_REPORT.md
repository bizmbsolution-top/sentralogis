# SENTRALOGIS — PHASE 3D-4 DISCOVERY REPORT
## Execution Plan Builder & Visual Directed Graph Architecture
**Document Version:** 1.0.0-PHASE3D4-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — PROCEEDING TO IMPLEMENTATION  
**Classification:** Internal Technical Architecture  
**Author:** Senior Product Architect + Principal Frontend Engineer  

---

# 1. EXISTING CAPABILITIES AUDIT

1. **Database Schema (Phase 1 Baseline):**
   - `public.shp_execution_plans` exists with RLS, containing `id`, `tenant_id`, `shipment_id`, `plan_version`, `total_legs`, `is_active`.
   - `public.shp_execution_legs` exists with RLS, containing `id`, `tenant_id`, `shipment_id`, `execution_plan_id`, `leg_sequence`, `leg_code`, `transport_mode`, `execution_provider_type`, `origin_location_id`, `destination_location_id`, `assigned_vendor_id`, `planned_start_at`, `planned_end_at`, `actual_start_at`, `actual_end_at`, `status`.
   - `public.shp_leg_units` exists with RLS for polymorphic unit allocation per leg.

2. **API Capabilities (Phase 3B Baseline):**
   - `GET /api/v1/forwarding/shipments/[id]/execution-plan` (Retrieves active plan, ordered legs, unit allocations).
   - `POST /api/v1/forwarding/shipments/[id]/execution-plan` (Creates/replaces plan with validated sequencing).
   - `GET / POST /api/v1/forwarding/shipments/[id]/legs` (Lists / appends new leg).
   - `PATCH / DELETE /api/v1/forwarding/shipments/[id]/legs/[legId]` (Updates / removes leg).
   - `POST /api/v1/forwarding/shipments/[id]/legs/[legId]/units` (Assigns units to leg, rejecting cross-shipment).
   - `DELETE /api/v1/forwarding/shipments/[id]/legs/[legId]/units/[unitId]` (Removes unit from leg).

3. **Service Contracts (Phase 2 Baseline):**
   - Cross-domain execution uses `ExecutionPlanService.dispatchExecutionLeg` $\rightarrow$ `svc_service_requests` $\rightarrow$ `TruckingServiceRequestAdapter` / `CustomsServiceRequestAdapter`.

---

# 2. REQUIRED FRONTEND CAPABILITIES (PHASE 3D-4)

1. **Dedicated Client API Helper (`lib/api/execution-plan.ts`):**
   - Pure typed REST functions for all execution plan and leg mutations.
2. **Interactive Visual Directed Graph (`components/workspaces/forwarding/ExecutionPlanGraph.tsx`):**
   - Desktop: Adaptive horizontal graph with interactive node locations, transport mode badges, and leg click actions.
   - Mobile: Vertical directed timeline flow without horizontal scrolling.
3. **Execution Plan Builder Workspace (`components/workspaces/forwarding/ExecutionPlanBuilder/`):**
   - `ExecutionPlanBuilder.tsx` (Main workspace component).
   - `ExecutionLegCard.tsx` (Card showing leg details, provider, schedule, allocated units, and service request handoff).
   - `ExecutionLegEditor.tsx` (Modal/drawer editor for adding/editing leg details).
   - `LegDependencyValidator.ts` (Client-side pre-flight validator for dependency cycles, sequence validity, origin != dest).
4. **Integration Boundary in Detail Page (`app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx`):**
   - Clean page header + `ExecutionPlanBuilder` integration.

---

# 3. RISKS & ARCHITECTURAL MITIGATION

| Risk Area | Risk Description | Architectural Mitigation |
| :--- | :--- | :--- |
| **Direct DB Leakage** | Browser performing `supabase.from()` writes. | Strictly prohibited. 100% of operations go through `/api/v1/forwarding/shipments/*`. |
| **Ghost Work Orders** | Premature dispatch creating unwanted job orders. | Editing legs in draft state does NOT dispatch service requests. Dispatch occurs only on explicit operator business action. |
| **Dependency Cycles** | Invalid sequence (e.g. Leg 3 before Leg 1). | `LegDependencyValidator` and server-side `validateLegSequencing` block circular dependencies (HTTP 422). |

---
*Discovery report finalized. Proceeding to implementation.*
