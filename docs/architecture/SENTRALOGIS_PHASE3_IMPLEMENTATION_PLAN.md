# SENTRALOGIS — PHASE 3 IMPLEMENTATION PLAN
## Canonical Shipment Orchestrator & Standalone Customs Workspace
**Document Version:** 1.0.0-PHASE3-PLAN  
**Date:** 26 August 2026  
**Status:** ARCHITECTURE FROZEN — READY FOR IMPLEMENTATION  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Full-Stack Engineer  

---

# 1. CURRENT ARCHITECTURE (BASELINE AUDIT)

Following the completion of **Phase 1** (Canonical Database DDL) and **Phase 2** (Service Contract Adapter & Cross-Domain Dispatcher):
- The canonical database tables (`shp_shipments`, `shp_manifest_items`, `shp_units`, `shp_unit_containers`, `shp_unit_bulk`, `shp_unit_packages`, `shp_unit_vehicles`, `shp_execution_plans`, `shp_execution_legs`, `shp_leg_units`, `shp_milestones`, `shp_exceptions`, `cus_declarations`, `cus_classification_lines`, `svc_service_requests`, `event_outbox`) exist in Supabase with RLS enabled.
- The `lib/domain/service-contracts/` layer allows Forwarding to dispatch transport, customs, and warehouse service requests through adapters without creating Ghost Work Orders.
- However, Forwarding still lacks a **dedicated domain engine** and **composable orchestrator UI** for Shipments, Multi-Modal Execution Plans, and Polymorphic Handling Units.
- Customs Clearance (`app/(dashboard)/sbu/clearance/page.tsx`) remains a placeholder card ("Clearance Module in Development") without interactive declaration forms, classification lines, or tax calculators.

---

# 2. TARGET ARCHITECTURE (PHASE 3)

