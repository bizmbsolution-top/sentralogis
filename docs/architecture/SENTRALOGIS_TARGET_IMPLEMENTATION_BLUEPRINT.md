# SENTRALOGIS — TARGET IMPLEMENTATION BLUEPRINT v1.0
## Composable Logistics Operating Platform (LaaS) — Implementation Architecture
**Document Version:** 1.0.0-BLUEPRINT  
**Status:** APPROVED ARCHITECTURAL BASELINE  
**Classification:** Internal Technical Standard  
**Authors:** Enterprise Architecture Board, DDD Architecture Group, Database Architecture Group  

---

# 1. EXECUTIVE ARCHITECTURAL FOUNDATION

Sentralogis is architected as a **Next-Generation Composable Logistics Operating Platform (LaaS — Logistics as a Service Operating System)**. The system is engineered to decouple commercial agreements from multi-modal journey orchestration and physical/regulatory execution.

### The Canonical Decoupling Chain
```
+----------------------------------------------------------------------------------------------------+
|                                    CANONICAL VALUE CHAIN FLOW                                      |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    [COMMERCIAL INTENT]                                                                             |
|            │                                                                                       |
|            ▼                                                                                       |
|    [WORK ORDER (com_work_orders)]  ◄─── 1 WorkOrder binds 1 ServiceScope (Incoterms / Responsibility)
|            │                                                                                       |
|            ▼ (1 to N Relation)                                                                     |
|    [SHIPMENT (shp_shipments)]      ◄─── Operational Aggregate Root (Owns Physical Kargo Journey)  |
|            │                                                                                       |
|            ▼ (1 to 1 Relation)                                                                     |
|    [EXECUTION PLAN (shp_execution_plans)]                                                          |
|            │                                                                                       |
|            ▼ (1 to N Relation)                                                                     |
|    [EXECUTION LEG (shp_execution_legs)] ◄─── Polymorphic Segments (Road, Sea, Barge, Customs, WH)  |
|            │                                                                                       |
|            ▼ (1 to 1 per Leg)                                                                      |
|    [SERVICE REQUEST (svc_service_requests)] ◄─── Strict Cross-Domain Async Contract Payload        |
|            │                                                                                       |
|            ▼ (Delegation to SBU or Partner)                                                        |
|    [DOMAIN JOB (trk_job_orders / cus_declarations / wh_handling_jobs / exc_partner_bookings)]      |
|            │                                                                                       |
|            ▼                                                                                       |
|    [PHYSICAL & REGULATORY EXECUTION]                                                               |
|            │                                                                                       |
|            ▼ (Emits)                                                                               |
|    [CANONICAL DOMAIN EVENTS] ─────────────────────────────────────────────────────────────┐        |
|            │                                                                              │        |
|            ▼                                                                              ▼        |
|    [FINANCE LEDGER] (3-Tier)                      [CONTROL TOWER PROJECTIONS] (Tri-Layer: Ops, Cust, AI)
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### Core Invariant Rules
1. **Commercial Intent $\neq$ Physical Execution**: `com_work_orders` never stores truck license plates, driver IDs, container seal numbers, or warehouse bin codes.
2. **Shipment is the Operational Aggregate Root**: `shp_shipments` coordinates the journey across nodes but never mutates private tables belonging to execution SBUs.
3. **No Direct Cross-Domain Database Mutation**: Modifying another domain's transactional tables via direct SQL `INSERT/UPDATE` is strictly prohibited. All cross-domain interaction occurs via `svc_service_requests` and Canonical Domain Events.
4. **Cargo & Mode Agnosticism**: Kargo is modeled through polymorphic `shp_units` (Container, Bulk MT, Breakbulk, Pallet, Vehicle, Tank), eliminating container-only assumptions.
5. **3-Tier Financial Isolation**: Commercial Invoiced Revenue (AR), Operational Execution COGS (AP), and Pass-Through Regulatory Disbursements (Pajak Impor/Simponi) are isolated into discrete account types.

---

# 2. BOUNDED CONTEXTS TOPOLOGY

The platform is partitioned into 8 autonomous Bounded Contexts:

```
+----------------------------------------------------------------------------------------------------+
|                                    ENTERPRISE BOUNDED CONTEXTS                                     |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
| 1. COMMERCIAL CONTEXT (`com_*`)                                                                    |
|    - Owns: Service Catalog, Customer Contracts, Pricing Tariffs, Work Orders, Service Scopes.   |
|    - Boundaries: Commercial agreements, billing schedules, Incoterms mapping.                     |
|                                                                                                    |
| 2. FORWARDING & JOURNEY ORCHESTRATION CONTEXT (`shp_*`)                                            |
|    - Owns: Shipments, Cargo Manifests, Polymorphic Shipment Units, Execution Plans & Legs.         |
|    - Boundaries: Routing, milestone aggregation, exception detection, public tracking identity.   |
|                                                                                                    |
| 3. TRUCKING CONTEXT (`trk_*`)                                                                      |
|    - Owns: Trucking Job Orders, Fleet Allocation, Driver Readiness, Native GPS Telemetry, e-POD.   |
|    - Boundaries: Private land transport execution.                                                 |
|                                                                                                    |
| 4. CUSTOMS CLEARANCE CONTEXT (`cus_*`)                                                             |
|    - Owns: Customs Declarations (PIB/PEB/BC), HS Code Classification, Tax Billing, CEISA SPPB.     |
|    - Boundaries: Regulatory import/export compliance (Standalone & Delegated modes).               |
|                                                                                                    |
| 5. WAREHOUSE CONTEXT (`wh_*`)                                                                      |
|    - Owns: Warehouse Handling Jobs, Crossdock Staging, Stuffing/Stripping Tally, WMS Bins.         |
|    - Boundaries: Physical warehouse handling and consolidation depot operations.                   |
|                                                                                                    |
| 6. EXCHANGE & PARTNER CONTEXT (`exc_*`)                                                            |
|    - Owns: Shipping Line Bookings, Airline AWBs, 3PL Transporter Rate Exchange, Marine Charters.   |
|    - Boundaries: External logistics partner orchestration.                                         |
|                                                                                                    |
| 7. FINANCE CONTEXT (`fin_*`)                                                                       |
|    - Owns: Revenue Recognition, COGS Allocation per Leg, Pass-Through Disbursement Ledger.        |
|    - Boundaries: P&L calculations, Accounts Receivable (AR), Accounts Payable (AP).                |
|                                                                                                    |
| 8. INTELLIGENCE & CONTROL TOWER CONTEXT (`int_*`)                                                  |
|    - Owns: CQRS Projections (Internal Ops Tower, Customer Success Portal, AI Copilot Engine).      |
|    - Boundaries: Real-time risk detection, demurrage countdown, predictive ETA, SLA monitoring.   |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

