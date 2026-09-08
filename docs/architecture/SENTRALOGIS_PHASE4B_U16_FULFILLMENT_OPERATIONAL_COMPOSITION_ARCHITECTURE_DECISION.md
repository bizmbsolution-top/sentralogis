# SENTRALOGIS — PHASE 4B

# U-16 — FULFILLMENT OPERATIONAL COMPOSITION ARCHITECTURE DECISION

**Date:** 2026-08-28  
**Status:** DISCOVERY & ARCHITECTURE DESIGN COMPLETE · IMPLEMENTATION DEFERRED  
**Depends on:** U-01..U-15R (GREEN)  
**Governing Authority:** ADR-018, ADR-020, ADR-033..044 (RATIFIED)  
**Nature:** Architectural Discovery & Canonical Operational Composition Specification  
**Production Code Changes:** 0 (Discovery Only)  
**Production Migration Changes:** 0 (Discovery Only)  

---

## 1. Executive Summary

**U-16** establishes the definitive architectural specification for **Fulfillment Operational Composition**: how a complex, multi-modal, multi-capability commercial **Sales Order (SO)** is decomposed by **Fulfillment** into concrete operational execution across **Forwarding (Shipment, Legs, Units)**, **Customs Clearance (Declarations, PPJK)**, **Trucking (Work Orders, WO Items, Job Orders, Dispatch)**, and **Warehouse (WMS, Receipts, Picking)** — **without turning Fulfillment into a second operational engine**.

### Core Invariants Established:
1. **Fulfillment is a Lightweight Composition Aggregate (ADR-039):** It coordinates, allocates, and tracks progress; it contains **ZERO** operational mechanics, zero driver/truck assignments, zero GPS tracking, zero container manifests, zero customs XML generation, and zero warehouse bin assignments.
2. **Canonical Responsibility Separation:**
   - **Sales Order (`sales_orders`)** = Commercial Customer Commitment (*What was sold, commercial terms, agreed pricing*).
   - **Fulfillment (`fulfillments`, `fulfillment_allocations`)** = Commercial-to-Operational Composition (*How the commitment is decomposed into capability scopes, revisions, and progress tracking*).
   - **Shipment (`shp_shipments`)** = Physical Logistics Movement (*Forwarding aggregate root: manifest, units/containers, multimodal execution legs, carriers, BLs, ETD/ETA*).
   - **Service Request (`svc_service_requests`)** = Cross-Domain Command & Dispatch Contract (ADR-033: *Asynchronous command message requesting domain execution*).
   - **Work Order (`work_orders`)** = Internal Operational Commitment (*The operational case file authorized by commercial intent*).
   - **WO Item (`wo_items`)** = Operational Work Line Item (*Discrete execution slot*).
   - **Job Order (`job_orders`)** = Physical Resource Execution Assignment (*Driver, vehicle, route, dispatch*).
   - **Customs Declaration (`cus_declarations`)** = Statutory Customs Document (*Sovereign CEISA declaration, BTKI tariff, taxes, SPPB*).
   - **Warehouse Order (`wh_receipt_orders`, `wh_picking_lists`)** = WMS Inventory Operations (*Staging, cross-docking, storage, picking*).
3. **Strict Cardinality Guardrails:**
   - SO $\to$ Fulfillment: `1 : N` (Versioned Revisions, ADR-042).
   - SO $\to$ WO: `1 : N` (ADR-037).
   - **Many SO $\to$ 1 WO is STRICTLY FORBIDDEN** (ADR-037).
   - Direct SO $\to$ JO, Direct Fulfillment $\to$ JO, Direct Quote $\to$ WO are **STRICTLY FORBIDDEN**.

---

## 2. Current-State Forensic Repository Findings

A comprehensive repository audit of existing operational domains revealed the following architectural baseline:

