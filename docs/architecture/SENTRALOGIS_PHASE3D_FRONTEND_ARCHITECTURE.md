# SENTRALOGIS — PHASE 3D FRONTEND WORKSPACE ARCHITECTURE
## Composable Logistics Operating Workspaces: Forwarding Orchestrator & Standalone Customs Clearance
**Document Version:** 1.0.0-PHASE3D-ARCH  
**Date:** 26 August 2026  
**Status:** ARCHITECTURAL SPECIFICATION & DISCOVERY FREEZE  
**Classification:** Internal Product & Technical Architecture  
**Author:** Senior Product Architect + UX Architect + Principal Frontend Engineer  

---

# 1. EXECUTIVE SUMMARY & UX PHILOSOPHY

Sentralogis is transitioning from isolated CRUD module pages into a **Composable Logistics Operating Workspace**. The frontend architecture models physical logistics orchestration through high-density, intent-driven, exception-first command centers:

> **"WORKSPACE BEFORE MENU · INTENT BEFORE INTERFACE · SHIPMENT BEFORE MODULE · EXCEPTION BEFORE TRANSACTION · TIMELINE BEFORE TABLE · COMMAND CENTER BEFORE CRUD"**

The user operates an interactive **Logistics Control Tower & Command Center** rather than filling flat ERP database forms.

```
Commercial Work Order (commercial_work_orders)
        │
        ▼ (1 : N Relationship)
Forwarding Shipment Workspace (`/sbu/forwarding/shipments`)
  ├── Cargo Manifests & Polymorphic Units (Container, Bulk, Package, Vehicle)
  ├── Composable Multi-Modal Execution Plan Graph (SEA, PORT, CUSTOMS, ROAD, AIR, RAIL)
  ├── Service Contract Dispatcher Panel (Contractual handoff to Trucking/Customs/Warehouse)
  ├── Real-time Milestone Timeline & Exception Watchdog
  └── Cross-Domain Visibility (Customs SPPB & Trucking Fleet Live Status)

Standalone Customs Clearance Workspace (`/sbu/clearance`)
  ├── Clearance Control Center (KPI Cards & Channel Distribution: GREEN, YELLOW, RED)
  ├── Declarations Directory (`/sbu/clearance/declarations`)
  ├── Declaration Command Center (`/sbu/clearance/declarations/[id]`)
  ├── Interactive HS Code Classification & Valuation Table
  ├── Deterministic Tax Breakdown (Nilai Pabean, Bea Masuk, Nilai Impor, PPN, PPh 22)
  └── SPPB Official Release Manager
```

---

# 2. ROUTE ARCHITECTURE & WORKSPACE TOPOLOGY

### A. SBU Forwarding (Shipment Orchestration)
1. **Shipment Command Directory:** `/sbu/forwarding/shipments`
   - Filterable, high-density operational directory with corridor badges, polymorphic unit counts, active leg indicators, customs clearance status, risk flags, and live exception tags.
2. **Composable Shipment Creator:** `/sbu/forwarding/shipments/create`
   - 3-column composable workspace: Left (Commercial Context & Parties) $\rightarrow$ Center (Polymorphic Units & Execution Plan Designer) $\rightarrow$ Right (Operational Summary & Validation).
3. **Shipment Command Center (Detail):** `/sbu/forwarding/shipments/[id]`
   - Full-spectrum operational cockpit with live execution timeline, visual directed graph route visualizer, cargo handling units, service request dispatch tracker, and exception manager.

### B. SBU Customs Clearance (Standalone PPJK & Customs)
1. **Clearance Control Center (Dashboard):** `/sbu/clearance`
   - Standalone operational workspace showing channel distributions (Green/Yellow/Red), pending inspections, document reviews, unpaid tax billings, and SPPB pending queues.
2. **Customs Declarations Directory:** `/sbu/clearance/declarations`
   - Filterable directory for PIB (Import), PEB (Export), TPB, and FTZ declarations.
3. **Customs Declaration Workspace:** `/sbu/clearance/declarations/[id]`
   - Full declaration command center featuring HS code classification, valuation breakdown, tax calculator preview, channel inspection gate, and official SPPB release issuance.

---

# 3. COMPONENT ARCHITECTURE & DESIGN SYSTEM