# 3. INTER-DOMAIN COMMUNICATION ARCHITECTURE

Inter-domain collaboration is executed through two decoupled mechanisms:

### A. Asynchronous Service Request Contracts (`svc_service_requests`)
When Forwarding requires physical or regulatory execution for a leg, it issues a `svc_service_requests` record specifying:
- Source Domain & Target Domain
- Leg Reference & Shipment Reference
- Required Service SKU & Payload Specifications
- Target SLA Window

The target SBU acknowledges, validates capacity, creates its private execution job (e.g. `trk_job_orders` or `cus_declarations`), and transitions the request to `ACCEPTED`.

### B. Canonical Event Streaming (Event Outbox Pattern)
State changes in execution domains are published to `event_outbox`. Dedicated event workers consume these events to update Forwarding Execution Legs, trigger financial accruals, and project real-time data into Control Tower views.

---

# 4. COMPOSABLE CAPABILITY MATRIX

The platform supports any commercial service combination without requiring new core applications:

| Customer Commercial Purchase | Commercial Work Order | Service Scope Bound | Operational Shipment Generated? | Execution Legs Dispatched |
| :--- | :--- | :--- | :---: | :--- |
| **1. Standalone Customs Clearance** | 1 `com_work_orders` | `CUSTOMS_ONLY` | **NO** | Direct `svc_service_requests` $\rightarrow$ `cus_declarations`. |
| **2. Standalone Trucking Haulage** | 1 `com_work_orders` | `TRUCKING_ONLY` | **NO** | Direct `svc_service_requests` $\rightarrow$ `trk_job_orders`. |
| **3. Partial Scope: Port to Factory (BYD CKD)** | 1 `com_work_orders` | `PORT_TO_DOOR` (DAP) | **YES** | Leg 1: Port Clearance $\rightarrow$ Leg 2: Customs PIB $\rightarrow$ Leg 3: Truck Haulage $\rightarrow$ Leg 4: Depo Return. |
| **4. Multimodal Industrial (Aluminium 5,000 MT)**| 1 `com_work_orders` | `FACTORY_TO_VESSEL` (FOB) | **YES** | Leg 1: Truck $\rightarrow$ Leg 2: Staging $\rightarrow$ Leg 3: Barge $\rightarrow$ Leg 4: STS Transshipment $\rightarrow$ Leg 5: Vessel. |
| **5. Full International Multimodal** | 1 `com_work_orders` | `DOOR_TO_DOOR` (DDP) | **YES** | Pre-carriage $\rightarrow$ Export Customs $\rightarrow$ Ocean Freight $\rightarrow$ Import Customs $\rightarrow$ On-carriage. |

---

# 5. ENTERPRISE LOCATION MODEL

All SBUs share a canonical location master (`md_locations`). Specific tables like `fw_locations` are deprecated.

```
+----------------------------------------------------------------------------------------------------+
|                                    CANONICAL LOCATION CAPABILITIES                                 |
+----------------------------------------------------------------------------------------------------+
| A location record in `md_locations` is tagged with one or more functional capability tags:         |
|   - `PORT`: Seaports and River Ports (e.g., Tanjung Priok, Patimban, Tanjung Perak)                |
|   - `AIRPORT`: Air cargo hubs (e.g., Soekarno-Hatta CGK, Juanda SUB)                               |
|   - `TERMINAL`: Container and Bulk Terminals (e.g., JICT, NPCT1, TPK Nilam)                        |
|   - `CUSTOMS_OFFICE`: KPU / KPPBC Customs Inspection Points                                        |
|   - `WAREHOUSE`: Storage, CFS Consolidation, Bonded TPS/TPB Hubs                                   |
|   - `JETTY_ANCHORAGE`: Marine Barging & Floating Crane STS Transshipment Points                    |
|   - `CUSTOMER_SITE`: Factory, Plant, Distribution Center, or Commercial Store                      |
|   - `CONTAINER_DEPOT`: Empty container storage and repair yards                                    |
+----------------------------------------------------------------------------------------------------+
```

---

# 6. ARCHITECTURAL QUALITY GATES SUMMARY

1. **Zero Direct DB Mutations**: No cross-SBU SQL writes.
2. **Zero Ghost Work Orders**: Forwarding never generates synthetic `work_orders`.
3. **Deterministic Multi-Tenancy**: 100% of tables enforce `tenant_id` RLS.
4. **Zero-Cost Projection**: Customer portal has zero access to internal COGS.
5. **Non-Destructive Co-Existence**: Legacy Trucking execution operates uninterrupted.

---
*Approved by the Principal Enterprise Architecture Board — Sentralogis Platform v1.0*