| Domain | Table / Aggregate Root | Current Schema & Architecture State | Handoff Boundary |
|---|---|---|---|
| **Commercial** | `commercial_work_orders` (Engagement), `sales_orders` (SO) | SO is canonical customer commitment header with `next_sales_order()` authority. `sales_orders.engagement_id` is NOT NULL (ADR-034). | SO accepted $\to$ triggers Fulfillment composition. |
| **Fulfillment** | `fulfillments`, `fulfillment_allocations` | `fulfillments` header has `sales_order_id`, `fulfillment_number` (`FL-YYYY-MM-NNNN`), `revision_no`, `status`, `version_no`. `fulfillment_allocations` scopes capability types (`FORWARDING`, `CUSTOMS`, `TRUCKING`, `WAREHOUSE`) with allocated/delivered quantities. | Allocation scopes operational handoff to specific capability domain. |
| **Forwarding** | `shp_shipments`, `shp_units`, `shp_execution_legs` | `shp_shipments` is the logistics movement aggregate root. Encapsulates `POL`, `POD`, `MBL`, `HBL`, `booking_reference`, `containers`, `carrier`, `vessel`, and `voyage`. Child `shp_execution_legs` decomposes route into transport modes (`ROAD_TRUCK`, `OCEAN_VESSEL`, `AIR_FREIGHT`, `PORT_TERMINAL_HANDLING`, etc.). Has authorized `sales_order_id` FK (ADR-038). | Forwarding Allocation binds to `shp_shipments.id`. Forwarding legs dispatch sub-tasks via `svc_service_requests`. |
| **Customs** | `cus_declarations`, `cus_classification_lines`, `cus_declaration_documents` | `cus_declarations` is sovereign statutory document. Progressive attachment engine (`CustomsAttachmentService` / ADR-019, ADR-021) supports nullable attachment to `shipment_id`, `execution_leg_id`, and `job_order_id`. | Customs Allocation binds to `cus_declarations.id` or attaches declaration to Forwarding execution leg. |
| **Trucking** | `work_orders`, `wo_items`, `job_orders` | Trucking lineage adapter (`trucking-lineage.ts` / U-07) requires operational lineage `SR.work_order_id` (Engagement) $\to$ `work_orders` $\to$ `wo_items` $\to$ `job_orders`. Driver/armada dispatch occurs exclusively in `job_orders`. | Trucking Allocation commands trucking via `svc_service_requests`, materializing `work_orders` and `wo_items`. |
| **Warehouse** | `wh_receipt_orders`, `wh_picking_lists`, `wh_inventory` | WMS operational schema supports inbound receipts, outbound picking lists, stock snapshots, and location management. | Warehouse Allocation commands WMS via `svc_service_requests` (`target_domain='WAREHOUSE'`). |
| **Service Request** | `svc_service_requests` | Cross-domain command contract (ADR-033) with correlation ID, idempotency key, polymorphic `assigned_domain_job_id`, and SLA target time. | Connects orchestrators (Forwarding/Fulfillment) to executing SBUs without tight coupling. |

---

## 3. Canonical Operational Handoff Specification

### 3.1 The End-to-End Operational Lifecycle Sequence

```text
[1. COMMERCIAL COMMITMENT]
Sales Order (SO-2026-08-0001, status='CONFIRMED')
  └── Customer commitment ratified with incoterms, billing currency, and service scope.

[2. COMPOSITION & ALLOCATION]
Fulfillment (FL-2026-08-0001, status='PLANNED', revision_no=1)
  ├── Allocation 1: FORWARDING  (allocated_quantity: 100, shipment_id: SHP-001)
  ├── Allocation 2: CUSTOMS     (allocated_quantity: 100, declaration_id: DEC-001)
  ├── Allocation 3: TRUCKING    (allocated_quantity: 100, service_request_id: SR-TRK-01)
  └── Allocation 4: WAREHOUSE   (allocated_quantity: 100, service_request_id: SR-WMS-01)

[3. DISPATCH & COMMAND EXECUTION]
  ├── Forwarding Engine materializes shp_shipments (SHP-001) + Execution Legs (Leg 1 Sea, Leg 2 Port).
  ├── Customs Engine prepares cus_declarations (DEC-001) and attaches to Leg 1 via CustomsAttachmentService.
  ├── Trucking Dispatch Adapter receives SR-TRK-01 -> resolves Engagement -> creates/finds WO -> wo_items -> JO.
  └── Warehouse Adapter receives SR-WMS-01 -> creates wh_receipt_orders.

[4. PHYSICAL EXECUTION & TRACKING]
  ├── JO executed by Driver/Armada (GPS updates, status timestamps).
  ├── Leg executed by Ocean Carrier (Bill of Lading status, ETA/ETD).
  ├── Declaration cleared by Bea Cukai (CEISA SPPB issued).
  └── WMS receipt confirmed (Pallets put away in inventory).

[5. PROGRESS ROLLUP & CLOSURE]
  ├── Operational events update delivered_quantity on Fulfillment Allocations.
  ├── When all allocations fulfilled -> Fulfillment transitions to FULFILLED -> CLOSED.
  └── Sales Order commercial status advances to FULFILLED -> BILLED -> CLOSED.
```