### Reusable UI Primitives (Reused from `@/components/ui/`):
- `Card`, `Button`, `Badge`, `StatusBadge`, `Table`, `Input`, `SearchableSelect`, `Modal`.

### Composable Workspace Components to Create (`components/workspaces/`):
1. `ShipmentStatusBadge.tsx` — Status visualizer with pulse indicator for active transit/customs hold.
2. `ExecutionPlanGraph.tsx` — Visual directed multi-modal node-and-edge route graph (e.g. Shanghai Port $\xrightarrow{\text{Ocean}}$ Patimban $\xrightarrow{\text{Port Handling}}$ Patimban $\xrightarrow{\text{Customs}}$ Patimban $\xrightarrow{\text{Trucking}}$ Subang).
3. `PolymorphicUnitCard.tsx` — Handling unit visualizer adapting to Container (ISO, Seal, Tare), Bulk (Tonnage, Moisture), Package (Colli, Dims, Stackable), and Vehicle (VIN, Model).
4. `ServiceRequestContractCard.tsx` — Contractual handoff card tracking `ISSUED` $\rightarrow$ `ACCEPTED` $\rightarrow$ `EXECUTING` $\rightarrow$ `COMPLETED` with SBU adapter badges.
5. `MilestoneTimeline.tsx` — Chronological milestone stream with verified timestamps and location pins.
6. `ExceptionBanner.tsx` — High-severity exception alert with countdown SLA remaining and resolution action.
7. `CustomsTaxBreakdownCard.tsx` — Transparent calculation card showing $\text{CIF} \rightarrow \text{Nilai Pabean} \rightarrow \text{BM} \rightarrow \text{Nilai Impor} \rightarrow \text{PPN} \rightarrow \text{PPh 22} \rightarrow \text{Total Pajak}$.
8. `CustomsChannelBadge.tsx` — Distinct visual badges for GREEN (Fast Track), YELLOW (Doc Review), and RED (Physical Inspection).

---

# 4. API CONSUMPTION & STATE MANAGEMENT STRATEGY

### Architectural Invariants:
1. **Pure API Gateway:** Frontend **NEVER** queries Supabase tables directly. All interactions consume:
   - `/api/v1/forwarding/shipments/*`
   - `/api/v1/customs/declarations/*`
   - `/api/v1/service-requests/*`
2. **Server/Client Separation:** Page skeletons and initial data load via React Server Components / Client hooks using `useAuth()`.
3. **Optimistic Updates & Feedback:** High-priority actions (e.g. status transition, exception logging, SPPB release) provide instant visual state update with `react-hot-toast` error rollback.

---

# 5. RESPONSIVE & MOBILE-FIRST STRATEGY

- **Desktop ($\ge 1280\text{px}$):** 3-Column Command Center layout (Context $\mid$ Work Area $\mid$ Summary & SLA Timeline).
- **Tablet ($768\text{px} - 1279\text{px}$):** 2-Column layout with collapsible timeline drawer.
- **Mobile ($< 768\text{px}$):** Stacked mobile cockpit prioritizing Status, Exception Alerts, Active Leg, and One-Tap Actions.

---

# 6. FEATURE FLAG & COEXISTENCE STRATEGY

- **Non-Destructive Coexistence:** The legacy Forwarding UI (`/sbu/forwarding/wo`) remains **100% untouched and operational** alongside `/sbu/forwarding/shipments`.
- **Environment Flags:**
  ```env
  NEXT_PUBLIC_FEATURE_FORWARDING_SHIPMENT_WORKSPACE=true
  NEXT_PUBLIC_FEATURE_CUSTOMS_WORKSPACE=true
  ```

---

# 7. EXPLICIT FILE MANIFEST

