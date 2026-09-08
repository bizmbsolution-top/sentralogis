# SENTRALOGIS — PHASE 3D-5 DISCOVERY REPORT
## Shipment Command Center Detail Workspace Architecture
**Document Version:** 1.0.0-PHASE3D5-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — PROCEEDING TO IMPLEMENTATION  
**Classification:** Internal Technical Architecture  
**Author:** Senior Product Architect + UX Architect + Principal Frontend Engineer  

---

# 1. ARCHITECTURAL BASELINE & DISCOVERY FINDINGS

### 1.1 Existing Domain & Database Capabilities:
- **Canonical Shipment Aggregate (`shp_shipments`, `shp_manifest_items`, `shp_units`, `shp_unit_*`):**
  - Fully implements polymorphic unit storage (Containers, Bulk MT, Packages/Colli, Vehicles).
  - Loaded through `ShipmentRepository.getShipmentAggregate(shipmentId, tenantId)`.
- **Execution Plan & Legs (`shp_execution_plans`, `shp_execution_legs`, `shp_leg_units`):**
  - Directed multimodal legs with sequence, mode, provider strategy (`INTERNAL_SBU` vs `EXTERNAL_VENDOR`), and unit allocations.
- **Milestones & Exceptions (`shp_milestones`, `shp_exceptions`):**
  - Immutable chronological audit milestones.
  - Severity-graded exceptions (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with resolution tracking.
- **Cross-Domain Service Contracts (`svc_service_requests`):**
  - Issued from Forwarding to Trucking, Customs, and Warehouse without creating fake/ghost Work Orders.
- **Customs Clearances (`cus_declarations`):**
  - Declarations with AJU numbers, channels (`GREEN`, `YELLOW`, `RED`), duty calculations, and SPPB statuses.

### 1.2 Frontend & API Gap Analysis:
1. **Consolidated Command Center Projection Endpoint:**
   - To prevent N+1 client round-trips (fetching shipment, plan, milestones, exceptions, service requests, and customs in separate browser calls), we will provide `GET /api/v1/forwarding/shipments/[id]/command-center` which aggregates the bounded context views into a single high-performance payload.
2. **Modular Workspace Components (`components/workspaces/forwarding/`):**
   - `ShipmentCommandHeader.tsx` — Operational header with status badges, metadata matrix, and context-aware action buttons.
   - `CommandAttentionPanel.tsx` — Dynamic attention strip prioritizing CRITICAL exceptions, pending service contracts, and ETA delays.
   - `NextActionCard.tsx` — Actionable card surfacing the immediate next operational requirement.
   - `ShipmentProgressPanel.tsx` — Multi-leg progress tracker (Completed, Active, Upcoming).
   - `ServiceContractPanel.tsx` — Visibility into cross-domain SBU Service Requests.
   - `CustomsSummaryCard.tsx` — Bounded projection of Customs clearance declaration and SPPB status.
   - `ExceptionPanel.tsx` — Severity-sorted exception management panel.
   - `CargoUnitsPanel.tsx` — Polymorphic handling units visualizer.
   - `ShipmentRiskPanel.tsx` — ETA variance and risk indicators.
   - `ActivityTimeline.tsx` — Chronological event & milestone timeline.
3. **Execution Plan Modes:**
   - Default view: View Mode with interactive `ExecutionPlanGraph`.
   - Explicit Edit Mode: Toggles `ExecutionPlanBuilder` for rearranging legs and updating schedules.

---

# 2. IMPLEMENTATION PLAN

1. **API Layer:**
   - Create `app/api/v1/forwarding/shipments/[id]/command-center/route.ts`.
   - Update `lib/api/forwarding-shipments.ts` with `fetchCommandCenterProjection(id)`.
2. **Components Layer:**
   - Implement all 10 modular Command Center components in `components/workspaces/forwarding/`.
3. **Page Layer:**
   - Upgrade `app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx` to the full Command Center workspace.
4. **Validation & Regression:**
   - Automated tests covering all 27 acceptance scenarios in `lib/domain/shipment/__tests__/shipment-command-center.test.ts`.
   - Full regression suite execution ($\ge 96$ tests passing).
   - Static analysis (`tsc --noEmit`, ESLint, architectural grep audit).

---
*Discovery report finalized. Proceeding to implementation.*