### 3.2 Responsibility Matrix

| Question | Owning Entity | Underlying Database Table | Authority Rule |
|---|---|---|---|
| **Who decides WHAT work is needed?** | Commercial Director / Sales Order | `public.sales_orders` | Commercial Customer Contract |
| **Who composes the capability plan?** | Fulfillment Manager | `public.fulfillments` & `fulfillment_allocations` | ADR-039 (Composition Aggregate) |
| **Who commands operational SBUs?** | Service Request Dispatcher | `public.svc_service_requests` | ADR-033 (Command Message) |
| **Who commits operational resources?** | Operational SBU Operations Head | `public.work_orders` & `shp_shipments` | ADR-037 (Operational Commitment) |
| **Who executes physical movement?** | Drivers, Field Operators, PPJK | `public.job_orders`, `cus_declarations`, `wh_receipt_orders` | Domain Execution Engines |
| **Who tracks physical logistics?** | Forwarding Shipment Engine | `public.shp_shipments` & `shp_execution_legs` | ADR-040 (Shipment $\neq$ Fulfillment) |
| **Who owns commercial truth?** | Commercial Billing & Contracts | `public.sales_orders` & `commercial_work_orders` | ADR-044 (Commercial Truth Immutable) |

---

## 4. Analysis of Primary Business Scenarios

### Scenario A: Domestic Forwarding (Multi-Leg Delivery)
- **Flow:** Customer Order $\to$ `SO` $\to$ `Fulfillment` $\to$ Forwarding Allocation $\to$ `shp_shipments` with 3 execution legs:
  1. *Leg 1 (Road Trucking - Origin to Port):* Forwarding emits `svc_service_requests(target_domain='TRUCKING')` $\to$ Trucking Lineage resolves $\to$ `work_orders` $\to$ `wo_items` $\to$ `job_orders` (Driver assigned).
  2. *Leg 2 (Sea Freight - Port to Port):* Forwarding records Ocean Vessel voyage + BL.
  3. *Leg 3 (Road Trucking - Port to Destination):* Forwarding emits destination `svc_service_requests(target_domain='TRUCKING')` $\to$ Destination `job_orders`.
- **Verdict:** Clean separation. Fulfillment tracks progress (e.g. 100/100 units moved); `shp_shipments` and `job_orders` own execution.

### Scenario B: International Import (Ocean Freight + Customs + Final Mile)
- **Flow:** China Supplier $\to$ `SO` $\to$ `Fulfillment` $\to$ 2 Allocations:
  - *Allocation 1 (Forwarding):* `shp_shipments` with Ocean Leg (MBL/HBL, POL: Shanghai, POD: Tanjung Priok) + Destination Trucking Leg.
  - *Allocation 2 (Customs Clearance):* `cus_declarations` (PIB Import BC 2.0). Attached to the Ocean Execution Leg via `CustomsAttachmentService.attachShipment()`.
- **Verdict:** Customs remains sovereign while cleanly attached to the Forwarding leg. Fulfillment does not manipulate CEISA XML or tariff calculation.