### Files to Create in Phase 3D:
1. `components/workspaces/forwarding/ShipmentStatusBadge.tsx`
2. `components/workspaces/forwarding/ExecutionPlanGraph.tsx`
3. `components/workspaces/forwarding/PolymorphicUnitCard.tsx`
4. `components/workspaces/forwarding/ServiceRequestContractCard.tsx`
5. `components/workspaces/forwarding/MilestoneTimeline.tsx`
6. `components/workspaces/forwarding/ExceptionBanner.tsx`
7. `components/workspaces/customs/CustomsTaxBreakdownCard.tsx`
8. `components/workspaces/customs/CustomsChannelBadge.tsx`
9. `app/(dashboard)/sbu/forwarding/shipments/page.tsx` (Shipment Command Directory)
10. `app/(dashboard)/sbu/forwarding/shipments/create/page.tsx` (Composable Shipment Creator)
11. `app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx` (Shipment Command Center Detail)
12. `app/(dashboard)/sbu/clearance/page.tsx` (Standalone Clearance Control Center Dashboard)
13. `app/(dashboard)/sbu/clearance/declarations/page.tsx` (Customs Declarations Directory)
14. `app/(dashboard)/sbu/clearance/declarations/[id]/page.tsx` (Declaration Workspace Detail)
15. `docs/architecture/SENTRALOGIS_PHASE3D_FRONTEND_ARCHITECTURE.md` (This document)

### Files to Modify in Phase 3D:
1. `components/layout/Sidebar.tsx` (Add navigation links for Shipment Orchestrator and Clearance Control Center)

### Explicitly Protected Files (MUST NOT BE MODIFIED):
* `android/app/src/main/java/com/sentralogis/driver/*` (Android Native Foreground GPS Service)
* `app/jo/[token]/page.tsx` (Driver PWA Interface)
* `app/api/jo/*` (Driver Telemetry & GPS APIs)
* `lib/hooks/useDriverGpsPing.ts` & `lib/offline/offlineSyncEngine.ts` (GPS Engine)
* `src/domains/trucking/*` (Mature Trucking Aggregates)
* Production Tables: `job_orders`, `job_routes`, `job_tracking`, `data_armada`, `data_driver`, `md_locations`, `md_entities`, `md_tenants`
* Legacy Forwarding UI (`/sbu/forwarding/wo/*`)

---

# 8. ACCEPTANCE TEST PLAN (20 SCENARIOS)

| Test ID | Test Scenario | Acceptance Criteria |
| :---: | :--- | :--- |
| **TEST 1** | Canonical Shipment Creation | Form creates shipment via `POST /api/v1/forwarding/shipments`. |
| **TEST 2** | Container Unit Support | FCL container cards render ISO type, seal number, tare weight. |
| **TEST 3** | Bulk Unit Support | Bulk cards render metric tonnage and moisture %. |
| **TEST 4** | Package Unit Support | Package cards render colli count and dimensions. |
| **TEST 5** | Vehicle Unit Support | Vehicle cards render VIN and model variant. |
| **TEST 6** | Multi-modal Execution Plan | Visual graph renders Ocean, Port, Customs, Road legs. |
| **TEST 7** | Trucking Service Request | Card shows contractual handoff to SBU Trucking without ghost WOs. |
| **TEST 8** | Customs Service Request | Card shows contractual handoff to SBU Customs Clearance. |
| **TEST 9** | Milestone Timeline | Milestone stream renders verified timestamps and location pins. |
| **TEST 10** | Exception Visibility | Critical exceptions render prominent warning banners with SLA. |
| **TEST 11** | Standalone Declaration Creation | Customs user can create declaration without Forwarding. |
| **TEST 12** | HS Code Classification | Classification lines editable with real-time tax update. |
| **TEST 13** | Tax Calculator Breakdown | Card shows transparent Nilai Pabean, BM, PPN, PPh 22 math. |
| **TEST 14** | Customs Channel Action | Channel badge shows GREEN, YELLOW, or RED with inspection gate. |
| **TEST 15** | SPPB Official Release | One-tap release action invokes SPPB API after clearance. |
| **TEST 16** | Cross-Domain Forwarding View | Forwarding command center displays customs SPPB status cleanly. |
| **TEST 17** | Cross-Domain Customs View | Customs workspace displays shipment context without DB ownership. |
| **TEST 18** | Tenant Isolation | Workspace displays only current tenant's data. |
| **TEST 19** | Legacy UI Coexistence | Legacy `/sbu/forwarding/wo` remains functional side-by-side. |
| **TEST 20** | Production Trucking Safety | Zero changes to driver apps, telemetry, or existing jobs. |

---
*Architectural discovery and design completed. Ready for sub-phase execution upon authorization.*