```
+----------------------------------------------------------------------------------------------------+
|                                    PHASE 3 ARCHITECTURE TOPOLOGY                                   |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|   [COMMERCIAL WORK ORDER] (commercial_work_orders)                                                 |
|            │                                                                                       |
|            ▼ (1 : N Relationship)                                                                  |
|   [FORWARDING DOMAIN: SHIPMENT AGGREGATE ROOT] (shp_shipments)                                     |
|      ├── Cargo Manifest Items (shp_manifest_items)                                                 |
|      ├── Polymorphic Shipment Units (shp_units -> containers, bulk, packages, vehicles)            |
|      ├── Execution Plan (shp_execution_plans)                                                       |
|      │      └── Multi-Modal Execution Legs (shp_execution_legs)                                    |
|      │            └── Leg Unit Allocations (shp_leg_units)                                         |
|      ├── Milestone History (shp_milestones)                                                        |
|      ├── Exceptions & Demurrage Watchdog (shp_exceptions)                                          |
|      └── Dispatches -> svc_service_requests -> ServiceRequestDispatcher                            |
|                                                                                                    |
|   [STANDALONE SBU CUSTOMS DOMAIN] (cus_declarations)                                                |
|      ├── PIB / PEB / TPB Declarations (Standalone from WO or Delegated from Forwarding Leg)        |
|      ├── HS Code Classification Lines (cus_classification_lines)                                   |
|      ├── Tax & Duty Calculation Engine (BM, PPN, PPh 22, Nilai Pabean)                             |
|      └── Customs Release & SPPB State Machine                                                      |
|                                                                                                    |
|   [COMPOSABLE UI WORKSPACES]                                                                       |
|      ├── Forwarding Shipment Workspace (`/sbu/forwarding/shipments`)                               |
|      │     ├── Visual Directed Graph Route / Multi-Modal Legs Visualizer                           |
|      │     ├── Polymorphic Unit Manager (Container / Bulk / Package / Vehicle)                     |
|      │     ├── Milestone Timeline & Live Exceptions Panel                                          |
|      │     └── Integrated Service Contract Status Tracker                                          |
|      └── Customs Clearance Workspace (`/sbu/clearance`)                                            |
|            ├── Active Declarations Queue & Channel Monitoring (Red/Yellow/Green)                   |
|            ├── Interactive PIB/PEB Form & HS Code Classification Table                             |
|            └── Tax Billing & Simponi NTPN Settlement Tracker                                       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

# 3. GAP ANALYSIS & REQUIRED DELIVERABLES

| Component | Current State | Target State (Phase 3) | Action Required |
| :--- | :--- | :--- | :--- |
| **Shipment Domain Engine** | Only `types.ts` exists in `lib/domain/shipment/` | Full DDD domain engine (`shipment-service.ts`, `shipment-factory.ts`, `execution-plan-service.ts`, `milestone-service.ts`, `exception-service.ts`) | **BUILD NEW** |
| **Shipment REST APIs** | Legacy `/api/forwarding/wo` | RESTful `/api/v1/forwarding/shipments/*`, `/legs/*`, `/units/*`, `/timeline`, `/exceptions` | **BUILD NEW** |
| **Forwarding UI** | Legacy rigid wizard in `/sbu/forwarding/wo/` | Composable Shipment Workspace in `/sbu/forwarding/shipments/` (List, Detail, Create, Execution Graph) | **BUILD NEW** |
| **Customs Domain Engine** | Only database tables exist (`cus_*`) | DDD domain engine in `lib/domain/customs/` (`customs-service.ts`, `tax-calculator.ts`, `customs-validator.ts`) | **BUILD NEW** |
| **Customs REST APIs** | None | RESTful `/api/v1/customs/declarations/*`, `/classification-lines/*`, `/sppb` | **BUILD NEW** |
| **Customs UI Workspace** | Static placeholder card | Standalone Customs Workspace in `app/(dashboard)/sbu/clearance/page.tsx` with PIB/PEB wizard & tax settlement | **TRANSFORM** |
| **Canonical Events** | Outbox infrastructure exists | Emit `ShipmentCreated`, `ExecutionPlanCreated`, `CustomsDeclarationCreated`, `CustomsReleased`, etc. | **INTEGRATE** |

---

# 4. FILE-BY-FILE IMPLEMENTATION PLAN

### A. Shipment Domain Engine (`lib/domain/shipment/`)
1. `lib/domain/shipment/errors.ts` [NEW]: Explicit domain error hierarchy (`ShipmentNotFoundError`, `InvalidShipmentStatusError`, `ExecutionLegDependencyError`, etc.).
2. `lib/domain/shipment/shipment-factory.ts` [NEW]: Generates canonical `Shipment`, `ManifestItem`, and `ShipmentUnit` aggregates with concurrency-safe `SHP-YYYYMM-XXXXXX` numbering.
3. `lib/domain/shipment/execution-plan-service.ts` [NEW]: Manages multi-modal directed-graph legs, modal sequencing, and dependency validation (e.g. sea discharge before customs, customs release before road dispatch).
4. `lib/domain/shipment/milestone-service.ts` [NEW]: Immutable milestone append and timeline querying.
5. `lib/domain/shipment/exception-service.ts` [NEW]: Exception creation, severity tagging, and resolution tracking.
6. `lib/domain/shipment/shipment-service.ts` [NEW]: High-level application service facade orchestrating complete shipment workflows.

### B. Customs Domain Engine (`lib/domain/customs/`)
1. `lib/domain/customs/types.ts` [NEW]: Complete TypeScript types for Customs Declarations, HS Code classifications, and tax billing.
2. `lib/domain/customs/tax-calculator.ts` [NEW]: Data-driven customs duty, PPN, and PPh calculation engine based on CIF value and exchange rate.
3. `lib/domain/customs/customs-service.ts` [NEW]: Application service managing Standalone and Delegated PIB/PEB declarations.

### C. Forwarding & Customs API Routes (`app/api/v1/`)
1. `app/api/v1/forwarding/shipments/route.ts` [NEW]: `POST` - Create Shipment, `GET` - List Shipments.
2. `app/api/v1/forwarding/shipments/[id]/route.ts` [NEW]: `GET` - Single Shipment Detail, `PATCH` - Update.
3. `app/api/v1/forwarding/shipments/[id]/plan/route.ts` [NEW]: `POST` - Create/Update Execution Plan & Legs.
4. `app/api/v1/forwarding/shipments/[id]/dispatch-leg/route.ts` [NEW]: `POST` - Dispatches specific leg via `ServiceRequestService`.
5. `app/api/v1/forwarding/shipments/[id]/units/route.ts` [NEW]: `GET` / `POST` - Polymorphic unit management.
6. `app/api/v1/forwarding/shipments/[id]/timeline/route.ts` [NEW]: `GET` - Milestone timeline.
7. `app/api/v1/forwarding/shipments/[id]/exceptions/route.ts` [NEW]: `GET` / `POST` - Exception logging and resolution.
8. `app/api/v1/customs/declarations/route.ts` [NEW]: `POST` - Create Declaration, `GET` - List Declarations.
9. `app/api/v1/customs/declarations/[id]/route.ts` [NEW]: `GET` - Single Declaration, `PATCH` - Update.
10. `app/api/v1/customs/declarations/[id]/sppb/route.ts` [NEW]: `POST` - Record SPPB Customs Release.

### D. Composable User Interfaces
1. `app/(dashboard)/sbu/forwarding/shipments/page.tsx` [NEW]: Modern Shipment Workspace & Directory with status filters, corridor badges, and exception indicators.
2. `app/(dashboard)/sbu/forwarding/shipments/create/page.tsx` [NEW]: Composable Shipment Creator binding to Commercial Work Orders with polymorphic unit builders.
3. `app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx` [NEW]: Comprehensive Shipment Command Center with visual execution plan graph, cargo manifests, timeline, and service request dispatcher.
4. `app/(dashboard)/sbu/clearance/page.tsx` [TRANSFORM]: Full Standalone Customs Clearance Workspace with PIB/PEB registration, channel tracker (Green/Yellow/Red), and tax settlement overview.

---

# 5. EXECUTION & SEQUENCE PLAN

```
Phase 3.1: Shipment Domain Engine (errors, factory, plan, milestone, exception, service)
Phase 3.2: Customs Domain Engine (types, tax-calculator, service)
Phase 3.3: RESTful API Endpoints (forwarding/shipments & customs/declarations)
Phase 3.4: Forwarding UI Workspace (Directory, Create, Detail with Visual Route Graph)
Phase 3.5: Customs UI Workspace (Full Interactive Clearance Dashboard)
Phase 3.6: Automated Tests & Validation Suite (20 scenario acceptance tests)
Phase 3.7: Static Typecheck (`tsc`) & Linting Verification
```

---

# 6. ROLLBACK & COEXISTENCE STRATEGY
- **Trucking Stack Untouched:** All driver, GPS, vehicle, and existing `job_orders` execution remain 100% untouched.
- **Non-Destructive UI:** Legacy Forwarding routes (`/sbu/forwarding/wo`) remain functional side-by-side during the rollout.
- **Data Isolation:** All new queries use canonical `shp_*` and `cus_*` tables with RLS tenant isolation.

---
*Approved by Principal Software Architect — Sentralogis Platform v1.0*