### Scenario C: BYD CKD / Automotive Multimodal (High-Complexity Stress Test)
- **Complexity:** 500 CKD Kits in 50 Containers, Split Shipments (Batch 1: 300 kits, Batch 2: 200 kits), Multimodal (Sea $\to$ Port Terminal $\to$ Car Carrier Trucking), Customs (PIB BC 2.0), Re-planning on vessel delay.
- **Decomposition:**
  - `SO` quantity: 500 Kits.
  - `Fulfillment Revision 1` (Active):
    - *Allocation 1 (Batch 1 Forwarding):* `shp_shipments` SHP-01 (300 kits, 30 containers) $\to$ Leg 1 (Sea: Ningbo $\to$ Jakarta), Leg 2 (Port Handling), Leg 3 (Trucking: Jakarta $\to$ Subang Plant).
    - *Allocation 2 (Batch 1 Customs):* `cus_declarations` (PIB for 300 kits attached to SHP-01).
    - *Allocation 3 (Batch 2 Forwarding):* `shp_shipments` SHP-02 (200 kits, 20 containers).
    - *Allocation 4 (Batch 2 Customs):* `cus_declarations` (PIB for 200 kits attached to SHP-02).
  - *Replanning Event (Vessel Delayed on Batch 2):*
    - New `Fulfillment Revision 2` created (`revision_no=2`, `version_no=2`).
    - Allocation 3 updated with new vessel schedule / new shipment link.
    - Commercial Sales Order is **NOT mutated** (commercial quantity 500, price, incoterms remain intact).
- **Verdict:** Proves that complex split shipment, containerization, multi-batch fulfillment, and replanning are natively supported by the composition model without schema mutations.

### Scenario D: Multi-SBU Single Sales Order
- **Requirement:** Represent 1 SO encompassing Forwarding, Customs, Trucking, and Warehouse without creating 4 separate SBU-specific Sales Orders.
- **Proof:** `public.sales_orders` represents the unified commercial commitment. `public.fulfillments` decomposes into 4 allocations:
  - Allocation 1: `capability_type = 'FORWARDING'`
  - Allocation 2: `capability_type = 'CUSTOMS'`
  - Allocation 3: `capability_type = 'TRUCKING'`
  - Allocation 4: `capability_type = 'WAREHOUSE'`
- **Verdict:** Verified. Commercial commitment is never duplicated; operational boundaries remain strictly modular.

---

## 5. Definitive Cardinality & Lineage Matrix

| Relationship Edge | Canonical Cardinality | Status | Governing ADR / Authority |
|---|---|---|---|
| **Engagement $\to$ Sales Order** | `1 : N` | RATIFIED | ADR-034 |
| **Sales Order $\to$ Fulfillment** | `1 : N` (Revisions) | RATIFIED | ADR-042 |
| **Fulfillment $\to$ Fulfillment Allocation** | `1 : N` | RATIFIED | ADR-042 |
| **Fulfillment Allocation $\to$ Capability Binding** | `N : 1` (Optional) | RATIFIED | ADR-020, ADR-042 |
| **Fulfillment Allocation $\to$ Shipment** | `1 : 1` (Optional) | RATIFIED | ADR-038, ADR-042 |
| **Fulfillment Allocation $\to$ Service Request** | `1 : N` | RATIFIED | ADR-033, ADR-042 |
| **Sales Order $\to$ Work Order** | `1 : N` | RATIFIED | ADR-037 |
| **Many Sales Orders $\to$ One Work Order** | **FORBIDDEN** | RATIFIED | ADR-037 |
| **Work Order $\to$ WO Item** | `1 : N` | RATIFIED | Canonical Trucking Model |
| **WO Item $\to$ Job Order** | `1 : N` | RATIFIED | Canonical Execution Model |
| **Shipment $\to$ Execution Leg** | `1 : N` | RATIFIED | Canonical Forwarding Model |
| **Shipment $\to$ Shipment Unit / Container** | `1 : N` | RATIFIED | Canonical Forwarding Model |
| **Execution Leg $\to$ Service Request** | `1 : 1` (Optional) | RATIFIED | ADR-033 |
| **Customs Declaration $\to$ Shipment / Leg / JO** | `N : 1` (Nullable) | RATIFIED | ADR-019, ADR-021 |
| **Sales Order $\to$ Job Order (Direct)** | **FORBIDDEN** | RATIFIED | Anti-Pattern Prevention |
| **Fulfillment $\to$ Job Order (Direct)** | **FORBIDDEN** | RATIFIED | Anti-Pattern Prevention |
| **Quote $\to$ Work Order (Direct)** | **FORBIDDEN** | RATIFIED | ADR-018, ADR-034 |

---

## 6. Failure, Recovery & Replanning Governance

| Failure Mode | Originating Domain | Resolution & Compensation Boundary | Impact on Sales Order |
|---|---|---|---|
| **Shipment Delayed / Vessel Roll** | Forwarding (`shp_shipments`) | Forwarding updates ETD/ETA on leg; Fulfillment creates Revision N+1 with updated target date. | None (Commercial agreement unchanged). |
| **Customs Red Channel / Hold** | Customs (`cus_declarations`) | Customs manages physical inspection / waiver; notifies Fulfillment via event. | None (Fulfillment pauses allocation; SO remains CONFIRMED). |
| **Truck Breakdown / Driver Reject** | Trucking (`job_orders`) | Dispatch reassigns JO to replacement driver; compensation logged in Trucking domain. | Zero impact on Fulfillment or SO. |
| **Warehouse Space Shortage** | Warehouse (`wh_receipt_orders`) | WMS rejects SR; Fulfillment reroutes allocation to secondary warehouse node. | None (Operational replan). |
| **Customer Changes Order Quantity** | Commercial (`sales_orders`) | Commercial Amendment creates Sales Order Revision; triggers Fulfillment Replanning. | Commercial truth updated; Fulfillment creates new revision to match. |

---

## 7. Identity & Number Authority Audit

| Business Identifier | Generating Authority | Database Mechanism | Format Pattern | Client Generation Prohibited |
|---|---|---|---|---|
| **Sales Order Number** | `public.next_sales_order()` | PostgreSQL sequence `seq_sales_order` | `SO-YYYY-MM-NNNN` | **YES (Enforced)** |
| **Fulfillment Number** | `public.next_fulfillment_number()` | PostgreSQL sequence `seq_fulfillment` | `FL-YYYY-MM-NNNN` | **YES (Enforced)** |
| **Shipment Number** | `public.next_shipment_number()` | PostgreSQL sequence `seq_shipment` | `SHP-YYYY-MM-NNNN` | **YES (Enforced)** |
| **Work Order Number** | `public.next_work_order_number()` | Database sequence | `WO-YYYY-MM-NNNN` | **YES (Enforced)** |
| **Job Order Number** | Database Trigger / Function | Sequence-backed trigger | `JO-YYYY-MM-NNNN` | **YES (Enforced)** |
| **Declaration Number** | CEISA Registration Authority | 26-digit statutory number | Statutory format | **YES (Enforced)** |

---

## 8. Proposed Future ADRs (PROPOSED ONLY — NOT RATIFIED)

The following ADRs are formulated for subsequent formal ratification prior to operational composition implementation:

- **ADR-PROP-045 (Operational Composition Handoff Boundary):** Formalizes the exact command and event interfaces between `fulfillment_allocations` and domain entry ports (`shp_shipments`, `svc_service_requests`, `cus_declarations`).
- **ADR-PROP-046 (Forwarding Multimodal Leg Decomposition & Cross-Domain Dispatch):** Governs how `shp_execution_legs` dispatches sub-contracted road, rail, and port terminal legs via `svc_service_requests`.
- **ADR-PROP-047 (Customs Sovereign Progressive Attachment):** Formalizes the lifecycle binding of statutory customs declarations to multi-modal logistics legs.
- **ADR-PROP-048 (Multi-SBU Single Sales Order Fulfillment Representation):** Establishes standard composition templates for multi-capability client contracts.
- **ADR-PROP-049 (Partial Fulfillment Accounting & Split Shipment Allocation Model):** Defines deterministic allocation rollup mathematics across split operational batches.
- **ADR-PROP-050 (Versioned Fulfillment Replanning vs Operational Failure Isolation):** Specifies immutable revisioning rules when operational plans are altered mid-execution.

---

## 9. Conclusion & Next Steps

**U-16 Architecture Discovery is COMPLETE and GREEN.**

The canonical operational composition model from `Sales Order` $\to$ `Fulfillment` $\to$ `Operational Domains` is mathematically consistent, respects all ratified architectural boundaries, creates zero duplicate operational engines, and protects commercial truth.

Implementation is **DEFERRED** pending formal ADR ratification in the next authorized phase.
